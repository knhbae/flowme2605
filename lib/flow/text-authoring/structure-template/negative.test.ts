import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type {
  StructureDraft,
  StructureTemplateDefinition,
} from "./types";
import {
  canMaterializeStructureDraft,
  validateStructureDraft,
} from "./validation";
import { planStructureTemplateMaterialization } from "./materialization";

type JsonPatchOperation = Readonly<{
  op: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
}>;

type PositiveFixture = Readonly<{
  fixtureId: string;
  initialRawText: string;
  sourceFingerprint: string;
  structureDraft: StructureDraft;
}>;

type NegativeCase = Readonly<{
  caseId: string;
  baseFixtureId: string;
  templateId: string;
  patch: readonly JsonPatchOperation[];
  expectedRuleCode: string;
  expectedScopeInstanceId: string;
  expectedSlotId?: string;
  expectedMaterialization: "blocked";
}>;

type NegativeMatrix = Readonly<{
  cases: readonly NegativeCase[];
}>;

type SnapshotCatalog = Readonly<{
  structureDraftContract: Readonly<{
    sharedValidationRules: readonly Readonly<{ code: string }>[];
  }>;
  templates: readonly StructureTemplateDefinition[];
}>;

const SNAPSHOT_ROOT = fileURLToPath(
  new URL("./snapshots/catalog-v1/", import.meta.url),
);

function readSnapshot<T>(relativePath: string): T {
  return JSON.parse(readFileSync(
    `${SNAPSHOT_ROOT}/${relativePath}`,
    "utf8",
  )) as T;
}

const catalog = readSnapshot<SnapshotCatalog>(
  "flow-structure-template-catalog-v1.json",
);
const positiveFixtures = [
  "exercise-phased.json",
  "exercise-weekly.json",
  "moving-dday.json",
  "wedding-dday.json",
  "travel-itinerary.json",
  "exam-dday-study.json",
].map((fileName) => readSnapshot<PositiveFixture>(`fixtures/${fileName}`));
const negativeMatrix = readSnapshot<NegativeMatrix>("fixtures/negative-cases.json");

