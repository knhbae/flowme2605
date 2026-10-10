import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyAccount } from '../../tests/e2e/alpha-auth.fixture';
import { seedJourneyNative } from '../../tests/e2e/flow-execution-journey.fixture';
import { validateAlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { feedbackDateRaw, prepareFeedbackDateAccount } from './feedback-ux-date-browser';

// This file invokes only the initial account preparation, never the browser
// runner, fixture routing, a server, DOM, Auth, clipboard or persistence.
function fixture(withOtherDocument = false) {
  const empty = emptyAccount('a');
  assert(validateAlphaAccount(empty, emptyAlphaReferences(empty.ownerId), empty.ownerId));
  const native = seedJourneyNative(empty);
  assert(validateAlphaAccount(native, emptyAlphaReferences(native.ownerId), native.ownerId));
  if (withOtherDocument) {
    native.space.text = M.addDocument(native.space.text, { title: '별도 보존 문서' });
    const otherId = native.space.text.documents.at(-1)!.id;
    native.space.text = M.editText(native.space.text, otherId,
      '보존할 원문  \t\n[2026-09-30]\n- [ ] 보존할 작업\n  - 메모: 다른 소유 메모\n  - 시간: 08:15\n끝 원문  ');
    const otherTask = M.tasks(native.space.text).find(task => task.docId === otherId)!;
    native.space.text = M.recordProgress(native.space.text, otherTask.id, '2026-09-30', 60);
  }
  native.space.text = M.addDocument(native.space.text, { title: '합성 UX · today-source' });
  const docId = native.space.text.documents.at(-1)!.id;
  assert.equal(M.raw(M.getDocument(native.space.text, docId)), '');
  return { empty, initial: native, docId };
}

test('actual date preparation validates the requested empty/native/new-document chain and exact 10-Item source', () => {
  const f = fixture(), before = JSON.stringify(f.initial), result = prepareFeedbackDateAccount(f.initial, f.docId);
  assert(M.validate(result.space.text));
  assert(validateAlphaAccount(result, emptyAlphaReferences(result.ownerId), result.ownerId));
  assert.equal(M.raw(M.getDocument(result.space.text, f.docId)), feedbackDateRaw);
  const tasks = M.tasks(result.space.text).filter(task => task.docId === f.docId);
  assert.equal(tasks.length, 10); assert(tasks.every(task => task.isCanonical));
  assert.equal(new Set(tasks.map(task => task.id)).size, 10);
  assert.deepEqual(tasks.filter(task => task.done).map(task => [task.title, task.date]), [
    ['지난 완료 확인', '2026-10-01'], ['오늘 완료 확인', '2026-10-02'],
  ]);
  const duplicates = tasks.filter(task => task.title === '같은 이름');
  assert.equal(duplicates.length, 2); assert.notEqual(duplicates[0].id, duplicates[1].id);
  assert.deepEqual(duplicates.map(task => [task.date, task.note]), [
    ['2026-10-01', '지난 원문'], ['2026-10-02', '오늘 원문'],
  ]);
  assert.equal(tasks.find(task => task.title === '이후 예정 확인')?.date, '2026-10-03');
  assert.equal(tasks.find(task => task.title === '미정 확인')?.date, null);
  assert.equal(JSON.stringify(f.initial), before, 'Preparing the copy must not mutate the initial account');
  assert.equal(f.empty.space.creatorWorkspace, undefined, 'Native fixture did not modify its empty-account input');
});

test('actual preparation creates only three folder scopes and six exact anchors with the existing parent/child ownership', () => {
  const f = fixture(), result = prepareFeedbackDateAccount(f.initial, f.docId), text = result.space.text;
  const added = text.folders.filter(folder => !f.initial.space.text.folders.some(old => old.id === folder.id));
  assert.equal(added.length, 3);
  const parent = added.find(folder => folder.title === '날짜 QA 묶음')!;
  const child = added.find(folder => folder.title === '날짜 QA 하위')!;
  const outside = added.find(folder => folder.title === '날짜 QA 바깥')!;
  assert(parent && child && outside);
  assert.equal(parent.parentId, null); assert.equal(child.parentId, parent.id); assert.equal(outside.parentId, null);
  const bindings = text.bindings.filter(binding => binding.kind === 'scope').filter(binding => binding.docId === f.docId);
  assert.equal(bindings.length, 6); assert.equal(new Set(bindings.map(binding => binding.scopeId)).size, 3);
  assert.deepEqual(bindings.map(binding => binding.scopeId), [parent.id, child.id, parent.id, child.id, outside.id, parent.id]);
  const document = M.getDocument(text, f.docId)!;
  for (const binding of bindings) {
    const scope = added.find(folder => folder.id === binding.scopeId)!;
    assert.equal(document.lines.find(line => line.id === binding.lineId)?.text.trim(), '- ' + scope.title);
  }
  const tasks = M.tasks(text).filter(task => task.docId === f.docId);
  for (const task of tasks) {
    const folderId = task.title.startsWith('하위 ') ? child.id : task.title === '다른 폴더 확인' ? outside.id : parent.id;
    assert.equal(task.folderId, folderId, task.title); assert.equal(task.scopeId, folderId, task.title);
  }
  assert.equal(document.folderId, f.initial.space.text.documents.at(-1)!.folderId, 'Execution scope is not document storage relocation');
});

test('the 20% seed record belongs to the exact override Item and does not rewrite its date/time/note or same-title peers', () => {
  const f = fixture(), result = prepareFeedbackDateAccount(f.initial, f.docId), text = result.space.text;
  const tasks = M.tasks(text).filter(task => task.docId === f.docId), override = tasks.find(task => task.title === '개별 날짜 확인')!;
  assert(override); assert.equal(override.date, '2026-10-01'); assert.equal(override.groupDate, '2026-10-02');
  assert.equal(override.explicitDate, true); assert.equal(override.time, '09:30'); assert.equal(override.note, '개별 날짜 원문');
  const row = M.getDocument(text, f.docId)!.lines.find(line => line.id === override.id);
  assert.equal(row?.text, '  - [ ] 개별 날짜 확인'); assert.equal(override.done, false);
  assert.deepEqual(M.progressHistory(text, override.id), [{ date: '2026-09-30', percent: 20 }]);
  assert.deepEqual(M.latestProgress(text, override.id), { date: '2026-09-30', percent: 20 });
  const newRecords = text.progressRecords.filter(record => !f.initial.space.text.progressRecords.some(old => old.taskId === record.taskId));
  assert.deepEqual(newRecords, [{ taskId: override.id, date: '2026-09-30', percent: 20 }]);
  for (const peer of tasks.filter(task => task.title === '같은 이름')) assert.equal(M.latestProgress(text, peer.id), null);
  assert.equal(M.raw(M.getDocument(text, f.docId)), feedbackDateRaw);
});

test('seed-only execution requires neither DOM nor network and preserves the native creator, copies and a nonempty other document', () => {
  const originalFetch = globalThis.fetch; let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw Error('Date seed must never fetch'); };
  try {
    assert.equal(typeof (globalThis as { document?: unknown }).document, 'undefined');
    const f = fixture(true), before = JSON.stringify(f.initial), result = prepareFeedbackDateAccount(f.initial, f.docId);
    assert(validateAlphaAccount(result, emptyAlphaReferences(result.ownerId), result.ownerId));
    assert(Object.keys(result.space.creatorWorkspace!.library.records).length > 0, 'The creator preservation check is nonempty');
    assert.deepEqual(result.space.creatorWorkspace, f.initial.space.creatorWorkspace);
    assert.equal(result.space.copies, f.initial.space.copies); assert.deepEqual(result.space.copies, f.initial.space.copies);
    assert.deepEqual(result.space.text.documents.filter(doc => doc.id !== f.docId), f.initial.space.text.documents.filter(doc => doc.id !== f.docId));
    assert.equal(result.space.text.documents.filter(doc => doc.id !== f.docId).length, 1);
    assert.deepEqual(result.space.text.flows, f.initial.space.text.flows);
    for (const task of M.tasks(f.initial.space.text).filter(task => task.docId !== f.docId)) {
      assert.deepEqual(M.tasks(result.space.text).find(next => next.id === task.id), task);
      assert.deepEqual(M.progressHistory(result.space.text, task.id), M.progressHistory(f.initial.space.text, task.id));
    }
    assert.deepEqual({ ...result, space: { ...result.space, text: f.initial.space.text } }, f.initial);
    assert.equal(JSON.stringify(f.initial), before); assert.equal(networkCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('missing or already-authored target is refused without modifying the account or adding folders/records', () => {
  const f = fixture();
  for (const target of ['missing-document', f.docId]) {
    const initial = target === f.docId ? prepareFeedbackDateAccount(f.initial, f.docId) : f.initial;
    const before = JSON.stringify(initial);
    assert.throws(() => prepareFeedbackDateAccount(initial, target), /fresh empty synthetic document/);
    assert.equal(JSON.stringify(initial), before);
  }
});
