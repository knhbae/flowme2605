# QA

## RED

- `npm run test:e2e -- --grep "artifact workbench exposes export actions"` failed before implementation because the workbench did not contain `체크리스트 복사`.

## GREEN

- `npm run build` passed.
- `npm run test:e2e -- --grep "artifact workbench exposes export actions"` passed: 1 test.
- `npm test` passed: 129 tests.
- `npm run docs:check` passed: 14 required files, 174 local links before screenshot links.
- `npm run docs:check` passed after screenshot links: 14 required files, 176 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:e2e` passed: 46 tests.

## Browser Evidence

- Moving desktop: [screenshot](../../screenshots/2026-05-24-artifact-near-export-actions-moving-desktop.png)
- Study mobile full page: [screenshot](../../screenshots/2026-05-24-artifact-near-export-actions-study-mobile.png)
- In-app Browser check: moving and study workbenches contain artifact-near copy/xlsx/calendar actions.

## Remaining Verification

- PR URL and post-merge checks
