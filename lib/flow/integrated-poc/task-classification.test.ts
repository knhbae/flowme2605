import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, createProgramFolder, importProgramPublicVersion, linkProgramTask, recordProgramTaskProgress } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { canClassifyProgramTask, setProgramTaskClassification } from './task-classification';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';

const actorId = 'local-user';
const base = (data: ProgramData, requestId: string) => ({ actorId, requestId, expectedSpace: programClone(data.spaces[actorId]) });
function accept(result: ProgramTransition<string>) {
  assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result;
}
function fixture() {
  const initial = createProgramData();
  const work = accept(createProgramFolder(initial, { ...base(initial, 'work-folder'), title: '업무' }));
  const life = accept(createProgramFolder(work.data, { ...base(work.data, 'life-folder'), title: '생활' }));
  const owner = accept(createProgramDocument(life.data, { ...base(life.data, 'personal-owner'), title: '개인 글', raw: '- 업무' }));
  let data = programClone(owner.data), space = data.spaces[actorId];
  space.text = M.attachScope(space.text, owner.result, 0, work.result);
  space.text = M.editText(space.text, owner.result, '- 업무\n  - [ ] 견적 보내기\n    - 날짜: 2026-10-07\n    - 메모: 금액 확인\n    - [ ] 하위 확인\n  - [ ] 세탁물 정리\n    - 날짜: 2026-10-08\n자유 메모');
  const tasks = M.tasks(space.text), taskId = tasks[0].id, otherId = tasks[1].id;
  const childId = M.parseDocument(M.getDocument(space.text, owner.result)!, space.text).items.find(row => !row.isCanonical)!.id;
  const progress = accept(recordProgramTaskProgress(data, { ...base(data, 'prior-progress'), taskId, date: '2026-10-07', percent: 40 })); data = progress.data;
  const memo = accept(createProgramDocument(data, { ...base(data, 'optional-memo'), title: '상세 메모', raw: '원래 내용' }));
  const linked = accept(linkProgramTask(memo.data, { ...base(memo.data, 'link-existing-task'), documentId: memo.result, taskId }));
  data = linked.data; space = data.spaces[actorId];
  const referenceId = space.text.bindings.find(binding => binding.kind === 'task' && binding.docId === memo.result)!.lineId;
  assert(validateProgramData(data));
  return { data, taskId, otherId, childId, referenceId, documentId: owner.result, memoId: memo.result, workId: work.result, lifeId: life.result };
}

test('explicit classification changes only the selected canonical Item owner entries and its request receipt', () => {
  const f = fixture(), before = programClone(f.data), space = before.spaces[actorId];
  assert(canClassifyProgramTask(f.data, f.taskId));
  const result = accept(setProgramTaskClassification(f.data, { ...base(f.data, 'classify-life'), taskId: f.taskId, folderId: f.lifeId }));
  assert(result.changed); assert.equal(result.result, f.taskId);
  const text = result.data.spaces[actorId].text;
  assert.equal(text.taskScopes[f.taskId], f.lifeId); assert.equal(text.itemScopes[f.taskId], f.lifeId);
  assert.equal(text.taskScopes[f.otherId], f.workId); assert.equal(text.itemScopes[f.childId], f.workId);
  const comparable = programClone(result.data);
  comparable.spaces[actorId].text.taskScopes[f.taskId] = space.text.taskScopes[f.taskId];
  comparable.spaces[actorId].text.itemScopes[f.taskId] = space.text.itemScopes[f.taskId]; comparable.receipts.pop();
  assert.deepEqual(comparable, before); assert.deepEqual(f.data, before);
});

