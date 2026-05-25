# FITVELY Workout-Plan Decision First

Date: 2026-05-25
Branch: `fitvely-workout-plan-decision-first`
PR: #104
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/FURTV5ACxKbJhdB22pjcTQsQpyn6

## Why

FITVELY workout programming videos were still too close to "weekly workout table first." The user needs to choose one source rule or split before putting anything into a calendar reminder or weekly workout sheet.

## Changed

- Routed the three FITVELY workout programming exact-video routes to decision-table-first artifact plans.
- Added route-specific decision rows for source-rule candidate, user-condition fit, weekly-plan application, and revise-or-hold condition.
- Rewrote workout-plan detail copy from weekly-table-first to `결정표:` then `결정 후 운동표:`.
- Added exact-video tool copy that says `운동 기준 결정표에 들어간 적용 Flow`.
- Added desktop/mobile screenshots and an audit/spec/QA record.

## Not Done

- Did not generate automatic workout plans.
- Did not add direct integrations.
- Did not invent exercise details, sets, weights, or outcome claims.
- Did not create a Figma artifact because this pass reused existing decision-table components.
- Did not mark any route validated.

## Verification

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "workout programming exact video|diet exact video flow uses application language|fitness exact video flow keeps"`
- `npm run test:e2e`
- Vercel PR check passed before merge.

## Screenshots

- [Desktop](../screenshots/2026-05-25-fitvely-workout-plan-decision-first-desktop.png)
- [Mobile](../screenshots/2026-05-25-fitvely-workout-plan-decision-first-mobile.png)

## Risks

The mobile comparison table still uses the existing horizontal table pattern. It is now correctly first, but a future Figma-backed layout pass should test whether a stacked comparison pattern reduces mobile friction.

## Follow-Ups

- Observe whether users understand source-rule selection before calendar export.
- Consider a Figma/component pass for mobile decision-table density if this route family remains important.
