import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthoringArtifactProjection } from "../artifact-projection";
import { stableAuthoringHash } from "../identity";
import { createTextAuthoringDocument } from "../parser";
import {
  findStructureTemplateDefinition,
  loadBundledStructureTemplateCatalog,
} from "./catalog";
import { createStructureDraft } from "./draft";
import {
  createStructureTemplateMaterializationCommand,
  fingerprintStructureTemplateRawText,
  planStructureTemplateMaterialization,
} from "./materialization";
import type {
  CompiledStructureTemplateItem,
  StructureDraft,
  StructureTemplateDerivedValue,
} from "./types";
import examFixtureJson from "./snapshots/catalog-v1/fixtures/exam-dday-study.json";
import phasedFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-phased.json";
import weeklyFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-weekly.json";
import movingFixtureJson from "./snapshots/catalog-v1/fixtures/moving-dday.json";
import travelFixtureJson from "./snapshots/catalog-v1/fixtures/travel-itinerary.json";
import weddingFixtureJson from "./snapshots/catalog-v1/fixtures/wedding-dday.json";

type ExpectedItem = Readonly<{
  title: string;
  firstOccurrence?: string;
  recurrenceEnd?:
    | Readonly<{ mode: "until"; date: string }>
    | Readonly<{ mode: "count"; count: number }>;
  occurrenceCount?: number;
  dayOffset?: number;
  resolvedDate?: string;
  date?: string;
  schedule?: "unscheduled";
  subcheckCount?: number;
  time?: string;
  timezone?: string;
  place?: string;
}>;

type PositiveFixture = Readonly<{
  fixtureId: string;
  definitionRef: Readonly<{ templateId: string; version: string }>;
  initialRawText: string;
  sourceFingerprint: string;
  structureDraft: StructureDraft;
  expectedPlan: Readonly<{
    userValueCount: number;
    itemCount: number;
    sourceCallbackCount: number;
    undoCountToRestoreInitial: number;
    warnings: readonly unknown[];
    derivedValues: readonly StructureTemplateDerivedValue[];
    forbiddenGeneratedContentCount: number;
  }>;
  expectedRawText: string;
  expectedCanonical: Readonly<{
    flowTitle: string;
    anchorDate?: string;
    stepCount: number;
    itemCount: number;
    scheduledItemCount?: number;
    unscheduledItemCount?: number;
    resourceCount?: number;
    primarySourceFromReferenceUrl?: boolean;
    generatedCurriculumRows?: number;
    sameItemAcrossProjections?: boolean;
    dayViewDuplicates?: number;
    items: readonly ExpectedItem[];
  }>;
  expectedProjectionAssertions: Readonly<{
    fixtureExpectedPrimary: "calendar" | "todo";
    offeredArtifacts: readonly ("calendar" | "todo" | "sheet" | "memo")[];
    optionalWhenEligible: readonly ("calendar" | "todo" | "sheet" | "memo")[];
    notOffered: readonly ("calendar" | "todo" | "sheet" | "memo")[];
  }>;
}>;

const fixtures = [
  phasedFixtureJson,
  weeklyFixtureJson,
  movingFixtureJson,
  weddingFixtureJson,
  travelFixtureJson,
  examFixtureJson,
] as unknown as PositiveFixture[];

