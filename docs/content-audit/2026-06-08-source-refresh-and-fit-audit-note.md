# 2026-06-08 Source Refresh and Fit Audit Note

## Scope

This note records the follow-up audit work after promoting the dorm move-in candidate into `/content-flows`.

## Completed

- Cleared the remaining source-needs-review priority queue by adding manual source-fit audits for 8 promoted category routes.
- Added source refresh decisions for weak-source Korean Flow candidates that still had `usable_but_ai_like` or similar review labels:
  - `fridge-cleanout-weekly-plan`
  - `freelancer-income-tax-docs`
  - `first-kimjang-weekend-checklist`
  - `beginner-camping-packing-sheet`
- Kept all four refreshes bounded:
  - fridge remains a sheet-first inventory/menu candidate, not a savings or nutrition promise.
  - freelancer tax remains a document-prep checklist, not filing, tax calculation, or advice.
  - kimjang remains a seasonal project checklist with official safety boundary.
  - camping remains a grouped packing sheet, not gear recommendation.

## Source Notes

- Fridge cleanout refresh uses a 7-day creator plan with inventory, limited purchases, and final leftover processing.
- Freelancer tax refresh officializes the route with the National Tax Service comprehensive income tax overview.
- Kimjang refresh officializes the safety boundary with the MFDS salted cabbage guidance.
- Camping refresh uses a category-based packing checklist with safety and loading guidance.

## Verified

- `npx tsx --test lib/flow/korean-flow-content-source-refresh.test.ts`
- `npm test`
- `npm run docs:check`
- `npm run build`

## Next Recommended Start

Continue Phase 1 by promoting the next comparison candidate only after checking whether its source boundary and export artifact are clearer than the newly refreshed conditional routes. The strongest next branch is still the elementary school entry candidate because it is official-source friendly and can test parent-facing D-day execution without sensitive fields.
