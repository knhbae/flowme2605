import {
  getCalendarFlowScopeForFlow,
  isCalendarFlowRowInScope,
  isCalendarFlowRowInSelection,
  type CalendarFlowScope,
} from './calendar-flow-scope';
import { addDays, formatDate } from './date';

export const MY_FLOW_ROUTINE_ICON_LIMIT = 2;
export const MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT = 2;
export const MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT = 2;
export const MY_FLOW_CALENDAR_GRID_COMPACT_FLOW_THRESHOLD = 3;

export const MY_FLOW_CALENDAR_FLOW_MARKER_COLORS = [
  '#1D4ED8',
  '#0F766E',
  '#A16207',
  '#BE185D',
  '#7C3AED',
  '#C2410C',
  '#0369A1',
  '#4D7C0F',
] as const;

export type MyFlowCalendarScheduleState = 'all_day' | 'timed' | 'unscheduled';

/**
 * Route-neutral input for Calendar presentation calculations. App surfaces
 * adapt their richer saved-Flow rows to this shape before calling the helpers.
 */
export type MyFlowCalendarViewRow = Readonly<{
  id: string;
  date?: string;
  flowSlug: string;
  flowTitle: string;
  flowMarkerKey?: string;
  isRoutine: boolean;
  occurrenceState?: 'pending' | 'done' | 'reopened' | 'skipped' | 'held';
  scheduleState?: MyFlowCalendarScheduleState;
  startTime?: string;
  durationMinutes?: number;
  personalOrderRank?: number;
  sourceOrder?: number;
}>;

export type MyFlowCalendarFlowDescriptor = Readonly<{
  flowSlug: string;
  title: string;
  markerKey?: string;
}>;

export type MyFlowCalendarFlowMarker = Readonly<{
  key: string;
  color: string;
  title: string;
  shortTitle: string;
  initial: string;
}>;

export type MyFlowCalendarFlowFilterOption = Readonly<{
  id: CalendarFlowScope;
  flowSlug: string;
  label: string;
  count: number;
  totalCount: number;
  marker: MyFlowCalendarFlowMarker;
}>;

export type MyFlowCalendarFlowGroup<Row extends MyFlowCalendarViewRow> = {
  key: string;
  title: string;
  shortTitle: string;
  color: string;
  rows: Row[];
};

export type MyFlowCalendarSelectedDateGroup<Row extends MyFlowCalendarViewRow> = {
  key: string;
  kind: 'routine' | 'schedule';
  title: string;
  marker: MyFlowCalendarFlowMarker;
  rows: Row[];
};

export type MyFlowCalendarRowPartition<Row extends MyFlowCalendarViewRow> = {
  heldRows: Row[];
  calendarRows: Row[];
  scheduleRows: Row[];
  routineRows: Row[];
};

export type MyFlowCalendarDateRange = Readonly<{
  start: string;
  end: string;
}>;

function calendarBaseDate(anchor: string, fallbackDate: Date): Date {
  return anchor ? new Date(anchor) : new Date(fallbackDate);
}

export function formatMyFlowCalendarLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getMyFlowCalendarMonthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function getMyFlowCalendarMonthEnd(date: string): string {
  const [year, month] = date.slice(0, 7).split('-').map(Number);
  return formatMyFlowCalendarLocalDate(new Date(year, month, 0));
}