test('classification respects explicit ownership while raw scope ancestry and placement remain unchanged', () => {
  const f = fixture(), originalRaw = M.raw(M.getDocument(f.data.spaces[actorId].text, f.documentId));
  const result = accept(setProgramTaskClassification(f.data, { ...base(f.data, 'no-implicit-ancestry'), taskId: f.taskId, folderId: f.lifeId }));
  const text = result.data.spaces[actorId].text, row = M.rowMeta(text, f.documentId).find(item => item.id === f.taskId)!;
  assert.equal(M.raw(M.getDocument(text, f.documentId)), originalRaw);
  assert.equal(row.ancestorScopeId, f.workId); assert.equal(row.scopeId, f.lifeId); assert.equal(row.scopeMismatch, true);
  assert.deepEqual(M.tasks(text, { folder: f.lifeId }).map(task => task.id), [f.taskId]);
  assert.deepEqual(M.tasks(text, { folder: f.workId }).map(task => task.id), [f.otherId]);
});

test('same request replays once and a changed target folder rejects the duplicate request', () => {
  const f = fixture(), input = { ...base(f.data, 'classification-replay'), taskId: f.taskId, folderId: f.lifeId };
  const first = accept(setProgramTaskClassification(f.data, input)), before = programClone(first.data);
  const replay = accept(setProgramTaskClassification(first.data, input));
  assert.equal(replay.result, f.taskId); assert.equal(replay.changed, false); assert.equal(replay.data, first.data);
  const changed = setProgramTaskClassification(first.data, { ...input, folderId: f.workId });
  assert(!changed.ok && changed.reason === 'duplicate-request'); assert.deepEqual(first.data, before);
});

test('same folder choice is a byte no-op without a new receipt', () => {
  const f = fixture(), before = programClone(f.data);
  const result = accept(setProgramTaskClassification(f.data, { ...base(f.data, 'same-owner'), taskId: f.taskId, folderId: f.workId }));
  assert.equal(result.changed, false); assert.equal(result.data, f.data); assert.deepEqual(f.data, before);
});

test('missing folder, missing Item, invalid identifiers and child/reference targets never mutate', () => {
  const f = fixture(), before = programClone(f.data);
  for (const [taskId, folderId, reason] of [
    [f.taskId, 'missing-folder', 'missing'], ['missing-task', f.lifeId, 'missing'], ['', f.lifeId, 'invalid'],
    [f.taskId, '', 'invalid'], [f.childId, f.lifeId, 'unresolved'], [f.referenceId, f.lifeId, 'unresolved'],
  ]) {
    const result = setProgramTaskClassification(f.data, { ...base(f.data, `rejected-${taskId}-${folderId}`), taskId, folderId });
    assert(!result.ok && result.reason === reason, `${taskId}/${folderId}`); assert.equal(result.data, f.data); assert.deepEqual(f.data, before);
  }
  assert(!canClassifyProgramTask(f.data, f.referenceId)); assert(!canClassifyProgramTask(f.data, f.childId));
  assert(!canClassifyProgramTask(f.data, 'missing-task'));
});

test('stale displayed space and an account switch reject classification before changing any owner', () => {
  const f = fixture(), input = { ...base(f.data, 'stale-owner-choice'), taskId: f.taskId, folderId: f.lifeId };
  const changed = programClone(f.data); changed.spaces[actorId].position.scrollTop++;
  const stale = setProgramTaskClassification(changed, input); assert(!stale.ok && stale.reason === 'conflict');
  const switched = programClone(f.data); switched.activeActorId = 'creator-minji';
  const before = programClone(switched), denied = setProgramTaskClassification(switched, input);
  assert(!denied.ok && denied.reason === 'conflict'); assert.deepEqual(switched, before); assert(!canClassifyProgramTask(switched, f.taskId));
});

