# QA

## RED

- `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` failed before implementation because `passport-renewal-docs` returned `checklist` and no passport memo fields.
- `npm run test:e2e -- --grep "reshaped official route workbenches"` failed before implementation because the route did not show `메모 카드` first.

## GREEN

- `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts` passed: 128 tests.
- `npm run build` passed.
- `npm run test:e2e -- --grep "reshaped official route workbenches"` passed: 1 test.
- `npm test` passed: 128 tests.
- `npm run docs:check` passed: 14 required files, 155 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:e2e` passed: 44 tests.

## Browser Evidence

- Passport desktop: [screenshot](../../screenshots/2026-05-24-passport-submission-memo-first-screen-desktop.png)
- Passport mobile: [screenshot](../../screenshots/2026-05-24-passport-submission-memo-first-screen-mobile.png)

## Remaining Verification

Update PR URL and post-merge checks after the PR is opened and merged.
