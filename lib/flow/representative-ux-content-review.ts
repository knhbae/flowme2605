import type { FlowBundle } from './types';

export type RepresentativeUxContentDecision =
  | 'ready_for_observed_session'
  | 'needs_guardrail_rewrite';

export type RepresentativeUxContentReview = {
  slug: string;
  checkedAt: string;
  decision: RepresentativeUxContentDecision;
  persona: string;
  firstAction: string;
  naturalOutput: string;
  currentUxGap: string;
  contentRewritePriority: string;
  exportFirstFit: string;
  mobileDensityRisk: string;
  sourceRiskSeparation: string;
  nextSmallFix: string;
  statusAfterReview: string;
};

export type RepresentativeUxContentReviewSummary = {
  totalCount: number;
  slugs: string[];
  decisionCounts: Record<RepresentativeUxContentDecision, number>;
  reviews: RepresentativeUxContentReview[];
};

const emptyDecisionCounts: Record<RepresentativeUxContentDecision, number> = {
  ready_for_observed_session: 0,
  needs_guardrail_rewrite: 0,
};

export const representativeUxContentReviews: RepresentativeUxContentReview[] = [
  {
    slug: 'computer-skills-d30-study',
    checkedAt: '2026-05-25',
    decision: 'ready_for_observed_session',
    persona:
      'A learner with a fixed computer-skills exam date wants the plan in a calendar and a study sheet before deciding whether FLOW is useful.',
    firstAction: 'Enter the exam date, review the prefilled source-derived rows, then export the D-30 calendar and study sheet.',
    naturalOutput:
      'calendar: D-30 study milestones; sheet: source-derived chapter rows, target date, status, weak-area memo, mock score, wrong-answer retry date.',
    currentUxGap:
      'The route is ready for an observed session, but the first session should verify whether the user understands that source rows are prefilled and only execution fields are editable.',
    contentRewritePriority:
      'Keep study copy centered on exam date, source-derived scope, wrong-answer note, score, and retry date. Do not add a native study dashboard yet.',
    exportFirstFit:
      'Strong: the calendar and sheet can stand outside FLOW and are the clearest proof of the conversion-layer value.',
    mobileDensityRisk:
      'Medium-low: artifact rows and export sheet are acceptable, but the first observed session should check whether the progress table feels too dense on mobile.',
    sourceRiskSeparation:
      'Low-risk study content. FLOW organizes source-derived study rows and does not promise exam results.',
    nextSmallFix:
      'Run one observed export-first session and record whether the user can explain the calendar and sheet before exporting.',
    statusAfterReview: 'representative-eligible, not validated until real user behavior exists.',
  },
  {
    slug: 'diet-habit-2week',
    checkedAt: '2026-05-25',
    decision: 'needs_guardrail_rewrite',
    persona:
      'A user wants to observe meals, activity, sleep, and condition for two weeks without receiving diet prescription or outcome promises.',
    firstAction: 'Enter the start date and begin the two-week observation sheet before reading checklist detail.',
    naturalOutput:
      'sheet: daily meal, activity, sleep, optional measurement, condition, stop/consult condition; memo: weekly observation summary.',
    currentUxGap:
      'The observation artifact has been rewritten around observation and stop/consult conditions, but it still needs a mobile re-check and observed session before stronger framing.',
    contentRewritePriority:
      'Rewrite around observation first: record meals, activity, sleep, condition, and repeated warning signs before any weekly review wording.',
    exportFirstFit:
      'Good with guardrails: spreadsheet export fits the job, but the sheet must remain an observation log rather than a prescription.',
    mobileDensityRisk:
      'Medium: warning, source, observation table, meals, exercise, and weekly review can stack heavily; warning and stop condition must remain near the first sheet.',
    sourceRiskSeparation:
      'Health-sensitive observation. FLOW records patterns and stop/consult conditions; it does not prescribe diet or promise weight loss.',
    nextSmallFix:
      'Re-check the mobile first screen after the observation-first copy rewrite and verify that the warning, table, and weekly memo do not compete.',
    statusAfterReview: 'public MVP candidate with guardrails, not validated until real user behavior exists.',
  },
  {
    slug: 'new-car-delivery-check',
    checkedAt: '2026-05-25',
    decision: 'needs_guardrail_rewrite',
    persona:
      'A buyer at vehicle delivery wants to capture defects, photos, documents, and dealer confirmation before deciding what to do next.',
    firstAction: 'Enter vehicle/dealer context and fill the defect evidence sheet before treating checklist completion as progress.',
    naturalOutput:
      'evidence sheet: defect row, photo filename, option/document status, dealer confirmation, follow-up owner; memo: personal hold/signing boundary.',
    currentUxGap:
      'The evidence artifact is useful, but checklist completion can still compete with the delivery-day evidence job if photo/dealer-confirmation fields are not prominent.',
    contentRewritePriority:
      'Keep photo filename, dealer confirmation, document status, and hold memo above general inspection copy.',
    exportFirstFit:
      'Good with guardrails: exported sheet and memo can be used at the delivery bay, but FLOW must not become signing advice.',
    mobileDensityRisk:
      'Medium: evidence rows, hold memo, exterior/interior checks, documents, and payment checks are long on mobile; secondary inspection sections should stay collapsed.',
    sourceRiskSeparation:
      'Money-at-risk handover. FLOW records evidence and questions; it does not decide whether to sign or accept delivery.',
    nextSmallFix:
      'Tighten copy so the first success signal is a portable evidence sheet, not a completed generic inspection checklist.',
    statusAfterReview: 'public MVP candidate with guardrails, not validated until real user behavior exists.',
  },
];

export function getRepresentativeUxContentReview(slug: string): RepresentativeUxContentReview | undefined {
  return representativeUxContentReviews.find((review) => review.slug === slug);
}

export function summarizeRepresentativeUxContentReviews(
  bundles: FlowBundle[],
): RepresentativeUxContentReviewSummary {
  const slugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const reviews = representativeUxContentReviews.filter((review) => slugs.has(review.slug));
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
