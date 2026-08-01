import { seedBundles } from './seed-flows';
import {
  getRuntimeArchivedFlowPolicy,
  isRuntimeExcludedBundle,
  RETIRED_PERSONAL_COPY_TAG,
} from './runtime-content-policy';
import {
  buildSourceBackedFlowMapPersistenceRecordUpdate,
  getSourceBackedFlowMapPersistenceStorageKey,
  type SourceBackedFlowMapSavedSnapshot,
  type SourceBackedFlowMapPersonalCopy,
  type SourceBackedFlowMapPersonalCopyStepOverride,
  type SourceBackedFlowMapPersistenceRecord,
  type SourceBackedFlowMapStepBinding,
} from './source-backed-my-flow';
import { prepareFlowRunNewAnchor, type FlowRunFixedDatePolicy } from './flow-run-reuse';
import {
  normalizePublicDateIntentMode,
  type PersistedPublicDateIntentMode,
} from './public-date-intent';
import {
  normalizeMyFlowExecutionNotes,
  upsertMyFlowExecutionNote,
  type MyFlowExecutionNote,
  type MyFlowExecutionNoteInput,
} from './execution-notes';
import { removePersonalStructuralOverlaysForFlow } from './personal-structural-overlay';
import {
  loadPersonalFlowLifecycle,
  restorePersonalFlow,
  savePersonalFlowLifecycle,
} from './personal-flow-lifecycle';
import { FLOW_PROJECTION_IDENTITY_MIGRATION_STORAGE_KEY_PREFIX } from './projection-identity';
import {
  getFlowScopedMyFlowPersonalExecutionState,
  hasMyFlowPersonalExecutionState,
  normalizeMyFlowPersonalExecutionState,
  prepareMyFlowPersonalExecutionStateForReuse,
  replaceFlowScopedMyFlowPersonalExecutionState,
  type MyFlowPersonalExecutionState,
} from './my-flow-personal-state';
import { FlowBundle, FlowComparisonState, FlowItemState, FlowWorkbenchState, ReactionLog } from './types';
import { recordCanonicalFlowWrite } from './canonical-flow-storage';
import {
  getFlowItemUserNote,
  isFlowItemOmittedFromActiveProjection,
  isFlowItemPersonallyExcluded,
} from './flow-item-state';

const BUNDLES_KEY = 'flow_builder_mvp_bundles_v11';
const PREVIOUS_BUNDLES_KEYS = [
  'flow_builder_mvp_bundles_v10',
  'flow_builder_mvp_bundles_v9',
  'flow_builder_mvp_bundles_v8',
  'flow_builder_mvp_bundles_v7',
  'flow_builder_mvp_bundles_v6',
  'flow_builder_mvp_bundles_v5',
  'flow_builder_mvp_bundles_v4',
  'flow_builder_mvp_bundles_v3',
];
const CHECKS_KEY_PREFIX = 'flow_builder_mvp_checks_';
const REACTIONS_KEY_PREFIX = 'flow_builder_mvp_reactions_';
const COMPARISON_KEY_PREFIX = 'flow_builder_mvp_comparison_';
const WORKBENCH_KEY_PREFIX = 'flow_builder_mvp_workbench_';
const ANCHOR_KEY_PREFIX = 'flow:';
const ITEM_STATE_KEY_PREFIX = 'flow_builder_mvp_item_state_';
const NOTICE_KEY = 'flow_builder_mvp_storage_notice_dismissed';
const SAVED_FLOW_KEY_PREFIX = 'flow:saved:';
const SAVED_FLOW_MAP_KEY_PREFIX = 'flow:map:saved:';
const MY_FLOW_STEP_ITEM_CHECKS_KEY = 'flow:my-flow:step-item-checks';
const MY_FLOW_COMPLETION_FEEDBACK_KEY_PREFIX = 'flow:my-flow:completion-feedback:';
const MY_FLOW_EXECUTION_NOTES_KEY_PREFIX = 'flow:my-flow:execution-notes:';
const FLOW_RUN_REGISTRY_KEY_PREFIX = 'flow:run-registry:';
const FLOW_COMPLETION_DETECTED_AT_KEY_PREFIX = 'flow:completion-detected-at:';

export type StoredAnchor = {
  mode: string;
  anchor: string;
};

export type PermanentSavedFlowDeletionResult = {
  flowSlug: string;
  personalDraft: boolean;
  lifecycleReferenceRemoved: boolean;
  personalDraftBundleRemoved: boolean;
  removedSavedMapIds: string[];
  updatedSavedMapIds: string[];
  publicSourcePreserved: boolean;
};

export type SavedFlowArtifactMode = 'calendar' | 'checklist' | 'sheet' | 'memo';

export type SavedFlowRoutineEnd =
  | { mode: 'source' }
  | { mode: 'none' }
  | { mode: 'until'; date: string }
  | { mode: 'count'; count: number };

export type SavedFlowRoutineDefinition = {
  schemaVersion: 1;
  time?: string;
  durationMinutes?: number;
  end: SavedFlowRoutineEnd;
};

export type SavedFlowRecord = {
  slug: string;
  savedAt: string;
  personalTitle?: string;
  selectedArtifactMode: SavedFlowArtifactMode;
  dateIntent: PersistedPublicDateIntentMode;
  anchor?: string;
  legacyExampleAnchor?: string;
  weekdays?: string[];
  routineDefinition?: SavedFlowRoutineDefinition;
};

export type SavedFlowReadStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;

export type SavedFlowMapSnapshot = {
  mapId: string;
  title: string;
  version: string;
  savedAt: string;
  anchor?: string;
  flowSlugs: string[];
  stepCountsByFlow?: Record<string, number>;
  riskLevelsByFlow?: Record<string, string | undefined>;
  sourceCheckedAtByFlow?: Record<string, string | undefined>;
  personalCopy?: SourceBackedFlowMapPersonalCopy;
};

export type MyFlowStepItemChecks = Record<string, Record<string, boolean>>;

export type MyFlowCompletionReflection = {
  outcome: 'helpful' | 'needs_changes';
  note?: string;
  updatedAt: string;
};

export type MyFlowSourceCorrectionDraft = {
  scope: 'flow' | 'item';
  note: string;
  updatedAt: string;
  itemId?: string;
  itemTitle?: string;
  sourceUrl?: string;
};

export type MyFlowCompletionFeedback = {
  flowSlug: string;
  reflection?: MyFlowCompletionReflection;
  sourceCorrectionDraft?: MyFlowSourceCorrectionDraft;
};

export type ActiveFlowProgress = {
  slug: string;
  title: string;
  done: number;
  total: number;
  skipped: number;
  anchor?: string;
  anchorMode?: string;
  weekdays?: string[];
  routineDefinition?: SavedFlowRoutineDefinition;
  lastVisited?: string;
};

export type FlowRunReuseMode = 'legacy' | 'same_copy' | 'new_anchor' | 'reviewed_version';

export type FlowRunItemSnapshotStatus = 'pending' | 'done' | 'reopened' | 'skipped' | 'held';

export type FlowRunItemSnapshot = {
  itemId: string;
  title: string;
  status: FlowRunItemSnapshotStatus;
  scheduleState: 'unscheduled' | 'all_day' | 'timed';
  date?: string;
  time?: string;
  durationMinutes?: number;
  memo?: string;
  personalOrderRank: number;
};

export type FlowRunCompletionSnapshot = {
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  stepItemChecks: MyFlowStepItemChecks;
  comparisonState: FlowComparisonState;
  workbenchState: FlowWorkbenchState;
  reactionLogs: Record<string, ReactionLog>;
  completionFeedback?: MyFlowCompletionFeedback;
  executionNotes?: MyFlowExecutionNote[];
  flowTitle?: string;
  itemSnapshots?: FlowRunItemSnapshot[];
};

export type FlowRunRecord = {
  schemaVersion: 1;
  runId: string;
  flowSlug: string;
  status: 'active' | 'completed';
  startedAt: string;
  completedAt?: string;
  anchor?: string;
  selectedArtifactMode?: SavedFlowArtifactMode;
  mapId?: string;
  sourceVersion?: string;
  previousRunId?: string;
  reuseMode?: FlowRunReuseMode;
  fixedDatePolicy?: FlowRunFixedDatePolicy;
  personalCopySnapshot?: SourceBackedFlowMapPersonalCopy;
  personalExecutionStateSnapshot?: MyFlowPersonalExecutionState;
  completionSnapshot?: FlowRunCompletionSnapshot;
};

export type FlowRunRegistry = {
  schemaVersion: 1;
  activeRunId?: string;
  runs: FlowRunRecord[];
};

export type EnsureLegacyFlowRunOptions = {
  runId?: string;
  startedAt?: string;
  mapSnapshot?: SavedFlowMapSnapshot;
};

export type CompleteActiveFlowRunOptions = EnsureLegacyFlowRunOptions & {
  completedAt?: string;
  flowTitle?: string;
  itemSnapshots?: FlowRunItemSnapshot[];
};

