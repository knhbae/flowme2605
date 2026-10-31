import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProgramData } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramQuickTask, completeProgramTask, createProgramDocument } from './private-space';
import { programOrderedExecutionRows, type ProgramExecutionQuery, type ProgramOrderedExecutionRow } from './recurrence-order';
import { PROGRAM_SELECT_REASON, programSelectBlock, programSelectDay, programSelectRange, programToggleSelection } from './select-mode';

// C6a (C6-C9-I7 2-1~2-3): 여러 개 고르기. Which rows can be picked (not occurrences, not finished, not ones the row's
// detail could not move), and the picks themselves: one row, a day's [모두]/[풀기], Shift+click ranges.
const today = '2026-10-29';
const week: ProgramExecutionQuery = { period: 'week', date: today, today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 };
let request = 0;
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `c6a-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
function account() {
  let data = createProgramData();
  const doc = createProgramDocument(data, { ...base(data), title: '고르기' }); assert(doc.ok); data = doc.data;
  for (const title of ['하나', '둘', '셋', '끝낸 일']) { const added = addProgramQuickTask(data, { ...base(data), documentId: doc.result, title, date: '2026-10-30' }); assert(added.ok); data = added.data; }
  const done = space(data).text.documents[0].lines.find(line => line.text.includes('끝낸 일'))!.id;
  const finished = completeProgramTask(data, { ...base(data), taskId: done, date: today, done: true }); assert(finished.ok);
  assert(validateProgramData(finished.data));
  return finished.data;
}
const space = (data: ProgramData) => data.spaces[data.activeActorId];
const rows = (data: ProgramData) => programOrderedExecutionRows(data, week).rows;
const named = (data: ProgramData, title: string) => rows(data).find(row => row.kind === 'text-task' && row.task.title === title)!;

test('occurrences, finished tasks and tasks the detail could not move are not picked, each with its reason', () => {
  const data = account();
  assert.equal(programSelectBlock(space(data), named(data, '하나'), false), null);
  assert.equal(programSelectBlock(space(data), named(data, '끝낸 일'), true), 'done');
  const occurrence = { kind: 'occurrence', key: JSON.stringify(['occurrence', 'a', 'b', 'c', 'd', 'e', '2026-10-30']), date: '2026-10-30', row: { title: '회차' } } as unknown as ProgramOrderedExecutionRow;
  assert.equal(programSelectBlock(space(data), occurrence, false), 'occurrence');
  // A task the date change refuses (here: a document now locked for content) cannot be picked either.
  const locked = { ...space(data), archivedDocumentIds: [space(data).text.documents[0].id] };
  assert.equal(programSelectBlock(locked as typeof locked, named(data, '하나'), false), 'locked');
  assert.equal(PROGRAM_SELECT_REASON.occurrence, '반복 회차는 회차마다 날짜를 바꿉니다');
  assert.equal(PROGRAM_SELECT_REASON.done, '끝낸 할 일은 고를 수 없습니다');
});

test('picks: one row toggles; a day\'s 모두 picks its pickable rows, then 풀기 lets them go; Shift picks a range', () => {
  const none = new Set<string>();
  const one = programToggleSelection(none, 'a');
  assert.deepEqual([...one], ['a']);
  assert.deepEqual([...programToggleSelection(one, 'a')], []);
  // [모두]: adds the day's pickable rows; when all are picked it is [풀기] and lets them go (others stay).
  const day = programSelectDay(new Set(['x']), ['a', 'b']);
  assert.deepEqual([...day.selected].sort(), ['a', 'b', 'x']); assert.equal(day.state, 'all');
  const off = programSelectDay(day.selected, ['a', 'b']);
  assert.deepEqual([...off.selected], ['x']); assert.equal(off.state, 'none');
  // Shift: from the last picked row to this one, pickable rows only, in the list's order.
  const order = ['a', 'b', 'c', 'd', 'e'], pickable = new Set(['a', 'b', 'd', 'e']);
  assert.deepEqual([...programSelectRange(new Set(['a']), order, pickable, 'a', 'e')].sort(), ['a', 'b', 'd', 'e']);
  assert.deepEqual([...programSelectRange(new Set(), order, pickable, 'e', 'b')].sort(), ['b', 'd', 'e']);
  assert.deepEqual([...programSelectRange(new Set(['a']), order, pickable, null, 'd')].sort(), ['a', 'd'], 'no anchor: just this row');
});

test('the space wires it: entry beside 글 찾기, the title, what hides, the rows, 모두, the bar, and the way out', () => {
  const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const source = read('ProgramSpace.tsx'), css = read('ProgramSpace.module.css');
  // Entry: 고르기 (목록에서 고르기 in the calendar, 여러 개 고르기 in today's … menu); off with its reason while busy.
  assert.match(source, /\{compactNoteToday \? '여러 개 고르기' : monthGrid \? '목록에서 고르기' : '고르기'\}/);
  assert.match(source, /const selectBlocked = completingTaskIds\.size \? /);
  // Title "n개 선택 · 취소" (role=status), and what hides while picking.
  assert.match(source, /<span role="status">\{selecting\.keys\.size \? `\$\{selecting\.keys\.size\}개 선택` : '옮길 할 일을 누르세요'\}<\/span>/);
  assert.match(source, /\{!selecting && !\['all', 'undated', 'documents'\]\.includes\(period\) && <div className=\{styles\.dateNav\}>/);
  assert.match(source, /\{!monthGrid && !selecting && <details className=\{styles\.quickDisclosure\}/);
  // Rows: one button with aria-pressed; no check, source, drag, long press or …; blocked rows say why.
  assert.match(source, /if \(selecting && item\.kind === 'row'\) return renderSelectRow\(item\);/);
  assert.match(source, /aria-pressed=\{block \? undefined : picked\} aria-disabled=\{block \? true : undefined\}/);
  assert.match(source, /if \(block\) \{ setSelectNotice\(PROGRAM_SELECT_REASON\[block\]\); return; \}/);
  // Day headings: [모두]/[풀기] instead of I7 and ＋.
  assert.match(source, /\{selecting \? selectDayButton\(item\) : dayHeadingControls\(item\)\}/);
  // The bar: phones cover the bottom tabs with it; wide screens hold it over the list. Date change comes with C6b.
  assert.match(source, /<div className=\{styles\.selectBar\} role="group" aria-label="고른 할 일">/);
  assert.match(css, /\.space \.selectBar \{ position: fixed; inset: auto 0 0; z-index: 45;/);
  // Out: 취소, Esc, a view change; the screen and its scroll come back (and the calendar, when it started there).
  assert.match(source, /useEffect\(\(\) => \{ stopSelecting\(false\); \}, \[actorId, period, date, folderId, query\]\);/);
  // The scroll comes back once the list is drawn again (390 found it restored too early).
  assert.match(source, /selectScrollBack\.current = state\.scrollY;/);
  assert.match(source, /if \(selecting \|\| top === null\) return;\s*selectScrollBack\.current = null;\s*const frame = requestAnimationFrame\(\(\) => window\.scrollTo\(\{ top, behavior: 'instant' \}\)\);/);
  assert.match(source, /if \(state\.calendar\) setMonthViewState\('grid'\);/);
});
