# QA

Date: 2026-05-25

## TDD Evidence

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` | RED | Failed because `used-car-buying-check` did not include `차량 상태를 보증하지 않습니다`, and text export did not include the warning near the top. |
| `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` | GREEN | 165 tests passed after updating seed warning and text export warning placement. |

## Final Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run docs:check` | Pass | 14 required files and 256 local links passed. |
| `npm test` | Pass | 165 tests passed. |
| `npm run build` | Pass | Next.js production build completed. |
| `npx playwright test tests/e2e/flow-mvp.spec.ts -g "used-car"` | Pass | 2 used-car E2E tests passed. |

## Screenshot Decision

No screenshot was required for this batch. The change is a warning/export text boundary covered by unit tests; layout and responsive behavior were not changed.
