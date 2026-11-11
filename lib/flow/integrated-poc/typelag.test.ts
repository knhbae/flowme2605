import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { readChildDrafts } from './child-draft-recovery';

// typelag (11/11, 운영 r3 '글 쓰는 데 너무 버벅인다'): in a big document every key redrew the whole workspace (the
// 복구함's screen copy), read the layout for the phone bar, and parsed the whole text several times. What is saved, and
// what the 복구함 keeps at every key, stay exactly as they were; only when the screen follows and what is read again
// changed.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the 복구함 is still written at every key; its screen copy follows at most every 400ms while typing', () => {
  const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
  const capture = alpha.slice(alpha.indexOf('  function captureInput() {'), alpha.indexOf('/** Input captured from editors that are about to go away'));
  // The save at every key is unchanged; only its screen copy waits.
  assert.match(capture, /const saved = uiRecovery\.current\.save\(alphaUiRecoveryDocumentDrafts\(next\)\);/);
  assert.match(capture, /setRecoveriesSoon\(saved\.value\); return structuralSaved;/);
  assert.doesNotMatch(capture, /setRecoveries\(saved\.value\)/);
  // Any other change shows at once and drops a copy still waiting (an older one never comes back over it).
  assert.match(alpha, /function setRecoveries\(value: AlphaUiRecoveryRecord \| null\) \{\n\s+if \(recoveriesSoon\.current\) \{ clearTimeout\(recoveriesSoon\.current\.timer\); recoveriesSoon\.current = null; \}\n\s+setRecoveriesState\(value\);/);
  assert.match(alpha, /if \(recoveriesSoon\.current !== pending\) return; recoveriesSoon\.current = null; setRecoveriesState\(pending\.value\); \}, 400\)/);
  assert.equal((alpha.match(/setRecoveriesSoon\(/g) ?? []).length, 2, 'declared once, used once (captureInput)');
});

test('a key no longer reads the layout for the phone bar unless a lone "/" was typed; child drafts parse only when kept', () => {
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
  const slash = editor.slice(editor.indexOf('function requestAuthoringSlash('), editor.indexOf('queueMicrotask(', editor.indexOf('function requestAuthoringSlash(')));
  assert.ok(slash.indexOf("raw[caret-1]!=='/')return;") < slash.indexOf('if(barShownNow())return;'));
  assert.match(editor, /const captureChildDrafts=\(\)=>Object\.keys\(childDrafts\.current\)\.length\?readChildDrafts\(childDrafts\.current,M\.tasks\(currentState\(\)\)\):\[\];/);
  // The same answer as before for no kept drafts (nothing to read).
  assert.deepEqual(readChildDrafts({}, []), []);
});

test('the screen reads the tasks of the saved text once per text, for the band and the repeat rows', () => {
  const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
  assert.match(space, /const textTasks = useMemo\(\(\) => M\.tasks\(space\.text\), \[space\.text\]\);/);
  assert.match(space, /const repeat = programRepeatLine\(space, task\.id, textTasks\);/);
  assert.match(space, /const repeatRow = programRepeatLine\(space, task\.id, textTasks\)/);
  assert.doesNotMatch(space, /M\.tasks\(space\.text\)\.(find|some)\(/);
});