export function getMyFlowCalendarMonthLabel(
  anchor: string,
  fallbackDate = new Date(),
): string {
  const base = calendarBaseDate(anchor, fallbackDate);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMyFlowCalendarMonthHeading(date: string): string {
  const [year, month] = date.split('-');
  return `${year}년 ${Number(month)}월`;
}

export function getMyFlowCalendarMonthCells(
  anchor: string,
  fallbackDate = new Date(),
): Array<Date | null> {
  const base = calendarBaseDate(anchor, fallbackDate);
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
  const dayCount = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let index = 0; index < monthStart.getDay(); index += 1) cells.push(null);
  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(new Date(base.getFullYear(), base.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function addMyFlowCalendarMonths(date: string, count: number): string {
  const current = new Date(`${getMyFlowCalendarMonthStart(date)}T00:00:00`);
  current.setMonth(current.getMonth() + count);
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getMyFlowCalendarVisibleRange(monthDate: string): MyFlowCalendarDateRange {
  return {
    start: getMyFlowCalendarMonthStart(monthDate),
    end: getMyFlowCalendarMonthEnd(monthDate),
  };
}

/** Preserves the existing -31/+7 execution horizon and its date serialization. */
export function getMyFlowCalendarExecutionRange(todayDate: string): MyFlowCalendarDateRange {
  const today = new Date(`${todayDate}T00:00:00`);
  return {
    start: formatDate(addDays(today, -31)),
    end: formatDate(addDays(today, 7)),
  };
}

function scheduleStateRank(row: MyFlowCalendarViewRow): number {
  return row.scheduleState === 'all_day' ? 0 : row.scheduleState === 'timed' ? 1 : 2;
}

/**
 * Matches the current Calendar row order: date, all-day/timed/other, time,
 * then personal order and ID only when both rows own a personal rank.
 */
export function sortMyFlowCalendarRows<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
): Row[] {
  return [...rows].sort((left, right) => {
    const dateOrder = (left.date ?? '').localeCompare(right.date ?? '');
    if (dateOrder !== 0) return dateOrder;
    const stateOrder = scheduleStateRank(left) - scheduleStateRank(right);
    if (stateOrder !== 0) return stateOrder;
    const timeOrder = (left.startTime ?? '').localeCompare(right.startTime ?? '');
    if (timeOrder !== 0) return timeOrder;
    if (left.personalOrderRank !== undefined && right.personalOrderRank !== undefined) {
      return left.personalOrderRank - right.personalOrderRank || left.id.localeCompare(right.id);
    }
    return 0;
  });
}

export function sortMyFlowCalendarUnscheduledRows<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
): Row[] {
  return [...rows].sort((left, right) => {
    const flowOrder = left.flowTitle.localeCompare(right.flowTitle, 'ko');
    if (flowOrder !== 0) return flowOrder;
    const leftOrder = left.personalOrderRank ?? left.sourceOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.personalOrderRank ?? right.sourceOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id.localeCompare(right.id);
  });
}

export function partitionMyFlowCalendarRows<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
): MyFlowCalendarRowPartition<Row> {
  const heldRows = rows.filter((row) => row.occurrenceState === 'held');
  const calendarRows = rows.filter((row) => row.occurrenceState !== 'held');
  return {
    heldRows,
    calendarRows,
    scheduleRows: calendarRows.filter((row) => !row.isRoutine),
    routineRows: calendarRows.filter((row) => row.isRoutine),
  };
}

/** A non-empty explicit Flow selection takes precedence over the single scope. */
export function filterMyFlowCalendarRows<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
  options: Readonly<{
    scope: CalendarFlowScope;
    selectedFlowSlugs?: readonly string[];
  }>,
): Row[] {
  const selectedFlowSlugs = [...(options.selectedFlowSlugs ?? [])];
  return rows.filter((row) => (
    selectedFlowSlugs.length > 0
      ? isCalendarFlowRowInSelection(row, selectedFlowSlugs)
      : isCalendarFlowRowInScope(row, options.scope)
  ));
}

export function filterMyFlowCalendarRowsForMonth<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
  monthDate: string,
): Row[] {
  const month = monthDate.slice(0, 7);
  return rows.filter((row) => row.date?.startsWith(month));
}

export function groupMyFlowCalendarRowsByDate<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
): Map<string, Row[]> {
  return rows.reduce<Map<string, Row[]>>((groups, row) => {
    if (!row.date) return groups;
    const dateRows = groups.get(row.date) ?? [];
    dateRows.push(row);
    groups.set(row.date, dateRows);
    return groups;
  }, new Map());
}

export function getMyFlowCalendarShortTitle(title: string): string {
  return title.length <= 8 ? title : `${title.slice(0, 7)}...`;
}

export function getStableMyFlowCalendarMarkerIndex(
  key: string,
  colorCount: number = MY_FLOW_CALENDAR_FLOW_MARKER_COLORS.length,
): number {
  if (!Number.isInteger(colorCount) || colorCount <= 0) {
    throw new RangeError('Calendar marker color count must be a positive integer.');
  }
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return hash % colorCount;
}

export function buildMyFlowCalendarFlowMarker(
  flow: MyFlowCalendarFlowDescriptor,
  colors: readonly string[] = MY_FLOW_CALENDAR_FLOW_MARKER_COLORS,
): MyFlowCalendarFlowMarker {
  const key = flow.markerKey || flow.flowSlug;
  const title = flow.title;
  const titleCharacters = Array.from(title.trim());
  return {
    key,
    color: colors[getStableMyFlowCalendarMarkerIndex(key, colors.length)]!,
    title,
    shortTitle: getMyFlowCalendarShortTitle(title),
    initial: titleCharacters[0] ?? 'F',
  };
}

function markerForRow(row: MyFlowCalendarViewRow): MyFlowCalendarFlowMarker {
  return buildMyFlowCalendarFlowMarker({
    flowSlug: row.flowSlug,
    title: row.flowTitle,
    ...(row.flowMarkerKey ? { markerKey: row.flowMarkerKey } : {}),
  });
}

