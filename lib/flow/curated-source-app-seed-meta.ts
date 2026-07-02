import type { FlowBundle } from './types';

export const CURATED_SOURCE_APP_SEED_TAG = 'curated-source-app-seed';

export function isCuratedSourceAppSeedBundle(bundle: Pick<FlowBundle, 'flow'>): boolean {
  return Boolean(bundle.flow.tags?.includes(CURATED_SOURCE_APP_SEED_TAG));
}
