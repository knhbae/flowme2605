import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, programResult } from './contract';
import { createProgramController } from './controller';
import { createProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { createProgramLegacyPort } from './legacy-port';
import { textWorkspaceModel as M } from './text-workspace';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { toPersonalWorkspacePocQuickItemRef } from '../personal-workspace-poc-contract';
const ACTOR = 'local-user', NOW = '2026-09-12T05:00:00.000Z';
function fixture() {
  const state = createPersonalWorkspacePocState(NOW), ref = toPersonalWorkspacePocQuickItemRef('original');
  state.quickItems.push({ quickItemId: 'original', title: '기존 할 일', memo: '', status: 'open', createdAt: NOW });
  state.placements[ref] = { itemRef: ref, scheduleMode: 'unscheduled', timelinePolicy: 'auto' };
  const initial = hydrateProgramLegacy(createProgramData(), { version: 1, flows: [] }, state, { actorId: ACTOR }); assert.ok(initial.ok);
  const values = new Map<string, string>([['flow:operating', 'untouched'], ['flow:poc:personal-workspace:v1:state', 'exact legacy bytes']]), writes: string[] = [];
  let fail = false;
  const storage = { getItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); return values.get(key) ?? null; },
    setItem: (key: string, raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); if (fail) throw Error('unavailable'); writes.push(key); values.set(key, raw); },
    removeItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); values.delete(key); } };
  const controller = createProgramController({ initialData: initial.data, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data,
    mutate: (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options }) });
  return { controller, port, values, writes, storage, ref, fail: (value: boolean) => { fail = value; } };
}
test('P01 actual controller roundtrip writes only one Program envelope; reload and Program undo preserve one history owner', async () => {
  const f = fixture(); assert.equal(f.writes.length, 0);
  const first = f.port.read(NOW); assert.ok(first.ok); assert.equal(f.writes.length, 0);
  const result = await f.port.commit({ expectedToken: first.token, now: NOW, action: { type: 'move-date', itemRef: f.ref, date: '2026-10-03', now: NOW } });
  assert.ok(result.ok, JSON.stringify(result)); assert.deepEqual(f.writes, [PROGRAM_STATE_KEY]);
  assert.equal(M.tasks(f.controller.snapshot().envelope.data.spaces[ACTOR].text)[0].date, '2026-10-03');
  const reloaded = createProgramController({ initialData: createProgramData(), storage: f.storage, exclusive: async work => work() }); assert.ok(reloaded.ok);
  assert.equal(JSON.parse(reloaded.snapshot().envelope.data.spaces[ACTOR].legacySnapshot!.raw).state.placements[f.ref].date, '2026-10-03');
  assert.equal(reloaded.snapshot().envelope.undo[ACTOR].length, 1);
  assert.ok((await reloaded.undo(ACTOR)).ok); assert.equal(M.tasks(reloaded.snapshot().envelope.data.spaces[ACTOR].text)[0].date, null);
  assert.equal(JSON.parse(reloaded.snapshot().envelope.data.spaces[ACTOR].legacySnapshot!.raw).state.placements[f.ref].scheduleMode, 'unscheduled');
  assert.equal(f.values.get('flow:operating'), 'untouched'); assert.equal(f.values.get('flow:poc:personal-workspace:v1:state'), 'exact legacy bytes');
});
test('P02 Program edit -> old view -> old edit uses one subsequent transaction, no stale overwrite', async () => {
  const f = fixture(), stale = f.port.read(NOW); assert.ok(stale.ok);
  assert.ok((await f.controller.mutate('Program 수정', data => {
    const next = programClone(data), space = next.spaces[ACTOR]; space.text = M.updateTask(space.text, space.legacyQuickItemLines[f.ref], { title: 'Program 제목', note: 'Program 메모' });
    return programResult(data, next, f.ref);
  }, { actorId: ACTOR })).ok);
  const rejected = await f.port.commit({ expectedToken: stale.token, now: NOW, action: { type: 'move-date', itemRef: f.ref, date: '2026-10-01', now: NOW } });
  assert.equal(rejected.ok, false); assert.equal(f.writes.length, 1);
  const view = f.port.read(NOW); assert.ok(view.ok); assert.equal(view.payload.state.quickItems[0].title, 'Program 제목');
  const result = await f.port.commit({ expectedToken: view.token, now: NOW, action: { type: 'update-quick-item', quickItemId: 'original', expectedRevision: view.payload.state.revision, title: '기존에서 수정', memo: view.payload.state.quickItems[0].memo, date: '2026-10-02', now: NOW } });
  assert.ok(result.ok, JSON.stringify(result)); assert.equal(f.writes.length, 2);
  const task = M.tasks(f.controller.snapshot().envelope.data.spaces[ACTOR].text)[0]; assert.equal(task.title, '기존에서 수정'); assert.equal(task.note, 'Program 메모'); assert.equal(task.date, '2026-10-02');
});
test('P03 storage failure keeps both representations unchanged and allows exact-view retry', async () => {
  const f = fixture(), view = f.port.read(NOW); assert.ok(view.ok); const before = f.controller.snapshot(); f.fail(true);
  const request = { expectedToken: view.token, now: NOW, action: { type: 'move-date' as const, itemRef: f.ref, date: '2026-10-01', now: NOW } };
  assert.equal((await f.port.commit(request)).ok, false); assert.deepEqual(f.controller.snapshot(), before); assert.equal(f.writes.length, 0);
  f.fail(false); assert.ok((await f.port.commit(request)).ok); assert.equal(f.writes.length, 1);
});
test('P04 unsupported old undo and cancel never reach any storage mutation', async () => {
  const f = fixture(), view = f.port.read(NOW); assert.ok(view.ok);
  const undo = await f.port.commit({ expectedToken: view.token, now: NOW, action: { type: 'undo', now: NOW } }); assert.equal(undo.ok, false); assert.equal(undo.issues[0].code, 'use-program-undo');
  assert.ok((await f.port.commit({ expectedToken: view.token, now: NOW, action: { type: 'cancel' } })).ok); assert.equal(f.writes.length, 0);
});
test('P05 concurrent old UI requests sharing one view cannot double-apply', async () => {
  const f = fixture(), view = f.port.read(NOW); assert.ok(view.ok);
  const requests = ['2026-10-01', '2026-10-02'].map(date => f.port.commit({ expectedToken: view.token, now: NOW, action: { type: 'move-date', itemRef: f.ref, date, now: NOW } }));
  const results = await Promise.all(requests); assert.equal(results.filter(result => result.ok).length, 1); assert.equal(f.writes.length, 1);
  assert.equal(M.tasks(f.controller.snapshot().envelope.data.spaces[ACTOR].text)[0].date, '2026-10-01');
});
test('P06 rejected host callbacks do not produce a fake success or invoke fallback writers', async () => {
  let writes = 0;
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => { throw Error('read'); }, mutate: async () => { writes++; throw Error('write'); } });
  assert.equal(port.read(NOW).ok, false);
  const result = await port.commit({ expectedToken: '', now: NOW, action: { type: 'cancel' } }); assert.equal(result.ok, false); assert.equal(writes, 1);
  assert(!port.supportedActions.includes('undo')); assert(!port.supportedActions.includes('commit-authoring-handoff')); assert(!port.supportedActions.includes('move-occurrence-date'));
});
