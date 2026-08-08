import type { EffectiveFlowSnapshot } from './effective-flow-snapshot';
import type {
  MyFlowLibraryControlVisibility,
  MyFlowLibraryFilter,
} from './my-flow-local-ia';

export const MY_FLOW_WORKSPACE_SNAPSHOT_SCHEMA_VERSION = 1 as const;

type EffectiveRow = EffectiveFlowSnapshot['committed']['rows'][number];
type EffectiveCapabilities = EffectiveFlowSnapshot['committed']['capabilities'];
type EffectiveCounts = EffectiveFlowSnapshot['committed']['counts'];
type EffectiveExportPlan = EffectiveFlowSnapshot['committed']['exportPlan'];

export type MyFlowWorkspaceItemTargetV1 = Readonly<{
  itemKey: string;
  itemDate?: string;
}>;

export type MyFlowWorkspaceItemTargetInputV1 = Readonly<{
  itemId: string;
  target: MyFlowWorkspaceItemTargetV1;
}>;

export type MyFlowWorkspaceFlowInputV1 = Readonly<{
  /** Personal saved-copy identity used by /my routes and storage ownership. */
  savedFlowSlug: string;
  /** Read-only effective source/personal/execution result. */
  effectiveSnapshot: EffectiveFlowSnapshot;
  done: number;
  total: number;
  archived: boolean;
  lastVisited?: string;
  itemTargets?: readonly MyFlowWorkspaceItemTargetInputV1[];
}>;

export type BuildMyFlowWorkspaceSnapshotOptionsV1 = Readonly<{
  flows: readonly MyFlowWorkspaceFlowInputV1[];
  library: Readonly<{
    query: string;
    filter: MyFlowLibraryFilter;
    /** Omit this value (or pass the legacy `all` sentinel) for the library. */
    selectedFlowSlug?: string;
    viewport: 'mobile' | 'wide';
    controls: MyFlowLibraryControlVisibility;
    /** Current runtime order after readiness, archive, and demo limits. */
    eligibleFlowSlugs: readonly string[];
    /** Current runtime order after query/filter selection. */
    filteredFlowSlugs: readonly string[];
    /** Current runtime order after the mobile inventory limit. */
    mobileFlowSlugs: readonly string[];
    hiddenMobileCount: number;
    mobileInventoryExpanded: boolean;
  }>;
}>;

export type MyFlowWorkspaceIntegrityDiagnosticCode =
  | 'ambiguous_selected_flow_slug'
  | 'duplicate_effective_item_id'
  | 'duplicate_item_target'
  | 'duplicate_library_flow_slug'
  | 'duplicate_saved_flow_slug'
  | 'invalid_item_target'
  | 'invalid_mobile_hidden_count'
  | 'invalid_progress_count'
  | 'missing_saved_flow_slug'
  | 'missing_selected_flow_slug'
  | 'orphan_item_target'
  | 'stale_selected_flow_slug'
  | 'unknown_library_flow_slug';

export type MyFlowWorkspaceIntegrityDiagnostic = Readonly<{
  code: MyFlowWorkspaceIntegrityDiagnosticCode;
  path: string;
  message: string;
}>;

export type MyFlowWorkspaceItemV1 = Readonly<{
  id: string;
  sourceItemId: string;
  ownership: EffectiveRow['ownership'];
  role: EffectiveRow['role'];
  completable: boolean;
  title: string;
  description?: string;
  memo?: string;
  completionCriterion?: string;
  section?: string;
  orderRank: number;
  included: boolean;
  completed: boolean;
  schedule: Readonly<{
    state: EffectiveRow['schedule']['state'];
    date?: string;
    repeatRule?: string;
  }>;
  resources: ReadonlyArray<Readonly<{
    label: string;
    url: string;
    type: string;
  }>>;
  caution?: string;
  eligibleShapes: readonly EffectiveRow['eligibleShapes'][number][];
  targets: readonly MyFlowWorkspaceItemTargetV1[];
}>;

