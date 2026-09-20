import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramController } from './controller';
import { programExecutionTasks } from './execution';
import { createProgramDocument, createProgramFolder, deleteProgramFolder, importProgramPublicVersion, linkProgramTask } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { previewProgramDocumentRevisionRestore, restoreProgramDocumentRevision, restoreProgramRawRevisionAsDocument, saveProgramDocumentRevision } from './document-revisions';

const actorId = 'local-user', now = '2026-09-12T12:00:00.000Z'; let sequence = 0;
const base = (data: ProgramData) => ({ actorId, requestId: `revision-${++sequence}`, expectedSpace: programClone(data.spaces[actorId]) });
function accepted(result: ProgramTransition<string>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture() {
  const initial = createProgramData();
  const created = accepted(createProgramDocument(initial, { ...base(initial), title: '내 문서', raw: '- [ ] 준비 A\n  - 날짜: 2026-09-15\n  - 메모: 원래 메모\n  - [ ] 하위 체크\n- [ ] 준비 B\n  - 날짜: 2026-09-16' }));
  const saved = accepted(saveProgramDocumentRevision(created.data, { ...base(created.data), documentId: created.result }, now));
  const tasks = M.tasks(saved.data.spaces[actorId].text);
  return { data: saved.data, docId: created.result, revisionId: saved.result, a: tasks[0].id, b: tasks[1].id };
}
const restore = (data: ProgramData, docId: string, revisionId: string) => restoreProgramDocumentRevision(data, { ...base(data), documentId: docId, revisionId });

test('explicit revision saves raw, line IDs, bindings and owners without creating execution records', () => {
  const { data, docId, revisionId } = fixture(), space = data.spaces[actorId], revision = space.draftRevisions.find(row => row.id === revisionId)!;
  assert(revision.identity); assert.equal(revision.raw, M.raw(M.getDocument(space.text, docId)));
  assert.deepEqual(revision.identity.lines, M.getDocument(space.text, docId)!.lines);
  assert.deepEqual(space.text.progressRecords, []);
  const again = accepted(saveProgramDocumentRevision(data, { ...base(data), documentId: docId }, now));
  assert.equal(again.changed, false); assert.equal(again.result, revisionId);
});

test('content restoration returns title/date/note while keeping latest progress and unrelated document content', () => {
  let { data, docId, revisionId, a } = fixture();
  const other = accepted(createProgramDocument(data, { ...base(data), title: '다른 문서', raw: '다른 문서의 최신 내용' })); data = other.data;
  const space = data.spaces[actorId];
  space.text = M.updateTask(space.text, a, { title: '바꾼 제목', date: '2026-10-01', note: '바꾼 메모' });
  space.text = M.recordProgress(space.text, a, '2026-09-12', 100);
  const beforeProgress = programClone(space.text.progressRecords), otherBefore = programClone(M.getDocument(space.text, other.result));
  const preview = previewProgramDocumentRevisionRestore(data, { actorId, documentId: docId, revisionId });
  assert(preview.ok && preview.result.restoresDatesAndNotes); assert.match(preview.result.effectiveRaw, /- \[x\] 준비 A/);
  const result = accepted(restore(data, docId, revisionId)), task = M.tasks(result.data.spaces[actorId].text).find(row => row.id === a)!;
  assert.equal(task.title, '준비 A'); assert.equal(task.date, '2026-09-15'); assert.equal(task.note, '원래 메모'); assert.equal(task.done, true);
  assert.deepEqual(result.data.spaces[actorId].text.progressRecords, beforeProgress);
  assert.deepEqual(M.getDocument(result.data.spaces[actorId].text, other.result), otherBefore);
});

test('newer tasks omitted by restore move with stable IDs and cumulative records into a retained document', () => {
  const { data, docId, revisionId } = fixture(), space = data.spaces[actorId];
  space.text = M.editText(space.text, docId, `${M.raw(M.getDocument(space.text, docId))}\n- [ ] 새 할 일\n  - 날짜: 2026-09-22\n  - 메모: 이후에 추가한 메모\n  - [ ] 새 하위 체크`);
  const added = M.tasks(space.text).find(task => task.title === '새 할 일')!, child = added.subchecks[0];
  space.text = M.recordProgress(space.text, added.id, '2026-09-12', 30);
  space.text = M.recordProgress(space.text, child.id, '2026-09-12', 60);
  const restored = accepted(restore(data, docId, revisionId)), next = restored.data.spaces[actorId], archiveId = next.retentionDocuments![docId];
  assert(archiveId); assert(next.archivedDocumentIds.includes(archiveId));
  assert(M.getDocument(next.text, archiveId)!.lines.some(line => line.id === added.id));
  assert.equal(M.latestProgress(next.text, added.id)?.percent, 30); assert.equal(M.latestProgress(next.text, child.id)?.percent, 60);
  assert.equal(M.tasks(next.text).find(task => task.id === added.id)?.note, '이후에 추가한 메모');
  assert(!programExecutionTasks(next).some(task => task.id === added.id));
  assert.equal(next.text.documents.flatMap(doc => doc.lines).filter(line => line.id === added.id).length, 1);
});

test('restoring a newer revision reactivates retained IDs without duplicate canonical targets', () => {
  let { data, docId, revisionId } = fixture();
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, docId, `${M.raw(M.getDocument(data.spaces[actorId].text, docId))}\n- [ ] 이후 항목`);
  const added = M.tasks(data.spaces[actorId].text).find(task => task.title === '이후 항목')!;
  const newer = accepted(saveProgramDocumentRevision(data, { ...base(data), documentId: docId }, now)); data = newer.data;
  data = accepted(restore(data, docId, revisionId)).data;
  const preview = previewProgramDocumentRevisionRestore(data, { actorId, documentId: docId, revisionId: newer.result });
  assert(preview.ok && preview.result.reactivatedItemIds.includes(added.id));
  data = accepted(restore(data, docId, newer.result)).data;
  assert(M.getDocument(data.spaces[actorId].text, docId)!.lines.some(line => line.id === added.id));
  assert.equal([...data.spaces[actorId].text.documents, ...data.spaces[actorId].text.flows].flatMap(doc => doc.lines).filter(line => line.id === added.id).length, 1);
  assert(programExecutionTasks(data.spaces[actorId]).some(task => task.id === added.id));
});

