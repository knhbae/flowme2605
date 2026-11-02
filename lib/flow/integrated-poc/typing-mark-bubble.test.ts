import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');

// A state update in an input capture handler renders and commits before the field's own handler runs.
// The commit put the old value back into a controlled field (the child draft) and the folder region
// reinstalled its old raw, so typed text was lost (QA 6·7: empty child draft, folder new line not kept).
test('typing is marked on bubbling input, never in an input capture handler', () => {
  // U44: still on bubbling input; a field of the host's head in the tool line (⋯'s rename) is not the editor's typing.
  assert.match(editor, /onInput=\{serverView \? event => \{ if \(!inHead\(event\.target\)\) markTyping\(\); \} : undefined\}/);
  assert.doesNotMatch(editor, /on(Before)?InputCapture=/);
});
