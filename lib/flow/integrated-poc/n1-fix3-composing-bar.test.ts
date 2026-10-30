import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// N1 fix 3 (S4 phone, Samsung keyboard 천지인): the keyboard keeps the whole word composing and sends
// compositionend only at the next space, character or caret move. A bar press held for the composition then
// waited without end (12 s and more), and the 450 ms background save, run while composing, showed the view
// change notice "한글 입력을 마친 뒤 보기 범위를 바꿔 주세요." Now a press held for a composition lets go after one
// second and says so, without touching the composing text; the background save waits for the composition
// without a notice. The notice stays for flushes the user asked for (changing the view).
const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const pressBar = editor.slice(editor.indexOf('  function pressBar(action: WritingBarAction) {'), editor.indexOf('  function stopBarRetry()'));

test('a press held for a composition lets go after one second and says why, changing no text', () => {
  assert.match(pressBar, /if \(run\) \{ runBar\(run\); return; \}/);
  assert.match(pressBar, /if \(!composingRef\.current\) return;/);
  assert.match(pressBar, /holdLimit\.current = setTimeout\(\(\) => \{[\s\S]*?if \(barHold\.held\(\) && barHold\.serial\(\) === serial && composingRef\.current\) \{ barHold\.cancel\(\); setHeldBar\(null\); setMessage\(BAR_COMPOSING_NOTICE\); \}[\s\S]*?\}, 1000\);/);
  // Letting go never edits: no replaceRange, setValue, indent or blur in that path.
  const limit = pressBar.slice(pressBar.indexOf('holdLimit.current = setTimeout'));
  for (const edit of ['replaceRange', 'setValue', '.indent(', '.blur(', 'insertText']) assert(!limit.includes(edit), edit);
  assert.match(editor, /const BAR_COMPOSING_NOTICE = '입력 중인 글자가 아직 끝나지 않아 실행하지 않았습니다\. 글자를 마친 뒤 다시 눌러 주세요\.';/);
});

test('the background save waits for a composition without the view change notice', () => {
  const schedule = editor.slice(editor.indexOf('  function scheduleSave() {'), editor.indexOf('  async function apply('));
  assert.match(schedule, /if \(composingRef\.current\) \{ scheduleSave\(\); return; \}/);
  assert(schedule.indexOf('composingRef.current') < schedule.indexOf('saveNow(false)'));
  // The notice stays where the user asked for a flush.
  assert.match(editor, /if \(composingRef\.current\) \{ setMessage\('한글 입력을 마친 뒤 보기 범위를 바꿔 주세요\.'\); return false; \}/);
});