test('external reference targets and titles remain valid when canonical content restores or retires', () => {
  let { data, docId, revisionId, a } = fixture();
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, docId, `${M.raw(M.getDocument(data.spaces[actorId].text, docId))}\n- [ ] 이후 항목`);
  const added = M.tasks(data.spaces[actorId].text).find(task => task.title === '이후 항목')!;
  const other = accepted(createProgramDocument(data, { ...base(data), title: '연결 문서', raw: '최근 독립 메모' })); data = other.data;
  data = accepted(linkProgramTask(data, { ...base(data), documentId: other.result, taskId: a })).data;
  data = accepted(linkProgramTask(data, { ...base(data), documentId: other.result, taskId: added.id })).data;
  data.spaces[actorId].text = M.updateTask(data.spaces[actorId].text, a, { title: '수정한 제목' });
  const bindings = programClone(data.spaces[actorId].text.bindings);
  data = accepted(restore(data, docId, revisionId)).data;
  assert.deepEqual(data.spaces[actorId].text.bindings, bindings);
  const raw = M.raw(M.getDocument(data.spaces[actorId].text, other.result));
  assert.match(raw, /최근 독립 메모/); assert.match(raw, /준비 A/); assert.match(raw, /이후 항목/);
  assert(M.validate(data.spaces[actorId].text));
});

