import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, formatDate } from './date';
import {
  MY_FLOW_CALENDAR_FLOW_MARKER_COLORS,
  MY_FLOW_CALENDAR_GRID_COMPACT_FLOW_THRESHOLD,
  MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT,
  MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT,
  MY_FLOW_ROUTINE_ICON_LIMIT,
  addMyFlowCalendarMonths,
  buildMyFlowCalendarDateSignature,
  buildMyFlowCalendarFlowFilterOptions,
  buildMyFlowCalendarFlowMarker,
  buildMyFlowCalendarSelectedDateGroups,
  filterMyFlowCalendarRows,
  filterMyFlowCalendarRowsForMonth,
  findFirstMyFlowCalendarDateInMonth,
  findMyFlowCalendarDefaultFocusDate,
  formatMyFlowCalendarMonthHeading,
  formatMyFlowCalendarLocalDate,
  getMyFlowCalendarExecutionRange,
  getMyFlowCalendarMonthCells,
  getMyFlowCalendarMonthEnd,
  getMyFlowCalendarMonthLabel,
  getMyFlowCalendarMonthStart,
  getMyFlowCalendarShortTitle,
  getMyFlowCalendarVisibleRange,
  getStableMyFlowCalendarMarkerIndex,
  groupMyFlowCalendarRowsByDate,
  groupMyFlowCalendarScheduleRowsByFlowForDate,
  partitionMyFlowCalendarRows,
  resolveMyFlowCalendarSelectedDate,
  sortMyFlowCalendarRows,
  sortMyFlowCalendarUnscheduledRows,
  type MyFlowCalendarViewRow,
} from './my-flow-calendar-view-model';

type TestRow = MyFlowCalendarViewRow & Readonly<{ token: string }>;

function row(input: Partial<TestRow> & Pick<TestRow, 'id' | 'token'>): TestRow {
  return {
    flowSlug: 'moving',
    flowTitle: '이사 준비',
    isRoutine: false,
    ...input,
  };
}

test('Calendar display limits preserve the current grid and selected-date density', () => {
  assert.equal(MY_FLOW_ROUTINE_ICON_LIMIT, 2);
  assert.equal(MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT, 2);
  assert.equal(MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT, 2);
  assert.equal(MY_FLOW_CALENDAR_GRID_COMPACT_FLOW_THRESHOLD, 3);
});

test('Calendar month helpers preserve the existing local month grid and range rules', () => {
  assert.equal(getMyFlowCalendarMonthStart('2028-02-20'), '2028-02-01');
  assert.equal(getMyFlowCalendarMonthEnd('2028-02-20'), '2028-02-29');
  assert.equal(getMyFlowCalendarMonthLabel('2026-05-16'), '2026-05');
  assert.equal(formatMyFlowCalendarMonthHeading('2026-05-16'), '2026년 5월');
  assert.equal(addMyFlowCalendarMonths('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(getMyFlowCalendarVisibleRange('2028-02-20'), {
    start: '2028-02-01',
    end: '2028-02-29',
  });

  const cells = getMyFlowCalendarMonthCells('2026-05-01');
  assert.equal(cells.length, 42);
  assert.equal(cells.filter((cell) => cell === null).length, 11);
  assert.equal(cells.find((cell) => cell)?.getDate(), 1);
  assert.equal([...cells].reverse().find((cell) => cell)?.getDate(), 31);
  assert.equal(formatMyFlowCalendarLocalDate(cells.find((cell) => cell)!), '2026-05-01');
});

test('Calendar execution range keeps the current -31 and +7 date serialization contract', () => {
  const todayDate = '2026-05-28';
  const today = new Date(`${todayDate}T00:00:00`);
  assert.deepEqual(getMyFlowCalendarExecutionRange(todayDate), {
    start: formatDate(addDays(today, -31)),
    end: formatDate(addDays(today, 7)),
  });
});

test('Calendar row sorting is date, schedule state, time, and then shared personal order', () => {
  const input = [
    row({ id: 'unscheduled', token: 'unscheduled' }),
    row({ id: 'later', token: 'later', date: '2026-06-01', scheduleState: 'all_day' }),
    row({ id: 'timed-late', token: 'timed-late', date: '2026-05-28', scheduleState: 'timed', startTime: '10:00' }),
    row({ id: 'all-day-b', token: 'all-day-b', date: '2026-05-28', scheduleState: 'all_day', personalOrderRank: 2 }),
    row({ id: 'all-day-a', token: 'all-day-a', date: '2026-05-28', scheduleState: 'all_day', personalOrderRank: 1 }),
    row({ id: 'timed-early', token: 'timed-early', date: '2026-05-28', scheduleState: 'timed', startTime: '09:00' }),
    row({ id: 'other', token: 'other', date: '2026-05-28', scheduleState: 'unscheduled' }),
  ];

  assert.deepEqual(sortMyFlowCalendarRows(input).map((entry) => entry.token), [
    'unscheduled',
    'all-day-a',
    'all-day-b',
    'timed-early',
    'timed-late',
    'other',
    'later',
  ]);
  assert.equal(input[0]?.token, 'unscheduled');
});

