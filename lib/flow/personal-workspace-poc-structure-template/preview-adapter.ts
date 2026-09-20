import {
  findStructureTemplateDefinition,
  loadBundledStructureTemplateCatalog,
} from "./catalog";
import { compileStructureTemplate } from "./compiler";
import { planStructureTemplateMaterialization } from "./materialization";
import {
  cloneAuthoringValue,
  freezeStructureTemplateRuntimeValue,
  stableAuthoringJson,
} from "./runtime-adapter";
import { serializeStructureTemplateSource } from "./source";
import type {
  CompiledStructureTemplateFlow,
  StructureDraft,
  StructureTemplateArchetype,
} from "./types";
import examFixtureJson from "./snapshots/catalog-v1/fixtures/exam-dday-study.json";
import phasedFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-phased.json";
import weeklyFixtureJson from "./snapshots/catalog-v1/fixtures/exercise-weekly.json";
import movingFixtureJson from "./snapshots/catalog-v1/fixtures/moving-dday.json";
import travelFixtureJson from "./snapshots/catalog-v1/fixtures/travel-itinerary.json";
import weddingFixtureJson from "./snapshots/catalog-v1/fixtures/wedding-dday.json";

export const PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION =
  "1.1.0-p0" as const;
export const PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION =
  "p0.2" as const;

export const PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER = Object.freeze([
  "exercise-phased-4w-v1",
  "exercise-weekly-repeat-v1",
  "moving-dday-v1",
  "wedding-dday-v1",
  "travel-itinerary-prep-v1",
  "exam-dday-study-v1",
] as const);

export type PersonalWorkspacePocStructureTemplatePreviewTemplateId =
  typeof PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[number];

export type PersonalWorkspacePocStructureTemplatePreviewEntry = Readonly<{
  templateId: PersonalWorkspacePocStructureTemplatePreviewTemplateId;
  templateVersion: string;
  label: string;
  archetype: StructureTemplateArchetype;
  catalogVersion:
    typeof PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION;
  contractVersion:
    typeof PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION;
  inputDraft: StructureDraft;
  compiled: CompiledStructureTemplateFlow;
  expectedRawText: string;
  expectedItemCount: number;
}>;

export type PersonalWorkspacePocStructureTemplatePreviewCompatibility = Readonly<{
  catalogVersion?: string;
  contractVersion?: string;
}>;

export type PersonalWorkspacePocStructureTemplatePreviewLookup =
  PersonalWorkspacePocStructureTemplatePreviewCompatibility & Readonly<{
    templateVersion?: string;
  }>;

type PositivePreviewFixture = Readonly<{
  fixtureVersion: string;
  definitionRef: Readonly<{ templateId: string; version: string }>;
  initialRawText: string;
  sourceFingerprint: string;
  structureDraft: StructureDraft;
  expectedPlan: Readonly<{ itemCount: number }>;
  expectedRawText: string;
  expectedCanonical: Readonly<{ itemCount: number }>;
}>;

type PinnedFixture = Readonly<{
  templateId: PersonalWorkspacePocStructureTemplatePreviewTemplateId;
  fixture: PositivePreviewFixture;
}>;

const PINNED_FIXTURES = Object.freeze([
  {
    templateId: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[0],
    fixture: phasedFixtureJson as unknown as PositivePreviewFixture,
  },
  {
    templateId: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[1],
    fixture: weeklyFixtureJson as unknown as PositivePreviewFixture,
  },
  {
    templateId: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[2],
    fixture: movingFixtureJson as unknown as PositivePreviewFixture,
  },
  {
    templateId: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[3],
    fixture: weddingFixtureJson as unknown as PositivePreviewFixture,
  },
  {
    templateId: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[4],
    fixture: travelFixtureJson as unknown as PositivePreviewFixture,
  },
  {
    templateId: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_ORDER[5],
    fixture: examFixtureJson as unknown as PositivePreviewFixture,
  },
] satisfies readonly PinnedFixture[]);

function compiledItemCount(compiled: CompiledStructureTemplateFlow): number {
  return compiled.steps.reduce(
    (count, step) => count + step.items.length,
    0,
  );
}

