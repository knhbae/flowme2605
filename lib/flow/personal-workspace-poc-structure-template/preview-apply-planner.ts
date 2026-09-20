import {
  findStructureTemplateDefinition,
  loadBundledStructureTemplateCatalog,
} from "./catalog";
import {
  fingerprintStructureTemplateRawText,
  planStructureTemplateMaterialization,
  type PlanStructureTemplateMaterializationInput,
} from "./materialization";
import {
  findPersonalWorkspacePocStructureTemplatePreview,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER,
} from "./preview-adapter";
import {
  freezeStructureTemplateRuntimeValue,
  stableAuthoringHash,
  stableAuthoringJson,
} from "./runtime-adapter";
import { serializeStructureTemplateSource } from "./source";
import type { StructureTemplateMaterializationResult } from "./types";

export type PersonalWorkspacePocStructureTemplatePreviewApplyReason =
  | "applied"
  | "cancelled"
  | "composing"
  | "version-mismatch"
  | "unknown-template"
  | "stale-source"
  | "same-source"
  | "nonempty-source"
  | "compiler-error"
  | "bytes-mismatch";

export type PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput = Readonly<{
  templateId: string;
  catalogVersion: string;
  contractVersion: string;
  rawText: string;
  /** May be the current React FNV snapshot or the core SHA/legacy-empty snapshot. */
  expectedSourceFingerprint: string;
  confirmed: boolean;
  composing?: boolean;
}>;

type PersonalWorkspacePocStructureTemplatePreviewApplyBase = Readonly<{
  templateId: string;
  catalogVersion:
    typeof PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION;
  contractVersion:
    typeof PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION;
  currentSourceFingerprint: string;
  currentLegacySourceFingerprint: string;
  nextRawText: string;
  workspaceMutationCount: 0;
  operatingMutationCount: 0;
}>;

export type PersonalWorkspacePocStructureTemplatePreviewApplyReplacement =
  Readonly<{
    kind: "replace-raw-text";
    beforeRawText: "";
    afterRawText: string;
    afterSourceFingerprint: string;
    afterLegacySourceFingerprint: string;
  }>;

export type PersonalWorkspacePocStructureTemplatePreviewApplyPlan =
  | (PersonalWorkspacePocStructureTemplatePreviewApplyBase & Readonly<{
      status: "applied";
      reason: "applied";
      sourceMutationCount: 1;
      replacement: PersonalWorkspacePocStructureTemplatePreviewApplyReplacement;
    }>)
  | (PersonalWorkspacePocStructureTemplatePreviewApplyBase & Readonly<{
      status: "cancelled" | "blocked" | "unchanged";
      reason: Exclude<
        PersonalWorkspacePocStructureTemplatePreviewApplyReason,
        "applied"
      >;
      sourceMutationCount: 0;
      replacement: null;
    }>);

export type PersonalWorkspacePocStructureTemplatePreviewApplyPlannerRuntime =
  Readonly<{
    planMaterialization(
      input: PlanStructureTemplateMaterializationInput,
    ): StructureTemplateMaterializationResult;
  }>;

/** Matches the exact source snapshot currently emitted by the React PoC. */
export function fingerprintLegacyPersonalWorkspacePocStructureTemplateSource(
  rawText: string,
): string {
  return `raw-v1:${rawText.length}:${stableAuthoringHash(rawText)}`;
}

function zeroMutationPlan(
  input: PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput,
  currentSourceFingerprint: string,
  currentLegacySourceFingerprint: string,
  status: "cancelled" | "blocked" | "unchanged",
  reason: Exclude<
    PersonalWorkspacePocStructureTemplatePreviewApplyReason,
    "applied"
  >,
): PersonalWorkspacePocStructureTemplatePreviewApplyPlan {
  return freezeStructureTemplateRuntimeValue({
    status,
    reason,
    templateId: input.templateId,
    catalogVersion:
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
    contractVersion:
      PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
    currentSourceFingerprint,
    currentLegacySourceFingerprint,
    nextRawText: input.rawText,
    sourceMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
    replacement: null,
  });
}

function isPinnedTemplateId(templateId: string): boolean {
  return PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER.some(
    (candidate) => candidate === templateId,
  );
}

function sourceFingerprintMatches(
  expected: string,
  current: string,
  currentLegacy: string,
): boolean {
  return expected === current || expected === currentLegacy;
}

