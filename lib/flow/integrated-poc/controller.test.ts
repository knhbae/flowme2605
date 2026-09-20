import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, programResult, type ProgramData } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramEnvelope, validateProgramData } from './program-data';
import { createProgramController, programSame, type ProgramExclusive } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { loadProgramStore } from './program-store';

function fixture() {
  const data = createProgramData(), values = new Map<string, string>([['flow:operating', '{"exact":" keep  spaces "}']]);
  const writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); },
    removeItem: (key: string) => { writes.push(key); values.delete(key); } };
  const exclusive: ProgramExclusive = async work => work();
  const controller = createProgramController({ data, initialData: data, storage, exclusive } as Parameters<typeof createProgramController>[0]);
  assert(controller.ok); return { data, values, writes, storage, exclusive, controller };
}
function add(data: ProgramData) {
  const next = programClone(data), actorId = next.activeActorId;
  next.spaces[actorId].text = M.addDocument(next.spaces[actorId].text, { title: '새 문서' });
  return programResult(data, next, next.spaces[actorId].text.documents.at(-1)!.id);
}
test('boot is read-only; sequential writes see the latest owner and persist only one namespace', async () => {
  const f = fixture(); assert.equal(f.writes.length, 0);
  const actorId = f.data.activeActorId;
  const results = await Promise.all([f.controller.mutate('문서 추가', add, { actorId }), f.controller.mutate('문서 추가', add, { actorId })]);
  assert(results.every(result => result.ok)); assert.equal(f.controller.snapshot().envelope.data.spaces[actorId].text.documents.length, 2);
  assert.deepEqual(f.writes, [PROGRAM_STATE_KEY, PROGRAM_STATE_KEY]); assert.equal(f.values.get('flow:operating'), '{"exact":" keep  spaces "}');
  const loaded=loadProgramStore(f.storage,validateProgramEnvelope);assert.equal(loaded.kind,'ready');if(loaded.kind!=='ready')return;
  assert(validateProgramEnvelope(loaded.envelope));assert.deepEqual(loaded.envelope,f.controller.snapshot().envelope);
});
test('same state, invalid state and failed domain transitions produce zero storage calls', async () => {
  const f = fixture(), actorId = f.data.activeActorId;
  assert((await f.controller.mutate('같은 위치', data => programResult(data, data, 'same'), { actorId })).ok);
  assert.equal((await f.controller.mutate('오류', data => ({ ok: false, data, reason: 'invalid' }), { actorId })).ok, false);
  assert.equal((await f.controller.mutate('잘못된 데이터', data => programResult(data, { ...data, activeActorId: 'missing' }, ''), { actorId })).ok, false);
  assert.equal(f.writes.length, 0);
});
test('foreign state is adopted for review and rejected before stale user intent can write', async () => {
  const f = fixture(), actorId = f.data.activeActorId;
  const foreign = createProgramEnvelope(f.data); foreign.revision = 1; foreign.data.actors[0].name = '다른 탭';
  f.values.set(PROGRAM_STATE_KEY, JSON.stringify(foreign));
  assert.deepEqual(await f.controller.mutate('낡은 화면', add, { actorId }), { ok: false, reason: 'conflict' });
  assert.equal(f.writes.length, 0); assert.equal(f.controller.snapshot().envelope.data.actors[0].name, '다른 탭');
  assert((await f.controller.mutate('다시 확인', add, { actorId })).ok);
});