export type MyFlowWorkspaceFlowV1 = Readonly<{
  identity: Readonly<{
    savedFlowSlug: string;
    sourceFlowId: string;
    sourceFlowSlug: string;
  }>;
  versions: Readonly<{
    source: string;
    personal: string;
    execution: string;
  }>;
  sourceItemIds: readonly string[];
  title: string;
  archived: boolean;
  lastVisited?: string;
  progress: Readonly<{
    done: number;
    total: number;
    percent: number;
    state: 'open' | 'done';
  }>;
  dateIntent: EffectiveFlowSnapshot['dateIntent'];
  result: Readonly<{
    selectedShape: EffectiveFlowSnapshot['committed']['selectedShape'];
    selectedArtifactMode: EffectiveFlowSnapshot['committed']['selectedArtifactMode'];
    label: string;
    dateState: EffectiveFlowSnapshot['committed']['dateState'];
    counts: EffectiveCounts;
    capabilities: EffectiveCapabilities;
    exportPlan: EffectiveExportPlan;
    items: readonly MyFlowWorkspaceItemV1[];
    excludedItems: readonly MyFlowWorkspaceItemV1[];
  }>;
}>;

export type MyFlowWorkspaceSelectionV1 =
  | Readonly<{ kind: 'library' }>
  | Readonly<{ kind: 'flow'; savedFlowSlug: string }>;

export type MyFlowWorkspaceSnapshotV1 = Readonly<{
  schemaVersion: typeof MY_FLOW_WORKSPACE_SNAPSHOT_SCHEMA_VERSION;
  source: 'effective_flow_snapshot';
  writeOwner: 'none';
  flows: readonly MyFlowWorkspaceFlowV1[];
  selection: MyFlowWorkspaceSelectionV1;
  library: Readonly<{
    query: string;
    filter: MyFlowLibraryFilter;
    viewport: 'mobile' | 'wide';
    controls: MyFlowLibraryControlVisibility;
    eligibleFlowSlugs: readonly string[];
    filteredFlowSlugs: readonly string[];
    mobileFlowSlugs: readonly string[];
    hiddenMobileCount: number;
    mobileInventoryExpanded: boolean;
  }>;
  integrity: Readonly<{
    status: 'ok' | 'degraded';
    diagnostics: readonly MyFlowWorkspaceIntegrityDiagnostic[];
  }>;
}>;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneDateIntent(
  dateIntent: EffectiveFlowSnapshot['dateIntent'],
): EffectiveFlowSnapshot['dateIntent'] {
  return {
    mode: dateIntent.mode,
    persistedMode: dateIntent.persistedMode,
    previewAnchor: dateIntent.previewAnchor,
    ...(dateIntent.savedAnchor !== undefined
      ? { savedAnchor: dateIntent.savedAnchor }
      : {}),
    previewScheduleState: dateIntent.previewScheduleState,
    primaryAction: { ...dateIntent.primaryAction },
    allowExplicitUndatedSave: dateIntent.allowExplicitUndatedSave,
    canSave: dateIntent.canSave,
    calendarEligible: dateIntent.calendarEligible,
    previewOnly: dateIntent.previewOnly,
  };
}

function cloneCapabilities(capabilities: EffectiveCapabilities): EffectiveCapabilities {
  return {
    canEdit: capabilities.canEdit,
    canSave: capabilities.canSave,
    canExport: capabilities.canExport,
    canComplete: capabilities.canComplete,
    hasDirectSource: capabilities.hasDirectSource,
    hasRiskCaution: capabilities.hasRiskCaution,
    needsRecovery: capabilities.needsRecovery,
  };
}

function cloneCounts(counts: EffectiveCounts): EffectiveCounts {
  return {
    total: counts.total,
    dated: counts.dated,
    undated: counts.undated,
    calendar: counts.calendar,
  };
}

function cloneExportPlan(exportPlan: EffectiveExportPlan): EffectiveExportPlan {
  const cloneFormat = (
    format: EffectiveExportPlan['formats'][keyof EffectiveExportPlan['formats']],
  ) => ({
    supported: format.supported,
    outputCount: format.outputCount,
    preservesItemOrder: format.preservesItemOrder,
    omittedItemIds: [...format.omittedItemIds],
    omittedFields: format.omittedFields.map((omission) => ({
      field: omission.field,
      itemIds: [...omission.itemIds],
      reason: omission.reason,
    })),
    ...(format.omissionReason !== undefined
      ? { omissionReason: format.omissionReason }
      : {}),
  });

  return {
    supportedDestinations: [...exportPlan.supportedDestinations],
    formats: {
      calendar: cloneFormat(exportPlan.formats.calendar),
      checklist: cloneFormat(exportPlan.formats.checklist),
      sheet: cloneFormat(exportPlan.formats.sheet),
      memo: cloneFormat(exportPlan.formats.memo),
    },
  };
}

