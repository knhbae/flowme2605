import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programWritingDialogPlace } from './writing-dialog-place';
import { programInsertMenuTitle, programLayoutPlaceNote, programPlaceNote } from './writing-insert-place';

// W5 (items 15·16·27): on a phone the writing dialogs (＋ menu, 날짜·시간, 진행, 폴더, 하위 초안) are sheets from
// the bottom whose bottom is the visual viewport's bottom (above the keyboard); the ＋ menu's head is its target
// line in one line, without a repeated subheading or the typed "/"; names follow the wording table.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const inline = read('../../../components/flow/integrated-poc/ProgramWritingInline.tsx');
const css = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');

test('a phone sheet ends at the visual viewport\'s bottom: above an open keyboard, inside a pinch-zoomed view', () => {
  const phone = { innerWidth: 390, innerHeight: 844 };
  const closed = programWritingDialogPlace(phone, { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 });
  assert.equal(closed['--writing-dialog-bottom'], '0px');
  assert.equal(closed['--writing-view-left'], '0px');
  assert.equal(closed['--writing-view-width'], '390px');
  // A 344px keyboard: the sheet's bottom sits on it and its height fits what is left.
  const keyboard = programWritingDialogPlace(phone, { width: 390, height: 500, offsetTop: 0, offsetLeft: 0 });
  assert.equal(keyboard['--writing-dialog-bottom'], '344px');
  assert.equal(keyboard['--writing-view-height'], '500px');
  // The visual viewport scrolled within the layout viewport (pinch zoom or a scrolled keyboard view).
  const zoomed = programWritingDialogPlace(phone, { width: 300, height: 400, offsetTop: 100, offsetLeft: 40 });
  assert.equal(zoomed['--writing-dialog-bottom'], '344px');
  assert.equal(zoomed['--writing-view-left'], '40px');
  // No visual viewport: the layout viewport.
  assert.equal(programWritingDialogPlace(phone, null)['--writing-dialog-bottom'], '0px');
  // Wide screens keep the box near the top, centred as before.
  const wide = programWritingDialogPlace({ innerWidth: 1280, innerHeight: 844 }, { width: 1280, height: 844, offsetTop: 0, offsetLeft: 0 });
  assert.equal(wide['--writing-dialog-top'], '12px');
  assert.equal(wide['--writing-dialog-left'], '425px');
  // The editor sets these on the dialog, and the phone rule uses them.
  assert.match(editor, /for \(const \[name, value\] of Object\.entries\(programWritingDialogPlace\(view, visual\)\)\) dialog\.style\.setProperty\(name, value\);/);
  const phoneRule = css.slice(css.lastIndexOf('@media (max-width: 760px)'));
  assert.match(phoneRule, /\.dialog\[open\] \{[^}]*bottom: var\(--writing-dialog-bottom, 0px\);[^}]*border-radius: 16px 16px 0 0;/);
});

test('the ＋ menu head is its target line, or 새 줄 for an empty line or a typed "/"', () => {
  assert.equal(programInsertMenuTitle('안건 정리'), '‘안건 정리’ 아래에');
  assert.equal(programInsertMenuTitle('  /'), '새 줄');
  assert.equal(programInsertMenuTitle(''), '새 줄');
  assert.equal(programInsertMenuTitle(undefined), '새 줄');
  // The head is the dialog title; no target paragraph and no repeated "이 위치에 추가" subheading.
  assert(!editor.includes('className={styles.menuTarget}'));
  assert(!editor.includes('<h4>이 위치에 추가</h4>'));
  assert(!editor.includes(": '이 위치에 추가';"));
  // The typed "/" is left out of the place preview too; the source keeps it.
  assert.match(editor, /placePreview\.filter\(line => !\(line\.kind === 'anchor' && line\.text\.trim\(\) === '\/'\)\)/);
  assert.match(css, /\.dialog header h3 \{[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/);
});

test('place notes show only where the place is not right below', () => {
  assert.equal(programPlaceNote('바로 아래'), '');
  assert.equal(programPlaceNote('‘회의 준비’ 묶음 다음 · 3줄 뒤'), '‘회의 준비’ 묶음 다음 · 3줄 뒤');
  assert.equal(programPlaceNote('이 묶음 안에'), '이 묶음 안에');
  assert.equal(programLayoutPlaceNote('step', { after: 3, blockTitle: '회의 준비' }), '‘회의 준비’ 묶음 다음');
  assert.equal(programLayoutPlaceNote('description', { after: 3, blockTitle: '회의 준비' }), '‘회의 준비’ 묶음 다음 · 할 일에 붙지 않음');
  assert.equal(programLayoutPlaceNote('step', { after: 0, blockTitle: '회의 준비' }), '');
  assert.equal(programLayoutPlaceNote('description', { after: 0, blockTitle: '' }), '할 일에 붙지 않음');
});

test('names follow the wording table; places and inserted text stay', () => {
  for (const now of ["'소제목 추가':'일반 글 추가'", '>날짜·시간</button>', "'진행 기록'", "'날짜·시간'", '<summary>연결·구획</summary>', '<summary>옮기기·접기</summary>', '>일반 글</button>'])
    assert(editor.includes(now), now);
  for (const old of ['단계 추가', '설명 이어 쓰기', '날짜 바꾸기', "'누적 진행률'", "'항목 날짜'", '자유 메모', '<summary>추가·연결</summary>', '<summary>문서 구조</summary>'])
    assert(!editor.includes(old), old);
  // The layout insertion itself is unchanged: "## " and a free line after the block.
  assert.match(editor, /onClick=\{\(\)=>insertAuthoringLayout\(kind\)\}/);
});

test('the child draft head is one line, with one small line of date and folder', () => {
  assert(editor.includes("childTarget?.kind==='task' ? `‘${childTarget.title}’ 아래 하위 할 일`"));
  assert(!inline.includes('<strong>'));
  assert.match(inline, /programCalendarDate\(props\.date, ''\)/);
  assert(!inline.includes('새 하위 할 일 · ${props.date'));
});
