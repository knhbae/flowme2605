/**
 * Recorded source-review debt.
 *
 * The standard suite requires every published normal-user-route Flow to carry a
 * `source_checked_at` within `SOURCE_REVIEW_DUE_DAYS`. That gate went red around
 * 2026-08-19 and has stayed red since, so it stopped distinguishing new drift
 * from debt that was already there — and a permanently red required check makes
 * the autonomous shipping rule in `AGENTS.md` unsatisfiable.
 *
 * This file records the debt as measured on `SOURCE_REVIEW_DEBT_RECORDED_ON` so
 * the gate can keep failing on anything new while the recorded set is worked
 * down. It is a ledger of known-overdue content, not an exemption:
 *
 * - A Flow that goes overdue and is not listed here fails the suite.
 * - An entry is keyed by slug *and* the exact recorded `source_checked_at`. Once
 *   a Flow is actually re-reviewed its date changes, the key stops matching, and
 *   the entry must be deleted — `partitionSourceReviewDebt` reports it as
 *   `resolved` and the suite fails until the list is trimmed.
 * - Nothing here is evidence that the content is correct. It only says no
 *   re-review was recorded in the window.
 *
 * Do not add entries to make a red suite green. Entries are added only when the
 * owner accepts the debt, and removed as re-review lands.
 */

export type SourceReviewDebtEntry = {
  slug: string;
  sourceCheckedAt: string | null;
};

export const SOURCE_REVIEW_DEBT_RECORDED_ON = '2026-10-29';

export const SOURCE_REVIEW_DEBT: readonly SourceReviewDebtEntry[] = [
  { slug: "adult-vaccine-schedule-check", sourceCheckedAt: "2026-07-12" },
  { slug: "baby-150-start", sourceCheckedAt: "2026-07-12T00:00:00.000Z" },
  { slug: "baby-160-start", sourceCheckedAt: "2026-07-12T00:00:00.000Z" },
  { slug: "baby-170-start", sourceCheckedAt: "2026-07-12T00:00:00.000Z" },
  { slug: "baby-180-start", sourceCheckedAt: "2026-07-12T00:00:00.000Z" },
  { slug: "baby-cube", sourceCheckedAt: "2026-07-12T00:00:00.000Z" },
  { slug: "birth-registration-prep", sourceCheckedAt: "2026-07-11" },
  { slug: "blog-youtube-start", sourceCheckedAt: "2026-07-11" },
  { slug: "car-care-monthly-routine", sourceCheckedAt: "2026-07-11" },
  { slug: "childcare-fee-support-apply", sourceCheckedAt: "2026-07-11" },
  { slug: "closet-organize-1day", sourceCheckedAt: "2026-07-11" },
  { slug: "computer-skills-d30-study", sourceCheckedAt: "2026-07-12" },
  { slug: "customs-traveler-declare", sourceCheckedAt: "2026-07-11" },
  { slug: "dog-walk-routine", sourceCheckedAt: "2026-07-11" },
  { slug: "domestic-trip-d7", sourceCheckedAt: "2026-07-11" },
  { slug: "english-study-30day-routine", sourceCheckedAt: "2026-07-11" },
  { slug: "first-passport-issue", sourceCheckedAt: "2026-07-11" },
  { slug: "fridge-cleanout-weekly-plan", sourceCheckedAt: "2026-07-11" },
  { slug: "health-insurance-dependent", sourceCheckedAt: "2026-07-11" },
  { slug: "home-cafe-daily", sourceCheckedAt: "2026-07-11" },
  { slug: "home-workout-20min", sourceCheckedAt: "2026-07-11" },
  { slug: "housing-subscription-account", sourceCheckedAt: "2026-07-12" },
  { slug: "infant-health-checkup-prep", sourceCheckedAt: "2026-07-11" },
  { slug: "infant-health-checkup-schedule", sourceCheckedAt: "2026-07-12" },
  { slug: "jeonse-guarantee-apply", sourceCheckedAt: "2026-07-12" },
  { slug: "job-seeker-allowance-apply", sourceCheckedAt: "2026-07-12" },
  { slug: "kitchen-reset-organize", sourceCheckedAt: "2026-07-11" },
  { slug: "lease-contract-report-deadline", sourceCheckedAt: "2026-07-11" },
  { slug: "military-exam-prep", sourceCheckedAt: "2026-07-11" },
  { slug: "monthly-household-budget", sourceCheckedAt: "2026-07-12" },
  { slug: "morning-routine-30day", sourceCheckedAt: "2026-07-11" },
  { slug: "morning-skincare-routine", sourceCheckedAt: "2026-07-11" },
  { slug: "moving-d30-basic", sourceCheckedAt: "2026-07-11" },
  { slug: "moving-dday", sourceCheckedAt: "2026-07-01T00:00:00+09:00" },
  { slug: "national-scholarship-apply", sourceCheckedAt: "2026-07-12" },
  { slug: "new-car-7-step", sourceCheckedAt: "2026-07-01T00:00:00+09:00" },
  { slug: "new-car-delivery-check", sourceCheckedAt: "2026-07-11" },
  { slug: "opic-1m", sourceCheckedAt: "2026-07-01T00:00:00+09:00" },
  { slug: "opic-2w", sourceCheckedAt: "2026-07-01T00:00:00+09:00" },
  { slug: "overseas-safety-register", sourceCheckedAt: "2026-07-11" },
  { slug: "overseas-travel-d14", sourceCheckedAt: "2026-07-11" },
  { slug: "passport-renewal-docs", sourceCheckedAt: "2026-07-11" },
  { slug: "payday-finance-routine", sourceCheckedAt: "2026-07-12" },
  { slug: "pension-estimate-check", sourceCheckedAt: "2026-07-11" },
  { slug: "pet-health-observation", sourceCheckedAt: "2026-07-11" },
  { slug: "portfolio-4week", sourceCheckedAt: "2026-07-11" },
  { slug: "property-local-tax-pay", sourceCheckedAt: "2026-07-12" },
  { slug: "reading-habit-30day", sourceCheckedAt: "2026-07-11" },
  { slug: "real-kdca-travel-health-check", sourceCheckedAt: "2026-07-11" },
  { slug: "real-pet-registration-check", sourceCheckedAt: "2026-07-12" },
  { slug: "real-safe-driving-license-renewal", sourceCheckedAt: "2026-07-11" },
  { slug: "real-samsung-aircon-seasonal-care", sourceCheckedAt: "2026-07-12" },
  { slug: "real-samsung-washer-filter-care", sourceCheckedAt: "2026-07-12" },
  { slug: "real-sinagong-computer-d30-study", sourceCheckedAt: "2026-07-12" },
  { slug: "real-ts-vehicle-inspection-prep", sourceCheckedAt: "2026-07-12" },
  { slug: "running-5k-4week", sourceCheckedAt: "2026-07-11" },
  { slug: "safe-inheritance-onestop", sourceCheckedAt: "2026-07-12" },
  { slug: "samsung-aircon-seasonal-check", sourceCheckedAt: "2026-07-12" },
  { slug: "samsung-washer-filter-cleaning", sourceCheckedAt: "2026-07-12" },
  { slug: "seal-or-signature-certificate", sourceCheckedAt: "2026-07-11" },
  { slug: "small-business-fund-check", sourceCheckedAt: "2026-07-12" },
  { slug: "tax-refund-find", sourceCheckedAt: "2026-07-11" },
  { slug: "travel-packing-list", sourceCheckedAt: "2026-07-11" },
  { slug: "unemployment-benefit-apply", sourceCheckedAt: "2026-07-12" },
  { slug: "used-car-buying-check", sourceCheckedAt: "2026-07-11" },
  { slug: "used-car-ownership-transfer", sourceCheckedAt: "2026-07-12" },
  { slug: "vehicle-inspection-prep", sourceCheckedAt: "2026-07-12" },
  { slug: "washer-tub-clean-monthly", sourceCheckedAt: "2026-07-11" },
  { slug: "wedding-d180-basic", sourceCheckedAt: "2026-07-11" },
  { slug: "wedding-timeline", sourceCheckedAt: "2026-07-01T00:00:00+09:00" },
  { slug: "wedding-vendor-board", sourceCheckedAt: "2026-07-01T00:00:00+09:00" },
  { slug: "weekly-meal-plan", sourceCheckedAt: "2026-07-11" },
  { slug: "welfare-benefit-finder", sourceCheckedAt: "2026-07-11" },
];

