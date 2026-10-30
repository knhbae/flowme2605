import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { programCalendarDate } from './date-label';
import { readProgramFolderRegions } from './folder-document-regions';
import { textWorkspaceModel as M, type TextRow, type TextWorkspaceState } from './text-workspace';

// W8 review F1·F2: folder-view context lines must read like the body. What the user wrote stays literal
// (fenced code with an HTML comment, a task titled with a dated URL, a note), and only a date line, a task's
// 날짜 property and a folder line's own tag are drawn differently. A normal [미정] date line reads 날짜 미정.
const regionSource = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramFolderRegionEditor.tsx', import.meta.url), 'utf8');
function regionContextText(): (row: TextRow) => string {
  const tree = ts.createSourceFile('ProgramFolderRegionEditor.tsx', regionSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'regionContextText') found = node; ts.forEachChild(node, visit); };
  visit(tree);
  assert(found);
  const code = ts.transpileModule(found.getText(tree).replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('programCalendarDate', `${code}\nreturn regionContextText;`)(programCalendarDate);
}
const fresh = () => ({ version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState);
/** The real model and folder view: the context row the folder editor draws for `match`. */
function context(raw: string, match: (row: TextRow) => boolean, post?: (state: TextWorkspaceState) => TextWorkspaceState) {
  const edited = M.editTextResult(fresh(), 'd', raw, { folderText: true });
  assert.equal(edited.reason ?? null, null);
  const state = post ? post(edited.state) : edited.state, scope = M.rowMeta(state, 'd').find(row => row.kind === 'scope');
  const view = scope && readProgramFolderRegions(state, 'd', scope.scopeId!);
  const row = view?.regions.flatMap(region => region.contextRows).find(match);
  assert(row, 'the row is a context row of the folder view');
  return { row, shown: regionContextText()(row) };
}

test('F1: fenced code keeps its HTML comment in a context line', () => {
  const { row, shown } = context('[2026-10-30]\n- /합성\n  ```html\n  <!-- W8 literal keep -->\n  ```\n  본문', row => row.text.includes('W8 literal keep'));
  assert.equal(row.kind, 'fence');
  assert.equal(shown, '<!-- W8 literal keep -->');
});

test('F1: a linked task titled with a dated URL is shown as written', () => {
  const { row, shown } = context('[2026-10-30]\n- /합성\n  \n  본문', row => !!row.isReference && !!row.title?.includes('example.com'), state => {
    state = M.addDocument(state, { title: '참조 원본', folderId: 'f' });
    const other = state.documents.find(doc => doc.id !== 'd')!;
    state = M.addTask(state, { docId: other.id, title: 'https://example.com/2026-10-30', scopeId: 'f' });
    const task = M.parseDocument(M.getDocument(state, other.id)!, state).tasks[0];
    return M.linkTask(state, 'd', 2, task.id);
  });
  assert.equal(shown, '☐ https://example.com/2026-10-30');
  assert.equal(row.isReference, true);
});

test('F1: only a date line and a task\'s 날짜 property are drawn as dates; other dates stay as written', () => {
  const draw = regionContextText(), row = (kind: string, text: string, extra: Partial<TextRow> = {}) => draw({ kind, text, ...extra } as TextRow);
  assert.equal(row('note', '회의 2026-10-30 정리'), '회의 2026-10-30 정리');
  assert.equal(row('note', '- 목록 [2026-10-30]'), '• 목록 [2026-10-30]');
  assert.equal(row('note', '메모 <!-- 남김 -->'), '메모 <!-- 남김 -->');
  assert.equal(row('task', '- [ ] 2026-10-30 보고', { title: '2026-10-30 보고', done: false }), '☐ 2026-10-30 보고');
  assert.equal(row('property', '    - 메모: 2026-10-30에 확인'), '메모: 2026-10-30에 확인');
  assert.equal(row('property', '    - 날짜: 2026-10-31'), '날짜: 10월 31일 (토)');
  assert.equal(row('date', '[2026-10-30]', { date: '2026-10-30' }), '10월 30일 (금)');
  // Only the folder line's own tag is metadata.
  assert.equal(row('scope', '- /합성 <!-- flowme-folder:v1 id=f -->'), '합성');
  assert.equal(row('scope', '- /합성 <!-- 내 메모 -->'), '합성 <!-- 내 메모 -->');
});

test('F2: a normal [미정] date line reads 날짜 미정, as in the body', () => {
  const { row, shown } = context('[미정]\n- /합성\n  본문', row => row.kind === 'date');
  assert.equal(row.date ?? row.groupDate ?? null, null);
  assert.equal(shown, '날짜 미정');
});
