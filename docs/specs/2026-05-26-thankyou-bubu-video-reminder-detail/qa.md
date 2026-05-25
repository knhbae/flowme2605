# ThankyouBUBU Video Reminder Detail QA

Date: 2026-05-26

## Required Checks

- `npm run build`
- `npm test`
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "former broad ThankyouBUBU routes|routine flow highlights weekly routine setup|calendar export creates a portable weekly event"`
- `npm run test:e2e`

## TDD Evidence

RED:

- `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` failed because `real-thankyou-bubu-video-full-body-no-jump` did not include `캘린더 알림` in the portable action/export.
- `npm test -- lib/flow/ux-cleanup-backlog.test.ts` failed because the backlog still pointed to auditing ThankyouBUBU exact videos instead of Screen 4 routine setup.

GREEN:

- `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` passed with 173 tests.
- `npm test -- lib/flow/ux-cleanup-backlog.test.ts` passed with 173 tests.

## Results

- `npm run build`: passed on 2026-05-26.
- `npm test`: 173 passed on 2026-05-26.
- `npm run docs:check`: passed with 14 required files and 276 local links on 2026-05-26.
- Related Playwright: 2 passed on 2026-05-26.
- `npm run test:e2e`: 56 passed on 2026-05-26.

## Screenshot Decision

No screenshot is required for this batch because it changes detail/export copy and backlog metadata, not layout, responsive framing, or visual hierarchy.
