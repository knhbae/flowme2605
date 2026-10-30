import assert from 'node:assert/strict';
import test from 'node:test';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// D3 B, folder grammar 4th edition (W15). Typing a linked folder line's name changes nothing. Finished with Enter
// (folderMove) the line moves, with its tasks, to the folder of the new name in the same place, made if missing;
// other documents keep theirs. A folder no other document uses (by a folder line or by being stored in it) is
// renamed instead; one existing folder of that name in the place is joined; two of them refuse. The same place of
// a line linked elsewhere is the linked folder's parent (a). Left (folderLink) or pasted, nothing moves (b).
const TYPED = 'doc-typed', OTHER = 'doc-other';
function account(otherLines: string | null, otherFolder = 'f'): TextWorkspaceState {
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] },
    { id: OTHER, title: '다른 문서', folder: '합성', folderId: otherFolder, lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  if (otherLines !== null) text = M.editTextResult(text, OTHER, otherLines, { folderText: true }).state;
  return M.editTextResult(text, TYPED, '첫 줄\n- /회의\n  - [ ] 안건', { folderText: true }).state;
}
const scope = (state: TextWorkspaceState, docId: string, index: number) => {
  const line = M.getDocument(state, docId)!.lines[index];
  const binding = state.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
  return binding ? state.folders.find(folder => folder.id === binding.scopeId) ?? null : null;
};
const taskScope = (state: TextWorkspaceState, docId: string, index: number) =>
  state.folders.find(folder => folder.id === state.taskScopes[M.getDocument(state, docId)!.lines[index].id])?.title ?? null;
const held = (state: TextWorkspaceState, raw: string) => {
  const result = M.editTextResult(state, TYPED, raw, { folderText: true, folderHold: [1] });
  assert.equal(result.reason, null, raw); return result.state;
};
const finish = (state: TextWorkspaceState, option: 'folderMove' | 'folderLink' = 'folderMove') =>
  M.editTextResult(state, TYPED, M.raw(M.getDocument(state, TYPED)), { folderText: true, [option]: [1] });

test('typing renames nothing here or in other documents; the line keeps its folder', () => {
  const start = account('- /회의\n  - [ ] 다른 안건'), meeting = scope(start, TYPED, 1)!;
  let state = start;
  for (const raw of ['첫 줄\n- /주회의\n  - [ ] 안건', '첫 줄\n- /주간회의\n  - [ ] 안건']) {
    state = held(state, raw);
    assert.equal(state.folders.find(folder => folder.id === meeting.id)?.title, '회의', raw);
    assert.equal(scope(state, TYPED, 1)?.id, meeting.id, raw);
  }
});

test('Enter on a folder another document links moves only this line and its task to a new folder in the place', () => {
  const start = account('- /회의\n  - [ ] 다른 안건\n- /운동'), meeting = scope(start, TYPED, 1)!;
  const done = finish(held(start, '첫 줄\n- /주간회의\n  - [ ] 안건'));
  assert.equal(done.reason, null);
  const moved = scope(done.state, TYPED, 1)!;
  assert.equal(moved.title, '주간회의'); assert.notEqual(moved.id, meeting.id); assert.equal(moved.parentId, meeting.parentId);
  assert.equal(taskScope(done.state, TYPED, 2), '주간회의', 'its task follows');
  assert.equal(done.state.folders.find(folder => folder.id === meeting.id)?.title, '회의');
  assert.equal(M.raw(M.getDocument(done.state, OTHER)), M.raw(M.getDocument(start, OTHER)));
  assert.equal(scope(done.state, OTHER, 0)?.id, meeting.id);
  assert.deepEqual(done.folderMoved, { title: '주간회의', renamed: false });
});

