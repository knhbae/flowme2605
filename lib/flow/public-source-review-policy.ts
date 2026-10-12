/** 2026-10-10 and 2026-10-11 actual source reviews, approved for NEW discovery/start only.
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
  // Exact additional 25 reviewed on 2026-10-11; no source-date refresh.
  'samsung-aircon-seasonal-check',
  'samsung-washer-filter-cleaning',
  'vehicle-inspection-prep',
  'computer-skills-d30-study',
  'real-samsung-aircon-seasonal-care',
  'real-samsung-washer-filter-care',
  'real-pet-registration-check',
  'national-scholarship-apply',
  'housing-subscription-account',
  'jeonse-guarantee-apply',
  'small-business-fund-check',
  'unemployment-benefit-apply',
  'job-seeker-allowance-apply',
  'infant-health-checkup-schedule',
  'adult-vaccine-schedule-check',
  'used-car-ownership-transfer',
  'property-local-tax-pay',
  'safe-inheritance-onestop',
  'monthly-household-budget',
  'payday-finance-routine',
  'baby-150-start',
  'baby-160-start',
  'baby-170-start',
  'baby-180-start',
  'baby-cube',
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
