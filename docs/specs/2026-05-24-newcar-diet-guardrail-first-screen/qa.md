# QA

## RED

- `npm run test:e2e -- --grep "public MVP guardrail"` failed before implementation because the new-car workbench did not show `인수 전 보류 기준`.

## GREEN

- `npm run build` passed.
- `npm run test:e2e -- --grep "public MVP guardrail|risk-boundary QA"` passed: 2 tests.
- `npm test` passed: 128 tests.
- `npm run docs:check` passed: 14 required files, 147 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:e2e` passed: 44 tests.

## Browser Evidence

- New-car desktop: [screenshot](../../screenshots/2026-05-24-new-car-guardrail-first-screen-desktop.png)
- New-car mobile: [screenshot](../../screenshots/2026-05-24-new-car-guardrail-first-screen-mobile.png)
- Diet desktop: [screenshot](../../screenshots/2026-05-24-diet-guardrail-first-screen-desktop.png)
- Diet mobile: [screenshot](../../screenshots/2026-05-24-diet-guardrail-first-screen-mobile.png)

## Remaining Verification

Update PR URL and post-merge checks after the PR is opened and merged.