test('archive, trash, retained document, saved source identity and private Flow protect their canonical owners', () => {
  for (const protection of ['archive', 'trash', 'retention', 'saved-source', 'flow'] as const) {
    const f = fixture(), data = programClone(f.data), space = data.spaces[actorId];
    if (protection === 'archive' || protection === 'trash' || protection === 'retention') space.archivedDocumentIds.push(f.documentId);
    if (protection === 'trash') space.documentTrash = { [f.documentId]: { trashedAt: '2026-10-07T00:00:00Z', wasArchived: false } };
    if (protection === 'retention') space.retentionDocuments = { [f.memoId]: f.documentId };
    if (protection === 'saved-source') space.savedBindings.push({ savedCopyId: 'legacy-copy', flowId: 'legacy-flow', flowRef: 'legacy-ref',
      documentId: f.documentId, itemLines: { sourceItem: f.taskId }, sourceRevision: 'legacy-version' });
    if (protection === 'flow') {
      const index = space.text.documents.findIndex(doc => doc.id === f.documentId), doc = space.text.documents.splice(index, 1)[0];
      space.text.flows.push({ ...doc, private: true, sourceVersion: 'private-flow-version' });
    }
    assert(validateProgramData(data), protection); assert(!canClassifyProgramTask(data, f.taskId), protection);
    const before = programClone(data), result = setProgramTaskClassification(data,
      { ...base(data, `locked-${protection}`), taskId: f.taskId, folderId: f.lifeId });
    assert(!result.ok && result.reason === 'unresolved', protection); assert.deepEqual(data, before, protection);
  }
});

test('an ordinary personal checkbox owned by a Flow scope is not offered a folder classification', () => {
  const f = fixture(), data = programClone(f.data), space = data.spaces[actorId];
  const flow = { ...programClone(space.text.documents[0]), id: 'scope-source-flow', title: '연결 원본', lines: [], private: true as const, sourceVersion: 'source-v1' };
  space.text.flows.push(flow); space.text.taskScopes[f.taskId] = flow.id; space.text.itemScopes[f.taskId] = flow.id;
  assert(validateProgramData(data)); assert(!canClassifyProgramTask(data, f.taskId));
  const before = programClone(data), result = setProgramTaskClassification(data,
    { ...base(data, 'flow-owner'), taskId: f.taskId, folderId: f.lifeId });
  assert(!result.ok && result.reason === 'unresolved'); assert.deepEqual(data, before);
});

test('ordinary copied Items and recurring series retain their source identity instead of becoming personal folder tasks', () => {
  const initial = createProgramData();
  const recurring = programRecurringScheduleFromDraft({ version: 1, raw: '매일', end: '5회', startKind: 'fixed',
    startValue: '2026-10-07', time: '', timeZone: 'Asia/Seoul' }); assert(recurring);
  initial.public.flows.push({ id: 'source-flow', ownerId: 'creator-minji', currentVersionId: 'source-v1', category: '생활',
    situations: [], derivedFrom: null, archived: false });
  initial.public.versions.push({ id: 'source-v1', flowId: 'source-flow', number: 1, parentVersionId: null, title: '계약 검증 원본',
    summary: '', items: [
      { id: 'source-ordinary', title: '일회 확인', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] },
      { id: 'source-series', title: '매일 확인', description: '', completionCriteria: '', sourceUrl: null, schedule: recurring, subchecks: [] },
    ], source: { kind: 'simulated-example', label: '합성 계약 예시', url: null, checkedAt: null }, createdBy: 'creator-minji',
    createdAt: '2026-10-07T00:00:00.000Z' });
  const imported = accept(importProgramPublicVersion(initial, { ...base(initial, 'copy-source'), versionId: 'source-v1',
    itemIds: ['source-ordinary', 'source-series'], anchor: null }));
  const copy = imported.data.spaces[actorId].copies[0];
  for (const taskId of Object.values(copy.itemLines)) {
    assert(!canClassifyProgramTask(imported.data, taskId));
    const before = programClone(imported.data), result = setProgramTaskClassification(imported.data,
      { ...base(imported.data, `classify-copy-${taskId}`), taskId, folderId: 'folder-unfiled' });
    assert(!result.ok && result.reason === 'unresolved'); assert.deepEqual(imported.data, before);
  }
});
