import assert from "node:assert/strict";
import test from "node:test";
import {
  addStructureTemplateDays,
  formatStructureTemplateDayOffset,
  formatStructureTemplateWeekdays,
  isValidStructureTemplateTimezone,
  structureTemplateOccurrenceDatesUntil,
} from "./date";

test("relative offsets and weekdays serialize deterministically", () => {
  assert.equal(formatStructureTemplateDayOffset(-1), "D-1");
  assert.equal(formatStructureTemplateDayOffset(0), "D-Day");
  assert.equal(formatStructureTemplateDayOffset(1), "D+1");
  assert.equal(
    formatStructureTemplateWeekdays(["SU", "MO", "FR", "MO"]),
    "매주 월, 금, 일",
  );
});

test("date-only calculations are UTC-stable and recurrence bounds are inclusive", () => {
  assert.equal(addStructureTemplateDays("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(
    structureTemplateOccurrenceDatesUntil(
      "2026-09-01",
      ["TH", "TU", "TH"],
      "2026-09-14",
    ),
    ["2026-09-01", "2026-09-03", "2026-09-08", "2026-09-10"],
  );
});

test("timezone validation accepts explicit IANA zones and rejects Mars/Olympus", () => {
  assert.equal(isValidStructureTemplateTimezone("Asia/Seoul"), true);
  assert.equal(isValidStructureTemplateTimezone("UTC"), true);
  assert.equal(isValidStructureTemplateTimezone("Mars/Olympus"), false);
  assert.equal(isValidStructureTemplateTimezone(""), false);
});
