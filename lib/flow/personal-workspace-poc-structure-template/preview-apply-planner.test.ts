import assert from "node:assert/strict";
import test from "node:test";

import { parsePersonalWorkspacePocAuthoring } from "../personal-workspace-poc-authoring";
import {
  createPersonalWorkspacePocStructureTemplatePreviewApplyPlanner,
  findPersonalWorkspacePocStructureTemplatePreview,
  fingerprintLegacyPersonalWorkspacePocStructureTemplateSource,
  fingerprintStructureTemplateRawText,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER,
  planPersonalWorkspacePocStructureTemplatePreviewApply,
  planStructureTemplateMaterialization,
  stableAuthoringJson,
  type PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput,
  type StructureTemplateMaterializationResult,
} from "./index";

function validInput(
  templateId: string,
  overrides: Partial<PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput> = {},
): PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput {
  return {
    templateId,
    catalogVersion:
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
    contractVersion:
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
    rawText: "",
    expectedSourceFingerprint: fingerprintStructureTemplateRawText(""),
    confirmed: true,
    ...overrides,
  };
}

for (const templateId of PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER) {
  test(`${templateId}: confirmed empty source produces one exact source replacement`, () => {
    const preview = findPersonalWorkspacePocStructureTemplatePreview(templateId);
    assert.ok(preview);
    let materializationCallCount = 0;
    const planner = createPersonalWorkspacePocStructureTemplatePreviewApplyPlanner({
      planMaterialization(input) {
        materializationCallCount += 1;
        return planStructureTemplateMaterialization(input);
      },
    });
    const input = Object.freeze(validInput(templateId));
    const before = stableAuthoringJson(input);
    const result = planner(input);

    assert.equal(result.status, "applied");
    assert.equal(result.reason, "applied");
    assert.equal(materializationCallCount, 1);
    assert.equal(result.nextRawText, preview.expectedRawText);
    assert.deepEqual(
      new TextEncoder().encode(result.nextRawText),
      new TextEncoder().encode(preview.expectedRawText),
    );
    assert.deepEqual(
      [
        result.sourceMutationCount,
        result.workspaceMutationCount,
        result.operatingMutationCount,
      ],
      [1, 0, 0],
    );
    assert.ok(result.replacement);
    assert.equal(result.replacement.kind, "replace-raw-text");
    assert.equal(result.replacement.beforeRawText, "");
    assert.equal(result.replacement.afterRawText, preview.expectedRawText);
    assert.equal(
      result.replacement.afterSourceFingerprint,
      fingerprintStructureTemplateRawText(preview.expectedRawText),
    );
    assert.equal(
      result.replacement.afterLegacySourceFingerprint,
      fingerprintLegacyPersonalWorkspacePocStructureTemplateSource(
        preview.expectedRawText,
      ),
    );
    const parsed = parsePersonalWorkspacePocAuthoring(result.nextRawText);
    assert.equal(parsed.blockingIssues.length, 0);
    assert.equal(parsed.items.length, preview.expectedItemCount);
    assert.equal(stableAuthoringJson(input), before);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.replacement), true);
  });
}

