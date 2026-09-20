import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import editor from './vendor/text-editor.cjs';

function document(text: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '내 문서' });
  const id = state.documents[0].id;
  state = M.editText(state, id, text, { progressDate: '2026-09-12' });
  assert.equal(M.raw(state.documents[0]), text);
  return { state, id };
}

test('new workspace is independently allocated, empty, and valid', () => {
  const a = createEmptyTextWorkspace(), b = createEmptyTextWorkspace();
  assert(M.validate(a));
  assert.deepEqual(a.documents, []); assert.deepEqual(a.flows, []); assert.deepEqual(a.progressRecords, []);
  a.folders[0].title = 'changed'; assert.equal(b.folders[0].title, '미분류');
});

test('pure vendor exposes no historical storage or fixture entrypoint', () => {
  for (const name of ['KEY', 'read', 'write', 'createState']) assert.equal(name in M, false);
  const source = readFileSync(new URL('./vendor/text-model.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|storage\.getItem|storage\.setItem|function createState|ux-review:text-workspace/);
  assert.equal(typeof editor.create, 'function');
  const editorSource = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(editorSource, /global\.TextLiveEditor|\}\)\(window\)|localStorage/);
});

test('ID and dated cumulative progress survive title edits and structural moves', () => {
  let { state, id } = document('[2026-09-12]\n- [10] 준비\n  - [ ] 물품\n- [ ] 예약');
  const taskId = M.tasks(state)[0].id;
  state = M.recordProgress(state, taskId, '2026-09-13', 20);
  state = M.recordProgress(state, taskId, '2026-09-12', 5);
  assert.deepEqual(M.latestProgress(state, taskId), { date: '2026-09-13', percent: 20 });
  const renamed = M.updateTask(state, taskId, { title: '준비 확인' });
  const target = M.moveTargets(renamed, id, taskId).find(entry => entry.beforeLineId === null && entry.depth === 0);
  assert(target);
  const moved = M.moveSubtree(renamed, id, taskId, target.beforeLineId, target.depth);
  assert.notEqual(moved, renamed); assert(M.validate(moved));
  assert.deepEqual(moved.progressRecords, state.progressRecords);
  assert.equal(M.tasks(moved).find(task => task.id === taskId)?.title, '준비 확인');
  assert.equal(M.tasks(moved).find(task => task.id === taskId)?.date, '2026-09-12');
  const undo = JSON.parse(JSON.stringify(state)) as TextWorkspaceState;
  assert.deepEqual(M.progressHistory(undo, taskId), [{ date: '2026-09-12', percent: 5 }, { date: '2026-09-13', percent: 20 }]);
});

test('multiple document references retain one canonical execution target', () => {
  let { state, id } = document('- [ ] 준비');
  const canonicalId = M.tasks(state)[0].id;
  for (const title of ['일정 메모', '집 메모']) {
    state = M.addDocument(state, { title });
    const targetDoc = state.documents.at(-1)!;
    state = M.linkTask(state, targetDoc.id, 0, canonicalId);
  }
  state = M.recordProgress(state, canonicalId, '2026-09-12', 20);
  assert.equal(M.tasks(state).length, 1);
  assert.equal(state.bindings.length, 2);
  for (const doc of state.documents.filter(doc => doc.id !== id)) {
    assert.equal(M.rowMeta(state, doc.id)[0].progressTargetId, canonicalId);
  }
  const raw = M.raw(state.documents[1]).replace('준비', '준비 변경');
  const edited = M.editText(state, state.documents[1].id, raw);
  assert.equal(M.tasks(edited)[0].id, canonicalId);
  assert.equal(M.tasks(edited)[0].title, '준비 변경');
  assert.deepEqual(edited.progressRecords, state.progressRecords);
});

test('progress tokens retain their lexical distinction and reject dot-only ratio syntax', () => {
  for (const [token, percent] of [['20%', 20], ['20', 20], ['0.2', 20], ['1', 1], ['1.0', 100]] as const) {
    assert.equal(M.parseProgressToken(token).percent, percent);
  }
  assert.equal(M.parseProgressToken('.1').ok, false);
});

test('editor projection displays latest progress while retaining source spelling', () => {
  let { state, id } = document('- [10] 준비');
  const taskId = M.tasks(state)[0].id;
  state = M.recordProgress(state, taskId, '2026-09-13', 100);
  assert.equal(M.raw(state.documents[0]), '- [10] 준비');
  assert.equal(textEditorRows(state, id)[0].progressPercent, 100);
  assert.equal(textEditorRows(state, id)[0].progressTracked, true);
});

test('folder catalog supports 32 levels, rejects cycles and level 33', () => {
  const state = createEmptyTextWorkspace();
  for (let i = 1; i < 32; i++) state.folders.push({ id: `folder-${i}`, title: `폴더 ${i}`, parentId: i === 1 ? 'folder-unfiled' : `folder-${i - 1}` });
  assert(M.validate(state));
  const extra = structuredClone(state);
  extra.folders.push({ id: 'folder-32', title: '상한 초과', parentId: 'folder-31' });
  assert.equal(M.validate(extra), false);
  state.folders[0].parentId = 'folder-31'; assert.equal(M.validate(state), false);
});

test('source and dated history cannot be deleted by ambiguous or destructive raw edits', () => {
  const { state, id } = document('- [20] 준비\n- [ ] 예약');
  assert.equal(M.editText(state, id, ''), state);
  assert.equal(M.editText(state, id, '- [ ] 완전히 다름\n- [ ] 다른 일'), state);
});
