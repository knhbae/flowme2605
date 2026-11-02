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
// Codex re-review (11/3), as a rule: focus by what the control is, not its position; a confirmation step starts over
// and the focus goes to ⋯; only for the same document and only where the move took the focus.
type FakeControl = { tagName: string; label?: string; name?: string; text?: string; head?: boolean; doc?: boolean; gone?: boolean; value?: string; defaultValue?: string;
  selectionStart?: number; selectionEnd?: number; selectionDirection?: string };
function fakeHead(controls: FakeControl[], open: boolean, log: string[]) {
  const body: { tagName: string; ownerDocument?: unknown } = { tagName: 'BODY' }; body.ownerDocument = { body };
  const elements = controls.map(control => ({ ...control, ownerDocument: { body },
    getAttribute: (key: string) => (key === 'aria-label' ? control.label : key === 'name' ? control.name : undefined) ?? null,
    get textContent() { return control.text ?? ''; }, get isConnected() { return !control.gone; }, getClientRects: () => [1],
    closest: (selector: string) => selector === '[data-editor-head]' ? (control.head ? {} : null) : selector === '[data-program-document]' ? (control.doc || control.head ? {} : null) : null,
    focus: () => log.push(control.label ?? control.name ?? control.text ?? control.tagName),
    setSelectionRange: (from: number, to: number, direction?: string) => log.push(`select ${from}-${to} ${direction}`) }));
  const find = (match: (control: FakeControl) => boolean) => elements.find(match) ?? null;
  const summary = find(control => control.label === '현재 글 작업'), input = find(control => control.name === 'title') as (FakeControl & { value: string }) | null;
  const inMenu = new Set(elements.filter(element => ['현재 글 작업', '삭제 취소', '문서 삭제…'].includes(element.label ?? element.text ?? '') || element.name === 'title'));
  const menu = { open, querySelector: (selector: string) => selector === 'input[name="title"]' ? input : selector === ':scope > summary' ? summary : null,
    contains: (element: unknown) => inMenu.has(element as never) };
  const root = { querySelectorAll: () => elements };
  return { root: root as unknown as ParentNode, menu: menu as unknown as HTMLDetailsElement, input, body: body as unknown as Element, at: (label: string) => find(control => (control.label ?? control.name ?? control.text) === label) as unknown as Element };
}
const head = (place: { head?: boolean }, extra: FakeControl[] = [], name = { value: '작성한 글', defaultValue: '작성한 글' }) => [
  { tagName: 'BUTTON', label: '오늘 목록으로 돌아가기', ...place }, { tagName: 'BUTTON', label: '작성한 글 · 문서 목록 열기', ...place },
  { tagName: 'SUMMARY', label: '현재 글 작업', ...place }, { tagName: 'INPUT', name: 'title', selectionStart: 0, selectionEnd: 5, selectionDirection: 'forward', ...name, ...place },
  ...extra, { tagName: 'BUTTON', text: '확인', ...place }, { tagName: 'BUTTON', text: '확인', doc: true }];
