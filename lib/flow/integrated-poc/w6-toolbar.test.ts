import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W6 (items 13·14·23): the PC toolbar is grouped with dividers ([＋ 추가] | [☐ ⇤ ⇥ ↳] | [↶ ↷] [반복] [도구],
// status at the end) so ↶ never sits next to ↳; the bar icons are drawn, not arrows that read as "move"; the
// "…" is named 도구, without items that repeat ＋ 추가 or ↷, and closes on a press outside it or a change of
// document; ↶·↷ say 입력 되돌리기 · Ctrl+Z and 입력 다시 하기; an empty document shows a two-line hint that the
// first character removes, and the writing example moves from 도구 to the empty document's ＋ menu.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('ProgramTextEditor.tsx'), css = read('ProgramTextEditor.module.css'), space = read('ProgramSpace.tsx');
const toolbar = editor.slice(editor.indexOf('    <div className={styles.toolbar}>'), editor.indexOf('{serverView ? <div className={styles.statusSlot}'));

test('the PC toolbar groups: ＋ 추가 | bar actions | ↶ ↷ 반복 도구, so ↶ is never next to ↳', () => {
  const at = (part: string) => { const index = toolbar.indexOf(part); assert(index > 0, part); return index; };
  const seps = [...toolbar.matchAll(/<span className=\{styles\.toolbarSep\} aria-hidden="true" \/>/g)].map(match => match.index!);
  assert.equal(seps.length, 2);
  assert(at('>＋ 추가</button>') < seps[0] && seps[0] < at("barButtons('toolbar')") && at("barButtons('toolbar')") < seps[1] && seps[1] < at('aria-label="입력 되돌리기"'));
  assert(at('aria-label="입력 되돌리기"') < at('aria-label="입력 다시 하기"') && at('aria-label="입력 다시 하기"') < at('{props.repeatLabel') && at('{props.repeatLabel') < at('<details ref={toolsRef} className={styles.editorTools}'));
  assert.match(css, /\.toolbarSep \{[^}]*width: 1px;/);
  // Phones show the bar actions in the keyboard bar, so the dividers go there; on PC the status is at the end.
  assert.match(css, /@media \(max-width: 700px\) \{\s*\.toolbarSep \{ display: none; \}/);
  assert.match(css, /@media \(min-width: 701px\) \{\s*\.toolbar > \.editorTools \{ order: 0; margin-left: 0; \}\s*\.toolbar > \.statusSlot \{ margin-left: auto; \}/);
});

test('the bar icons are drawn and keep their names', () => {
  const buttons = editor.slice(editor.indexOf('  function barButtons('), editor.indexOf('  const notices ='));
  for (const glyph of ["'☐'", "'←'", "'→'", "'↵'", "'＋'"]) assert(!buttons.includes(glyph), glyph);
  for (const [action, label] of [['task', "barLine.isTask ? '일반 줄로 바꾸기' : '할 일로 바꾸기'"], ['outdent', "'내어쓰기'"], ['indent', "'들여쓰기'"], ['enter', "'할 일 아래 메모 줄'"], ['menu', "'추가 메뉴'"]])
    assert(buttons.includes(`barButton('${action}', <BarIcon name="${action}" />, ${label}`), action);
  assert.match(editor, /function BarIcon\(\{ name \}: \{ name: WritingBarAction \}\) \{/);
});

test('the tools menu is named 도구, repeats neither ＋ 추가 nor ↷, and closes on a press outside or a change', () => {
  assert(editor.includes('<summary aria-label="편집 도구" title="편집 도구">도구</summary>'));
  // 현재 줄에 추가 only where ＋ 추가 is hidden; 다시 실행 only where there is no ↷ (unchanged).
  assert(editor.includes('{props.directWriting && !props.noteStatus && <button type="button" disabled={insertionDisabled}'));
  assert(editor.includes('{!props.authoringMode && (props.onRedo || orderHistoryRef.current.hasEntries()) && <button type="button" hidden={!!props.folderId}'));
  const close = editor.slice(editor.indexOf('// W6: the 도구 menu closes'), editor.indexOf('// W6: the 도구 menu closes') + 600);
  assert.match(close, /owner\.addEventListener\('pointerdown', outside, true\);/);
  assert.match(close, /if \(menu\.open && !\(event\.target instanceof Node && menu\.contains\(event\.target\)\)\) menu\.open = false;/);
  assert.match(close, /return \(\) => \{ owner\.removeEventListener\('pointerdown', outside, true\); menu\.open = false; \};\s*\}, \[props\.docId, props\.active\]\);/);
});

test('↶ and ↷ say what they undo and redo', () => {
  assert(toolbar.includes("'입력 되돌리기 · Ctrl+Z'}"));
  assert(toolbar.includes('title="입력 다시 하기 · Ctrl+Y" aria-label="입력 다시 하기"'));
  // The toolbar ↷ no longer says 다시 실행 (the 도구 item of that name stays only where there is no ↷).
  assert(!toolbar.includes('title="다시 실행" aria-label="다시 실행"'));
});

test('an empty document shows a two-line hint, and the writing example is in its ＋ menu', () => {
  // N9 (U52): the second line was shortened so it does not wrap one syllable onto a line of its own at 390px.
  assert(editor.includes("const EMPTY_DOCUMENT_HINT = '여기에 적으세요.\\n할 일은 ☐ 또는 - [ ], 메뉴는 /';"));
  assert(editor.includes("textarea.placeholder = props.readOnly ? '' : props.directWriting ? '여기에 바로 적으세요' : EMPTY_DOCUMENT_HINT;"));
  // The textarea text is transparent over the mirror; its placeholder needs its own color.
  assert.match(css, /\.host :global\(\.tle-textarea::placeholder\)[^{]*\{[^}]*-webkit-text-fill-color: var\(--flowme-b-muted\);/);
  // S4 N3 W1: the editor masks the textarea to its one empty row once focused and hides it in reading view; while
  // the hint shows, both step aside so its two lines show before and after focus.
  const vendor = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(vendor.includes('.tle-root[data-mode="live"].tle-native-input .tle-textarea,\n') && vendor.includes('mask-image: linear-gradient(to bottom, transparent var(--tle-native-top)'));
  assert(vendor.includes('.tle-root.tle-reading-view .tle-textarea { opacity: 0; pointer-events: none; }'));
  assert(css.includes('.host :global(.tle-root[data-mode="live"].tle-native-input .tle-textarea:placeholder-shown) { -webkit-mask-image: none; mask-image: none; }'));
  assert(css.includes('.host :global(.tle-root[data-mode="live"].tle-reading-view .tle-textarea:placeholder-shown) { opacity: 1; }'));
  assert(editor.includes('{props.onWritingExample && <button type="button" disabled={insertionDisabled} onClick={() => { closePanel(); props.onWritingExample?.(); }}>작성 예시 넣기'));
  assert(!space.includes('{selectedDocumentExample}'));
  assert(space.includes('onWritingExample={selected === id && writingExampleReady ? () => { void applyWritingExample(); } : undefined}'));
});
