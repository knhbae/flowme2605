import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProgramData } from './contract';
import { programExecutionDay, programExecutionList } from './execution-presentation';
import { programMonthGrid, programMonthTitle, programMonthKeyTarget } from './month-grid';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramQuickTask, completeProgramTask, createProgramDocument, createProgramFolder, updateProgramTask } from './private-space';
import { programOrderedExecutionRows, type ProgramExecutionQuery } from './recurrence-order';

// C5 (month calendar, 10-month-calendar.md; plan c5c6i7 C5): a Monday-first grid of the month, counted from the very
// rows the list heads its days with (finished and occurrences too, same filters), dots by urgency, titles on wide
// screens, a spoken name per day, and the day's group (heading, ＋, I7, rows) for the sheet or panel.
const today = '2026-10-29';
const month: ProgramExecutionQuery = { period: 'month', date: '2026-10-15', today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 };
let request = 0;
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `c5-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
function account(tasks: [title: string, date: string | null, extra?: { done?: boolean; folder?: string; time?: string }][]) {
  let data = createProgramData();
  const folders = new Map<string, string>(), docs = new Map<string, string>();
  for (const [title, date, extra = {}] of tasks) {
    const folder = extra.folder ?? '';
    if (folder && !folders.has(folder)) { const made = createProgramFolder(data, { ...base(data), title: folder }); assert(made.ok); data = made.data; folders.set(folder, made.result); }
    if (!docs.has(folder)) { const doc = createProgramDocument(data, { ...base(data), title: `문서 ${folder || '기본'}`, folderId: folders.get(folder) }); assert(doc.ok); data = doc.data; docs.set(folder, doc.result); }
    const added = addProgramQuickTask(data, { ...base(data), documentId: docs.get(folder)!, title, date }); assert(added.ok); data = added.data;
    if (extra.time) { const timed = updateProgramTask(data, { ...base(data), taskId: added.result, patch: { time: extra.time } }); assert(timed.ok); data = timed.data; }
    if (extra.done) { const done = completeProgramTask(data, { ...base(data), taskId: added.result, date: date ?? today, done: true }); assert(done.ok); data = done.data; }
  }
  assert(validateProgramData(data));
  return { data, folders };
}
const cells = (grid: ReturnType<typeof programMonthGrid>) => grid.weeks.flat().filter(cell => cell !== null);

test('Monday first: October 2026 starts on its Thursday, blanks before and after, five or six weeks', () => {
  const grid = programMonthGrid([], '2026-10-15', today, '2026-10-15');
  assert.deepEqual(grid.weekdays, ['월', '화', '수', '목', '금', '토', '일']);
  assert.deepEqual(grid.weeks[0].slice(0, 4).map(cell => cell?.day ?? null), [null, null, null, 1]);
  assert.equal(cells(grid).length, 31);
  assert(grid.weeks.every(week => week.length === 7));
  assert.deepEqual(grid.weeks.at(-1)!.map(cell => cell?.day ?? null), [26, 27, 28, 29, 30, 31, null]);
  assert.equal(programMonthGrid([], '2026-03-01', today, '2026-03-01').weeks.length, 6, 'March 2026 starts on a Sunday');
  assert.equal(programMonthTitle('2026-10-15', today), '10월');
  assert.equal(programMonthTitle('2027-01-03', today), '2027년 1월');
});

test('each day counts what the list heads it with: finished rows too, and the same filter', () => {
  const { data, folders } = account([['밀린 일', '2026-10-20'], ['끝낸 일', '2026-10-20', { done: true }], ['오늘 일', today, { folder: '회사' }],
    ['내일 일', '2026-10-30'], ['다음 달 일', '2026-11-02'], ['날짜 없는 일', null]]);
  for (const query of [month, { ...month, folderId: folders.get('회사')! }, { ...month, query: '일' }, { ...month, query: '밀린' }]) {
    const rows = programOrderedExecutionRows(data, query).rows, grid = programMonthGrid(rows, query.date, today, query.date);
    const headings = new Map(programExecutionList(rows, 'month', query.date, today).flatMap(item => item.kind === 'heading' && item.addDate
      ? [[item.addDate, Number(item.label.split(' · ').at(-1))] as const] : []));
    const counted = new Map(cells(grid).filter(cell => cell.count).map(cell => [cell.date, cell.count] as const));
    assert.deepEqual(counted, headings, JSON.stringify(query));
  }
  const grid = programMonthGrid(programOrderedExecutionRows(data, month).rows, month.date, today, month.date);
  const on = (date: string) => cells(grid).find(cell => cell.date === date)!;
  assert.deepEqual([on('2026-10-20').count, on('2026-10-20').late, on('2026-10-20').done], [2, 1, 1]);
  assert.equal(cells(grid).some(cell => cell.date.startsWith('2026-11')), false);
});

test('dots by urgency (지남, 남음, 끝냄), three at most then +N; wide cells show three titles or two and +N', () => {
  const { data } = account([['끝 A', '2026-10-20', { done: true }], ['밀린 B', '2026-10-20'], ['밀린 C', '2026-10-20'], ['끝 D', '2026-10-20', { done: true }],
    ['오늘 E', today], ['오늘 F', today, { done: true }]]);
  const grid = programMonthGrid(programOrderedExecutionRows(data, month).rows, month.date, today, '2026-10-20');
  const late = cells(grid).find(cell => cell.date === '2026-10-20')!, now = cells(grid).find(cell => cell.date === today)!;
  assert.deepEqual([late.dots, late.more], [['late', 'late', 'done'], 1]);
  assert.deepEqual([late.titles.length, late.titleMore], [2, 2]);
  assert.deepEqual(late.titles.map(title => title.state), late.titles.map(title => title.text.startsWith('끝') ? 'done' : 'late'));
  assert.deepEqual([now.dots, now.more, now.titles.length, now.titleMore], [['open', 'done'], 0, 2, 0]);
  assert.equal(late.selected, true); assert.equal(now.today, true);
});

test('each day has a spoken name: 오늘, the weekday, how many, how many late, all done, or nothing', () => {
  const { data } = account([['밀린 일', '2026-10-20'], ['끝낸 일', '2026-10-20', { done: true }], ['끝 하나', '2026-10-21', { done: true }], ['오늘 일', today]]);
  const grid = programMonthGrid(programOrderedExecutionRows(data, month).rows, month.date, today, month.date);
  const label = (date: string) => cells(grid).find(cell => cell.date === date)!.label;
  assert.equal(label('2026-10-20'), '10월 20일 화요일, 할 일 2개, 1개 지남');
  assert.equal(label('2026-10-21'), '10월 21일 수요일, 할 일 1개, 모두 끝냄');
  assert.equal(label(today), '오늘, 10월 29일 목요일, 할 일 1개');
  assert.equal(label('2026-10-22'), '10월 22일 목요일, 할 일 없음');
});

test('keys move the focused day: arrows a day or a week, Home/End the week, PageUp/PageDown a month', () => {
  assert.equal(programMonthKeyTarget('2026-10-15', 'ArrowRight'), '2026-10-16');
  assert.equal(programMonthKeyTarget('2026-10-15', 'ArrowLeft'), '2026-10-14');
  assert.equal(programMonthKeyTarget('2026-10-15', 'ArrowDown'), '2026-10-22');
  assert.equal(programMonthKeyTarget('2026-10-15', 'ArrowUp'), '2026-10-08');
  assert.equal(programMonthKeyTarget('2026-10-15', 'Home'), '2026-10-12', 'Thursday → that Monday');
  assert.equal(programMonthKeyTarget('2026-10-15', 'End'), '2026-10-18');
  assert.equal(programMonthKeyTarget('2026-10-31', 'PageDown'), '2026-11-30');
  assert.equal(programMonthKeyTarget('2026-10-01', 'ArrowLeft'), '2026-09-30', 'past the month edge the month changes');
  assert.equal(programMonthKeyTarget('2026-10-15', 'Tab'), null);
});

test('the day group for the sheet or panel: the list heading words, ＋, I7, and its rows in list order', () => {
  const { data } = account([['둘째', '2026-10-20', { time: '16:00' }], ['첫째', '2026-10-20', { time: '09:00' }], ['다른 날', '2026-10-21']]);
  const rows = programOrderedExecutionRows(data, month).rows;
  const day = programExecutionDay(rows, '2026-10-20', today, new Map([['2026-10-20', { hidden: 0 }]]));
  assert.deepEqual(day[0], { kind: 'heading', key: 'heading:2026-10-20', label: '10월 20일 (화) · 2', late: false, addDate: '2026-10-20', orderDate: '2026-10-20' });
  assert.deepEqual(day.slice(1).map(item => item.kind === 'row' && item.entry.kind === 'text-task' ? item.entry.task.title : null), ['첫째', '둘째']);
  assert.deepEqual(programExecutionDay(rows, '2026-10-22', today), [{ kind: 'heading', key: 'heading:2026-10-22', label: '10월 22일 (목)', late: false, addDate: '2026-10-22' }]);
});

test('the space wires it: title, list or calendar remembered on the device, sheet or panel, protected input, return', () => {
  const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const space = read('ProgramSpace.tsx'), grid = read('ProgramMonthGrid.tsx'), css = read('ProgramMonthGrid.module.css');
  assert.match(space, /period === 'month' \? programMonthTitle\(date, today\)/);
  assert.match(space, /<div className=\{styles\.monthViews\} role="group" aria-label="월간 보기 방식">/);
  assert.match(space, /aria-pressed=\{monthView === 'grid'\}/);
  assert.match(space, /const MONTH_VIEW_KEY = 'flow:poc:personal-workspace:v1:month-view';/);
  // In the calendar the range words, the quick add and the empty days line go; the grid takes the list's place.
  assert.match(space, /\{!monthGrid && range\.from && range\.to/);
  assert.match(space, /\{!monthGrid && <details className=\{styles\.quickDisclosure\}/);
  assert.match(space, /\{monthGrid \? <div className=\{styles\.monthLayout\} data-wide=\{wideMonth \|\| undefined\}>\s*<ProgramMonthGrid /);
  // Narrow: a modal sheet; wide (content 840px and up): a panel beside the grid (one dialog, c5-review-fix.test.ts).
  assert.match(space, /const wideMonth = monthWidth >= 840;/);
  assert.match(space, /<dialog ref=\{daySheet\} className=\{wideMonth \? styles\.dayPanel : `\$\{styles\.findDialog\} \$\{styles\.daySheet\}`\}/);
  // A written line is never lost: picking another day, the month arrows or closing the sheet goes back to it.
  assert.match(space, /function keepWrittenDay\(\) \{ if \(!addingDate \|\| !groupAddField\.current\?\.value\.trim\(\)\) return false; groupAddField\.current\.focus\(\); return true; \}/);
  assert.match(space, /function pickMonthDay\(day: string, open: boolean\) \{\s*if \(keepWrittenDay\(\)\) return false;/);
  assert.match(space, /function closeDaySheet\(\) \{\s*if \(keepWrittenDay\(\)\) return;/);
  // A source opened from the day remembers the calendar, the day and the row (the sheet closes when it opens).
  assert.match(space, /const sourceView = \(\): SourceOrigin\['view'\] => \(\{ period, date, folderId, query, \.\.\.\(monthGrid \? \{ monthView: 'grid' as const, dayOpen: !!dayShown \} : \{\}\) \}\);/);
  assert.match(space, /if \(origin\.view\.monthView === 'grid'\) \{ setMonthView\('grid'\); setDayOpen\(!!origin\.view\.dayOpen\); \}/);
  assert.match(grid, /tabIndex=\{cell\.date === tabDate \? 0 : -1\}/);
  assert.match(grid, /const target = programMonthKeyTarget\(focusDate, event\.key\);/);
  assert.match(css, /\.grid \{[^}]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/);
});