export function buildMyFlowCalendarFlowFilterOptions<Row extends MyFlowCalendarViewRow>(
  flows: readonly MyFlowCalendarFlowDescriptor[],
  rows: readonly Row[],
  visibleMonth: string,
): MyFlowCalendarFlowFilterOption[] {
  const monthRows = filterMyFlowCalendarRowsForMonth(rows, visibleMonth);
  return flows
    .filter((flow) => rows.some((row) => row.flowSlug === flow.flowSlug))
    .map((flow) => {
      const marker = buildMyFlowCalendarFlowMarker(flow);
      return {
        id: getCalendarFlowScopeForFlow(flow.flowSlug),
        flowSlug: flow.flowSlug,
        label: marker.title,
        count: monthRows.filter((row) => row.flowSlug === flow.flowSlug).length,
        totalCount: rows.filter((row) => row.flowSlug === flow.flowSlug).length,
        marker,
      };
    })
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'ko'));
}

export function groupMyFlowCalendarScheduleRowsByFlowForDate<
  Row extends MyFlowCalendarViewRow,
>(rows: readonly Row[]): Map<string, MyFlowCalendarFlowGroup<Row>[]> {
  const dateIndex = new Map<string, Map<string, MyFlowCalendarFlowGroup<Row>>>();
  rows.forEach((row) => {
    if (!row.date) return;
    const marker = markerForRow(row);
    const flowGroups = dateIndex.get(row.date) ?? new Map<string, MyFlowCalendarFlowGroup<Row>>();
    const existing = flowGroups.get(marker.key);
    if (existing) {
      existing.rows.push(row);
    } else {
      flowGroups.set(marker.key, {
        key: marker.key,
        title: marker.title,
        shortTitle: marker.shortTitle,
        color: marker.color,
        rows: [row],
      });
    }
    dateIndex.set(row.date, flowGroups);
  });
  return new Map(
    Array.from(dateIndex.entries()).map(([date, groups]) => [date, Array.from(groups.values())]),
  );
}

export function buildMyFlowCalendarSelectedDateGroups<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
  selectedDate: string,
): MyFlowCalendarSelectedDateGroup<Row>[] {
  const buildGroups = (
    kindRows: readonly Row[],
    kind: MyFlowCalendarSelectedDateGroup<Row>['kind'],
  ): MyFlowCalendarSelectedDateGroup<Row>[] => {
    const groups = new Map<string, MyFlowCalendarSelectedDateGroup<Row>>();
    kindRows.forEach((row) => {
      const marker = markerForRow(row);
      const key = `${kind}-${marker.key}`;
      const existing = groups.get(key);
      if (existing) existing.rows.push(row);
      else groups.set(key, { key, kind, title: marker.title, marker, rows: [row] });
    });
    return Array.from(groups.values());
  };
  const selectedRows = rows.filter((row) => row.date === selectedDate);
  return [
    ...buildGroups(selectedRows.filter((row) => !row.isRoutine), 'schedule'),
    ...buildGroups(selectedRows.filter((row) => row.isRoutine), 'routine'),
  ];
}

export function findFirstMyFlowCalendarDateInMonth(
  rows: readonly Pick<MyFlowCalendarViewRow, 'date'>[],
  monthDate: string,
): string {
  const month = monthDate.slice(0, 7);
  return rows.find((row) => row.date?.startsWith(month))?.date
    ?? getMyFlowCalendarMonthStart(monthDate);
}

export function findMyFlowCalendarDefaultFocusDate(
  rows: readonly Pick<MyFlowCalendarViewRow, 'date'>[],
  todayDate: string,
  fallbackDate: string,
): string {
  const datedRows = Array.from(new Set(
    rows.map((row) => row.date).filter((date): date is string => Boolean(date)),
  )).sort();
  if (datedRows.length === 0) return getMyFlowCalendarMonthStart(fallbackDate);
  if (datedRows.includes(todayDate)) return todayDate;
  const nextDate = datedRows.find((date) => date >= todayDate);
  return nextDate ?? datedRows[datedRows.length - 1] ?? getMyFlowCalendarMonthStart(fallbackDate);
}

export function resolveMyFlowCalendarSelectedDate(
  rows: readonly Pick<MyFlowCalendarViewRow, 'date'>[],
  currentDate: string,
  visibleMonth: string,
): string {
  return rows.some((row) => row.date === currentDate)
    ? currentDate
    : findFirstMyFlowCalendarDateInMonth(rows, visibleMonth);
}

export function buildMyFlowCalendarDateSignature(
  rows: readonly Pick<
    MyFlowCalendarViewRow,
    'date' | 'scheduleState' | 'startTime' | 'durationMinutes'
  >[],
): string {
  return rows.map((row) => [
    row.date ?? '',
    row.scheduleState ?? '',
    row.startTime ?? '',
    row.durationMinutes ?? '',
  ].join(':')).join('|');
}
