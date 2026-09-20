import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import { PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS } from './personal-workspace-poc-lossless-authoring.fixtures';

export { fingerprintPersonalWorkspacePocAuthoringSource };

export const PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION = 1 as const;

export type PersonalWorkspacePocValidationExampleGroupId =
  | 'authoring-format'
  | 'real-content'
  | 'schedule-recurrence'
  | 'legacy-table'
  | 'error-input';

export type PersonalWorkspacePocValidationExampleGroup = Readonly<{
  groupId: PersonalWorkspacePocValidationExampleGroupId;
  label: string;
  expectedCount: number;
}>;

export const PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS = Object.freeze([
  Object.freeze({ groupId: 'authoring-format', label: '작성 형식', expectedCount: 1 }),
  Object.freeze({ groupId: 'real-content', label: '실제 콘텐츠', expectedCount: 8 }),
  Object.freeze({ groupId: 'schedule-recurrence', label: '일정·반복', expectedCount: 11 }),
  Object.freeze({ groupId: 'legacy-table', label: '호환·표', expectedCount: 6 }),
  Object.freeze({ groupId: 'error-input', label: '오류·예외 입력', expectedCount: 5 }),
] as const satisfies readonly PersonalWorkspacePocValidationExampleGroup[]);

type CanonicalCorpusCase =
  (typeof PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS)[number];
type CanonicalCorpusCaseId = CanonicalCorpusCase['caseId'];

type ValidationExampleMetadata = Readonly<{
  groupId: PersonalWorkspacePocValidationExampleGroupId;
  label: string;
}>;

const VALIDATION_EXAMPLE_METADATA_BY_CASE_ID = Object.freeze({
  'basic-authoring-syntax': {
    groupId: 'authoring-format',
    label: '기본 작성 문법',
  },
  'content-moving-d30': {
    groupId: 'real-content',
    label: '이사 D-30 체크리스트',
  },
  'content-vehicle-inspection': {
    groupId: 'real-content',
    label: '자동차검사 D-14 준비',
  },
  'content-allblanc-7day': {
    groupId: 'real-content',
    label: 'Allblanc 7일 영상 챌린지',
  },
  'content-kmooc-14': {
    groupId: 'real-content',
    label: 'K-MOOC 14주 학습 목록',
  },
  'content-librivox-38': {
    groupId: 'real-content',
    label: 'LibriVox 38장 듣기 목록',
  },
  'content-new-car-14': {
    groupId: 'real-content',
    label: '신차 구매 8단계',
  },
  'content-official-safety-4': {
    groupId: 'real-content',
    label: '해외여행 안전정보·영사조력',
  },
  'content-jeju-memo-5': {
    groupId: 'real-content',
    label: '제주 여행 개인 메모',
  },
  'change-relative-no-anchor': {
    groupId: 'schedule-recurrence',
    label: '상대 날짜 · 실제 기준일 없음',
  },
  'change-relative-anchor-aug': {
    groupId: 'schedule-recurrence',
    label: '상대 날짜 · 8월 기준일 적용',
  },
  'change-relative-anchor-sep': {
    groupId: 'schedule-recurrence',
    label: '상대 날짜 · 9월 기준일로 변경',
  },
  'change-relative-to-absolute': {
    groupId: 'schedule-recurrence',
    label: '상대 날짜를 절대 날짜로 명시',
  },
  'change-mixed-dated-undated': {
    groupId: 'schedule-recurrence',
    label: '날짜 있음 + 날짜 없음 혼합',
  },
  'change-time-timezone-duration': {
    groupId: 'schedule-recurrence',
    label: '시간·시간대·소요 시간 추가',
  },
  'change-daily-repeat-until-date': {
    groupId: 'schedule-recurrence',
    label: '매일 반복 + 종료일',
  },
  'change-same-day-timed-agenda': {
    groupId: 'schedule-recurrence',
    label: '같은 날 여러 일정 · 시간순',
  },
  'change-repeat-condition-weekly': {
    groupId: 'schedule-recurrence',
    label: '매주 반복 + 실행 조건',
  },
  'change-latest-grammar-showcase': {
    groupId: 'schedule-recurrence',
    label: '최신 문법 한눈에 · 3회 반복',
  },
  'change-repeat-condition-monthly': {
    groupId: 'schedule-recurrence',
    label: '매월 반복 + 변경된 조건',
  },
  'compat-legacy-aliases': {
    groupId: 'legacy-table',
    label: '이전 초안 별칭 읽기',
  },
  'compat-title-h1-wins': {
    groupId: 'legacy-table',
    label: 'H1과 저장 제목 충돌',
  },
  'compat-resource-links': {
    groupId: 'legacy-table',
    label: '공식 링크 + 이전 구분자',
  },
  'error-unknown-property': {
    groupId: 'error-input',
    label: '정의되지 않은 속성 · 설명 보존',
  },
  'error-ambiguous-date': {
    groupId: 'error-input',
    label: '연도 없는 날짜',
  },
  'error-invalid-relative-date': {
    groupId: 'error-input',
    label: '지원하지 않는 상대 날짜',
  },
  'error-url-only': {
    groupId: 'error-input',
    label: 'URL만 붙여 넣음',
  },
  'error-explanatory-prose': {
    groupId: 'error-input',
    label: '표식 없는 설명문 · TXT 보존',
  },
  'compat-tab-table': {
    groupId: 'legacy-table',
    label: '탭 표',
  },
  'compat-csv-table': {
    groupId: 'legacy-table',
    label: 'CSV 표',
  },
  'compat-markdown-table': {
    groupId: 'legacy-table',
    label: 'Markdown 표',
  },
} as const satisfies Readonly<
  Record<CanonicalCorpusCaseId, ValidationExampleMetadata>
>);

