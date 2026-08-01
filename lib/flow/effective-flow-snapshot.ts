import {
  buildArtifactRecommendationVM,
} from './artifact-recommendation';
import {
  buildFlowExperienceProjection,
  type FlowExperienceProjection,
  type FlowExperienceProjectionRow,
  type FlowExperienceShape,
  type FlowExperienceShapeProjection,
} from './flow-experience-projection';
import {
  buildPublicFlowExperienceItemOverrides,
  type PublicItemPersonalization,
} from './public-item-personalization';
import type { PublicDateIntentResolution } from './public-date-intent';
import type {
  SavedFlowArtifactMode,
  SavedFlowRecord,
} from './storage';
import type {
  FlowBundle,
  FlowComparisonState,
  FlowItemState,
  FlowWorkbenchState,
  ReactionLog,
} from './types';

export const EFFECTIVE_FLOW_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type EffectiveFlowJsonValue =
  | null
  | boolean
  | number
  | string
  | EffectiveFlowJsonValue[]
  | { [key: string]: EffectiveFlowJsonValue };

/**
 * Compatibility boundary for a saved surface that has already resolved its
 * legacy personal and execution stores. The resolver still validates the row
 * partition and rebuilds every shape/count from these rows; callers must not
 * pass a consumer-specific projection.
 */
export type EffectiveFlowResolvedRowsInput = {
  included: readonly FlowExperienceProjectionRow[];
  excluded: readonly FlowExperienceProjectionRow[];
  selectedArtifactMode?: SavedFlowArtifactMode;
  personalOverlayIdentity?: EffectiveFlowJsonValue;
};

export type EffectiveFlowDateState =
  | 'provisional'
  | 'custom'
  | 'undated'
  | 'mixed';

export type EffectiveFlowExportDestination =
  | 'calendar'
  | 'checklist'
  | 'sheet'
  | 'memo';

export type EffectiveFlowOmittedField =
  | 'item_title'
  | 'item_detail'
  | 'item_date'
  | 'item_inclusion'
  | 'item_order';

export type EffectiveFlowFieldOmission = {
  field: EffectiveFlowOmittedField;
  itemIds: string[];
  reason: string;
};

export type EffectiveFlowFormatPlan = {
  supported: boolean;
  outputCount: number;
  preservesItemOrder: boolean;
  omittedItemIds: string[];
  omittedFields: EffectiveFlowFieldOmission[];
  omissionReason?: string;
};

export type EffectiveFlowExportPlan = {
  supportedDestinations: EffectiveFlowExportDestination[];
  formats: Record<EffectiveFlowExportDestination, EffectiveFlowFormatPlan>;
};

export type EffectiveFlowCapabilities = {
  canEdit: boolean;
  canSave: boolean;
  canExport: boolean;
  canComplete: boolean;
  hasDirectSource: boolean;
  hasRiskCaution: boolean;
  needsRecovery: boolean;
};

export type EffectiveFlowResultCounts = {
  total: number;
  dated: number;
  undated: number;
  calendar: number;
};

export type EffectiveFlowResult = {
  projection: FlowExperienceProjection;
  selectedShape: FlowExperienceShape;
  selectedArtifactMode: SavedFlowArtifactMode;
  label: string;
  rows: FlowExperienceProjectionRow[];
  excludedRows: FlowExperienceProjectionRow[];
  counts: EffectiveFlowResultCounts;
  dateState: EffectiveFlowDateState;
  exportPlan: EffectiveFlowExportPlan;
  capabilities: EffectiveFlowCapabilities;
};

export type EffectiveFlowSavedRecordInput = Omit<
  SavedFlowRecord,
  'slug' | 'savedAt'
>;

export type EffectiveFlowSnapshot = {
  schemaVersion: typeof EFFECTIVE_FLOW_SNAPSHOT_SCHEMA_VERSION;
  identity: {
    flowId: string;
    flowSlug: string;
  };
  sourceVersion: string;
  layers: {
    source: {
      version: string;
      flowId: string;
      itemIds: string[];
    };
    personal: {
      version: string;
      state: 'working' | 'persisted';
    };
    execution: {
      version: string;
      completedItemIds: string[];
    };
  };
  effectiveTitle: string;
  dateIntent: PublicDateIntentResolution;
  illustrative?: EffectiveFlowResult;
  committed: EffectiveFlowResult;
  savedFlowRecordInput: EffectiveFlowSavedRecordInput;
};

