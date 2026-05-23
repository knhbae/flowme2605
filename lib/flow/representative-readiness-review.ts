import type { FlowBundle } from './types';

export type RepresentativeReadinessDecision =
  | 'representative_candidate'
  | 'public_mvp_candidate'
  | 'keep_fix';

export type RepresentativeReadinessReview = {
  slug: string;
  decision: RepresentativeReadinessDecision;
  label: string;
  score: number;
  userNeed: string;
  destination: string;
  strengths: string[];
  blockers: string[];
  nextAction: string;
};

export type RepresentativeReadinessSummary = {
  totalCount: number;
  decisionCounts: Record<RepresentativeReadinessDecision, number>;
  slugs: string[];
  reviews: RepresentativeReadinessReview[];
};

const emptyDecisionCounts: Record<RepresentativeReadinessDecision, number> = {
  representative_candidate: 0,
  public_mvp_candidate: 0,
  keep_fix: 0,
};

export const representativeReadinessReviews: RepresentativeReadinessReview[] = [
  {
    slug: 'computer-skills-d30-study',
    decision: 'representative_candidate',
    label: '대표 후보',
    score: 86,
    userNeed: '시험일까지 남은 30일을 필기/실기 범위, 모의점수, 오답 재풀이로 관리한다.',
    destination: 'D-30 캘린더 + 학습/모의점수 로그',
    strengths: [
      'low risk route',
      'clear deadline anchor',
      'calendar and score sheet are externally portable',
      'item copy now points to log records',
    ],
    blockers: [
      '아직 실제 사용자 행동 데이터가 없다.',
      '대표 노출 전 모바일 첫 화면과 export copy를 한 번 더 봐야 한다.',
    ],
    nextAction: '대표 allowlist/source-fit 승격 전에 모바일 화면과 export preview를 수동 QA한다.',
  },
  {
    slug: 'new-car-delivery-check',
    decision: 'public_mvp_candidate',
    label: 'Public MVP 후보',
    score: 78,
    userNeed: '신차 인수 전 계약 옵션, 외관/실내 하자, 사진 증빙, 딜러 확인을 남긴다.',
    destination: '신차 인수 증빙표 + 하자 확인 메모',
    strengths: [
      'inspection evidence artifact is concrete',
      'decision table matches money-at-risk workflow',
      'copy separates defect proof from signing decision',
    ],
    blockers: [
      'financial-sensitive route라 대표 노출은 보수적으로 판단해야 한다.',
      '실제 현장 사용 전 사진 파일명/인수 보류 UX를 더 확인해야 한다.',
    ],
    nextAction: 'public MVP 후보로 두고 현장 체크 UX와 evidence export를 브라우저 QA한다.',
  },
  {
    slug: 'diet-habit-2week',
    decision: 'public_mvp_candidate',
    label: 'Public MVP 후보',
    score: 72,
    userNeed: '체중감량 처방이 아니라 2주 식사, 활동, 수면, 컨디션을 관찰한다.',
    destination: '2주 식사·활동 기록표',
    strengths: [
      'spreadsheet-first surface matches observation job',
      'official source and stop conditions are explicit',
      'item copy points to daily record rows',
    ],
    blockers: [
      'medical-sensitive route라 대표 후보로는 아직 이르다.',
      'warning prominence and first-screen cognitive load need manual browser review.',
    ],
    nextAction: '대표 승격 없이 public MVP 후보로 두고 warning/card priority를 화면 QA한다.',
  },
];

export function getRepresentativeReadinessReview(slug: string): RepresentativeReadinessReview | undefined {
  return representativeReadinessReviews.find((review) => review.slug === slug);
}

export function summarizeRepresentativeReadinessReviews(bundles: FlowBundle[]): RepresentativeReadinessSummary {
  const slugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const reviews = representativeReadinessReviews.filter((review) => slugs.has(review.slug));
  const decisionCounts = { ...emptyDecisionCounts };

  for (const review of reviews) {
    decisionCounts[review.decision] += 1;
  }

  return {
    totalCount: reviews.length,
    decisionCounts,
    slugs: reviews.map((review) => review.slug),
    reviews,
  };
}