test("rawText fingerprint uses UTF-8 SHA-256 while preserving the pinned empty fingerprint", () => {
  assert.equal(
    fingerprintStructureTemplateRawText(""),
    "raw-v1:0:0ztntfp",
  );
  assert.equal(
    fingerprintStructureTemplateRawText("abc"),
    "raw-v2:3:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );

  const collisionLeft = "0vllb930w63uzm";
  const collisionRight = "0d9a1ro0rv0i25";
  assert.equal(collisionLeft.length, collisionRight.length);
  assert.equal(stableAuthoringHash(collisionLeft), "0t49sa5");
  assert.equal(stableAuthoringHash(collisionRight), "0t49sa5");
  assert.equal(
    fingerprintStructureTemplateRawText(collisionLeft),
    "raw-v2:14:ee545c8a1d3b4cfd3263ab8105046e7fbb4d26a74ca19a0a29d7f3f0069c3933",
  );
  assert.equal(
    fingerprintStructureTemplateRawText(collisionRight),
    "raw-v2:14:36105593962c31b6016c900f4015c906f091a86d1cdf1f425f7807411e481972",
  );
  assert.notEqual(
    fingerprintStructureTemplateRawText(collisionLeft),
    fingerprintStructureTemplateRawText(collisionRight),
  );
});

const EXPECTED_POSITIVE_FIXTURE_IDS = [
  "exercise-phased-two-windows",
  "exercise-weekly-bounded-count",
  "moving-dday-three-schedule-modes",
  "wedding-dday-contract-and-three-modes",
  "travel-prep-and-first-day",
  "exam-dday-bounded-study",
] as const;

test("the positive fixture gate is pinned to the exact six approved scenarios", () => {
  assert.equal(fixtures.length, 6);
  assert.deepEqual(
    fixtures.map((fixture) => fixture.fixtureId),
    EXPECTED_POSITIVE_FIXTURE_IDS,
  );
});

function compiledItems(
  steps: readonly Readonly<{ items: readonly CompiledStructureTemplateItem[] }>[],
): CompiledStructureTemplateItem[] {
  return steps.flatMap((step) => [...step.items]);
}

for (const fixture of fixtures) {
  test(`${fixture.fixtureId}: creates byte-identical source and remains parser-compatible`, () => {
    const catalog = loadBundledStructureTemplateCatalog();
    const definition = findStructureTemplateDefinition(
      catalog,
      fixture.definitionRef.templateId,
      fixture.definitionRef.version,
    );
    assert.ok(definition);
    assert.equal(
      fingerprintStructureTemplateRawText(fixture.initialRawText),
      fixture.sourceFingerprint,
    );

    const first = planStructureTemplateMaterialization({
      definition,
      draft: fixture.structureDraft,
      currentRawText: fixture.initialRawText,
      insertionPoint: 0,
    });
    const second = planStructureTemplateMaterialization({
      definition,
      draft: structuredClone(fixture.structureDraft),
      currentRawText: fixture.initialRawText,
      insertionPoint: 0,
    });
    assert.equal(first.status, "ready");
    assert.deepEqual(second, first);
    if (first.status !== "ready" || second.status !== "ready") return;

    assert.equal(first.plan.nextRawText, fixture.expectedRawText);
    assert.equal(first.plan.insertedText, fixture.expectedRawText);
    assert.equal(first.plan.nextRawText.endsWith("\n"), false);
    assert.equal(first.plan.userValueCount, fixture.expectedPlan.userValueCount);
    assert.equal(first.plan.itemCount, fixture.expectedPlan.itemCount);
    assert.equal(
      first.plan.sourceCallbackCount,
      fixture.expectedPlan.sourceCallbackCount,
    );
    assert.equal(
      first.plan.undoCountToRestoreInitial,
      fixture.expectedPlan.undoCountToRestoreInitial,
    );
    assert.deepEqual(first.plan.warnings, fixture.expectedPlan.warnings);
    assert.deepEqual(first.plan.derivedValues, fixture.expectedPlan.derivedValues);
    assert.equal(first.compiled.flowTitle, fixture.expectedCanonical.flowTitle);
    if (fixture.expectedCanonical.anchorDate !== undefined) {
      assert.equal(first.compiled.anchorDate, fixture.expectedCanonical.anchorDate);
    }
    assert.equal(first.compiled.steps.length, fixture.expectedCanonical.stepCount);
    assert.equal(
      first.compiled.generatedCurriculumRows,
      fixture.expectedCanonical.generatedCurriculumRows ?? 0,
    );
    assert.equal(
      first.compiled.forbiddenGeneratedContentCount,
      fixture.expectedPlan.forbiddenGeneratedContentCount,
    );

    const items = compiledItems(first.compiled.steps);
    assert.equal(items.length, fixture.expectedCanonical.itemCount);
    const scheduled = items.filter((item) => (
      item.schedule && item.schedule.mode !== "unscheduled"
    ));
    const unscheduled = items.filter((item) => item.schedule?.mode === "unscheduled");
    if (fixture.expectedCanonical.scheduledItemCount !== undefined) {
      assert.equal(scheduled.length, fixture.expectedCanonical.scheduledItemCount);
    }
    if (fixture.expectedCanonical.unscheduledItemCount !== undefined) {
      assert.equal(unscheduled.length, fixture.expectedCanonical.unscheduledItemCount);
    }
    if (fixture.expectedCanonical.resourceCount !== undefined) {
      assert.equal(
        items.filter((item) => Boolean(item.referenceUrl)).length,
        fixture.expectedCanonical.resourceCount,
      );
    }

    fixture.expectedCanonical.items.forEach((expected) => {
      const item = items.find((candidate) => candidate.title === expected.title);
      assert.ok(item, expected.title);
      if (expected.firstOccurrence !== undefined) {
        assert.equal(item.schedule?.mode, "recurring");
        if (item.schedule?.mode === "recurring") {
          assert.equal(item.schedule.date, expected.firstOccurrence);
          assert.deepEqual(item.schedule.recurrence.end, expected.recurrenceEnd);
          assert.equal(
            item.schedule.recurrence.occurrenceCount,
            expected.occurrenceCount,
          );
        }
      }
      if (expected.dayOffset !== undefined) {
        assert.equal(item.schedule?.mode, "relative");
        if (item.schedule?.mode === "relative") {
          assert.equal(item.schedule.dayOffset, expected.dayOffset);
          assert.equal(item.schedule.resolvedDate, expected.resolvedDate);
        }
      }
      if (expected.date !== undefined) {
        assert.equal(item.schedule?.mode, "absolute");
        if (item.schedule?.mode === "absolute") {
          assert.equal(item.schedule.date, expected.date);
        }
      }
      if (expected.schedule === "unscheduled") {
        assert.equal(item.schedule?.mode, "unscheduled");
      }
      if (expected.subcheckCount !== undefined) {
        assert.equal(item.subchecks.length, expected.subcheckCount);
      }
      if (expected.time !== undefined) assert.equal(item.time, expected.time);
      if (expected.timezone !== undefined) {
        assert.equal(item.timezone, expected.timezone);
      }
      if (expected.place !== undefined) assert.equal(item.place, expected.place);
    });

    const command = createStructureTemplateMaterializationCommand(
      fixture.structureDraft,
      first.plan,
    );
    assert.deepEqual(
      createStructureTemplateMaterializationCommand(
        fixture.structureDraft,
        first.plan,
      ),
      command,
    );
    assert.equal(command.insertedRange.start, 0);
    assert.equal(command.insertedRange.end, fixture.expectedRawText.length);

    const document = createTextAuthoringDocument(first.plan.nextRawText, {
      importAssist: false,
      now: "2026-08-29T12:00:00.000Z",
    });
    assert.equal(document.parseResult.issues.length, 0);
    assert.equal(
      document.parseResult.canonical.steps.length,
      fixture.expectedCanonical.stepCount,
    );
    assert.equal(
      document.parseResult.canonical.items.length,
      fixture.expectedCanonical.itemCount,
    );
    const projection = buildAuthoringArtifactProjection(document);
    assert.equal(
      projection.primaryArtifact,
      fixture.expectedProjectionAssertions.fixtureExpectedPrimary,
    );
    assert.deepEqual(
      definition.projectionPolicy.offeredArtifacts,
      fixture.expectedProjectionAssertions.offeredArtifacts,
    );
    assert.deepEqual(
      definition.projectionPolicy.optionalWhenEligible,
      fixture.expectedProjectionAssertions.optionalWhenEligible,
    );
    assert.deepEqual(
      definition.projectionPolicy.notOffered,
      fixture.expectedProjectionAssertions.notOffered,
    );
    const canonicalItemIds = new Set(
      document.parseResult.canonical.items.map((item) => item.itemId),
    );
    Object.values(projection.artifacts).forEach((artifact) => {
      artifact.rows.forEach((row) => assert.equal(canonicalItemIds.has(row.itemId), true));
      assert.equal(
        new Set(artifact.rows.map((row) => row.rowId)).size,
        artifact.rows.length,
        `${fixture.fixtureId}: duplicate ${artifact.artifact} row identity`,
      );
    });
    if (fixture.expectedCanonical.sameItemAcrossProjections) {
      const todoItemIds = new Set(
        projection.artifacts.todo.rows.map((row) => row.itemId),
      );
      const memoItemIds = new Set(
        projection.artifacts.memo.rows.map((row) => row.itemId),
      );
      canonicalItemIds.forEach((itemId) => {
        assert.equal(todoItemIds.has(itemId), true, `${itemId}: missing Todo identity`);
        assert.equal(memoItemIds.has(itemId), true, `${itemId}: missing Memo identity`);
      });
      const scheduledItemIds = document.parseResult.canonical.items
        .filter((item) => item.schedule !== undefined)
        .map((item) => item.itemId)
        .sort();
      const calendarItemIds = [
        ...new Set(projection.artifacts.calendar.rows.map((row) => row.itemId)),
      ].sort();
      assert.deepEqual(calendarItemIds, scheduledItemIds);
    }
    if (fixture.expectedCanonical.dayViewDuplicates !== undefined) {
      const dayKeys = projection.artifacts.calendar.rows.map(
        (row) => `${row.itemId}:${row.date ?? ""}`,
      );
      assert.equal(
        dayKeys.length - new Set(dayKeys).size,
        fixture.expectedCanonical.dayViewDuplicates,
      );
    }
    if (fixture.expectedCanonical.primarySourceFromReferenceUrl === false) {
      assert.equal(
        document.parseResult.canonical.items.every((item) => item.sources.length === 0),
        true,
      );
    }
  });
}

test("source planning is fail-closed after rawText changes and never returns a plan", () => {
  const fixture = fixtures[0];
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const result = planStructureTemplateMaterialization({
    definition,
    draft: fixture.structureDraft,
    currentRawText: "사용자가 먼저 쓴 일반 문장",
  });
  assert.equal(result.status, "blocked");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  assert.ok(result.issues.some((issue) => (
    issue.code === "SOURCE_FINGERPRINT_MISMATCH"
    && issue.scopeInstanceId === "root"
    && issue.slotId === "sourceFingerprint"
  )));
});

test("an empty seed row keeps its sidecar ID but adds zero source, Step, or Item output", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const firstWindow = fixture.structureDraft.groups[0];
  assert.ok(firstWindow);
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    groups: [{
      ...firstWindow,
      children: [
        ...firstWindow.children,
        {
          instanceId: "moving-empty-seed-row",
          groupId: "tasks",
          order: firstWindow.children.length,
          values: {},
          children: [],
        },
      ],
    }, ...fixture.structureDraft.groups.slice(1)],
  };
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
    insertionPoint: 0,
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.plan.nextRawText, fixture.expectedRawText);
  assert.equal(result.plan.itemCount, fixture.expectedCanonical.itemCount);
  assert.equal(result.compiled.steps.length, fixture.expectedCanonical.stepCount);
  assert.equal(result.plan.nextRawText.includes("moving-empty-seed-row"), false);
});