export type EffectiveFlowExecutionOverlayIdentity = {
  workbenchState?: FlowWorkbenchState;
  comparisonState?: FlowComparisonState;
  reactionLogs?: Record<string, ReactionLog>;
  runHistoryVersion?: string;
  /** JSON-safe identity for checks, subchecks, occurrences, notes, and runs. */
  readModelIdentity?: EffectiveFlowJsonValue;
};

export type BuildEffectiveFlowSnapshotOptions = {
  bundle: FlowBundle;
  effectiveTitle: string;
  dateIntent: PublicDateIntentResolution;
  itemStates?: Record<string, FlowItemState>;
  publicItemPersonalizations?: Record<string, PublicItemPersonalization>;
  orderOverride?: string[];
  completedItemIds?: string[];
  personalLayerState?: 'working' | 'persisted';
  completionEnabled?: boolean;
  recoveryRequired?: boolean;
  editable?: boolean;
  executionOverlayIdentity?: EffectiveFlowExecutionOverlayIdentity;
  resolvedRows?: EffectiveFlowResolvedRowsInput;
};

const EFFECTIVE_FLOW_SHAPES: FlowExperienceShape[] = [
  'flow_execution',
  'calendar',
  'checklist',
  'sheet',
  'memo',
];

function assertJsonSafe(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): asserts value is EffectiveFlowJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite JSON numbers.`);
    }
    return;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${path} must be JSON-safe.`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} must not contain a circular reference.`);
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertJsonSafe(entry, `${path}[${index}]`, ancestors);
    });
    ancestors.delete(value);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must contain only JSON objects and arrays.`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new TypeError(`${path} must not contain symbol keys.`);
    }
    assertJsonSafe(
      (value as Record<string, unknown>)[key],
      `${path}.${key}`,
      ancestors,
    );
  }
  ancestors.delete(value);
}

function cloneResolvedRow(
  row: FlowExperienceProjectionRow,
): FlowExperienceProjectionRow {
  return {
    ...row,
    schedule: { ...row.schedule },
    resources: row.resources.map((resource) => ({ ...resource })),
    eligibleShapes: [...row.eligibleShapes],
  };
}

function validateResolvedRow(
  row: FlowExperienceProjectionRow,
  expectedIncluded: boolean,
  path: string,
): FlowExperienceProjectionRow {
  if (!row || typeof row !== 'object') {
    throw new TypeError(`${path} must be a resolved Flow Item row.`);
  }
  if (!row.id || row.id !== row.id.trim()) {
    throw new Error(`${path} requires a stable non-blank id.`);
  }
  if (!row.sourceItemId || row.sourceItemId !== row.sourceItemId.trim()) {
    throw new Error(`${path} requires a stable non-blank sourceItemId.`);
  }
  if (row.included !== expectedIncluded) {
    throw new Error(
      `${path} included flag mismatch: expected ${String(expectedIncluded)}.`,
    );
  }
  if (!Number.isFinite(row.orderRank)) {
    throw new Error(`${path} requires a finite orderRank.`);
  }
  if (!Array.isArray(row.resources) || !Array.isArray(row.eligibleShapes)) {
    throw new TypeError(`${path} requires resources and eligibleShapes arrays.`);
  }
  const invalidShape = row.eligibleShapes.find(
    (shape) => !EFFECTIVE_FLOW_SHAPES.includes(shape),
  );
  if (invalidShape) {
    throw new Error(`${path} contains an unsupported eligible shape.`);
  }
  return cloneResolvedRow(row);
}

