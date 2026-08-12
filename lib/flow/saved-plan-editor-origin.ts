import {
  normalizeSavedFlowMapSnapshot,
  normalizeSavedFlowRecord,
  type SavedFlowMapSnapshot,
  type SavedFlowRecord,
} from './storage';

export type SavedPlanEditorTitleOwner = 'saved-record' | 'saved-map' | 'bundle';
export type SavedPlanEditorAnchorOwner = 'saved-flow' | 'saved-map-and-child-flows';
export type SavedPlanEditorCompositionOwner =
  | 'item-state'
  | 'map-personal-copy-and-item-state'
  | 'structural-overlay-and-item-state';
export type SavedPlanEditorItemValueOwner =
  | 'global-personalization'
  | 'map-step-override-and-global-memo'
  | 'structural-and-global-personalization';
export type SavedPlanEditorRecordPolicy =
  | 'require-schema-v2'
  | 'preserve-map-child-records'
  | 'preserve-personal-draft-record'
  | 'preserve-legacy-record';

/**
 * Persistence capabilities are deliberately expressed as existing owners.
 * They guide an editor adapter without introducing a new storage contract.
 */
export type SavedPlanEditorOriginCapabilities = Readonly<{
  titleOwner: SavedPlanEditorTitleOwner;
  anchorOwner: SavedPlanEditorAnchorOwner;
  compositionOwner: SavedPlanEditorCompositionOwner;
  itemValueOwner: SavedPlanEditorItemValueOwner;
  recordPolicy: SavedPlanEditorRecordPolicy;
}>;

export type SourceBackedMapSavedPlanEditorOrigin = {
  kind: 'source-backed-map';
  flowSlug: string;
  mapId: string;
  flowSlugs: string[];
  personalCopyState: 'existing' | 'initialize-on-save';
  savedMap: SavedFlowMapSnapshot;
  capabilities: SavedPlanEditorOriginCapabilities;
};

export type PersonalDraftSavedPlanEditorOrigin = {
  kind: 'personal-draft';
  flowSlug: string;
  bundleFlowSlug: string;
  capabilities: SavedPlanEditorOriginCapabilities;
};

export type CanonicalPersonalCopySavedPlanEditorOrigin = {
  kind: 'canonical-personal-copy';
  flowSlug: string;
  sourceFlowSlug: string;
  savedRecord: SavedFlowRecord & { schemaVersion: 2 };
  capabilities: SavedPlanEditorOriginCapabilities;
};

export type LegacySavedPlanEditorOrigin = {
  kind: 'legacy-saved-plan';
  flowSlug: string;
  savedRecord: SavedFlowRecord & { schemaVersion?: undefined };
  capabilities: SavedPlanEditorOriginCapabilities;
};

export type SupportedSavedPlanEditorOrigin =
  | SourceBackedMapSavedPlanEditorOrigin
  | PersonalDraftSavedPlanEditorOrigin
  | CanonicalPersonalCopySavedPlanEditorOrigin
  | LegacySavedPlanEditorOrigin;

export type UnsupportedSavedPlanEditorOriginReason =
  | 'invalid-plan-identity'
  | 'malformed-source-backed-map'
  | 'source-backed-map-flow-mismatch'
  | 'personal-draft-identity-mismatch'
  | 'personal-draft-status-mismatch'
  | 'malformed-schema-v2-identity'
  | 'unsupported-saved-record-schema'
  | 'malformed-legacy-saved-record'
  | 'missing-saved-record';

export type UnsupportedSavedPlanEditorOrigin = {
  kind: 'unsupported';
  flowSlug: string;
  reason: UnsupportedSavedPlanEditorOriginReason;
};

export type SavedPlanEditorOrigin =
  | SupportedSavedPlanEditorOrigin
  | UnsupportedSavedPlanEditorOrigin;

export type ClassifySavedPlanEditorOriginInput = {
  /** `flow.progress.slug` in AppClient. */
  flowSlug: string;
  /** `flow.bundle.flow.slug` in AppClient. */
  bundleFlowSlug: string;
  /** `flow.bundle.flow.status` in AppClient. */
  bundleStatus: string;
  /** A normalized snapshot is accepted, but runtime validation remains fail-closed. */
  savedMap?: SavedFlowMapSnapshot | null;
  /**
   * Pass the parsed storage value when possible. Keeping this `unknown` lets the
   * classifier distinguish malformed schema-v2 data from an unversioned legacy
   * record instead of silently downgrading it.
   */
  savedRecord?: unknown;
};

const SOURCE_BACKED_MAP_CAPABILITIES: SavedPlanEditorOriginCapabilities = Object.freeze({
  titleOwner: 'saved-map',
  anchorOwner: 'saved-map-and-child-flows',
  compositionOwner: 'map-personal-copy-and-item-state',
  itemValueOwner: 'map-step-override-and-global-memo',
  recordPolicy: 'preserve-map-child-records',
});

const PERSONAL_DRAFT_CAPABILITIES: SavedPlanEditorOriginCapabilities = Object.freeze({
  titleOwner: 'bundle',
  anchorOwner: 'saved-flow',
  compositionOwner: 'structural-overlay-and-item-state',
  itemValueOwner: 'structural-and-global-personalization',
  recordPolicy: 'preserve-personal-draft-record',
});

const CANONICAL_PERSONAL_COPY_CAPABILITIES: SavedPlanEditorOriginCapabilities = Object.freeze({
  titleOwner: 'saved-record',
  anchorOwner: 'saved-flow',
  compositionOwner: 'item-state',
  itemValueOwner: 'global-personalization',
  recordPolicy: 'require-schema-v2',
});