test("cancel, composition, version, unknown, stale, same and nonempty guards execute zero materializations", () => {
  const templateId = PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[0];
  const preview = findPersonalWorkspacePocStructureTemplatePreview(templateId);
  assert.ok(preview);
  let materializationCallCount = 0;
  const planner = createPersonalWorkspacePocStructureTemplatePreviewApplyPlanner({
    planMaterialization(input) {
      materializationCallCount += 1;
      return planStructureTemplateMaterialization(input);
    },
  });
  const sameCoreFingerprint = fingerprintStructureTemplateRawText(
    preview.expectedRawText,
  );
  const sameLegacyFingerprint =
    fingerprintLegacyPersonalWorkspacePocStructureTemplateSource(
      preview.expectedRawText,
    );
  assert.notEqual(sameCoreFingerprint, sameLegacyFingerprint);
  const nonemptyRawText = "기존 원문은 덮어쓰지 않는다";
  const whitespaceRawText = " \n\t";
  const cases = [
    {
      name: "cancelled",
      input: validInput(templateId, { confirmed: false }),
      status: "cancelled",
      reason: "cancelled",
    },
    {
      name: "composing",
      input: validInput(templateId, { composing: true }),
      status: "blocked",
      reason: "composing",
    },
    {
      name: "catalog mismatch",
      input: validInput(templateId, { catalogVersion: "0.0.0-mismatch" }),
      status: "blocked",
      reason: "version-mismatch",
    },
    {
      name: "contract mismatch",
      input: validInput(templateId, { contractVersion: "p0.1" }),
      status: "blocked",
      reason: "version-mismatch",
    },
    {
      name: "unknown template",
      input: validInput("unknown-template-id"),
      status: "blocked",
      reason: "unknown-template",
    },
    {
      name: "stale source",
      input: validInput(templateId, {
        expectedSourceFingerprint: "raw-v2:stale",
      }),
      status: "blocked",
      reason: "stale-source",
    },
    {
      name: "same source with core SHA snapshot",
      input: validInput(templateId, {
        rawText: preview.expectedRawText,
        expectedSourceFingerprint: sameCoreFingerprint,
      }),
      status: "unchanged",
      reason: "same-source",
    },
    {
      name: "same source with React FNV snapshot",
      input: validInput(templateId, {
        rawText: preview.expectedRawText,
        expectedSourceFingerprint: sameLegacyFingerprint,
      }),
      status: "unchanged",
      reason: "same-source",
    },
    {
      name: "nonempty source with core SHA snapshot",
      input: validInput(templateId, {
        rawText: nonemptyRawText,
        expectedSourceFingerprint:
          fingerprintStructureTemplateRawText(nonemptyRawText),
      }),
      status: "blocked",
      reason: "nonempty-source",
    },
    {
      name: "whitespace source with React FNV snapshot",
      input: validInput(templateId, {
        rawText: whitespaceRawText,
        expectedSourceFingerprint:
          fingerprintLegacyPersonalWorkspacePocStructureTemplateSource(
            whitespaceRawText,
          ),
      }),
      status: "blocked",
      reason: "nonempty-source",
    },
  ] as const;

  cases.forEach((guarded) => {
    const input = Object.freeze(guarded.input);
    const before = stableAuthoringJson(input);
    const result = planner(input);
    assert.equal(result.status, guarded.status, guarded.name);
    assert.equal(result.reason, guarded.reason, guarded.name);
    assert.equal(result.nextRawText, input.rawText, guarded.name);
    assert.equal(result.replacement, null, guarded.name);
    assert.deepEqual(
      [
        result.sourceMutationCount,
        result.workspaceMutationCount,
        result.operatingMutationCount,
      ],
      [0, 0, 0],
      guarded.name,
    );
    assert.equal(stableAuthoringJson(input), before, guarded.name);
    assert.equal(Object.isFrozen(result), true, guarded.name);
  });
  assert.equal(materializationCallCount, 0);
});

test("compiler exceptions fail closed with the exact input bytes", () => {
  const templateId = PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[0];
  let materializationCallCount = 0;
  const planner = createPersonalWorkspacePocStructureTemplatePreviewApplyPlanner({
    planMaterialization() {
      materializationCallCount += 1;
      throw new Error("compiler unavailable");
    },
  });
  const input = Object.freeze(validInput(templateId));
  const before = stableAuthoringJson(input);
  const result = planner(input);

  assert.equal(materializationCallCount, 1);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "compiler-error");
  assert.equal(result.nextRawText, input.rawText);
  assert.equal(result.replacement, null);
  assert.deepEqual(
    [result.sourceMutationCount, result.workspaceMutationCount, result.operatingMutationCount],
    [0, 0, 0],
  );
  assert.equal(stableAuthoringJson(input), before);
});

test("a materializer byte mismatch cannot authorize a replacement", () => {
  const templateId = PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[0];
  const planner = createPersonalWorkspacePocStructureTemplatePreviewApplyPlanner({
    planMaterialization(input): StructureTemplateMaterializationResult {
      const result = planStructureTemplateMaterialization(input);
      assert.equal(result.status, "ready");
      if (result.status !== "ready") return result;
      return {
        ...result,
        plan: {
          ...result.plan,
          nextRawText: `${result.plan.nextRawText}\n손상된 바이트`,
        },
      };
    },
  });
  const input = Object.freeze(validInput(templateId));
  const before = stableAuthoringJson(input);
  const result = planner(input);

  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "bytes-mismatch");
  assert.equal(result.nextRawText, input.rawText);
  assert.equal(result.replacement, null);
  assert.deepEqual(
    [result.sourceMutationCount, result.workspaceMutationCount, result.operatingMutationCount],
    [0, 0, 0],
  );
  assert.equal(stableAuthoringJson(input), before);
});

test("the default exported planner uses the same immutable apply contract", () => {
  const templateId = PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[5];
  const input = Object.freeze(validInput(templateId));
  const before = stableAuthoringJson(input);
  const result = planPersonalWorkspacePocStructureTemplatePreviewApply(input);

  assert.equal(result.status, "applied");
  assert.equal(result.sourceMutationCount, 1);
  assert.equal(result.workspaceMutationCount, 0);
  assert.equal(result.operatingMutationCount, 0);
  assert.equal(stableAuthoringJson(input), before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.replacement), true);
});
