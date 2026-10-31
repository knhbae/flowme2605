import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_BROWSE_VIEWS, programBrowseHistoryAllowed, programEmptyHistoryOrigin, programHistoryAfterChange, programHistoryAfterStep } from './program-history-origin';

// FC head review P1: one account history, so 둘러보기 may step only over a change made there.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('둘러보기 refuses to undo a writing change at the top and takes back an import made there', () => {
  // A writing change (revision 8) is at the top: 둘러보기 may not undo it, nor redo it later.
  let origin = programHistoryAfterChange(programEmptyHistoryOrigin(), 8, false);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 8), false);
  // An import from Flow 찾기 (revision 9) is now the top: allowed.
  origin = programHistoryAfterChange(origin, 9, true);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 9), true);
  // Undone (revision 10): the import moves to the redo end, still 둘러보기's; nothing is left to undo there.
  origin = programHistoryAfterStep(origin, 'undo', 9, 10);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 10), false);
  assert.equal(programBrowseHistoryAllowed(origin, 'redo', 10), true);
  // Redone (revision 11): back on the undo end.
  origin = programHistoryAfterStep(origin, 'redo', 10, 11);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 11), true);
  // Any later change elsewhere, or a revision that moved on (another device), closes it again.
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 12), false);
  assert.equal(programBrowseHistoryAllowed(programHistoryAfterChange(origin, 12, false), 'undo', 12), false);
  // A writing change undone on the writing screen leaves a writing redo end: 둘러보기 may not redo it.
  const writingUndone = programHistoryAfterStep(programHistoryAfterChange(programEmptyHistoryOrigin(), 3, false), 'undo', 3, 4);
  assert.equal(programBrowseHistoryAllowed(writingUndone, 'redo', 4), false);
  assert.deepEqual([...PROGRAM_BROWSE_VIEWS], ['discover', 'flow', 'community']);
});