function cloneItem(
  row: EffectiveRow,
  targets: readonly MyFlowWorkspaceItemTargetV1[],
): MyFlowWorkspaceItemV1 {
  return {
    id: row.id,
    sourceItemId: row.sourceItemId,
    ownership: row.ownership,
    role: row.role,
    completable: row.completable,
    title: row.title,
    ...(row.description !== undefined ? { description: row.description } : {}),
    ...(row.memo !== undefined ? { memo: row.memo } : {}),
    ...(row.completionCriterion !== undefined
      ? { completionCriterion: row.completionCriterion }
      : {}),
    ...(row.section !== undefined ? { section: row.section } : {}),
    orderRank: row.orderRank,
    included: row.included,
    completed: row.completed,
    schedule: {
      state: row.schedule.state,
      ...(row.schedule.date !== undefined ? { date: row.schedule.date } : {}),
      ...(row.schedule.repeatRule !== undefined
        ? { repeatRule: row.schedule.repeatRule }
        : {}),
    },
    resources: row.resources.map((resource) => ({ ...resource })),
    ...(row.caution !== undefined ? { caution: row.caution } : {}),
    eligibleShapes: [...row.eligibleShapes],
    targets: targets.map((target) => ({
      itemKey: target.itemKey,
      ...(target.itemDate !== undefined ? { itemDate: target.itemDate } : {}),
    })),
  };
}

function normalizeNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function sortDiagnostics(
  diagnostics: MyFlowWorkspaceIntegrityDiagnostic[],
): MyFlowWorkspaceIntegrityDiagnostic[] {
  return diagnostics.slice().sort((left, right) => (
    compareText(left.path, right.path)
    || compareText(left.code, right.code)
    || compareText(left.message, right.message)
  ));
}

