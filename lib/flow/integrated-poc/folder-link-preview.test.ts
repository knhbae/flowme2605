import assert from 'node:assert/strict';
import test from 'node:test';
import { linkProgramFolder, prepareProgramFolderSlot } from './folder-link-slot';
import { isProgramFolderLinkPreviewCurrent, programFolderLinkPreview } from './folder-link-preview';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

function fixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '합성 문서' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, raw);
  return { state, docId, lineId: state.documents[0].lines[0]?.id ?? null };
}

function unchanged<T>(state: TextWorkspaceState, read: () => T): T {
  const before = JSON.stringify(state);
  const result = read();
  assert.equal(JSON.stringify(state), before);
  return result;
}

test('blank and childless named lines preview same-line conversion with the retained handoff ID', () => {
  for (const raw of ['- ', '- 새 폴더', '  - 새 폴더']) {
    // An indented candidate needs a real parent to be valid.
    const f = fixture(raw.startsWith('  ') ? `- 부모 메모\n${raw}` : raw);
    const lineId = f.state.documents[0].lines.at(-1)!.id;
    const preview = unchanged(f.state, () => programFolderLinkPreview(f.state, f.docId, lineId));
    assert(preview);
    assert.equal(preview.destination.relation, 'same-line');
    assert.equal(preview.destination.lineId, lineId);
    assert.equal(preview.source?.text, raw);
    assert.match(preview.locationLabel, /현재 줄/);
    assert(isProgramFolderLinkPreviewCurrent(f.state, preview));
    const slot = prepareProgramFolderSlot(f.state, f.docId, lineId)!;
    assert.equal(preview.destination.index, slot.index);
    assert.equal(preview.destination.depth, M.rowMeta(slot.state, f.docId)[slot.index].depth);
    const next = linkProgramFolder(f.state, f.docId, lineId, { scopeId: 'folder-unfiled' });
    assert.equal(next.documents[0].lines[preview.destination.index].id, lineId);
  }
});

test('general rows with descendants preview the actual exclusive subtree boundary', () => {
  const f = fixture('- 묶음\n  - 자식\n    - 손자\n- 뒤 항목');
  const preview = programFolderLinkPreview(f.state, f.docId, f.lineId)!;
  assert.equal(preview.destination.relation, 'after-subtree');
  assert.equal(preview.destination.index, 3);
  assert.equal(preview.destination.depth, 0);
  assert.equal(preview.destination.lineId, null);
  assert.equal(preview.destination.afterLineId, f.state.documents[0].lines[2].id);
  assert.equal(preview.destination.beforeLineId, f.state.documents[0].lines[3].id);
  assert.match(preview.locationLabel, /하위 묶음 뒤 4번째/);
  assert.equal(programFolderLinkPreview(f.state, f.docId, f.lineId, 'proposal'), null);
  const next = linkProgramFolder(f.state, f.docId, f.lineId, { title: '새 폴더' });
  assert.equal(next.documents[0].lines[3].text, '- 새 폴더');
  assert.deepEqual(next.documents[0].lines.slice(0, 3), f.state.documents[0].lines.slice(0, 3));
  assert.deepEqual(next.documents[0].lines[4], f.state.documents[0].lines[3]);
});

test('task and date menu previews preserve the source and agree with the existing slot helper', () => {
  for (const raw of ['- [ ] 할 일\n  - 메모: 그대로\n  - 시간: 09:30\n- 다음', '[2026-10-02]\n- [ ] 오늘 할 일\n[2026-10-03]\n- [ ] 내일 할 일']) {
    const f = fixture(raw), before = JSON.stringify(f.state);
    const preview = programFolderLinkPreview(f.state, f.docId, f.lineId)!;
    const slot = prepareProgramFolderSlot(f.state, f.docId, f.lineId)!;
    assert.equal(preview.destination.index, slot.index);
    assert.equal(preview.destination.depth, M.rowMeta(slot.state, f.docId)[slot.index].depth);
    assert.equal(preview.destination.lineId, null);
    assert.equal(programFolderLinkPreview(f.state, f.docId, f.lineId, 'proposal'), null);
    const next = linkProgramFolder(f.state, f.docId, f.lineId, { scopeId: 'folder-unfiled' });
    assert.deepEqual(next.documents[0].lines[0], f.state.documents[0].lines[0]);
    assert.equal(next.documents[0].lines[preview.destination.index].text, '- 미분류');
    assert.equal(JSON.stringify(f.state), before);
  }
});

