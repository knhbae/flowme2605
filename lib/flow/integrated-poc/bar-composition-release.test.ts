import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// S4-5: a writing-bar button pressed during Hangul composition is held and should run once after the
// composition ends (writing model S3). It never ran: the editor hears compositionend in the capture phase
// on its host, flips `composing` and React flushes the release synchronously, all before the native editor's
// own compositionend listener on the textarea clears its `composing` flag. The native editor then refused
// indent, outdent, the task toggle (replaceRange) and enter, and the held press was spent.
const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');

test('the native editor refuses every bar action while it still counts itself composing', () => {
  assert.match(vendor, /function indent\(outdent\) \{\r?\n\s*if \(destroyed \|\| composing \|\|/);
  assert.match(vendor, /function replaceRange\(start, end, text, settings\) \{\r?\n\s*invalidatePlainRowInput\(\);\r?\n\s*if \(destroyed \|\| composing \|\| nativeDepth\) return false;/);
  assert.match(vendor, /enter\(shift\) \{\r?\n\s*if \(destroyed \|\| composing \|\| textarea\.readOnly\) return false;/);
  assert.match(vendor, /listen\(textarea, 'compositionend', \(event\) => \{ invalidatePlainRowInput\(\); composing = false;/, 'it clears the flag in its own listener on the textarea');
  assert.match(editor, /host\.addEventListener\('compositionend', compositionEnd, true\);/, 'the editor listens in the capture phase, so it hears it first');
});

test('a press held through a composition is released after compositionend has finished, not inside it', () => {
  assert.match(editor, /if \(!composing && barHold\.held\(\)\) \{ const timer = setTimeout\(releaseHeldBar, 0\); return \(\) => clearTimeout\(timer\); \}\r?\n\s*releaseHeldBar\(\);\r?\n\s*\}, \[composing, draft\.saving, inputLocked, props\.readOnly, regionPending\]\);/);
});
