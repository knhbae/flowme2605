/**
 * Replaceable P1 defaults for the isolated functional PoC.
 *
 * This contract deliberately does not change Production navigation, tokens,
 * schema, writer ownership, or publication semantics.
 */
export const PERSONAL_WORKSPACE_POC_P1_CONTRACT_VERSION = 1 as const;

export const PERSONAL_WORKSPACE_POC_P1_REQUIRED_FEATURE_IDS = Object.freeze([
  'D1-010',
  'D2-003',
  'D2-019',
  'D2-020',
  'D2-035',
  'D2-036',
  'D2-039',
  'D2-041',
] as const);

export const PERSONAL_WORKSPACE_POC_P1_DECISION_IDS = Object.freeze([
  'V41-001',
  'V41-036',
  'D1-012',
  'D2-002',
  'D2-004',
  'D2-007',
  'D2-056',
  'D2-057',
] as const);

export const PERSONAL_WORKSPACE_POC_P1_EXPANSION_IDS = Object.freeze([
  'D2-023',
  'D2-024',
  'D2-025',
  'D2-026',
] as const);

export const PERSONAL_WORKSPACE_POC_P1_CONTRACT = Object.freeze({
  version: PERSONAL_WORKSPACE_POC_P1_CONTRACT_VERSION,
  scope: 'isolated-functional-poc' as const,
  shell: Object.freeze({
    productionNavigation: 'preserve-existing-platform-nav' as const,
    productionColorToken: 'preserve-existing-cobalt' as const,
    personalWorkspaceAccent: 'local-teal-only' as const,
    mobileNavigationAccessibleName: '개인공간 탐색' as const,
    mobileReviewAccessibleName: '현재 내용 검토' as const,
  }),
  ownership: Object.freeze({
    canonicalAdapter: 'versioned-poc-projection-adapter' as const,
    successfulAuthoringDestination: 'personal-flow' as const,
    editableSectionOwner: 'authoring-handoff-personal-only' as const,
    creatorDraft: 'not-opened' as const,
    publishedVersion: 'not-opened' as const,
    exportSnapshot: 'read-only-payload-no-operating-writer' as const,
  }),
  authoring: Object.freeze({
    compiler: 'versioned-poc-property-and-result-catalog' as const,
    recursiveStructureDraft: 'not-adopted-as-canonical' as const,
    ordinaryTextDefault: true,
    automaticNearMissCorrection: false,
  }),
  safety: Object.freeze({
    durableWriteNamespace: 'flow:poc:personal-workspace:v1:' as const,
    operatingWriterCalls: 0 as const,
    localStorageClearCalls: 0 as const,
  }),
  requiredFeatureIds: PERSONAL_WORKSPACE_POC_P1_REQUIRED_FEATURE_IDS,
  decisionIds: PERSONAL_WORKSPACE_POC_P1_DECISION_IDS,
  expansionIds: PERSONAL_WORKSPACE_POC_P1_EXPANSION_IDS,
});

export type PersonalWorkspacePocP1Contract = typeof PERSONAL_WORKSPACE_POC_P1_CONTRACT;
