import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// A tablet run (11/3): the title tapped during a Korean composition said "입력과 저장을 마친 뒤 글 찾기를 열어
// 주세요…" in red, and the notice stayed about 70s after the composition ended and the save was done, until another
// action cleared the message (N6 too). The notice is about that moment: it goes once the composition and the input lock
// are over, or the find opens; another message in the same place is never taken with it.
const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the find notice goes when its moment ends, and only it', () => {
  const block = space.slice(space.indexOf('  function clearFindBlocked() {'), space.indexOf('  function openFindPanel() {'));
  const code = ts.transpileModule(`const extracted = (${block.trim().replace(/^function clearFindBlocked/, 'function')});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const FIND_BLOCKED = '입력과 저장을 마친 뒤 글 찾기를 열어 주세요. 현재 입력은 그대로 있습니다.';
  const run = (shown: boolean, composing: boolean, locks: number, message: string) => {
    const findBlocked = { current: shown }, libraryComposing = { current: composing }, inputLockCount = { current: locks };
    let current = message;
    const setMessage = (next: string | ((value: string) => string)) => { current = typeof next === 'function' ? next(current) : next; };
    new Function('findBlocked', 'libraryComposing', 'inputLockCount', 'setMessage', 'FIND_BLOCKED', code + '\nreturn extracted;')(
      findBlocked, libraryComposing, inputLockCount, setMessage, FIND_BLOCKED)();
    return [current, findBlocked.current];
  };
  assert.deepEqual(run(true, false, 0, FIND_BLOCKED), ['', false]);
  // Still composing, or a document action still holding the input: it stays.
  assert.deepEqual(run(true, true, 0, FIND_BLOCKED), [FIND_BLOCKED, true]);
  assert.deepEqual(run(true, false, 1, FIND_BLOCKED), [FIND_BLOCKED, true]);
  // Another message took its place meanwhile: that one stays.
  assert.deepEqual(run(true, false, 0, '저장하지 못했습니다.'), ['저장하지 못했습니다.', false]);
  assert.deepEqual(run(false, false, 0, '다른 안내'), ['다른 안내', false]);
  // Where it ends: the composition (after the whole compositionend, so nothing renders in the middle of it), the input
  // lock's release, and the find opening.
  assert(space.includes('onCompositionEndCapture={() => { libraryComposing.current = false; if (findBlocked.current) setTimeout(clearFindBlocked, 0); }}'));
  const unlock = space.slice(space.indexOf('  function lockInput() {'), space.indexOf('  async function flushRecurrenceEditors()'));
  assert.match(unlock, /if \(!inputLockCount\.current\) \{[^]*clearFindBlocked\(\);\n      \}/);
  const open = space.slice(space.indexOf('  function openFindPanel() {'), space.indexOf('  useEffect(', space.indexOf('  function openFindPanel() {')));
  assert(open.includes('findBlocked.current = true; setMessage(FIND_BLOCKED); return;'));
  assert(open.indexOf('clearFindBlocked();') > open.indexOf('return;') && open.indexOf('clearFindBlocked();') < open.indexOf('setLibraryOpen(true);'));
  // S4 v19: it floats over the head row and takes no room, so the body does not drop while it shows.
  assert(space.includes('? <div className={styles.floatingNotice}><p role="alert" className={styles.error}>{message}</p></div>'));
  const styles = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.module.css', import.meta.url), 'utf8');
  assert(styles.includes('.floatingNotice { position:relative; z-index:20; height:0; }'));
  assert(styles.includes('.floatingNotice > .error { position:absolute; top:0; left:0; right:0; margin:0;'));
});
