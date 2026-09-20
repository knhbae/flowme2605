import test from 'node:test';
import assert from 'node:assert/strict';
import { programClone, PROGRAM_STATE_KEY, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramData, validateProgramEnvelope } from './program-data';
import { archiveProgramDocument, createProgramDocument, linkProgramTask } from './private-space';
import { moveProgramTaskDocument } from './task-document-move';
import { textWorkspaceModel as M } from './text-workspace';
import { programExecutionTasks } from './execution';
import { createProgramController } from './controller';

const actorId = 'local-user'; let seq = 0;
const base = (data: ProgramData) => ({ actorId, requestId: `task-transfer-${++seq}`, expectedSpace: programClone(data.spaces[actorId]) });
function accept(result: ProgramTransition<string>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture(raw = '[2026-09-11]\n- [ ] 옮길 준비\n  - 시간: 09:30\n  - 메모: 개인 내용\n  - [ ] 하위 준비\n- [ ] 남길 일') {
  const a = accept(createProgramDocument(createProgramData(), { ...base(createProgramData()), title: '출발', raw }));
  const b = accept(createProgramDocument(a.data, { ...base(a.data), title: '도착', raw: '[2026-10-01]\n도착 메모' }));
  const c = accept(createProgramDocument(b.data, { ...base(b.data), title: '참조' }));
  const task = M.tasks(c.data.spaces[actorId].text).find(task => task.docId === a.result)!;
  const linked = accept(linkProgramTask(c.data, { ...base(c.data), documentId: c.result, taskId: task.id }));
  const data = linked.data, space = data.spaces[actorId];
  space.text = M.recordProgress(space.text, task.id, '2026-09-11', 10);
  space.text = M.recordProgress(space.text, task.id, '2026-09-12', 20);
  space.timelineOrders['2026-09-11'] = [task.id];
  space.executionTimelineOrders = { '2026-09-11': [JSON.stringify(['text-task', a.result, task.id])] };
  assert(validateProgramData(data)); return { data, from: a.result, to: b.result, reference: c.result, taskId: task.id };
}

test('canonical personal block transfers with stable IDs, inherited date, subchecks, scopes and two-day history', () => {
  const { data, from, to, reference, taskId } = fixture(), before = programClone(data), space = data.spaces[actorId];
  const original = M.tasks(space.text).find(task => task.id === taskId)!;
  const moved = accept(moveProgramTaskDocument(data, { ...base(data), taskId, destinationId: to }));
  const after = moved.data.spaces[actorId], task = M.tasks(after.text).find(task => task.id === taskId)!;
  assert.equal(task.docId, to); assert.equal(task.date, '2026-09-11'); assert.equal(task.note, original.note); assert.equal(task.time, original.time);
  assert.deepEqual(task.subchecks.map(child => [child.id, child.title, child.date]), original.subchecks.map(child => [child.id, child.title, child.date]));
  assert.deepEqual(after.text.taskScopes, space.text.taskScopes); assert.deepEqual(after.text.itemScopes, space.text.itemScopes);
  assert.deepEqual(after.text.progressRecords, space.text.progressRecords); assert.deepEqual(M.getDocument(after.text, reference), M.getDocument(space.text, reference));
  assert(!M.getDocument(after.text, from)!.lines.some(line => line.id === taskId));
  assert.equal(after.text.documents.flatMap(doc => doc.lines).filter(line => line.id === taskId).length, 1);
  assert.equal(programExecutionTasks(after).filter(row => row.id === taskId).length, 1);
  assert.deepEqual(after.executionTimelineOrders!['2026-09-11'], [JSON.stringify(['text-task', to, taskId])]);
  assert.deepEqual(data, before); assert.deepEqual(moved.data.public, before.public);
});

test('undated task stays undated when destination has a date section', () => {
  const { data, taskId, to } = fixture('- [ ] 날짜 없는 일\n  보통 메모');
  const moved = accept(moveProgramTaskDocument(data, { ...base(data), taskId, destinationId: to }));
  assert.equal(M.tasks(moved.data.spaces[actorId].text).find(task => task.id === taskId)!.date, null);
});

test('same document and exact replay do not mutate; stale, archived and source-owned requests fail closed', () => {
  const { data, taskId, from, to } = fixture();
  assert.equal(accept(moveProgramTaskDocument(data, { ...base(data), taskId, destinationId: from })).changed, false);
  const input = { ...base(data), taskId, destinationId: to }, moved = accept(moveProgramTaskDocument(data, input));
  assert.equal(accept(moveProgramTaskDocument(moved.data, input)).changed, false);
  assert.equal(moveProgramTaskDocument(moved.data, { ...input, requestId: 'stale-transfer' }).ok, false);
  const archived = accept(archiveProgramDocument(data, { ...base(data), documentId: to }));
  assert.equal(moveProgramTaskDocument(archived.data, { ...base(archived.data), taskId, destinationId: to }).ok, false);
  const sourceOwned = programClone(data), space = sourceOwned.spaces[actorId], doc = space.text.documents.find(doc => doc.id === from)!;
  space.text.documents = space.text.documents.filter(row => row.id !== from);
  space.text.flows.push({ ...doc, private: true, sourceVersion: 'personal-source-v1' });
  for (const id of Object.keys(space.text.itemScopes).filter(id => doc.lines.some(line => line.id === id))) space.text.itemScopes[id] = from;
  for (const id of Object.keys(space.text.taskScopes).filter(id => doc.lines.some(line => line.id === id))) space.text.taskScopes[id] = from;
  assert(validateProgramData(sourceOwned)); assert.equal(moveProgramTaskDocument(sourceOwned, { ...base(sourceOwned), taskId, destinationId: to }).ok, false);
});

test('transfer into a document already referencing the task keeps one target and supports moving back repeatedly', () => {
  let { data, taskId, from, to, reference } = fixture();
  for (const destinationId of [reference, to, from, reference, from]) data = accept(moveProgramTaskDocument(data, { ...base(data), taskId, destinationId })).data;
  assert.equal(M.tasks(data.spaces[actorId].text).find(task => task.id === taskId)!.docId, from);
  assert.equal(programExecutionTasks(data.spaces[actorId]).filter(row => row.id === taskId).length, 1);
});

test('controller saves once, reloads, Undo/Redo restore exact identities and quota failure preserves raw', async () => {
  const { data, taskId, to } = fixture(), values = new Map([[PROGRAM_STATE_KEY, JSON.stringify(createProgramEnvelope(data))], ['flow:protected', 'byte\r\noriginal']]);
  const writes: string[] = []; let fail = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); if (fail) throw Error('quota'); writes.push(key); values.set(key, raw); }, removeItem: (_key: string) => assert.fail('must not remove') };
  const controller = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert(controller.ok);
  const original = values.get(PROGRAM_STATE_KEY);
  fail = true; assert.equal((await controller.mutate('이동', current => moveProgramTaskDocument(current, { ...base(data), taskId, destinationId: to }), { actorId })).ok, false);
  assert.equal(values.get(PROGRAM_STATE_KEY), original); assert.equal(writes.length, 0);
  fail = false; assert((await controller.mutate('이동', current => moveProgramTaskDocument(current, { ...base(data), taskId, destinationId: to }), { actorId })).ok); assert.equal(writes.length, 1);
  const saved = controller.snapshot(); assert(validateProgramEnvelope(saved.envelope));
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], data.spaces[actorId]);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], saved.envelope.data.spaces[actorId]);
  const reloaded = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert(reloaded.ok);
  assert.deepEqual(reloaded.snapshot().envelope.data, controller.snapshot().envelope.data); assert.equal(values.get('flow:protected'), 'byte\r\noriginal');
});
