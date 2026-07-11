import type { FlowBundle } from './types';

export const GENERATED_PREVIEW_FLOW_ID_PREFIX = 'flow-preview-';

export function isGeneratedPreviewBundle(bundle: FlowBundle): boolean {
  return bundle.flow.id.startsWith(GENERATED_PREVIEW_FLOW_ID_PREFIX);
}
