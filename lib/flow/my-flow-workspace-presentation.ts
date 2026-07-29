export function selectMyFlowNextActionRow<TRow extends { date?: string }>(
  rows: TRow[],
  isCompleted: (row: TRow) => boolean,
  resolveDate: (row: TRow) => string | undefined,
): TRow | undefined {
  return rows
    .map((row, sourceIndex) => ({
      row,
      sourceIndex,
      effectiveDate: resolveDate(row),
    }))
    .filter(({ row }) => !isCompleted(row))
    .sort((left, right) => {
      if (left.effectiveDate && right.effectiveDate) {
        const dateOrder = left.effectiveDate.localeCompare(right.effectiveDate);
        if (dateOrder !== 0) return dateOrder;
      } else if (left.effectiveDate) {
        return -1;
      } else if (right.effectiveDate) {
        return 1;
      }
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ row, effectiveDate }) => ({ ...row, date: effectiveDate }))
    [0];
}

export type MyFlowTemporalKind = 'past' | 'today' | 'future';

export type MyFlowTemporalResolvedRow<TRow> = TRow & { date?: string };

export type MyFlowTemporalGroup<TRow> = {
  kind: MyFlowTemporalKind;
  date: string;
  rows: Array<MyFlowTemporalResolvedRow<TRow>>;
};

export type MyFlowTemporalPresentation<TRow> = {
  hasDatedRows: boolean;
  pastRows: Array<MyFlowTemporalResolvedRow<TRow>>;
  todayRows: Array<MyFlowTemporalResolvedRow<TRow>>;
  futureRows: Array<MyFlowTemporalResolvedRow<TRow>>;
  undatedRows: Array<MyFlowTemporalResolvedRow<TRow>>;
  pastDateStart?: string;
  pastDateEnd?: string;
  nextGroup?: MyFlowTemporalGroup<TRow>;
};

function isPlainDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
  );
}

export function buildMyFlowTemporalPresentation<TRow>(input: {
  rows: TRow[];
  today: string;
  isCompleted: (row: TRow) => boolean;
  resolveDate: (row: TRow) => string | undefined;
}): MyFlowTemporalPresentation<TRow> {
  const normalized = input.rows.map((row, sourceIndex) => {
    const effectiveDate = input.resolveDate(row);
    return {
      row: {
        ...row,
        ...(isPlainDate(effectiveDate) ? { date: effectiveDate } : { date: undefined }),
      },
      sourceIndex,
      effectiveDate: isPlainDate(effectiveDate) ? effectiveDate : undefined,
      completed: input.isCompleted(row),
    };
  });
  const hasDatedRows = normalized.some(({ effectiveDate }) => Boolean(effectiveDate));
  const openRows = normalized.filter(({ completed }) => !completed);
  const sortByDateThenSource = (
    left: (typeof normalized)[number],
    right: (typeof normalized)[number],
  ) => (
    (left.effectiveDate ?? '').localeCompare(right.effectiveDate ?? '')
    || left.sourceIndex - right.sourceIndex
  );
  const past = openRows
    .filter(({ effectiveDate }) => Boolean(effectiveDate && effectiveDate < input.today))
    .sort(sortByDateThenSource);
  const today = openRows
    .filter(({ effectiveDate }) => effectiveDate === input.today)
    .sort((left, right) => left.sourceIndex - right.sourceIndex);
  const future = openRows
    .filter(({ effectiveDate }) => Boolean(effectiveDate && effectiveDate > input.today))
    .sort(sortByDateThenSource);
  const undated = openRows
    .filter(({ effectiveDate }) => !effectiveDate)
    .sort((left, right) => left.sourceIndex - right.sourceIndex);

  const toRows = (entries: typeof normalized) => entries.map(({ row }) => row);
  const buildGroup = (
    kind: MyFlowTemporalKind,
    entries: typeof normalized,
    date: string | undefined,
  ): MyFlowTemporalGroup<TRow> | undefined => {
    if (!date) return undefined;
    const rows = entries.filter((entry) => entry.effectiveDate === date);
    return rows.length > 0 ? { kind, date, rows: toRows(rows) } : undefined;
  };
  const nextGroup = today.length > 0
    ? buildGroup('today', today, input.today)
    : future.length > 0
      ? buildGroup('future', future, future[0]?.effectiveDate)
      : past.length > 0
        ? buildGroup('past', past, past[past.length - 1]?.effectiveDate)
        : undefined;

  return {
    hasDatedRows,
    pastRows: toRows(past),
    todayRows: toRows(today),
    futureRows: toRows(future),
    undatedRows: toRows(undated),
    ...(past[0]?.effectiveDate ? { pastDateStart: past[0].effectiveDate } : {}),
    ...(past[past.length - 1]?.effectiveDate
      ? { pastDateEnd: past[past.length - 1].effectiveDate }
      : {}),
    ...(nextGroup ? { nextGroup } : {}),
  };
}