export type StartFlowRunFromCompletedOptions = {
  runId?: string;
  startedAt?: string;
  previousRunId?: string;
  reuseMode: Exclude<FlowRunReuseMode, 'legacy'>;
  anchor?: string;
  selectedArtifactMode?: SavedFlowArtifactMode;
  mapId?: string;
  sourceVersion?: string;
  fixedDatePolicy?: FlowRunFixedDatePolicy;
  personalCopySnapshot?: SourceBackedFlowMapPersonalCopy;
  personalExecutionStateSnapshot?: MyFlowPersonalExecutionState;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function cloneSeedBundles(): FlowBundle[] {
  return JSON.parse(JSON.stringify(seedBundles.filter((bundle) => !isRuntimeExcludedBundle(bundle)))) as FlowBundle[];
}

export function mergeSeedBundles(stored: FlowBundle[], seeds: FlowBundle[]): FlowBundle[] {
  const seedIds = new Set(seeds.map((bundle) => bundle.flow.id));
  const localOnly = stored.filter(
    (bundle) => !seedIds.has(bundle.flow.id) && !isRuntimeExcludedBundle(bundle),
  );
  return [...seeds, ...localOnly];
}

function toRetiredPersonalCopy(bundle: FlowBundle): FlowBundle {
  return {
    ...bundle,
    flow: {
      ...bundle.flow,
      status: 'draft',
      tags: Array.from(new Set([...(bundle.flow.tags ?? []), RETIRED_PERSONAL_COPY_TAG])),
    },
  };
}

function preserveSavedArchivedBundles(stored: FlowBundle[]): FlowBundle[] {
  const migrated = stored.map((bundle) => {
    const policy = getRuntimeArchivedFlowPolicy(bundle.flow.slug);
    if (
      !policy ||
      bundle.flow.status !== 'published' ||
      !localStorage.getItem(`${SAVED_FLOW_KEY_PREFIX}${bundle.flow.slug}`)
    ) {
      return bundle;
    }
    return toRetiredPersonalCopy(bundle);
  });
  const storedSlugs = new Set(migrated.map((bundle) => bundle.flow.slug));
  const recovered = seedBundles
    .filter((bundle) => (
      Boolean(getRuntimeArchivedFlowPolicy(bundle.flow.slug)) &&
      Boolean(localStorage.getItem(`${SAVED_FLOW_KEY_PREFIX}${bundle.flow.slug}`)) &&
      !storedSlugs.has(bundle.flow.slug)
    ))
    .map((bundle) => JSON.parse(JSON.stringify(bundle)) as FlowBundle)
    .map(toRetiredPersonalCopy);

  return [...migrated, ...recovered];
}

export function getBundles(): FlowBundle[] {
  if (!canUseStorage()) return cloneSeedBundles();

  const seeds = cloneSeedBundles();
  const raw = localStorage.getItem(BUNDLES_KEY);
  if (!raw) {
    const previous = PREVIOUS_BUNDLES_KEYS
      .map((key) => localStorage.getItem(key))
      .filter(Boolean)
      .flatMap((value) => {
        try {
          return JSON.parse(value as string) as FlowBundle[];
        } catch {
          return [];
        }
      })
    const migrated = mergeSeedBundles(preserveSavedArchivedBundles(previous), seeds);
    localStorage.setItem(BUNDLES_KEY, JSON.stringify(migrated));
    return migrated;
  }

  try {
    const stored = preserveSavedArchivedBundles(JSON.parse(raw) as FlowBundle[]);
    const merged = mergeSeedBundles(stored, seeds);
    const serialized = JSON.stringify(merged);
    if (serialized !== raw) {
      localStorage.setItem(BUNDLES_KEY, serialized);
    }
    return merged;
  } catch {
    localStorage.setItem(BUNDLES_KEY, JSON.stringify(seeds));
    return seeds;
  }
}

export function saveBundles(bundles: FlowBundle[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(BUNDLES_KEY, JSON.stringify(bundles));
}

export function getChecks(slug: string): Record<string, boolean> {
  if (!canUseStorage()) return {};
  return JSON.parse(localStorage.getItem(`${CHECKS_KEY_PREFIX}${slug}`) || '{}');
}

export function saveChecks(slug: string, value: Record<string, boolean>): void {
  if (!canUseStorage()) return;
  localStorage.setItem(`${CHECKS_KEY_PREFIX}${slug}`, JSON.stringify(value));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

export function getStoredAnchor(slug: string): StoredAnchor {
  if (!canUseStorage()) return { mode: 'custom', anchor: '' };
  try {
    return JSON.parse(localStorage.getItem(`${ANCHOR_KEY_PREFIX}${slug}:anchorDate`) || '{"mode":"custom","anchor":""}');
  } catch {
    return { mode: 'custom', anchor: '' };
  }
}

export function saveStoredAnchor(slug: string, value: StoredAnchor): void {
  if (!canUseStorage()) return;
  localStorage.setItem(`${ANCHOR_KEY_PREFIX}${slug}:anchorDate`, JSON.stringify(value));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

export type LegacyPublicExampleDateIntentMigration = {
  migrated: boolean;
  preservedExampleAnchor?: string;
  record?: SavedFlowRecord;
};

export function migrateLegacyPublicExampleDateIntent(slug: string): LegacyPublicExampleDateIntentMigration {
  if (!canUseStorage()) return { migrated: false };
  const storedAnchor = getStoredAnchor(slug);
  if (storedAnchor.mode !== 'example') return { migrated: false, record: getSavedFlowRecord(slug) };

  const record = getSavedFlowRecord(slug);
  if (!record) {
    localStorage.removeItem(`${ANCHOR_KEY_PREFIX}${slug}:anchorDate`);
    return { migrated: true };
  }

  const preservedExampleAnchor = record.anchor ?? record.legacyExampleAnchor;
  const migratedRecord: SavedFlowRecord = {
    ...record,
    dateIntent: 'undated',
    ...(preservedExampleAnchor ? { legacyExampleAnchor: preservedExampleAnchor } : {}),
  };
  delete migratedRecord.anchor;
  localStorage.setItem(`${SAVED_FLOW_KEY_PREFIX}${slug}`, JSON.stringify(migratedRecord));
  localStorage.setItem(
    `${ANCHOR_KEY_PREFIX}${slug}:anchorDate`,
    JSON.stringify({ mode: 'undated', anchor: '' } satisfies StoredAnchor),
  );

  return {
    migrated: true,
    ...(preservedExampleAnchor ? { preservedExampleAnchor } : {}),
    record: migratedRecord,
  };
}

export function getItemStates(slug: string): Record<string, FlowItemState> {
  if (!canUseStorage()) return {};
  try {
    return JSON.parse(localStorage.getItem(`${ITEM_STATE_KEY_PREFIX}${slug}`) || '{}');
  } catch {
    return {};
  }
}

export function saveItemStates(slug: string, value: Record<string, FlowItemState>): void {
  if (!canUseStorage()) return;
  localStorage.setItem(`${ITEM_STATE_KEY_PREFIX}${slug}`, JSON.stringify(value));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

export function hasDismissedStorageNotice(): boolean {
  if (!canUseStorage()) return true;
  return localStorage.getItem(NOTICE_KEY) === 'true';
}

export function dismissStorageNotice(): void {
  if (!canUseStorage()) return;
  localStorage.setItem(NOTICE_KEY, 'true');
}

function isSavedFlowArtifactMode(value: unknown): value is SavedFlowArtifactMode {
  return value === 'calendar' || value === 'checklist' || value === 'sheet' || value === 'memo';
}

function isSavedFlowRoutineTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeSavedFlowRoutineDefinition(value: unknown): SavedFlowRoutineDefinition | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as {
    schemaVersion?: unknown;
    time?: unknown;
    durationMinutes?: unknown;
    end?: {
      mode?: unknown;
      date?: unknown;
      count?: unknown;
    };
  };
  const endRecord = record.end;
  let end: SavedFlowRoutineEnd | undefined;
  if (endRecord?.mode === 'source' || endRecord?.mode === 'none') {
    end = { mode: endRecord.mode };
  } else if (
    endRecord?.mode === 'until' &&
    typeof endRecord.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(endRecord.date)
  ) {
    end = { mode: 'until', date: endRecord.date };
  } else if (
    endRecord?.mode === 'count' &&
    Number.isInteger(endRecord.count) &&
    Number(endRecord.count) >= 1 &&
    Number(endRecord.count) <= 10_000
  ) {
    end = { mode: 'count', count: Number(endRecord.count) };
  }
  if (!end) return undefined;
  const durationMinutes = Number.isInteger(record.durationMinutes) && Number(record.durationMinutes) >= 5 && Number(record.durationMinutes) <= 1440
    ? Number(record.durationMinutes)
    : undefined;
  const time = isSavedFlowRoutineTime(record.time) ? record.time : undefined;
  return {
    schemaVersion: 1,
    ...(time ? { time } : {}),
    ...(time && durationMinutes ? { durationMinutes } : {}),
    end,
  };
}

export function normalizeSavedFlowRecord(value: unknown): SavedFlowRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Partial<SavedFlowRecord>;
  if (typeof record.slug !== 'string' || !record.slug.trim()) return undefined;
  if (typeof record.savedAt !== 'string' || !record.savedAt.trim()) return undefined;
  const anchor = typeof record.anchor === 'string' && record.anchor.trim() ? record.anchor : undefined;
  const legacyExampleAnchor =
    typeof record.legacyExampleAnchor === 'string' && record.legacyExampleAnchor.trim()
      ? record.legacyExampleAnchor.trim()
      : undefined;
  const dateIntent: PersistedPublicDateIntentMode =
    record.dateIntent === 'custom' && anchor
      ? 'custom'
      : record.dateIntent === 'undated'
        ? 'undated'
        : anchor
          ? 'custom'
          : 'undated';
  const weekdays = Array.isArray(record.weekdays)
    ? record.weekdays.filter((day): day is string => typeof day === 'string' && ['월', '화', '수', '목', '금', '토', '일'].includes(day))
    : undefined;
  const personalTitle = typeof record.personalTitle === 'string' && record.personalTitle.trim()
    ? record.personalTitle.trim().slice(0, 80)
    : undefined;
  const routineDefinition = normalizeSavedFlowRoutineDefinition(record.routineDefinition);

  return {
    slug: record.slug,
    savedAt: record.savedAt,
    ...(personalTitle ? { personalTitle } : {}),
    selectedArtifactMode: isSavedFlowArtifactMode(record.selectedArtifactMode) ? record.selectedArtifactMode : 'calendar',
    dateIntent,
    ...(dateIntent === 'custom' && anchor ? { anchor } : {}),
    ...(legacyExampleAnchor ? { legacyExampleAnchor } : {}),
    ...(weekdays?.length ? { weekdays: Array.from(new Set(weekdays)) } : {}),
    ...(routineDefinition ? { routineDefinition } : {}),
  };
}

export function getSavedFlowRecord(slug: string): SavedFlowRecord | undefined {
  if (!canUseStorage()) return undefined;
  try {
    return normalizeSavedFlowRecord(JSON.parse(localStorage.getItem(`${SAVED_FLOW_KEY_PREFIX}${slug}`) || 'null'));
  } catch {
    return undefined;
  }
}

export function hasSavedFlowEntry(storage?: SavedFlowReadStorage): boolean {
  const target = storage ?? (canUseStorage() ? localStorage : undefined);
  if (!target) return false;

  let keys: string[];
  try {
    keys = Array.from({ length: target.length }, (_, index) => target.key(index))
      .filter((key): key is string => Boolean(key));
  } catch {
    return false;
  }

  return keys.some((key) => {
    try {
      if (key.startsWith(SAVED_FLOW_KEY_PREFIX)) {
        return Boolean(normalizeSavedFlowRecord(JSON.parse(target.getItem(key) || 'null')));
      }
      if (key.startsWith(SAVED_FLOW_MAP_KEY_PREFIX)) {
        return Boolean(normalizeSavedFlowMapSnapshot(JSON.parse(target.getItem(key) || 'null')));
      }
    } catch {
      return false;
    }
    return false;
  });
}

export function saveFlowRecord(
  slug: string,
  value: Omit<SavedFlowRecord, 'slug' | 'savedAt' | 'dateIntent'> & { dateIntent?: PersistedPublicDateIntentMode },
): SavedFlowRecord | undefined {
  if (!canUseStorage()) return undefined;
  const previous = getSavedFlowRecord(slug);
  const weekdays = value.weekdays ?? previous?.weekdays;
  const personalTitle = value.personalTitle?.trim().slice(0, 80) || previous?.personalTitle;
  const routineDefinition = normalizeSavedFlowRoutineDefinition(value.routineDefinition ?? previous?.routineDefinition);
  const requestedAnchor = value.anchor?.trim();
  const dateIntent: PersistedPublicDateIntentMode =
    value.dateIntent === 'undated' ? 'undated' : requestedAnchor ? 'custom' : 'undated';
  const record: SavedFlowRecord = {
    slug,
    savedAt: new Date().toISOString(),
    ...(personalTitle ? { personalTitle } : {}),
    selectedArtifactMode: value.selectedArtifactMode,
    dateIntent,
    ...(dateIntent === 'custom' && requestedAnchor ? { anchor: requestedAnchor } : {}),
    ...(value.legacyExampleAnchor ? { legacyExampleAnchor: value.legacyExampleAnchor } : {}),
    ...(weekdays?.length ? { weekdays: Array.from(new Set(weekdays)) } : {}),
    ...(routineDefinition ? { routineDefinition } : {}),
  };
  localStorage.setItem(`${SAVED_FLOW_KEY_PREFIX}${slug}`, JSON.stringify(record));
  recordCanonicalFlowWrite(localStorage, slug, record.savedAt);
  localStorage.setItem('flow:meta:last-visit', record.savedAt);
  return record;
}

function normalizeStringListRecord(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, list]) => {
    if (!key.trim() || !Array.isArray(list)) return [];
    const normalizedList = list.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    return [[key, normalizedList] as const];
  });
  return Object.fromEntries(entries);
}

