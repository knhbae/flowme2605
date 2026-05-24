# QA

## RED

- `npm test -- lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` failed before implementation because `computer-skills-d30-study` still used generic week labels and empty export rows.

## GREEN

- `npm test -- lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed: 129 tests.
- `npm run docs:check` passed: 14 required files, 160 local links.
- `npm run build` passed.
- `npm run test:e2e -- --grep "computer skills final QA"` passed: 1 test.
- `npm test` passed: 129 tests.
- `npm run docs:check` passed: 14 required files, 162 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:e2e` passed: 44 tests.

## Browser Evidence

- Study desktop: [screenshot](../../screenshots/2026-05-24-study-source-curriculum-first-screen-desktop.png)
- Study mobile: [screenshot](../../screenshots/2026-05-24-study-source-curriculum-first-screen-mobile.png)

## Remaining Verification

Update PR URL and post-merge checks after the PR is opened and merged.