test('snapshot notifications identify external adoption separately from local success', async () => {
  const f = fixture(), external: boolean[] = [];
  const controller = createProgramController({ initialData: f.data, storage: f.storage, exclusive: f.exclusive,
    onChange: (_next, context) => external.push(context?.external ?? false) });
  assert(controller.ok);
  await controller.mutate('문서 만들기', add, { actorId: f.data.activeActorId });
  const remote = controller.snapshot().envelope; remote.revision++; remote.data.actors[0].name = '다른 탭 저장';
  f.values.set(PROGRAM_STATE_KEY, JSON.stringify(remote));
  const beforeWrites = f.writes.length;
  assert((await controller.refresh()).ok);
  assert.deepEqual(external, [false, true]);
  assert.equal(f.writes.length, beforeWrites);
});
test('unavailable lock never falls back to an uncoordinated writer', async () => {
  const f = fixture(), controller = createProgramController({ storage: f.storage, initialData: f.data, exclusive: async () => { throw new Error('no-safe-lock'); } });
  assert(controller.ok); assert.equal((await controller.mutate('쓰기', add, { actorId: f.data.activeActorId })).ok, false); assert.equal(f.writes.length, 0);
});
test('private Undo and Redo restore exact private state, preserve public/other actors and survive reload', async () => {
  const f = fixture(), actorId = f.data.activeActorId;
  await f.controller.mutate('문서', add, { actorId }); const successful = f.controller.snapshot().envelope.data;
  await f.controller.mutate('다른 사람', data => { const next = programClone(data); next.actors[1].name = '보존'; return programResult(data, next, 'actor'); }, { actorId, history: false });
  await f.controller.undo(actorId); assert.equal(f.controller.snapshot().envelope.data.spaces[actorId].text.documents.length, 0);
  await f.controller.redo(actorId);
  assert(programSame(f.controller.snapshot().envelope.data.spaces[actorId], successful.spaces[actorId]));
  assert.equal(f.controller.snapshot().envelope.data.actors[1].name, '보존');
  const restored = createProgramController({ initialData: f.data, storage: f.storage, exclusive: f.exclusive });
  assert(restored.ok); assert.deepEqual(restored.snapshot(), f.controller.snapshot());
});
test('storage failure keeps prior committed state and permits a safe retry', async () => {
  const f = fixture(), actorId = f.data.activeActorId;
  const original = f.storage.setItem; f.storage.setItem = () => { throw new Error('quota'); };
  assert.equal((await f.controller.mutate('문서', add, { actorId })).ok, false); assert.equal(f.controller.snapshot().envelope.revision, 0);
  f.storage.setItem = original; assert((await f.controller.mutate('재시도', add, { actorId })).ok);
});
test('corrupt persisted state fails closed without migration or writes', () => {
  const f = fixture(); f.values.set(PROGRAM_STATE_KEY, '{broken');
  assert.deepEqual(createProgramController({ initialData: f.data, storage: f.storage, exclusive: f.exclusive }), { ok: false, reason: 'corrupt' });
  assert.equal(f.writes.length, 0);
});
test('actor changed elsewhere does not redirect an old form write to another actor', async () => {
  const f = fixture();
  await f.controller.mutate('인물 전환', data => programResult(data, { ...data, activeActorId: data.actors[1].id }, 'switched'), { actorId: f.data.activeActorId, history: false });
  assert.equal((await f.controller.mutate('이전 폼', add, { actorId: f.data.activeActorId })).ok, false);
  assert(validateProgramData(f.controller.snapshot().envelope.data));
});

test('a post-commit observer failure is saved with a recovery notice, never a failed-write receipt', async () => {
  const f = fixture(), actorId = f.data.activeActorId; let broken = true, notices = 0;
  const delivered: number[] = [];
  const controller = createProgramController({ initialData: f.data, storage: f.storage, exclusive: f.exclusive,
    onChange: next => { if (broken) throw Error('view registry failure'); delivered.push(next.envelope.revision); },
    onPresentationError: () => { notices++; } });
  assert(controller.ok);
  const saved = await controller.mutate('문서', add, { actorId });
  assert(saved.ok && saved.changed && saved.presentationPending);
  const successful = f.values.get(PROGRAM_STATE_KEY);
  assert.equal(controller.snapshot().raw, successful); assert.equal(notices, 1);
  for (const action of [() => controller.mutate('재시도', add, { actorId }), () => controller.undo(actorId), () => controller.redo(actorId)]) {
    assert.deepEqual(await action(), { ok: false, reason: 'presentation-pending' });
  }
  assert.equal(f.writes.length, 1); assert.equal(f.values.get(PROGRAM_STATE_KEY), successful);
  const pending = await controller.refresh(); assert(pending.ok && pending.presentationPending);
  assert.equal(f.writes.length, 1);
  broken = false; const refreshed = await controller.refresh(); assert(refreshed.ok && !refreshed.presentationPending);
  assert.deepEqual(delivered, [1]); assert.equal(f.values.get(PROGRAM_STATE_KEY), successful);
  assert((await controller.undo(actorId)).ok); assert((await controller.redo(actorId)).ok);
  assert.equal(controller.snapshot().envelope.data.spaces[actorId].text.documents.length, 1);
  assert.equal(f.values.get('flow:operating'), '{"exact":" keep  spaces "}');
});

