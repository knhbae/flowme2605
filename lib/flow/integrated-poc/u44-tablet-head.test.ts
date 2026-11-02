import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// U44: on a tablet held sideways the writing screen's head took three bands (title row, notices, tools): 149px of a
// 511px screen. There, and on laptops as short, the document title and ⋯ go into the editor's tool line and the
// notices under it, above the body; phones, portrait screens and taller screens keep the title row of their own.
// Only the head's place changes: the editor keeps its key and mount, so a composition, the caret and ↶ survive a turn.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const spaceCss = read('../../../components/flow/integrated-poc/ProgramSpace.module.css');
const editorCss = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');

test('U44: one line only on a landscape screen at least 1000px wide and at most 900px high, with an open document', () => {
  assert(space.includes("export const PROGRAM_TABLET_HEAD_QUERY = '(min-width: 1000px) and (max-height: 900px) and (orientation: landscape)';"));
  // Read through the media query and its change events; no media match before the page is drawn (the title row).
  assert(space.includes('const tabletLandscape = useSyncExternalStore(watchHead, () => tabletHead().matches, () => false);'));
  assert(space.includes("query.addEventListener('change', change); return () => query.removeEventListener('change', change);"));
  // The host's writing tab only (its main tabs and note layout), and only while the document's editor is there.
  assert(space.includes('const headInToolbar = tabletLandscape && !!props.hostMainTabs && !!props.noteHeader && !!selectedDoc && opened.includes(selectedDoc.id);'));
});