export type PersonalWorkspacePocValidationExample = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION;
  exampleId: `validation-example:${CanonicalCorpusCaseId}`;
  caseId: CanonicalCorpusCaseId;
  catalogIndex: number;
  groupId: PersonalWorkspacePocValidationExampleGroupId;
  label: string;
  sourceShape: CanonicalCorpusCase['sourceShape'];
  provenance: CanonicalCorpusCase['provenance'];
  upstreamBoundary: CanonicalCorpusCase['upstreamBoundary'];
  expectedOriginalItemCount: CanonicalCorpusCase['expectedOriginalItemCount'];
  expectedMode: CanonicalCorpusCase['expectedMode'];
  expectedPreservation: CanonicalCorpusCase['expectedPreservation'];
  rawText: CanonicalCorpusCase['rawText'];
}>;

/**
 * Read-only view over the canonical 31-case corpus. Provenance remains display
 * evidence; it never becomes a source owner, template identity, or write grant.
 */
export const PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG = Object.freeze(
  PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS.map(
    (corpusCase, catalogIndex): PersonalWorkspacePocValidationExample => {
      const metadata = VALIDATION_EXAMPLE_METADATA_BY_CASE_ID[corpusCase.caseId];
      return Object.freeze({
        version: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
        exampleId: `validation-example:${corpusCase.caseId}`,
        caseId: corpusCase.caseId,
        catalogIndex,
        groupId: metadata.groupId,
        label: metadata.label,
        sourceShape: corpusCase.sourceShape,
        provenance: corpusCase.provenance,
        upstreamBoundary: corpusCase.upstreamBoundary,
        expectedOriginalItemCount: corpusCase.expectedOriginalItemCount,
        expectedMode: corpusCase.expectedMode,
        expectedPreservation: corpusCase.expectedPreservation,
        rawText: corpusCase.rawText,
      });
    },
  ),
);

const VALIDATION_EXAMPLE_BY_ID = new Map(
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map((entry) => [
    entry.exampleId,
    entry,
  ]),
);

export function normalizePersonalWorkspacePocValidationExampleSearch(
  value: string,
): string {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, ' ').trim();
}

export type FilterPersonalWorkspacePocValidationExamplesInput = Readonly<{
  query?: string;
  groupId?: PersonalWorkspacePocValidationExampleGroupId | 'all';
}>;

