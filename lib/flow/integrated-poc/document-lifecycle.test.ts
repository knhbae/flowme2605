import test from 'node:test';
import assert from 'node:assert/strict';
import { programClone, PROGRAM_STATE_KEY, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramData } from './program-data';
import { createProgramDocument, archiveProgramDocument, linkProgramTask } from './private-space';
import { setProgramDocumentTrashed, programDocumentDisposition } from './document-lifecycle';
import { textWorkspaceModel as M } from './text-workspace';
import { programExecutionTasks } from './execution';
import { createProgramController } from './controller';
const actorId = 'local-user', now = '2026-09-12T12:00:00.000Z'; let seq = 0;
const base = (data: ProgramData) => ({ actorId, requestId: `trash-${++seq}`, expectedSpace: programClone(data.spaces[actorId]) });
function accept(result: ProgramTransition<string>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture() {
  const initial = createProgramData(), created = accept(createProgramDocument(initial, { ...base(initial), title: '개인 계획', raw: '- [ ] 할 일\n  - 날짜: 2026-09-12' }));
  const other = accept(createProgramDocument(created.data, { ...base(created.data), title: '연결' })), taskId = M.tasks(other.data.spaces[actorId].text)[0].id;
  const linked = accept(linkProgramTask(other.data, { ...base(other.data), documentId: other.result, taskId }));
  linked.data.spaces[actorId].text = M.recordProgress(linked.data.spaces[actorId].text, taskId, '2026-09-12', 65);
  return { data: linked.data, documentId: created.result, taskId };
}
test('recoverable deletion hides execution but preserves raw, links, histories and all other actors', () => {
  const { data, documentId } = fixture(), before = programClone(data);
  const removed = accept(setProgramDocumentTrashed(data, { ...base(data), documentId, trashed: true, now }));
  assert.equal(programDocumentDisposition(removed.data.spaces[actorId], documentId), 'trashed');
  assert.deepEqual(removed.data.spaces[actorId].text, data.spaces[actorId].text); assert.equal(programExecutionTasks(removed.data.spaces[actorId]).length, 0);
  const restored = accept(setProgramDocumentTrashed(removed.data, { ...base(removed.data), documentId, trashed: false, now }));
  assert.equal(programDocumentDisposition(restored.data.spaces[actorId], documentId), 'active'); assert.equal(programExecutionTasks(restored.data.spaces[actorId]).length, 1);
  assert.deepEqual(restored.data.spaces[actorId].text, before.spaces[actorId].text); assert.deepEqual(data, before); assert.deepEqual(restored.data.public, before.public);
});
test('restoring a previously archived document returns to archive; archive restore cannot bypass trash', () => {
  const { data, documentId } = fixture(), archived = accept(archiveProgramDocument(data, { ...base(data), documentId }));
  const trashed = accept(setProgramDocumentTrashed(archived.data, { ...base(archived.data), documentId, trashed: true, now }));
  assert.equal(archiveProgramDocument(trashed.data, { ...base(trashed.data), documentId, archived: false }).ok, false);
  const restored = accept(setProgramDocumentTrashed(trashed.data, { ...base(trashed.data), documentId, trashed: false, now }));
  assert.equal(programDocumentDisposition(restored.data.spaces[actorId], documentId), 'archived');
});
test('same state/replay and stale/foreign requests do not change data', () => {
  const { data, documentId } = fixture(), input = { ...base(data), documentId, trashed: true, now };
  assert.equal(accept(setProgramDocumentTrashed(data, { ...input, trashed: false })).changed, false);
  const trashed = accept(setProgramDocumentTrashed(data, input));
  assert.equal(accept(setProgramDocumentTrashed(trashed.data, input)).changed, false);
  assert.equal(setProgramDocumentTrashed(trashed.data, { ...input, requestId: 'stale-delete' }).ok, false);
  assert.equal(setProgramDocumentTrashed(data, { ...input, actorId: 'creator-minji' }).ok, false);
});
test('old private payload remains valid; corrupt trash references or missing archive lock fail closed', () => {
  const { data, documentId } = fixture(); assert(!Object.hasOwn(data.spaces[actorId], 'documentTrash'));
  for (const trash of [null, [], { missing: { trashedAt: now, wasArchived: false } }, { [documentId]: { trashedAt: 'bad', wasArchived: false } }, { [documentId]: { trashedAt: now, wasArchived: 'false' } }, { [documentId]: { trashedAt: now, wasArchived: false } }]) {
    const next = programClone(data); Object.assign(next.spaces[actorId], { documentTrash: trash }); assert.equal(validateProgramData(next), false);
  }
});

test('trash transaction preserves storage on quota failure and restores exact data through Undo, Redo and reload', async () => {
  const { data, documentId } = fixture();
  const values = new Map([[PROGRAM_STATE_KEY, JSON.stringify(createProgramEnvelope(data))], ['flow:protected-trash', 'unchanged\r\nbytes']]);
  const original = values.get(PROGRAM_STATE_KEY), writes: string[] = []; let fail = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); if (fail) throw Error('quota'); writes.push(key); values.set(key, raw); },
    removeItem: (_key: string) => assert.fail('no remove during recoverable deletion') };
  const controller = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert(controller.ok);
  const trash = () => controller.mutate('휴지통', current => setProgramDocumentTrashed(current, { ...base(current), documentId, trashed: true, now }), { actorId });
  assert.equal((await trash()).ok, false); assert.equal(values.get(PROGRAM_STATE_KEY), original); assert.equal(writes.length, 0);
  fail = false; assert((await trash()).ok); assert.equal(writes.length, 1);
  const removed = controller.snapshot().envelope.data;
  assert.equal(programDocumentDisposition(removed.spaces[actorId], documentId), 'trashed');
  assert.deepEqual(removed.spaces[actorId].text, data.spaces[actorId].text);
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], data.spaces[actorId]);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], removed.spaces[actorId]);
  const reloaded = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert(reloaded.ok);
  assert.deepEqual(reloaded.snapshot().envelope.data, controller.snapshot().envelope.data);
  assert((await reloaded.mutate('복원', current => setProgramDocumentTrashed(current, { ...base(current), documentId, trashed: false, now }), { actorId })).ok);
  assert.deepEqual(reloaded.snapshot().envelope.data.spaces[actorId].text, data.spaces[actorId].text);
  assert.equal(values.get('flow:protected-trash'), 'unchanged\r\nbytes');
});
