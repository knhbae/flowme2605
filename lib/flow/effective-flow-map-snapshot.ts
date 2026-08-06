import type { CanonicalSavedCopyGroup } from './canonical-flow-storage';
import {
  buildFlowMapActionContract,
  type FlowMapActionContract,
  type FlowMapExecutionState,
  type FlowMapSaveMode,
  type FlowMapSurface,
} from './flow-map-action-contract';
import type {
  SourceBackedFlowMapPersonalCopy,
  SourceBackedFlowMapPublishPackage,
} from './source-backed-my-flow';
import type { PrimaryDestination, RiskLevel } from './types';

export const EFFECTIVE_FLOW_MAP_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const FLOW_MAP_CANONICAL_ITEM_ID_SEPARATOR = '::' as const;

export type FlowMapCanonicalItemId = `${string}${typeof FLOW_MAP_CANONICAL_ITEM_ID_SEPARATOR}${string}`;

export type EffectiveFlowMapRow = {
  itemId: FlowMapCanonicalItemId;
  flowSlug: string;
  flowTitle: string;
  stepId: string;
  title: string;
  destination: PrimaryDestination;
  stepTitle?: string;
  memo?: string;
  sourceUrl?: string;
  sourceTrace?: string;
  riskLevel?: RiskLevel;
  detailItemCount: number;
  detailItems: string[];
};

export type EffectiveFlowMapRecoveryInput = {
  canonicalCopyStatus?: CanonicalSavedCopyGroup['status'];
  personalConflictCount: number;
};

export type EffectiveFlowMapSnapshot = {
  schemaVersion: typeof EFFECTIVE_FLOW_MAP_SNAPSHOT_SCHEMA_VERSION;
  snapshotHash: string;
  identity: {
    mapId: string;
    sourceVersion: string;
    sourceTitle: string;
    sourceUrl: string;
    sourceLabel: string;
  };
  controller: {
    saveMode: FlowMapSaveMode;
    executionState: FlowMapExecutionState;
  };
  recovery: EffectiveFlowMapRecoveryInput;
  effectiveTitle: string;
  canonicalRows: EffectiveFlowMapRow[];
  rows: EffectiveFlowMapRow[];
  excludedRows: EffectiveFlowMapRow[];
  heldRows: EffectiveFlowMapRow[];
  itemIds: {
    canonical: FlowMapCanonicalItemId[];
    requested: FlowMapCanonicalItemId[];
    effective: FlowMapCanonicalItemId[];
    excluded: FlowMapCanonicalItemId[];
    held: FlowMapCanonicalItemId[];
  };
  counts: {
    canonical: number;
    effective: number;
    excluded: number;
    held: number;
  };
  riskLevels: RiskLevel[];
};

export type BuildEffectiveFlowMapSnapshotInput = {
  publishPackage: SourceBackedFlowMapPublishPackage;
  effectiveTitle?: string;
  selectedItemIds?: readonly string[];
  executionState: FlowMapExecutionState;
  sourceLabel?: string;
  recovery?: {
    canonicalCopyStatus?: CanonicalSavedCopyGroup['status'];
    personalConflictCount?: number;
  };
};

export type ReviseEffectiveFlowMapSnapshotInput = {
  effectiveTitle?: string;
  selectedItemIds?: readonly string[];
};

export type BuildFlowMapActionContractFromSnapshotOptions = {
  surface: FlowMapSurface;
  editable: boolean;
  exportable?: boolean;
  savedMapId?: string;
  highRiskCaution?: string;
};

export type EffectiveFlowMapPersistenceSelection = {
  mapId: string;
  snapshotHash: string;
  title: string;
  personalized: boolean;
  selectedItemIds: FlowMapCanonicalItemId[];
  includedStepIdsByFlow: Record<string, string[]>;
  excludedStepIdsByFlow: Record<string, string[]>;
  personalCopy: SourceBackedFlowMapPersonalCopy;
};

function assertNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must be non-empty`);
  return normalized;
}

export function buildFlowMapCanonicalItemId(
  flowSlug: string,
  stepId: string,
): FlowMapCanonicalItemId {
  const normalizedFlowSlug = assertNonEmpty(flowSlug, 'flowSlug');
  const normalizedStepId = assertNonEmpty(stepId, 'stepId');
  if (
    normalizedFlowSlug.includes(FLOW_MAP_CANONICAL_ITEM_ID_SEPARATOR)
    || normalizedStepId.includes(FLOW_MAP_CANONICAL_ITEM_ID_SEPARATOR)
  ) {
    throw new TypeError(
      `flowSlug and stepId must not contain "${FLOW_MAP_CANONICAL_ITEM_ID_SEPARATOR}"`,
    );
  }
  return `${normalizedFlowSlug}${FLOW_MAP_CANONICAL_ITEM_ID_SEPARATOR}${normalizedStepId}`;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function fingerprint(value: unknown): string {
  const input = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function cloneRow(row: EffectiveFlowMapRow): EffectiveFlowMapRow {
  return {
    ...row,
    detailItems: [...row.detailItems],
  };
}

function uniqueRiskLevels(levels: readonly (RiskLevel | undefined)[]): RiskLevel[] {
  return Array.from(new Set(levels.filter((level): level is RiskLevel => Boolean(level))));
}

function normalizeRecovery(
  recovery?: BuildEffectiveFlowMapSnapshotInput['recovery'],
): EffectiveFlowMapRecoveryInput {
  const personalConflictCount = recovery?.personalConflictCount ?? 0;
  if (!Number.isSafeInteger(personalConflictCount) || personalConflictCount < 0) {
    throw new RangeError('personalConflictCount must be a non-negative integer');
  }
  return {
    ...(recovery?.canonicalCopyStatus
      ? { canonicalCopyStatus: recovery.canonicalCopyStatus }
      : {}),
    personalConflictCount,
  };
}

function buildCanonicalRows(
  publishPackage: SourceBackedFlowMapPublishPackage,
): EffectiveFlowMapRow[] {
  const creatorRowByItemId = new Map<string, SourceBackedFlowMapPublishPackage['creator']['sourceRows'][number]>();
  publishPackage.creator.sourceRows.forEach((row) => {
    const itemId = buildFlowMapCanonicalItemId(row.flowSlug, row.stepId);
    if (creatorRowByItemId.has(itemId)) {
      throw new Error(`Duplicate creator Flow Map item ID: ${itemId}`);
    }
    creatorRowByItemId.set(itemId, row);
  });

  const seen = new Set<string>();
  return publishPackage.public.childFlows.flatMap((flow) => flow.steps.map((step) => {
    const itemId = buildFlowMapCanonicalItemId(flow.slug, step.id);
    if (seen.has(itemId)) throw new Error(`Duplicate public Flow Map item ID: ${itemId}`);
    seen.add(itemId);
    const creatorRow = creatorRowByItemId.get(itemId);
    return {
      itemId,
      flowSlug: flow.slug,
      flowTitle: flow.title,
      stepId: step.id,
      title: step.title,
      destination: flow.destination,
      ...(step.stepTitle ? { stepTitle: step.stepTitle } : {}),
      ...(step.memo ? { memo: step.memo } : {}),
      ...(step.sourceUrl || creatorRow?.sourceUrl
        ? { sourceUrl: step.sourceUrl ?? creatorRow?.sourceUrl }
        : {}),
      ...(step.sourceTrace ? { sourceTrace: step.sourceTrace } : {}),
      ...(creatorRow?.riskLevel ? { riskLevel: creatorRow.riskLevel } : {}),
      detailItemCount: step.detailItemCount,
      detailItems: [...step.detailItems],
    } satisfies EffectiveFlowMapRow;
  }));
}

function normalizeRequestedItemIds(
  canonicalRows: readonly EffectiveFlowMapRow[],
  selectedItemIds?: readonly string[],
): FlowMapCanonicalItemId[] {
  const canonicalIds = canonicalRows.map((row) => row.itemId);
  if (selectedItemIds === undefined) return canonicalIds;

  const canonicalSet = new Set<string>(canonicalIds);
  const requestedSet = new Set<string>();
  selectedItemIds.forEach((itemId, index) => {
    if (typeof itemId !== 'string' || !itemId) {
      throw new TypeError(`selectedItemIds[${index}] must be a non-empty string`);
    }
    if (!canonicalSet.has(itemId)) {
      throw new RangeError(`Unknown Flow Map item ID: ${itemId}`);
    }
    requestedSet.add(itemId);
  });
  return canonicalIds.filter((itemId) => requestedSet.has(itemId));
}

function materializeEffectiveFlowMapSnapshot(options: {
  identity: EffectiveFlowMapSnapshot['identity'];
  controller: EffectiveFlowMapSnapshot['controller'];
  recovery: EffectiveFlowMapRecoveryInput;
  effectiveTitle: string;
  canonicalRows: readonly EffectiveFlowMapRow[];
  selectedItemIds?: readonly string[];
  riskLevels: readonly RiskLevel[];
}): EffectiveFlowMapSnapshot {
  const canonicalRows = options.canonicalRows.map(cloneRow);
  const effectiveTitle = options.effectiveTitle.trim() || options.identity.sourceTitle;
  const requestedItemIds = normalizeRequestedItemIds(canonicalRows, options.selectedItemIds);
  const requestedSet = new Set<string>(requestedItemIds);
  const requestedRows = canonicalRows.filter((row) => requestedSet.has(row.itemId));
  const excludedRows = canonicalRows.filter((row) => !requestedSet.has(row.itemId));
  const reviewHold = options.controller.executionState === 'review_hold';
  const rows = reviewHold ? [] : requestedRows;
  const heldRows = reviewHold ? requestedRows : [];
  const riskLevels = [...options.riskLevels];
  const itemIds = {
    canonical: canonicalRows.map((row) => row.itemId),
    requested: requestedRows.map((row) => row.itemId),
    effective: rows.map((row) => row.itemId),
    excluded: excludedRows.map((row) => row.itemId),
    held: heldRows.map((row) => row.itemId),
  };
  const snapshotHash = fingerprint({
    schemaVersion: EFFECTIVE_FLOW_MAP_SNAPSHOT_SCHEMA_VERSION,
    identity: options.identity,
    controller: options.controller,
    recovery: options.recovery,
    effectiveTitle,
    canonicalRows,
    itemIds,
    riskLevels,
  });

  return {
    schemaVersion: EFFECTIVE_FLOW_MAP_SNAPSHOT_SCHEMA_VERSION,
    snapshotHash,
    identity: { ...options.identity },
    controller: { ...options.controller },
    recovery: { ...options.recovery },
    effectiveTitle,
    canonicalRows,
    rows,
    excludedRows,
    heldRows,
    itemIds,
    counts: {
      canonical: itemIds.canonical.length,
      effective: itemIds.effective.length,
      excluded: itemIds.excluded.length,
      held: itemIds.held.length,
    },
    riskLevels,
  };
}

export function buildEffectiveFlowMapSnapshot(
  input: BuildEffectiveFlowMapSnapshotInput,
): EffectiveFlowMapSnapshot {
  const { publishPackage } = input;
  const canonicalRows = buildCanonicalRows(publishPackage);
  const identity: EffectiveFlowMapSnapshot['identity'] = {
    mapId: assertNonEmpty(publishPackage.map.id, 'mapId'),
    sourceVersion: assertNonEmpty(publishPackage.map.version, 'sourceVersion'),
    sourceTitle: assertNonEmpty(publishPackage.map.title, 'sourceTitle'),
    sourceUrl: assertNonEmpty(publishPackage.public.sourceUrl, 'sourceUrl'),
    sourceLabel: input.sourceLabel?.trim() || '원문 보기',
  };
  return materializeEffectiveFlowMapSnapshot({
    identity,
    controller: {
      saveMode: publishPackage.public.saveMode,
      executionState: input.executionState,
    },
    recovery: normalizeRecovery(input.recovery),
    effectiveTitle: input.effectiveTitle ?? publishPackage.public.title,
    canonicalRows,
    selectedItemIds: input.selectedItemIds,
    riskLevels: uniqueRiskLevels(
      publishPackage.creator.sourceRows.map((row) => row.riskLevel),
    ),
  });
}

export function reviseEffectiveFlowMapSnapshot(
  snapshot: EffectiveFlowMapSnapshot,
  revision: ReviseEffectiveFlowMapSnapshotInput,
): EffectiveFlowMapSnapshot {
  return materializeEffectiveFlowMapSnapshot({
    identity: snapshot.identity,
    controller: snapshot.controller,
    recovery: snapshot.recovery,
    effectiveTitle: revision.effectiveTitle ?? snapshot.effectiveTitle,
    canonicalRows: snapshot.canonicalRows,
    selectedItemIds: revision.selectedItemIds ?? snapshot.itemIds.requested,
    riskLevels: snapshot.riskLevels,
  });
}

export function buildFlowMapActionContractFromSnapshot(
  snapshot: EffectiveFlowMapSnapshot,
  options: BuildFlowMapActionContractFromSnapshotOptions,
): FlowMapActionContract {
  return buildFlowMapActionContract({
    mapId: snapshot.identity.mapId,
    title: snapshot.effectiveTitle,
    sourceUrl: snapshot.identity.sourceUrl,
    sourceLabel: snapshot.identity.sourceLabel,
    surface: options.surface,
    saveMode: snapshot.controller.saveMode,
    executionState: snapshot.controller.executionState,
    editable: options.editable,
    exportable: options.exportable,
    ...(snapshot.controller.saveMode === 'save_all'
      ? {
          selection: {
            selectedCount: snapshot.itemIds.requested.length,
            totalCount: snapshot.itemIds.canonical.length,
            itemIds: [...snapshot.itemIds.requested],
          },
        }
      : {}),
    ...(options.savedMapId ? { savedMapId: options.savedMapId } : {}),
    riskLevels: snapshot.riskLevels,
    ...(options.highRiskCaution ? { highRiskCaution: options.highRiskCaution } : {}),
    ...(snapshot.recovery.canonicalCopyStatus
      ? { canonicalCopyStatus: snapshot.recovery.canonicalCopyStatus }
      : {}),
    personalConflictCount: snapshot.recovery.personalConflictCount,
  });
}

export function buildEffectiveFlowMapPersistenceSelection(
  snapshot: EffectiveFlowMapSnapshot,
): EffectiveFlowMapPersistenceSelection {
  if (snapshot.controller.executionState !== 'executable') {
    throw new Error('A review-hold Flow Map cannot build a persistence selection');
  }
  if (snapshot.controller.saveMode !== 'save_all') {
    throw new Error('A choose-child Flow Map must save through its selected child Flow');
  }
  if (snapshot.rows.length === 0) {
    throw new Error('A Flow Map persistence selection requires at least one effective item');
  }

  const effectiveIds = new Set<string>(snapshot.itemIds.effective);
  const includedStepIdsByFlow: Record<string, string[]> = {};
  const excludedStepIdsByFlow: Record<string, string[]> = {};
  snapshot.canonicalRows.forEach((row) => {
    const target = effectiveIds.has(row.itemId)
      ? includedStepIdsByFlow
      : excludedStepIdsByFlow;
    (target[row.flowSlug] ??= []).push(row.stepId);
  });
  const personalCopy: SourceBackedFlowMapPersonalCopy = {
    source: 'url_first_custom_start',
    originalTitle: snapshot.identity.sourceTitle,
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
  };

  return {
    mapId: snapshot.identity.mapId,
    snapshotHash: snapshot.snapshotHash,
    title: snapshot.effectiveTitle,
    personalized:
      snapshot.effectiveTitle !== snapshot.identity.sourceTitle
      || snapshot.counts.effective !== snapshot.counts.canonical,
    selectedItemIds: [...snapshot.itemIds.effective],
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
    personalCopy,
  };
}
