import assert from "node:assert/strict";
import test from "node:test";

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  parsePersonalWorkspacePocAuthoring,
} from "../personal-workspace-poc-authoring";
import {
  findPersonalWorkspacePocStructureTemplatePreview,
  listPersonalWorkspacePocStructureTemplatePreviews,
  mapPersonalWorkspacePocAuthoringTemplatesToStructurePreviews,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER,
  serializeStructureTemplateSource,
  stableAuthoringJson,
} from "./index";

test("preview adapter exposes six immutable entries in the pinned authoring-template order", () => {
  const entries = listPersonalWorkspacePocStructureTemplatePreviews();
  assert.equal(entries.length, 6);
  assert.deepEqual(
    entries.map((entry) => entry.templateId),
    PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER,
  );
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map((template) => template.templateId),
    PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER,
  );
  assert.equal(Object.isFrozen(entries), true);
  entries.forEach((entry) => {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(entry.archetype), true);
    assert.equal(Object.isFrozen(entry.inputDraft), true);
    assert.equal(Object.isFrozen(entry.inputDraft.groups), true);
    assert.equal(Object.isFrozen(entry.compiled), true);
    assert.equal(Object.isFrozen(entry.compiled.steps), true);
    assert.equal(
      entry.catalogVersion,
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
    );
    assert.equal(
      entry.contractVersion,
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
    );
  });
});

test("authoring-template mapping is ID-complete and leaves the source array untouched", () => {
  const before = stableAuthoringJson(PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES);
  const mapped = mapPersonalWorkspacePocAuthoringTemplatesToStructurePreviews(
    PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  );
  assert.equal(mapped.length, 6);
  assert.deepEqual(
    mapped.map((entry) => entry.templateId),
    PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map((template) => template.templateId),
  );
  assert.equal(
    stableAuthoringJson(PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES),
    before,
  );
});

for (const templateId of PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER) {
  test(`${templateId}: preview source is compiler-byte-identical and parser-compatible`, () => {
    const entry = findPersonalWorkspacePocStructureTemplatePreview(templateId);
    assert.ok(entry);
    assert.equal(
      serializeStructureTemplateSource(entry.compiled),
      entry.expectedRawText,
    );
    assert.equal(
      entry.compiled.steps.flatMap((step) => step.items).length,
      entry.expectedItemCount,
    );
    const parsed = parsePersonalWorkspacePocAuthoring(entry.expectedRawText);
    assert.equal(parsed.blockingIssues.length, 0);
    assert.equal(parsed.items.length, entry.expectedItemCount);
  });
}

test("catalog, contract, template-version mismatches and unknown IDs expose zero previews with zero input mutation", () => {
  let mutationCount = 0;
  const guardedTemplates = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map(
    (template) => new Proxy(template, {
      set() {
        mutationCount += 1;
        return false;
      },
      deleteProperty() {
        mutationCount += 1;
        return false;
      },
    }),
  );
  const before = stableAuthoringJson(guardedTemplates);

  assert.equal(listPersonalWorkspacePocStructureTemplatePreviews({
    catalogVersion: "0.0.0-mismatch",
  }).length, 0);
  assert.equal(listPersonalWorkspacePocStructureTemplatePreviews({
    contractVersion: "p0.1",
  }).length, 0);
  assert.equal(mapPersonalWorkspacePocAuthoringTemplatesToStructurePreviews(
    guardedTemplates,
    { catalogVersion: "0.0.0-mismatch" },
  ).length, 0);
  assert.equal(
    findPersonalWorkspacePocStructureTemplatePreview(
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[0],
      { templateVersion: "0.0.0-mismatch" },
    ),
    null,
  );
  assert.equal(
    findPersonalWorkspacePocStructureTemplatePreview("unknown-template-id"),
    null,
  );
  assert.equal(
    mapPersonalWorkspacePocAuthoringTemplatesToStructurePreviews([
      { templateId: "unknown-template-id" },
    ]).length,
    0,
  );
  assert.equal(mutationCount, 0);
  assert.equal(stableAuthoringJson(guardedTemplates), before);
});