const LEGACY_SAVED_PLAN_CAPABILITIES: SavedPlanEditorOriginCapabilities = Object.freeze({
  titleOwner: 'saved-record',
  anchorOwner: 'saved-flow',
  compositionOwner: 'item-state',
  itemValueOwner: 'global-personalization',
  recordPolicy: 'preserve-legacy-record',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isPersonalDraftSlug(value: string): boolean {
  return value.startsWith('url-draft-');
}

function hasMalformedSchemaV2Identity(value: Record<string, unknown>, flowSlug: string): boolean {
  return value.schemaVersion !== 2
    || value.slug !== flowSlug
    || value.personalCopyKey !== flowSlug
    || !isNonEmptyString(value.sourceFlowKey)
    || !isNonEmptyString(value.sourceFlowSlug)
    || !isNonEmptyString(value.sourceVersion)
    || !isNonEmptyString(value.lastSaveRequestId)
    || !Number.isSafeInteger(value.savedItemCount)
    || Number(value.savedItemCount) < 0;
}

function unsupported(
  flowSlug: string,
  reason: UnsupportedSavedPlanEditorOriginReason,
): UnsupportedSavedPlanEditorOrigin {
  return { kind: 'unsupported', flowSlug, reason };
}

/**
 * Classifies which existing persistence adapter owns a saved plan.
 *
 * Precedence is intentional: a map snapshot owns its child plan even when a
 * companion saved-flow record exists; a URL/memo draft owns its bundle before
 * saved-record schema is considered. Explicit or malformed versioned records
 * never fall through to the legacy writer.
 */
export function classifySavedPlanEditorOrigin(
  input: ClassifySavedPlanEditorOriginInput,
): SavedPlanEditorOrigin {
  const flowSlug = input.flowSlug.trim();
  const bundleFlowSlug = input.bundleFlowSlug.trim();
  if (!flowSlug || !bundleFlowSlug) return unsupported(flowSlug, 'invalid-plan-identity');

  if (input.savedMap !== undefined && input.savedMap !== null) {
    const suppliedMap = input.savedMap as unknown;
    const savedMap = normalizeSavedFlowMapSnapshot(suppliedMap);
    const suppliedPersonalCopy = isRecord(suppliedMap)
      && Object.prototype.hasOwnProperty.call(suppliedMap, 'personalCopy')
      && suppliedMap.personalCopy !== undefined
      && suppliedMap.personalCopy !== null;
    if (!savedMap || (suppliedPersonalCopy && !savedMap.personalCopy)) {
      return unsupported(flowSlug, 'malformed-source-backed-map');
    }
    if (!savedMap.flowSlugs.includes(flowSlug)) {
      return unsupported(flowSlug, 'source-backed-map-flow-mismatch');
    }
    return {
      kind: 'source-backed-map',
      flowSlug,
      mapId: savedMap.mapId,
      flowSlugs: [...savedMap.flowSlugs],
      personalCopyState: savedMap.personalCopy ? 'existing' : 'initialize-on-save',
      savedMap,
      capabilities: SOURCE_BACKED_MAP_CAPABILITIES,
    };
  }

  if (isPersonalDraftSlug(flowSlug) || isPersonalDraftSlug(bundleFlowSlug)) {
    if (flowSlug !== bundleFlowSlug) {
      return unsupported(flowSlug, 'personal-draft-identity-mismatch');
    }
    if (input.bundleStatus !== 'draft') {
      return unsupported(flowSlug, 'personal-draft-status-mismatch');
    }
    return {
      kind: 'personal-draft',
      flowSlug,
      bundleFlowSlug,
      capabilities: PERSONAL_DRAFT_CAPABILITIES,
    };
  }

  if (input.savedRecord === undefined || input.savedRecord === null) {
    return unsupported(flowSlug, 'missing-saved-record');
  }
  if (!isRecord(input.savedRecord)) {
    return unsupported(flowSlug, 'malformed-legacy-saved-record');
  }

  const rawSchemaVersion = input.savedRecord.schemaVersion;
  if (rawSchemaVersion === 2) {
    if (hasMalformedSchemaV2Identity(input.savedRecord, flowSlug)) {
      return unsupported(flowSlug, 'malformed-schema-v2-identity');
    }
    const savedRecord = normalizeSavedFlowRecord(input.savedRecord);
    if (!savedRecord || savedRecord.schemaVersion !== 2) {
      return unsupported(flowSlug, 'malformed-schema-v2-identity');
    }
    return {
      kind: 'canonical-personal-copy',
      flowSlug,
      sourceFlowSlug: savedRecord.sourceFlowSlug as string,
      savedRecord: savedRecord as SavedFlowRecord & { schemaVersion: 2 },
      capabilities: CANONICAL_PERSONAL_COPY_CAPABILITIES,
    };
  }

  if (rawSchemaVersion !== undefined) {
    return unsupported(flowSlug, 'unsupported-saved-record-schema');
  }

  const savedRecord = normalizeSavedFlowRecord(input.savedRecord);
  if (!savedRecord || savedRecord.schemaVersion !== undefined || savedRecord.slug !== flowSlug) {
    return unsupported(flowSlug, 'malformed-legacy-saved-record');
  }
  return {
    kind: 'legacy-saved-plan',
    flowSlug,
    savedRecord: savedRecord as SavedFlowRecord & { schemaVersion?: undefined },
    capabilities: LEGACY_SAVED_PLAN_CAPABILITIES,
  };
}

export function isSupportedSavedPlanEditorOrigin(
  origin: SavedPlanEditorOrigin,
): origin is SupportedSavedPlanEditorOrigin {
  return origin.kind !== 'unsupported';
}
