import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { programFolderCreationLocation, programFolderInputSuggestion, programFolderSuggestionPreservesSource, programFolderSuggestions } from './folder-link-suggestions';
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

test('unknown list name proposes the existing creation path without creating or binding', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, '- 새 업무');
  const lineId = state.documents[0].lines[0].id, before = JSON.stringify(state);
  assert.deepEqual(programFolderInputSuggestion(state, docId, lineId), { lineId, title: '새 업무', folders: [] });
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(programFolderSuggestions(state, docId, lineId), []);
  assert.equal(programFolderInputSuggestion(state, docId, null), null);
  assert.equal(programFolderInputSuggestion(state, 'missing', lineId), null);
  assert.equal(programFolderInputSuggestion(state, docId, 'missing'), null);
});

test('a name change replaces the current proposal and never partially matches an existing name', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, '- 미분류');
  const lineId = state.documents[0].lines[0].id;
  assert.equal(programFolderInputSuggestion(state, docId, lineId)?.folders[0]?.id, 'folder-unfiled');
  state = M.editText(state, docId, '- 미분');
  assert.deepEqual(programFolderInputSuggestion(state, docId, lineId), { lineId, title: '미분', folders: [] });
  assert.equal(state.folders.length, 1); assert.equal(state.bindings.length, 0);
});

test('creation proposals preserve note, task, property, subtree, reference and scope boundaries', () => {
  for (const raw of ['', '- ', '그냥 메모', '# 메모', '- [ ] 새 폴더',
    '- [ ] 할 일\n  - 메모: 새 폴더\n  - 시간: 09:30\n  - 날짜: 2026-10-01']) {
    let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
    const docId = state.documents[0].id;
    state = M.editText(state, docId, raw);
    const before = JSON.stringify(state);
    for (const line of state.documents[0].lines) assert.equal(programFolderInputSuggestion(state, docId, line.id), null, raw);
    assert.equal(JSON.stringify(state), before);
  }
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, '- 새 폴더\n  - 자식');
  assert.equal(programFolderInputSuggestion(state, docId, state.documents[0].lines[0].id), null);
  state = M.editText(state, docId, '- 새 폴더');
  const lineId = state.documents[0].lines[0].id;
  state = linkProgramFolder(state, docId, lineId, { title: '새 폴더' });
  assert.equal(programFolderInputSuggestion(state, docId, lineId), null);
  state = M.addTask(state, { docId, title: '참조 원문' });
  const taskId = M.tasks(state)[0].id;
  state = M.addDocument(state, { title: '참조 문서' });
  const refDocId = state.documents.at(-1)!.id;
  state = M.linkTask(state, refDocId, 0, taskId);
  assert.equal(programFolderInputSuggestion(state, refDocId, state.documents.at(-1)!.lines[0].id), null);
});

test('unknown names are proposed only where the existing model can create a folder', () => {
  for (const raw of ['- 부모 메모\n  - 새 폴더', `- ${'a'.repeat(101)}`]) {
    let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
    const docId = state.documents[0].id;
    state = M.editText(state, docId, raw);
    const lineId = state.documents[0].lines.at(-1)!.id, before = JSON.stringify(state);
    assert.equal(linkProgramFolder(state, docId, lineId, { title: M.rowMeta(state, docId).at(-1)!.text.trim().slice(2) }), state);
    assert.equal(programFolderInputSuggestion(state, docId, lineId), null);
    assert.equal(JSON.stringify(state), before);
  }
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  const docId = state.documents[0].id;
  state = { ...state, flows: [{ ...state.documents[0], id: 'flow-source', title: '연결 Flow', private: true, sourceVersion: 'v1', lines: [] }] };
  state = M.editText(state, docId, '- 연결 Flow'); state = M.attachScope(state, docId, 0, 'flow-source');
  state = M.editText(state, docId, '- 연결 Flow\n  - 새 폴더');
  const childId = state.documents[0].lines[1].id;
  assert(M.validate(state)); assert.equal(linkProgramFolder(state, docId, childId, { title: '새 폴더' }), state);
  assert.equal(programFolderInputSuggestion(state, docId, childId), null);
});

