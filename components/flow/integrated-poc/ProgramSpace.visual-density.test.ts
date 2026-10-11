import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');
const editor = read('./ProgramTextEditor.module.css');
const space = read('./ProgramSpace.module.css');
const shell = read('./AlphaWorkspace.module.css');

test('Note A compact view rules cannot reflow the retained legacy workspace', () => {
  const compact = space.match(/\/\* Note A local tools must not reflow the retained legacy workspace\.[\s\S]*?\*\/([\s\S]*?)\/\* A work note\./)?.[1];
  assert(compact, 'the explicit compact Note A block must exist');
  const selectors: string[] = [];
  postcss.parse(compact).walkRules(rule => { selectors.push(...rule.selectors); });
  assert.equal(selectors.length, 24);
  for (const selector of selectors) {
    assert(selector.startsWith(':where(.space[data-note-layout="true"]) '), selector);
  }
  // Zero-specificity scope lets the later fully-readable Note A title rule
  // keep winning in source order, without touching /my.
  assert.match(space, /\.space\[data-note-layout="true"\] \.periodHeading h1 \{ position: static;[^}]*overflow: visible;/);
});

test('compact header retains save status, permanent warning and all auxiliary routes', () => {
  const source = read('./AlphaWorkspace.tsx');
  for (const label of ['서버 저장 상태', '개발계 안내', '계정 및 자료 관리', 'Flow · 다른 도구', '문서 정리 방식', '백업 · 복원 · 가져오기']) assert(source.includes(label));
  assert.match(source, /\{workspaceTools\}<\/div><\/details>/);
  assert.match(shell, /\.sync > \.management \{ grid-column: 2; grid-row: 1;/);
  assert.match(shell, /\.page > \.notice \{ grid-column: 1 \/ -1; grid-row: 2;/);
  assert.match(shell, /\.managementBody \{[^}]*max-height:[^}]*overflow: auto;/);
});

test('native surface shares its compact ruler while retaining one44px action rail', () => {
  postcss.parse(editor);
  // right8px +44px target +2px clearance, shared by native and mirror.
  assert.match(editor, /--tle-pad-right: 54px/);
  assert.match(editor, /\.tle-scheduled-date-open\) \{ width: 44px;/);
  assert.match(editor, /round\(down,[^\n]+44px\)/);
  assert.match(editor, /--tle-line: 26px/);
  assert.match(editor, /--program-editor-visible-height/);
  assert.match(editor, /\.tle-plus\) \{ display: none;/);
  // Row menu retains the same insertion panel instead of duplicating its button.
  const host = read('./ProgramTextEditor.tsx');
  assert.match(host, /aria-label="추가·연결"/);
  assert.match(host, /현재 줄에 추가/);
});

test('A note rows reveal full titles without losing accessible labels or the existing detail', () => {
  const css = postcss.parse(space), title: Record<string, string> = {};
  css.walkRules(rule => {
    if (rule.selectors.some(selector => ['.taskTitleText', '.space[data-note-layout="true"] .taskTitleText'].includes(selector))) {
      rule.walkDecls(declaration => { title[declaration.prop] = declaration.value; });
    }
  });
  const source = read('./ProgramSpace.tsx');
  assert.match(space, /\.task > button \{ background: transparent;/);
  assert.match(space, /:has\(\.content > \[role\], \.content > section, .+\.taskNotice\) \.contextActions \{ position: static;/);
  assert.equal(title.display, 'block');
  assert.equal(title['-webkit-line-clamp'], 'unset');
  assert.equal(title.overflow, 'visible');
  assert.equal(title['white-space'], 'normal');
  assert.equal(title['font-size'], '16px');
  assert.equal(title['line-height'], '26px');
  assert.match(source, /aria-label=\{`\$\{task.title\}/);
  assert.match(source, /<span className=\{styles.taskTitleText\}>\{task.title\}<\/span>/);
  assert(source.includes("detailTask?.title ?? '할 일을 찾을 수 없습니다'"));
});