test('notification recovery keeps an intervening external actor change and rejects old actor intent', async () => {
  const f = fixture(), actorId = f.data.activeActorId; let broken = true;
  const contexts: boolean[] = [];
  const controller = createProgramController({ initialData: f.data, storage: f.storage, exclusive: f.exclusive,
    onChange: (_next, context) => { if (broken) throw Error('view registry'); contexts.push(context?.external ?? false); },
    onPresentationError: () => { throw Error('notification itself failed'); } });
  assert(controller.ok); const result = await controller.mutate('문서', add, { actorId }); assert(result.ok && result.presentationPending);
  const remote = controller.snapshot().envelope; remote.revision++; remote.data.activeActorId = remote.data.actors[1].id;
  f.values.set(PROGRAM_STATE_KEY, JSON.stringify(remote)); broken = false;
  assert((await controller.refresh()).ok); assert.deepEqual(contexts, [true]); assert.equal(f.writes.length, 1);
  assert.deepEqual(await controller.mutate('이전 작성자', add, { actorId }), { ok: false, reason: 'conflict' });
  assert.equal(f.writes.length, 1); assert.equal(controller.snapshot().envelope.data.activeActorId, remote.data.activeActorId);
});

test('pre-commit quota failure has no successful mutation or presentation success notice', async () => {
  const f = fixture(); let notices = 0;
  const controller = createProgramController({ initialData: f.data, storage: { ...f.storage, setItem: () => { throw Error('quota'); } }, exclusive: f.exclusive,
    onChange: () => { notices++; }, onPresentationError: () => { notices++; } });
  assert(controller.ok); const before = controller.snapshot();
  assert.equal((await controller.mutate('문서', add, { actorId: f.data.activeActorId })).ok, false);
  assert.deepEqual(controller.snapshot(), before); assert.equal(f.writes.length, 0); assert.equal(notices, 0);
});

test('disk removal during presentation recovery cannot announce an old memory snapshot as restored', async () => {
  const f = fixture(), actorId = f.data.activeActorId; let broken = true, delivered = 0;
  const controller = createProgramController({ initialData: f.data, storage: f.storage, exclusive: f.exclusive,
    onChange: () => { if (broken) throw Error('registry'); delivered++; } });
  assert(controller.ok); const saved = await controller.mutate('문서', add, { actorId }); assert(saved.ok && saved.presentationPending);
  const successful = controller.snapshot(); f.values.delete(PROGRAM_STATE_KEY); broken = false;
  assert.deepEqual(await controller.refresh(), { ok: false, reason: 'recovery-required' });
  assert.equal(delivered, 0); assert.deepEqual(controller.snapshot(), successful);
  assert.deepEqual(await controller.mutate('낡은 입력', add, { actorId }), { ok: false, reason: 'presentation-pending' });
  assert.equal(f.writes.length, 1); assert.equal(f.values.has(PROGRAM_STATE_KEY), false);
  f.values.set(PROGRAM_STATE_KEY, successful.raw!);
  assert((await controller.refresh()).ok); assert.equal(delivered, 1); assert.equal(f.writes.length, 1);
});
