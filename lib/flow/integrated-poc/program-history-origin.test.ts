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
  origin = programHistoryAfterStep(origin, 'undo', 10);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 10), false);
  assert.equal(programBrowseHistoryAllowed(origin, 'redo', 10), true);
  // Redone (revision 11): back on the undo end.
  origin = programHistoryAfterStep(origin, 'redo', 11);
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 11), true);
  // Any later change elsewhere, or a revision that moved on (another device), closes it again.
  assert.equal(programBrowseHistoryAllowed(origin, 'undo', 12), false);
  assert.equal(programBrowseHistoryAllowed(programHistoryAfterChange(origin, 12, false), 'undo', 12), false);
  // A writing change undone on the writing screen leaves a writing redo end: 둘러보기 may not redo it.
  const writingUndone = programHistoryAfterStep(programHistoryAfterChange(programEmptyHistoryOrigin(), 3, false), 'undo', 4);
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
  assert.match(history, /else if \(result\?\.ok\) historyOrigin\.current = programHistoryAfterStep\(historyOrigin\.current, kind,/);
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
  assert(css.includes('@media(min-width:701px){.phoneOnly{display:none!important}}'));
  const tsx = read('ProgramDiscovery.tsx');
  assert(tsx.includes('<div className={styles.pcOnly}>{extras}</div>') && tsx.includes('<div className={styles.phoneOnly}>{extras}</div>'));
  assert(tsx.includes('{chooseButton(styles.pcOnly)}') && tsx.includes('{chooseButton(`${styles.chooseButton} ${styles.phoneOnly}`)}'));
});
