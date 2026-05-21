import { seedBundles } from './seed-flows';
import { FlowBundle, ReactionLog } from './types';

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
