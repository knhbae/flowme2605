import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import bundledCatalogSnapshot from "./snapshots/catalog-v1/flow-structure-template-catalog-v1.json";
import snapshotManifest from "./snapshots/catalog-v1/snapshot-manifest.json";
import {
  loadBundledStructureTemplateCatalog,
  validateStructureTemplateCatalog,
} from "./catalog";

test("bundled p0.2 catalog loads six templates, three archetypes and nineteen unique rules", () => {
  const catalog = loadBundledStructureTemplateCatalog();
  const ruleCodes = [
    ...catalog.structureDraftContract.sharedValidationRules,
    ...catalog.templates.flatMap((template) => template.validationRules),
  ].map((rule) => rule.code);

  assert.equal(catalog.catalogVersion, "1.1.0-p0");
  assert.equal(catalog.templateContractVersion, "p0.2");
  assert.equal(catalog.templates.length, 6);
  assert.equal(catalog.archetypes.length, 3);
  assert.equal(ruleCodes.length, 19);
  assert.equal(new Set(ruleCodes).size, 19);
  assert.deepEqual(
    new Set(catalog.archetypes.map((archetype) => archetype.archetypeId)),
    new Set(["recurring_routine", "date_preparation", "itinerary_preparation"]),
  );
});

test("versioned snapshot bytes match the source-package manifest without an absolute path", () => {
  const snapshotRoot = fileURLToPath(new URL("./snapshots/catalog-v1/", import.meta.url));

  assert.equal(snapshotManifest.files.length, 8);
  for (const expected of snapshotManifest.files) {
    assert.equal(expected.path.includes(":"), false);
    assert.equal(expected.path.startsWith("/"), false);
    assert.equal(expected.path.includes(".."), false);
    const bytes = readFileSync(new URL(`./snapshots/catalog-v1/${expected.path}`, import.meta.url));
    assert.equal(bytes.byteLength, expected.byteLength, `${expected.path} byte length`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expected.sha256,
      `${expected.path} SHA-256`,
    );
  }
  assert.equal(snapshotRoot.includes("flow-text-authoring-writing-template-ux-review"), false);
});

test("runtime validation rejects duplicate template, group, slot and rule identities", () => {
  const catalog = structuredClone(bundledCatalogSnapshot) as typeof bundledCatalogSnapshot;
  catalog.templates[1].templateId = catalog.templates[0].templateId;
  const firstGroup = catalog.templates[0].groups[0];
  assert.equal("childGroups" in firstGroup, true);
  if (!("childGroups" in firstGroup)) return;
  firstGroup.childGroups[0].groupId = firstGroup.groupId;
  catalog.templates[0].groups[0].fields[0].slotId =
    catalog.templates[0].setupFields[0].slotId;
  catalog.templates[0].validationRules[0].code =
    catalog.structureDraftContract.sharedValidationRules[0].code;

  const result = validateStructureTemplateCatalog(catalog);
  assert.equal(result.valid, false);
  if (result.valid) return;
  const issueCodes = new Set(result.issues.map((issue) => issue.code));
  for (const expectedCode of [
    "duplicate_template_id",
    "duplicate_group_id",
    "duplicate_slot_id",
    "duplicate_rule_code",
  ]) {
    assert.equal(issueCodes.has(expectedCode), true, expectedCode);
  }
});

test("runtime validation fails closed when raw-text safety contracts are weakened", () => {
  const catalog = structuredClone(bundledCatalogSnapshot) as typeof bundledCatalogSnapshot;
  catalog.sourceSafety.selectionMutatesRawText = true;
  catalog.sourceSafety.sourceFingerprintMismatch = "continue";
  catalog.sourceMaterializationContract.generationBindingsWriteSource = true;

  const result = validateStructureTemplateCatalog(catalog);
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.deepEqual(
    new Set(result.issues.map((issue) => issue.code)),
    new Set([
      "unsafe_selection_contract",
      "unsafe_fingerprint_contract",
      "unsafe_generation_binding_contract",
    ]),
  );
});

test("runtime validation rejects unsupported field requirements and archetype compilers", () => {
  const unsupportedRequirement = structuredClone(bundledCatalogSnapshot);
  Reflect.set(
    unsupportedRequirement.templates[0].setupFields[0],
    "requiredAt",
    "unsupported_condition",
  );
  const requirementResult = validateStructureTemplateCatalog(
    unsupportedRequirement,
  );
  assert.equal(requirementResult.valid, false);
  if (!requirementResult.valid) {
    assert.equal(
      requirementResult.issues.some((issue) => (
        issue.code === "unsupported_required_at"
        && issue.path === "$.templates[0].setupFields[0].requiredAt"
      )),
      true,
    );
  }

  const unsupportedCompiler = structuredClone(bundledCatalogSnapshot);
  Reflect.set(
    unsupportedCompiler.archetypes[0],
    "compilerId",
    "unsupported_compiler",
  );
  const compilerResult = validateStructureTemplateCatalog(unsupportedCompiler);
  assert.equal(compilerResult.valid, false);
  if (!compilerResult.valid) {
    assert.equal(
      compilerResult.issues.some((issue) => (
        issue.code === "unsupported_compiler_id"
        && issue.path === "$.archetypes[0].compilerId"
      )),
      true,
    );
  }
});

test("runtime validation requires stable IDs for every template instance blueprint", () => {
  const catalog = structuredClone(bundledCatalogSnapshot);
  Reflect.set(
    catalog.templates[0].instanceDefaults,
    "instantiateWithStableIds",
    false,
  );

  const result = validateStructureTemplateCatalog(catalog);
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.deepEqual(
    result.issues.filter((issue) => issue.code === "unstable_instance_ids"),
    [{
      code: "unstable_instance_ids",
      path: "$.templates[0].instanceDefaults.instantiateWithStableIds",
      message: "P0.2 group instances must use stable IDs.",
    }],
  );
});