test("a user-entered Step title survives even when that group has no Item", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const titledWindow = fixture.structureDraft.groups[0];
  assert.ok(titledWindow);
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    groups: [{ ...titledWindow, children: [] }],
  };
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
    insertionPoint: 0,
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;

  assert.equal(result.compiled.steps.length, 1);
  assert.equal(result.compiled.steps[0]?.title, "계약과 정리");
  assert.equal(result.compiled.steps[0]?.items.length, 0);
  assert.equal(result.plan.itemCount, 0);
  assert.equal(result.plan.nextRawText.includes("## 계약과 정리"), true);
  const document = createTextAuthoringDocument(result.plan.nextRawText, {
    importAssist: false,
    now: "2026-08-29T12:00:00.000Z",
  });
  assert.equal(document.parseResult.issues.length, 0);
});

test("materialization preserves non-empty rawText bytes behind deterministic source boundaries", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const currentRawText = "# 기존 메모";
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    sourceFingerprint: fingerprintStructureTemplateRawText(currentRawText),
  };
  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText,
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;

  assert.equal(
    result.plan.nextRawText.slice(0, currentRawText.length),
    currentRawText,
  );
  assert.equal(result.plan.insertedText.startsWith("\n\n# "), true);
  assert.equal(
    result.plan.nextRawText,
    `${currentRawText}${result.plan.insertedText}`,
  );
  assert.deepEqual(result.plan.insertedRange, {
    start: currentRawText.length,
    end: result.plan.nextRawText.length,
  });

  const document = createTextAuthoringDocument(result.plan.nextRawText, {
    importAssist: false,
    now: "2026-08-29T12:00:00.000Z",
  });
  assert.equal(document.parseResult.issues.length, 0);
  assert.equal(
    document.parseResult.canonical.items.length,
    fixture.expectedCanonical.itemCount,
  );
});

