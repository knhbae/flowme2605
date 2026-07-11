import type { FlowBundle } from './types';

export const GENERATED_PREVIEW_FLOW_ID_PREFIX = 'flow-preview-';

export const RUNTIME_ARCHIVED_FLOW_SLUGS = [
  'digital-detox-weekly',
  'new-hobby-30day',
  'real-fitvely-weekly-body-check',
  'skin-weekly-check',
] as const;

const runtimeArchivedFlowSlugSet = new Set<string>(RUNTIME_ARCHIVED_FLOW_SLUGS);

export function isGeneratedPreviewBundle(bundle: FlowBundle): boolean {
  return bundle.flow.id.startsWith(GENERATED_PREVIEW_FLOW_ID_PREFIX);
}

export function isRuntimeArchivedBundle(bundle: FlowBundle): boolean {
  return bundle.flow.status === 'published' && runtimeArchivedFlowSlugSet.has(bundle.flow.slug);
}

export function isRuntimeExcludedBundle(bundle: FlowBundle): boolean {
  return isGeneratedPreviewBundle(bundle) || isRuntimeArchivedBundle(bundle);
}