export function filterPersonalWorkspacePocValidationExamples(
  input?: FilterPersonalWorkspacePocValidationExamplesInput,
): readonly PersonalWorkspacePocValidationExample[];
export function filterPersonalWorkspacePocValidationExamples(
  entries: readonly PersonalWorkspacePocValidationExample[],
  input?: FilterPersonalWorkspacePocValidationExamplesInput,
): readonly PersonalWorkspacePocValidationExample[];
/** Returns a fresh frozen projection and never changes the supplied order. */
export function filterPersonalWorkspacePocValidationExamples(
  entriesOrInput:
    | readonly PersonalWorkspacePocValidationExample[]
    | FilterPersonalWorkspacePocValidationExamplesInput = {},
  suppliedInput: FilterPersonalWorkspacePocValidationExamplesInput = {},
): readonly PersonalWorkspacePocValidationExample[] {
  const entries = Array.isArray(entriesOrInput)
    ? entriesOrInput as readonly PersonalWorkspacePocValidationExample[]
    : PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG;
  const input = Array.isArray(entriesOrInput)
    ? suppliedInput
    : entriesOrInput as FilterPersonalWorkspacePocValidationExamplesInput;
  const normalizedQuery = normalizePersonalWorkspacePocValidationExampleSearch(
    input.query ?? '',
  );
  const knownGroup = input.groupId === undefined
    || input.groupId === 'all'
    || PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS.some(
      (group) => group.groupId === input.groupId,
    );
  if (!knownGroup) return Object.freeze([]);

  const matches = entries.filter((entry) => {
    if (
      input.groupId
      && input.groupId !== 'all'
      && entry.groupId !== input.groupId
    ) return false;
    if (!normalizedQuery) return true;
    const searchableText = normalizePersonalWorkspacePocValidationExampleSearch([
      entry.label,
      entry.caseId,
      entry.sourceShape,
      entry.provenance,
      entry.upstreamBoundary,
      entry.rawText,
    ].join(' '));
    return searchableText.includes(normalizedQuery);
  });
  return Object.freeze(matches);
}

type ValidationExampleZeroMutation = Readonly<{
  sourceMutationCount: 0;
  workspaceMutationCount: 0;
  operatingMutationCount: 0;
}>;

export type PersonalWorkspacePocValidationExampleSelection =
  | (ValidationExampleZeroMutation & Readonly<{
      status: 'selected';
      reason: null;
      catalogVersion: typeof PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION;
      example: PersonalWorkspacePocValidationExample;
      previewRawText: string;
      sourceOwner: null;
      templateId: null;
    }>)
  | (ValidationExampleZeroMutation & Readonly<{
      status: 'unavailable';
      reason: 'version-mismatch' | 'unknown-example';
      catalogVersion: typeof PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION;
      example: null;
      previewRawText: null;
      sourceOwner: null;
      templateId: null;
    }>);

export function projectPersonalWorkspacePocValidationExampleSelection(
  input: Readonly<{ catalogVersion: number; exampleId: string }>,
): PersonalWorkspacePocValidationExampleSelection {
  const zeroMutation = {
    sourceMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
  } as const;
  if (input.catalogVersion !== PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION) {
    return Object.freeze({
      ...zeroMutation,
      status: 'unavailable',
      reason: 'version-mismatch',
      catalogVersion: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
      example: null,
      previewRawText: null,
      sourceOwner: null,
      templateId: null,
    });
  }
  const example = VALIDATION_EXAMPLE_BY_ID.get(
    input.exampleId as PersonalWorkspacePocValidationExample['exampleId'],
  );
  if (!example) {
    return Object.freeze({
      ...zeroMutation,
      status: 'unavailable',
      reason: 'unknown-example',
      catalogVersion: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
      example: null,
      previewRawText: null,
      sourceOwner: null,
      templateId: null,
    });
  }
  return Object.freeze({
    ...zeroMutation,
    status: 'selected',
    reason: null,
    catalogVersion: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
    example,
    previewRawText: example.rawText,
    sourceOwner: null,
    templateId: null,
  });
}

export type PersonalWorkspacePocValidationExampleApplyReason =
  | 'applied'
  | 'cancelled'
  | 'composing'
  | 'version-mismatch'
  | 'unknown-example'
  | 'stale-source'
  | 'nonempty-source'
  | 'same-source';

