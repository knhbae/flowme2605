import assert from "node:assert/strict";
import test from "node:test";
import { applyAuthoringOperation } from "./operations";
import { createTextAuthoringDocument } from "./parser";
import { deriveAuthoringLifecycleStatus } from "./review-policy";
import { validateTextAuthoringDocument } from "./validation";

const RAW = ["# 이사 준비", "## D-30", "- [ ] 업체 확인"].join("\n");

function fresh() {
  return createTextAuthoringDocument(RAW, {
    now: "2026-07-29T00:00:00.000Z",
  });
}

test("validator reports a clean fully accounted canonical document", () => {
  const result = validateTextAuthoringDocument(fresh());

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.counts.sourceRows, 3);
  assert.equal(result.counts.mappedSourceRows, 3);
  assert.equal(result.counts.steps, 1);
  assert.equal(result.counts.items, 1);
});

test("validator accepts both exact source snapshots and legacy snapshots without raw text", () => {
  const document = fresh();
  assert.equal(document.sourceState?.active.rawText, document.rawText);
  assert.equal(validateTextAuthoringDocument(document).valid, true);

  const legacy = structuredClone(document);
  if (!legacy.sourceState) throw new Error("Expected active source snapshot");
  delete legacy.sourceState.active.rawText;
  assert.equal(validateTextAuthoringDocument(legacy).valid, true);
});

test("validator treats plain source memo as handled unless the author explicitly holds it", () => {
  const document = createTextAuthoringDocument(
    "제주 여행은 여름에 사람이 많습니다.",
    { now: "2026-07-29T00:00:00.000Z" },
  );
  const issue = document.parseResult.issues[0];
  assert.ok(issue);

  assert.equal(validateTextAuthoringDocument(document).counts.unresolved, 0);
  assert.equal(deriveAuthoringLifecycleStatus(document, "draft"), "draft");

  issue.decision = {
    outcome: "hold",
    state: "held",
    targetKind: "unresolved",
    actorLane: "creator",
    decidedAt: "2026-07-29T00:01:00.000Z",
  };
  assert.equal(validateTextAuthoringDocument(document).counts.unresolved, 1);

  issue.decision = {
    outcome: "keep_source_only",
    state: "resolved",
    targetKind: "source",
    actorLane: "creator",
    decidedAt: "2026-07-29T00:02:00.000Z",
  };
  assert.equal(validateTextAuthoringDocument(document).counts.unresolved, 0);
});

test("validator checks classified Item mapping and source-reference lineage", () => {
  const initial = createTextAuthoringDocument(
    "제주 여행은 여름에 사람이 많습니다.",
    { now: "2026-07-29T00:00:00.000Z" },
  );
  const issueId = initial.parseResult.issues[0].issueId;
  const converted = applyAuthoringOperation(initial, {
    type: "classify_issue",
    issueId,
    outcome: "convert_to_item",
  });
  assert.equal(validateTextAuthoringDocument(converted).valid, true);

  const missingReference = structuredClone(converted);
  missingReference.parseResult.canonical.sourceRefs = [];
  assert.ok(
    validateTextAuthoringDocument(missingReference).issues.some(
      (issue) =>
        issue.code === "missing_lineage" && issue.path.endsWith(".decision"),
    ),
  );

  const staleMapping = structuredClone(converted);
  staleMapping.parseResult.mappings[0].targetKind = "unresolved";
  staleMapping.parseResult.mappings[0].targetDraftId = issueId;
  assert.ok(
    validateTextAuthoringDocument(staleMapping).issues.some(
      (issue) =>
        issue.code === "missing_lineage" && issue.path.endsWith(".decision"),
    ),
  );

  const missingTarget = structuredClone(converted);
  const decision = missingTarget.parseResult.issues[0].decision;
  assert.ok(decision?.outcome === "convert_to_item");
  decision.targetDraftId = "missing-item";
  assert.ok(
    validateTextAuthoringDocument(missingTarget).issues.some(
      (issue) =>
        issue.code === "broken_reference" &&
        issue.path.endsWith(".decision.targetDraftId"),
    ),
  );
});

test("validator catches duplicate IDs and broken references", () => {
  const document = fresh();
  document.parseResult.canonical.items[0].itemId =
    document.parseResult.canonical.steps[0].stepId;
  document.parseResult.canonical.items[0].stepId = "missing-step";
  const result = validateTextAuthoringDocument(document);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_id"));
  assert.ok(result.issues.some((issue) => issue.code === "broken_reference"));
});

test("validator catches unaccounted source rows and range tampering", () => {
  const document = fresh();
  const itemRowId = document.parseResult.canonical.items[0].sourceRowIds[0];
  document.parseResult.mappings = document.parseResult.mappings.filter(
    (mapping) => !mapping.sourceLineage.includes(itemRowId),
  );
  const sourceRow = document.parseResult.canonical.sourceRows.find(
    (row) => row.sourceRowId === itemRowId,
  );
  assert.ok(sourceRow);
  sourceRow.rawText = "변조된 원문";
  const result = validateTextAuthoringDocument(document);

  assert.ok(
    result.issues.some((issue) => issue.code === "unaccounted_source_row"),
  );
  assert.ok(result.issues.some((issue) => issue.code === "missing_lineage"));
});

test("validator rejects schedules without explicit source or creator evidence", () => {
  const document = fresh();
  document.parseResult.canonical.items[0].schedule = {
    kind: "absolute",
    raw: "2026-08-03",
    date: "2026-08-03",
  };
  const result = validateTextAuthoringDocument(document);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "invented_schedule"));
});

test("validator enforces at most two secondary artifacts", () => {
  const document = fresh();
  document.parseResult.canonical.flow.secondaryArtifacts = [
    "todo",
    "sheet",
    "memo",
  ];
  const result = validateTextAuthoringDocument(document);

  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "too_many_secondary_artifacts",
    ),
  );
});