function normalizeSavedFlowMapPersonalCopyStepOverride(value: unknown): SourceBackedFlowMapPersonalCopyStepOverride | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const source = value as Partial<SourceBackedFlowMapPersonalCopyStepOverride>;
  const normalized: SourceBackedFlowMapPersonalCopyStepOverride = {};
  if (typeof source.title === 'string' && source.title.trim()) normalized.title = source.title.trim();
  if (typeof source.userMemo === 'string' && source.userMemo.trim()) normalized.userMemo = source.userMemo.trim();
  if (
    source.schedule &&
    typeof source.schedule === 'object' &&
    source.schedule.mode === 'fixed_date' &&
    typeof source.schedule.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(source.schedule.date)
  ) {
    normalized.schedule = { mode: 'fixed_date', date: source.schedule.date };
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSavedFlowMapPersonalCopyStepOverrides(
  value: unknown,
): Record<string, Record<string, SourceBackedFlowMapPersonalCopyStepOverride>> | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([flowSlug, stepRecord]) => {
    if (!flowSlug.trim() || !stepRecord || typeof stepRecord !== 'object') return [];
    const stepEntries = Object.entries(stepRecord as Record<string, unknown>).flatMap(([stepId, stepOverride]) => {
      if (!stepId.trim()) return [];
      const normalized = normalizeSavedFlowMapPersonalCopyStepOverride(stepOverride);
      return normalized ? [[stepId, normalized] as const] : [];
    });
    return stepEntries.length > 0 ? [[flowSlug, Object.fromEntries(stepEntries)] as const] : [];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeSavedFlowMapRetainedStep(value: unknown): SourceBackedFlowMapStepBinding | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const step = value as Partial<SourceBackedFlowMapStepBinding>;
  const destinations = new Set(['calendar', 'todo', 'checklist', 'sheet', 'memo', 'progress']);
  const calendarModes = new Set(['absolute', 'anchor_offset', 'routine', 'none']);
  if (typeof step.stepId !== 'string' || !step.stepId.trim()) return undefined;
  if (typeof step.title !== 'string' || !step.title.trim()) return undefined;
  if (typeof step.destination !== 'string' || !destinations.has(step.destination)) return undefined;
  if (!step.calendar || typeof step.calendar !== 'object' || !calendarModes.has(step.calendar.mode)) return undefined;
  if (!step.textFallback || typeof step.textFallback !== 'object') return undefined;
  if (typeof step.textFallback.title !== 'string' || typeof step.textFallback.description !== 'string') return undefined;
  return JSON.parse(JSON.stringify(step)) as SourceBackedFlowMapStepBinding;
}

function normalizeSavedFlowMapRetainedSteps(
  value: unknown,
): Record<string, Record<string, SourceBackedFlowMapStepBinding>> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const flows = Object.entries(value as Record<string, unknown>).flatMap(([flowSlug, flowValue]) => {
    if (!flowSlug.trim() || !flowValue || typeof flowValue !== 'object' || Array.isArray(flowValue)) return [];
    const steps = Object.entries(flowValue as Record<string, unknown>).flatMap(([stepId, stepValue]) => {
      const step = normalizeSavedFlowMapRetainedStep(stepValue);
      return step && step.stepId === stepId ? [[stepId, step] as const] : [];
    });
    return steps.length > 0 ? [[flowSlug, Object.fromEntries(steps)] as const] : [];
  });
  return flows.length > 0 ? Object.fromEntries(flows) : undefined;
}

function normalizeSavedFlowMapPersonalCopy(value: unknown): SourceBackedFlowMapPersonalCopy | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const personalCopy = value as Partial<SourceBackedFlowMapPersonalCopy>;
  if (
    personalCopy.source !== 'url_first_custom_start' &&
    personalCopy.source !== 'version_review' &&
    personalCopy.source !== 'personal_edit'
  ) return undefined;

  const includedStepIdsByFlow = normalizeStringListRecord(personalCopy.includedStepIdsByFlow);
  const excludedStepIdsByFlow = normalizeStringListRecord(personalCopy.excludedStepIdsByFlow);
  const stepOverridesByFlow = normalizeSavedFlowMapPersonalCopyStepOverrides(personalCopy.stepOverridesByFlow);
  const retainedStepsByFlow = normalizeSavedFlowMapRetainedSteps(personalCopy.retainedStepsByFlow);
  if (!includedStepIdsByFlow || !excludedStepIdsByFlow) return undefined;

  return {
    source: personalCopy.source,
    ...(typeof personalCopy.originalTitle === 'string' && personalCopy.originalTitle.trim()
      ? { originalTitle: personalCopy.originalTitle }
      : {}),
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
    ...(stepOverridesByFlow ? { stepOverridesByFlow } : {}),
    ...(retainedStepsByFlow ? { retainedStepsByFlow } : {}),
  };
}

export function normalizeSavedFlowMapSnapshot(value: unknown): SavedFlowMapSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<SavedFlowMapSnapshot>;
  if (typeof snapshot.mapId !== 'string' || !snapshot.mapId.trim()) return undefined;
  if (typeof snapshot.title !== 'string' || !snapshot.title.trim()) return undefined;
  if (typeof snapshot.version !== 'string' || !snapshot.version.trim()) return undefined;
  if (typeof snapshot.savedAt !== 'string' || !snapshot.savedAt.trim()) return undefined;
  if (!Array.isArray(snapshot.flowSlugs) || snapshot.flowSlugs.some((slug) => typeof slug !== 'string' || !slug.trim())) return undefined;
  const anchor = typeof snapshot.anchor === 'string' && snapshot.anchor.trim() ? snapshot.anchor : undefined;
  const personalCopy = normalizeSavedFlowMapPersonalCopy(snapshot.personalCopy);

  return {
    mapId: snapshot.mapId,
    title: snapshot.title,
    version: snapshot.version,
    savedAt: snapshot.savedAt,
    ...(anchor ? { anchor } : {}),
    flowSlugs: snapshot.flowSlugs,
    ...(snapshot.stepCountsByFlow && typeof snapshot.stepCountsByFlow === 'object' ? { stepCountsByFlow: snapshot.stepCountsByFlow } : {}),
    ...(snapshot.riskLevelsByFlow && typeof snapshot.riskLevelsByFlow === 'object' ? { riskLevelsByFlow: snapshot.riskLevelsByFlow } : {}),
    ...(snapshot.sourceCheckedAtByFlow && typeof snapshot.sourceCheckedAtByFlow === 'object' ? { sourceCheckedAtByFlow: snapshot.sourceCheckedAtByFlow } : {}),
    ...(personalCopy ? { personalCopy } : {}),
  };
}

