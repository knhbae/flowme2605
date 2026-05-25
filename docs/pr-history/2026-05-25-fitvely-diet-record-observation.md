# FITVELY Diet Record Observation

Date: 2026-05-25

Branch: `content/fitvely-diet-record-observation`

PR: TBD

Status: In progress

Vercel: TBD

Merged SHA: TBD

## Summary

This batch reshapes `real-fitvely-diet-record-routine` after the exact FITVELY nutrition source replacement. The route now starts from one sheet-first observation action instead of five generic diet-record steps.

## Changed

- Added seed-flow coverage for the route becoming one observation-sheet action.
- Added artifact-field coverage for a dedicated `fitvely-diet-observation-log`.
- Rewrote the route around one selected source rule, one meal/condition row, next adjustment, and stop/consult condition.
- Updated natural artifact audit and cleanup docs to reflect the first observation reshape.
- Added a direct-route E2E check for the observation sheet surface.

## Validation Boundary

This is not user validation. The route remains below representative and public-MVP framing until a simulated or observed user can open the source, choose one rule, fill one sheet row, and understand the stop/consult boundary.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/artifact-fields.test.ts`
- PASS: `npm test -- lib/flow/seed-flows.test.ts lib/flow/artifact-fields.test.ts`
- Pending: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "FITVELY diet record"`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "FITVELY diet record"`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` with CRLF warnings only

## Screenshots

- `docs/screenshots/2026-05-25-fitvely-diet-record-observation-desktop.png`
- `docs/screenshots/2026-05-25-fitvely-diet-record-observation-mobile.png`
