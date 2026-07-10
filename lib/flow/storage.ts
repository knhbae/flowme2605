import { seedBundles } from './seed-flows';
import type { SourceBackedFlowMapPersonalCopy, SourceBackedFlowMapPersonalCopyStepOverride } from './source-backed-my-flow';
import { FlowBundle, FlowComparisonState, FlowItemState, FlowWorkbenchState, ReactionLog } from './types';

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

export type StoredAnchor = {
  mode: string;
  anchor: string;
};

export type SavedFlowArtifactMode = 'calendar' | 'checklist' | 'sheet';

export type SavedFlowRecord = {
  slug: string;
  savedAt: string;
  selectedArtifactMode: SavedFlowArtifactMode;
  anchor?: string;
};

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
  lastVisited?: string;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function cloneSeedBundles(): FlowBundle[] {
  return JSON.parse(JSON.stringify(seedBundles)) as FlowBundle[];
}

export function mergeSeedBundles(stored: FlowBundle[], seeds: FlowBundle[]): FlowBundle[] {
  const seedIds = new Set(seeds.map((bundle) => bundle.flow.id));
  const localOnly = stored.filter((bundle) => !seedIds.has(bundle.flow.id));
  return [...seeds, ...localOnly];
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
    const migrated = mergeSeedBundles(previous, seeds);
    localStorage.setItem(BUNDLES_KEY, JSON.stringify(migrated));
    return migrated;
  }

  try {
    const stored = JSON.parse(raw) as FlowBundle[];
    const merged = mergeSeedBundles(stored, seeds);
    if (merged.length !== stored.length) {
      localStorage.setItem(BUNDLES_KEY, JSON.stringify(merged));
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
  return value === 'calendar' || value === 'checklist' || value === 'sheet';
}

export function normalizeSavedFlowRecord(value: unknown): SavedFlowRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Partial<SavedFlowRecord>;
  if (typeof record.slug !== 'string' || !record.slug.trim()) return undefined;
  if (typeof record.savedAt !== 'string' || !record.savedAt.trim()) return undefined;
  const anchor = typeof record.anchor === 'string' && record.anchor.trim() ? record.anchor : undefined;

  return {
    slug: record.slug,
    savedAt: record.savedAt,
    selectedArtifactMode: isSavedFlowArtifactMode(record.selectedArtifactMode) ? record.selectedArtifactMode : 'calendar',
    ...(anchor ? { anchor } : {}),
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

export function saveFlowRecord(slug: string, value: Omit<SavedFlowRecord, 'slug' | 'savedAt'>): SavedFlowRecord | undefined {
  if (!canUseStorage()) return undefined;
  const record: SavedFlowRecord = {
    slug,
    savedAt: new Date().toISOString(),
    selectedArtifactMode: value.selectedArtifactMode,
    anchor: value.anchor,
  };
  localStorage.setItem(`${SAVED_FLOW_KEY_PREFIX}${slug}`, JSON.stringify(record));
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

function normalizeSavedFlowMapPersonalCopy(value: unknown): SourceBackedFlowMapPersonalCopy | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const personalCopy = value as Partial<SourceBackedFlowMapPersonalCopy>;
  if (personalCopy.source !== 'url_first_custom_start') return undefined;

  const includedStepIdsByFlow = normalizeStringListRecord(personalCopy.includedStepIdsByFlow);
  const excludedStepIdsByFlow = normalizeStringListRecord(personalCopy.excludedStepIdsByFlow);
  const stepOverridesByFlow = normalizeSavedFlowMapPersonalCopyStepOverrides(personalCopy.stepOverridesByFlow);
  if (!includedStepIdsByFlow || !excludedStepIdsByFlow) return undefined;

  return {
    source: 'url_first_custom_start',
    ...(typeof personalCopy.originalTitle === 'string' && personalCopy.originalTitle.trim()
      ? { originalTitle: personalCopy.originalTitle }
      : {}),
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
    ...(stepOverridesByFlow ? { stepOverridesByFlow } : {}),
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
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
  return normalized;
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
  ].forEach((key) => localStorage.removeItem(key));
  const stepItemChecks = getMyFlowStepItemChecks();
  const nextStepItemChecks = Object.fromEntries(
    Object.entries(stepItemChecks).filter(([key]) => !key.startsWith(`${slug}::`)),
  );
  localStorage.setItem(MY_FLOW_STEP_ITEM_CHECKS_KEY, JSON.stringify(nextStepItemChecks));
  localStorage.setItem('flow:meta:last-visit', new Date().toISOString());
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
    const skipped = ids.filter((id) => itemStates[id]?.skipped).length;
    const total = Math.max(ids.length - skipped, 0);
    const done = ids.filter((id) => checks[id] && !itemStates[id]?.skipped).length;
    const hasProgress =
      Boolean(savedRecord) ||
      done > 0 ||
      skipped > 0 ||
      Boolean(storedAnchor.anchor) ||
      storedAnchor.mode === 'example' ||
      storedAnchor.mode === 'undecided' ||
      Object.values(itemStates).some((state) => Boolean(state.note)) ||
      comparisonState.candidates.some((candidate) => candidate.name.trim()) ||
      Object.values(comparisonState.notes).some((row) => Object.values(row).some((note) => note.trim())) ||
      hasWorkbenchProgress(workbenchState);

    if (hasProgress) {
      progress.push({
        slug: bundle.flow.slug,
        title: bundle.flow.title,
        done,
        total,
        skipped,
        anchor: storedAnchor.anchor || savedRecord?.anchor,
        anchorMode: storedAnchor.mode,
        lastVisited: savedRecord?.savedAt ?? lastVisited,
      });
    }
  }

  return progress;
}