test('restoring reference rows keeps the target document current instead of restoring its old title', () => {
  let { data, a } = fixture();
  const other = accepted(createProgramDocument(data, { ...base(data), title: '연결' })); data = other.data;
  data = accepted(linkProgramTask(data, { ...base(data), documentId: other.result, taskId: a })).data;
  const saved = accepted(saveProgramDocumentRevision(data, { ...base(data), documentId: other.result }, now)); data = saved.data;
  data.spaces[actorId].text = M.updateTask(data.spaces[actorId].text, a, { title: '원본의 최신 제목' });
  const ownerBefore = programClone(data.spaces[actorId].text.documents[0]);
  data = accepted(restore(data, other.result, saved.result)).data;
  assert.deepEqual(data.spaces[actorId].text.documents[0], ownerBefore);
  assert.match(M.raw(M.getDocument(data.spaces[actorId].text, other.result)), /원본의 최신 제목/);
});

test('raw-only saved entries recover into a separate document without pretending to restore identity', () => {
  const { data, docId } = fixture(), space = data.spaces[actorId];
  space.draftRevisions.push({ id: 'raw-only', documentId: docId, title: '과거 메모', raw: '- [ ] 이전 내용', createdAt: now });
  const preview = previewProgramDocumentRevisionRestore(data, { actorId, documentId: docId, revisionId: 'raw-only' });
  assert(preview.ok && preview.result.mode === 'new-document');
  assert.equal(restore(data, docId, 'raw-only').ok, false);
  const result = accepted(restoreProgramRawRevisionAsDocument(data, { ...base(data), documentId: docId, revisionId: 'raw-only' }));
  assert.notEqual(result.result, docId); assert.equal(M.raw(M.getDocument(result.data.spaces[actorId].text, result.result)), '- [ ] 이전 내용');
  assert.deepEqual(M.getDocument(result.data.spaces[actorId].text, docId), M.getDocument(space.text, docId));
});

test('stale restore, foreign actor, missing scopes and changed request payload fail closed', () => {
  let { data, docId, revisionId, a } = fixture();
  const input = { ...base(data), documentId: docId, revisionId };
  data.spaces[actorId].text = M.updateTask(data.spaces[actorId].text, a, { title: '새 내용' });
  const stale = restoreProgramDocumentRevision(data, input); assert(!stale.ok && stale.reason === 'conflict');
  const foreign = restoreProgramDocumentRevision(data, { ...input, actorId: 'creator-minji', expectedSpace: data.spaces['creator-minji'] }); assert(!foreign.ok && foreign.reason === 'missing');
  const restored = accepted(restoreProgramDocumentRevision(data, { ...input, expectedSpace: programClone(data.spaces[actorId]) }));
  const replay = accepted(restoreProgramDocumentRevision(restored.data, { ...input, expectedSpace: input.expectedSpace })); assert.equal(replay.changed, false);
  const changed = restoreProgramDocumentRevision(restored.data, { ...input, revisionId: 'other' }); assert(!changed.ok && changed.reason === 'duplicate-request');
  let fresh = createProgramData();
  const folder = accepted(createProgramFolder(fresh, { ...base(fresh), title: '옛 폴더' })); fresh = folder.data;
  const doc = accepted(createProgramDocument(fresh, { ...base(fresh), title: '소유 문서', folderId: folder.result, raw: '- [ ] 할 일' })); fresh = doc.data;
  const saved = accepted(saveProgramDocumentRevision(fresh, { ...base(fresh), documentId: doc.result }, now)); fresh = saved.data;
  fresh = accepted(deleteProgramFolder(fresh, { ...base(fresh), folderId: folder.result })).data;
  const absent = restore(fresh, doc.result, saved.result); assert(!absent.ok && absent.reason === 'unresolved');
});