test('folder nesting remains available but maximum catalog depth cannot offer creation', () => {
  for (const depth of [1, M.MAX_DEPTH]) {
    let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
    const docId = state.documents[0].id;
    state = { ...state, folders: [...state.folders, ...Array.from({ length: depth }, (_, index) => ({
      id: `folder-${index}`, title: `부모${index}`, parentId: index ? `folder-${index - 1}` : null,
    }))] };
    state = M.editText(state, docId, `- 부모${depth - 1}`);
    state = M.attachScope(state, docId, 0, `folder-${depth - 1}`);
    state = M.editText(state, docId, `- 부모${depth - 1}\n  - 새 자식`);
    const lineId = state.documents[0].lines[1].id, before = JSON.stringify(state);
    assert(M.validate(state));
    const proposal = programFolderInputSuggestion(state, docId, lineId), linked = linkProgramFolder(state, docId, lineId, { title: '새 자식' });
    assert.equal(proposal !== null, depth < M.MAX_DEPTH);
    assert.equal(linked !== state, depth < M.MAX_DEPTH); assert.equal(JSON.stringify(state), before);
    if (depth < M.MAX_DEPTH) assert.equal(linked.folders.find(folder => folder.title === '새 자식')?.parentId, `folder-${depth - 1}`);
  }
});

test('nested notes may offer existing folders while ancestor-cycle choices are absent', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, '- 부모 메모\n  - 미분류');
  const lineId = state.documents[0].lines[1].id;
  assert.equal(programFolderInputSuggestion(state, docId, lineId)?.folders[0]?.id, 'folder-unfiled');
  assert.notEqual(linkProgramFolder(state, docId, lineId, { scopeId: 'folder-unfiled' }), state);
  state = M.editText(state, docId, '- 미분류'); state = M.attachScope(state, docId, 0, 'folder-unfiled');
  state = M.editText(state, docId, '- 미분류\n  - 미분류');
  const cycleId = state.documents[0].lines[1].id;
  assert.equal(linkProgramFolder(state, docId, cycleId, { scopeId: 'folder-unfiled' }), state);
  assert.equal(programFolderInputSuggestion(state, docId, cycleId), null);
});

test('creation location reports top-level or the actual parent path without changing the document', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  const docId = state.documents[0].id;
  state = { ...state, folders: [...state.folders, { id: 'company', title: '회사', parentId: null }, { id: 'work', title: '업무', parentId: 'company' }] };
  state = M.editText(state, docId, '- 새 폴더');
  assert.equal(programFolderCreationLocation(state, docId, state.documents[0].lines[0].id), '최상위');
  state = M.editText(state, docId, '- 업무'); state = M.attachScope(state, docId, 0, 'work');
  // The existing scope action inserts a child slot; a named child reuses its slot.
  assert.equal(programFolderCreationLocation(state, docId, state.documents[0].lines[0].id), '회사 / 업무');
  state = M.editText(state, docId, '- 업무\n  - 새 폴더');
  const lineId = state.documents[0].lines[1].id, before = JSON.stringify(state);
  assert.equal(programFolderCreationLocation(state, docId, lineId), '회사 / 업무');
  assert.equal(JSON.stringify(state), before);
  const next = linkProgramFolder(state, docId, lineId, { title: '새 폴더' });
  assert.equal(next.folders.find(folder => folder.title === '새 폴더')?.parentId, 'work');
});

test('proposal spelling must round-trip through an explicit connection without changing whitespace', () => {
  for (const title of ['새 폴더', '미분류']) for (const raw of [`-  ${title}`, `- ${title} `, `-   ${title}   `]) {
    let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
    const docId = state.documents[0].id;
    state = M.editText(state, docId, raw);
    const before = JSON.stringify(state), lineId = state.documents[0].lines[0].id;
    assert(M.validate(state)); assert.equal(programFolderInputSuggestion(state, docId, lineId), null);
    assert.deepEqual(programFolderSuggestions(state, docId, lineId), []);
    assert.equal(JSON.stringify(state), before); assert.equal(M.raw(state.documents[0]), raw);
  }
});

