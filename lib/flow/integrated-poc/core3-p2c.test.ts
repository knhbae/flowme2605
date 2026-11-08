import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_ARRIVAL_TOAST_SCROLL } from './program-discovery-display';

// Core3 P2c (UX review, 11/8): titles lead in the detail and the sheet; a Flow's arrival toast is short (×, the first
// input, a scroll of more than a line, 10 s after the last touch — held while touched, as the 복구함's) and its
// [되돌리기] then stays on the copy's source line; the '＋ 오늘 … 쓰기' row is tinted on a press or a real hover only.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const C = '../../../components/flow/integrated-poc/';
const alpha = read(C + 'AlphaWorkspace.tsx'), space = read(C + 'ProgramSpace.tsx'), discovery = read(C + 'ProgramDiscovery.tsx'), life = read(C + 'use-toast-life.ts');
const discoveryCss = read(C + 'ProgramDiscovery.module.css'), spaceCss = read(C + 'ProgramSpace.module.css'), editorCss = read(C + 'ProgramTextEditor.module.css');

test('one toast life for both toasts: 10 s after shown or last touched, held while the pointer, a finger or the focus is on it', () => {
  assert(life.includes('if (shown === null) { held.current = false; return; }'));
  assert(life.includes('const timer = setTimeout(() => { if (!held.current) expireRef.current(shown); }, ms);'));
  assert(life.includes('}, [shown, touched, ms]);'), 'a touch ending starts the 10 s again');
  assert(life.includes('onPointerEnter: () => { held.current = true; },') && life.includes('onFocus: () => { held.current = true; },'));
  assert(life.includes('onBlur: (event: FocusEvent<HTMLElement>) => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; release(); },'));
  assert(alpha.includes('const recoveryToastLife = useToastLife(recoveryToast,') && alpha.includes('const arrivalToastLife = useToastLife(arrivalToastShown,'));
});

test('the arrival toast closes at whichever comes first: ×, the first input, more than a line of scroll, the 10 s', () => {
  assert.equal(PROGRAM_ARRIVAL_TOAST_SCROLL, 32);
  // Only a Flow's arrival is a toast; the link notices (stage 4) stay in the document as before.
  assert.equal(alpha.split('toastOpen: true').length - 1, 1);
  assert(alpha.includes("calendar: span.first ? { first: span.first, title: version.title, count: placed.length } : null, toastOpen: true });"));
  assert(alpha.includes("text: home ? '오늘 아래에 링크를 한 줄 두었습니다.' : '쓰던 글을 찾지 못해 새 글에 링크를 두었습니다.', revision: null, calendar: null });"));
  assert(alpha.includes('const closeArrivalToast = () => setImportArrival(previous => previous?.toastOpen ? { ...previous, toastOpen: false } : previous);'));
  assert(alpha.includes('const start = window.scrollY, scrolled = () => { if (Math.abs(window.scrollY - start) > PROGRAM_ARRIVAL_TOAST_SCROLL) closeArrivalToast(); };'));
  assert(alpha.includes(`if (arrivalToastShown && event.target instanceof Element && event.target.closest('section[aria-label="내 공간"]')) closeArrivalToast(); }}`));
  // Leaving the document still ends the arrival (and its 되돌리기).
  assert(alpha.includes("setImportArrival(previous => previous && (previous.actorId !== session.userId || destination.view !== 'space' || destination.id !== previous.documentId) ? null : previous);"));
});

test('the toast reads [되돌리기] [달력에서 보기] [×]; once closed, 되돌리기 stays at the end of the copy\'s source line', () => {
  const toast = space.slice(space.indexOf('data-arrival-toast='), space.indexOf('</div>}', space.indexOf('data-arrival-toast=')));
  assert(toast.indexOf('{importCancel}') < toast.indexOf('data-import-calendar') && toast.indexOf('data-import-calendar') < toast.indexOf('data-arrival-close'));
  assert(toast.includes('aria-label="알림 닫기" onClick={props.importNotice.toast.onClose}>×</button>'));
  assert(space.includes('props.importNotice.toast?.open !== false && <div className={styles.importNotice}'), 'closed: no notice in the document');
  assert(space.includes('const arrivalUndoAfterToast = !!importCancel && props.importNotice?.toast?.open === false'));
  const header = space.slice(space.indexOf('{copyHeader && <div className={styles.copyHeader}'), space.indexOf('</div>}', space.indexOf('{copyHeader && <div className={styles.copyHeader}')));
  assert(header.indexOf('원본 보기</button>}') < header.indexOf('{arrivalUndoAfterToast && <span data-arrival-undo>{importCancel}</span>}'));
  assert(spaceCss.includes('.space .importNotice[data-arrival-toast] > .importToastClose { width: 44px;'));
});

test('titles lead: the detail 22/700, the sheet 19/700, task rows 16/400', () => {
  assert(discoveryCss.includes('.flowDetail .detailHeader h1{font-weight:700}') && discoveryCss.includes('.flowDetail .detailHeader h1{font-size:22px;line-height:30px;margin:4px 0}'));
  assert(discoveryCss.includes('.importSheet .sheetTitle{margin:0;font-size:19px;line-height:26px;font-weight:700}'));
  assert(discoveryCss.includes('.flowDetail .taskTitle{font-size:16px;font-weight:400}'));
  assert(discovery.includes('<h2 id={`${uid}-sheet`} className={styles.sheetTitle}>가져오기</h2>'));
});

test("the '＋ 오늘 … 쓰기' row: tinted on a press, and on hover only where hover is real", () => {
  assert(!editorCss.includes('.editor .todayStart:hover, .editor .todayStart:active { background: var(--flowme-b-selected); }'));
  assert(editorCss.includes('.editor .todayStart.todayStart:hover:not(:disabled) { background: transparent; }'));
  assert(editorCss.includes('.editor .todayStart.todayStart:active:not(:disabled) { background: var(--flowme-b-selected); }'));
  assert(editorCss.includes('@media (hover: hover) { .editor .todayStart.todayStart:hover:not(:disabled) { background: var(--flowme-b-selected); } }'));
});
