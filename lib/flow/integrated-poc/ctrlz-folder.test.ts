import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// P3 (11/7): Ctrl+Z after a folder chosen from a chip or the '/' menu left `- 이름` (the text's own undo), where ↶ put
// the text back as it was before the choice. The keyboard's history (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z: the browser's
// historyUndo/historyRedo) now takes the same steps as ↶ ↷, in the same order, before the text's own history.
const editor = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramTextEditor.tsx'), 'utf8').replace(/\r\n/g, '\n');
const body = (head: string) => { const at = editor.indexOf(head); assert.ok(at >= 0, head); return editor.slice(at, editor.indexOf('\n  }\n', at)); };

test('the keyboard history takes the same steps as ↶ ↷, in their order, outside a composition', () => {
  const undo = body('function undoInput()'), step = editor.slice(editor.indexOf('function historyStep('), editor.indexOf('const historyStepFn = useRef('));
  const order = (text: string, names: string[]) => names.map(name => text.indexOf(name));
  const buttons = order(undo, ['undoBarFolder()', 'undoFolderMove()', 'undoRepeatCheck()', 'undoBarDate()']);
  const keys = order(step, ['undoBarFolder()', 'undoFolderMove()', 'undoRepeatCheck()', 'undoBarDate()']);
  assert.ok(buttons.every((at, index) => at >= 0 && (index === 0 || at > buttons[index - 1])), 'button order');
  assert.ok(keys.every((at, index) => at >= 0 && (index === 0 || at > keys[index - 1])), 'key order');
  assert.match(step, /: redoBarFolder\(\) \|\| redoBarDate\(\);/);
  assert.match(body('function redoInput()'), /if \(redoBarFolder\(\) \|\| redoBarDate\(\)\) return;/);
  // The browser's own undo and redo (keys, or ↶ ↷ falling through to execCommand) come through beforeinput.
  assert.match(editor, /if \(\(type === 'historyUndo' \|\| type === 'historyRedo'\) && !composingRef\.current && historyStepFn\.current\(type\)\) \{ event\.preventDefault\(\); event\.stopImmediatePropagation\(\); return; \}/);
  // And at the key itself on the body (a browser sends no redo to beforeinput when its own redo list is empty).
  assert.match(editor, /&& historyStep\(event\.key\.toLowerCase\(\) === 'y' \|\| event\.shiftKey \? 'historyRedo' : 'historyUndo'\)\) \{ event\.preventDefault\(\); event\.stopPropagation\(\); return; \}/);
  assert.match(editor, /\['z', 'y'\]\.includes\(event\.key\.toLowerCase\(\)\) && event\.target === textArea\(\)\n\s+&& !event\.nativeEvent\.isComposing && !composingRef\.current/);
});