function buildFlow(
  input: MyFlowWorkspaceFlowInputV1,
  inputIndex: number,
  diagnostics: MyFlowWorkspaceIntegrityDiagnostic[],
): MyFlowWorkspaceFlowV1 {
  const savedFlowSlug = input.savedFlowSlug.trim();
  const targetsByItemId = new Map<string, MyFlowWorkspaceItemTargetV1[]>();
  const targetIdentityByItemId = new Map<string, Set<string>>();
  const allRows = [
    ...input.effectiveSnapshot.committed.rows,
    ...input.effectiveSnapshot.committed.excludedRows,
  ];
  const effectiveItemIds = new Set<string>();

  allRows.forEach((row) => {
    if (effectiveItemIds.has(row.id)) {
      diagnostics.push({
        code: 'duplicate_effective_item_id',
        path: `flows[${inputIndex}].effectiveSnapshot.committed.rows`,
        message: `Effective item ID "${row.id}" appears more than once.`,
      });
    }
    effectiveItemIds.add(row.id);
  });

  (input.itemTargets ?? []).forEach((entry, targetIndex) => {
    const itemId = entry.itemId.trim();
    const itemKey = entry.target.itemKey.trim();
    if (!itemId || !itemKey) {
      diagnostics.push({
        code: 'invalid_item_target',
        path: `flows[${inputIndex}].itemTargets[${targetIndex}]`,
        message: 'Item targets require non-empty itemId and itemKey values.',
      });
      return;
    }
    const itemDate = entry.target.itemDate?.trim();
    const normalizedTarget: MyFlowWorkspaceItemTargetV1 = {
      itemKey,
      ...(itemDate && LOCAL_DATE_PATTERN.test(itemDate) ? { itemDate } : {}),
    };
    const targetIdentity = `${normalizedTarget.itemKey}\u0000${normalizedTarget.itemDate ?? ''}`;
    const targetIdentities = targetIdentityByItemId.get(itemId) ?? new Set<string>();
    if (targetIdentities.has(targetIdentity)) {
      diagnostics.push({
        code: 'duplicate_item_target',
        path: `flows[${inputIndex}].itemTargets[${targetIndex}]`,
        message: `Duplicate route target for item "${itemId}" was omitted.`,
      });
      return;
    }
    if (itemDate && !LOCAL_DATE_PATTERN.test(itemDate)) {
      diagnostics.push({
        code: 'invalid_item_target',
        path: `flows[${inputIndex}].itemTargets[${targetIndex}].target.itemDate`,
        message: `Invalid route date "${itemDate}" was omitted.`,
      });
    }
    targetIdentities.add(targetIdentity);
    targetIdentityByItemId.set(itemId, targetIdentities);
    targetsByItemId.set(itemId, [
      ...(targetsByItemId.get(itemId) ?? []),
      normalizedTarget,
    ]);
  });

  targetsByItemId.forEach((_targets, itemId) => {
    if (!effectiveItemIds.has(itemId)) {
      diagnostics.push({
        code: 'orphan_item_target',
        path: `flows[${inputIndex}].itemTargets`,
        message: `Route target for unknown item "${itemId}" was ignored.`,
      });
      targetsByItemId.delete(itemId);
    }
  });

  const normalizedTotal = normalizeNonNegativeInteger(input.total);
  const normalizedDone = Math.min(
    normalizeNonNegativeInteger(input.done),
    normalizedTotal,
  );
  if (normalizedDone !== input.done || normalizedTotal !== input.total) {
    diagnostics.push({
      code: 'invalid_progress_count',
      path: `flows[${inputIndex}].progress`,
      message: 'Progress counts were normalized to finite non-negative integers with done not exceeding total.',
    });
  }

  const snapshot = input.effectiveSnapshot;
  return {
    identity: {
      savedFlowSlug,
      sourceFlowId: snapshot.identity.flowId,
      sourceFlowSlug: snapshot.identity.flowSlug,
    },
    versions: {
      source: snapshot.layers.source.version,
      personal: snapshot.layers.personal.version,
      execution: snapshot.layers.execution.version,
    },
    sourceItemIds: [...snapshot.layers.source.itemIds],
    title: snapshot.effectiveTitle,
    archived: input.archived,
    ...(input.lastVisited !== undefined
      ? { lastVisited: input.lastVisited }
      : {}),
    progress: {
      done: normalizedDone,
      total: normalizedTotal,
      percent: normalizedTotal
        ? Math.round((normalizedDone / normalizedTotal) * 100)
        : 0,
      state: normalizedDone >= normalizedTotal ? 'done' : 'open',
    },
    dateIntent: cloneDateIntent(snapshot.dateIntent),
    result: {
      selectedShape: snapshot.committed.selectedShape,
      selectedArtifactMode: snapshot.committed.selectedArtifactMode,
      label: snapshot.committed.label,
      dateState: snapshot.committed.dateState,
      counts: cloneCounts(snapshot.committed.counts),
      capabilities: cloneCapabilities(snapshot.committed.capabilities),
      exportPlan: cloneExportPlan(snapshot.committed.exportPlan),
      items: snapshot.committed.rows.map((row) => (
        cloneItem(row, targetsByItemId.get(row.id) ?? [])
      )),
      excludedItems: snapshot.committed.excludedRows.map((row) => (
        cloneItem(row, targetsByItemId.get(row.id) ?? [])
      )),
    },
  };
}

function normalizeLibrarySlugs(
  values: readonly string[],
  path: string,
  knownFlowSlugs: ReadonlySet<string>,
  diagnostics: MyFlowWorkspaceIntegrityDiagnostic[],
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  values.forEach((value, index) => {
    const slug = value.trim();
    if (seen.has(slug)) {
      diagnostics.push({
        code: 'duplicate_library_flow_slug',
        path: `${path}[${index}]`,
        message: `Duplicate library Flow "${slug}" was omitted.`,
      });
      return;
    }
    seen.add(slug);
    if (!slug || !knownFlowSlugs.has(slug)) {
      diagnostics.push({
        code: 'unknown_library_flow_slug',
        path: `${path}[${index}]`,
        message: slug
          ? `Unknown library Flow "${slug}" was omitted.`
          : 'Empty library Flow identity was omitted.',
      });
      return;
    }
    normalized.push(slug);
  });
  return normalized;
}

/**
 * Creates a read-only, JSON-safe experiment projection. It never persists,
 * migrates, or mutates canonical source, personal, execution, or receipt data.
 * Integrity drift is reported in-band so the established classic route can
 * remain available instead of failing during an internal UX experiment.
 */
