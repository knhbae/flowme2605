# New Car + Diet Risk QA PR History

**Branch:** `codex/new-car-diet-risk-qa`
**PR:** Pending
**Related audit:** [2026-05-23-new-car-diet-risk-qa.md](../content-audit/2026-05-23-new-car-diet-risk-qa.md)
**Related spec:** [2026-05-23-new-car-diet-risk-qa](../specs/2026-05-23-new-car-diet-risk-qa/spec.md)

## Summary

- Added risk-boundary QA records for `new-car-delivery-check` and `diet-habit-2week`.
- Added delivery proof memo fields for new-car handover evidence.
- Added a warning/observation card inside the diet spreadsheet workbench.
- Added export and E2E coverage for realistic user-entered artifacts.
- Saved desktop/mobile screenshots for both routes.

## Verification

- `npm test -- lib/flow/artifact-fields.test.ts` passed.
- `npm test -- lib/flow/content-lab.test.ts` passed.
- `npm test -- lib/flow/export.test.ts` passed.
- `npm test` passed: 125 tests.
- `npm run docs:check` passed: 14 required files, 90 local links.
- `git diff --check` passed with CRLF warnings only.
- `npm run build` passed.
- `npm run test:e2e -- --grep "risk-boundary QA"` passed.
- `npm run test:e2e` passed: 41 tests.

## Exposure

No representative promotion. Both routes remain public MVP candidates and lifecycle `fix`.
