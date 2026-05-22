import { seedBundles } from './seed-flows';
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

export type StoredAnchor = {
  mode: string;
  anchor: string;
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
  return { occurrences: {}, logRows: {} };
}

export function normalizeWorkbenchState(value: Partial<FlowWorkbenchState> | null | undefined): FlowWorkbenchState {
  return {
    occurrences: value?.occurrences && typeof value.occurrences === 'object' ? value.occurrences : {},
    logRows: value?.logRows && typeof value.logRows === 'object' ? value.logRows : {},
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
    Boolean(state.weeklyReview?.trim())
  );
}

export function getActiveFlowProgress(): ActiveFlowProgress[] {
  if (!canUseStorage()) return [];

  const lastVisited = localStorage.getItem('flow:meta:last-visit') ?? undefined;
  const progress: ActiveFlowProgress[] = [];

  for (const bundle of getBundles()) {
    const checks = getChecks(bundle.flow.slug);
    const itemStates = getItemStates(bundle.flow.slug);
    const comparisonState = getComparisonState(bundle.flow.slug);
    const workbenchState = getWorkbenchState(bundle.flow.slug);
    const storedAnchor = getStoredAnchor(bundle.flow.slug);
    const ids = bundle.flow.content_type === 'meal_plan'
      ? (bundle.mealSlots ?? []).map((slot) => slot.id)
      : bundle.items.map((item) => item.id);
    const skipped = ids.filter((id) => itemStates[id]?.skipped).length;
    const total = Math.max(ids.length - skipped, 0);
    const done = ids.filter((id) => checks[id] && !itemStates[id]?.skipped).length;
    const hasProgress =
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
        anchor: storedAnchor.anchor,
        anchorMode: storedAnchor.mode,
        lastVisited,
      });
    }
  }

  return progress;
}