export type PlanPersonalWorkspacePocValidationExampleApplyInput = Readonly<{
  catalogVersion: number;
  exampleId: string;
  rawText: string;
  expectedSourceFingerprint: string;
  confirmed: boolean;
  composing?: boolean;
}>;

type PersonalWorkspacePocValidationExampleApplyBase = Readonly<{
  reason: PersonalWorkspacePocValidationExampleApplyReason;
  catalogVersion: typeof PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION;
  exampleId: string;
  currentSourceFingerprint: string;
  nextRawText: string;
  workspaceMutationCount: 0;
  operatingMutationCount: 0;
  sourceOwner: null;
  templateId: null;
}>;

export type PersonalWorkspacePocValidationExampleApplyPlan =
  | (PersonalWorkspacePocValidationExampleApplyBase & Readonly<{
      status: 'applied';
      reason: 'applied';
      sourceMutationCount: 1;
      replacement: Readonly<{
        kind: 'replace-raw-text';
        beforeRawText: '';
        afterRawText: string;
        afterSourceFingerprint: string;
      }>;
    }>)
  | (PersonalWorkspacePocValidationExampleApplyBase & Readonly<{
      status: 'cancelled' | 'blocked' | 'unchanged';
      reason: Exclude<PersonalWorkspacePocValidationExampleApplyReason, 'applied'>;
      sourceMutationCount: 0;
      replacement: null;
    }>);

function zeroMutationApplyPlan(
  input: PlanPersonalWorkspacePocValidationExampleApplyInput,
  currentSourceFingerprint: string,
  status: 'cancelled' | 'blocked' | 'unchanged',
  reason: Exclude<PersonalWorkspacePocValidationExampleApplyReason, 'applied'>,
): PersonalWorkspacePocValidationExampleApplyPlan {
  return Object.freeze({
    status,
    reason,
    catalogVersion: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
    exampleId: input.exampleId,
    currentSourceFingerprint,
    nextRawText: input.rawText,
    sourceMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
    replacement: null,
    sourceOwner: null,
    templateId: null,
  });
}

/**
 * Plans an explicit example replacement. Only an exactly empty, unchanged
 * source may produce one source replacement; every other boundary is a no-op.
 */
export function planPersonalWorkspacePocValidationExampleApply(
  input: PlanPersonalWorkspacePocValidationExampleApplyInput,
): PersonalWorkspacePocValidationExampleApplyPlan {
  const currentSourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(
    input.rawText,
  );
  if (!input.confirmed) {
    return zeroMutationApplyPlan(input, currentSourceFingerprint, 'cancelled', 'cancelled');
  }
  if (input.composing) {
    return zeroMutationApplyPlan(input, currentSourceFingerprint, 'blocked', 'composing');
  }
  if (input.catalogVersion !== PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION) {
    return zeroMutationApplyPlan(
      input,
      currentSourceFingerprint,
      'blocked',
      'version-mismatch',
    );
  }
  const example = VALIDATION_EXAMPLE_BY_ID.get(
    input.exampleId as PersonalWorkspacePocValidationExample['exampleId'],
  );
  if (!example) {
    return zeroMutationApplyPlan(
      input,
      currentSourceFingerprint,
      'blocked',
      'unknown-example',
    );
  }
  if (input.expectedSourceFingerprint !== currentSourceFingerprint) {
    return zeroMutationApplyPlan(input, currentSourceFingerprint, 'blocked', 'stale-source');
  }
  if (input.rawText === example.rawText) {
    return zeroMutationApplyPlan(input, currentSourceFingerprint, 'unchanged', 'same-source');
  }
  if (input.rawText.length !== 0) {
    return zeroMutationApplyPlan(input, currentSourceFingerprint, 'blocked', 'nonempty-source');
  }

  return Object.freeze({
    status: 'applied',
    reason: 'applied',
    catalogVersion: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
    exampleId: example.exampleId,
    currentSourceFingerprint,
    nextRawText: example.rawText,
    sourceMutationCount: 1,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
    replacement: Object.freeze({
      kind: 'replace-raw-text',
      beforeRawText: '',
      afterRawText: example.rawText,
      afterSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(example.rawText),
    }),
    sourceOwner: null,
    templateId: null,
  });
}