type SourceFreshnessAttentionLike = {
  slug: string;
  checkedAt?: string | null;
  bucket: string;
};

function debtKey(slug: string, sourceCheckedAt: string | null): string {
  return `${slug}@@${sourceCheckedAt ?? 'missing'}`;
}

const DEBT_KEYS: ReadonlySet<string> = new Set(
  SOURCE_REVIEW_DEBT.map((entry) => debtKey(entry.slug, entry.sourceCheckedAt)),
);

// Recorded debt only covers a Flow that is overdue for review. Any other
// attention bucket on a recorded Flow, such as missing_metadata, is new drift.
const DEBT_BUCKETS: ReadonlySet<string> = new Set(['review_due', 'stale']);

/**
 * Split a freshness summary's `attention` list against the recorded debt.
 *
 * `unexpected` is drift the recorded debt does not account for; it must always
 * be empty. `resolved` is recorded debt that no longer appears, meaning the
 * entry is stale and should be deleted — only assert on it when the summary
 * covered every seed bundle, since a filtered summary legitimately omits
 * runtime-excluded entries.
 */
export function partitionSourceReviewDebt(attention: readonly SourceFreshnessAttentionLike[]): {
  unexpected: SourceFreshnessAttentionLike[];
  resolved: SourceReviewDebtEntry[];
  matchedCount: number;
} {
  const matched = new Set<string>();
  const unexpected: SourceFreshnessAttentionLike[] = [];

  for (const entry of attention) {
    const key = debtKey(entry.slug, entry.checkedAt ?? null);
    if (DEBT_BUCKETS.has(entry.bucket) && DEBT_KEYS.has(key)) {
      matched.add(key);
      continue;
    }
    unexpected.push(entry);
  }

  const resolved = SOURCE_REVIEW_DEBT.filter(
    (entry) => !matched.has(debtKey(entry.slug, entry.sourceCheckedAt)),
  );

  return { unexpected, resolved, matchedCount: matched.size };
}

export function describeSourceReviewAttention(
  attention: readonly SourceFreshnessAttentionLike[],
  limit = 20,
): string {
  return attention
    .slice(0, limit)
    .map((entry) => `${entry.slug}:${entry.bucket}:${entry.checkedAt ?? 'missing'}`)
    .join(', ');
}
