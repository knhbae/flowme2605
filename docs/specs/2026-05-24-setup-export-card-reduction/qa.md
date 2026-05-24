# QA

## RED

- `npm run test:e2e -- --grep "public moving flow calculates"` failed before implementation because the normal Flow page still rendered `내보내기와 백업`.

## GREEN

- `npm run build` passed.
- `npm run test:e2e -- --grep "public moving flow calculates|computer skills final QA exports|risk-boundary QA exports|no-anchor checklist"` passed: 4 tests.
- `npm test` passed: 129 tests.
- `npm run docs:check` passed: 14 required files, 181 local links before screenshot links.
- `npm run docs:check` passed after screenshot links: 14 required files, 183 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:e2e` failed once because two draft-copy tests still targeted the removed setup button `내 버전 만들기`; root cause was stale test selectors, not missing draft-copy behavior.
- `npm run test:e2e -- --grep "my flow workspace|public flow can be copied"` passed after updating those tests to use the workbench `내 버전` button: 2 tests.
- `npm run test:e2e` passed after selector update: 46 tests.

## Browser Evidence

- Moving desktop: [screenshot](../../screenshots/2026-05-24-setup-export-card-reduction-moving-desktop.png)
- Study mobile full page: [screenshot](../../screenshots/2026-05-24-setup-export-card-reduction-study-mobile.png)
- In-app Browser check: `movingHasSetupExportCard=false`, `movingHasWorkbenchExport=true`, `noAnchorHasCalendarExportInWorkbench=false`, `noAnchorHasCopyInWorkbench=true`.

## Remaining Verification

- Post-merge checks
