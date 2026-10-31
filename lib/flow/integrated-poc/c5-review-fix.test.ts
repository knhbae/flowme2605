import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programMonthGrid, programMonthTabStop } from './month-grid';

// C5 review (FIX): a written ＋ line survives a row's source press and the sheet waits until the source opens (P1);
// an occurrence's source returns to the calendar too; the calendar's ＋ waits out an automatic read; a refused month
// change keeps a Tab stop in the grid; the sheet and the panel are one element, so a switch keeps the ＋ draft.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const space = read('ProgramSpace.tsx'), grid = read('ProgramMonthGrid.tsx');
const body = (name: string) => { const from = space.indexOf(`function ${name}(`); return space.slice(from, space.indexOf('\n  }\n', from)); };

test('P1: a row press with a written ＋ line goes back to it; the sheet closes only when the source opens', () => {
  assert.match(body('openFromList'), /^function openFromList\(task: TextTask, button: HTMLElement\) \{\n(\s*\/\/[^\n]*\n)*\s*if \(keepWrittenDay\(\)\) return;/);
  assert(!body('openFromList').includes('daySheet.current?.close()'), 'not at the press');
  // The moment openDocument switches to the document, right before the view changes.
  const open = space.slice(space.indexOf('async function openDocument(id: string'), space.indexOf("setPeriod('documents');\n    props.navigate("));
  assert.match(open, /if \(daySheet\.current\?\.matches\(':modal'\)\) daySheet\.current\.close\(\);\s*setDayOpen\(false\);\s*setSelected\(id\);[^\n]*$/);
});

test('P2: an occurrence opens its source like a task does, so "← 오늘" finds its month, day and row', () => {
  assert.match(space, /onOpenSource=\{\(id, line\) => openOccurrenceSource\(id, line, entry\.key\)\}/);
  assert.match(space, /if \(entry\.kind === 'occurrence'\) return <li key=\{entry\.key\} data-execution-key=\{entry\.key\}/);
  const occurrence = body('openOccurrenceSource');
  assert.match(occurrence, /if \(keepWrittenDay\(\)\) return;/);
  assert.match(occurrence, /taskId: '', rowKey, top: row \? row\.getBoundingClientRect\(\)\.top : null, scrollY: window\.scrollY, view: sourceView\(\)/);
  assert.match(space, /\.find\(element => \(origin\.rowKey \? element\.dataset\.executionKey === origin\.rowKey : element\.dataset\.taskId === origin\.taskId\) && element\.getClientRects\(\)\.length\);/);
});

test('P2: the calendar\'s ＋ (the day heading\'s add) waits out the automatic read', () => {
  assert.match(body('addOnDay'), /\}, true, undefined, undefined, true\);/);
});

test('P2: a month change refused for a written ＋ line keeps the focus, and the grid always has one Tab stop', () => {
  const october = programMonthGrid([], '2026-10-31', '2026-10-29', '2026-10-31');
  assert.equal(programMonthTabStop(october, '2026-11-01', '2026-10-31'), '2026-10-31');
  assert.equal(programMonthTabStop(october, '2026-10-12', '2026-10-31'), '2026-10-12');
  assert.match(grid, /if \(target\.slice\(0, 7\) !== props\.date\.slice\(0, 7\) && !props\.onPick\(target, false\)\) return;\s*moved\.current = true; setFocusDate\(target\);/);
  assert.match(grid, /tabIndex=\{cell\.date === tabDate \? 0 : -1\}/);
  assert.match(body('pickMonthDay'), /if \(keepWrittenDay\(\)\) return false;[\s\S]*return true;/);
});

test('P2: the sheet and the panel are one dialog, so its ＋ line survives the 840px switch', () => {
  assert.equal(space.match(/<dialog ref=\{daySheet\}/g)?.length, 1);
  assert(!space.includes('<aside className={styles.dayPanel}'), 'no separate panel');
  assert.match(space, /<dialog ref=\{daySheet\} className=\{wideMonth \? styles\.dayPanel : `\$\{styles\.findDialog\} \$\{styles\.daySheet\}`\}/);
  // Narrowing with the panel's ＋ line open keeps the day open as a sheet (the day itself is always `date`, below).
  assert.match(space, /const dayShown = !monthGrid \? null : wideMonth \|\| dayOpen \|\| addingDate === date \? date : null;/);
  assert.match(space, /if \(mode === 'sheet'\) sheet\.showModal\(\); else if \(mode === 'panel'\) sheet\.show\(\);/);
  assert.match(space, /\{dayShown && <>\{dayGroup\(dayShown, wideMonth \? undefined : closeDaySheet\)\}/);
});

test('re-review P2: the sheet and the panel show one day, the chosen date, so a day picked wide keeps its ＋ line narrow', () => {
  // No second day: the sheet only remembers that it is open; the day shown, the source return and the focus on close use `date`.
  assert(!/sheetDay/.test(space), 'no separate sheet day');
  assert.match(space, /const \[dayOpen, setDayOpen\] = useState\(false\)/);
  assert.match(body('pickMonthDay'), /setDate\(day\);\s*if \(open && !wideMonth\) setDayOpen\(true\);/);
  assert.match(body('closeDaySheet'), /setDayOpen\(false\); setAddingDate\(null\);\s*requestAnimationFrame\(\(\) => root\.current\?\.querySelector<HTMLButtonElement>\(`\[data-month-day="\$\{date\}"\]`\)/);
  assert.match(space, /monthView\?: 'grid'; dayOpen\?: boolean \}/);
});

test('re-review: a sheet/panel switch while Korean is composed in the day waits for the composition to end', () => {
  const effect = space.slice(space.indexOf('const sheet = daySheet.current;'), space.indexOf('}, [dayShown, wideMonth, sheetSettled]);'));
  assert(effect.length > 0, 'the switch re-runs when a composition ends');
  // Closing the dialog to reopen it would blur the ＋ line mid-syllable; only a switch waits (a day closing does not).
  assert.match(effect, /if \(mode === current\) return;\s*(\/\/[^\n]*\n\s*)*if \(mode && current && sheetComposing\.current && sheet\.contains\(document\.activeElement\)\) return;\s*const active = document\.activeElement;/);
  assert.match(space, /const endSheetComposing = \(\) => \{ if \(!sheetComposing\.current\) return; sheetComposing\.current = false; setSheetSettled\(count => count \+ 1\); \};/);
  const dialog = space.slice(space.indexOf('<dialog ref={daySheet}'), space.indexOf('</dialog>', space.indexOf('<dialog ref={daySheet}')));
  assert.match(dialog, /onCompositionStart=\{\(\) => \{ sheetComposing\.current = true; \}\} onCompositionEnd=\{endSheetComposing\} onBlur=\{endSheetComposing\}/);
});
