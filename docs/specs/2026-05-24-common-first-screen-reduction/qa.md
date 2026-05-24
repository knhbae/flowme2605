# QA

## RED

- `npm run test:e2e -- --grep "common first screen keeps progress"` failed before implementation because the setup column still rendered `항목을 체크하면 이 브라우저에 자동 저장됩니다.` as a separate progress card.

## GREEN

- `npm run build` passed.
- `npm run test:e2e -- --grep "common first screen keeps progress"` passed: 1 test.
- `npm test` passed: 129 tests.
- `npm run docs:check` passed: 14 required files, 167 local links before screenshot links and 169 local links after screenshot links.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:e2e` passed: 45 tests.

## Browser Evidence

- Moving desktop: [screenshot](../../screenshots/2026-05-24-common-first-screen-reduction-moving-desktop.png)
- Study mobile: [screenshot](../../screenshots/2026-05-24-common-first-screen-reduction-study-mobile.png)
- In-app Browser check: `movingHasDuplicateProgressCopy=false`, `movingWorkbenchBeforeOverview=true`, `movingHasWorkbenchProgress=true`, `studyHasDuplicateProgressCopy=false`.

## Remaining Verification

- PR URL and post-merge checks
