import type { FlowBundle } from './types';

export const GENERATED_PREVIEW_FLOW_ID_PREFIX = 'flow-preview-';
export const RETIRED_PERSONAL_COPY_TAG = 'retired-personal-copy';

export type RuntimeArchiveReason =
  | 'explicit_public_hide'
  | 'source_mismatch'
  | 'superseded_duplicate'
  | 'unsupported_source_claims';

export type RuntimeArchivedFlowPolicy = {
  slug: string;
  reason: RuntimeArchiveReason;
  evidence: string;
  replacementSlug?: string;
};

export const RUNTIME_ARCHIVED_FLOW_POLICIES: readonly RuntimeArchivedFlowPolicy[] = [
  {
    slug: 'digital-detox-weekly',
    reason: 'unsupported_source_claims',
    evidence: '원문이 삭제되었고 현재 Flow의 효과 문구를 뒷받침할 수 없습니다.',
  },
  {
    slug: 'new-hobby-30day',
    reason: 'unsupported_source_claims',
    evidence: '플랫폼 홈페이지만으로 30일 실행 행을 근거화할 수 없습니다.',
  },
  {
    slug: 'real-fitvely-weekly-body-check',
    reason: 'source_mismatch',
    evidence: '넓은 채널 출처가 주간 신체 체크 실행 구조를 직접 뒷받침하지 않습니다.',
  },
  {
    slug: 'skin-weekly-check',
    reason: 'explicit_public_hide',
    evidence: '기존 source-fit 감사에서 공개 카탈로그 숨김으로 확정했습니다.',
  },
  {
    slug: 'real-pet-health-visit-routine',
    reason: 'source_mismatch',
    evidence: '현재 원문은 서울시 취약계층 반려동물 의료비 지원 사업이며 일반 병원 방문 기록과 다릅니다.',
    replacementSlug: 'pet-health-observation',
  },
  {
    slug: 'book-finish-one',
    reason: 'source_mismatch',
    evidence: '원문은 읽기 습관 팁이며 한 권 완독일과 일일 페이지 계획을 제공하지 않습니다.',
    replacementSlug: 'reading-habit-30day',
  },
  {
    slug: 'real-gov24-resident-register-copy',
    reason: 'superseded_duplicate',
    evidence: '같은 정부24 원문을 더 구체적으로 다루는 등본·초본 발급 Flow가 이미 있습니다.',
    replacementSlug: 'resident-register-copy-issue',
  },
  {
    slug: 'study-exam-d30-plan',
    reason: 'source_mismatch',
    evidence: '원문은 영어 홈학습 팁이며 범용 시험 D-30 일정과 12개 시험 준비 항목을 직접 뒷받침하지 않습니다.',
  },
  {
    slug: 'real-sinagong-computer-d30-study',
    reason: 'superseded_duplicate',
    evidence: '같은 2026 시나공 컴활 교재를 더 넓은 D-30 실행 순서로 다루는 대표 학습 Flow가 이미 있습니다.',
    replacementSlug: 'computer-skills-d30-study',
  },
  {
    slug: 'real-thankyou-bubu-video-full-body-no-jump',
    reason: 'superseded_duplicate',
    evidence: '같은 ThankyouBUBU 영상을 사용하는 홈트 시작 Flow와 실행 구조가 중복됩니다.',
    replacementSlug: 'real-thankyou-bubu-home-workout-starter',
  },
  {
    slug: 'infant-health-checkup-prep',
    reason: 'superseded_duplicate',
    evidence: '같은 NHIS 원문을 생년월일과 검진 차수 기준으로 더 완전하게 계산하는 영유아 건강검진 일정 Flow가 있습니다.',
    replacementSlug: 'infant-health-checkup-schedule',
  },
  {
    slug: 'real-ts-vehicle-inspection-prep',
    reason: 'superseded_duplicate',
    evidence: '같은 TS 공식 원문을 D-14 준비부터 검사 결과 후속까지 더 구체적으로 다루는 대표 자동차검사 Flow가 있습니다.',
    replacementSlug: 'vehicle-inspection-prep',
  },
  {
    slug: 'moving-dday',
    reason: 'superseded_duplicate',
    evidence: '같은 AJD 원문과 다섯 개 마일스톤을 명확한 D-30 일정으로 보존한 정본 Flow가 있습니다.',
    replacementSlug: 'curated-ajd-moving-d30',
  },
  {
    slug: 'wedding-timeline',
    reason: 'superseded_duplicate',
    evidence: '같은 원문과 타임라인을 더 구체적인 D-month 일정으로 보존한 정본 Flow가 있습니다.',
    replacementSlug: 'curated-wedding-naver-timeline',
  },
  {
    slug: 'opic-2w',
    reason: 'superseded_duplicate',
    evidence: '같은 원문 XLSX의 14일 코스를 날짜별로 보존한 정본 Flow가 있습니다.',
    replacementSlug: 'curated-opic-single-mock-review',
  },
  {
    slug: 'opic-1m',
    reason: 'superseded_duplicate',
    evidence: '같은 원문 XLSX의 한 달 반복 계획을 주차별로 보존한 정본 Flow가 있습니다.',
    replacementSlug: 'curated-opic-course-row-import',
  },
  {
    slug: 'new-car-7-step',
    reason: 'superseded_duplicate',
    evidence: '같은 겟차 원문의 일곱 단계 구매 절차를 견적 메모와 함께 다루는 정본 Flow가 있습니다.',
    replacementSlug: 'curated-new-car-basic',
  },
  {
    slug: 'reading-book-finish',
    reason: 'superseded_duplicate',
    evidence: '같은 원문을 월 4권과 주간 기록으로 구체화한 정본 Flow가 있으며 예전 변환본은 같은 행동을 반복합니다.',
    replacementSlug: 'curated-reading-monthly-log',
  },
  {
    slug: 'homefit-morning-2w',
    reason: 'superseded_duplicate',
    evidence: '채널 홈 대신 정확한 Allblanc 아침 운동 영상과 반복 요일을 사용하는 정본 Flow가 있습니다.',
    replacementSlug: 'curated-allblanc-morning-workout',
  },
  {
    slug: 'homefit-video-queue',
    reason: 'superseded_duplicate',
    evidence: '채널 홈에서 일반 행동을 반복한 예전 큐 대신 정확한 영상 기반 운동 Flow를 사용합니다.',
    replacementSlug: 'curated-allblanc-morning-workout',
  },
];

