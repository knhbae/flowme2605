import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { programCalendarDate } from './date-label';
import { textWorkspaceModel as M, type TextRow, type TextWorkspaceState } from './text-workspace';

// W8 (items 25·26): the folder editor wrote in a monospace coding font while the body uses the reading
// font, and its context lines showed raw text with line numbers ("원문 1줄 · 문맥 / [2026-10-30]").
// Now the folder editor uses the body's font on the textarea, mirror and ruler together (one alone moves the
// caret), and context lines are drawn like the body without raw markers or "원문 n줄" labels.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const regionSource = read('../../../components/flow/integrated-poc/ProgramFolderRegionEditor.tsx');

function regionContextText(): (row: TextRow) => string {
  const tree = ts.createSourceFile('ProgramFolderRegionEditor.tsx', regionSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'regionContextText') found = node; ts.forEachChild(node, visit); };
  visit(tree);
  assert(found, 'regionContextText is declared in the component');
  const code = ts.transpileModule(found.getText(tree).replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('programCalendarDate', `${code}\nreturn regionContextText;`)(programCalendarDate);
}

/** The font-family a CSS rule sets for the selectors it lists. */
function fontRule(css: string, scope: string) {
  const rule = css.split('}').find(block => block.includes(scope) && block.includes('font-family'));
  assert(rule, scope);
  const selectors = rule.slice(0, rule.indexOf('{')), font = /font-family:\s*([^;]+);/.exec(rule)![1].trim();
  return { font, parts: ['.tle-textarea', '.tle-presentation', '.tle-native-ruler'].filter(part => selectors.includes(`[data-mode="live"] ${part}`)) };
}

test('the folder editor writes in the body font, on the textarea, mirror and ruler together (item 25)', () => {
  const body = fontRule(read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css'), '.host :global(.tle-root[data-mode="live"]');
  const region = fontRule(read('../../../components/flow/integrated-poc/ProgramFolderRegionEditor.module.css'), '.regionHost :global(.tle-root[data-mode="live"]');
  assert.equal(region.font, body.font);
  assert.deepEqual(region.parts, ['.tle-textarea', '.tle-presentation', '.tle-native-ruler']);
  assert.deepEqual(body.parts, region.parts);
  assert.doesNotMatch(region.font, /monospace/);
});

test('context lines read like the body: dates, folder names, tasks and properties without raw markers (item 26)', () => {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editTextResult(state, 'd', '[2026-10-30]\n- /합성 실행 A\n  - [ ] 장보기\n    - 날짜: 2026-10-31\n  - [x] 끝낸 일\n메모 한 줄\n- 목록 항목\n\n# 머리', { folderText: true }).state;
  const draw = regionContextText(), rows = M.rowMeta(state, 'd');
  const shown = rows.map(row => [row.kind, draw(row)]);
  assert.deepEqual(shown, [
    ['date', '10월 30일 (금)'],
    ['scope', '합성 실행 A'],
    ['task', '☐ 장보기'],
    ['property', '날짜: 10월 31일 (토)'],
    ['task', '☑ 끝낸 일'],
    ['note', '메모 한 줄'],
    ['note', '• 목록 항목'],
    ['blank', ''],
    ['heading', '머리'],
  ]);
  for (const [, text] of shown) assert.doesNotMatch(text, /\[|- \/|^- |\d{4}-\d{2}-\d{2}|<!--/, text);
  const tagged = { ...rows[1], text: '- /합성 실행 A <!-- flowme-folder:v1 id=f -->', scopeTitle: undefined } as TextRow;
  assert.equal(draw(tagged), '합성 실행 A', 'a folder tag is never shown');
});

test('the component draws context lines with that text and no "원문 n줄" labels', () => {
  assert.match(regionSource, /<span>\{regionContextText\(entry\.row\) \|\| ' '\}<\/span>/);
  assert.doesNotMatch(regionSource, /원문 \{entry|· 문맥|regionLabel|<pre>\{entry\.row\.text/);
});
