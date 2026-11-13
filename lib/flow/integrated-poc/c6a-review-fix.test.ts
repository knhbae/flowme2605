import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// C6a review (FIX): 고르기 changes nothing anywhere on the screen (P1); it does not start while any save waits (P2);
// a phone's covered tabs leave the focus order (P2); a view change on the way out brings the calendar back (P2); the
// note's today keeps [모두]/[풀기] although its day heading is hidden otherwise (P2).
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const space = read('ProgramSpace.tsx');
const body = (name: string) => { const from = space.indexOf(`function ${name}(`); return space.slice(from, space.indexOf('\n  }\n', from)); };

test('P1: every save of the space is refused while picking; input typed into a document before still saves', () => {
  // One gate for the space's saves and its undo/redo; props.mutate and the host's undo are reached only through it.
  assert.match(space, /const countedMutate: ProgramMutate = async \(label, build, options\) => \{ setSavesPending\(count => count \+ 1\); try \{ return await props\.mutate\(label, build, options\); \} finally \{ setSavesPending\(count => count - 1\); \} \};/);
  assert.match(space, /const mutate: ProgramMutate = \(label, build, options\) => selectingNow\.current \? Promise\.resolve\(\{ ok: false, reason: 'busy' \}\)\s*: countedMutate\(label, build, options\)/);
  assert.match(space, /const onUndo = \(\) => selectingNow\.current \? Promise\.resolve\(\) : countedHistory\(props\.onUndo\), onRedo = \(\) => selectingNow\.current \? Promise\.resolve\(\) : countedHistory\(props\.onRedo\);/);
  assert.equal(space.match(/props\.mutate\b/g)?.length, 1, 'props.mutate only in countedMutate');
  assert.equal(space.match(/props\.on(Undo|Redo)\b/g)?.length, 2, 'the host undo/redo only in the gate');
  assert(!space.includes('const { data, mutate, today } = props'));
  // A document's own commit is not refused (its input would be lost); 고르기 never starts with one unsaved.
  // Region fix 2 (11/8): the commit is one attempt function, tried again while the single writer is busy.
  assert.match(body('editorCommit'), /const attempt = \(\) => countedMutate\(label, current => \{/);
  // The ref follows the state at once, on the way in and out.
  assert.match(body('startSelecting'), /selectingNow\.current = true;/);
  assert.match(body('stopSelecting'), /selectingNow\.current = false;/);
  // And what would change data is not shown: 변경 되돌리기/다시 실행, 글 찾기 (its library writes), the output return. F4-a: 새 분류
  // became the folder list's ＋ 새 폴더, on the 폴더 tab, which has no 고르기 (its 글 찾기 line is not drawn there).
  assert.match(space, /\{folderList && folderListView\(null\)\}/);
  assert.match(space, /!compactNoteToday && period !== 'documents' && !selecting && !folderTab && findActions/);
  assert.match(space, /\{!selecting && <><button onClick=\{\(\) => void onUndo\(\)\}>되돌리기<\/button><button onClick=\{\(\) => void onRedo\(\)\}>다시 실행<\/button><\/>\}/);
  assert.match(space, /\{props\.noteStatus && <div className=\{styles\.periodStatus\}>\{props\.noteStatus\}\{!compactNoteToday && period !== 'documents' && !selecting && !folderTab && findActions\}<\/div>\}/);
  assert.match(space, /\{props\.outputReturn && <div hidden=\{!!selecting\}><ProgramOutputReturn /);
});

test('P2: 고르기 waits for any save of the space (a new 분류, an order, a document action), one state for all', () => {
  assert.match(space, /const saving = savesPending > 0 \|\| preparingDocumentAction \|\| classificationCreating \|\| orderPending \|\| !!props\.sourceReturnWaits\?\.\(\);/);
  assert.match(space, /: moving \? '순서를 옮기는 동안에는 고를 수 없습니다' : saving \? '저장하는 동안에는 고를 수 없습니다' : /);
});

test('P2: on a phone the covered bottom tabs are inert while picking, and come back after', () => {
  const at = space.indexOf('// C6a review: on a phone the bar covers'), effect = space.slice(at, space.indexOf('}, [!!selecting]);', at));
  assert(effect.length > 0);
  assert.match(effect, /const nav = root\.current\?\.ownerDocument\.querySelector\('\[data-main-tab\]'\)\?\.closest\('nav'\);/);
  assert.match(effect, /const wide = window\.matchMedia\('\(min-width: 701px\)'\);/);
  assert.match(effect, /const apply = \(\) => \{ nav\.inert = !wide\.matches; \};/);
  assert.match(effect, /return \(\) => \{ wide\.removeEventListener\('change', apply\); nav\.inert = false; \};/);
});

test('P2: a view change ends 고르기 the way 취소 does (the calendar comes back), without the old scroll', () => {
  assert.match(space, /useEffect\(\(\) => \{ stopSelecting\(false\); \}, \[actorId, period, date, folderId, query\]\);/);
  const stop = body('stopSelecting');
  assert.match(stop, /^function stopSelecting\(scrollBack = true\) \{/);
  assert.match(stop, /if \(state\.calendar\) setMonthViewState\('grid'\);/);
  assert.match(stop, /if \(scrollBack\) selectScrollBack\.current = state\.scrollY;/);
});

test('P2: the note\'s today shows its day heading while picking, so [모두]/[풀기] are there', () => {
  assert.match(space, /const hideDayHeadings = !selecting && !!props\.noteHeader && period === 'today' && date === today/);
});

test('N8 UX check: 글 찾기 and 고르기 keep their words on one line beside the status on phones', () => {
  const css = read('ProgramSpace.module.css');
  // width: auto over the phone rule that makes 글 찾기 full width (it pushed 고르기 off the screen).
  assert(css.includes('.space[data-note-layout="true"] .periodStatus .findActions > button { flex: none; width: auto; white-space: nowrap; }'));
  assert(css.includes('.space[data-note-layout="true"] .periodStatus { display: flex; align-items: center; justify-content: space-between; gap: 8px; }'));
});
