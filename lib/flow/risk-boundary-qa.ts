import type { FlowBundle } from './types';

export type RiskBoundaryQaDecision = 'public_mvp_after_risk_qa' | 'keep_fix';

export type RiskBoundaryQaReview = {
  slug: string;
  checkedAt: string;
  decision: RiskBoundaryQaDecision;
  label: string;
  primaryArtifact: 'evidence_sheet_plus_memo' | 'observation_sheet';
  naturalArtifactRows: string[];
  currentUxGap: string;
  contentUxFix: string;
  riskBoundary: string;
  nextAction: string;
};

type DecisionCounts = Record<RiskBoundaryQaDecision, number>;

export type RiskBoundaryQaSummary = {
  totalCount: number;
  slugs: string[];
  decisionCounts: DecisionCounts;
  reviews: RiskBoundaryQaReview[];
};

const emptyDecisionCounts: DecisionCounts = {
  public_mvp_after_risk_qa: 0,
  keep_fix: 0,
};

export const riskBoundaryQaReviews: RiskBoundaryQaReview[] = [
  {
    slug: 'new-car-delivery-check',
    checkedAt: '2026-05-23',
    decision: 'public_mvp_after_risk_qa',
    label: 'Public MVP after risk QA',
    primaryArtifact: 'evidence_sheet_plus_memo',
    naturalArtifactRows: [
      'defect evidence row: driver-door scratch, photo filename, dealer confirmation, hold delivery until written memo',
      'option evidence row: HUD works, ADAS calibration pending, dealer confirmation needed before signing',
      'document row: insurance active, registration pending, handover boundary memo attached',
    ],
    currentUxGap: 'The decision table works, but photo filename, dealer confirmation, and handover hold fields need to be visible as a standalone proof memo.',
    contentUxFix: 'Add a delivery proof memo beside the comparison table and keep the handover boundary memo separate from checklist completion.',
    riskBoundary: 'Money-at-risk handover. FLOW records evidence and questions; it does not decide whether to sign or accept delivery.',
    nextAction: 'Keep as public MVP candidate and QA the evidence sheet plus memo export on desktop and mobile.',
  },
  {
    slug: 'diet-habit-2week',
    checkedAt: '2026-05-23',
    decision: 'public_mvp_after_risk_qa',
    label: 'Public MVP after risk QA',
    primaryArtifact: 'observation_sheet',
    naturalArtifactRows: [
      'day 1 row: meals, activity, measurement, condition, review note',
      'day 3 row: late dinner, no activity, tired condition, dizziness stop condition if repeated',
      'weekly review: observation-first pattern note, no calorie prescription or weight-loss promise',
    ],
    currentUxGap: 'The spreadsheet surface is right, but warning and observation-first framing need to sit before result-oriented diet language.',
    contentUxFix: 'Keep the first artifact as an observation-first sheet and show the safety boundary next to the weekly review.',
    riskBoundary: 'Health-sensitive observation. FLOW records patterns and stop conditions; it does not prescribe diet, diagnose, or promise weight loss.',
    nextAction: 'Keep as public MVP candidate and QA warning hierarchy, sheet input, and xlsx export on desktop and mobile.',
  },
];

export function getRiskBoundaryQaReview(slug: string): RiskBoundaryQaReview | undefined {
  return riskBoundaryQaReviews.find((review) => review.slug === slug);
}

export function summarizeRiskBoundaryQaReviews(bundles: FlowBundle[]): RiskBoundaryQaSummary {
  const slugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const reviews = riskBoundaryQaReviews.filter((review) => slugs.has(review.slug));
  const decisionCounts = { ...emptyDecisionCounts };

  for (const review of reviews) {
    decisionCounts[review.decision] += 1;
  }

  return {
    totalCount: reviews.length,
    slugs: reviews.map((review) => review.slug),
    decisionCounts,
    reviews,
  };
}
