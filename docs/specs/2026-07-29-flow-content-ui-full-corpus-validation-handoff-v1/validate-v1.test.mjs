import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  validateJsonSchemaSubset,
  validateLab,
} from "./validate-v1.mjs";
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

test("the checked-in JSON Schema is executed and rejects contract drift", () => {
  const schema = JSON.parse(
    fs.readFileSync(
      new URL("./content-ui-view-model-v1.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const valid = JSON.parse(
    fs.readFileSync(
      new URL("./content-ui-view-model-v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(validateJsonSchemaSubset(valid, schema), []);

  const wrongClaimBoundary = structuredClone(valid);
  wrongClaimBoundary.claimBoundary = "NOT_RUN";
  assert.ok(
    validateJsonSchemaSubset(wrongClaimBoundary, schema).some((error) =>
      error.includes("claimBoundary"),
    ),
  );

  const sourceInputLeak = structuredClone(valid);
  const target = sourceInputLeak.contents.find(
    (content) => content.minimumInputs.length > 0,
  );
  assert.ok(target);
  target.minimumInputs[0].source = "source";
  assert.ok(
    validateJsonSchemaSubset(sourceInputLeak, schema).some((error) =>
      error.includes("minimumInputs"),
    ),
  );
});

test("source-provided values are preserved without becoming user inputs", () => {
  const view = JSON.parse(
    fs.readFileSync(
      new URL("./content-ui-view-model-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const canonicalSourceFields = view.contents.flatMap((content) =>
    (content.canonical?.fields ?? [])
      .filter((field) => field.valueSource === "source")
      .map((field) => ({ content, field })),
  );
  assert.ok(canonicalSourceFields.length > 0);
  for (const { content, field } of canonicalSourceFields) {
    assert.equal(
      content.minimumInputs.some((input) => input.key === field.key),
      false,
      `${content.contentId}:${field.key} must not be requested again`,
    );
    const provided = content.sourceProvidedFields.find(
      (candidate) => candidate.key === field.key,
    );
    assert.ok(provided, `${content.contentId}:${field.key} must be preserved`);
    assert.deepEqual(provided.value, field.sourceDefault ?? null);
    assert.equal(provided.source, "source");
  }
});

test("direct links include review plus eligible pacing and event routes", () => {
  const view = JSON.parse(
    fs.readFileSync(
      new URL("./content-ui-view-model-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("./direct-link-manifest-v1.json", import.meta.url),
      "utf8",
    ),
  );
  for (const content of view.contents) {
    const links = manifest.links.filter(
      (link) => link.contentId === content.contentId,
    );
    const modes = new Set(links.map((link) => link.mode));
    assert.ok(modes.has("review"), `${content.contentId} review route`);
    assert.equal(
      modes.has("pacing"),
      content.pacingEligible,
      `${content.contentId} pacing route eligibility`,
    );
    assert.equal(
      modes.has("event"),
      content.contentMode === "event_source_before_user_intent",
      `${content.contentId} event route eligibility`,
    );
  }
});

test("partial-source records cannot remain Product candidates", () => {
  const view = JSON.parse(
    fs.readFileSync(
      new URL("./content-ui-view-model-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const partialProducts = view.contents.filter(
    (content) =>
      content.corpusTier === "product_candidate" &&
      content.readiness.sourceCompleteness !== "complete",
  );
  assert.deepEqual(partialProducts, []);
  for (const contentId of [
    "new:new-a02-seoul-museum-group",
    "new:new-b06-wtable-lemon-weekend",
  ]) {
    const content = view.contents.find((candidate) => candidate.contentId === contentId);
    assert.equal(content.corpusTier, "structure_probe");
    assert.equal(content.readiness.logicReadiness, "modify");
  }
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

test("event UI preserves the displayed intent and date-only lifecycle rows", () => {
  const galleryBuilder = fs.readFileSync(
    new URL("./build-gallery-v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    galleryBuilder,
    /document\.getElementById\("eventIntent"\)\?\.value/,
    "the preview action must use the intent currently displayed to the user",
  );
  assert.match(
    galleryBuilder,
    /w\.start\?\?w\.startDate/,
    "date-only application windows must keep their start date",
  );
  assert.match(
    galleryBuilder,
    /w\.end\?\?w\.endDate/,
    "date-only application windows must keep their end date",
  );
  assert.match(
    galleryBuilder,
    /projection blocked/,
    "a milestone without SourceRow provenance must be visibly blocked",
  );
});

test("manual semantic adjudication covers the frozen queue and retains open provenance gaps", () => {
  const audit = JSON.parse(
    fs.readFileSync(
      new URL("./semantic-provenance-audit-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const manual = JSON.parse(
    fs.readFileSync(
      new URL(
        "./semantic-provenance-manual-adjudication-v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const auditKeys = audit.manualReviewQueue.traceOnlySemantics
    .map(
      (record) =>
        `${record.contentId}|${record.itemId}|${record.field}`,
    )
    .sort();
  const manualKeys = manual.adjudications
    .map((record) => record.uniqueKey)
    .sort();
  assert.deepEqual(manualKeys, auditKeys);
  assert.equal(new Set(manualKeys).size, 141);
  assert.deepEqual(manual.summary.traceOnlyVerdictCounts, {
    verified_equivalent: 37,
    bounded_normalization: 87,
    needs_modify: 17,
    unknown: 0,
  });
  assert.deepEqual(manual.summary.ownerOrProvenanceGapCounts, {
    completion: 412,
    schedule: 124,
    total: 536,
  });
  assert.equal(
    manual.combinedClaimBoundary.zeroInventionClaim,
    "NOT_PROVEN",
  );
  assert.deepEqual(
    {
      status: manual.selfValidation.status,
      passed: manual.selfValidation.passed,
      total: manual.selfValidation.total,
    },
    { status: "PASS", passed: 13, total: 13 },
  );
});

test("manual semantic modifications are linked into review, gaps, and planning decisions", () => {
  const independent = JSON.parse(
    fs.readFileSync(
      new URL("./independent-ui-review-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const readjudication = JSON.parse(
    fs.readFileSync(
      new URL("./content-value-readjudication-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const planning = JSON.parse(
    fs.readFileSync(
      new URL("./planning-decision-handoff-v1.json", import.meta.url),
      "utf8",
    ),
  );
  const gaps = JSON.parse(
    fs.readFileSync(
      new URL("./content-and-logic-gap-register-v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    independent.manualSemanticAdjudication.needsModify,
    17,
  );
  assert.equal(
    independent.manualSemanticAdjudication.needsModifyContentCount,
    11,
  );
  const needsModifyContentIds =
    independent.manualSemanticAdjudication.needsModifyContentIds;
  const byId = new Map(
    readjudication.records.map((record) => [
      record.contentId,
      record.manualSemanticAdjudication,
    ]),
  );
  assert.ok(
    needsModifyContentIds.every(
      (contentId) => byId.get(contentId)?.status === "NEEDS_MODIFY",
    ),
  );
  const decisionIds = new Set(
    planning.decisions.map((decision) => decision.decisionId),
  );
  assert.ok(decisionIds.has("PD-15-semantic-source-preservation"));
  assert.ok(
    decisionIds.has("PD-16-completion-schedule-provenance"),
  );
  const gapIds = new Set(gaps.gaps.map((gap) => gap.gapId));
  assert.ok(gapIds.has("GAP-08-manual-semantic-needs-modify"));
  assert.ok(gapIds.has("GAP-09-completion-provenance"));
  assert.ok(gapIds.has("GAP-10-schedule-owner-derivation"));
});
