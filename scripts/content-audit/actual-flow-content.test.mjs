import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const reviews = JSON.parse(
  fs.readFileSync("docs/content-audit/original-source-review/2026-05-31-original-source-review-queue.json", "utf8"),
);
const fitRows = reviews.filter((row) => row.realFlowDraft?.flowFit?.level === "fit");
const byId = new Map(reviews.map((row) => [row.id, row]));

test("every strict fit row has concrete app-ready Flow content", () => {
  assert.equal(fitRows.length > 0, true);
  for (const row of fitRows) {
    const content = row.realFlowDraft?.actualFlowContent;
    assert.ok(content, `${row.id} missing actualFlowContent`);
    assert.equal(content.status, "ready", `${row.id} should be app-ready`);
    assert.ok(content.userGoal?.length > 10, `${row.id} needs user goal`);
    assert.ok(content.anchor?.name, `${row.id} needs anchor`);
    assert.equal(content.inputs.length <= 5, true, `${row.id} should not exceed simple app input complexity`);
    assert.equal(content.calendarItems.length + content.checklistItems.length + content.routineItems.length >= 4, true, `${row.id} needs executable items`);
    assert.ok(content.completionDefinition?.length > 10, `${row.id} needs completion definition`);
    assert.equal(content.appFitCheck.result, "pass", `${row.id} should pass app fit check`);
  }
});

test("non-fit rows do not pretend to have app-ready Flow content", () => {
  for (const row of reviews.filter((item) => item.realFlowDraft?.flowFit?.level !== "fit")) {
    assert.notEqual(row.realFlowDraft?.actualFlowContent?.status, "ready", `${row.id} should not be app-ready`);
  }
});

test("representative fit rows contain concrete calendar/check/routine artifacts", () => {
  const cases = {
    "001": ["필터", "리셋", "다음 점검일"],
    "024": ["접수", "시험일", "자료"],
    "041": ["출국", "비상 연락처", "안전정보"],
    "081": ["자동이체", "유지", "해지"],
    "121": ["사고이력", "주행거리", "보류"],
    "181": ["전입신고", "신청", "완료"],
    "186": ["이사", "견적", "주소"],
  };

  for (const [id, terms] of Object.entries(cases)) {
    const text = JSON.stringify(byId.get(id).realFlowDraft.actualFlowContent);
    for (const term of terms) assert.match(text, new RegExp(term), `${id} should include ${term}`);
  }
});