function createPlanner(
  runtime: PersonalWorkspacePocStructureTemplatePreviewApplyPlannerRuntime,
) {
  return function plan(
    input: PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput,
  ): PersonalWorkspacePocStructureTemplatePreviewApplyPlan {
    const currentSourceFingerprint = fingerprintStructureTemplateRawText(
      input.rawText,
    );
    const currentLegacySourceFingerprint =
      fingerprintLegacyPersonalWorkspacePocStructureTemplateSource(input.rawText);
    const zero = (
      status: "cancelled" | "blocked" | "unchanged",
      reason: Exclude<
        PersonalWorkspacePocStructureTemplatePreviewApplyReason,
        "applied"
      >,
    ) => zeroMutationPlan(
      input,
      currentSourceFingerprint,
      currentLegacySourceFingerprint,
      status,
      reason,
    );

    if (!input.confirmed) return zero("cancelled", "cancelled");
    if (input.composing) return zero("blocked", "composing");
    if (
      input.catalogVersion
        !== PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION
      || input.contractVersion
        !== PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION
    ) {
      return zero("blocked", "version-mismatch");
    }
    if (!isPinnedTemplateId(input.templateId)) {
      return zero("blocked", "unknown-template");
    }
    const preview = findPersonalWorkspacePocStructureTemplatePreview(
      input.templateId,
      {
        catalogVersion: input.catalogVersion,
        contractVersion: input.contractVersion,
      },
    );
    if (!preview) return zero("blocked", "bytes-mismatch");
    if (!sourceFingerprintMatches(
      input.expectedSourceFingerprint,
      currentSourceFingerprint,
      currentLegacySourceFingerprint,
    )) {
      return zero("blocked", "stale-source");
    }
    if (input.rawText === preview.expectedRawText) {
      return zero("unchanged", "same-source");
    }
    if (input.rawText.length !== 0) {
      return zero("blocked", "nonempty-source");
    }

    try {
      const catalog = loadBundledStructureTemplateCatalog();
      const definition = findStructureTemplateDefinition(
        catalog,
        preview.templateId,
        preview.templateVersion,
      );
      if (!definition) return zero("blocked", "bytes-mismatch");

      const materialization = runtime.planMaterialization({
        definition,
        draft: preview.inputDraft,
        currentRawText: input.rawText,
        insertionPoint: 0,
      });
      if (materialization.status !== "ready") {
        return zero("blocked", "bytes-mismatch");
      }
      const serialized = serializeStructureTemplateSource(
        materialization.compiled,
      );
      if (
        serialized !== preview.expectedRawText
        || materialization.plan.nextRawText !== preview.expectedRawText
        || materialization.plan.insertedText !== preview.expectedRawText
        || materialization.plan.expectedSourceFingerprint
          !== currentSourceFingerprint
        || materialization.plan.insertedRange.start !== 0
        || materialization.plan.insertedRange.end
          !== preview.expectedRawText.length
        || materialization.plan.itemCount !== preview.expectedItemCount
        || stableAuthoringJson(materialization.compiled)
          !== stableAuthoringJson(preview.compiled)
      ) {
        return zero("blocked", "bytes-mismatch");
      }

      return freezeStructureTemplateRuntimeValue({
        status: "applied",
        reason: "applied",
        templateId: preview.templateId,
        catalogVersion:
          PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
        contractVersion:
          PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
        currentSourceFingerprint,
        currentLegacySourceFingerprint,
        nextRawText: preview.expectedRawText,
        sourceMutationCount: 1,
        workspaceMutationCount: 0,
        operatingMutationCount: 0,
        replacement: {
          kind: "replace-raw-text",
          beforeRawText: "",
          afterRawText: preview.expectedRawText,
          afterSourceFingerprint: fingerprintStructureTemplateRawText(
            preview.expectedRawText,
          ),
          afterLegacySourceFingerprint:
            fingerprintLegacyPersonalWorkspacePocStructureTemplateSource(
              preview.expectedRawText,
            ),
        },
      });
    } catch {
      return zero("blocked", "compiler-error");
    }
  };
}

/**
 * Creates the same safe planner with an injected materializer. The output is
 * still byte-gated, so injected runtimes cannot authorize arbitrary source.
 */
export function createPersonalWorkspacePocStructureTemplatePreviewApplyPlanner(
  runtime: PersonalWorkspacePocStructureTemplatePreviewApplyPlannerRuntime,
) {
  return createPlanner(runtime);
}

const DEFAULT_PREVIEW_APPLY_PLANNER = createPlanner({
  planMaterialization: planStructureTemplateMaterialization,
});

export function planPersonalWorkspacePocStructureTemplatePreviewApply(
  input: PlanPersonalWorkspacePocStructureTemplatePreviewApplyInput,
): PersonalWorkspacePocStructureTemplatePreviewApplyPlan {
  return DEFAULT_PREVIEW_APPLY_PLANNER(input);
}
