# Study Source-Derived Validation Guard

Date: 2026-05-25
Branch: `test/study-source-derived-guard`
PR: #47

## Why

The study route should read as a creator-converted progress table from source structure, not as a blank user-designed tracker. The same batch also keeps route status language honest: internal QA can make a route representative-eligible, but real user behavior is required before using `validated`.

## Changed

- Added source-derived/read-only/user-editable metadata to the `computer-skills-d30-study` progress table.
- Preserved source-derived scope values during text/workbook export even if workbench state contains an override.
- Kept user-editable target date and status values in export output.
- Exposed artifact-card metadata for E2E coverage.
- Added validation evidence docs and content audit notes.

## Verification

- `npm test -- lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed.
- `npm run build` passed.
- `npm run test:e2e -- --grep "study progress table exposes source-derived guard"` passed.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.