test("materialization preserves a plain source memo without adding parser issues", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const currentRawText = "기존 메모";
  const parserOptions = {
    documentId: "structure-template-existing-source",
    importAssist: false,
    now: "2026-08-29T12:00:00.000Z",
  } as const;
  const beforeDocument = createTextAuthoringDocument(currentRawText, {
    ...parserOptions,
  });
  assert.equal(beforeDocument.parseResult.issues.length, 1);
  assert.equal(beforeDocument.parseResult.issues[0]?.type, "ambiguous_role");
  assert.equal(beforeDocument.parseResult.issues[0]?.blocking, false);

  const result = planStructureTemplateMaterialization({
    definition,
    draft: {
      ...fixture.structureDraft,
      sourceFingerprint: fingerprintStructureTemplateRawText(currentRawText),
    },
    currentRawText,
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(
    result.plan.nextRawText.slice(0, currentRawText.length),
    currentRawText,
  );
  assert.equal(result.plan.insertedText.startsWith("\n\n# "), true);

  const afterDocument = createTextAuthoringDocument(result.plan.nextRawText, {
    ...parserOptions,
  });
  const issueShape = (document: typeof beforeDocument) => (
    document.parseResult.issues.map((issue) => ({
      type: issue.type,
      sourceRange: issue.sourceRange,
      messageKey: issue.messageKey,
      options: issue.options,
      blocking: issue.blocking,
    }))
  );
  assert.deepEqual(issueShape(afterDocument), issueShape(beforeDocument));
  assert.equal(
    afterDocument.parseResult.issues[0]?.issueId,
    beforeDocument.parseResult.issues[0]?.issueId,
  );
  assert.deepEqual(
    afterDocument.parseResult.issues[0]?.sourceRowIds,
    beforeDocument.parseResult.issues[0]?.sourceRowIds,
  );
  assert.equal(
    afterDocument.parseResult.canonical.items.length,
    fixture.expectedCanonical.itemCount,
  );
});

test("titleless interim materialization keeps the user anchor and items parser-compatible", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const { flow_title: _omittedTitle, ...values } = fixture.structureDraft.values;
  const draft: StructureDraft = { ...fixture.structureDraft, values };
  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
    insertionPoint: 0,
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;

  assert.equal(result.plan.nextRawText.startsWith("# "), false);
  assert.equal(result.plan.nextRawText.startsWith("- 기준일: 2026-11-01"), true);
  assert.equal(result.plan.nextRawText.includes("- [ ] 이사업체 확정"), true);
  const document = createTextAuthoringDocument(result.plan.nextRawText, {
    importAssist: false,
    now: "2026-08-29T12:00:00.000Z",
  });
  assert.equal(document.parseResult.issues.length, 0);
  assert.equal(
    document.parseResult.canonical.items.length,
    fixture.expectedCanonical.itemCount,
  );
});