function decodePointerToken(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function own(container: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(container, key);
}

function applyPatchOperation(
  document: unknown,
  operation: JsonPatchOperation,
): void {
  assert.ok(operation.path.startsWith("/"), "patch path must be absolute");
  const tokens = operation.path
    .slice(1)
    .split("/")
    .map(decodePointerToken);
  assert.ok(tokens.length > 0, "root replacement is outside the fixture subset");
  let parent = document as Record<string, unknown> | unknown[];
  for (const token of tokens.slice(0, -1)) {
    if (Array.isArray(parent)) {
      const index = Number(token);
      assert.ok(Number.isSafeInteger(index) && index >= 0 && index < parent.length);
      parent = parent[index] as Record<string, unknown> | unknown[];
    } else {
      assert.ok(own(parent, token), `missing patch parent: ${operation.path}`);
      parent = parent[token] as Record<string, unknown> | unknown[];
    }
    assert.ok(parent && typeof parent === "object", `invalid patch parent: ${operation.path}`);
  }

  const key = tokens.at(-1)!;
  if (Array.isArray(parent)) {
    const index = key === "-" ? parent.length : Number(key);
    assert.ok(Number.isSafeInteger(index) && index >= 0);
    if (operation.op === "add") {
      assert.ok(index <= parent.length);
      parent.splice(index, 0, structuredClone(operation.value));
    } else {
      assert.ok(index < parent.length, `missing patch target: ${operation.path}`);
      if (operation.op === "remove") parent.splice(index, 1);
      else parent[index] = structuredClone(operation.value);
    }
    return;
  }

  if (operation.op === "add") {
    parent[key] = structuredClone(operation.value);
    return;
  }
  assert.ok(own(parent, key), `missing patch target: ${operation.path}`);
  if (operation.op === "remove") delete parent[key];
  else parent[key] = structuredClone(operation.value);
}

function patchedFixture(
  fixture: PositiveFixture,
  operations: readonly JsonPatchOperation[],
): PositiveFixture {
  const clone = structuredClone(fixture) as PositiveFixture;
  operations.forEach((operation) => applyPatchOperation(clone, operation));
  return clone;
}

test("all 20 RFC 6902 negative patches apply and block materialization at the exact issue location", () => {
  const fixturesById = new Map(
    positiveFixtures.map((fixture) => [fixture.fixtureId, fixture]),
  );
  const definitionsById = new Map(
    catalog.templates.map((definition) => [definition.templateId, definition]),
  );
  let appliedCount = 0;
  let blockedCount = 0;

  negativeMatrix.cases.forEach((negativeCase) => {
    const base = fixturesById.get(negativeCase.baseFixtureId);
    const definition = definitionsById.get(negativeCase.templateId);
    assert.ok(base, `${negativeCase.caseId}: missing base fixture`);
    assert.ok(definition, `${negativeCase.caseId}: missing template definition`);
    const fixture = patchedFixture(base, negativeCase.patch);
    appliedCount += 1;
    const input = {
      definition,
      draft: fixture.structureDraft,
      currentSourceFingerprint: fixture.sourceFingerprint,
    } as const;
    const issues = validateStructureDraft(input);
    assert.equal(
      issues.length,
      1,
      `${negativeCase.caseId}: expected one issue; got ${issues.map((entry) => entry.code).join(", ")}`,
    );
    const matched = issues[0];
    assert.equal(matched.code, negativeCase.expectedRuleCode, negativeCase.caseId);
    assert.equal(matched.severity, "error", negativeCase.caseId);
    assert.equal(
      matched.scopeInstanceId,
      negativeCase.expectedScopeInstanceId,
      negativeCase.caseId,
    );
    assert.equal(matched.slotId, negativeCase.expectedSlotId, negativeCase.caseId);
    assert.equal(negativeCase.expectedMaterialization, "blocked");
    assert.equal(canMaterializeStructureDraft(input), false, negativeCase.caseId);
    const plannerResult = planStructureTemplateMaterialization({
      definition,
      draft: fixture.structureDraft,
      currentRawText: fixture.initialRawText,
    });
    assert.equal(plannerResult.status, "blocked", negativeCase.caseId);
    assert.equal("plan" in plannerResult, false, negativeCase.caseId);
    assert.equal("compiled" in plannerResult, false, negativeCase.caseId);
    if (plannerResult.status === "blocked") {
      assert.equal(plannerResult.issues.length, 1, negativeCase.caseId);
      const plannerIssue = plannerResult.issues[0];
      assert.equal(
        plannerIssue.code,
        negativeCase.expectedRuleCode,
        negativeCase.caseId,
      );
      assert.equal(plannerIssue.severity, "error", negativeCase.caseId);
      assert.equal(
        plannerIssue.scopeInstanceId,
        negativeCase.expectedScopeInstanceId,
        negativeCase.caseId,
      );
      assert.equal(
        plannerIssue.slotId,
        negativeCase.expectedSlotId,
        negativeCase.caseId,
      );
    }
    blockedCount += 1;
  });

  assert.equal(appliedCount, 20);
  assert.equal(blockedCount, 20);
});

test("negative matrix covers shared 2 plus template 17 fixed rule codes", () => {
  const declaredCodes = new Set([
    ...catalog.structureDraftContract.sharedValidationRules.map((rule) => rule.code),
    ...catalog.templates.flatMap((definition) => (
      definition.validationRules.map((rule) => rule.code)
    )),
  ]);
  const expectedCodes = new Set(
    negativeMatrix.cases.map((negativeCase) => negativeCase.expectedRuleCode),
  );
  assert.equal(
    catalog.structureDraftContract.sharedValidationRules.length,
    2,
  );
  assert.equal(
    catalog.templates.reduce(
      (count, definition) => count + definition.validationRules.length,
      0,
    ),
    17,
  );
  assert.equal(declaredCodes.size, 19);
  assert.deepEqual(expectedCodes, declaredCodes);
});

test("a timed travel draft rejects Mars/Olympus as a non-IANA timezone", () => {
  const fixture = positiveFixtures.find(
    (entry) => entry.fixtureId === "travel-prep-and-first-day",
  );
  const definition = catalog.templates.find(
    (entry) => entry.templateId === "travel-itinerary-prep-v1",
  );
  assert.ok(fixture);
  assert.ok(definition);
  const invalid: StructureDraft = {
    ...fixture.structureDraft,
    values: {
      ...fixture.structureDraft.values,
      timezone: "Mars/Olympus",
    },
  };
  const issues = validateStructureDraft({
    definition,
    draft: invalid,
    currentSourceFingerprint: fixture.sourceFingerprint,
  });
  assert.ok(issues.some((entry) => (
    entry.code === "TRAVEL_TIMEZONE"
    && entry.scopeInstanceId === "root"
    && entry.slotId === "timezone"
  )));
});
