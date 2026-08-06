/**
 * Q3-B changes only user-facing vocabulary. FLOW remains the product brand and
 * route names, model types, variable names, and `flow:*` storage keys keep their
 * existing identity.
 *
 * Keep labels here semantic and surface-specific. Consumers must opt into the
 * exact label they own instead of replacing every occurrence of "Flow".
 */

export type Q3UserCopyProfile = {
  brand: 'FLOW';
  navigation: {
    findPlans: string;
    myPlans: string;
    createPlan: string;
  };
  publicPreview: {
    eyebrow: string;
    editPlan: string;
    editItem: string;
    saveToMyPlans: string;
    applyChanges: string;
  };
  savedLibrary: {
    pageTitle: string;
    sectionTitle: string;
    listTitle: string;
    searchPlaceholder: string;
    searchAccessibleName: string;
    emptyTitle: string;
  };
  savedDetail: {
    eyebrow: string;
    editPlan: string;
    editItem: string;
    saveChanges: string;
    wholePlanScope: string;
  };
  receipt: {
    savedTitle: string;
    continueInMyPlans: string;
    returnToDiscovery: string;
    close: string;
  };
  map: {
    selectPlans: string;
    editPlan: string;
    applyChanges: string;
    saveToMyPlans: string;
    transferToOwnTool: string;
  };
  transfer: {
    title: string;
    quickTitle: string;
    createResult: string;
    saveAndContinue: string;
    wholePlanScope: string;
  };
  itemExecution: {
    complete: string;
    completionCriterion: string;
    editItem: string;
  };
};

export const Q3_USER_COPY_PROFILE: Q3UserCopyProfile = {
  brand: 'FLOW',
  navigation: {
    findPlans: '계획 찾기',
    myPlans: '내 계획',
    createPlan: '계획 만들기',
  },
  publicPreview: {
    eyebrow: '계획 미리보기',
    editPlan: '계획 수정',
    editItem: '수정',
    saveToMyPlans: '내 계획에 저장',
    applyChanges: '변경 반영',
  },
  savedLibrary: {
    pageTitle: '내 계획',
    sectionTitle: '저장한 계획',
    listTitle: '계획 목록',
    searchPlaceholder: '계획 검색',
    searchAccessibleName: '저장한 계획 검색',
    emptyTitle: '저장한 계획이 없습니다',
  },
  savedDetail: {
    eyebrow: '저장한 계획',
    editPlan: '계획 수정',
    editItem: '수정',
    saveChanges: '저장',
    wholePlanScope: '계획 전체',
  },
  receipt: {
    savedTitle: '내 계획에 저장됨',
    continueInMyPlans: '내 계획에서 이어하기',
    returnToDiscovery: '계획 찾기로',
    close: '닫기',
  },
  map: {
    selectPlans: '계획 선택하기',
    editPlan: '계획 수정',
    applyChanges: '변경 반영',
    saveToMyPlans: '내 계획에 저장',
    transferToOwnTool: '내 도구로 옮기기',
  },
  transfer: {
    title: '내 도구로 옮기기',
    quickTitle: '바로 결과 만들기',
    createResult: '결과 만들기',
    saveAndContinue: '내 계획에 저장하고 이어가기',
    wholePlanScope: '계획 전체',
  },
  itemExecution: {
    complete: '완료',
    completionCriterion: '완료 기준',
    editItem: '수정',
  },
};

/** Exact legacy labels used only by the independent `q3Copy=off` rollback. */
export const Q3_LEGACY_USER_COPY_PROFILE: Q3UserCopyProfile = {
  brand: 'FLOW',
  navigation: {
    findPlans: 'Flow 찾기',
    myPlans: '내 Flow',
    createPlan: 'Flow 만들기',
  },
  publicPreview: {
    eyebrow: 'Flow 미리보기',
    editPlan: 'Flow 수정',
    editItem: '수정',
    saveToMyPlans: '내 Flow에 저장',
    applyChanges: '변경 반영',
  },
  savedLibrary: {
    pageTitle: '내 Flow',
    sectionTitle: '저장한 Flow',
    listTitle: 'Flow 목록',
    searchPlaceholder: 'Flow 검색',
    searchAccessibleName: '저장한 Flow 검색',
    emptyTitle: '저장한 Flow가 없습니다',
  },
  savedDetail: {
    eyebrow: '저장한 Flow',
    editPlan: 'Flow 수정',
    editItem: '수정',
    saveChanges: '저장',
    wholePlanScope: 'Flow 전체',
  },
  receipt: {
    savedTitle: '내 Flow에 저장됨',
    continueInMyPlans: '내 Flow에서 이어하기',
    returnToDiscovery: 'Flow 찾기로 돌아가기',
    close: '닫기',
  },
  map: {
    selectPlans: 'Flow 선택하기',
    editPlan: 'Flow 수정',
    applyChanges: '변경 반영',
    saveToMyPlans: '내 Flow에 저장',
    transferToOwnTool: '내 도구로 옮기기',
  },
  transfer: {
    title: '내 도구로 옮기기',
    quickTitle: '바로 결과 만들기',
    createResult: '결과 만들기',
    saveAndContinue: '내 Flow에 저장하고 이어가기',
    wholePlanScope: 'Flow 전체',
  },
  itemExecution: {
    complete: '완료',
    completionCriterion: '완료 기준',
    editItem: '수정',
  },
};

export function getQ3UserCopyProfile(enabled = true): Q3UserCopyProfile {
  return enabled ? Q3_USER_COPY_PROFILE : Q3_LEGACY_USER_COPY_PROFILE;
}