export function buildMyFlowWorkspaceSnapshot(
  options: BuildMyFlowWorkspaceSnapshotOptionsV1,
): MyFlowWorkspaceSnapshotV1 {
  const diagnostics: MyFlowWorkspaceIntegrityDiagnostic[] = [];
  const firstInputBySavedSlug = new Map<string, {
    input: MyFlowWorkspaceFlowInputV1;
    index: number;
  }>();
  const duplicateSavedSlugs = new Set<string>();

  options.flows.forEach((input, index) => {
    const savedFlowSlug = input.savedFlowSlug.trim();
    if (!savedFlowSlug) {
      diagnostics.push({
        code: 'missing_saved_flow_slug',
        path: `flows[${index}].savedFlowSlug`,
        message: 'A Flow without a personal saved-copy identity was omitted.',
      });
      return;
    }
    if (firstInputBySavedSlug.has(savedFlowSlug)) {
      duplicateSavedSlugs.add(savedFlowSlug);
      diagnostics.push({
        code: 'duplicate_saved_flow_slug',
        path: `flows[${index}].savedFlowSlug`,
        message: `The first Flow for saved identity "${savedFlowSlug}" was retained.`,
      });
      return;
    }
    firstInputBySavedSlug.set(savedFlowSlug, { input, index });
  });

  const flows = Array.from(firstInputBySavedSlug.entries())
    .sort(([left], [right]) => compareText(left, right))
    .map(([, entry]) => buildFlow(entry.input, entry.index, diagnostics));
  const knownFlowSlugs = new Set(
    flows.map((flow) => flow.identity.savedFlowSlug),
  );
  const eligibleFlowSlugs = normalizeLibrarySlugs(
    options.library.eligibleFlowSlugs,
    'library.eligibleFlowSlugs',
    knownFlowSlugs,
    diagnostics,
  );
  const filteredFlowSlugs = normalizeLibrarySlugs(
    options.library.filteredFlowSlugs,
    'library.filteredFlowSlugs',
    knownFlowSlugs,
    diagnostics,
  );
  const mobileFlowSlugs = normalizeLibrarySlugs(
    options.library.mobileFlowSlugs,
    'library.mobileFlowSlugs',
    knownFlowSlugs,
    diagnostics,
  );

  const rawSelection = options.library.selectedFlowSlug;
  const requestedSelection = rawSelection?.trim() ?? '';
  let selection: MyFlowWorkspaceSelectionV1 = { kind: 'library' };
  if (rawSelection !== undefined && !requestedSelection) {
    diagnostics.push({
      code: 'missing_selected_flow_slug',
      path: 'library.selectedFlowSlug',
      message: 'An empty selected Flow identity fell back to the library.',
    });
  } else if (requestedSelection && requestedSelection !== 'all') {
    if (!knownFlowSlugs.has(requestedSelection)) {
      diagnostics.push({
        code: 'stale_selected_flow_slug',
        path: 'library.selectedFlowSlug',
        message: `Unknown selected Flow "${requestedSelection}" fell back to the library.`,
      });
    } else {
      selection = { kind: 'flow', savedFlowSlug: requestedSelection };
      if (duplicateSavedSlugs.has(requestedSelection)) {
        diagnostics.push({
          code: 'ambiguous_selected_flow_slug',
          path: 'library.selectedFlowSlug',
          message: `Selection "${requestedSelection}" matched duplicate inputs; the retained first Flow is used.`,
        });
      }
    }
  }

  const hiddenMobileCount = normalizeNonNegativeInteger(
    options.library.hiddenMobileCount,
  );
  if (hiddenMobileCount !== options.library.hiddenMobileCount) {
    diagnostics.push({
      code: 'invalid_mobile_hidden_count',
      path: 'library.hiddenMobileCount',
      message: 'The hidden mobile count was normalized to a finite non-negative integer.',
    });
  }

  const sortedDiagnostics = sortDiagnostics(diagnostics);
  return {
    schemaVersion: MY_FLOW_WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
    source: 'effective_flow_snapshot',
    writeOwner: 'none',
    flows,
    selection,
    library: {
      query: options.library.query,
      filter: options.library.filter,
      viewport: options.library.viewport,
      controls: {
        search: options.library.controls.search,
        filters: options.library.controls.filters,
        mode: options.library.controls.mode,
      },
      eligibleFlowSlugs,
      filteredFlowSlugs,
      mobileFlowSlugs,
      hiddenMobileCount,
      mobileInventoryExpanded: options.library.mobileInventoryExpanded,
    },
    integrity: {
      status: sortedDiagnostics.length > 0 ? 'degraded' : 'ok',
      diagnostics: sortedDiagnostics,
    },
  };
}