test("planner blocks a populated Item whose required title is missing instead of silently dropping it", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const firstWindow = fixture.structureDraft.groups[0];
  const firstTask = firstWindow?.children[0];
  assert.ok(firstWindow);
  assert.ok(firstTask);
  const { item_title: _omittedTitle, ...taskValues } = firstTask.values;
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    groups: [{
      ...firstWindow,
      children: [{ ...firstTask, values: taskValues }],
    }],
  };

  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
  });
  assert.equal(result.status, "not_ready");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  if (result.status !== "not_ready") return;
  assert.deepEqual(result.problems, [{
    kind: "missing_required_value",
    scopeInstanceId: firstTask.instanceId,
    slotId: "item_title",
    message: "할 일 is required before source materialization.",
  }]);
});

test("planner blocks an empty seed draft because placeholders are not user values", () => {
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    "moving-dday-v1",
    "1.0.0",
  );
  assert.ok(definition);
  const draft = createStructureDraft(definition, {
    draftId: "draft-empty-materialization",
    sourceFingerprint: fingerprintStructureTemplateRawText(""),
    updatedAt: "2026-08-29T12:00:00.000Z",
  });

  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: "",
  });
  assert.equal(result.status, "not_ready");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  if (result.status !== "not_ready") return;
  assert.deepEqual(result.problems, [{
    kind: "no_user_value",
    scopeInstanceId: "root",
    message: "원문을 만들려면 사용자가 입력한 값이 하나 이상 필요합니다.",
  }]);
});