test('retained legacy item bindings and cursor positions stay valid after content restoration', () => {
  const { data, docId, revisionId } = fixture(), space = data.spaces[actorId];
  space.text = M.editText(space.text, docId, `${M.raw(M.getDocument(space.text, docId))}\n- [ ] 기존 연결 항목`);
  const task = M.tasks(space.text).find(task => task.title === '기존 연결 항목')!;
  space.legacyQuickItemLines['quick:item'] = task.id; space.legacyTimelinePolicies[task.id] = 'included';
  space.savedBindings.push({ savedCopyId: 'old-copy', flowId: 'old-flow', flowRef: 'old-ref', documentId: docId, itemLines: { old: task.id }, sourceRevision: 'old-revision' });
  space.position = { documentId: docId, lineId: task.id, start: 1, end: 1, scrollTop: 0 };
  const result = accepted(restore(data, docId, revisionId)), next = result.data.spaces[actorId];
  assert.equal(next.legacyQuickItemLines['quick:item'], task.id); assert.equal(next.savedBindings[0].itemLines.old, task.id);
  assert.notEqual(next.position.lineId, task.id); assert(validateProgramData(result.data));
});

test('restore is one controller transaction with Undo, reload, failure preservation and retry', async () => {
  const { data, docId, revisionId, a } = fixture();
  data.spaces[actorId].text = M.updateTask(data.spaces[actorId].text, a, { title: '복구 전 제목' });
  const values = new Map<string, string>([['flow:protected', 'keep']]); let fail = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (fail) throw Error('quota'); values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const controller = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert(controller.ok);
  const before = controller.snapshot(), input = { ...base(data), documentId: docId, revisionId };
  fail = true;
  assert.equal((await controller.mutate('판본 복구', current => restoreProgramDocumentRevision(current, input), { actorId })).ok, false);
  assert.deepEqual(controller.snapshot(), before); assert.equal(values.has(PROGRAM_STATE_KEY), false);
  fail = false;
  assert((await controller.mutate('판본 복구', current => restoreProgramDocumentRevision(current, input), { actorId })).ok);
  const reloaded = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert(reloaded.ok);
  assert.deepEqual(reloaded.snapshot(), controller.snapshot());
  assert((await reloaded.undo(actorId)).ok);
  assert.deepEqual(reloaded.snapshot().envelope.data.spaces[actorId], before.envelope.data.spaces[actorId]);
  assert.equal(values.get('flow:protected'), 'keep');
});

test('retired child inherits its previous execution date and reactivation recovers its subcheck role', () => {
  let { data, docId, revisionId, a } = fixture();
  const space = data.spaces[actorId], raw = M.raw(M.getDocument(space.text, docId));
  space.text = M.editText(space.text, docId, raw.replace('  - [ ] 하위 체크', '  - [ ] 하위 체크\n  - [ ] 새 하위 체크'));
  const child = M.parseDocument(M.getDocument(space.text, docId)!, space.text).items.find(item => item.title === '새 하위 체크')!;
  assert(child && !child.isCanonical); assert.equal(child.date, '2026-09-15');
  space.text = M.recordProgress(space.text, child.id, '2026-09-12', 100);
  const newer = accepted(saveProgramDocumentRevision(data, { ...base(data), documentId: docId }, now)); data = newer.data;
  data = accepted(restore(data, docId, revisionId)).data;
  const archived = M.tasks(data.spaces[actorId].text).find(task => task.id === child.id)!;
  assert.equal(archived.date, '2026-09-15'); assert.equal(archived.done, true);
  data = accepted(restore(data, docId, newer.result)).data;
  const revived = M.parseDocument(M.getDocument(data.spaces[actorId].text, docId)!, data.spaces[actorId].text).items.find(item => item.id === child.id)!;
  assert.equal(revived.isCanonical, false); assert.equal(revived.parentItemId, a); assert.equal(revived.done, true);
  assert(!programExecutionTasks(data.spaces[actorId]).some(task => task.id === child.id));
});