export function getSavedFlowMapSnapshots(): SavedFlowMapSnapshot[] {
  if (!canUseStorage()) return [];
  const keys = typeof localStorage.key === 'function'
    ? Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => Boolean(key))
    : Object.keys(localStorage);
  return keys
    .filter((key) => key.startsWith(SAVED_FLOW_MAP_KEY_PREFIX))
    .flatMap((key) => {
      try {
        const snapshot = normalizeSavedFlowMapSnapshot(JSON.parse(localStorage.getItem(key) || 'null'));
        return snapshot ? [snapshot] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getSavedFlowMapIndexByFlowSlug(): Record<string, SavedFlowMapSnapshot> {
  return getSavedFlowMapSnapshots().reduce<Record<string, SavedFlowMapSnapshot>>((index, snapshot) => {
    snapshot.flowSlugs.forEach((slug) => {
      if (!index[slug]) index[slug] = snapshot;
    });
    return index;
  }, {});
}

export function getMyFlowStepItemChecks(): MyFlowStepItemChecks {
  if (!canUseStorage()) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_FLOW_STEP_ITEM_CHECKS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMyFlowStepItemChecks(value: MyFlowStepItemChecks): void {
  if (!canUseStorage()) return;
  localStorage.setItem(MY_FLOW_STEP_ITEM_CHECKS_KEY, JSON.stringify(value));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

function normalizeCompletionReflection(value: unknown): MyFlowCompletionReflection | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const reflection = value as Partial<MyFlowCompletionReflection>;
  if (reflection.outcome !== 'helpful' && reflection.outcome !== 'needs_changes') return undefined;
  if (typeof reflection.updatedAt !== 'string' || !reflection.updatedAt.trim()) return undefined;
  const note = typeof reflection.note === 'string' && reflection.note.trim() ? reflection.note.trim() : undefined;
  return {
    outcome: reflection.outcome,
    ...(note ? { note } : {}),
    updatedAt: reflection.updatedAt,
  };
}

function normalizeSourceCorrectionDraft(value: unknown): MyFlowSourceCorrectionDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const correction = value as Partial<MyFlowSourceCorrectionDraft>;
  if (correction.scope !== 'flow' && correction.scope !== 'item') return undefined;
  if (typeof correction.note !== 'string' || !correction.note.trim()) return undefined;
  if (typeof correction.updatedAt !== 'string' || !correction.updatedAt.trim()) return undefined;

  const itemId = typeof correction.itemId === 'string' && correction.itemId.trim() ? correction.itemId.trim() : undefined;
  const itemTitle = typeof correction.itemTitle === 'string' && correction.itemTitle.trim() ? correction.itemTitle.trim() : undefined;
  const sourceUrl = typeof correction.sourceUrl === 'string' && correction.sourceUrl.trim() ? correction.sourceUrl.trim() : undefined;
  if (correction.scope === 'item' && (!itemId || !itemTitle)) return undefined;

  return {
    scope: correction.scope,
    note: correction.note.trim(),
    updatedAt: correction.updatedAt,
    ...(correction.scope === 'item' && itemId && itemTitle ? { itemId, itemTitle } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

export function normalizeMyFlowCompletionFeedback(value: unknown): MyFlowCompletionFeedback | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const feedback = value as Partial<MyFlowCompletionFeedback>;
  if (typeof feedback.flowSlug !== 'string' || !feedback.flowSlug.trim()) return undefined;
  const reflection = normalizeCompletionReflection(feedback.reflection);
  const sourceCorrectionDraft = normalizeSourceCorrectionDraft(feedback.sourceCorrectionDraft);
  if (!reflection && !sourceCorrectionDraft) return undefined;

  return {
    flowSlug: feedback.flowSlug.trim(),
    ...(reflection ? { reflection } : {}),
    ...(sourceCorrectionDraft ? { sourceCorrectionDraft } : {}),
  };
}

export function getMyFlowCompletionFeedback(flowSlug: string): MyFlowCompletionFeedback | undefined {
  if (!canUseStorage()) return undefined;
  try {
    return normalizeMyFlowCompletionFeedback(
      JSON.parse(localStorage.getItem(`${MY_FLOW_COMPLETION_FEEDBACK_KEY_PREFIX}${flowSlug}`) || 'null'),
    );
  } catch {
    return undefined;
  }
}

export function saveMyFlowCompletionFeedback(
  flowSlug: string,
  value: Omit<MyFlowCompletionFeedback, 'flowSlug'>,
): MyFlowCompletionFeedback | undefined {
  if (!canUseStorage()) return undefined;
  const normalized = normalizeMyFlowCompletionFeedback({ flowSlug, ...value });
  if (!normalized) return undefined;
  localStorage.setItem(`${MY_FLOW_COMPLETION_FEEDBACK_KEY_PREFIX}${flowSlug}`, JSON.stringify(normalized));
  syncCompletionFeedbackToLatestCompletedFlowRun(flowSlug, normalized);
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
  return normalized;
}

export function getMyFlowExecutionNotes(flowSlug: string): MyFlowExecutionNote[] {
  if (!canUseStorage()) return [];
  try {
    return normalizeMyFlowExecutionNotes(
      JSON.parse(localStorage.getItem(`${MY_FLOW_EXECUTION_NOTES_KEY_PREFIX}${flowSlug}`) || '[]'),
    );
  } catch {
    return [];
  }
}

export function saveMyFlowExecutionNote(
  flowSlug: string,
  input: MyFlowExecutionNoteInput,
): MyFlowExecutionNote[] | undefined {
  if (!canUseStorage() || !flowSlug.trim()) return undefined;
  const notes = upsertMyFlowExecutionNote(getMyFlowExecutionNotes(flowSlug), input);
  const key = `${MY_FLOW_EXECUTION_NOTES_KEY_PREFIX}${flowSlug}`;
  if (notes.length > 0) localStorage.setItem(key, JSON.stringify(notes));
  else localStorage.removeItem(key);
  syncExecutionNotesToLatestCompletedFlowRun(flowSlug, notes);
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
  return notes;
}

export function getFlowCompletionDetectedAt(flowSlug: string): string | undefined {
  if (!canUseStorage()) return undefined;
  const value = localStorage.getItem(`${FLOW_COMPLETION_DETECTED_AT_KEY_PREFIX}${flowSlug}`)?.trim();
  return value || undefined;
}

export function recordFlowCompletionState(
  flowSlug: string,
  completed: boolean,
  completedAt = new Date().toISOString(),
): string | undefined {
  if (!canUseStorage() || !flowSlug.trim()) return undefined;
  const key = `${FLOW_COMPLETION_DETECTED_AT_KEY_PREFIX}${flowSlug}`;
  if (!completed) {
    localStorage.removeItem(key);
    return undefined;
  }
  const existing = localStorage.getItem(key)?.trim();
  if (existing) return existing;
  localStorage.setItem(key, completedAt);
  return completedAt;
}

export function clearFlowLocalProgress(slug: string): void {
  if (!canUseStorage()) return;
  [
    `${SAVED_FLOW_KEY_PREFIX}${slug}`,
    `${CHECKS_KEY_PREFIX}${slug}`,
    `${ANCHOR_KEY_PREFIX}${slug}:anchorDate`,
    `${ITEM_STATE_KEY_PREFIX}${slug}`,
    `${COMPARISON_KEY_PREFIX}${slug}`,
    `${WORKBENCH_KEY_PREFIX}${slug}`,
    `${REACTIONS_KEY_PREFIX}${slug}`,
    `${MY_FLOW_COMPLETION_FEEDBACK_KEY_PREFIX}${slug}`,
    `${MY_FLOW_EXECUTION_NOTES_KEY_PREFIX}${slug}`,
    `${FLOW_RUN_REGISTRY_KEY_PREFIX}${slug}`,
    `${FLOW_COMPLETION_DETECTED_AT_KEY_PREFIX}${slug}`,
    `${FLOW_PROJECTION_IDENTITY_MIGRATION_STORAGE_KEY_PREFIX}${encodeURIComponent(slug)}`,
  ].forEach((key) => localStorage.removeItem(key));
  const stepItemChecks = getMyFlowStepItemChecks();
  const nextStepItemChecks = Object.fromEntries(
    Object.entries(stepItemChecks).filter(([key]) => !key.startsWith(`${slug}::`)),
  );
  localStorage.setItem(MY_FLOW_STEP_ITEM_CHECKS_KEY, JSON.stringify(nextStepItemChecks));
  replaceFlowScopedMyFlowPersonalExecutionState(slug);
  removePersonalStructuralOverlaysForFlow(localStorage, slug);
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

function omitFlowKey<T>(
  value: Record<string, T> | undefined,
  flowSlug: string,
): Record<string, T> | undefined {
  if (!value || typeof value !== 'object') return value;
  const next = { ...value };
  delete next[flowSlug];
  return Object.keys(next).length > 0 ? next : undefined;
}

function removeSavedMapFlowReference(
  snapshot: SavedFlowMapSnapshot,
  flowSlug: string,
): SavedFlowMapSnapshot | undefined {
  if (!snapshot.flowSlugs.includes(flowSlug)) return snapshot;
  const flowSlugs = snapshot.flowSlugs.filter((slug) => slug !== flowSlug);
  if (flowSlugs.length === 0) return undefined;
  const personalCopy = snapshot.personalCopy
    ? {
        ...snapshot.personalCopy,
        includedStepIdsByFlow: omitFlowKey(snapshot.personalCopy.includedStepIdsByFlow, flowSlug) ?? {},
        excludedStepIdsByFlow: omitFlowKey(snapshot.personalCopy.excludedStepIdsByFlow, flowSlug) ?? {},
        stepOverridesByFlow: omitFlowKey(snapshot.personalCopy.stepOverridesByFlow, flowSlug) ?? {},
      }
    : undefined;
  return {
    ...snapshot,
    flowSlugs,
    stepCountsByFlow: omitFlowKey(snapshot.stepCountsByFlow, flowSlug),
    riskLevelsByFlow: omitFlowKey(snapshot.riskLevelsByFlow, flowSlug),
    sourceCheckedAtByFlow: omitFlowKey(snapshot.sourceCheckedAtByFlow, flowSlug),
    ...(personalCopy ? { personalCopy } : {}),
  };
}

function removeSavedMapPersistenceFlowReference(
  value: SourceBackedFlowMapPersistenceRecord,
  flowSlug: string,
): SourceBackedFlowMapPersistenceRecord {
  const personalCopy = value.personalCopy
    ? {
        ...value.personalCopy,
        includedStepIdsByFlow: omitFlowKey(value.personalCopy.includedStepIdsByFlow, flowSlug) ?? {},
        excludedStepIdsByFlow: omitFlowKey(value.personalCopy.excludedStepIdsByFlow, flowSlug) ?? {},
        stepOverridesByFlow: omitFlowKey(value.personalCopy.stepOverridesByFlow, flowSlug) ?? {},
      }
    : undefined;
  return {
    ...value,
    childFlows: value.childFlows.filter((child) => child.slug !== flowSlug),
    updateAssessment: {
      ...value.updateAssessment,
      affectedFlows: value.updateAssessment.affectedFlows.filter((slug) => slug !== flowSlug),
    },
    ...(personalCopy ? { personalCopy } : {}),
  };
}

/**
 * Permanently removes a saved personal copy from this browser while preserving
 * published/source-backed definitions. A personal draft additionally removes
 * its locally-created bundle because that bundle has no public source owner.
 */
export function permanentlyDeleteSavedFlow(
  flowSlug: string,
  options: { personalDraft: boolean; deletedAt?: string },
): PermanentSavedFlowDeletionResult | undefined {
  if (!canUseStorage()) return undefined;
  const slug = flowSlug.trim();
  if (!slug) return undefined;

  const archivedBefore = loadPersonalFlowLifecycle(localStorage).record;
  const lifecycleReferenceRemoved = archivedBefore.archivedFlowSlugs.includes(slug);
  savePersonalFlowLifecycle(
    localStorage,
    restorePersonalFlow(
      archivedBefore,
      slug,
      options.deletedAt ?? new Date().toISOString(),
    ),
  );

  const removedSavedMapIds: string[] = [];
  const updatedSavedMapIds: string[] = [];
  const snapshotKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(SAVED_FLOW_MAP_KEY_PREFIX)));
  snapshotKeys.forEach((key) => {
    try {
      const snapshot = JSON.parse(localStorage.getItem(key) || 'null') as SavedFlowMapSnapshot | null;
      if (!snapshot?.flowSlugs?.includes(slug)) return;
      const nextSnapshot = removeSavedMapFlowReference(snapshot, slug);
      const persistenceKey = getSourceBackedFlowMapPersistenceStorageKey(snapshot.mapId);
      if (!nextSnapshot) {
        localStorage.removeItem(key);
        localStorage.removeItem(persistenceKey);
        removedSavedMapIds.push(snapshot.mapId);
        return;
      }
      localStorage.setItem(key, JSON.stringify(nextSnapshot));
      const persistenceRaw = localStorage.getItem(persistenceKey);
      if (persistenceRaw) {
        try {
          const persistence = JSON.parse(persistenceRaw) as SourceBackedFlowMapPersistenceRecord;
          localStorage.setItem(
            persistenceKey,
            JSON.stringify(removeSavedMapPersistenceFlowReference(persistence, slug)),
          );
        } catch {
          // A malformed map record must not prevent deletion of the valid copy.
        }
      }
      updatedSavedMapIds.push(snapshot.mapId);
    } catch {
      // Ignore unrelated malformed map snapshots and continue deleting the copy.
    }
  });

  let personalDraftBundleRemoved = false;
  if (options.personalDraft) {
    try {
      const storedBundles = JSON.parse(localStorage.getItem(BUNDLES_KEY) || '[]') as FlowBundle[];
      const nextBundles = storedBundles.filter((bundle) => bundle.flow.slug !== slug);
      personalDraftBundleRemoved = nextBundles.length !== storedBundles.length;
      localStorage.setItem(BUNDLES_KEY, JSON.stringify(nextBundles));
    } catch {
      // clearFlowLocalProgress still removes the saved relation. A malformed
      // bundle registry remains recoverable through the normal seed fallback.
    }
  }

  const selectedCalendarFlowsKey = 'flow:calendar:selected-flows:v1';
  try {
    const selectedFlowSlugs = JSON.parse(
      localStorage.getItem(selectedCalendarFlowsKey) || '[]',
    ) as unknown;
    if (Array.isArray(selectedFlowSlugs)) {
      const next = selectedFlowSlugs.filter((value) => value !== slug);
      if (next.length > 0) localStorage.setItem(selectedCalendarFlowsKey, JSON.stringify(next));
      else localStorage.removeItem(selectedCalendarFlowsKey);
    }
  } catch {
    localStorage.removeItem(selectedCalendarFlowsKey);
  }

  clearFlowLocalProgress(slug);
  return {
    flowSlug: slug,
    personalDraft: options.personalDraft,
    lifecycleReferenceRemoved,
    personalDraftBundleRemoved,
    removedSavedMapIds,
    updatedSavedMapIds,
    publicSourcePreserved: !options.personalDraft,
  };
}

export function getReactionLogs(slug: string): Record<string, ReactionLog> {
  if (!canUseStorage()) return {};
  return JSON.parse(localStorage.getItem(`${REACTIONS_KEY_PREFIX}${slug}`) || '{}');
}

export function saveReactionLogs(
  slug: string,
  value: Record<string, ReactionLog>,
): void {
  if (!canUseStorage()) return;
  localStorage.setItem(`${REACTIONS_KEY_PREFIX}${slug}`, JSON.stringify(value));
}

export function getComparisonState(slug: string): FlowComparisonState {
  if (!canUseStorage()) return { candidates: [], notes: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(`${COMPARISON_KEY_PREFIX}${slug}`) || '{"candidates":[],"notes":{}}') as FlowComparisonState;
    return {
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    };
  } catch {
    return { candidates: [], notes: {} };
  }
}

export function saveComparisonState(slug: string, value: FlowComparisonState): void {
  if (!canUseStorage()) return;
  localStorage.setItem(`${COMPARISON_KEY_PREFIX}${slug}`, JSON.stringify(value));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

function emptyWorkbenchState(): FlowWorkbenchState {
  return { occurrences: {}, logRows: {}, memoCards: {} };
}

export function normalizeWorkbenchState(value: Partial<FlowWorkbenchState> | null | undefined): FlowWorkbenchState {
  return {
    occurrences: value?.occurrences && typeof value.occurrences === 'object' ? value.occurrences : {},
    logRows: value?.logRows && typeof value.logRows === 'object' ? value.logRows : {},
    memoCards: value?.memoCards && typeof value.memoCards === 'object' ? value.memoCards : {},
    weeklyReview: typeof value?.weeklyReview === 'string' ? value.weeklyReview : undefined,
  };
}

export function getWorkbenchState(slug: string): FlowWorkbenchState {
  if (!canUseStorage()) return emptyWorkbenchState();
  try {
    return normalizeWorkbenchState(JSON.parse(localStorage.getItem(`${WORKBENCH_KEY_PREFIX}${slug}`) || '{}') as Partial<FlowWorkbenchState>);
  } catch {
    return emptyWorkbenchState();
  }
}

export function saveWorkbenchState(slug: string, value: FlowWorkbenchState): void {
  if (!canUseStorage()) return;
  localStorage.setItem(`${WORKBENCH_KEY_PREFIX}${slug}`, JSON.stringify(normalizeWorkbenchState(value)));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
}

function hasWorkbenchProgress(state: FlowWorkbenchState): boolean {
  return (
    Object.values(state.occurrences).some((entry) => Boolean(entry.done) || Boolean(entry.note?.trim())) ||
    Object.values(state.logRows).some((row) => Object.values(row).some((value) => value.trim())) ||
    Object.values(state.memoCards).some((value) => value.trim()) ||
    Boolean(state.weeklyReview?.trim())
  );
}

export function getActiveFlowProgress(bundles: FlowBundle[] = getBundles()): ActiveFlowProgress[] {
  if (!canUseStorage()) return [];

  const lastVisited = localStorage.getItem('flow:meta:last-visit') ?? undefined;
  const progress: ActiveFlowProgress[] = [];

  for (const bundle of bundles) {
    const checks = getChecks(bundle.flow.slug);
    const itemStates = getItemStates(bundle.flow.slug);
    const comparisonState = getComparisonState(bundle.flow.slug);
    const workbenchState = getWorkbenchState(bundle.flow.slug);
    const storedAnchor = getStoredAnchor(bundle.flow.slug);
    const savedRecord = getSavedFlowRecord(bundle.flow.slug);
    const ids = bundle.flow.content_type === 'meal_plan'
      ? (bundle.mealSlots ?? []).map((slot) => slot.id)
      : bundle.items.map((item) => item.id);
    const skipped = ids.filter((id) => isFlowItemOmittedFromActiveProjection(itemStates[id])).length;
    const total = Math.max(ids.length - skipped, 0);
    const done = ids.filter((id) => checks[id] && !isFlowItemOmittedFromActiveProjection(itemStates[id])).length;
    const hasProgress =
      Boolean(savedRecord) ||
      done > 0 ||
      skipped > 0 ||
      Boolean(storedAnchor.anchor) ||
      storedAnchor.mode === 'undated' ||
      storedAnchor.mode === 'undecided' ||
      Object.values(itemStates).some((state) => (
        Boolean(getFlowItemUserNote(state)) ||
        isFlowItemPersonallyExcluded(state) ||
        Boolean(state.skipped)
      )) ||
      comparisonState.candidates.some((candidate) => candidate.name.trim()) ||
      Object.values(comparisonState.notes).some((row) => Object.values(row).some((note) => note.trim())) ||
      hasWorkbenchProgress(workbenchState);

    if (hasProgress) {
      progress.push({
        slug: bundle.flow.slug,
        title: savedRecord?.personalTitle ?? bundle.flow.title,
        done,
        total,
        skipped,
        anchor: storedAnchor.anchor || savedRecord?.anchor,
        anchorMode: normalizePublicDateIntentMode(storedAnchor.mode),
        ...(savedRecord?.weekdays?.length ? { weekdays: savedRecord.weekdays } : {}),
        ...(savedRecord?.routineDefinition ? { routineDefinition: savedRecord.routineDefinition } : {}),
        lastVisited: savedRecord?.savedAt ?? lastVisited,
      });
    }
  }

  return progress;
}

function cloneStorageValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => Boolean(entry[0].trim()) && typeof entry[1] === 'boolean',
    ),
  );
}

function normalizeFlowRunItemStates(value: unknown): Record<string, FlowItemState> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([itemId, itemState]) => {
      if (!itemId.trim() || !itemState || typeof itemState !== 'object') return [];
      const source = itemState as Partial<FlowItemState>;
      const normalized: FlowItemState = {};
      if (typeof source.skipped === 'boolean') normalized.skipped = source.skipped;
      if (typeof source.note === 'string' && source.note.trim()) normalized.note = source.note;
      return [[itemId, normalized] as const];
    }),
  );
}