test('a folder only this document uses is renamed; one stored-in document counts as using it (F1)', () => {
  const alone = account(null), meeting = scope(alone, TYPED, 1)!;
  const renamed = finish(held(alone, '첫 줄\n- /주간회의\n  - [ ] 안건'));
  assert.equal(scope(renamed.state, TYPED, 1)?.id, meeting.id);
  assert.equal(renamed.state.folders.find(folder => folder.id === meeting.id)?.title, '주간회의');
  assert.equal(renamed.state.folders.length, alone.folders.length, 'no empty folder left behind');
  assert.deepEqual(renamed.folderMoved, { title: '주간회의', renamed: true });
  // The other document has no folder line but is stored in 회의: the line moves, 회의 keeps its name.
  const stored = account(null), meetingId = scope(stored, TYPED, 1)!.id;
  const storedIn = { ...stored, documents: stored.documents.map(doc => doc.id === OTHER ? { ...doc, folderId: meetingId, folder: '회의' } : doc) } as TextWorkspaceState;
  const moved = finish(held(storedIn, '첫 줄\n- /주간회의\n  - [ ] 안건'));
  assert.equal(moved.reason, null);
  assert.equal(moved.state.folders.find(folder => folder.id === meetingId)?.title, '회의');
  assert.equal(scope(moved.state, TYPED, 1)?.title, '주간회의');
  assert.deepEqual(moved.folderMoved, { title: '주간회의', renamed: false });
});

test('an existing folder of the new name in the place is joined; two of them refuse', () => {
  const start = account('- /회의\n- /운동'), joined = finish(held(start, '첫 줄\n- /운동\n  - [ ] 안건'));
  assert.equal(joined.reason, null);
  assert.equal(scope(joined.state, TYPED, 1)?.id, scope(start, OTHER, 1)?.id, 'joins the existing 운동');
  assert.equal(joined.state.folders.length, start.folders.length);
  assert.equal(taskScope(joined.state, TYPED, 2), '운동');
  const twice = account('- /회의\n- /운동');
  const extra = { ...twice, folders: [...twice.folders, { id: 'old-dup', title: '운동', parentId: null }] } as TextWorkspaceState;
  const refused = finish(held(extra, '첫 줄\n- /운동\n  - [ ] 안건'));
  assert.equal(refused.reason, 'invalid-format');
  assert.equal(refused.folderProblem, 'name-conflict');
});

test('leaving the line (folderLink) or pasting a name moves nothing: the folder and its name stay (b)', () => {
  const start = account('- /회의\n- /운동'), meeting = scope(start, TYPED, 1)!;
  const left = finish(held(start, '첫 줄\n- /운동\n  - [ ] 안건'), 'folderLink');
  assert.equal(left.reason, null);
  assert.equal(scope(left.state, TYPED, 1)?.id, meeting.id, 'not joined on leaving');
  const pasted = M.editTextResult(start, TYPED, '첫 줄\n- /주간회의\n  - [ ] 안건', { folderText: true });
  assert.equal(pasted.reason, null);
  assert.equal(scope(pasted.state, TYPED, 1)?.id, meeting.id);
  assert.equal(pasted.state.folders.find(folder => folder.id === meeting.id)?.title, '회의');
  assert.equal(pasted.folderMoved, undefined);
});

test('a line linked to a folder elsewhere moves within that folder\'s parent (a)', () => {
  const base = account('- /회의');
  // The typed line sits at the top but is linked to 회사 › 회의 (picked from another place).
  const company = { id: 'co', title: '회사', parentId: null }, nested = { id: 'co-meeting', title: '회의', parentId: 'co' };
  const line = M.getDocument(base, TYPED)!.lines[1];
  const elsewhere = { ...base, folders: [...base.folders, company, nested],
    bindings: base.bindings.map(row => row.kind === 'scope' && row.docId === TYPED && row.lineId === line.id ? { ...row, scopeId: nested.id } : row),
    documents: base.documents.map(doc => doc.id === OTHER ? { ...doc, folderId: nested.id, folder: '회의' } : doc) } as TextWorkspaceState;
  const done = finish(held(elsewhere, '첫 줄\n- /주간회의\n  - [ ] 안건'));
  assert.equal(done.reason, null);
  const moved = scope(done.state, TYPED, 1)!;
  assert.equal(moved.title, '주간회의'); assert.equal(moved.parentId, 'co', '회사 › 주간회의');
});
