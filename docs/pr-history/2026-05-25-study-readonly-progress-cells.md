# Study Read-Only Progress Cells

Date: 2026-05-25
Branch: `ux/study-source-readonly-cells`
PR: #48

## Why

The export guard from PR #47 protects source-derived scope values, but the UI still presented the scope column as an editable input. That made the representative study route feel closer to a blank tracker than a creator-converted source table.

## Changed

- Render `readOnlyColumnIds` cells as static values in the log table card.
- Keep target date, status, and note fields as inputs.
- Update computer-skills E2E coverage to assert the scope cell is visible but not a textbox.
- Capture desktop and mobile screenshots.

## Screenshots

- [Desktop source-derived progress table](../screenshots/2026-05-25-study-readonly-progress-desktop.png)
- [Mobile source-derived progress table](../screenshots/2026-05-25-study-readonly-progress-mobile.png)

## Verification

- `npm run build` passed.
- `npm run test:e2e -- --grep "study progress table exposes source-derived guard|computer skills final QA"` passed.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.