test('the existing 100-folder limit hides only new creation and allows the 99-to-100 boundary', () => {
  for (const count of [99, 100]) {
    let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
    const docId = state.documents[0].id;
    state = { ...state, folders: [...state.folders, ...Array.from({ length: count - state.folders.length }, (_, index) => ({
      id: `capacity-folder-${index}`, title: `용량${index}`, parentId: null,
    }))] };
    state = M.editText(state, docId, '- 새 폴더');
    const lineId = state.documents[0].lines[0].id, before = JSON.stringify(state);
    assert(M.validate(state)); assert.equal(programFolderInputSuggestion(state, docId, lineId) !== null, count === 99);
    assert.equal(JSON.stringify(state), before);
    const created = linkProgramFolder(state, docId, lineId, { title: '새 폴더' });
    assert.equal(created !== state, count === 99); assert.equal(created.folders.length, 100);
    if (count === 99) assert(programFolderSuggestionPreservesSource(state, created));
    state = M.editText(state, docId, '- 미분류');
    const existingLineId = state.documents[0].lines[0].id;
    assert.equal(programFolderInputSuggestion(state, docId, existingLineId)?.folders[0]?.id, 'folder-unfiled');
    const linked = linkProgramFolder(state, docId, existingLineId, { scopeId: 'folder-unfiled' });
    assert.notEqual(linked, state); assert.equal(linked.folders.length, count);
    assert(programFolderSuggestionPreservesSource(state, linked));
  }
});

test('the existing 5000-binding limit hides all proposals and permits one final explicit connection', () => {
  for (const count of [4_999, 5_000]) {
    const initial = createEmptyTextWorkspace();
    const documents = Array.from({ length: 5 }, (_, docIndex) => ({
      id: `capacity-doc-${docIndex}`, title: `문서${docIndex}`, folder: '미분류', folderId: 'folder-unfiled',
      lines: Array.from({ length: Math.min(1_000, count - docIndex * 1_000) }, (_, index) => ({
        id: `capacity-line-${docIndex}-${index}`, text: '- 미분류',
      })),
    }));
    const bindings = documents.flatMap(doc => doc.lines.map(line => ({
      kind: 'scope' as const, docId: doc.id, lineId: line.id, scopeId: 'folder-unfiled',
    })));
    for (const title of ['새 폴더', '미분류']) {
      const state = { ...initial, documents: documents.map((doc, index) => index ? doc : {
        ...doc, lines: [...doc.lines, { id: 'capacity-candidate', text: `- ${title}` }],
      }), bindings };
      const docId = state.documents[0].id, before = JSON.stringify(state);
      assert(M.validate(state)); assert.equal(state.bindings.length, count);
      const proposal = programFolderInputSuggestion(state, docId, 'capacity-candidate');
      assert.equal(proposal !== null, count === 4_999); assert.equal(JSON.stringify(state), before);
      const next = linkProgramFolder(state, docId, 'capacity-candidate', title === '미분류' ? { scopeId: 'folder-unfiled' } : { title });
      assert.equal(next !== state, count === 4_999); assert.equal(next.bindings.length, 5_000);
      if (count === 4_999) assert(programFolderSuggestionPreservesSource(state, next));
    }
  }
});

test('source preservation compares ordered document and Flow identities and every raw line', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  state = M.editText(state, state.documents[0].id, '- 새 폴더\n보존할 메모  ');
  state = { ...state, flows: [{ ...state.documents[0], id: 'private-flow', private: true, sourceVersion: 'v1',
    lines: [{ id: 'private-flow-line', text: '비공개 메모  ' }] }] };
  assert(M.validate(state));
  for (const owner of ['documents', 'flows'] as const) for (const change of ['owner-id', 'line-id', 'text', 'append']) {
    const next = structuredClone(state);
    if (change === 'owner-id') next[owner][0].id += '-changed';
    if (change === 'line-id') next[owner][0].lines[0].id += '-changed';
    if (change === 'text') next[owner][0].lines[0].text += '변경';
    if (change === 'append') next[owner][0].lines.push({ id: 'added-line', text: '추가' });
    assert.equal(programFolderSuggestionPreservesSource(state, next), false, `${owner}:${change}`);
  }
  assert(programFolderSuggestionPreservesSource(state, structuredClone(state)));
});
