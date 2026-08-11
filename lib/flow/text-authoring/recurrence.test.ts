import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAuthoringRecurrenceRule,
  projectAuthoringRecurrenceDates,
  resolveAuthoringScheduleDate,
} from "./recurrence";

function validRule(raw: string, repeatEnd?: string) {
  const result = parseAuthoringRecurrenceRule({ raw, repeatEnd });
  if (!result.ok) throw new Error(result.reason);
  assert.equal(result.ok, true);
  return result.rule;
}

test("supported Korean recurrence grammar becomes a deterministic structured rule", () => {
  assert.deepEqual(validRule("매일"), {
    raw: "매일",
    frequency: "daily",
    interval: 1,
    sourceRowIds: [],
  });
  assert.deepEqual(validRule("2일마다", "12회"), {
    raw: "2일마다",
    frequency: "daily",
    interval: 2,
    end: { mode: "count", count: 12, raw: "12회" },
    sourceRowIds: [],
  });
  assert.deepEqual(validRule("2주마다 화, 목"), {
    raw: "2주마다 화, 목",
    frequency: "weekly",
    interval: 2,
    weekdays: ["TU", "TH"],
    sourceRowIds: [],
  });
  assert.deepEqual(validRule("3개월마다 10일", "2027-12-31"), {
    raw: "3개월마다 10일",
    frequency: "monthly",
    interval: 3,
    dayOfMonth: 10,
    end: { mode: "until", date: "2027-12-31", raw: "2027-12-31" },
    sourceRowIds: [],
  });
});

test("ambiguous cadence and malformed end stay invalid instead of being guessed", () => {
  assert.deepEqual(parseAuthoringRecurrenceRule({ raw: "주 3회" }), {
    ok: false,
    reason: "unsupported_rule",
  });
  assert.deepEqual(
    parseAuthoringRecurrenceRule({ raw: "매일", repeatEnd: "언젠가" }),
    { ok: false, reason: "invalid_end" },
  );
});

test("finite count includes the start date and supports stable non-overlapping pages", () => {
  const rule = validRule("2일마다", "12회");
  const first = projectAuthoringRecurrenceDates({
    itemId: "item-1",
    startDate: "2026-08-03",
    rule,
    limit: 5,
  });
  const second = projectAuthoringRecurrenceDates({
    itemId: "item-1",
    startDate: "2026-08-03",
    rule,
    offset: 5,
    limit: 5,
  });
  const grown = projectAuthoringRecurrenceDates({
    itemId: "item-1",
    startDate: "2026-08-03",
    rule,
    limit: 10,
  });

  assert.equal(first.totalCount, 12);
  assert.equal(first.hasMore, true);
  assert.deepEqual(
    first.occurrences.map((occurrence) => occurrence.date),
    ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-09", "2026-08-11"],
  );
  assert.deepEqual(
    second.occurrences.map((occurrence) => occurrence.date),
    ["2026-08-13", "2026-08-15", "2026-08-17", "2026-08-19", "2026-08-21"],
  );
  assert.deepEqual(
    grown.occurrences.slice(0, 5).map((occurrence) => occurrence.occurrenceId),
    first.occurrences.map((occurrence) => occurrence.occurrenceId),
  );
});

test("a 31-occurrence series exposes thirty rows first and one final row next", () => {
  const rule = validRule("매일", "31회");
  const first = projectAuthoringRecurrenceDates({
    itemId: "thirty-one",
    startDate: "2026-08-01",
    rule,
  });
  const last = projectAuthoringRecurrenceDates({
    itemId: "thirty-one",
    startDate: "2026-08-01",
    rule,
    offset: 30,
  });

  assert.equal(first.occurrences.length, 30);
  assert.equal(first.hasMore, true);
  assert.deepEqual(
    last.occurrences.map((occurrence) => occurrence.date),
    ["2026-08-31"],
  );
  assert.equal(last.hasMore, false);
});

test("display-only execution conditions never change occurrence dates or IDs", () => {
  const firstRule = parseAuthoringRecurrenceRule({
    raw: "매일",
    repeatEnd: "3회",
    executionCondition: "비가 오지 않는 경우",
  });
  const secondRule = parseAuthoringRecurrenceRule({
    raw: "매일",
    repeatEnd: "3회",
    executionCondition: "외출하는 경우",
  });
  assert.equal(firstRule.ok, true);
  assert.equal(secondRule.ok, true);
  if (!firstRule.ok || !secondRule.ok) return;

  const first = projectAuthoringRecurrenceDates({
    itemId: "condition-display-only",
    startDate: "2026-08-01",
    rule: firstRule.rule,
  });
  const second = projectAuthoringRecurrenceDates({
    itemId: "condition-display-only",
    startDate: "2026-08-01",
    rule: secondRule.rule,
  });
  assert.deepEqual(first.occurrences, second.occurrences);
});

test("open-ended weekly projection uses caller-provided four-week windows without overlap", () => {
  const rule = validRule("매주 월요일");
  const first = projectAuthoringRecurrenceDates({
    itemId: "weekly-item",
    startDate: "2026-08-03",
    rule,
    openEndedWeeks: 4,
  });
  const next = projectAuthoringRecurrenceDates({
    itemId: "weekly-item",
    startDate: "2026-08-03",
    rule,
    openEndedWeeks: 4,
    openEndedOffsetWeeks: 4,
  });

  assert.deepEqual(first.window, {
    start: "2026-08-03",
    end: "2026-08-30",
  });
  assert.deepEqual(
    first.occurrences.map((occurrence) => occurrence.date),
    ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"],
  );
  assert.deepEqual(
    next.occurrences.map((occurrence) => occurrence.date),
    ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21"],
  );
  assert.equal(first.hasMore, true);
  assert.equal(next.hasMore, true);
});

test("monthly rules skip months without the requested date and include the end date", () => {
  const projection = projectAuthoringRecurrenceDates({
    itemId: "month-end",
    startDate: "2026-01-31",
    rule: validRule("매월 31일", "2026-05-31"),
  });

  assert.deepEqual(
    projection.occurrences.map((occurrence) => occurrence.date),
    ["2026-01-31", "2026-03-31", "2026-05-31"],
  );
  assert.equal(projection.totalCount, 3);
  assert.equal(projection.hasMore, false);
});

test("relative recurrence start resolves only from an explicit ISO anchor", () => {
  assert.equal(
    resolveAuthoringScheduleDate({
      kind: "relative",
      raw: "D-3",
      dayOffset: -3,
      anchorLabel: "2026-08-10",
    }),
    "2026-08-07",
  );
  assert.equal(
    resolveAuthoringScheduleDate({
      kind: "relative",
      raw: "D-3",
      dayOffset: -3,
      anchorLabel: "행사일",
    }),
    undefined,
  );
});
