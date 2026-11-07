import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 7k stage 1 (11/7): a folder line's entrance gathers this document's parts of the folder (the folder region editor,
// written in place); the 쓰기 tab keeps it, only 전체 보기 ends it; the bar's 날짜 and 폴더 stay away there; the 분류
// tab's view of the folder stays one item further in the line's ⋮. The browser checks ran on the synthetic page.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx');
const space = read('components/flow/integrated-poc/ProgramSpace.tsx');

test("the folder line's ⋮ offers 이 폴더만 모아 보기 first (after a save), then 분류에서 이 폴더 보기", () => {
  const gather = editor.indexOf('data-gather-folder'), open = editor.indexOf('data-open-scope');
  assert.ok(gather > 0 && open > gather);
  const item = editor.slice(gather, open);
  assert.match(item, /saveNow\(\)\.then\(saved => \{ if \(saved\) propsRef\.current\.onGatherFolder\?\.\(scopeId\); \}\)/);
  assert.match(item, />이 폴더만 모아 보기</);
  assert.match(editor.slice(open, open + 400), />분류에서 이 폴더 보기</);
  // The line start control's own action (a key press on it) gathers a folder too.
  const action = editor.slice(editor.indexOf("if (action.type === 'scope-open') {"), editor.indexOf("if (['reference-open', 'task-origin'].includes(action.type))"));
  assert.match(action, /row\?\.scopeKind === 'folder' && propsRef\.current\.onGatherFolder/);
  assert.match(action, /\(gather \|\| propsRef\.current\.onOpenScope\)\?\.\(scopeId\)/);
});

test('the space gathers through changeFolder (it saves first), and not in a collection', () => {
  // Stage 2 (11/7): it also keeps the folder for this document's 폴더별.
  assert.match(space, /onGatherFolder=\{collectionMode \? undefined : scopeId => \{ if \(space\.text\.folders\.some\(item => item\.id === scopeId\)\) \{ keepViewFolder\(id, scopeId\); void changeFolder\(scopeId\); \} \}\}/);
});

test('the 쓰기 tab keeps the gathered folder; 오늘 shows everything; a folder picked in 분류 does not carry into 쓰기', () => {
  assert.match(space, /useEffect\(\(\) => \{ if \(period === 'documents'\) writingFolder\.current = folderId; \}, \[period, folderId\]\);/);
  assert.match(space, /if \(main\) \{ setQuery\(''\); if \(nextPeriod === 'documents'\) setFolderId\(writingFolder\.current\); else if \(nextPeriod === 'today'\) setFolderId\(''\); \}/);
});

test("the gathered view says '/이름만 보는 중' and ends by 전체 보기; the bar's 날짜 and 폴더 are not there", () => {
  const head = editor.slice(editor.indexOf('data-folder-gather'), editor.indexOf('data-folder-gather') + 700);
  assert.match(head, /<strong>\/\{folderView\?\.folderPath \?\? '선택한 폴더'\}<\/strong>만 보는 중/);
  assert.match(head, /data-gather-end[^>]*>전체 보기<\/button>/);
  assert.match(head, />폴더 전체 할 일<\/button>/);
  // The writing bar's body (날짜, 폴더) is drawn only outside a folder view.
  assert.match(editor, /body = place === 'bar' && !props\.folderId;/);
  assert.match(editor, /\{body && <button type="button" className=\{styles\.barWide\} data-bar-mode="date"/);
  assert.match(editor, /\{body && barButton\('folder'/);
});

test('in a folder view ↷ goes where ↶ went (the saved steps), not to the hidden whole editor', () => {
  const undo = editor.slice(editor.indexOf('function undoInput()'), editor.indexOf('function redoInput()'));
  const redo = editor.slice(editor.indexOf('function redoInput()'), editor.indexOf('function openRepeatFromTools()'));
  assert.match(undo, /props\.authoringMode && !props\.folderId\) editorRef\.current\?\.undo\(\); else if \(props\.onUndo && !state\?\.dirty\) void props\.onUndo\(\);/);
  assert.match(redo, /props\.authoringMode && !props\.folderId\) nativeHistory\('historyRedo'\); else if \(props\.onRedo && !state\?\.dirty\) void props\.onRedo\(\);/);
  // The ↷ buttons are on there (not while the view's input waits to be saved).
  assert.match(editor, /const redoOff = inputLocked \|\| !!props\.readOnly \|\| draft\.saving \|\| !!props\.folderId && draft\.dirty;/);
});