function normalizeFlowRunStepItemChecks(value: unknown): MyFlowStepItemChecks {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([rowKey, checks]) => {
      if (!rowKey.trim()) return [];
      const normalized = normalizeBooleanRecord(checks);
      return Object.keys(normalized).length > 0 ? [[rowKey, normalized] as const] : [];
    }),
  );
}

function normalizeFlowRunComparisonState(value: unknown): FlowComparisonState {
  if (!value || typeof value !== 'object') return { candidates: [], notes: {} };
  const source = value as Partial<FlowComparisonState>;
  const candidates = Array.isArray(source.candidates)
    ? source.candidates.flatMap((candidate) => {
        if (!candidate || typeof candidate !== 'object') return [];
        const row = candidate as { id?: unknown; name?: unknown };
        return typeof row.id === 'string' && row.id.trim() && typeof row.name === 'string'
          ? [{ id: row.id, name: row.name }]
          : [];
      })
    : [];
  const notes = source.notes && typeof source.notes === 'object'
    ? Object.fromEntries(
        Object.entries(source.notes).flatMap(([rowId, noteRecord]) => {
          if (!rowId.trim() || !noteRecord || typeof noteRecord !== 'object') return [];
          const normalizedNotes = Object.fromEntries(
            Object.entries(noteRecord as Record<string, unknown>).filter(
              (entry): entry is [string, string] => Boolean(entry[0].trim()) && typeof entry[1] === 'string',
            ),
          );
          return [[rowId, normalizedNotes] as const];
        }),
      )
    : {};
  return { candidates, notes };
}

