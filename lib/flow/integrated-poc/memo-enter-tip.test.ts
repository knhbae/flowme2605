import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_MEMO_TIP_KEY, PROGRAM_MEMO_TIP_LIMIT, PROGRAM_MEMO_TIP_MS, PROGRAM_MEMO_TIP_TEXT, programMemoTipTake } from './memo-enter-tip';

// memo-enter (user decision 11/10): the tip after a memo-continuing Enter, the caret's memo line painted as a memo,
// and '글만 돌아갑니다' only while a folder step's notice is up.
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const memoryStorage = (start?: string) => { const map = new Map<string, string>(start === undefined ? [] : [[PROGRAM_MEMO_TIP_KEY, start]]);
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, map }; };

test('the tip: its words and time; shown the first three times on a device, then not; storage trouble never blocks it', () => {
  assert.equal(PROGRAM_MEMO_TIP_TEXT, '한 번 더 Enter → 메모 끝내고 새 할 일');
  assert.equal(PROGRAM_MEMO_TIP_MS, 3000);
  const storage = memoryStorage();
  assert.deepEqual(Array.from({ length: PROGRAM_MEMO_TIP_LIMIT + 2 }, () => programMemoTipTake(storage)), [true, true, true, false, false]);
  assert.equal(storage.map.get(PROGRAM_MEMO_TIP_KEY), '3');
  assert.equal(programMemoTipTake(memoryStorage('garbage')), true);
  assert.equal(programMemoTipTake(null), true);
  assert.equal(programMemoTipTake({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } }), true);
});

test("the caret's memo line keeps the memo look: '- 메모:' muted over its RAW advances; tasks and folders as before", () => {
  const vendor = read('lib/flow/integrated-poc/vendor/text-editor.cjs').replace(/\r/g, ''), css = read('lib/flow/integrated-poc/vendor/text-editor.css');
  assert(vendor.includes("const memo = !task && !scope && memoOwned ? /^([ \\t]+-\\s+메모:\\s?)(.*)$/.exec(line) : null;"));
  assert(vendor.includes("if (memo) { paint.append(makeSpan('tle-active-memo-syntax', memo[1]), makeSpan('tle-memo-text', memo[2])); row.append(paint); return; }"));
  assert(vendor.includes("paintActiveSyntax(row, line, task, safeMeta, checkOwner !== null && !!safeMeta && safeMeta.kind === 'property');"));
  assert(vendor.includes('paintActiveSyntax(row, line, null, safeMeta);'), 'the folder row call is unchanged');
  // Still only in live mode, off composition: IME keeps the native row.
  assert(vendor.includes("if (mode === 'live' && active && !composing && !fenced[index]) {\n            paintActiveSyntax(row, line, task, safeMeta, checkOwner"));
  const rule = /\.tle-active-memo-syntax \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(rule, /color: var\(--flowme-b-muted\);/);
  assert.doesNotMatch(rule, /padding|margin|border|font|letter-spacing|word-spacing|display/);
});

test('the host: the vendor hook shows the tip in the notice row, the next key or press or 3 s ends it; the stale folder undo words go', () => {
  const vendor = read('lib/flow/integrated-poc/vendor/text-editor.cjs').replace(/\r/g, ''), editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx');
  assert(vendor.includes("if (continued && !event.shiftKey && typeof config.onMemoContinue === 'function') config.onMemoContinue();"));
  assert(editor.includes('if(programMemoTipTake(storage))setMemoTip(++memoTipKeys.current);'));
  assert(editor.includes("...(memoTip !== null ? [{ tone: 'info' as const, text: PROGRAM_MEMO_TIP_TEXT, closeLabel: '알림 닫기', close: () => setMemoTip(null) }] : []),"));
  assert(editor.includes("host.addEventListener('keydown', clearMemoTip, true); host.addEventListener('pointerdown', clearMemoTip, true);"));
  assert(editor.includes("host.removeEventListener('keydown', clearMemoTip, true); host.removeEventListener('pointerdown', clearMemoTip, true);"));
  assert(/if \(memoTip === null\) return;[^\n]*PROGRAM_MEMO_TIP_MS/.test(editor));
  assert(editor.includes('if (!folderNotice) { draftRef.current?.endFolderNotice(); folderRawUndoRef.current = false; }'));
});