test('leaf prose is inserted immediately below and does not become a folder', () => {
  const f = fixture('원문 메모\n- 다음');
  const preview = programFolderLinkPreview(f.state, f.docId, f.lineId)!;
  assert.equal(preview.destination.relation, 'after-line');
  assert.equal(preview.destination.index, 1);
  assert.match(preview.locationLabel, /바로 아래 2번째/);
  const next = linkProgramFolder(f.state, f.docId, f.lineId, { title: '새 폴더' });
  assert.deepEqual(next.documents[0].lines[0], f.state.documents[0].lines[0]);
});

test('a folder scope inserts inside the folder after its current children', () => {
  const f = fixture('- 부모');
  let state = linkProgramFolder(f.state, f.docId, f.lineId, { title: '부모' });
  state = M.editText(state, f.docId, '- 부모\n  - [ ] 할 일\n    - 메모: 보존\n- 바깥');
  const parentId = state.folders.find(folder => folder.title === '부모')!.id;
  const before = JSON.stringify(state), preview = programFolderLinkPreview(state, f.docId, f.lineId)!;
  assert.equal(preview.destination.relation, 'inside-scope');
  assert.equal(preview.destination.index, 3);
  assert.equal(preview.destination.depth, 1);
  assert.equal(preview.destination.parentLineId, f.lineId);
  assert.equal(preview.destination.scopeId, parentId);
  assert.equal(preview.destination.scopeKind, 'folder');
  assert.equal(preview.destination.scopePath, '부모');
  assert.equal(preview.creationLocation, '부모');
  assert.match(preview.locationLabel, /폴더 안, 하위 묶음 뒤 4번째/);
  const next = linkProgramFolder(state, f.docId, f.lineId, { title: '새 자식' });
  assert.equal(next.folders.find(folder => folder.title === '새 자식')?.parentId, parentId);
  assert.equal(next.documents[0].lines[3].text, '  - 새 자식');
  assert.equal(JSON.stringify(state), before);
});

test('a childless scope is an inside-scope insertion, never another same-line conversion', () => {
  const f = fixture('- 부모'), state = linkProgramFolder(f.state, f.docId, f.lineId, { title: '부모' });
  const preview = programFolderLinkPreview(state, f.docId, f.lineId)!;
  assert.equal(preview.destination.relation, 'inside-scope');
  assert.equal(preview.destination.index, 1);
  assert.equal(preview.destination.depth, 1);
  assert.equal(preview.destination.lineId, null);
  assert.equal(programFolderLinkPreview(state, f.docId, f.lineId, 'proposal'), null);
  assert.match(preview.locationLabel, /폴더 안 2번째/);
});

test('a Flow scope retains its current placement but does not offer new child-folder creation', () => {
  const f = fixture('- 연결 Flow');
  let state: TextWorkspaceState = { ...f.state, flows: [{ ...f.state.documents[0], id: 'flow-source',
    title: '연결 Flow', private: true, sourceVersion: 'v1', lines: [] }] };
  state = M.attachScope(state, f.docId, 0, 'flow-source');
  const preview = programFolderLinkPreview(state, f.docId, f.lineId)!;
  assert.equal(preview.destination.relation, 'inside-scope');
  assert.equal(preview.destination.scopeKind, 'flow');
  assert.equal(preview.destination.scopeId, 'flow-source');
  assert.equal(preview.creationLocation, null);
  assert.match(preview.locationLabel, /Flow 안 2번째/);
  assert.equal(linkProgramFolder(state, f.docId, f.lineId, { title: '새 자식' }), state);
  const existing = linkProgramFolder(state, f.docId, f.lineId, { scopeId: 'folder-unfiled' });
  assert.notEqual(existing, state);
  assert.equal(existing.documents[0].lines[preview.destination.index].text, '  - 미분류');
});

