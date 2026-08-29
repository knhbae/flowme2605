import assert from "node:assert/strict";
import test from "node:test";
import {
  findStructureTemplateDefinition,
  loadBundledStructureTemplateCatalog,
} from "./catalog";
import {
  assertStructureDraftContract,
  StructureDraftContractError,
  validateStructureDraftContract,
} from "./draft-validation";
import { canMaterializeStructureDraft } from "./validation";
import type { StructureDraft } from "./types";
import movingFixtureJson from "./snapshots/catalog-v1/fixtures/moving-dday.json";
import weeklyFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-weekly.json";

const fixture = movingFixtureJson as unknown as Readonly<{
  structureDraft: StructureDraft;
}>;
const definition = findStructureTemplateDefinition(
  loadBundledStructureTemplateCatalog(),
  "moving-dday-v1",
  "1.0.0",
)!;
const weeklyFixture = weeklyFixtureJson as unknown as Readonly<{
  structureDraft: StructureDraft;
}>;
const weeklyDefinition = findStructureTemplateDefinition(
  loadBundledStructureTemplateCatalog(),
  "exercise-weekly-repeat-v1",
  "1.0.0",
)!;

test("all snapshot field values and recursive groups conform to their pinned definitions", () => {
  assert.deepEqual(
    validateStructureDraftContract(definition, fixture.structureDraft),
    [],
  );
  assert.doesNotThrow(() => assertStructureDraftContract(
    definition,
    fixture.structureDraft,
  ));
});

test("field type mismatch fails closed at the exact repeated slot", () => {
  const firstWindow = fixture.structureDraft.groups[0];
  const firstTask = firstWindow.children[0];
  const draft: StructureDraft = {
    ...fixture.structureDraft,
    groups: [{
      ...firstWindow,
      children: [{
        ...firstTask,
        values: { ...firstTask.values, day_offset: "D-30" },
      }, ...firstWindow.children.slice(1)],
    }, ...fixture.structureDraft.groups.slice(1)],
  };
  assert.throws(
    () => assertStructureDraftContract(definition, draft),
    (error: unknown) => {
      assert.ok(error instanceof StructureDraftContractError);
      assert.deepEqual(error.problems, [{
        kind: "invalid_field_value",
        scopeInstanceId: firstTask.instanceId,
        slotId: "day_offset",
        message: "Value does not match relative_day_offset.",
      }]);
      return true;
    },
  );
});

test("invalid group order and nesting are rejected before compilation", () => {
  const firstWindow = fixture.structureDraft.groups[0];
  const malformed: StructureDraft = {
    ...fixture.structureDraft,
    groups: [{
      ...firstWindow,
      order: 2,
      children: [{
        ...firstWindow.children[0],
        groupId: "windows",
      }, ...firstWindow.children.slice(1)],
    }, ...fixture.structureDraft.groups.slice(1)],
  };
  const problems = validateStructureDraftContract(definition, malformed);
  assert.ok(problems.some((entry) => entry.kind === "invalid_group_order"));
  assert.ok(problems.some((entry) => entry.kind === "unknown_group"));
});

test("active recurring input requires its source-producing schedule fields", () => {
  const group = weeklyFixture.structureDraft.groups[0];
  const session = group.children[0];
  const missing: StructureDraft = {
    ...weeklyFixture.structureDraft,
    values: {
      ...weeklyFixture.structureDraft.values,
      start_date: "",
    },
    groups: [{
      ...group,
      children: [{
        ...session,
        values: { ...session.values, weekdays: [] },
      }, ...group.children.slice(1)],
    }, ...weeklyFixture.structureDraft.groups.slice(1)],
  };
  const problems = validateStructureDraftContract(weeklyDefinition, missing);
  assert.ok(problems.some((entry) => (
    entry.kind === "missing_required_value"
    && entry.scopeInstanceId === "root"
    && entry.slotId === "start_date"
  )));
  assert.ok(problems.some((entry) => (
    entry.kind === "missing_required_value"
    && entry.scopeInstanceId === session.instanceId
    && entry.slotId === "weekdays"
  )));
  assert.equal(canMaterializeStructureDraft({
    definition: weeklyDefinition,
    draft: missing,
    currentSourceFingerprint: missing.sourceFingerprint,
  }), false);
});

test("an interim source may omit the Flow title but not an active Item title", () => {
  const group = weeklyFixture.structureDraft.groups[0];
  const session = group.children[0];
  const titleless: StructureDraft = {
    ...weeklyFixture.structureDraft,
    values: { ...weeklyFixture.structureDraft.values, flow_title: "" },
  };
  assert.equal(
    validateStructureDraftContract(weeklyDefinition, titleless).some(
      (entry) => entry.slotId === "flow_title",
    ),
    false,
  );

  const missingItemTitle: StructureDraft = {
    ...titleless,
    groups: [{
      ...group,
      children: [{
        ...session,
        values: { ...session.values, item_title: "" },
      }, ...group.children.slice(1)],
    }, ...weeklyFixture.structureDraft.groups.slice(1)],
  };
  assert.ok(validateStructureDraftContract(
    weeklyDefinition,
    missingItemTitle,
  ).some((entry) => (
    entry.kind === "missing_required_value"
    && entry.scopeInstanceId === session.instanceId
    && entry.slotId === "item_title"
  )));
});