test('the host records each change by the screen it started on and checks before the controller is asked', () => {
  const alpha = read('AlphaWorkspace.tsx');
  assert.match(alpha, /const startedInBrowse = PROGRAM_BROWSE_VIEWS\.includes\(destinationRef\.current\.view\);/);
  assert.match(alpha, /if \(outcome\.changed !== false\) historyOrigin\.current = programHistoryAfterChange\(historyOrigin\.current, store\.snapshot\(\)\.account\?\.revision, startedInBrowse\);/);
  // The refusal comes before the controller: no request, no data change.
  const history = alpha.slice(alpha.indexOf('async function history('), alpha.indexOf('async function openLatest('));
  assert(history.indexOf('programBrowseHistoryAllowed(historyOrigin.current, kind') < history.indexOf('await controller.current?.[kind]()'));
  assert.match(history, /\{ setHistoryHint\(kind\); return; \}/);
  assert.match(history, /const before = controller\.current\?\.snapshot\(\)\.account\?\.revision;/);
  assert.match(history, /else if \(result\?\.ok\) historyOrigin\.current = programHistoryAfterStep\(historyOrigin\.current, kind, before, controller\.current\?\.snapshot\(\)\.account\?\.revision\);/);
  // Off but pressable on 둘러보기, with the hint; 쓰기·오늘·분류 keep the plain buttons (browseHistory is true there).
  assert.match(alpha, /const browseHistory = \(kind: 'undo' \| 'redo'\) => !browse \|\| programBrowseHistoryAllowed\(/);
  assert.match(alpha, /aria-disabled=\{browseHistory\('undo'\) \? undefined : true\}/);
  assert.match(alpha, /aria-disabled=\{browseHistory\('redo'\) \? undefined : true\}/);
  assert.match(alpha, /'쓰기 화면에서 되돌릴 수 있어요\.'/);
});

test('둘러보기 shows saved input first; the development notice waits (W11, review P2)', () => {
  const alpha = read('AlphaWorkspace.tsx');
  assert(alpha.includes('{!usesNoteChrome && (browse && savedNotice ? <span hidden data-dev-notice="after-saved-input" /> : publicNotice)}'));
});

test('the Flow detail head rules apply to phones only; PC keeps its detail (review P2)', () => {
  const css = read('ProgramDiscovery.module.css');
  const phone = css.slice(css.indexOf('@media(max-width:700px){\n.pcOnly{display:none!important}'));
  const before = css.slice(0, css.indexOf('@media(max-width:700px){\n.pcOnly{display:none!important}'));
  for (const rule of ['.flowDetail .detailHeader h1{font-size:22px;line-height:30px;margin:4px 0}', '.summaryText.summaryClamp{-webkit-line-clamp:2}', '.detailBar{min-height:56px;margin:0 0 8px}',
    '.anchorGeneralHint{position:absolute;', '.flowDetail .itemsLabel{margin:0;padding:4px 0;font-size:13px;']) {
    assert(phone.includes(rule), rule);
    assert(!before.includes(rule), `not outside the phone block: ${rule}`);
  }
  assert(css.includes('@media(min-width:701px){.phoneOnly{display:none!important}'));
  const tsx = read('ProgramDiscovery.tsx');
  assert(tsx.includes('<div className={styles.pcOnly}>{extras}</div>') && tsx.includes('<div className={styles.phoneOnly}>{extras}</div>'));
  assert(tsx.includes('{chooseButton(styles.pcOnly)}') && tsx.includes('{chooseButton(`${styles.chooseButton} ${styles.phoneOnly}`)}'));
});

test('re-review P1: a recovered save skips the recorded revision, so the stepped writing change carries no 둘러보기 origin', () => {
  // 둘러보기 change r1 → a writing save whose reply was lost, confirmed by 다시 확인 as r2 (nothing recorded) →
  // 되돌리기 on the writing screen from r2 to r3. The r1 record must not move onto the redo end.
  let origin = programHistoryAfterChange(programEmptyHistoryOrigin(), 1, true);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 2), false);
  origin = programHistoryAfterStep(origin, 'undo', 2, 3);
  assert.deepEqual(origin, { undo: null, redo: null });
  assert.equal(programBrowseHistoryAllowed(origin, 'redo', 3), false);
  // The same holds the other way: a redo from a revision the redo end was not recorded for drops it.
  const stale = { undo: null, redo: { revision: 5, browse: true } };
  assert.deepEqual(programHistoryAfterStep(stale, 'redo', 6, 7), { undo: null, redo: null });
  // Without a known revision nothing moves either.
  assert.deepEqual(programHistoryAfterStep(programHistoryAfterChange(programEmptyHistoryOrigin(), 1, true), 'undo', undefined, 2), { undo: null, redo: null });
});

test('re-review P2: on PC the summary keeps the header closing-line look it had before the head change', () => {
  const css = read('ProgramDiscovery.module.css');
  assert(css.includes('@media(min-width:701px){.phoneOnly{display:none!important}\n'));
  assert(css.includes('.detailHeader .summaryText.summaryPlain{color:#5b6b66;max-width:680px}}'));
  // The zero margin belongs to the phone head only.
  const phone = css.slice(css.indexOf('@media(max-width:700px){\n.pcOnly{display:none!important}'));
  assert(phone.includes('.summaryText{margin:0;font-size:16px;line-height:25px}'));
  assert(!css.slice(0, css.indexOf('@media(max-width:700px){\n.pcOnly{display:none!important}')).includes('.summaryText{margin:0}'));
});

test('re-review 2 P2: PC shows 더 보기 by the earlier rule; only phones go by the measured cut', () => {
  const tsx = read('ProgramDiscovery.tsx');
  // The rule before the head change (eb6f38fc), and the plain look exactly when it has no button.
  assert(tsx.includes("const longSummary = version.summary.length > 90 || version.summary.includes('\\n');"));
  assert(tsx.includes("${longSummary ? '' : ` ${styles.summaryPlain}`}"));
  assert(tsx.includes('{longSummary && <button type="button" className={`${styles.linkButton} ${styles.pcOnly}`}'));
  assert(tsx.includes('{(summaryClipped || summaryOpen === version.id) && <button type="button" className={`${styles.linkButton} ${styles.summaryMore} ${styles.phoneOnly}`}'));
});
