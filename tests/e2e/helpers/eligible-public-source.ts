/** NEW public journeys use actual, currently eligible content.
 * These constants are expectations, not a route alias or a policy override.
 * Existing personal-copy fixtures keep their original source identity/bytes.
 */
// Existing source-backed timeline, not one of the new 14 reviewed editions.
// The reviewed portfolio intentionally removed source-unspecified day offsets.
export const eligibleTimeline = {
  slug: 'curated-wedding-naver-timeline',
  itemCount: 6,
  firstItemId: 'wedding-naver-d12',
  firstDayOffset: -365,
} as const;
