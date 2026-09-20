import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone } from './contract';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { mergeProgramTextWorkspace } from './text-merge';

function fixture() {
  let text = M.addDocument(createEmptyTextWorkspace(), { title: '문서 A' });
  const a = text.documents[0].id; text = M.editText(text, a, '- [ ] A\n  - 날짜: 2026-09-12\n  - [ ] A 하위 체크');
  text = M.addDocument(text, { title: '문서 B' }); const b = text.documents[1].id;
  text = M.editText(text, b, '- [ ] B\n  - 날짜: 2026-09-13');
  return { text, a, b, aTask: M.tasks(text).find(task => task.docId === a)!.id, bTask: M.tasks(text).find(task => task.docId === b)!.id };
}

test('three-way merge preserves unrelated document edits and stable task IDs', () => {
  const { text, a, b, aTask, bTask } = fixture();
  const proposed = M.updateTask(text, aTask, { title: 'A 개인 수정' }), current = M.updateTask(text, bTask, { note: 'B에서 먼저 저장한 메모' });
  const snapshots = [text, proposed, current].map(programClone);
  const merged = mergeProgramTextWorkspace(text, proposed, current); assert(merged && M.validate(merged));
  assert.deepEqual(M.getDocument(merged, a), M.getDocument(proposed, a));
  assert.deepEqual(M.getDocument(merged, b), M.getDocument(current, b));
  assert.deepEqual([text, proposed, current], snapshots);
});

test('three-way merge preserves unrelated progress writes including completion source tokens', () => {
  const { text, aTask, bTask } = fixture();
  const proposed = M.updateTask(text, aTask, { note: '내 입력' });
  const current = M.recordProgress(text, bTask, '2026-09-13', 100);
  const merged = mergeProgramTextWorkspace(text, proposed, current); assert(merged);
  assert.equal(M.latestProgress(merged, bTask)?.percent, 100);
  assert.equal(M.tasks(merged).find(task => task.id === bTask)?.done, true);
  assert.equal(M.tasks(merged).find(task => task.id === aTask)?.note, '내 입력');
});

test('independent source content and progress-only writes on one target retain both changes', () => {
  const { text, aTask } = fixture();
  const proposed = M.updateTask(text, aTask, { title: '수정한 제목' }), current = M.recordProgress(text, aTask, '2026-09-12', 20);
  const merged = mergeProgramTextWorkspace(text, proposed, current); assert(merged);
  assert.equal(M.tasks(merged).find(task => task.id === aTask)?.title, '수정한 제목');
  assert.equal(M.latestProgress(merged, aTask)?.percent, 20);
});

test('same document conflicting content fails closed instead of merging by line guesswork', () => {
  const { text, aTask } = fixture();
  assert.equal(mergeProgramTextWorkspace(text, M.updateTask(text, aTask, { title: '첫 수정' }), M.updateTask(text, aTask, { title: '다른 수정' })), null);
  assert.equal(mergeProgramTextWorkspace(text, M.updateTask(text, aTask, { note: '새 메모' }), M.recordProgress(text, aTask, '2026-09-12', 100)), null);
});

test('same target and date progress conflict while unrelated target/date records merge', () => {
  const { text, aTask, bTask } = fixture();
  const proposed = M.recordProgress(text, aTask, '2026-09-12', 20), conflicting = M.recordProgress(text, aTask, '2026-09-12', 40);
  assert.equal(mergeProgramTextWorkspace(text, proposed, conflicting), null);
  const otherTarget = M.recordProgress(text, bTask, '2026-09-12', 60);
  const merged = mergeProgramTextWorkspace(text, proposed, otherTarget); assert(merged);
  assert.equal(M.latestProgress(merged, aTask)?.percent, 20); assert.equal(M.latestProgress(merged, bTask)?.percent, 60);
  const otherDate = M.recordProgress(text, aTask, '2026-09-13', 50);
  const dates = mergeProgramTextWorkspace(text, proposed, otherDate); assert(dates);
  assert.deepEqual(M.progressHistory(dates, aTask).map(row => row.percent), [20, 50]);
});

test('identical saves and unchanged proposed branches preserve current updates after reload', () => {
  const { text, aTask, bTask } = fixture(), proposed = M.updateTask(text, aTask, { title: '같은 수정' });
  assert.deepEqual(mergeProgramTextWorkspace(text, proposed, programClone(proposed)), proposed);
  const current = M.updateTask(proposed, bTask, { note: '다른 문서 기록' });
  assert.deepEqual(mergeProgramTextWorkspace(text, text, JSON.parse(JSON.stringify(current))), current);
});

test('parallel new documents survive and deletion against a changed document conflicts', () => {
  const { text, b, bTask } = fixture();
  const proposed = M.addDocument(text, { title: '새 문서 C' }), current = M.addDocument(text, { title: '새 문서 D' });
  const merged = mergeProgramTextWorkspace(text, proposed, current); assert(merged);
  assert.deepEqual(new Set(merged.documents.map(doc => doc.title)), new Set(['문서 A', '문서 B', '새 문서 C', '새 문서 D']));
  const deleted = programClone(text); deleted.documents = deleted.documents.filter(doc => doc.id !== b);
  delete deleted.taskScopes[bTask]; delete deleted.itemScopes[bTask]; assert(M.validate(deleted));
  assert.equal(mergeProgramTextWorkspace(text, deleted, M.updateTask(text, bTask, { title: '먼저 저장' })), null);
});

test('invalid input and dangling references fail closed without modifying any input', () => {
  const { text, aTask } = fixture(), invalid = programClone(text);
  invalid.itemScopes[aTask] = 'missing-folder';
  assert.equal(mergeProgramTextWorkspace(text, invalid, text), null);
  assert(M.validate(text));
});
