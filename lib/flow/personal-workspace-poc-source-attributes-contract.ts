import type {
  PersonalWorkspacePocFlowItem,
  PersonalWorkspacePocOrigin,
} from './personal-workspace-poc-contract';

// The existing Result DTOs live here so source validation has no runtime
// dependency on its Result/Task consumers. Result keeps re-exporting the types.
export type PersonalWorkspacePocResultSourceAttributes = Readonly<{
  description?: string;
  relativeDate?: string;
  date?: string;
  resolvedDate?: string;
  time?: string;
  timeZone?: string;
  place?: string;
  resourceUrl?: string;
  recurrence?: string;
  recurrenceEnd?: string;
  completionCriteria?: string;
  durationMinutes?: number;
  executionCondition?: string;
  resourceLabel?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  guide?: string;
  caution?: string;
  subchecks?: readonly Readonly<{
    subcheckId: string;
    title: string;
    sourceChecked: boolean;
  }>[];
  additionalDescriptions?: readonly string[];
  sourceChecked?: boolean;
}>;

export type PersonalWorkspacePocResultSourceContract = Readonly<{
  origin: PersonalWorkspacePocOrigin;
  flowRef: string;
  savedCopyId: string;
  flowId: string;
  sourceSlug: string;
  owner: 'saved-plan-read-model' | 'authoring-working-source';
  sourcePreserved: true;
  sourceMutationCount: 0;
  authoring?: Readonly<{
    handoffId: string;
    documentId: string;
    revisionId: string;
    parseResultId: string;
    sourceSnapshotId: string;
    sourceFingerprint: string;
    /** Exact original JS string, including CRLF, tabs, and trailing newline. */
    rawText: string;
    itemMapping: 'complete' | 'legacy-unavailable';
  }>;
}>;

export type PersonalWorkspacePocAuthoringItemContext = Readonly<{
  sourceLine: number;
  attributes: PersonalWorkspacePocResultSourceAttributes;
}>;

export type PersonalWorkspacePocSourceReadFailureReason =
  | 'invalid-model-shape'
  | 'invalid-model-version'
  | 'unsupported-origin'
  | 'malformed-flow-identity'
  | 'duplicate-flow-identity'
  | 'duplicate-item-identity'
  | 'malformed-item-identity'
  | 'invalid-authoring-lineage'
  | 'invalid-source-candidate-store'
  | 'missing-source-candidate-target'
  | 'source-candidate-identity-mismatch'
  | 'invalid-source-index';

export type PersonalWorkspacePocSourceFlowResolution =
  | Readonly<{
    ok: true;
    source: PersonalWorkspacePocResultSourceContract;
    sourceItemByRef: ReadonlyMap<string, PersonalWorkspacePocFlowItem>;
    itemContextByRef: ReadonlyMap<string, PersonalWorkspacePocAuthoringItemContext>;
  }>
  | Readonly<{ ok: false; reason: PersonalWorkspacePocSourceReadFailureReason }>;

declare const sourceReadIndexBrand: unique symbol;

/** An ephemeral read handle, not a payload, writer ticket or storage schema. */
export type PersonalWorkspacePocSourceReadIndex = Readonly<{
  version: 1;
  [sourceReadIndexBrand]: true;
}>;

export type PersonalWorkspacePocSourceReadIndexResult =
  | Readonly<{ ok: true; index: PersonalWorkspacePocSourceReadIndex }>
  | Readonly<{ ok: false; reason: PersonalWorkspacePocSourceReadFailureReason }>;
