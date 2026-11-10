import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_MEMO_TIP_KEY, PROGRAM_MEMO_TIP_LIMIT, PROGRAM_MEMO_TIP_MS, PROGRAM_MEMO_TIP_TEXT, programMemoTipLeft, programMemoTipTake } from './memo-enter-tip';

// memo-enter (user decision and UX spec, 11/10): the tip after a memo-continuing Enter, the caret's memo line painted as
// one more memo line, and '글만 돌아갑니다' only while a folder step's notice is up.
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const memoryStorage = (start?: string) => { const map = new Map<string, string>(start === undefined ? [] : [[PROGRAM_MEMO_TIP_KEY, start]]);
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, map }; };

test('the tip: its words (no time in them) and its 3 s; shown three times on a device, then not', () => {
  assert.equal(PROGRAM_MEMO_TIP_TEXT, 'Enter 한 번 더: 메모 끝내고 새 할 일');
  assert.equal(PROGRAM_MEMO_TIP_MS, 3000);
  const storage = memoryStorage();
  assert.deepEqual(Array.from({ length: PROGRAM_MEMO_TIP_LIMIT + 2 }, () => programMemoTipTake(storage)), [true, true, true, false, false]);
  assert.deepEqual(JSON.parse(storage.map.get(PROGRAM_MEMO_TIP_KEY)!), { shown: 3, left: 0 });
});

test('the tip: once the memo was left by Enter on an empty memo line twice, it is learned and not shown again', () => {
  const storage = memoryStorage();
  assert.equal(programMemoTipTake(storage), true);
  programMemoTipLeft(storage);
  assert.equal(programMemoTipTake(storage), true, 'one leave is not yet learned');
  programMemoTipLeft(storage); programMemoTipLeft(storage);
  assert.deepEqual(JSON.parse(storage.map.get(PROGRAM_MEMO_TIP_KEY)!), { shown: 2, left: 2 });
  assert.equal(programMemoTipTake(storage), false);
});

test('the tip: storage that is missing, blocked or holds anything else never blocks it', () => {
  assert.equal(programMemoTipTake(null), true);
  assert.equal(programMemoTipTake(memoryStorage('garbage')), true);
  assert.equal(programMemoTipTake(memoryStorage('{"shown":"x","left":null}')), true);
  assert.equal(programMemoTipTake({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } }), true);
  assert.doesNotThrow(() => programMemoTipLeft({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } }));
});

test("the caret's memo line: the rail where the other memo lines have it, '- 메모:' muted over its RAW advances, the words ink", () => {
  const vendor = read('lib/flow/integrated-poc/vendor/text-editor.cjs').replace(/\r/g, ''), css = read('lib/flow/integrated-poc/vendor/text-editor.css');
  assert(vendor.includes("const memo = !task && !scope && memoOwned ? /^([ \\t]+-\\s+메모:\\s?)(.*)$/.exec(line) : null;"));
  assert(vendor.includes("if (memo) { paint.append(makeSpan('tle-active-memo-syntax', memo[1]), makeSpan('tle-active-memo-text', memo[2])); row.append(paint); return; }"));
  assert(vendor.includes("paintActiveSyntax(row, line, task, safeMeta, checkOwner !== null && !!safeMeta && safeMeta.kind === 'property');"));
  assert(vendor.includes('paintActiveSyntax(row, line, null, safeMeta);'), 'the folder row call is unchanged');
  // Still only in live mode, off composition: IME keeps the native row.
  assert(vendor.includes("if (mode === 'live' && active && !composing && !fenced[index]) {\n            paintActiveSyntax(row, line, task, safeMeta, checkOwner"));
  const rule = (selector: string) => new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  assert.match(rule('.tle-active-memo-syntax'), /color: var\(--flowme-b-muted\);/);
  assert.doesNotMatch(rule('.tle-active-memo-syntax'), /padding|margin|border|font|letter-spacing|word-spacing|display/);
  // The same rail as an off-caret memo line's: same box, same right.
  assert.equal(rule('.tle-active-memo-syntax::after'), rule('.tle-memo-syntax::after'));
  assert.equal(rule('.tle-active-memo-text'), '', 'the words keep the active layer\'s ink');
});

test('the host: the hooks, the notice row line, its ends (key, composition, press, leaving, ×, 3 s), none while another notice shows', () => {
  const vendor = read('lib/flow/integrated-poc/vendor/text-editor.cjs').replace(/\r/g, ''), editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx');
  assert(vendor.includes("if (continued && !event.shiftKey && typeof config.onMemoContinue === 'function') config.onMemoContinue();"));
  assert(vendor.includes("if (left && typeof config.onMemoExit === 'function') config.onMemoExit();"));
  assert(editor.includes('onMemoContinue:()=>{if(!memoTipBlockedRef.current&&programMemoTipTake(programMemoTipStorage()))setMemoTip(++memoTipKeys.current);},'));
  assert(editor.includes('onMemoExit:()=>{programMemoTipLeft(programMemoTipStorage());},'));
  assert(editor.includes('memoTipBlockedRef.current = !!moving || !!message && !panel || !!checkNotice || !!folderNotice || !!repeatNotice || !!writingNotice || !!heldView || !!locationNotice || !!scheduleNotice;'));
  assert(editor.includes("...(memoTip !== null ? [{ tone: 'info' as const, text: PROGRAM_MEMO_TIP_TEXT, closeLabel: '알림 닫기', close: () => setMemoTip(null) }] : []),"));
  assert.equal(editor.split("for (const type of ['keydown', 'compositionstart', 'pointerdown', 'focusout'])").length, 3, 'added and removed');
  assert(/if \(memoTip === null\) return;[^\n]*PROGRAM_MEMO_TIP_MS/.test(editor));
  assert(editor.includes('if (!folderNotice) { draftRef.current?.endFolderNotice(); folderRawUndoRef.current = false; }'));
});
