import { getPreviewFlowBundles } from './creator-channel-preview';
import { seedBundles } from './seed-flows';
import type { FlowBundle } from './types';

export const internalReviewBundles: FlowBundle[] = [
  ...seedBundles,
  ...getPreviewFlowBundles(),
];
