import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { programFolderSuggestions } from './folder-link-suggestions';
import { linkProgramFolder } from './folder-link-slot';

test('exact names retain IDs and distinct parent paths with no writes', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  state = { ...state, folders: [...state.folders,
    { id: 'a', title: '회사', parentId: null }, { id: 'b', title: '개인', parentId: null },
    { id: 'a-work', title: '업무', parentId: 'a' }, { id: 'b-work', title: '업무', parentId: 'b' }] };
  const id = state.documents[0].id;
  state = M.editText(state, id, '- 업무');
  const before = JSON.stringify(state), lineId = state.documents[0].lines[0].id;
  assert.deepEqual(programFolderSuggestions(state, id, lineId), [
    { id: 'a-work', title: '업무', path: '회사 / 업무' }, { id: 'b-work', title: '업무', path: '개인 / 업무' },
  ]);
  assert.equal(JSON.stringify(state), before);
  const linked = linkProgramFolder(state, id, lineId, { scopeId: 'b-work' });
  assert.deepEqual(programFolderSuggestions(linked, id, lineId), []);
});

test('empty, partial, prose, tasks, child-bearing and bound rows never suggest', () => {
  for (const raw of ['- ', '- 미분', '미분류', '- [ ] 미분류', '- 미분류\n  - 자식']) {
    let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
    const id = state.documents[0].id;
    state = M.editText(state, id, raw);
    assert.deepEqual(programFolderSuggestions(state, id, state.documents[0].lines[0]?.id ?? null), []);
    assert.deepEqual(programFolderSuggestions(state, id, null), []);
  }
});
