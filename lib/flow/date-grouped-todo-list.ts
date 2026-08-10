export type DateGroupedTodoItemInput<Data = unknown> = {
  id: string;
  title: string;
  date?: string | null;
  completed?: boolean;
  /**
   * Canonical order inside the source plan. When every row in a date group
   * provides it, the group follows this order. Otherwise the input order wins.
   */
  sourceOrder?: number;
  meta?: readonly string[];
  data?: Data;
};

export type DateGroupedTodoRow<Data = unknown> = {
  id: string;
  title: string;
  date?: string;
  completed: boolean;
  sourceOrder?: number;
  sourceIndex: number;
  meta: readonly string[];
  metaLabel: string;
  data?: Data;
};

export type DateGroupedTodoGroup<Data = unknown> = {
  id: `date:${string}` | 'undated';
  date?: string;
  monthLabel: string;
  dayLabel: string;
  weekdayLabel?: string;
  relativeDateLabel?: string;
  countLabel: string;
  accessibleLabel: string;
  rows: readonly DateGroupedTodoRow<Data>[];
};

export type DateGroupedTodoListViewModel<Data = unknown> = {
  groups: readonly DateGroupedTodoGroup<Data>[];
  rowCount: number;
};

export type BuildDateGroupedTodoListInput<Data = unknown> = {
  items: readonly DateGroupedTodoItemInput<Data>[];
  /** Plain ISO calendar date used to derive D-30, D-Day, or D+1 labels. */
  anchorDate?: string | null;
  /** Explicit labels take precedence over an anchor-derived label. */
  relativeDateLabels?: Readonly<Record<string, string | undefined>>;
};

type PlainDate = {
  iso: string;
  year: number;
  month: number;
  day: number;
  epochDay: number;
};

const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1_000;

function parsePlainIsoDate(value: string | null | undefined): PlainDate | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return undefined;
  }

  return {
    iso: `${match[1]}-${match[2]}-${match[3]}`,
    year,
    month,
    day,
    epochDay: Math.floor(utc.getTime() / DAY_IN_MS),
  };
}

function formatRelativeDateLabel(date: PlainDate, anchor?: PlainDate): string | undefined {
  if (!anchor) return undefined;
  const difference = date.epochDay - anchor.epochDay;
  if (difference === 0) return 'D-Day';
  return difference > 0 ? `D+${difference}` : `D${difference}`;
}

function orderRows<Data>(
  rows: readonly DateGroupedTodoRow<Data>[],
): DateGroupedTodoRow<Data>[] {
  const allHaveSourceOrder = rows.every((row) => Number.isFinite(row.sourceOrder));
  return [...rows].sort((left, right) => {
    if (allHaveSourceOrder && left.sourceOrder !== right.sourceOrder) {
      return (left.sourceOrder as number) - (right.sourceOrder as number);
    }
    return left.sourceIndex - right.sourceIndex;
  });
}

/**
 * Builds the one-rail-per-date representation shared by public preview and
 * saved-plan execution. It never mutates or completes an item.
 */
export function buildDateGroupedTodoListViewModel<Data = unknown>(
  input: BuildDateGroupedTodoListInput<Data>,
): DateGroupedTodoListViewModel<Data> {
  const anchor = parsePlainIsoDate(input.anchorDate);
  const datedRows = new Map<string, DateGroupedTodoRow<Data>[]>();
  const undatedRows: DateGroupedTodoRow<Data>[] = [];

  input.items.forEach((item, sourceIndex) => {
    const date = parsePlainIsoDate(item.date);
    const meta = (item.meta ?? []).map((part) => part.trim()).filter(Boolean);
    const row: DateGroupedTodoRow<Data> = {
      id: item.id,
      title: item.title,
      ...(date ? { date: date.iso } : {}),
      completed: item.completed ?? false,
      ...(Number.isFinite(item.sourceOrder) ? { sourceOrder: item.sourceOrder } : {}),
      sourceIndex,
      meta,
      metaLabel: meta.join(' · '),
      ...(item.data === undefined ? {} : { data: item.data }),
    };

    if (!date) {
      undatedRows.push(row);
      return;
    }
    const rows = datedRows.get(date.iso);
    if (rows) rows.push(row);
    else datedRows.set(date.iso, [row]);
  });

  const groups: DateGroupedTodoGroup<Data>[] = Array.from(datedRows.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([iso, rows]) => {
      const date = parsePlainIsoDate(iso)!;
      const orderedRows = orderRows(rows);
      const weekday = KOREAN_WEEKDAYS[new Date(date.epochDay * DAY_IN_MS).getUTCDay()];
      const explicitRelativeLabel = input.relativeDateLabels?.[iso]?.trim();
      const relativeDateLabel = explicitRelativeLabel || formatRelativeDateLabel(date, anchor);
      const countLabel = `${orderedRows.length}개`;

      return {
        id: `date:${iso}` as const,
        date: iso,
        monthLabel: `${date.month}월`,
        dayLabel: String(date.day),
        weekdayLabel: weekday,
        ...(relativeDateLabel ? { relativeDateLabel } : {}),
        countLabel,
        accessibleLabel: [
          `${date.month}월 ${date.day}일`,
          `${weekday}요일`,
          relativeDateLabel,
          `할 일 ${countLabel}`,
        ].filter(Boolean).join(', '),
        rows: orderedRows,
      };
    });

  if (undatedRows.length > 0) {
    const orderedRows = orderRows(undatedRows);
    const countLabel = `${orderedRows.length}개`;
    groups.push({
      id: 'undated',
      monthLabel: '날짜',
      dayLabel: '미정',
      countLabel,
      accessibleLabel: `날짜 미정, 할 일 ${countLabel}`,
      rows: orderedRows,
    });
  }

  return { groups, rowCount: input.items.length };
}