function createPreviewEntry(
  pinned: PinnedFixture,
): PersonalWorkspacePocStructureTemplatePreviewEntry | null {
  try {
    const catalog = loadBundledStructureTemplateCatalog();
    const fixture = pinned.fixture;
    if (
      catalog.catalogVersion
        !== PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION
      || catalog.templateContractVersion
        !== PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION
      || fixture.fixtureVersion
        !== PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION
      || fixture.definitionRef.templateId !== pinned.templateId
      || fixture.structureDraft.templateId !== pinned.templateId
      || fixture.structureDraft.templateVersion !== fixture.definitionRef.version
      || fixture.structureDraft.schemaVersion !== fixture.fixtureVersion
      || fixture.structureDraft.sourceFingerprint !== fixture.sourceFingerprint
      || fixture.expectedPlan.itemCount !== fixture.expectedCanonical.itemCount
    ) {
      return null;
    }

    const definition = findStructureTemplateDefinition(
      catalog,
      pinned.templateId,
      fixture.definitionRef.version,
    );
    if (!definition) return null;
    const archetype = catalog.archetypes.find(
      (candidate) => candidate.archetypeId === definition.archetypeId,
    );
    if (!archetype) return null;

    const compiled = compileStructureTemplate(definition, fixture.structureDraft);
    const serialized = serializeStructureTemplateSource(compiled);
    const plan = planStructureTemplateMaterialization({
      definition,
      draft: fixture.structureDraft,
      currentRawText: fixture.initialRawText,
      insertionPoint: 0,
    });
    if (
      serialized !== fixture.expectedRawText
      || compiledItemCount(compiled) !== fixture.expectedPlan.itemCount
      || plan.status !== "ready"
      || plan.plan.nextRawText !== fixture.expectedRawText
      || plan.plan.insertedText !== fixture.expectedRawText
      || plan.plan.itemCount !== fixture.expectedPlan.itemCount
      || stableAuthoringJson(plan.compiled) !== stableAuthoringJson(compiled)
    ) {
      return null;
    }

    return freezeStructureTemplateRuntimeValue({
      templateId: pinned.templateId,
      templateVersion: definition.version,
      label: definition.label,
      archetype: cloneAuthoringValue(archetype),
      catalogVersion:
        PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
      contractVersion:
        PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
      inputDraft: cloneAuthoringValue(fixture.structureDraft),
      compiled: cloneAuthoringValue(compiled),
      expectedRawText: fixture.expectedRawText,
      expectedItemCount: fixture.expectedPlan.itemCount,
    });
  } catch {
    return null;
  }
}

/**
 * Initialized once from the six pinned snapshots. A broken fixture is omitted
 * instead of exposing an unverified preview to either renderer.
 */
const VERIFIED_PREVIEW_ENTRIES = freezeStructureTemplateRuntimeValue(
  PINNED_FIXTURES.flatMap((pinned) => {
    const entry = createPreviewEntry(pinned);
    return entry ? [entry] : [];
  }),
);

function isCompatible(
  compatibility: PersonalWorkspacePocStructureTemplatePreviewCompatibility,
): boolean {
  return (
    (
      compatibility.catalogVersion === undefined
      || compatibility.catalogVersion
        === PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION
    )
    && (
      compatibility.contractVersion === undefined
      || compatibility.contractVersion
        === PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION
    )
  );
}

/** Returns only compiler-verified, immutable entries in the pinned UI order. */
export function listPersonalWorkspacePocStructureTemplatePreviews(
  compatibility: PersonalWorkspacePocStructureTemplatePreviewCompatibility = {},
): readonly PersonalWorkspacePocStructureTemplatePreviewEntry[] {
  if (!isCompatible(compatibility)) return Object.freeze([]);
  return VERIFIED_PREVIEW_ENTRIES;
}

/** Resolves the shared template ID used by PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES. */
export function findPersonalWorkspacePocStructureTemplatePreview(
  templateId: string,
  lookup: PersonalWorkspacePocStructureTemplatePreviewLookup = {},
): PersonalWorkspacePocStructureTemplatePreviewEntry | null {
  if (!isCompatible(lookup)) return null;
  const entry = VERIFIED_PREVIEW_ENTRIES.find(
    (candidate) => candidate.templateId === templateId,
  );
  if (!entry || (
    lookup.templateVersion !== undefined
    && lookup.templateVersion !== entry.templateVersion
  )) {
    return null;
  }
  return entry;
}

/** Joins any authoring-template-shaped list to the verified preview contract. */
export function mapPersonalWorkspacePocAuthoringTemplatesToStructurePreviews(
  templates: readonly Readonly<{ templateId: string }>[],
  compatibility: PersonalWorkspacePocStructureTemplatePreviewCompatibility = {},
): readonly PersonalWorkspacePocStructureTemplatePreviewEntry[] {
  if (!isCompatible(compatibility)) return Object.freeze([]);
  return Object.freeze(templates.flatMap((template) => {
    const entry = findPersonalWorkspacePocStructureTemplatePreview(
      template.templateId,
      compatibility,
    );
    return entry ? [entry] : [];
  }));
}