function buildProjectionFromResolvedRows(
  bundle: FlowBundle,
  input: EffectiveFlowResolvedRowsInput,
): FlowExperienceProjection {
  if (!Array.isArray(input.included) || !Array.isArray(input.excluded)) {
    throw new TypeError('resolvedRows.included and resolvedRows.excluded must be arrays.');
  }
  if (input.personalOverlayIdentity !== undefined) {
    assertJsonSafe(
      input.personalOverlayIdentity,
      'resolvedRows.personalOverlayIdentity',
    );
  }

  const includedIds = new Set<string>();
  const included = input.included.map((row, index) => {
    const validated = validateResolvedRow(
      row,
      true,
      `resolvedRows.included[${index}]`,
    );
    if (includedIds.has(validated.id)) {
      throw new Error(`Duplicate resolved stable id "${validated.id}" in included rows.`);
    }
    includedIds.add(validated.id);
    return validated;
  });
  const excludedIds = new Set<string>();
  const excluded = input.excluded.map((row, index) => {
    const validated = validateResolvedRow(
      row,
      false,
      `resolvedRows.excluded[${index}]`,
    );
    if (excludedIds.has(validated.id)) {
      throw new Error(`Duplicate resolved stable id "${validated.id}" in excluded rows.`);
    }
    if (includedIds.has(validated.id)) {
      throw new Error(
        `Resolved stable id "${validated.id}" overlaps included and excluded rows.`,
      );
    }
    excludedIds.add(validated.id);
    return validated;
  });
  const orderedRows = [...included, ...excluded].sort(
    (left, right) =>
      left.orderRank - right.orderRank || left.id.localeCompare(right.id),
  );
  const outlineRows = orderedRows.filter((row) => row.included);
  const excludedRows = orderedRows.filter((row) => !row.included);
  const template = buildFlowExperienceProjection(bundle);
  const shapes = Object.fromEntries(EFFECTIVE_FLOW_SHAPES.map((shape) => {
    const rows = outlineRows.filter((row) => row.eligibleShapes.includes(shape));
    const role = shape === template.primaryShape
      ? 'primary'
      : template.secondaryShapes.includes(shape)
        ? 'secondary'
        : rows.length > 0
          ? 'available'
          : 'not_applicable';
    return [shape, {
      shape,
      label: template.shapes[shape].label,
      role,
      rows,
      count: rows.length,
    } satisfies FlowExperienceShapeProjection];
  })) as Record<FlowExperienceShape, FlowExperienceShapeProjection>;

  return {
    ...template,
    outlineRows,
    excludedRows,
    shapes,
  };
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
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

function buildPersonalItemStateIdentity(
  itemStates: Record<string, FlowItemState>,
): Record<string, Pick<FlowItemState, 'personalOrder' | 'personalExcluded'>> {
  return Object.fromEntries(Object.entries(itemStates).flatMap(([itemId, state]) => {
    const identity: Pick<FlowItemState, 'personalOrder' | 'personalExcluded'> = {};
    if (Object.prototype.hasOwnProperty.call(state, 'personalOrder')) {
      identity.personalOrder = state.personalOrder;
    }
    if (Object.prototype.hasOwnProperty.call(state, 'personalExcluded')) {
      identity.personalExcluded = state.personalExcluded;
    }
    return Object.keys(identity).length > 0 ? [[itemId, identity]] : [];
  }));
}

function buildExecutionItemStateIdentity(
  itemStates: Record<string, FlowItemState>,
): Record<string, Pick<FlowItemState, 'skipped' | 'note'>> {
  return Object.fromEntries(Object.entries(itemStates).flatMap(([itemId, state]) => {
    const identity: Pick<FlowItemState, 'skipped' | 'note'> = {};
    if (Object.prototype.hasOwnProperty.call(state, 'skipped')) {
      identity.skipped = state.skipped;
    }
    if (Object.prototype.hasOwnProperty.call(state, 'note')) {
      identity.note = state.note;
    }
    return Object.keys(identity).length > 0 ? [[itemId, identity]] : [];
  }));
}

function buildDateState(
  anchor: string | undefined,
  illustrative: boolean,
  datedCount: number,
  totalCount: number,
): EffectiveFlowDateState {
  if (illustrative) return 'provisional';
  if (anchor) return datedCount > 0 && datedCount < totalCount ? 'mixed' : 'custom';
  return datedCount > 0 ? 'mixed' : 'undated';
}

function buildExportPlan({
  options,
  rows,
  calendarCount,
}: {
  options: BuildEffectiveFlowSnapshotOptions;
  rows: FlowExperienceProjectionRow[];
  calendarCount: number;
}): EffectiveFlowExportPlan {
  const orderedItemIds = rows.map((row) => row.sourceItemId ?? row.id);
  const isRoutineSeries = options.bundle.flow.structure_type === 'routine'
    && calendarCount > 0;
  const calendarOmittedItemIds = isRoutineSeries
    ? orderedItemIds.slice(1)
    : rows
        .filter((row) => !row.schedule.date)
        .map((row) => row.sourceItemId ?? row.id);
  const routineCalendarFieldOmissions: EffectiveFlowFieldOmission[] = isRoutineSeries
    ? [
        {
          field: 'item_title',
          itemIds: orderedItemIds,
          reason: '반복 캘린더는 항목 제목 대신 Flow 제목을 사용합니다.',
        },
        {
          field: 'item_detail',
          itemIds: orderedItemIds,
          reason: '반복 캘린더에는 항목별 개인 메모를 내보내지 않습니다.',
        },
        {
          field: 'item_date',
          itemIds: orderedItemIds,
          reason: '반복 캘린더는 항목별 날짜 대신 반복 시작일을 사용합니다.',
        },
        {
          field: 'item_inclusion',
          itemIds: orderedItemIds,
          reason: '반복 캘린더는 하나의 대표 반복 일정으로 묶여 항목별 포함 상태를 보존하지 않습니다.',
        },
        {
          field: 'item_order',
          itemIds: orderedItemIds,
          reason: '반복 캘린더는 하나의 대표 반복 일정으로 묶여 항목 순서를 보존하지 않습니다.',
        },
      ]
    : [];
  const formats: EffectiveFlowExportPlan['formats'] = {
    calendar: {
      supported: calendarCount > 0,
      outputCount: calendarCount,
      preservesItemOrder: false,
      omittedItemIds: calendarOmittedItemIds,
      omittedFields: routineCalendarFieldOmissions,
      ...(calendarOmittedItemIds.length > 0
        ? {
            omissionReason: isRoutineSeries
              ? '반복 항목은 하나의 캘린더 반복 계획으로 묶입니다.'
              : '날짜 없는 항목은 캘린더 파일에서 제외됩니다.',
          }
        : {}),
    },
    checklist: {
      supported: rows.length > 0,
      outputCount: rows.length,
      preservesItemOrder: true,
      omittedItemIds: [],
      omittedFields: [],
    },
    sheet: {
      supported: rows.length > 0,
      outputCount: rows.length,
      preservesItemOrder: true,
      omittedItemIds: [],
      omittedFields: [],
    },
    memo: {
      supported: rows.length > 0,
      outputCount: rows.length,
      preservesItemOrder: true,
      omittedItemIds: [],
      omittedFields: [],
    },
  };
  const supportedDestinations = (
    Object.entries(formats) as Array<[
      EffectiveFlowExportDestination,
      EffectiveFlowFormatPlan,
    ]>
  ).filter(([, format]) => format.supported).map(([destination]) => destination);

  return { supportedDestinations, formats };
}

function toSavedArtifactMode(
  shape: FlowExperienceShape,
): SavedFlowArtifactMode {
  if (shape === 'calendar') return 'calendar';
  if (shape === 'sheet') return 'sheet';
  if (shape === 'memo') return 'memo';
  return 'checklist';
}

function fromSavedArtifactMode(
  mode: SavedFlowArtifactMode,
): FlowExperienceShape {
  if (mode === 'calendar') return 'calendar';
  if (mode === 'sheet') return 'sheet';
  if (mode === 'memo') return 'memo';
  return 'checklist';
}

function buildResult(
  options: BuildEffectiveFlowSnapshotOptions,
  effectiveTitle: string,
  anchor?: string,
  illustrative = false,
): EffectiveFlowResult {
  const baseProjection = options.resolvedRows
    ? buildProjectionFromResolvedRows(options.bundle, options.resolvedRows)
    : buildFlowExperienceProjection(options.bundle, {
        ...(anchor ? { anchor } : {}),
        itemStates: options.itemStates ?? {},
        itemOverrides: buildPublicFlowExperienceItemOverrides(
          options.publicItemPersonalizations ?? {},
        ),
        orderOverride: options.orderOverride ?? [],
        completedItemIds: options.completedItemIds ?? [],
      });
  const projection: FlowExperienceProjection = {
    ...baseProjection,
    title: effectiveTitle,
  };
  const recommendation = buildArtifactRecommendationVM(projection);
  const persistedSelectedArtifactMode = illustrative
    ? undefined
    : options.resolvedRows?.selectedArtifactMode;
  const selectedShape = persistedSelectedArtifactMode
    ? fromSavedArtifactMode(persistedSelectedArtifactMode)
    : recommendation.primary?.shape ?? projection.primaryShape;
  const selectedProjection = projection.shapes[selectedShape];
  const dated = projection.outlineRows.filter(
    (row) => Boolean(row.schedule.date),
  ).length;
  const total = projection.outlineRows.length;
  const routineSeriesCount = options.bundle.flow.structure_type === 'routine'
    && anchor
    && projection.outlineRows.length > 0
    ? 1
    : 0;
  const calendarCount = options.bundle.flow.structure_type === 'routine'
    ? routineSeriesCount
    : projection.shapes.calendar.count;
  const exportPlan = buildExportPlan({
    options,
    rows: projection.outlineRows,
    calendarCount,
  });
  const capabilities: EffectiveFlowCapabilities = {
    canEdit: options.editable !== false,
    canSave: !illustrative && options.dateIntent.canSave,
    canExport: exportPlan.supportedDestinations.length > 0,
    canComplete: Boolean(options.completionEnabled),
    hasDirectSource: Boolean(options.bundle.flow.source_url),
    hasRiskCaution: Boolean(options.bundle.flow.warning)
      || options.bundle.flow.risk_level === 'medical_sensitive'
      || options.bundle.flow.risk_level === 'financial_sensitive',
    needsRecovery: Boolean(options.recoveryRequired),
  };

  return {
    projection,
    selectedShape,
    selectedArtifactMode:
      persistedSelectedArtifactMode ?? toSavedArtifactMode(selectedShape),
    label: selectedProjection.label,
    rows: projection.outlineRows,
    excludedRows: projection.excludedRows,
    counts: {
      total,
      dated,
      undated: total - dated,
      calendar: calendarCount,
    },
    dateState: buildDateState(anchor, illustrative, dated, total),
    exportPlan,
    capabilities,
  };
}

export function buildEffectiveFlowSnapshot(
  options: BuildEffectiveFlowSnapshotOptions,
): EffectiveFlowSnapshot {
  if (options.resolvedRows?.personalOverlayIdentity !== undefined) {
    assertJsonSafe(
      options.resolvedRows.personalOverlayIdentity,
      'resolvedRows.personalOverlayIdentity',
    );
  }
  if (options.executionOverlayIdentity?.readModelIdentity !== undefined) {
    assertJsonSafe(
      options.executionOverlayIdentity.readModelIdentity,
      'executionOverlayIdentity.readModelIdentity',
    );
  }
  const effectiveTitle = options.effectiveTitle.trim() || options.bundle.flow.title;
  const committed = buildResult(
    options,
    effectiveTitle,
    options.dateIntent.savedAnchor,
  );
  const illustrative = options.dateIntent.previewOnly
    && options.dateIntent.previewAnchor
    ? buildResult(options, effectiveTitle, options.dateIntent.previewAnchor, true)
    : undefined;
  const savedFlowRecordInput: EffectiveFlowSavedRecordInput = {
    personalTitle: effectiveTitle,
    selectedArtifactMode: committed.selectedArtifactMode,
    dateIntent: options.dateIntent.persistedMode,
    ...(options.dateIntent.savedAnchor
      ? { anchor: options.dateIntent.savedAnchor }
      : {}),
  };

  const sourceVersion =
    options.bundle.flow.source_modified_at ?? options.bundle.flow.updated_at;
  const completedItemIds = [...new Set(
    options.resolvedRows
      ? [...options.resolvedRows.included, ...options.resolvedRows.excluded]
          .filter((row) => row.completed)
          .map((row) => row.id)
      : options.completedItemIds ?? [],
  )].sort();
  const itemStates = options.itemStates ?? {};
  const personalVersion = `personal:${fingerprint({
    effectiveTitle,
    dateIntent: options.dateIntent,
    itemStates: buildPersonalItemStateIdentity(itemStates),
    publicItemPersonalizations: options.publicItemPersonalizations ?? {},
    orderOverride: options.orderOverride ?? [],
    ...(options.resolvedRows
      ? {
          resolvedRows: {
            selectedArtifactMode: options.resolvedRows.selectedArtifactMode,
            personalOverlayIdentity:
              options.resolvedRows.personalOverlayIdentity ?? null,
          },
        }
      : {}),
  })}`;
  const executionVersion = `execution:${fingerprint({
    completedItemIds,
    itemStates: buildExecutionItemStateIdentity(itemStates),
    overlay: options.executionOverlayIdentity ?? {},
  })}`;
  const sourceItemIds = options.bundle.flow.content_type === 'meal_plan'
    && options.bundle.items.length === 0
    ? (options.bundle.mealSlots ?? [])
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((slot) => slot.id)
    : options.bundle.items
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((item) => item.id);

  return {
    schemaVersion: EFFECTIVE_FLOW_SNAPSHOT_SCHEMA_VERSION,
    identity: {
      flowId: options.bundle.flow.id,
      flowSlug: options.bundle.flow.slug,
    },
    sourceVersion,
    layers: {
      source: {
        version: sourceVersion,
        flowId: options.bundle.flow.id,
        itemIds: sourceItemIds,
      },
      personal: {
        version: personalVersion,
        state: options.personalLayerState ?? 'working',
      },
      execution: {
        version: executionVersion,
        completedItemIds,
      },
    },
    effectiveTitle,
    dateIntent: { ...options.dateIntent },
    ...(illustrative ? { illustrative } : {}),
    committed,
    savedFlowRecordInput,
  };
}