export const RUNTIME_ARCHIVED_FLOW_SLUGS = RUNTIME_ARCHIVED_FLOW_POLICIES.map(
  (policy) => policy.slug,
);

const runtimeArchivedFlowSlugSet = new Set<string>(RUNTIME_ARCHIVED_FLOW_SLUGS);

export function isGeneratedPreviewBundle(bundle: FlowBundle): boolean {
  return bundle.flow.id.startsWith(GENERATED_PREVIEW_FLOW_ID_PREFIX);
}

export function isRuntimeArchivedBundle(bundle: FlowBundle): boolean {
  return bundle.flow.status === 'published' && runtimeArchivedFlowSlugSet.has(bundle.flow.slug);
}

export function getRuntimeArchivedFlowPolicy(slug: string): RuntimeArchivedFlowPolicy | undefined {
  return RUNTIME_ARCHIVED_FLOW_POLICIES.find((policy) => policy.slug === slug);
}

export function isRetiredPersonalCopyBundle(bundle: FlowBundle): boolean {
  return Boolean(bundle.flow.tags?.includes(RETIRED_PERSONAL_COPY_TAG));
}

export function isRuntimeExcludedBundle(bundle: FlowBundle): boolean {
  return isGeneratedPreviewBundle(bundle) || isRuntimeArchivedBundle(bundle);
}
