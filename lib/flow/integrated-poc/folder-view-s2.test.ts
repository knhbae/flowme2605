import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 7k stage 2 (11/7): the writing view's 날짜별 | 폴더별 and the chips of the document's folders. A chip gathers that
// folder through stage 1's path (changeFolder: saved first, the region editor's rules); 날짜별 shows the whole document.
// This device remembers the folder last gathered in a document; 폴더별 opens on it (else the first folder).
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const space = read('components/flow/integrated-poc/ProgramSpace.tsx');
const css = read('components/flow/integrated-poc/ProgramSpace.module.css');

test('the switch: only in writing a document that has folders, not in a collection; it sits in the head line', () => {
  const fn = space.slice(space.indexOf('function viewSwitch('), space.indexOf('function recentLine('));
  assert.match(fn, /if \(collectionMode \|\| selected !== id \|\| period !== 'documents'\) return null;/);
  assert.match(fn, /if \(!folders\.length\) return null;/);
  assert.match(space, /headBelow=\{headInToolbar && selected === id \|\| recentTop \|\| views \? <>\{headInToolbar && selected === id \? docNotices : null\}\{views\}\{recentTop\}<\/> : undefined\}/);
});

test('날짜별 / 폴더별 / a chip go through changeFolder (saved first); 폴더별 opens on the folder kept for this document', () => {
  const fn = space.slice(space.indexOf('function viewSwitch('), space.indexOf('function recentLine('));
  assert.match(fn, /data-view-mode="date"[^>]*onClick=\{\(\) => \{ if \(folderId\) void changeFolder\(''\); \}\}/);
  assert.match(fn, /const gather = \(scopeId: string\) => \{ keepViewFolder\(id, scopeId\); if \(scopeId !== folderId\) void changeFolder\(scopeId\); \};/);
  assert.match(fn, /gather\(folders\.some\(folder => folder\.id === last\) \? last! : folders\[0\]\.id\)/);
  assert.match(fn, /aria-pressed=\{folder\.id === folderId\}/);
  // The line menu's 이 폴더만 모아 보기 keeps the folder too.
  assert.match(space, /onGatherFolder=\{collectionMode \? undefined : scopeId => \{ if \(space\.text\.folders\.some\(item => item\.id === scopeId\)\) \{ keepViewFolder\(id, scopeId\); void changeFolder\(scopeId\); \} \}\}/);
  // Kept in this device's storage, which may be unavailable.
  assert.match(space, /try \{ const kept = JSON\.parse\(localStorage\.getItem\(VIEW_FOLDER_KEY\) \|\| '\{\}'\); return typeof kept\?\.\[id\] === 'string' \? kept\[id\] : null; \} catch \{ return null; \}/);
});

test('the folders are the document\'s folder lines in first order, kept per text; chips have 44px press areas', () => {
  const fn = space.slice(space.indexOf('function docFoldersOf('), space.indexOf('const VIEW_FOLDER_KEY'));
  assert.match(fn, /row\.kind !== 'scope' \|\| row\.scopeKind !== 'folder' \|\| !row\.scopeId \|\| seen\.has\(row\.scopeId\)/);
  assert.match(fn, /docFoldersKept\.current\.get\(space\.text\)/);
  assert.match(css, /\.space \.viewChips > button \{[^}]*min-height: 44px;/);
  assert.match(css, /\.space \.viewModes \{[^}]*padding: 2px;/);
  assert.match(css, /\.space \.viewModes > button \{[^}]*min-height: 40px;/);
});
