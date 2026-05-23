import type { SourceFitDecision } from './source-fit';

export type FinalPromotionQaReview = {
  slug: string;
  checkedAt: string;
  sourceFitDecision: SourceFitDecision;
  evidence: string[];
  uxEvidence: string;
};

const finalPromotionQaReviews: FinalPromotionQaReview[] = [
  {
    slug: 'computer-skills-d30-study',
    checkedAt: '2026-05-23',
    sourceFitDecision: 'keep_representative',
    evidence: [
      'desktop first-screen QA passed',
      'mobile bottom-sheet QA passed',
      'xlsx download preserved study chapter and mock score logs',
      'ics download preserved D-30 study schedule',
    ],
    uxEvidence: 'desktop/mobile screenshot QA passed and export downloads preserved calendar plus score sheet records.',
  },
];

export function getFinalPromotionQaReview(slug: string): FinalPromotionQaReview | undefined {
  return finalPromotionQaReviews.find((review) => review.slug === slug);
}
