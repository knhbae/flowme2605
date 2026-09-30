import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { linkProgramFolder, programFolderLineTitle } from './folder-link-slot';

function fixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '합성 문서' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, raw);
  return { state, docId, lineId: state.documents[0].lines[0]?.id ?? null };
}
test('named folder line becomes one scope on the same line ID without duplicate text', () => {
  const f = fixture('- 새 폴더');
  assert.equal(programFolderLineTitle(f.state, f.docId, f.lineId), '새 폴더');
  const next = linkProgramFolder(f.state, f.docId, f.lineId, { title: '새 폴더' });
  assert(M.validate(next)); assert.equal(next.documents[0].lines.length, 1);
  assert.equal(next.documents[0].lines[0].id, f.lineId);
  assert.equal(M.raw(next.documents[0]), '- 새 폴더');
  assert.equal(M.rowMeta(next, f.docId)[0].kind, 'scope');
  assert.equal(next.bindings.length, 1); assert.equal(M.raw(f.state.documents[0]), '- 새 폴더');
});
test('existing folder connection replaces only explicitly selected leaf note and preserves others', () => {
  const f = fixture('- 폴더 이름\n- [ ] 그대로인 할 일\n  - 메모: 보존');
  const untouched = f.state.documents[0].lines.slice(1);
  const next = linkProgramFolder(f.state, f.docId, f.lineId, { scopeId: 'folder-unfiled' });
  assert.equal(next.documents[0].lines[0].id, f.lineId);
  assert.equal(next.documents[0].lines[0].text, '- 미분류');
  assert.deepEqual(next.documents[0].lines.slice(1), untouched);
});
test('invalid folder or duplicate name returns original state without leaking a blank', () => {
  const f = fixture('- 폴더 이름');
  for (const target of [{ scopeId: 'missing' }, { title: '' }, { title: '미분류' }, { title: 'a\nb' }]) {
    assert.equal(linkProgramFolder(f.state, f.docId, f.lineId, target), f.state);
  }
});
test('tasks, plain prose, heading, date and notes with children are not converted', () => {
  for (const raw of ['- [ ] 할 일\n  - 메모: 보존', '자유 메모', '# 제목', '[2026-09-30]', '- 부모\n  - 자식']) {
    const f = fixture(raw), before = f.state.documents[0].lines;
    assert.equal(programFolderLineTitle(f.state, f.docId, f.lineId), null);
    const next = linkProgramFolder(f.state, f.docId, f.lineId, { title: '별도 폴더' });
    assert(M.validate(next)); assert.deepEqual(next.documents[0].lines.slice(0, before.length), before);
    assert.equal(M.raw(next.documents[0]).split('별도 폴더').length, 2);
  }
});
test('blank list slot is reused and existing scope is never replaced', () => {
  const f = fixture('- '), next = linkProgramFolder(f.state, f.docId, f.lineId, { title: '업무' });
  assert.equal(next.documents[0].lines.length, 1); assert.equal(next.documents[0].lines[0].id, f.lineId);
  assert.equal(programFolderLineTitle(next, f.docId, f.lineId), null);
  const again = linkProgramFolder(next, f.docId, f.lineId, { title: '자식' });
  assert(M.validate(again)); assert.deepEqual(again.documents[0].lines[0], next.documents[0].lines[0]);
  assert.equal(again.folders.find(folder => folder.title === '자식')?.parentId, next.folders.find(folder => folder.title === '업무')?.id);
});
