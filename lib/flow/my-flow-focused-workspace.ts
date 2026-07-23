export type FocusedMyFlowWorkspaceInput = {
  isCalendarSurface: boolean;
  savedView: string;
  selectedFlowSlug: string;
  visibleFlowCount: number;
  showPostSavePanel: boolean;
};

export function isFocusedMyFlowWorkspaceState({
  isCalendarSurface,
  savedView,
  selectedFlowSlug,
  visibleFlowCount,
  showPostSavePanel,
}: FocusedMyFlowWorkspaceInput): boolean {
  return (
    !isCalendarSurface &&
    savedView === 'flow' &&
    selectedFlowSlug !== 'all' &&
    visibleFlowCount === 1 &&
    !showPostSavePanel
  );
}

export type DirectAnchorEditEligibilityInput = {
  isPersonalCopy: boolean;
  isUrlDraft: boolean;
  hasSavedMap: boolean;
  isPrimaryMapFlow: boolean;
  hasMapSetupInput: boolean;
  anchorType: string;
  hasStoredAnchor: boolean;
};

export function canEditDirectMyFlowAnchor({
  isPersonalCopy,
  isUrlDraft,
  hasSavedMap,
  isPrimaryMapFlow,
  hasMapSetupInput,
  anchorType,
  hasStoredAnchor,
}: DirectAnchorEditEligibilityInput): boolean {
  if (isPersonalCopy || isUrlDraft) return false;
  if (!hasSavedMap) return anchorType !== 'none';
  if (!isPrimaryMapFlow) return false;
  return hasMapSetupInput || anchorType !== 'none' || hasStoredAnchor;
}
