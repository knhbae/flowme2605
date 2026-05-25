# FITVELY Nutrition Action Clarity

Date: 2026-05-25
Branch: `fitvely-nutrition-action-clarity`
PR: #105
Status: Merged and Vercel check passed
Merge commit: `661a394c5b3ca6c33e3bef9fdce87cb97d8382a9`
Vercel: https://vercel.com/flowme/flowme2605/9RUCSSyMjvS9QNjjHJYFSGapQgUv

## Why

FITVELY nutrition exact-video Flows still did not clearly say what to do when the Flow item is copied to a sheet or reminder. The route needed to preserve the source-video boundary while making one concrete action portable: choose one rule, apply it once, record before/after response, and decide keep or stop.

## Changed

- Rewrote FITVELY nutrition exact-video detail copy with `첫 행동`, `적용 전 기록`, `적용 후 기록`, and `유지/중단 결정`.
- Added route-specific apply-before-after observation table fields for seven FITVELY nutrition exact-video routes.
- Updated embedded exact-video tool copy to `오늘 한 끼 적용 관찰표 Flow` and `적용 전후 관찰표`.
- Updated E2E persistence expectations from generic diet-log fields to source-rule observation fields.
- Added audit/spec/QA docs and desktop/mobile screenshots.

## Not Done

- Did not generate automatic diet targets, gram amounts, or meal plans.
- Did not add external app direct integrations.
- Did not add native long-term health records.
- Did not treat creator advice as official medical guidance.
- Did not mark any route validated.
- Did not create a Figma artifact because this pass changed copy and table fields, not component layout.

## Verification

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "diet exact video flow uses application language"`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "artifact workbench shows the primary usable surface first|artifact workbench saves local execution entries|diet exact video flow uses application language"`
- `npm run test:e2e`
- Vercel PR check passed before merge.

## Screenshots

- [Desktop](../screenshots/2026-05-25-fitvely-nutrition-action-clarity-desktop.png)
- [Mobile](../screenshots/2026-05-25-fitvely-nutrition-action-clarity-mobile.png)

## Follow-Ups

- Observe whether users understand source-rule selection before spreadsheet export.
- Consider a Figma/component pass for stacked mobile observation-table fields if the horizontal table remains hard to use on phones.