function normalizeFlowRunReactionLogs(value: unknown): Record<string, ReactionLog> {
  if (!value || typeof value !== 'object') return {};
  const fields: (keyof ReactionLog)[] = [
    'amount',
    'fedAt',
    'skin',
    'vomitingOrDiarrhea',
    'stool',
    'sleep',
    'preferenceNote',
  ];
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([rowId, rawLog]) => {
      if (!rowId.trim() || !rawLog || typeof rawLog !== 'object') return [];
      const source = rawLog as Partial<ReactionLog>;
      const normalized = fields.reduce<ReactionLog>((log, field) => {
        if (typeof source[field] === 'string') log[field] = source[field];
        return log;
      }, {});
      return [[rowId, normalized] as const];
    }),
  );
}

function normalizeFlowRunItemSnapshot(value: unknown): FlowRunItemSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<FlowRunItemSnapshot>;
  const itemId = typeof source.itemId === 'string' ? source.itemId.trim() : '';
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  if (!itemId || !title) return undefined;
  const status: FlowRunItemSnapshotStatus =
    source.status === 'done' ||
    source.status === 'reopened' ||
    source.status === 'skipped' ||
    source.status === 'held'
      ? source.status
      : 'pending';
  const date = typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)
    ? source.date
    : undefined;
  const validTime = typeof source.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(source.time)
    ? source.time
    : undefined;
  const durationMinutes = typeof source.durationMinutes === 'number' && Number.isFinite(source.durationMinutes)
    ? Math.min(1440, Math.max(5, Math.round(source.durationMinutes)))
    : undefined;
  const scheduleState: FlowRunItemSnapshot['scheduleState'] = !date
    ? 'unscheduled'
    : source.scheduleState === 'timed' && validTime
      ? 'timed'
      : 'all_day';
  const personalOrderRank = typeof source.personalOrderRank === 'number' && Number.isFinite(source.personalOrderRank)
    ? Math.max(0, Math.round(source.personalOrderRank))
    : 0;
  const memo = typeof source.memo === 'string' && source.memo.trim()
    ? source.memo.trim().slice(0, 4000)
    : undefined;
  return {
    itemId: itemId.slice(0, 500),
    title: title.slice(0, 1000),
    status,
    scheduleState,
    ...(date ? { date } : {}),
    ...(scheduleState === 'timed' && validTime ? { time: validTime } : {}),
    ...(scheduleState === 'timed' && durationMinutes ? { durationMinutes } : {}),
    ...(memo ? { memo } : {}),
    personalOrderRank,
  };
}

function normalizeFlowRunItemSnapshots(value: unknown): FlowRunItemSnapshot[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    const snapshot = normalizeFlowRunItemSnapshot(entry);
    if (!snapshot || seen.has(snapshot.itemId)) return [];
    seen.add(snapshot.itemId);
    return [snapshot];
  });
}

function normalizeFlowRunCompletionSnapshot(value: unknown, flowSlug: string): FlowRunCompletionSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<FlowRunCompletionSnapshot>;
  const completionFeedback = normalizeMyFlowCompletionFeedback(source.completionFeedback);
  const executionNotes = normalizeMyFlowExecutionNotes(source.executionNotes);
  const itemSnapshots = normalizeFlowRunItemSnapshots(source.itemSnapshots);
  const flowTitle = typeof source.flowTitle === 'string' && source.flowTitle.trim()
    ? source.flowTitle.trim().slice(0, 1000)
    : undefined;
  return {
    checks: normalizeBooleanRecord(source.checks),
    itemStates: normalizeFlowRunItemStates(source.itemStates),
    stepItemChecks: normalizeFlowRunStepItemChecks(source.stepItemChecks),
    comparisonState: normalizeFlowRunComparisonState(source.comparisonState),
    workbenchState: normalizeWorkbenchState(source.workbenchState),
    reactionLogs: normalizeFlowRunReactionLogs(source.reactionLogs),
    ...(completionFeedback?.flowSlug === flowSlug ? { completionFeedback } : {}),
    ...(executionNotes.length > 0 ? { executionNotes } : {}),
    ...(flowTitle ? { flowTitle } : {}),
    ...(itemSnapshots ? { itemSnapshots } : {}),
  };
}

function isFlowRunReuseMode(value: unknown): value is FlowRunReuseMode {
  return value === 'legacy' || value === 'same_copy' || value === 'new_anchor' || value === 'reviewed_version';
}

function isFlowRunFixedDatePolicy(value: unknown): value is FlowRunFixedDatePolicy {
  return value === 'keep_fixed_dates' || value === 'reset_to_anchor';
}

export function normalizeFlowRunRecord(value: unknown): FlowRunRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<FlowRunRecord>;
  if (source.schemaVersion !== 1) return undefined;
  if (typeof source.runId !== 'string' || !source.runId.trim()) return undefined;
  if (typeof source.flowSlug !== 'string' || !source.flowSlug.trim()) return undefined;
  if (source.status !== 'active' && source.status !== 'completed') return undefined;
  if (typeof source.startedAt !== 'string' || !source.startedAt.trim()) return undefined;

  const completedAt = typeof source.completedAt === 'string' && source.completedAt.trim() ? source.completedAt : undefined;
  const completionSnapshot = normalizeFlowRunCompletionSnapshot(source.completionSnapshot, source.flowSlug);
  if (source.status === 'completed' && (!completedAt || !completionSnapshot)) return undefined;
  const personalCopySnapshot = normalizeSavedFlowMapPersonalCopy(source.personalCopySnapshot);
  const personalExecutionStateSnapshot = normalizeMyFlowPersonalExecutionState(source.personalExecutionStateSnapshot);

  return {
    schemaVersion: 1,
    runId: source.runId.trim(),
    flowSlug: source.flowSlug.trim(),
    status: source.status,
    startedAt: source.startedAt,
    ...(source.status === 'completed' && completedAt && completionSnapshot
      ? { completedAt, completionSnapshot }
      : {}),
    ...(typeof source.anchor === 'string' && source.anchor.trim() ? { anchor: source.anchor.trim() } : {}),
    ...(isSavedFlowArtifactMode(source.selectedArtifactMode)
      ? { selectedArtifactMode: source.selectedArtifactMode }
      : {}),
    ...(typeof source.mapId === 'string' && source.mapId.trim() ? { mapId: source.mapId.trim() } : {}),
    ...(typeof source.sourceVersion === 'string' && source.sourceVersion.trim()
      ? { sourceVersion: source.sourceVersion.trim() }
      : {}),
    ...(typeof source.previousRunId === 'string' && source.previousRunId.trim()
      ? { previousRunId: source.previousRunId.trim() }
      : {}),
    ...(isFlowRunReuseMode(source.reuseMode) ? { reuseMode: source.reuseMode } : {}),
    ...(isFlowRunFixedDatePolicy(source.fixedDatePolicy) ? { fixedDatePolicy: source.fixedDatePolicy } : {}),
    ...(personalCopySnapshot ? { personalCopySnapshot } : {}),
    ...(personalExecutionStateSnapshot && hasMyFlowPersonalExecutionState(personalExecutionStateSnapshot)
      ? { personalExecutionStateSnapshot }
      : {}),
  };
}

export function normalizeFlowRunRegistry(flowSlug: string, value: unknown): FlowRunRegistry {
  if (!value || typeof value !== 'object') return { schemaVersion: 1, runs: [] };
  const source = value as Partial<FlowRunRegistry>;
  if (source.schemaVersion !== 1 || !Array.isArray(source.runs)) return { schemaVersion: 1, runs: [] };
  const seen = new Set<string>();
  const runs = source.runs.flatMap((rawRun) => {
    const run = normalizeFlowRunRecord(rawRun);
    if (!run || run.flowSlug !== flowSlug || seen.has(run.runId)) return [];
    seen.add(run.runId);
    return [run];
  });
  const declaredActiveRunId =
    typeof source.activeRunId === 'string' &&
    runs.some((run) => run.runId === source.activeRunId && run.status === 'active')
      ? source.activeRunId
      : undefined;
  const activeRuns = runs.filter((run) => run.status === 'active');
  const activeRunId = declaredActiveRunId ?? (activeRuns.length === 1 ? activeRuns[0].runId : undefined);
  const normalizedRuns = runs.filter((run) => run.status === 'completed' || run.runId === activeRunId);
  return {
    schemaVersion: 1,
    ...(activeRunId ? { activeRunId } : {}),
    runs: normalizedRuns,
  };
}

