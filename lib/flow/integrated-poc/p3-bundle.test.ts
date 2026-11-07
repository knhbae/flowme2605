import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// P3 bundle (11/7): folder name taps, the folder step's undo, short screens' tabs, tabs pressed during a save wait,
// and the imported intro line. The browser checks ran on the synthetic page; these pin the shapes they rely on.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const workspace = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
const workspaceCss = read('components/flow/integrated-poc/AlphaWorkspace.module.css');
const editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx');
const editorCss = read('components/flow/integrated-poc/ProgramTextEditor.module.css');
const vendor = read('lib/flow/integrated-poc/vendor/text-editor.cjs');
const fn = (source: string, head: string) => { const at = source.indexOf(head); assert.ok(at >= 0, head); return source.slice(at, source.indexOf('\n  }\n', at)); };

test('reading view: the folder line start is not a button; the folder opens from the line menu, after a save', () => {
  assert.match(editorCss, /\.tle-root\[data-mode="live"\] \.tle-scope-open\.tle-scope-control\) \{ pointer-events: none; \}/);
  const item = editor.slice(editor.indexOf('data-open-scope'), editor.indexOf('data-open-scope') + 400);
  assert.ok(item.includes("row.scopeKind === 'folder'") || editor.includes("row.scopeKind === 'folder' && row.scopeId && props.onOpenScope && <button type=\"button\" data-open-scope"));
  assert.match(item, /saveNow\(\)\.then\(saved => \{ if \(saved\) propsRef\.current\.onOpenScope\?\.\(scopeId\); \}\)/);
});

test('the folder step: one ↶ goes back to the text before it, ahead of the older folder-move undo; ↷ redoes it', () => {
  const undo = fn(editor, 'function undoInput('), redo = fn(editor, 'function redoInput(');
  assert.ok(undo.indexOf('if (undoBarFolder()) return;') >= 0 && undo.indexOf('if (undoBarFolder()) return;') < undo.indexOf('undoFolderMove()'));
  assert.ok(redo.includes('if (redoBarFolder() || redoBarDate()) return;'));
  const step = fn(editor, 'function stepBarFolder(');
  // Only while the text is still what the folder step left; it restores the whole state from before.
  assert.match(step, /state\.raw !== last\.raw/);
  assert.match(step, /apply\(redo \? last\.after : last\.before,/);
  assert.match(step, /folderNoticeRef\.current = null; setFolderNotice\(null\);/);
  // The '/' menu records its step as it applies (before the save ends).
  const slash = editor.slice(editor.indexOf("const done = apply(linked.state, '폴더 선택')"), editor.indexOf('if (!await done) return;', editor.indexOf("const done = apply(linked.state, '폴더 선택')")));
  assert.ok(slash.includes('written = draftRef.current?.getState();') && slash.includes('if (written && written.raw !== raw) barFolderUndo.current = { docId, before, after: written.working'));
});

test('short phone screens: the fixed tabs stay above the space content', () => {
  assert.match(workspaceCss, /@media \(max-width: 700px\) \{\s*\.page\[data-alpha-frame="b"\] \.globalNavigation \{ z-index: 40; \}/);
});

test('a tab pressed while a move waits on a save: the waiting move takes the newest tab, nothing is refused or lost', () => {
  const navigate = fn(workspace, 'async function navigate(');
  // A second press while the first waits retargets the flight instead of being refused.
  assert.ok(navigate.indexOf('flight.target = mine;') >= 0 && navigate.indexOf('flight.target = mine;') < navigate.indexOf("setMessage('먼저 저장 결과와 보관 입력을 확인해 주세요.')"));
  assert.match(navigate, /return flight\.target === mine \? result : 'superseded';/);
  const move = fn(workspace, 'async function moveAfterSave(');
  assert.match(move, /if \(afterPending && !await pendingSettled\(store\)\) return false;/);
  assert.match(move, /let \{ next \} = flight\.target;/);
  // A save that needs the person (conflict, recovery, sign-in) still stops the move.
  const settled = fn(workspace, 'async function pendingSettled(');
  for (const status of ['conflict', 'recovery-required', 'session-expired']) assert.ok(settled.includes(`'${status}'`), status);
  assert.match(workspace, /if \(destination\.view !== 'space' \|\| moveFlight\.current\) await navigate\(\{ view: 'space' \}\);/);
});

test("an imported '원문 소개:' line paints as a quiet 소개 label; the stored text keeps the line", () => {
  assert.match(vendor, /\} else if \(\/\^원문 소개:\/\.test\(line\)\) \{/);
  assert.match(vendor, /row\.classList\.add\('tle-line-intro'\);\r?\n\s+row\.append\(makeSpan\('tle-memo-syntax', intro\[1\]\), makeSpan\('tle-memo-text', intro\[2\]\)\);/);
  assert.match(editorCss, /\.tle-line-intro > \.tle-memo-syntax::before\) \{ content: '소개';/);
  assert.match(read('lib/flow/integrated-poc/private-space.ts'), /원문 소개: \$\{/);
});