test('U44 re-review: an open ⋯, its name as typed or selected, and the focus by what it is come along to the head\'s new place', async () => {
  const { carryProgramHead, restoreProgramHead } = await import('./tablet-head-carry');
  const move = (before: FakeControl[], after: FakeControl[], open: boolean, focused: string, documentId = 'doc') => {
    const log: string[] = [], old = fakeHead(before, open, log), carry = carryProgramHead('doc', old.root, old.menu, old.at(focused));
    for (const control of before) control.gone = true;
    const next = fakeHead(after, false, log);
    restoreProgramHead(carry!, documentId, next.root, next.menu, next.at('작성한 글 · 문서 목록 열기') as unknown as HTMLElement, next.body);
    return { carry, log, menu: next.menu, input: next.input };
  };
  // A name typed in ⋯: the menu opens again with it, its caret where it was.
  const typed = move(head({}, [], { value: '새 이름', defaultValue: '작성한 글' }), head({ head: true }), true, 'title');
  assert.deepEqual([typed.menu.open, typed.input?.value, typed.log], [true, '새 이름', ['select 0-5 forward', 'title', 'select 0-5 forward']]);
  // The name selected but not yet typed over: its selection comes along, so the next letter still replaces it.
  const selected = move(head({}), head({ head: true }), true, 'title');
  assert.deepEqual([selected.input?.value, selected.log], ['작성한 글', ['select 0-5 forward', 'title', 'select 0-5 forward']]);
  // A confirmation step ('삭제 취소') starts over in the new place: the focus goes to ⋯, whose menu is open again.
  const confirm = move(head({}, [{ tagName: 'BUTTON', text: '삭제 취소' }]), head({ head: true }, [{ tagName: 'BUTTON', text: '문서 삭제…', head: true }]), true, '삭제 취소');
  assert.deepEqual([confirm.menu.open, confirm.log], [true, ['select 0-5 forward', '현재 글 작업']]);
  // 3rd review: the name selected, then the focus moved to ⋯ only: the selection comes along all the same.
  const apart = move(head({}), head({ head: true }), true, '현재 글 작업');
  assert.deepEqual([apart.menu.open, apart.log], [true, ['select 0-5 forward', '현재 글 작업']]);
  // ← 오늘 and the title are found again by their labels; the notice's 확인, not another 확인 in an editor.
  assert.deepEqual(move(head({}), head({ head: true }), false, '오늘 목록으로 돌아가기').log, ['오늘 목록으로 돌아가기']);
  assert.deepEqual(move(head({}), head({ head: true }), false, '작성한 글 · 문서 목록 열기').log, ['작성한 글 · 문서 목록 열기']);
  const ok = move(head({}), head({ head: true }), false, '확인');
  assert.deepEqual([ok.carry?.focus?.nth, ok.log], [0, ['확인']]);
  // Another document by then: nothing is put back.
  const other = move(head({}, [], { value: '새 이름', defaultValue: '작성한 글' }), head({ head: true }), true, 'title', 'other');
  assert.deepEqual([other.menu.open, other.input?.value, other.log], [false, '작성한 글', []]);
  // Nothing open, typed or focused in the head carries nothing.
  const log: string[] = [], idle = fakeHead(head({}), false, log);
  assert.equal(carryProgramHead('doc', idle.root, idle.menu, null), null);
});
test('U44 re-review: a focus taken meanwhile, or never taken by the move, is left alone', async () => {
  const { carryProgramHead, restoreProgramHead } = await import('./tablet-head-carry');
  const log: string[] = [], before = head({}), old = fakeHead(before, false, log), carry = carryProgramHead('doc', old.root, old.menu, old.at('오늘 목록으로 돌아가기'))!;
  for (const control of before) control.gone = true;
  const next = fakeHead(head({ head: true }), false, log);
  restoreProgramHead(carry, 'doc', next.root, next.menu, null, next.at('확인'));
  assert.deepEqual(log, []);
  // Still connected (it did not move): its own focus stands.
  const kept: string[] = [], still = fakeHead(head({}), false, kept), stay = carryProgramHead('doc', still.root, still.menu, still.at('확인'))!;
  restoreProgramHead(stay, 'doc', still.root, still.menu, null, still.body);
  assert.deepEqual(kept, []);
});

test('U44 review: read just before the change (old place drawn), put back after it; the sheet returns to the new title', () => {
  assert(space.includes('headCarry.current = carryProgramHead(selectedRef.current, root.current, documentMenu.current, document.activeElement); change();'));
  assert(space.includes('const tabletLandscape = useSyncExternalStore(watchHead, () => tabletHead().matches, () => false);'));
  assert.match(space, /useLayoutEffect\(\(\) => \{\n    const carry = headCarry\.current; headCarry\.current = null;\n    if \(carry\) restoreProgramHead\(carry, selectedRef\.current, root\.current, documentMenu\.current, titleToggle\.current, document\.activeElement\);\n  \}, \[tabletLandscape\]\);/);
  assert(space.includes('if (!retained.area && target && !target.isConnected && target.classList.contains(styles.titleButton)) target = titleToggle.current;'));
});
