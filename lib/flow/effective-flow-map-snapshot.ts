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
  SourceBackedFlowMapPersonalCopyStepOverride,
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
  /** A session-only concrete date override. Source scheduling stays in canonicalRows. */
  date?: string;
  sourceUrl?: string;
  sourceTrace?: string;
  riskLevel?: RiskLevel;
  detailItemCount: number;
  detailItems: string[];
};

export type EffectiveFlowMapItemPersonalization = {
  title?: string;
  /** Public editor detail text; persisted as the private userMemo layer. */
  detail?: string;
  /** A concrete YYYY-MM-DD override; source-relative scheduling is not rewritten. */
  date?: string;
};

export type EffectiveFlowMapItemPersonalizationPatch = Readonly<Record<
  string,
  EffectiveFlowMapItemPersonalization | null | undefined
>>;

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
  /** Immutable source baseline. Personal edits are materialized only in the effective row arrays. */
  canonicalRows: EffectiveFlowMapRow[];
  /** Session-only deltas keyed by canonical Flow Map Item ID. */
  itemPersonalizations: Record<FlowMapCanonicalItemId, EffectiveFlowMapItemPersonalization>;
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
  itemPersonalizations?: Readonly<Record<string, EffectiveFlowMapItemPersonalization>>;
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
  /** Merges into the current session draft. null removes one Item personalization. */
  itemPersonalizations?: EffectiveFlowMapItemPersonalizationPatch;
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
  stepOverridesByFlow: Record<string, Record<string, SourceBackedFlowMapPersonalCopyStepOverride>>;
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

function cloneItemPersonalization(
  personalization: EffectiveFlowMapItemPersonalization,
): EffectiveFlowMapItemPersonalization {
  return { ...personalization };
}

function isPlainDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3]);
}

function normalizeItemPersonalizations(
  canonicalRows: readonly EffectiveFlowMapRow[],
  personalizations?: Readonly<Record<string, EffectiveFlowMapItemPersonalization | null | undefined>>,
): Record<FlowMapCanonicalItemId, EffectiveFlowMapItemPersonalization> {
  if (!personalizations) return {};
  const canonicalRowById = new Map(canonicalRows.map((row) => [row.itemId, row] as const));
  const normalized = {} as Record<FlowMapCanonicalItemId, EffectiveFlowMapItemPersonalization>;

  Object.entries(personalizations).forEach(([itemId, personalization]) => {
    const canonicalRow = canonicalRowById.get(itemId as FlowMapCanonicalItemId);
    if (!canonicalRow) throw new RangeError(`Unknown Flow Map item ID: ${itemId}`);
    if (personalization === null || personalization === undefined) return;
    if (typeof personalization !== 'object' || Array.isArray(personalization)) {
      throw new TypeError(`Item personalization for ${itemId} must be an object`);
    }

    const title = personalization.title?.replace(/\s+/gu, ' ').trim();
    const detail = personalization.detail?.trim();
    const date = personalization.date?.trim();
    if (date && !isPlainDate(date)) {
      throw new RangeError(`Item personalization date for ${itemId} must be YYYY-MM-DD`);
    }
    const next: EffectiveFlowMapItemPersonalization = {
      ...(title && title !== canonicalRow.title ? { title } : {}),
      ...(detail ? { detail } : {}),
      ...(date ? { date } : {}),
    };
    if (Object.keys(next).length > 0) {
      normalized[canonicalRow.itemId] = next;
    }
  });

  return normalized;
}

function materializeRow(
  canonicalRow: EffectiveFlowMapRow,
  personalization?: EffectiveFlowMapItemPersonalization,
): EffectiveFlowMapRow {
  const row = cloneRow(canonicalRow);
  if (!personalization) return row;
  if (personalization.title) row.title = personalization.title;
  if (personalization.detail) row.memo = personalization.detail;
  if (personalization.date) row.date = personalization.date;
  return row;
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
  const requested: FlowMapCanonicalItemId[] = [];
  const requestedSet = new Set<string>();
  selectedItemIds.forEach((itemId, index) => {
    if (typeof itemId !== 'string' || !itemId) {
      throw new TypeError(`selectedItemIds[${index}] must be a non-empty string`);
    }
    if (!canonicalSet.has(itemId)) {
      throw new RangeError(`Unknown Flow Map item ID: ${itemId}`);
    }
    if (!requestedSet.has(itemId)) {
      requestedSet.add(itemId);
      requested.push(itemId as FlowMapCanonicalItemId);
    }
  });
  return requested;
}

