import assert from 'node:assert/strict';
import test from 'node:test';
import { addDocumentCollection, collectionDocumentIds, commitDocumentCollectionLinks, emptyDocumentCollections, isDocumentCollections, setDocumentCollectionLink } from './document-collections';
import { createDocumentCollectionsTrialData, COLLECTION_TRIAL_TODAY as today } from './document-collections-trial';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { addProgramQuickTask, completeProgramTask, createProgramDocument, createProgramFolder, recordProgramTaskProgress, setProgramDocumentFolder, updateProgramTask } from './private-space';
import { programOrderedExecutionRows } from './recurrence-order';
import { validateProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { readProgramTaskOrigin } from './task-origin-presentation';
import { createProgramController } from './controller';

let request = 0;
const base = (data: ProgramData) => ({ actorId: data.activeActorId, expectedSpace: data.spaces[data.activeActorId], requestId: `collection-test-${++request}` });
function accept(transition: ProgramTransition<string>) { assert(transition.ok, transition.ok ? '' : transition.reason); assert(validateProgramData(transition.data)); return transition; }
const twoCollections = () => addDocumentCollection(addDocumentCollection(emptyDocumentCollections(), 'collection-a', '모음 A'), 'collection-b', '모음 B');

test('sidecar exact readback, no-op and stale baseline never report an unconfirmed write as success', () => {
  let raw: string | null = null, writes = 0;
  const port = { read: () => raw, write: (next: string) => { writes++; raw = next; } };
  assert(commitDocumentCollectionLinks(port, null, twoCollections()).ok);
  const stable = raw; assert(commitDocumentCollectionLinks(port, stable, twoCollections()).ok); assert.equal(writes, 1);
  assert(!commitDocumentCollectionLinks(port, null, emptyDocumentCollections()).ok); assert.equal(raw, stable); assert.equal(writes, 1);
  assert(!commitDocumentCollectionLinks({ read: () => null, write: () => { throw new Error('unavailable'); } }, null, twoCollections()).ok);
  assert(!commitDocumentCollectionLinks({ read: () => null, write: () => {} }, null, twoCollections()).ok);
});

test('collections contain whole-document links only; schema excludes bodies and item membership', () => {
  const state = twoCollections(); assert(isDocumentCollections(state));
  for (const extra of [{ body: 'separate' }, { taskIds: [] }, { folderId: 'inherited' }]) {
    assert(!isDocumentCollections({ ...state, collections: [{ ...state.collections[0], ...extra }] }));
  }
  assert(!isDocumentCollections({ ...state, collections: [state.collections[0], state.collections[0]] }));
  assert(!isDocumentCollections({ ...state, collections: [{ ...state.collections[0], documentIds: ['doc', 'doc'] }] }));
});

test('link A and B, repeat A, unlink A: one original and B link remain; inputs are immutable', () => {
  const original = twoCollections(), bytes = JSON.stringify(original);
  let next = setDocumentCollectionLink(original, 'collection-a', 'same-doc', true);
  next = setDocumentCollectionLink(next, 'collection-b', 'same-doc', true);
  next = setDocumentCollectionLink(next, 'collection-a', 'same-doc', true);
  assert.deepEqual([...collectionDocumentIds(next, ['collection-a', 'collection-b'])], ['same-doc']);
  assert.deepEqual(next.collections[0].documentIds, ['same-doc']);
  next = setDocumentCollectionLink(next, 'collection-a', 'same-doc', false);
  assert.deepEqual(next.collections[0].documentIds, []); assert.deepEqual(next.collections[1].documentIds, ['same-doc']);
  assert.equal(JSON.stringify(original), bytes);
  assert.deepEqual(setDocumentCollectionLink(next, 'missing', 'same-doc', true), next);
});

test('old and new taskScopes can differ in legacy bytes but cannot split new whole-document membership/global period', () => {
  let data = createDocumentCollectionsTrialData();
  const created = accept(createProgramDocument(data, { ...base(data), title: '기존·신규', raw: '- [ ] 이전 할 일\n  - 날짜: 2026-10-06' })); data = created.data;
  const docId = created.result, oldTask = M.tasks(data.spaces[data.activeActorId].text).find(row => row.docId === docId)!;
  const madeFolder = accept(createProgramFolder(data, { ...base(data), title: '과거 위치' })); data = madeFolder.data;
  data = accept(setProgramDocumentFolder(data, { ...base(data), documentId: docId, folderId: madeFolder.result })).data;
  const added = accept(addProgramQuickTask(data, { ...base(data), documentId: docId, title: '새 할 일', date: today })); data = added.data;
  const space = data.spaces[data.activeActorId];
  assert.notEqual(space.text.taskScopes[oldTask.id], space.text.taskScopes[added.result]);
  const before = JSON.stringify(data);
  let links = setDocumentCollectionLink(twoCollections(), 'collection-a', docId, true);
  links = setDocumentCollectionLink(links, 'collection-b', docId, true);
  links = setDocumentCollectionLink(links, 'collection-a', docId, false);
  const visibleDocs = collectionDocumentIds(links, ['collection-b']);
  assert(visibleDocs.has(oldTask.docId));
  const rows = programOrderedExecutionRows(data, { period: 'today', date: today, today, folderId: '', query: '' }).rows;
  const ownRows = rows.filter(row => row.kind === 'text-task' && row.task.docId === docId);
  assert.deepEqual(new Set(ownRows.map(row => row.kind === 'text-task' && row.task.id)), new Set([oldTask.id, added.result]));
  assert.equal(JSON.stringify(data), before); // No legacy reclassification/migration.
});

test('date, note, completed progress and exact Flow origin survive relation changes and reload of existing controller store', async () => {
  const storage = new Map<string, string>();
  const controller = createProgramController({ initialData: createDocumentCollectionsTrialData(), exclusive: async work => work(),
    storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } } });
  assert(controller.ok);
  const initial = controller.snapshot().envelope.data, initialSpace = initial.spaces[initial.activeActorId];
  const copy = initialSpace.copies[0], task = M.tasks(initialSpace.text).find(row => row.docId === copy.documentId)!;
  const source = readProgramTaskOrigin(initial, task), other = programClone(initialSpace.text.documents);
  assert.equal(source.label, 'Flow에서 가져옴');
  for (const build of [
    (data: ProgramData) => updateProgramTask(data, { ...base(data), taskId: task.id, patch: { date: today, note: '이어 쓸 개인 메모' } }),
    (data: ProgramData) => recordProgramTaskProgress(data, { ...base(data), taskId: task.id, date: '2026-10-05', percent: 40 }),
    (data: ProgramData) => completeProgramTask(data, { ...base(data), taskId: task.id, done: true, date: today }),
  ]) assert((await controller.mutate('시험 항목 변경', build, { actorId: initial.activeActorId })).ok);
  const beforeLink = controller.snapshot(), bytes = [...storage.entries()];
  let links = setDocumentCollectionLink(twoCollections(), 'collection-a', copy.documentId, true);
  links = setDocumentCollectionLink(links, 'collection-b', copy.documentId, true);
  links = setDocumentCollectionLink(links, 'collection-a', copy.documentId, false);
  assert.deepEqual([...storage.entries()], bytes);
  assert.deepEqual(controller.snapshot(), beforeLink);
  const reloaded = createProgramController({ initialData: initial, exclusive: async work => work(), storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } } });
  assert(reloaded.ok); const data = reloaded.snapshot().envelope.data, space = data.spaces[data.activeActorId];
  const now = M.tasks(space.text).find(row => row.id === task.id)!;
  assert.equal(now.docId, copy.documentId); assert.equal(now.date, today); assert.equal(now.done, true); assert.equal(now.note, '이어 쓸 개인 메모');
  assert.deepEqual(readProgramTaskOrigin(data, now), source); assert.deepEqual(space.text.documents, other);
  assert.equal(space.copies.length, 1); assert.equal(space.text.flows.length, 1);
  assert(space.text.progressRecords.some(row => row.taskId === task.id && row.date === '2026-10-05' && row.percent === 40));
  assert.equal(programOrderedExecutionRows(data, { period: 'week', date: today, today, folderId: '', query: '' }).rows.filter(row => row.kind === 'text-task' && row.task.id === task.id).length, 1);
  assert.equal(collectionDocumentIds(links, ['collection-b']).size, 1);
});
