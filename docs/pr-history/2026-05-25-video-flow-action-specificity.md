# Video Flow Action Specificity

Date: 2026-05-25

## Summary

PR #100 tightened repeated single-video workout Flows so the exported calendar reminder tells the user what to do without reopening FLOW first. The changed ThankyouBUBU exact-video routes still remain below representative, public-MVP, or validated framing.

## Scope

- Updated `real-thankyou-bubu-home-workout-starter` and `real-thankyou-bubu-20min-routine` item details with reminder-ready preparation, execution, source-video, post-workout record, and stop/consult guidance.
- Added seed and calendar export tests for repeated workout video action specificity.
- Documented the product rule split between repeated single-video calendar Flows and multi-video sequence Flows.
- Documented that Figma should be used for future layout, hierarchy, and mobile density UX/UI batches, while this batch required no Figma canvas because it changed content/export behavior only.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` failed before implementation because repeated workout video copy was not calendar-notification-ready.
- GREEN: `npm run build` passed.
- GREEN: `npm test` passed with 167 tests.
- GREEN: `npm run docs:check` passed with 14 required files and 256 local links.
- GREEN: `npm run test:e2e -- -g "former broad ThankyouBUBU routes now render as one exact-video action"` passed.
- GREEN: `npm run test:e2e` passed with 53 tests.
- Vercel check passed on PR #100 before merge.

## Merge

- PR: #100
- Squash merge commit: `5dad8fed11339be223610caf46a72717cf794979`
- Post-merge main sync completed locally.
