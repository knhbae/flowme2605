import type { AuthoringArtifactRow } from "@/lib/flow/text-authoring/artifact-projection";

export type AuthoringCalendarMonth = {
  year: number;
  monthIndex: number;
};

export type AuthoringCalendarDayCell =
  | {
      kind: "empty";
      cellId: string;
    }
  | {
      kind: "day";
      cellId: string;
      date: string;
      day: number;
      rows: AuthoringArtifactRow[];
    };

export function parseAuthoringCalendarDate(
  value: string | undefined,
): { year: number; monthIndex: number; day: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value ?? "");
  if (!match) return undefined;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== monthIndex ||
    candidate.getUTCDate() !== day
  ) {
    return undefined;
  }
  return { year, monthIndex, day };
}

export function authoringCalendarMonthFromDate(
  value: string | undefined,
): AuthoringCalendarMonth | undefined {
  const parsed = parseAuthoringCalendarDate(value);
  return parsed
    ? { year: parsed.year, monthIndex: parsed.monthIndex }
    : undefined;
}

export function authoringCalendarMonthKey(
  month: AuthoringCalendarMonth,
): string {
  return `${String(month.year).padStart(4, "0")}-${String(
    month.monthIndex + 1,
  ).padStart(2, "0")}`;
}

export function addAuthoringCalendarMonths(
  month: AuthoringCalendarMonth,
  offset: number,
): AuthoringCalendarMonth {
  const normalized = new Date(
    Date.UTC(month.year, month.monthIndex + offset, 1),
  );
  return {
    year: normalized.getUTCFullYear(),
    monthIndex: normalized.getUTCMonth(),
  };
}

export function validAuthoringCalendarRows(
  rows: AuthoringArtifactRow[],
): AuthoringArtifactRow[] {
  return rows
    .filter((row) => Boolean(parseAuthoringCalendarDate(row.date)))
    .sort(compareAuthoringCalendarRows);
}

/**
 * Calendar is a display projection. This comparator must never be reused to
 * rewrite the authored source. The final occurrence/row keys only make an
 * otherwise equal display order deterministic.
 */
export function compareAuthoringCalendarRows(
  left: AuthoringArtifactRow,
  right: AuthoringArtifactRow,
): number {
  const leftTime = left.time?.trim() ?? "";
  const rightTime = right.time?.trim() ?? "";
  return (
    (left.date ?? "").localeCompare(right.date ?? "") ||
    Number(Boolean(leftTime)) - Number(Boolean(rightTime)) ||
    leftTime.localeCompare(rightTime) ||
    left.order - right.order ||
    (left.occurrenceIndex ?? 0) - (right.occurrenceIndex ?? 0) ||
    left.rowId.localeCompare(right.rowId)
  );
}

export function buildAuthoringCalendarMonthCells(
  rows: AuthoringArtifactRow[],
  month: AuthoringCalendarMonth,
): AuthoringCalendarDayCell[] {
  const monthKey = authoringCalendarMonthKey(month);
  const rowsByDate = new Map<string, AuthoringArtifactRow[]>();
  for (const row of validAuthoringCalendarRows(rows)) {
    if (!row.date?.startsWith(`${monthKey}-`)) continue;
    const current = rowsByDate.get(row.date) ?? [];
    current.push(row);
    rowsByDate.set(row.date, current);
  }

  const leadingCellCount = new Date(
    Date.UTC(month.year, month.monthIndex, 1),
  ).getUTCDay();
  const dayCount = new Date(
    Date.UTC(month.year, month.monthIndex + 1, 0),
  ).getUTCDate();
  const cells: AuthoringCalendarDayCell[] = Array.from(
    { length: leadingCellCount },
    (_, index) => ({
      kind: "empty",
      cellId: `${monthKey}-leading-${index + 1}`,
    }),
  );

  for (let day = 1; day <= dayCount; day += 1) {
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    cells.push({
      kind: "day",
      cellId: date,
      date,
      day,
      rows: rowsByDate.get(date) ?? [],
    });
  }

  const trailingCellCount = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingCellCount; index += 1) {
    cells.push({
      kind: "empty",
      cellId: `${monthKey}-trailing-${index + 1}`,
    });
  }
  return cells;
}