test('public-copy mappings remain valid when a later imported item moves to revision retention', () => {
  let data = createProgramData();
  data.public.flows.push({ id: 'flow-source', ownerId: 'creator-minji', currentVersionId: 'version-source', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-source', flowId: 'flow-source', number: 1, parentVersionId: null, title: '원문', summary: '',
    items: ['first', 'second'].map(id => ({ id, title: id, description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [{ id: `${id}-child`, title: '하위 체크' }] })),
    source: { kind: 'simulated-example', label: '검증 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: now });
  data = accepted(importProgramPublicVersion(data, { ...base(data), versionId: 'version-source', itemIds: ['first'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0], saved = accepted(saveProgramDocumentRevision(data, { ...base(data), documentId: copy.documentId }, now)); data = saved.data;
  data = accepted(importProgramPublicVersion(data, { ...base(data), versionId: 'version-source', itemIds: ['second'], anchor: null })).data;
  const lineId = data.spaces[actorId].copies[0].itemLines.second, childId = data.spaces[actorId].copies[0].subcheckLines.second['second-child'];
  data.spaces[actorId].text = M.recordProgress(data.spaces[actorId].text, childId, '2026-09-12', 50);
  data = accepted(restore(data, copy.documentId, saved.result)).data;
  const next = data.spaces[actorId];
  assert.equal(next.copies[0].itemLines.second, lineId); assert.equal(next.copies[0].subcheckLines.second['second-child'], childId);
  assert.equal(M.latestProgress(next.text, childId)?.percent, 50);
  assert(M.getDocument(next.text, next.retentionDocuments![copy.documentId])!.lines.some(line => line.id === lineId));
  assert(!programExecutionTasks(next).some(task => task.id === lineId));
});

test('numeric source spelling survives revision recovery while current cumulative records remain exact', () => {
  let { data, docId, a } = fixture();
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, docId, M.raw(M.getDocument(data.spaces[actorId].text, docId)).replace('- [ ] 준비 A', '- [1.0] 준비 A'));
  const saved = accepted(saveProgramDocumentRevision(data, { ...base(data), documentId: docId }, now)); data = saved.data;
  data.spaces[actorId].text = M.recordProgress(data.spaces[actorId].text, a, '2026-09-20', 20);
  const progress = programClone(data.spaces[actorId].text.progressRecords);
  data = accepted(restore(data, docId, saved.result)).data;
  assert.match(M.raw(M.getDocument(data.spaces[actorId].text, docId)), /\[1\.0\]/);
  assert.deepEqual(data.spaces[actorId].text.progressRecords, progress); assert.equal(M.latestProgress(data.spaces[actorId].text, a)?.percent, 20);
});

test('raw-only numeric text without a progress date fails safely instead of inventing a date', () => {
  const { data, docId } = fixture();
  data.spaces[actorId].draftRevisions.push({ id: 'unresolved-numeric', documentId: docId, title: '원문', raw: '- [20] 날짜 없는 숫자', createdAt: now });
  const before = programClone(data), result = restoreProgramRawRevisionAsDocument(data, { ...base(data), documentId: docId, revisionId: 'unresolved-numeric' });
  assert(!result.ok && result.reason === 'unresolved'); assert.deepEqual(data, before);
});

test('existing unchecked or checked progress without dated records is preserved without inventing history', () => {
  const { data, docId, revisionId, a } = fixture();
  data.spaces[actorId].text = M.updateTask(data.spaces[actorId].text, a, { done: true });
  assert.equal(data.spaces[actorId].text.progressRecords.length, 0);
  const restored = accepted(restore(data, docId, revisionId));
  assert.equal(M.tasks(restored.data.spaces[actorId].text).find(task => task.id === a)?.done, true);
  assert.deepEqual(restored.data.spaces[actorId].text.progressRecords, []);
});

test('retention keeps code-fence content and indentation without turning code examples into tasks', () => {
  const { data, docId, revisionId } = fixture(), space = data.spaces[actorId];
  const snippet = '\n```text\n    - [20] 코드 예시\n  원문 들여쓰기\n```';
  space.text = M.editText(space.text, docId, M.raw(M.getDocument(space.text, docId)) + snippet);
  assert(M.validate(space.text));
  const restored = accepted(restore(data, docId, revisionId)), next = restored.data.spaces[actorId];
  assert.equal(M.raw(M.getDocument(next.text, next.retentionDocuments![docId])), snippet.slice(1));
  assert(!M.tasks(next.text).some(task => task.title === '코드 예시'));
});