test('Unscheduled rows sort by Korean Flow title, source or personal order, and stable ID', () => {
  const input = [
    row({ id: 'b', token: 'b', flowTitle: '운동', sourceOrder: 1 }),
    row({ id: 'c', token: 'c', flowTitle: '공부', sourceOrder: 2 }),
    row({ id: 'a', token: 'a', flowTitle: '공부', personalOrderRank: 1, sourceOrder: 9 }),
  ];
  assert.deepEqual(sortMyFlowCalendarUnscheduledRows(input).map((entry) => entry.token), ['a', 'c', 'b']);
});

test('Calendar filtering excludes held rows and gives explicit multi-Flow selection precedence', () => {
  const rows = [
    row({ id: 'schedule', token: 'schedule', flowSlug: 'moving', date: '2026-05-28' }),
    row({ id: 'routine', token: 'routine', flowSlug: 'workout', flowTitle: '운동', isRoutine: true, date: '2026-05-28' }),
    row({ id: 'held', token: 'held', flowSlug: 'workout', flowTitle: '운동', isRoutine: true, date: '2026-05-29', occurrenceState: 'held' }),
  ];
  const partition = partitionMyFlowCalendarRows(rows);
  assert.deepEqual(partition.heldRows.map((entry) => entry.token), ['held']);
  assert.deepEqual(partition.scheduleRows.map((entry) => entry.token), ['schedule']);
  assert.deepEqual(partition.routineRows.map((entry) => entry.token), ['routine']);
  assert.deepEqual(
    filterMyFlowCalendarRows(partition.calendarRows, { scope: 'routine' }).map((entry) => entry.token),
    ['routine'],
  );
  assert.deepEqual(
    filterMyFlowCalendarRows(partition.calendarRows, {
      scope: 'routine',
      selectedFlowSlugs: ['moving'],
    }).map((entry) => entry.token),
    ['schedule'],
  );
});

test('Month and date grouping preserve row order and omit undated rows', () => {
  const rows = [
    row({ id: 'a', token: 'a', date: '2026-05-28' }),
    row({ id: 'b', token: 'b', date: '2026-06-01' }),
    row({ id: 'c', token: 'c', date: '2026-05-28' }),
    row({ id: 'd', token: 'd' }),
  ];
  assert.deepEqual(filterMyFlowCalendarRowsForMonth(rows, '2026-05-01').map((entry) => entry.token), ['a', 'c']);
  const grouped = groupMyFlowCalendarRowsByDate(rows);
  assert.deepEqual(Array.from(grouped.keys()), ['2026-05-28', '2026-06-01']);
  assert.deepEqual(grouped.get('2026-05-28')?.map((entry) => entry.token), ['a', 'c']);
});

test('Flow markers are deterministic and retain the current truncation and initial rules', () => {
  const marker = buildMyFlowCalendarFlowMarker({
    flowSlug: 'moving',
    markerKey: 'map:moving',
    title: '이사 준비 체크리스트',
  });
  assert.equal(marker.key, 'map:moving');
  assert.equal(marker.color, MY_FLOW_CALENDAR_FLOW_MARKER_COLORS[
    getStableMyFlowCalendarMarkerIndex('map:moving')
  ]);
  assert.equal(marker.shortTitle, '이사 준비 체...');
  assert.equal(marker.initial, '이');
  assert.equal(getMyFlowCalendarShortTitle('12345678'), '12345678');
  assert.equal(buildMyFlowCalendarFlowMarker({ flowSlug: 'empty', title: '   ' }).initial, 'F');
  assert.equal(
    buildMyFlowCalendarFlowMarker({
      flowSlug: 'moving',
      markerKey: ' map:moving ',
      title: '이사 준비',
    }).key,
    ' map:moving ',
  );
  assert.throws(() => getStableMyFlowCalendarMarkerIndex('moving', 0), RangeError);
});