export function getFlowRunRegistry(flowSlug: string): FlowRunRegistry {
  if (!canUseStorage()) return { schemaVersion: 1, runs: [] };
  try {
    return normalizeFlowRunRegistry(
      flowSlug,
      JSON.parse(localStorage.getItem(`${FLOW_RUN_REGISTRY_KEY_PREFIX}${flowSlug}`) || 'null'),
    );
  } catch {
    return { schemaVersion: 1, runs: [] };
  }
}

function saveFlowRunRegistry(flowSlug: string, registry: FlowRunRegistry): FlowRunRegistry | undefined {
  if (!canUseStorage()) return undefined;
  const normalized = normalizeFlowRunRegistry(flowSlug, registry);
  localStorage.setItem(`${FLOW_RUN_REGISTRY_KEY_PREFIX}${flowSlug}`, JSON.stringify(normalized));
  return normalized;
}

export function getActiveFlowRun(flowSlug: string): FlowRunRecord | undefined {
  const registry = getFlowRunRegistry(flowSlug);
  return registry.runs.find((run) => run.runId === registry.activeRunId && run.status === 'active');
}

export function getCompletedFlowRuns(flowSlug: string): FlowRunRecord[] {
  return getFlowRunRegistry(flowSlug).runs
    .filter((run) => run.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

function createFlowRunId(flowSlug: string): string {
  const randomId =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `run-${flowSlug}-${randomId}`;
}

function getFlowRunMapSnapshot(flowSlug: string, snapshot?: SavedFlowMapSnapshot): SavedFlowMapSnapshot | undefined {
  return snapshot ?? getSavedFlowMapIndexByFlowSlug()[flowSlug];
}

function hasLegacyFlowRunState(flowSlug: string, mapSnapshot?: SavedFlowMapSnapshot): boolean {
  if (getSavedFlowRecord(flowSlug) || mapSnapshot) return true;
  if (Object.keys(getChecks(flowSlug)).length > 0 || Object.keys(getItemStates(flowSlug)).length > 0) return true;
  if (getStoredAnchor(flowSlug).anchor || getMyFlowCompletionFeedback(flowSlug)) return true;
  if (Object.keys(getMyFlowStepItemChecks()).some((key) => key.startsWith(`${flowSlug}::`))) return true;
  const comparisonState = getComparisonState(flowSlug);
  if (comparisonState.candidates.length > 0 || Object.keys(comparisonState.notes).length > 0) return true;
  if (hasWorkbenchProgress(getWorkbenchState(flowSlug))) return true;
  try {
    return Object.keys(getReactionLogs(flowSlug)).length > 0;
  } catch {
    return false;
  }
}

export function ensureLegacyActiveFlowRun(
  flowSlug: string,
  options: EnsureLegacyFlowRunOptions = {},
): FlowRunRecord | undefined {
  if (!canUseStorage() || !flowSlug.trim()) return undefined;
  const registry = getFlowRunRegistry(flowSlug);
  const active = registry.runs.find((run) => run.runId === registry.activeRunId && run.status === 'active');
  if (active) return active;
  if (registry.runs.length > 0) return undefined;

  const mapSnapshot = getFlowRunMapSnapshot(flowSlug, options.mapSnapshot);
  if (!hasLegacyFlowRunState(flowSlug, mapSnapshot)) return undefined;
  const savedRecord = getSavedFlowRecord(flowSlug);
  const storedAnchor = getStoredAnchor(flowSlug).anchor;
  const personalExecutionState = getFlowScopedMyFlowPersonalExecutionState(flowSlug);
  const runId = options.runId?.trim() || createFlowRunId(flowSlug);
  const startedAt = options.startedAt?.trim() || savedRecord?.savedAt || new Date().toISOString();
  const run: FlowRunRecord = {
    schemaVersion: 1,
    runId,
    flowSlug,
    status: 'active',
    startedAt,
    ...(storedAnchor || savedRecord?.anchor ? { anchor: storedAnchor || savedRecord?.anchor } : {}),
    ...(savedRecord ? { selectedArtifactMode: savedRecord.selectedArtifactMode } : {}),
    ...(mapSnapshot?.mapId ? { mapId: mapSnapshot.mapId } : {}),
    ...(mapSnapshot?.version ? { sourceVersion: mapSnapshot.version } : {}),
    ...(mapSnapshot?.personalCopy ? { personalCopySnapshot: cloneStorageValue(mapSnapshot.personalCopy) } : {}),
    ...(hasMyFlowPersonalExecutionState(personalExecutionState)
      ? { personalExecutionStateSnapshot: cloneStorageValue(personalExecutionState) }
      : {}),
    reuseMode: 'legacy',
  };
  const saved = saveFlowRunRegistry(flowSlug, { schemaVersion: 1, activeRunId: runId, runs: [run] });
  return saved?.runs.find((entry) => entry.runId === runId);
}

export function captureCurrentFlowRunCompletionSnapshot(
  flowSlug: string,
  options: Pick<CompleteActiveFlowRunOptions, 'flowTitle' | 'itemSnapshots'> = {},
): FlowRunCompletionSnapshot {
  const stepItemChecks = Object.fromEntries(
    Object.entries(getMyFlowStepItemChecks()).filter(([key]) => key.startsWith(`${flowSlug}::`)),
  );
  let reactionLogs: Record<string, ReactionLog> = {};
  try {
    reactionLogs = getReactionLogs(flowSlug);
  } catch {
    reactionLogs = {};
  }
  const completionFeedback = getMyFlowCompletionFeedback(flowSlug);
  const executionNotes = getMyFlowExecutionNotes(flowSlug);
  const normalizedItemSnapshots = normalizeFlowRunItemSnapshots(options.itemSnapshots);
  return cloneStorageValue({
    checks: getChecks(flowSlug),
    itemStates: getItemStates(flowSlug),
    stepItemChecks,
    comparisonState: getComparisonState(flowSlug),
    workbenchState: getWorkbenchState(flowSlug),
    reactionLogs,
    ...(completionFeedback ? { completionFeedback } : {}),
    ...(executionNotes.length > 0 ? { executionNotes } : {}),
    ...(options.flowTitle?.trim() ? { flowTitle: options.flowTitle.trim() } : {}),
    ...(normalizedItemSnapshots ? { itemSnapshots: normalizedItemSnapshots } : {}),
  });
}

export function completeActiveFlowRun(
  flowSlug: string,
  options: CompleteActiveFlowRunOptions = {},
): FlowRunRecord | undefined {
  if (!canUseStorage()) return undefined;
  const active = getActiveFlowRun(flowSlug) ?? ensureLegacyActiveFlowRun(flowSlug, options);
  if (!active) return undefined;
  const registry = getFlowRunRegistry(flowSlug);
  const completedAt = options.completedAt?.trim() || getFlowCompletionDetectedAt(flowSlug) || new Date().toISOString();
  const mapSnapshot = getFlowRunMapSnapshot(flowSlug, options.mapSnapshot);
  const personalExecutionState = getFlowScopedMyFlowPersonalExecutionState(flowSlug);
  const completed: FlowRunRecord = {
    ...active,
    status: 'completed',
    completedAt,
    ...(mapSnapshot?.mapId ? { mapId: mapSnapshot.mapId } : {}),
    ...(mapSnapshot?.version ? { sourceVersion: mapSnapshot.version } : {}),
    ...(mapSnapshot?.personalCopy
      ? { personalCopySnapshot: cloneStorageValue(mapSnapshot.personalCopy) }
      : {}),
    ...(hasMyFlowPersonalExecutionState(personalExecutionState)
      ? { personalExecutionStateSnapshot: cloneStorageValue(personalExecutionState) }
      : {}),
    completionSnapshot: captureCurrentFlowRunCompletionSnapshot(flowSlug, options),
  };
  if (mapSnapshot && !mapSnapshot.personalCopy) delete completed.personalCopySnapshot;
  if (!hasMyFlowPersonalExecutionState(personalExecutionState)) delete completed.personalExecutionStateSnapshot;
  const saved = saveFlowRunRegistry(flowSlug, {
    schemaVersion: 1,
    runs: registry.runs.map((run) => (run.runId === active.runId ? completed : run)),
  });
  return saved?.runs.find((run) => run.runId === active.runId && run.status === 'completed');
}

function syncCompletionFeedbackToLatestCompletedFlowRun(
  flowSlug: string,
  feedback: MyFlowCompletionFeedback,
): FlowRunRecord | undefined {
  const registry = getFlowRunRegistry(flowSlug);
  if (registry.activeRunId) return undefined;
  const latestCompleted = registry.runs
    .filter((run) => run.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0];
  if (!latestCompleted?.completionSnapshot) return undefined;
  const updated: FlowRunRecord = {
    ...latestCompleted,
    completionSnapshot: {
      ...latestCompleted.completionSnapshot,
      completionFeedback: cloneStorageValue(feedback),
    },
  };
  const saved = saveFlowRunRegistry(flowSlug, {
    ...registry,
    runs: registry.runs.map((run) => (run.runId === updated.runId ? updated : run)),
  });
  return saved?.runs.find((run) => run.runId === updated.runId);
}

function syncExecutionNotesToLatestCompletedFlowRun(
  flowSlug: string,
  executionNotes: MyFlowExecutionNote[],
): FlowRunRecord | undefined {
  const registry = getFlowRunRegistry(flowSlug);
  if (registry.activeRunId) return undefined;
  const latestCompleted = registry.runs
    .filter((run) => run.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0];
  if (!latestCompleted?.completionSnapshot) return undefined;
  const completionSnapshot: FlowRunCompletionSnapshot = {
    ...latestCompleted.completionSnapshot,
    ...(executionNotes.length > 0 ? { executionNotes: cloneStorageValue(executionNotes) } : {}),
  };
  if (executionNotes.length === 0) delete completionSnapshot.executionNotes;
  const updated: FlowRunRecord = {
    ...latestCompleted,
    completionSnapshot,
  };
  const saved = saveFlowRunRegistry(flowSlug, {
    ...registry,
    runs: registry.runs.map((run) => (run.runId === updated.runId ? updated : run)),
  });
  return saved?.runs.find((run) => run.runId === updated.runId);
}

function resetCurrentFlowExecutionState(flowSlug: string): void {
  [
    `${CHECKS_KEY_PREFIX}${flowSlug}`,
    `${ANCHOR_KEY_PREFIX}${flowSlug}:anchorDate`,
    `${ITEM_STATE_KEY_PREFIX}${flowSlug}`,
    `${COMPARISON_KEY_PREFIX}${flowSlug}`,
    `${WORKBENCH_KEY_PREFIX}${flowSlug}`,
    `${REACTIONS_KEY_PREFIX}${flowSlug}`,
    `${MY_FLOW_COMPLETION_FEEDBACK_KEY_PREFIX}${flowSlug}`,
    `${MY_FLOW_EXECUTION_NOTES_KEY_PREFIX}${flowSlug}`,
    `${FLOW_COMPLETION_DETECTED_AT_KEY_PREFIX}${flowSlug}`,
  ].forEach((key) => localStorage.removeItem(key));
  const stepItemChecks = getMyFlowStepItemChecks();
  localStorage.setItem(
    MY_FLOW_STEP_ITEM_CHECKS_KEY,
    JSON.stringify(
      Object.fromEntries(Object.entries(stepItemChecks).filter(([key]) => !key.startsWith(`${flowSlug}::`))),
    ),
  );
}

function restorePersonalCopyExcludedItemStates(
  flowSlug: string,
  personalCopy?: SourceBackedFlowMapPersonalCopy,
): void {
  const excludedStepIds = personalCopy?.excludedStepIdsByFlow[flowSlug] ?? [];
  if (excludedStepIds.length === 0) return;
  localStorage.setItem(
    `${ITEM_STATE_KEY_PREFIX}${flowSlug}`,
    JSON.stringify(Object.fromEntries(excludedStepIds.map((stepId) => [
      stepId,
      { personalExcluded: true } satisfies FlowItemState,
    ]))),
  );
}

function updateSavedFlowMapProjectionForRun(
  flowSlug: string,
  value: {
    mapId?: string;
    sourceVersion?: string;
    savedAt: string;
    anchor?: string;
    personalCopySnapshot?: SourceBackedFlowMapPersonalCopy;
  },
): SavedFlowMapSnapshot | undefined {
  if (!value.mapId) return undefined;
  const current = getSavedFlowMapSnapshots().find(
    (snapshot) => snapshot.mapId === value.mapId && snapshot.flowSlugs.includes(flowSlug),
  );
  if (!current) return undefined;
  const next: SavedFlowMapSnapshot = {
    ...current,
    version: value.sourceVersion || current.version,
    savedAt: value.savedAt,
    ...(value.anchor ? { anchor: value.anchor } : {}),
    ...(value.personalCopySnapshot ? { personalCopy: cloneStorageValue(value.personalCopySnapshot) } : {}),
  };
  if (!value.anchor) delete next.anchor;
  if (!value.personalCopySnapshot) delete next.personalCopy;
  const normalized = normalizeSavedFlowMapSnapshot(next);
  if (!normalized) return undefined;
  localStorage.setItem(`${SAVED_FLOW_MAP_KEY_PREFIX}${value.mapId}`, JSON.stringify(normalized));
  const sourceBackedSnapshot = normalized.stepCountsByFlow
    && normalized.riskLevelsByFlow
    && normalized.sourceCheckedAtByFlow
    ? normalized as SourceBackedFlowMapSavedSnapshot
    : undefined;
  const persistenceRecord = sourceBackedSnapshot
    ? buildSourceBackedFlowMapPersistenceRecordUpdate(sourceBackedSnapshot, {
        savedAt: normalized.savedAt,
        ...(normalized.anchor ? { anchor: normalized.anchor } : {}),
        ...(() => {
          try {
            const raw = localStorage.getItem(getSourceBackedFlowMapPersistenceStorageKey(normalized.mapId));
            const baselineRecord = raw ? JSON.parse(raw) as SourceBackedFlowMapPersistenceRecord : undefined;
            return baselineRecord?.recordType === 'saved_source_backed_flow_map' ? { baselineRecord } : {};
          } catch {
            return {};
          }
        })(),
      })
    : undefined;
  if (persistenceRecord) {
    localStorage.setItem(
      getSourceBackedFlowMapPersistenceStorageKey(normalized.mapId),
      JSON.stringify(persistenceRecord),
    );
  }
  return normalized;
}

export function startFlowRunFromCompleted(
  flowSlug: string,
  options: StartFlowRunFromCompletedOptions,
): FlowRunRecord | undefined {
  if (!canUseStorage() || !flowSlug.trim()) return undefined;
  if (options.reuseMode === 'new_anchor' && !options.anchor?.trim()) return undefined;
  const registry = getFlowRunRegistry(flowSlug);
  if (registry.activeRunId) return undefined;
  const previous = options.previousRunId
    ? registry.runs.find((run) => run.runId === options.previousRunId && run.status === 'completed')
    : getCompletedFlowRuns(flowSlug)[0];
  if (!previous) return undefined;

  const runId = options.runId?.trim() || createFlowRunId(flowSlug);
  if (registry.runs.some((run) => run.runId === runId)) return undefined;
  const startedAt = options.startedAt?.trim() || new Date().toISOString();
  const selectedArtifactMode =
    options.selectedArtifactMode ?? previous.selectedArtifactMode ?? getSavedFlowRecord(flowSlug)?.selectedArtifactMode ?? 'calendar';
  const hasPersonalCopyOption = Object.prototype.hasOwnProperty.call(options, 'personalCopySnapshot');
  let personalCopySnapshot = hasPersonalCopyOption
    ? normalizeSavedFlowMapPersonalCopy(options.personalCopySnapshot)
    : previous.personalCopySnapshot;
  const hasPersonalExecutionStateOption = Object.prototype.hasOwnProperty.call(options, 'personalExecutionStateSnapshot');
  let personalExecutionStateSnapshot = hasPersonalExecutionStateOption
    ? normalizeMyFlowPersonalExecutionState(options.personalExecutionStateSnapshot)
    : previous.personalExecutionStateSnapshot ?? getFlowScopedMyFlowPersonalExecutionState(flowSlug);
  const mapId = options.mapId?.trim() || previous.mapId;
  const sourceVersion = options.sourceVersion?.trim() || previous.sourceVersion;
  const anchor = options.anchor?.trim();
  if (options.reuseMode === 'new_anchor' || (options.reuseMode === 'reviewed_version' && anchor)) {
    const newAnchorPlan = prepareFlowRunNewAnchor(
      personalCopySnapshot,
      anchor ?? '',
      options.fixedDatePolicy,
      personalExecutionStateSnapshot,
    );
    if (!newAnchorPlan) return undefined;
    personalCopySnapshot = newAnchorPlan.personalCopySnapshot;
    personalExecutionStateSnapshot = newAnchorPlan.personalExecutionStateSnapshot;
  } else if (personalExecutionStateSnapshot) {
    personalExecutionStateSnapshot = prepareMyFlowPersonalExecutionStateForReuse(
      personalExecutionStateSnapshot,
      { keepFixedDates: true },
    );
  }

  resetCurrentFlowExecutionState(flowSlug);
  restorePersonalCopyExcludedItemStates(flowSlug, personalCopySnapshot);
  replaceFlowScopedMyFlowPersonalExecutionState(flowSlug, personalExecutionStateSnapshot);
  const savedRecord: SavedFlowRecord = {
    slug: flowSlug,
    savedAt: startedAt,
    selectedArtifactMode,
    dateIntent: anchor ? 'custom' : 'undated',
    ...(anchor ? { anchor } : {}),
  };
  localStorage.setItem(`${SAVED_FLOW_KEY_PREFIX}${flowSlug}`, JSON.stringify(savedRecord));
  if (anchor) {
    localStorage.setItem(`${ANCHOR_KEY_PREFIX}${flowSlug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor }));
  }
  updateSavedFlowMapProjectionForRun(flowSlug, {
    mapId,
    sourceVersion,
    savedAt: startedAt,
    ...(anchor ? { anchor } : {}),
    ...(personalCopySnapshot ? { personalCopySnapshot } : {}),
  });
  localStorage.setItem('flow:meta:last-visit', startedAt);

  const active: FlowRunRecord = {
    schemaVersion: 1,
    runId,
    flowSlug,
    status: 'active',
    startedAt,
    previousRunId: previous.runId,
    reuseMode: options.reuseMode,
    ...((options.reuseMode === 'new_anchor' || options.reuseMode === 'reviewed_version') && options.fixedDatePolicy
      ? { fixedDatePolicy: options.fixedDatePolicy }
      : {}),
    selectedArtifactMode,
    ...(anchor ? { anchor } : {}),
    ...(mapId ? { mapId } : {}),
    ...(sourceVersion ? { sourceVersion } : {}),
    ...(personalCopySnapshot ? { personalCopySnapshot: cloneStorageValue(personalCopySnapshot) } : {}),
    ...(personalExecutionStateSnapshot && hasMyFlowPersonalExecutionState(personalExecutionStateSnapshot)
      ? { personalExecutionStateSnapshot: cloneStorageValue(personalExecutionStateSnapshot) }
      : {}),
  };
  const saved = saveFlowRunRegistry(flowSlug, {
    schemaVersion: 1,
    activeRunId: runId,
    runs: [...registry.runs, active],
  });
  return saved?.runs.find((run) => run.runId === runId && run.status === 'active');
}
