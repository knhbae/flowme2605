import type { FlowItemState } from './types';

export const LEGACY_PERSONAL_EXCLUSION_NOTE = 'excluded_on_start';

export function isLegacyPersonalExclusionState(state?: FlowItemState): boolean {
  return Boolean(
    state?.skipped &&
    state.note === LEGACY_PERSONAL_EXCLUSION_NOTE,
  );
}

export function isFlowItemPersonallyExcluded(state?: FlowItemState): boolean {
  return Boolean(state?.personalExcluded || isLegacyPersonalExclusionState(state));
}

export function isFlowItemOmittedFromActiveProjection(state?: FlowItemState): boolean {
  return Boolean(state?.skipped || isFlowItemPersonallyExcluded(state));
}

export function getFlowItemUserNote(state?: FlowItemState): string | undefined {
  if (isLegacyPersonalExclusionState(state)) return undefined;
  return state?.note;
}

export function setFlowItemPersonalExclusion(
  state: FlowItemState | undefined,
  excluded: boolean,
): FlowItemState | undefined {
  const next: FlowItemState = { ...state };

  if (isLegacyPersonalExclusionState(next)) {
    delete next.skipped;
    delete next.note;
  }

  if (excluded) next.personalExcluded = true;
  else delete next.personalExcluded;

  return Object.keys(next).length > 0 ? next : undefined;
}