test('U44: the title row and its notices are drawn in one place: their own row, or the open editor\'s line', () => {
  assert(space.includes('{!headInToolbar && <><div className={styles.docHeading}>{docTitle}{docActions}</div>{docNotices}</>}'));
  assert(space.includes('headStart={headInToolbar && selected === id ? docTitle : undefined} headEnd={headInToolbar && selected === id ? docActions : undefined}'));
  assert(space.includes('headBelow={headInToolbar && selected === id ? docNotices : undefined}'));
  // The title keeps its button (the document sheet) and ⋯ its menu; the notices are the same ones, above the body.
  assert.match(space, /const docTitle = <>\{sourceOriginOpen && <button[^]*?ref=\{titleToggle\}[^]*?onPointerDown=\{findPointerDown\} onClick=\{openFindPanel\}>/);
  assert(space.includes('const docActions = <>{props.hostMainTabs ? selectedDocumentTools && <div className={styles.titleActions}>{selectedDocumentTools}</div>'));
  const notices = space.slice(space.indexOf('const docNotices = <>'), space.indexOf('  return <section ref={root}'));
  for (const piece of ['{props.noteHeader}', 'className={styles.importNotice}', 'data-writing-entry-notice', 'className={styles.copyHeader}', '<ProgramDocumentProvenance'])
    assert(notices.includes(piece), piece);
  // The editor is the same element either way: same key, same wrapper, no prop of its mount depends on the line.
  assert(space.includes('.map(id => <div key={id} hidden={selected !== id} data-program-document={id}><TextEditor'));
  assert(!/key=\{[^}]*headInToolbar/.test(space));
});

test('U44: the editor\'s tool line starts with the title and ends with ⋯; the notices sit under it, above the body', () => {
  const toolbar = editor.slice(editor.indexOf('    <div className={styles.toolbar}>'), editor.indexOf('<div ref={hostRef}'));
  assert(toolbar.startsWith('    <div className={styles.toolbar}>\n      {props.headStart && <div className={styles.headStart} data-editor-head="start">{props.headStart}</div>}'));
  assert(toolbar.includes('      {props.headEnd && <div className={styles.headEnd} data-editor-head="end">{props.headEnd}</div>}\n    </div>\n    {props.headBelow && <div className={styles.headBelow} data-editor-head="below">{props.headBelow}</div>}\n    {props.folderId &&'));
  assert(editorCss.includes('.toolbar > .headStart { order: -1;'));
  assert(editorCss.includes('.toolbar > .headEnd { order: 9; flex: 0 0 auto; }'));
  // The title is at most 220px and shortens with "…" (its button already does); ⋯ keeps its 44px target.
  assert(spaceCss.includes('.space [data-editor-head="start"] > h1 { flex: 0 1 auto; min-width: 0; max-width: 220px;'));
  assert.match(spaceCss, /\.space \.titleButton > span:first-child \{[^}]*text-overflow: ellipsis;/);
  assert.match(spaceCss, /\.space \.titleActions > details > summary \{[^}]*min-width: 44px; min-height: 44px;/);
});

test('U44: typing, keys and focus in the head are the host\'s, not the editor\'s, as on their own row', () => {
  assert(editor.includes("return target instanceof Element && !!target.closest('[data-editor-head]');"));
  assert(editor.includes('onInput={serverView ? event => { if (!inEditorHead(event.target)) markTyping(); } : undefined}'));
  // Its undo keys and Escape are left alone there (the rename field in ⋯ keeps its own undo during a save).
  const capture = editor.slice(editor.indexOf('onKeyDownCapture={event => {'), editor.indexOf("if (event.key === 'Escape' && (panelRef.current"));
  assert(capture.indexOf('if (inEditorHead(event.target)) return;') > capture.indexOf("if (event.key === 'Tab') folderIndentSkipped.current = false;"));
  assert(capture.indexOf('if (inEditorHead(event.target)) return;') < capture.indexOf("['z', 'y'].includes"));
  // A held bar press: typing or a composition in the head does not touch it, and focus moving into the head leaves.
  const hold = editor.slice(editor.indexOf('const typed = (event: Event) => {'), editor.indexOf("root.addEventListener('beforeinput', typed, true);"));
  assert.equal(hold.match(/if \(inEditorHead\(event\.target\)\) return;/g)?.length, 3);
  assert(hold.includes("root.contains(event.relatedTarget)) || inEditorHead(event.relatedTarget)) cancel('left');"));
  // A deferred caret move does not take the caret from a field in the head (⋯'s rename).
  assert(editor.includes("&& (!hostRef.current?.closest('section')?.contains(active) || inEditorHead(active)));"));
});

// Codex review of U44 (11/3): crossing the condition draws the title and ⋯ again in their other place; a name being
// typed in ⋯ was lost, and a sheet opened from the title gave the focus back to nobody.
type Fake = { value?: string; defaultValue?: string; selectionStart?: number; selectionEnd?: number; selectionDirection?: string; focus: () => void; setSelectionRange?: (s: number, e: number, d?: string) => void };
function fakeHead(open: boolean, name: string, title: string) {
  const log: string[] = [];
  const summary: Fake = { focus: () => log.push('summary') };
  const input: Fake = { value: name, defaultValue: title, selectionStart: 2, selectionEnd: 4, selectionDirection: 'forward', focus: () => log.push('input'),
    setSelectionRange: (s, e, d) => log.push(`select ${s}-${e} ${d}`) };
  const rename: Fake = { focus: () => log.push('rename') };
  const menu = { open, querySelector: (selector: string) => selector === 'input[name="title"]' ? input : null, querySelectorAll: () => [summary, input, rename] };
  const button: Fake = { focus: () => log.push('title') };
  return { menu: menu as unknown as HTMLDetailsElement, input, button: button as unknown as HTMLElement, log };
}
test('U44 review: an open ⋯, the name typed there, its caret and the focus come along to the head\'s new place', async () => {
  const { carryProgramHead, restoreProgramHead } = await import('./tablet-head-carry');
  const before = fakeHead(true, '새 이름', '작성한 글');
  const carry = carryProgramHead(before.menu, before.button, before.input as unknown as Element);
  assert.deepEqual(carry, { menuOpen: true, name: { title: '작성한 글', value: '새 이름', start: 2, end: 4, direction: 'forward' }, focus: 1 });
  // Drawn again: closed, the saved name in its field.
  const after = fakeHead(false, '작성한 글', '작성한 글');
  restoreProgramHead(carry!, after.menu, after.button);
  assert.equal(after.menu.open, true);
  assert.equal(after.input.value, '새 이름');
  assert.deepEqual(after.log, ['input', 'select 2-4 forward']);
  // A rename saved meanwhile (another title) keeps its own name.
  const renamed = fakeHead(false, '다른 이름', '다른 이름');
  restoreProgramHead(carry!, renamed.menu, renamed.button);
  assert.equal(renamed.input.value, '다른 이름');
  // The title's focus; nothing open, typed or focused carries nothing.
  const titled = fakeHead(false, '작성한 글', '작성한 글');
  assert.deepEqual(carryProgramHead(titled.menu, titled.button, titled.button as unknown as Element), { menuOpen: false, name: null, focus: 'title' });
  restoreProgramHead({ menuOpen: false, name: null, focus: 'title' }, after.menu, titled.button);
  assert.deepEqual(titled.log, ['title']);
  assert.equal(carryProgramHead(titled.menu, titled.button, null), null);
});

test('U44 review: read just before the change (old place drawn), put back after it; the sheet returns to the new title', () => {
  assert(space.includes('headCarry.current = carryProgramHead(documentMenu.current, titleToggle.current, document.activeElement); change();'));
  assert(space.includes('const tabletLandscape = useSyncExternalStore(watchHead, () => tabletHead().matches, () => false);'));
  assert.match(space, /useLayoutEffect\(\(\) => \{\n    const carry = headCarry\.current; headCarry\.current = null;\n    if \(carry\) restoreProgramHead\(carry, documentMenu\.current, titleToggle\.current\);\n  \}, \[tabletLandscape\]\);/);
  assert(space.includes('if (!retained.area && target && !target.isConnected && target.classList.contains(styles.titleButton)) target = titleToggle.current;'));
});
