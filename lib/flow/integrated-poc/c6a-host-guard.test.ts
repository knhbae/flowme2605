import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// C6a re-review (FIX 2): the host's own writes (상태 줄 '다시 확인', 더보기 › 편집 › 되돌리기·다시 실행) are refused
// while the space is picking rows, and a save of any side still waiting (an undo/redo, the host's own operation)
// keeps 고르기 off. The host gets one prop and a guard; nothing else of AlphaWorkspace changes.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const space = read('ProgramSpace.tsx'), host = read('AlphaWorkspace.tsx');
const body = (source: string, name: string) => { const from = source.indexOf(`function ${name}(`); return source.slice(from, source.indexOf('\n  }\n', from)); };

test('the space tells the host when it picks, and stops telling when it ends or goes away', () => {
  assert.match(space, /onSelectingChange\?: \(selecting: boolean\) => void;/);
  assert.match(space, /useEffect\(\(\) => \{ const on = !!selecting; props\.onSelectingChange\?\.\(on\); return \(\) => \{ if \(on\) props\.onSelectingChange\?\.\(false\); \}; \}, \[!!selecting\]\);/);
});

test('the host refuses 다시 확인, 되돌리기 and 다시 실행 while the space it shows is picking', () => {
  assert.match(host, /const programSelecting = useRef\(false\);/);
  assert.match(host, /const selectingRefuses = \(\) => \{ if \(!programSelecting\.current \|\| destinationRef\.current\.view !== 'space'\) return false; setMessage\('여러 개 고르는 중에는 할 수 없습니다\. 고르기를 끝낸 뒤 다시 눌러 주세요\.'\); return true; \};/);
  assert.match(body(host, 'resolvePendingResult'), /^function resolvePendingResult\(\) \{\n\s*if \(selectingRefuses\(\)\) return;/);
  assert.match(body(host, 'history'), /^function history\(kind: 'undo' \| 'redo'\) \{\n\s*if \(selectingRefuses\(\)\) return;/);
  assert.match(host, /onSelectingChange=\{value => \{ programSelecting\.current = value; \}\}/);
});

test('an undo/redo started before picking, or any host operation still running, keeps 고르기 off', () => {
  assert.match(space, /const countedHistory = async \(run: \(\) => Promise<void>\) => \{ setSavesPending\(count => count \+ 1\); try \{ await run\(\); \} finally \{ setSavesPending\(count => count - 1\); \} \};/);
  assert.match(space, /const onUndo = \(\) => selectingNow\.current \? Promise\.resolve\(\) : countedHistory\(props\.onUndo\), onRedo = \(\) => selectingNow\.current \? Promise\.resolve\(\) : countedHistory\(props\.onRedo\);/);
  assert.match(space, /const saving = savesPending > 0 \|\| preparingDocumentAction \|\| classificationCreating \|\| orderPending \|\| !!props\.sourceReturnWaits\?\.\(\);/);
  // Checked again at the press (the host's operation may have started since the last draw).
  assert.match(body(space, 'startSelecting'), /if \(selectBlocked \|\| props\.sourceReturnWaits\?\.\(\) \|\|/);
});

test('re-review 3: the host\'s own undo, redo or recheck still waiting (the controller busy) keeps 고르기 off, drawn and pressed', () => {
  // The host hands its controller's busy state over (sourceReturnWaits() only knows tracked writes and reads).
  assert.match(space, /hostBusy\?: \(\) => boolean;/);
  assert.match(host, /hostBusy=\{\(\) => !!controller\.current\?\.snapshot\(\)\.busy\}/);
  assert.match(space, /: saving \? '저장하는 동안에는 고를 수 없습니다' : props\.hostBusy\?\.\(\) \? '서버 확인이 끝난 뒤 고를 수 있습니다' : null;/);
  assert.match(body(space, 'startSelecting'), /if \(selectBlocked \|\| props\.sourceReturnWaits\?\.\(\) \|\| props\.hostBusy\?\.\(\) \|\| keepWrittenDay\(\)\) return;/);
});