test("planner blocks user input that has no source representation", () => {
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    "travel-itinerary-prep-v1",
    "1.0.0",
  );
  assert.ok(definition);
  const seed = createStructureDraft(definition, {
    draftId: "draft-generation-only",
    sourceFingerprint: fingerprintStructureTemplateRawText(""),
    updatedAt: "2026-08-29T12:00:00.000Z",
  });
  const draft: StructureDraft = {
    ...seed,
    values: { timezone: "UTC" },
  };

  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: "",
  });
  assert.equal(result.status, "not_ready");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  if (result.status !== "not_ready") return;
  assert.deepEqual(result.problems, [{
    kind: "unrepresented_user_value",
    scopeInstanceId: "root",
    slotId: "timezone",
    message: "이 값은 현재 하위 항목 없이 원문에 안전하게 보존할 수 없습니다.",
  }]);
});

test("planner returns structured readiness problems instead of throwing for a damaged sidecar", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "moving-dday-three-schedule-modes"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    values: {
      ...fixture.structureDraft.values,
      unknown_sidecar_slot: "보존하되 원문에는 쓰지 않음",
    },
  };

  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
  });
  assert.equal(result.status, "not_ready");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  if (result.status !== "not_ready") return;
  assert.deepEqual(result.problems, [{
    kind: "unknown_slot",
    scopeInstanceId: "root",
    slotId: "unknown_sidecar_slot",
    message: "Unknown slot unknown_sidecar_slot.",
  }]);
});

test("an Item-less phase cannot shift a later recurrence window", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "exercise-phased-two-windows"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const firstPhase = fixture.structureDraft.groups[0];
  const secondPhase = fixture.structureDraft.groups[1];
  assert.ok(firstPhase);
  assert.ok(secondPhase);
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    groups: [
      {
        ...firstPhase,
        values: {
          ...firstPhase.values,
          duration_weeks: 1,
        },
        children: [],
      },
      {
        ...secondPhase,
        values: {
          ...secondPhase.values,
          duration_weeks: 4,
        },
      },
    ],
  };

  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
  });
  assert.equal(result.status, "not_ready");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  if (result.status !== "not_ready") return;
  assert.deepEqual(result.problems, [
    {
      kind: "unrepresented_user_value",
      scopeInstanceId: firstPhase.instanceId,
      slotId: "phase_title",
      message: "이 값은 현재 하위 항목 없이 원문에 안전하게 보존할 수 없습니다.",
    },
    {
      kind: "unrepresented_user_value",
      scopeInstanceId: firstPhase.instanceId,
      slotId: "duration_weeks",
      message: "이 값은 현재 하위 항목 없이 원문에 안전하게 보존할 수 없습니다.",
    },
  ]);
});

test("an itinerary group date cannot disappear behind a childless Step", () => {
  const fixture = fixtures.find((entry) => (
    entry.fixtureId === "travel-prep-and-first-day"
  ));
  assert.ok(fixture);
  const definition = findStructureTemplateDefinition(
    loadBundledStructureTemplateCatalog(),
    fixture.definitionRef.templateId,
    fixture.definitionRef.version,
  );
  assert.ok(definition);
  const itineraryDay = fixture.structureDraft.groups.find((group) => (
    group.groupId === "itinerary_days"
  ));
  assert.ok(itineraryDay);
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    values: {
      ...fixture.structureDraft.values,
      timezone: "",
    },
    groups: fixture.structureDraft.groups.map((group) => (
      group.instanceId === itineraryDay.instanceId
        ? { ...group, children: [] }
        : group
    )),
  };

  const result = planStructureTemplateMaterialization({
    definition,
    draft,
    currentRawText: fixture.initialRawText,
  });
  assert.equal(result.status, "not_ready");
  assert.equal("plan" in result, false);
  assert.equal("compiled" in result, false);
  if (result.status !== "not_ready") return;
  assert.deepEqual(result.problems, [{
    kind: "unrepresented_user_value",
    scopeInstanceId: itineraryDay.instanceId,
    slotId: "itinerary_date",
    message: "이 값은 현재 하위 항목 없이 원문에 안전하게 보존할 수 없습니다.",
  }]);
});