test('an explicit null selection previews document end but missing document or selected ID is refused', () => {
  for (const raw of ['', '- 첫 줄\n- 끝 줄']) {
    const f = fixture(raw), before = JSON.stringify(f.state);
    const preview = programFolderLinkPreview(f.state, f.docId, null)!;
    assert.equal(preview.source, null);
    assert.equal(preview.destination.relation, 'document-end');
    assert.equal(preview.destination.index, f.state.documents[0].lines.length);
    assert.equal(preview.destination.depth, 0);
    assert.equal(preview.destination.lineId, null);
    assert.equal(preview.destination.beforeLineId, null);
    assert.equal(programFolderLinkPreview(f.state, f.docId, 'missing-line'), null);
    assert.equal(programFolderLinkPreview(f.state, 'missing-doc', f.lineId), null);
    assert.equal(programFolderLinkPreview(f.state, f.docId, null, 'proposal'), null);
    assert.equal(JSON.stringify(f.state), before);
  }
});

test('preview reads consume no new line or folder IDs and retain records and source identity', context => {
  const f = fixture('- [ ] 기록 있는 할 일\n  - 메모: 원문\n- 선택한 메모\n  - 자식');
  const taskId = M.tasks(f.state)[0].id;
  const state = M.recordProgress(f.state, taskId, '2026-10-02', 40);
  const selected = state.documents[0].lines[2].id, before = JSON.stringify(state);
  // The model's ID generator uses randomUUID when available, otherwise Math.random.
  if (globalThis.crypto) context.mock.method(globalThis.crypto, 'randomUUID', () => { throw new Error('preview consumed an ID'); });
  context.mock.method(Math, 'random', () => { throw new Error('preview consumed an ID'); });
  for (let index = 0; index < 10; index++) assert(programFolderLinkPreview(state, f.docId, selected));
  assert.equal(JSON.stringify(state), before);
  const preview = programFolderLinkPreview(state, f.docId, selected)!;
  context.mock.restoreAll();
  const next = linkProgramFolder(state, f.docId, selected, { title: '별도 폴더' });
  assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.deepEqual(next.documents[0].lines.slice(0, 4), state.documents[0].lines.slice(0, 4));
  assert.equal(next.documents[0].lines[preview.destination.index].text, '- 별도 폴더');
});

test('typing and paste proposals require existing exact leaf predicates while direct menus keep their existing behavior', () => {
  for (const raw of ['- 미분류', '- 새 이름']) {
    const f = fixture(raw), proposal = programFolderLinkPreview(f.state, f.docId, f.lineId, 'proposal')!;
    assert.equal(proposal.mode, 'proposal');
    assert.equal(proposal.destination.relation, 'same-line');
    assert.equal(proposal.source?.text, raw);
  }
  for (const raw of ['-  미분류', '- 미분류 ', '- 부모\n  - 자식', '- [ ] 미분류', '미분류', '- ']) {
    const f = fixture(raw), before = JSON.stringify(f.state);
    assert.equal(programFolderLinkPreview(f.state, f.docId, f.lineId, 'proposal'), null, raw);
    assert(programFolderLinkPreview(f.state, f.docId, f.lineId, 'direct'), raw);
    assert.equal(JSON.stringify(f.state), before);
  }
});

