import assert from "node:assert/strict";
import test from "node:test";

import { validateLab } from "./validate-v1.mjs";
import { scheduleItems } from "./lib/pacing-engine-v1.mjs";
import {
  exportReviewState,
  importReviewState,
  makeInitialReviewState,
} from "./lib/review-state-v1.mjs";

test("full-corpus contract and invariants pass", () => {
  const result = validateLab();
  assert.equal(
    result.summary.failed,
    0,
    result.checks
      .filter((check) => !check.pass)
      .map((check) => `${check.id}: ${JSON.stringify(check.evidence)}`)
      .join("\n"),
  );
});

test("pacing is deterministic and assigns each Item exactly once", () => {
  const items = [
    { itemId: "i1", order: 0, dependsOnItemIds: [] },
    { itemId: "i2", order: 1, dependsOnItemIds: ["i1"] },
    { itemId: "i3", order: 2, dependsOnItemIds: ["i2"] },
  ];
  const policy = {
    mode: "items_per_day",
    startDate: "2026-08-03",
    itemsPerDay: 2,
    allowedWeekdays: [1, 2, 3, 4, 5],
    restDates: [],
    allDay: true,
    outputMode: "todo_due",
    bundleMode: "per_item",
  };
  const first = scheduleItems(items, policy);
  const second = scheduleItems(items, policy);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  assert.deepEqual(
    first.assignments.map((assignment) => assignment.itemId),
    ["i1", "i2", "i3"],
  );
  assert.equal(new Set(first.assignments.map((assignment) => assignment.itemId)).size, 3);
  assert.ok(
    first.assignments.every(
      (assignment) =>
        assignment.scheduleOwner === "user_overlay" &&
        assignment.derivation === "pacing_policy" &&
        assignment.suggestionStatus === "draft",
    ),
  );
});

test("review state round-trips without becoming agent or observed-user evidence", () => {
  const fingerprint = `sha256:${"a".repeat(64)}`;
  const initial = makeInitialReviewState(["content-1"], fingerprint);
  const updated = structuredClone(initial);
  updated.reviewsByContentId["content-1"] = {
    userReviewStatus: "reviewed",
    reviewer: "user",
    verdict: "Modify",
    answers: {},
    comment: "첫 행동은 좋지만 Item 둘을 합치고 싶다.",
    updatedAt: "2026-07-29T12:00:00+09:00",
  };
  const encoded = exportReviewState(updated);
  const imported = importReviewState(encoded, {
    corpusFingerprint: fingerprint,
    knownContentIds: ["content-1"],
    mode: "replace",
    currentState: initial,
  });
  assert.equal(imported.ok, true);
  assert.equal(imported.state.reviewsByContentId["content-1"].verdict, "Modify");
  assert.equal(imported.state.reviewsByContentId["content-1"].reviewer, "user");
});
