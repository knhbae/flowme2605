import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createPressAwareClose } from './press-aware-close';

// N1 fix 3 (Codex fix2 recheck F1): with the empty add line open, pressing the same day's ＋ again blurred the
// line, the press-aware close waited for the press, the ＋'s click focused the line again, and the close then
// removed it anyway. The close now runs only if still wanted. The original fix (a press on another row's 원문
// keeps the row until its click) stays.
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function world() {
  const target = Object.assign(new EventTarget(), { setTimeout: (handler: () => void, ms: number) => setTimeout(handler, ms) });
  const closer = createPressAwareClose(target), detach = closer.attach();
  let closed = 0, focus = 0;
  const press = (type: string) => target.dispatchEvent(new Event(type));
  // The editor's request: closed only if the line was not focused again since the blur.
  const blur = () => { const at = focus; closer.request(() => focus === at, () => { closed++; }); };
  return { press, blur, refocus: () => { focus++; }, closed: () => closed, detach };
}

test('a press on another row: the row stays until the press and its click are done, then closes', async () => {
  const w = world();
  w.press('pointerdown'); w.blur();
  await tick(); assert.equal(w.closed(), 0, 'not during the press');
  w.press('pointerup'); /* the click lands on the other row */ await tick();
  assert.equal(w.closed(), 1);
  w.detach();
});

test('the same day\'s ＋ pressed again: its click focuses the line again, so the line stays open', async () => {
  const w = world();
  w.press('pointerdown'); w.blur();
  w.press('pointerup'); w.refocus(); /* the ＋ click focuses the same line, synchronously after pointerup */
  await tick();
  assert.equal(w.closed(), 0);
  w.detach();
});

test('a blur without a press (Tab) closes on the next turn unless focused again', async () => {
  const w = world();
  w.blur(); await tick(); assert.equal(w.closed(), 1);
  w.blur(); w.refocus(); await tick(); assert.equal(w.closed(), 1);
  w.detach();
});

test('the add row asks the close with its focus count and the field still empty', () => {
  const row = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramGroupAddRow.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  // F4-b fix (P2-F4B-1): nor while taken lines still wait to be written.
  assert.match(row, /blurClose\.current\?\.request\(\(\) => mounted\.current && focusCount\.current === at && !formRef\.current\?\.contains\(document\.activeElement\)\s*&& !props\.inputRef\.current\?\.value\.trim\(\) && !queue\.pending, props\.onClose\);/);
  assert.match(row, /<form ref=\{formRef\} onFocus=\{\(\) => \{ focusCount\.current\+\+; \}\}/);
});
