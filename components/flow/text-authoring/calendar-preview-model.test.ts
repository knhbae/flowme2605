import assert from "node:assert/strict";
import test from "node:test";

import type { AuthoringArtifactRow } from "@/lib/flow/text-authoring/artifact-projection";

import {
  addAuthoringCalendarMonths,
  authoringCalendarMonthKey,
  buildAuthoringCalendarMonthCells,
  compareAuthoringCalendarRows,
  parseAuthoringCalendarDate,
  validAuthoringCalendarRows,
} from "./calendar-preview-model";

function row(
  rowId: string,
  date: string | undefined,
  itemId = rowId,
  time?: string,
  order = 0,
): AuthoringArtifactRow {
  return {
    rowId,
    itemId,
    title: rowId,
    ...(date ? { date } : {}),
    ...(time ? { time } : {}),
    subchecks: [],
    validations: [],
    order,
    resources: [],
    sources: [],
    links: [],
    experienceRow: {
      id: rowId,
      sourceItemId: itemId,
      stepId: "step-1",
      title: rowId,
      description: "",
      caution: "",
      schedule: { state: "scheduled", date },
      resources: [],
      eligibleShapes: ["calendar"],
      orderRank: 0,
    },
  } as unknown as AuthoringArtifactRow;
}

test("calendar preview accepts only real YYYY-MM-DD rows", () => {
  assert.deepEqual(parseAuthoringCalendarDate("2026-08-03"), {
    year: 2026,
    monthIndex: 7,
    day: 3,
  });
  assert.equal(parseAuthoringCalendarDate("2026-02-30"), undefined);
  assert.equal(parseAuthoringCalendarDate("8월 3일"), undefined);
  assert.deepEqual(
    validAuthoringCalendarRows([
      row("valid", "2026-08-03"),
      row("missing", undefined),
      row("invalid", "2026-02-30"),
    ]).map((entry) => entry.rowId),
    ["valid"],
  );
});

test("calendar month grid keeps occurrence rows on the same selected day", () => {
  const cells = buildAuthoringCalendarMonthCells(
    [
      row("occurrence-1", "2026-08-03", "routine-item"),
      row("occurrence-2", "2026-08-03", "routine-item"),
      row("other-month", "2026-09-01"),
      row("undated", undefined),
    ],
    { year: 2026, monthIndex: 7 },
  );
  assert.equal(cells.length, 42);
  const augustThird = cells.find(
    (cell) => cell.kind === "day" && cell.date === "2026-08-03",
  );
  assert.ok(augustThird && augustThird.kind === "day");
  assert.deepEqual(
    augustThird.rows.map((entry) => entry.rowId),
    ["occurrence-1", "occurrence-2"],
  );
  assert.deepEqual(
    augustThird.rows.map((entry) => entry.itemId),
    ["routine-item", "routine-item"],
  );
});

test("calendar preview orders all-day rows before same-day timed rows", () => {
  const rows = validAuthoringCalendarRows([
    row("late", "2026-08-03", "late", "16:30", 0),
    row("next-day", "2026-08-04", "next-day", "08:00", 1),
    row("all-day", "2026-08-03", "all-day", undefined, 2),
    row("early", "2026-08-03", "early", "09:00", 3),
  ]);

  assert.deepEqual(
    rows.map((entry) => entry.rowId),
    ["all-day", "early", "late", "next-day"],
  );
});

test("calendar display ties keep source order and occurrence identity stable", () => {
  const second = {
    ...row("occurrence-2", "2026-08-03", "routine", "09:00", 4),
    occurrenceIndex: 2,
  };
  const first = {
    ...row("occurrence-1", "2026-08-03", "routine", "09:00", 4),
    occurrenceIndex: 1,
  };
  const earlierSource = row(
    "source-first",
    "2026-08-03",
    "source-first",
    "09:00",
    2,
  );

  assert.ok(compareAuthoringCalendarRows(earlierSource, first) < 0);
  assert.deepEqual(
    validAuthoringCalendarRows([second, first, earlierSource]).map(
      (entry) => entry.rowId,
    ),
    ["source-first", "occurrence-1", "occurrence-2"],
  );
});

test("calendar month navigation crosses year boundaries deterministically", () => {
  assert.equal(
    authoringCalendarMonthKey(
      addAuthoringCalendarMonths({ year: 2026, monthIndex: 11 }, 1),
    ),
    "2027-01",
  );
  assert.equal(
    authoringCalendarMonthKey(
      addAuthoringCalendarMonths({ year: 2026, monthIndex: 0 }, -1),
    ),
    "2025-12",
  );
});
