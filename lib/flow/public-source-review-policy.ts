/** 2026-10-10 actual source review, approved for NEW discovery/start only.
 * This is not an archive, deletion, migration, or a new source-check date.
 * Existing personal documents and immutable source snapshots stay readable. */
export const PUBLIC_SOURCE_REVIEW_HOLD_SLUGS = [
  'childcare-fee-support-apply',
  'health-insurance-dependent',
  'home-workout-20min',
  'military-exam-prep',
  'overseas-safety-register',
  'overseas-travel-d14',
  'passport-renewal-docs',
  'pension-estimate-check',
  'running-5k-4week',
  'tax-refund-find',
  'wedding-d180-basic',
  'welfare-benefit-finder',
  'moving-d30-basic',
  'fridge-cleanout-weekly-plan',
  'english-study-30day-routine',
  'washer-tub-clean-monthly',
  'used-car-buying-check',
  'new-car-delivery-check',
  'car-care-monthly-routine',
  'weekly-meal-plan',
  'reading-habit-30day',
  'home-cafe-daily',
  'dog-walk-routine',
  'pet-health-observation',
] as const;

const heldSlugs: ReadonlySet<string> = new Set(PUBLIC_SOURCE_REVIEW_HOLD_SLUGS);

export function isPublicFlowSourceOnHold(slug: string): boolean {
  return heldSlugs.has(slug);
}

/** Repository catalog IDs are deterministic; do not infer a source from title,
 * a current fingerprint, or a private document's ID. */
export function isPublicCatalogFlowOnHold(flowId: string): boolean {
  return flowId.startsWith('catalog-') && isPublicFlowSourceOnHold(flowId.slice('catalog-'.length));
}
