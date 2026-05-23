# Real-Source Manual Source-Fit Promotion

**Date:** 2026-05-23
**Branch:** `codex/real-source-manual-source-fit`
**PR URL:** TBD
**Status:** Draft

## Why

The 40 `source_status=real` flows had natural-artifact audits but still appeared as derived real-source reviews in inventory and Content Lab. That left their exposure state implicit even though each route already had simulated user inputs, expected artifacts, current Flow/UX gaps, and next content/UX actions.

## What Changed

- Built source-fit audit records from the existing real-source natural-artifact audit corpus.
- Mapped natural-artifact decisions to source-fit decisions:
  - 4 `keep_representative`
  - 30 `reshape_before_featured`
  - 6 `catalog_preview_only`
  - 0 `hide_from_public_catalog`
- Updated source-fit summary to 71 audited routes.
- Updated inventory/lifecycle/Content Lab tests and counts.
- Updated Flow Lab E2E expectation for the manual source-fit count.
- Added spec and content audit docs for this batch.

## Not Done

- Did not reshape the 30 real-source `reshape_before_featured` routes.
- Did not add the 4 keep-eligible real-source routes to the representative landing set.
- Did not replace broad source URLs for the 6 catalog-preview real-source routes.

## Decisions

- Natural-artifact audits remain the route-specific evidence source; source-fit records are the exposure gate projection.
- Batch score profiles are intentionally conservative: exact/high-fit routes can be eligible, reshaping routes stay in source review, broad sources stay catalog preview.
- Direct route access remains available; this batch changes audit classification, not route availability.

## Verification

- RED check: `npm test -- lib/flow/source-fit.test.ts` failed before implementation because source-fit count stayed 31 and real-source slugs were missing.
- Targeted post-implementation unit checks passed for source-fit, inventory, Content Lab, lifecycle, and execution model tests.
- `npm test` passed: 108 tests, 0 failures.
- `npm run docs:check` passed: 14 required files, 60 local links.
- `npm run build` passed: Next.js production build compiled and type-checked successfully.
- `npm run test:e2e -- --grep "flow lab"` passed: 1 targeted Playwright test.
- `npm run test:e2e` passed: 38 Playwright tests.

## Risks

- This is a promotion of existing manual audit evidence, not a new live source recrawl.
- Routes with `keep_representative` still need first-screen UX review before landing expansion.
- Some exact-video and diet routes have source-review exposure now, but they still need UX/content shaping before stronger public presentation.