test('same named folders keep distinct IDs and paths, and only the selected childless line is reused', () => {
  const f = fixture('- 업무\n- 그대로');
  const state = { ...f.state, folders: [...f.state.folders,
    { id: 'company', title: '회사', parentId: null }, { id: 'home', title: '개인', parentId: null },
    { id: 'company-work', title: '업무', parentId: 'company' }, { id: 'home-work', title: '업무', parentId: 'home' }] };
  const preview = programFolderLinkPreview(state, f.docId, f.lineId, 'proposal')!;
  assert(isProgramFolderLinkPreviewCurrent(state, preview));
  for (const scopeId of ['company-work', 'home-work']) {
    const next = linkProgramFolder(state, f.docId, f.lineId, { scopeId });
    assert.equal(next.documents[0].lines[0].id, preview.destination.lineId);
    assert.deepEqual(next.documents[0].lines[1], state.documents[0].lines[1]);
    assert.equal(next.bindings[0].kind === 'scope' && next.bindings[0].scopeId, scopeId);
  }
  const changed = M.editText(state, f.docId, '- 업무\n  - 새 자식\n- 그대로');
  assert.equal(programFolderLinkPreview(changed, f.docId, f.lineId, 'proposal'), null);
  assert.equal(isProgramFolderLinkPreviewCurrent(changed, preview), false);
});

test('stale selections refuse renamed text, removed IDs, moved rows, changed children, and scope bindings', () => {
  const f = fixture('- 선택\n  - 자식\n- 다른 줄');
  const preview = programFolderLinkPreview(f.state, f.docId, f.lineId)!;
  for (const raw of ['- 바뀐 선택\n  - 자식\n- 다른 줄', '- 선택\n  - 바뀐 자식\n- 다른 줄', '- 선택\n  - 자식\n  - 추가 자식\n- 다른 줄']) {
    assert.equal(isProgramFolderLinkPreviewCurrent(M.editText(f.state, f.docId, raw), preview), false, raw);
  }
  const removed = M.editText(f.state, f.docId, '- 다른 줄');
  assert.equal(isProgramFolderLinkPreviewCurrent(removed, preview), false);
  assert.equal(programFolderLinkPreview(removed, f.docId, f.lineId), null);
  const moved = { ...f.state, documents: [{ ...f.state.documents[0], lines: [f.state.documents[0].lines[2], ...f.state.documents[0].lines.slice(0, 2)] }] };
  assert(M.validate(moved));
  assert.equal(isProgramFolderLinkPreviewCurrent(moved, preview), false);
  const named = fixture('- 미분류'), namedPreview = programFolderLinkPreview(named.state, named.docId, named.lineId)!;
  assert.equal(isProgramFolderLinkPreviewCurrent(linkProgramFolder(named.state, named.docId, named.lineId, { scopeId: 'folder-unfiled' }), namedPreview), false);
});

test('catalog and parent changes invalidate a captured choice while an identical clone remains valid', () => {
  const f = fixture('- 선택'), preview = programFolderLinkPreview(f.state, f.docId, f.lineId)!;
  assert(isProgramFolderLinkPreviewCurrent(structuredClone(f.state), preview));
  const renamed = M.renameScope(f.state, 'folder-unfiled', '이름 변경');
  assert.notEqual(renamed, f.state);
  assert(M.validate(renamed));
  assert.equal(isProgramFolderLinkPreviewCurrent(renamed, preview), false);
  const rebased = { ...f.state, folders: [...f.state.folders, { id: 'parent', title: '부모', parentId: null }],
    documents: [{ ...f.state.documents[0], folder: '부모', folderId: 'parent' }] };
  assert(M.validate(rebased));
  assert.equal(isProgramFolderLinkPreviewCurrent(rebased, preview), false);
  assert.equal(isProgramFolderLinkPreviewCurrent(f.state, null), false);
  assert.equal(isProgramFolderLinkPreviewCurrent(f.state, undefined), false);
});

test('unrelated execution records do not replace a stable folder selection', () => {
  const f = fixture('- [ ] 할 일\n- 선택');
  const lineId = f.state.documents[0].lines[1].id, preview = programFolderLinkPreview(f.state, f.docId, lineId)!;
  const next = M.recordProgress(f.state, M.tasks(f.state)[0].id, '2026-10-02', 25);
  assert(isProgramFolderLinkPreviewCurrent(next, preview));
});
