# QA

## RED

- `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` failed before implementation because baby-food still mapped to `timeline_calendar` and used-car lacked route-specific rows.
- `npm run test:e2e -- --grep "baby food first screen|used-car first screen"` failed before implementation against the previous build because the new workbench surfaces were absent.

## GREEN

- `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed: 128 tests.
- `npm test` passed: 128 tests.
- `npm run docs:check` passed: 14 required files, 133 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run build` passed.
- `npm run test:e2e -- --grep "baby food first screen|used-car first screen"` passed: 2 tests.
- `npm run test:e2e` passed: 43 tests.

## Browser Evidence

- Baby-food desktop: [screenshot](../../screenshots/2026-05-24-baby-food-first-screen-simplify-desktop.png)
- Baby-food mobile: [screenshot](../../screenshots/2026-05-24-baby-food-first-screen-simplify-mobile.png)
- Used-car desktop: [screenshot](../../screenshots/2026-05-24-used-car-first-screen-simplify-desktop.png)
- Used-car mobile: [screenshot](../../screenshots/2026-05-24-used-car-first-screen-simplify-mobile.png)

## Remaining Verification

Update PR URL and post-merge checks after the PR is opened and merged.
