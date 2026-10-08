import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');
const editor = read('./ProgramTextEditor.module.css');
const space = read('./ProgramSpace.module.css');
const shell = read('./AlphaWorkspace.module.css');

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
  assert.match(editor, /--tle-pad-right: 60px/);
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

test('a unified task row truncates only paint; accessible label and full detail remain', () => {
  postcss.parse(space);
  const source = read('./ProgramSpace.tsx');
  assert.match(space, /\.task > button \{ background: transparent;/);
  assert.match(space, /:has\(\.content > \[role\], \.content > section, .+\.taskNotice\) \.contextActions \{ position: static;/);
  assert.match(space, /\.taskTitleText \{[^}]*-webkit-line-clamp: 2;/);
  assert.match(source, /aria-label=\{`\$\{task.title\}/);
  assert.match(source, /<span className=\{styles.taskTitleText\}>\{task.title\}<\/span>/);
  assert(source.includes("detailTask?.title ?? '할 일을 찾을 수 없습니다'"));
});