export type Q3ContractSurface =
  | 'navigation'
  | 'public-preview'
  | 'saved-library'
  | 'saved-detail'
  | 'receipt'
  | 'map'
  | 'transfer'
  | 'item-execution'
  | 'completion-criterion';

export type Q3CopySemanticContext =
  | Q3ContractSurface
  | 'brand'
  | 'source-content'
  | 'internal-identity';

export const Q3_ALLOWED_USER_COPY_BY_SURFACE: Readonly<
  Record<Q3ContractSurface, readonly string[]>
> = {
  navigation: Object.values(Q3_USER_COPY_PROFILE.navigation),
  'public-preview': Object.values(Q3_USER_COPY_PROFILE.publicPreview),
  'saved-library': Object.values(Q3_USER_COPY_PROFILE.savedLibrary),
  'saved-detail': Object.values(Q3_USER_COPY_PROFILE.savedDetail),
  receipt: Object.values(Q3_USER_COPY_PROFILE.receipt),
  map: Object.values(Q3_USER_COPY_PROFILE.map),
  transfer: Object.values(Q3_USER_COPY_PROFILE.transfer),
  'item-execution': [
    Q3_USER_COPY_PROFILE.itemExecution.complete,
    Q3_USER_COPY_PROFILE.itemExecution.editItem,
  ],
  'completion-criterion': [Q3_USER_COPY_PROFILE.itemExecution.completionCriterion],
};

/**
 * These are bounded shell/CTA phrases, not a ban on the FLOW brand or on source
 * content. Route tests should scan owned accessible names, not user-authored
 * titles or internal identifiers.
 */
export const Q3_FORBIDDEN_LEGACY_COPY_FRAGMENTS = [
  'Flow를 찾을 수 없습니다',
  '저장할 Flow',
  '저장 가능한 기존 Flow',
  'Flow화되지 않은',
  '이미 만들어진 Flow',
  '바로 시작할 Flow',
  '새 실행 Flow',
  '내 Flow에 저장하고 이어가기',
  'Flow 찾기로 돌아가기',
  '저장한 Flow가 없습니다',
  '저장한 Flow 검색',
  '내 Flow에서 이어하기',
  '내 Flow에 저장됨',
  '내 Flow에 저장',
  'Flow 미리보기',
  'Flow 선택하기',
  'Flow 관리',
  'Flow 편집',
  'Flow 이름',
  'Flow 기준',
  'Flow에서 제외',
  'Flow에서 뺐어요',
  'Flow별 옮기기',
  '이번 Flow는',
  '반복 Flow',
  '일정 Flow',
  '현재 Flow 도구',
  '영향 Flow',
  'Flow 정리',
  '저장될 Flow',
  'Flow에 포함',
  'Flow로 돌아',
  '저장한 Flow',
  'Flow 만들기',
  'Flow 찾기',
  'Flow 수정',
  'Flow 목록',
  'Flow 검색',
  'Flow 전체',
  '내 Flow',
] as const;

export type Q3CopyGuardEntry = {
  surface: string;
  context: Q3CopySemanticContext;
  text: string;
};

export type Q3CopyViolation = Q3CopyGuardEntry & {
  code: 'legacy-flow-phrase' | 'completion-outside-item';
  term: string;
};

const Q3_COMPLETION_CONTEXTS = new Set<Q3CopySemanticContext>([
  'item-execution',
  'completion-criterion',
]);

const Q3_DYNAMIC_OR_IDENTITY_CONTEXTS = new Set<Q3CopySemanticContext>([
  'source-content',
  'internal-identity',
]);

export function getQ3AllowedUserCopy(surface: Q3ContractSurface): readonly string[] {
  return Q3_ALLOWED_USER_COPY_BY_SURFACE[surface];
}

export function isQ3AllowedUserCopyLabel(
  surface: Q3ContractSurface,
  label: string,
): boolean {
  return getQ3AllowedUserCopy(surface).includes(label);
}

export function findQ3ForbiddenUserCopy(entry: Q3CopyGuardEntry): Q3CopyViolation[] {
  if (Q3_DYNAMIC_OR_IDENTITY_CONTEXTS.has(entry.context)) return [];

  const violations: Q3CopyViolation[] = [];

  for (const term of Q3_FORBIDDEN_LEGACY_COPY_FRAGMENTS) {
    if (!entry.text.includes(term)) continue;
    violations.push({ ...entry, code: 'legacy-flow-phrase', term });
  }

  if (entry.text.includes('완료') && !Q3_COMPLETION_CONTEXTS.has(entry.context)) {
    violations.push({ ...entry, code: 'completion-outside-item', term: '완료' });
  }

  return violations;
}

export function scanQ3UserCopy(entries: readonly Q3CopyGuardEntry[]): Q3CopyViolation[] {
  return entries.flatMap(findQ3ForbiddenUserCopy);
}

export function isQ3UserCopyAllowed(entry: Q3CopyGuardEntry): boolean {
  return findQ3ForbiddenUserCopy(entry).length === 0;
}

export function assertQ3UserCopyAllowed(entries: readonly Q3CopyGuardEntry[]): void {
  const violations = scanQ3UserCopy(entries);
  if (violations.length === 0) return;

  const summary = violations
    .map(({ surface, code, term }) => `${surface}: ${code} (${term})`)
    .join('; ');
  throw new TypeError(`Q3 user-copy guard failed: ${summary}`);
}
