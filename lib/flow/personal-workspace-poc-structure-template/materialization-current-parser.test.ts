import assert from "node:assert/strict";
import test from "node:test";

import { parsePersonalWorkspacePocAuthoring } from "../personal-workspace-poc-authoring";
import {
  findStructureTemplateDefinition,
  loadBundledStructureTemplateCatalog,
} from "./catalog";
import {
  createStructureTemplateMaterializationCommand,
  fingerprintStructureTemplateRawText,
  planStructureTemplateMaterialization,
} from "./materialization";
import { stableAuthoringHash } from "./runtime-adapter";
import type {
  StructureDraft,
  StructureTemplateDerivedValue,
} from "./types";
import examFixtureJson from "./snapshots/catalog-v1/fixtures/exam-dday-study.json";
import phasedFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-phased.json";
import weeklyFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-weekly.json";
import movingFixtureJson from "./snapshots/catalog-v1/fixtures/moving-dday.json";
import travelFixtureJson from "./snapshots/catalog-v1/fixtures/travel-itinerary.json";
import weddingFixtureJson from "./snapshots/catalog-v1/fixtures/wedding-dday.json";

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
    stepCount: number;
    itemCount: number;
  }>;
}>;

const fixtures = [
  phasedFixtureJson,
  weeklyFixtureJson,
  movingFixtureJson,
  weddingFixtureJson,
  travelFixtureJson,
  examFixtureJson,
] as unknown as readonly PositiveFixture[];

const EXPECTED_FIXTURE_IDS = [
  "exercise-phased-two-windows",
  "exercise-weekly-bounded-count",
  "moving-dday-three-schedule-modes",
  "wedding-dday-contract-and-three-modes",
  "travel-prep-and-first-day",
  "exam-dday-bounded-study",
] as const;

test("rawText fingerprint is exact UTF-8 SHA-256 and separates legacy FNV collisions", () => {
  assert.equal(fingerprintStructureTemplateRawText(""), "raw-v1:0:0ztntfp");
  assert.equal(
    fingerprintStructureTemplateRawText("abc"),
    "raw-v2:3:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );

  const collisionLeft = "0vllb930w63uzm";
  const collisionRight = "0d9a1ro0rv0i25";
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

test("positive fixture gate contains exactly the six approved P0.2 scenarios", () => {
  assert.equal(fixtures.length, 6);
  assert.deepEqual(
    fixtures.map((fixture) => fixture.fixtureId),
    EXPECTED_FIXTURE_IDS,
  );
});

for (const fixture of fixtures) {
  test(`${fixture.fixtureId}: materializes exact bytes and matches the current PoC parser`, () => {
    const definition = findStructureTemplateDefinition(
      loadBundledStructureTemplateCatalog(),
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
    const replay = planStructureTemplateMaterialization({
      definition,
      draft: structuredClone(fixture.structureDraft),
      currentRawText: fixture.initialRawText,
      insertionPoint: 0,
    });
    assert.equal(first.status, "ready");
    assert.deepEqual(replay, first);
    if (first.status !== "ready") return;

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
    assert.equal(
      first.compiled.forbiddenGeneratedContentCount,
      fixture.expectedPlan.forbiddenGeneratedContentCount,
    );
    assert.equal(first.compiled.flowTitle, fixture.expectedCanonical.flowTitle);
    assert.equal(first.compiled.steps.length, fixture.expectedCanonical.stepCount);
    assert.equal(
      first.compiled.steps.flatMap((step) => step.items).length,
      fixture.expectedCanonical.itemCount,
    );

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
    assert.deepEqual(command.insertedRange, {
      start: 0,
      end: fixture.expectedRawText.length,
    });

    const parsed = parsePersonalWorkspacePocAuthoring(first.plan.nextRawText);
    assert.equal(parsed.rawText, fixture.expectedRawText);
    assert.equal(parsed.blockingIssues.length, 0);
    assert.equal(parsed.items.length, fixture.expectedCanonical.itemCount);
    assert.equal(
      parsed.items.length,
      first.compiled.steps.flatMap((step) => step.items).length,
    );
  });
}

test("source planning fails closed after current source bytes change", () => {
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
});