function materializeEffectiveFlowMapSnapshot(options: {
  identity: EffectiveFlowMapSnapshot['identity'];
  controller: EffectiveFlowMapSnapshot['controller'];
  recovery: EffectiveFlowMapRecoveryInput;
  effectiveTitle: string;
  canonicalRows: readonly EffectiveFlowMapRow[];
  selectedItemIds?: readonly string[];
  itemPersonalizations?: Readonly<Record<string, EffectiveFlowMapItemPersonalization | null | undefined>>;
  riskLevels: readonly RiskLevel[];
}): EffectiveFlowMapSnapshot {
  const canonicalRows = options.canonicalRows.map(cloneRow);
  const effectiveTitle = options.effectiveTitle.trim() || options.identity.sourceTitle;
  const requestedItemIds = normalizeRequestedItemIds(canonicalRows, options.selectedItemIds);
  const requestedSet = new Set<string>(requestedItemIds);
  const canonicalRowById = new Map(canonicalRows.map((row) => [row.itemId, row] as const));
  const itemPersonalizations = normalizeItemPersonalizations(
    canonicalRows,
    options.itemPersonalizations,
  );
  const requestedRows = requestedItemIds.map((itemId) => materializeRow(
    canonicalRowById.get(itemId)!,
    itemPersonalizations[itemId],
  ));
  const excludedRows = canonicalRows
    .filter((row) => !requestedSet.has(row.itemId))
    .map((row) => materializeRow(row, itemPersonalizations[row.itemId]));
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
    ...(Object.keys(itemPersonalizations).length > 0 ? { itemPersonalizations } : {}),
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
    itemPersonalizations: Object.fromEntries(
      Object.entries(itemPersonalizations).map(([itemId, personalization]) => [
        itemId,
        cloneItemPersonalization(personalization),
      ]),
    ) as Record<FlowMapCanonicalItemId, EffectiveFlowMapItemPersonalization>,
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
    itemPersonalizations: input.itemPersonalizations,
    riskLevels: uniqueRiskLevels(
      publishPackage.creator.sourceRows.map((row) => row.riskLevel),
    ),
  });
}

export function reviseEffectiveFlowMapSnapshot(
  snapshot: EffectiveFlowMapSnapshot,
  revision: ReviseEffectiveFlowMapSnapshotInput,
): EffectiveFlowMapSnapshot {
  const itemPersonalizations = revision.itemPersonalizations === undefined
    ? snapshot.itemPersonalizations
    : {
        ...snapshot.itemPersonalizations,
        ...revision.itemPersonalizations,
      };
  return materializeEffectiveFlowMapSnapshot({
    identity: snapshot.identity,
    controller: snapshot.controller,
    recovery: snapshot.recovery,
    effectiveTitle: revision.effectiveTitle ?? snapshot.effectiveTitle,
    canonicalRows: snapshot.canonicalRows,
    selectedItemIds: revision.selectedItemIds ?? snapshot.itemIds.requested,
    itemPersonalizations,
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
  snapshot.rows.forEach((row) => {
    (includedStepIdsByFlow[row.flowSlug] ??= []).push(row.stepId);
  });
  snapshot.canonicalRows.forEach((row) => {
    if (!effectiveIds.has(row.itemId)) {
      (excludedStepIdsByFlow[row.flowSlug] ??= []).push(row.stepId);
    }
  });
  const stepOverridesByFlow: Record<
    string,
    Record<string, SourceBackedFlowMapPersonalCopyStepOverride>
  > = {};
  // Keep private Item edits even when the Item is excluded from this saved
  // selection. The inclusion owner and the Item-value owner are independent;
  // dropping the override here would make a later re-include lose the user's
  // title or memo.
  snapshot.canonicalRows.forEach((row) => {
    const personalization = snapshot.itemPersonalizations[row.itemId];
    if (!personalization) return;
    const override: SourceBackedFlowMapPersonalCopyStepOverride = {
      ...(personalization.title ? { title: personalization.title } : {}),
      ...(personalization.detail ? { userMemo: personalization.detail } : {}),
      ...(personalization.date
        ? { schedule: { mode: 'fixed_date', date: personalization.date } }
        : {}),
    };
    if (Object.keys(override).length > 0) {
      (stepOverridesByFlow[row.flowSlug] ??= {})[row.stepId] = override;
    }
  });
  const personalCopy: SourceBackedFlowMapPersonalCopy = {
    source: 'url_first_custom_start',
    originalTitle: snapshot.identity.sourceTitle,
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
    ...(Object.keys(stepOverridesByFlow).length > 0 ? { stepOverridesByFlow } : {}),
  };

  const canonicalOrder = snapshot.itemIds.canonical;
  const hasSelectionOrOrderChange = canonicalOrder.length !== snapshot.itemIds.effective.length
    || canonicalOrder.some((itemId, index) => snapshot.itemIds.effective[index] !== itemId);
  const hasItemOverrides = Object.keys(stepOverridesByFlow).length > 0;

  return {
    mapId: snapshot.identity.mapId,
    snapshotHash: snapshot.snapshotHash,
    title: snapshot.effectiveTitle,
    personalized:
      snapshot.effectiveTitle !== snapshot.identity.sourceTitle
      || hasSelectionOrOrderChange
      || hasItemOverrides,
    selectedItemIds: [...snapshot.itemIds.effective],
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
    stepOverridesByFlow,
    personalCopy,
  };
}
