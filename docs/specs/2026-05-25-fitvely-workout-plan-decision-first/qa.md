# QA

Date: 2026-05-25

## Target Routes

- `real-fitvely-video-bulk-up-method`
- `real-fitvely-video-workout-order`
- `real-fitvely-video-workout-split-science`

## Checks

- RED confirmed:
  - `npm test -- lib/flow/artifact-plan.test.ts lib/flow/seed-flows.test.ts`
  - `npm test -- lib/flow/artifact-fields.test.ts`
  - `npx playwright test tests/e2e/flow-mvp.spec.ts -g "workout programming exact video"`
- GREEN confirmed:
  - `npm run build`
  - `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts lib/flow/seed-flows.test.ts`
  - `npx playwright test tests/e2e/flow-mvp.spec.ts -g "workout programming exact video"`

## Screenshots

- [Desktop](../../screenshots/2026-05-25-fitvely-workout-plan-decision-first-desktop.png)
- [Mobile](../../screenshots/2026-05-25-fitvely-workout-plan-decision-first-mobile.png)

## Remaining Verification

Completed before PR:

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "workout programming exact video|diet exact video flow uses application language|fitness exact video flow keeps"`
- `npm run test:e2e`

## Residual Risk

The decision table can still require horizontal scrolling on narrow mobile screens. This pass keeps the existing component and fixes artifact order/copy; a future Figma-backed layout pass can explore a stacked comparison pattern.