test('Flow filter options count the visible month, retain total counts, and sort by month count', () => {
  const rows = [
    row({ id: 'm1', token: 'm1', flowSlug: 'moving', date: '2026-05-01' }),
    row({ id: 'm2', token: 'm2', flowSlug: 'moving', date: '2026-05-02' }),
    row({ id: 'm3', token: 'm3', flowSlug: 'moving', date: '2026-06-01' }),
    row({ id: 'w1', token: 'w1', flowSlug: 'workout', flowTitle: '운동', isRoutine: true, date: '2026-05-03' }),
  ];
  const options = buildMyFlowCalendarFlowFilterOptions([
    { flowSlug: 'workout', title: '운동' },
    { flowSlug: 'unused', title: '빈 계획' },
    { flowSlug: 'moving', title: '이사 준비', markerKey: 'map:moving' },
  ], rows, '2026-05-01');
  assert.deepEqual(options.map((option) => ({
    slug: option.flowSlug,
    count: option.count,
    totalCount: option.totalCount,
    markerKey: option.marker.key,
  })), [
    { slug: 'moving', count: 2, totalCount: 3, markerKey: 'map:moving' },
    { slug: 'workout', count: 1, totalCount: 1, markerKey: 'workout' },
  ]);
});

test('Schedule Flow grouping shares a Map marker while selected-date groups keep schedule before routine', () => {
  const rows = [
    row({ id: 'm1', token: 'm1', flowSlug: 'moving-a', flowMarkerKey: 'moving-map', date: '2026-05-28' }),
    row({ id: 'm2', token: 'm2', flowSlug: 'moving-b', flowMarkerKey: 'moving-map', date: '2026-05-28' }),
    row({ id: 'r1', token: 'r1', flowSlug: 'workout', flowTitle: '운동', isRoutine: true, date: '2026-05-28' }),
    row({ id: 'next', token: 'next', flowSlug: 'moving-a', flowMarkerKey: 'moving-map', date: '2026-05-29' }),
  ];
  const byDate = groupMyFlowCalendarScheduleRowsByFlowForDate(rows.filter((entry) => !entry.isRoutine));
  assert.equal(byDate.get('2026-05-28')?.length, 1);
  assert.deepEqual(byDate.get('2026-05-28')?.[0]?.rows.map((entry) => entry.token), ['m1', 'm2']);

  const selectedGroups = buildMyFlowCalendarSelectedDateGroups(rows, '2026-05-28');
  assert.deepEqual(selectedGroups.map((group) => ({
    key: group.key,
    kind: group.kind,
    rows: group.rows.map((entry) => entry.token),
  })), [
    { key: 'schedule-moving-map', kind: 'schedule', rows: ['m1', 'm2'] },
    { key: 'routine-workout', kind: 'routine', rows: ['r1'] },
  ]);
});

test('Default focus and selection preserve today/current date before choosing the next or month fallback', () => {
  const rows = [
    row({ id: 'late', token: 'late', date: '2026-06-05' }),
    row({ id: 'today', token: 'today', date: '2026-05-28' }),
    row({ id: 'early', token: 'early', date: '2026-05-10' }),
  ];
  assert.equal(findMyFlowCalendarDefaultFocusDate(rows, '2026-05-28', '2026-05-01'), '2026-05-28');
  assert.equal(findMyFlowCalendarDefaultFocusDate(rows, '2026-05-29', '2026-05-01'), '2026-06-05');
  assert.equal(findMyFlowCalendarDefaultFocusDate(rows, '2026-07-01', '2026-05-01'), '2026-06-05');
  assert.equal(findMyFlowCalendarDefaultFocusDate([], '2026-05-28', '2026-05-18'), '2026-05-01');
  assert.equal(findFirstMyFlowCalendarDateInMonth(rows, '2026-05-01'), '2026-05-28');
  assert.equal(findFirstMyFlowCalendarDateInMonth(rows, '2026-07-01'), '2026-07-01');
  assert.equal(resolveMyFlowCalendarSelectedDate(rows, '2026-05-10', '2026-05-01'), '2026-05-10');
  assert.equal(resolveMyFlowCalendarSelectedDate(rows, '2026-05-11', '2026-05-01'), '2026-05-28');
});

test('Calendar date signature matches the existing rerender dependency fields', () => {
  assert.equal(buildMyFlowCalendarDateSignature([
    row({ id: 'a', token: 'a', date: '2026-05-28', scheduleState: 'timed', startTime: '09:30', durationMinutes: 45 }),
    row({ id: 'b', token: 'b', date: '2026-05-29', scheduleState: 'all_day' }),
  ]), '2026-05-28:timed:09:30:45|2026-05-29:all_day::');
});
