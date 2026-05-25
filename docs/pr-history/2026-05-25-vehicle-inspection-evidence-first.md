# Vehicle Inspection Evidence-First

Date: 2026-05-25

Branch: `content/vehicle-inspection-evidence-first`

PR: TBD

Status: In progress

Vercel: TBD

Merged SHA: TBD

## Summary

This batch addresses the P1 vehicle evidence-first cleanup for `vehicle-inspection-prep`. The route keeps its timeline but now has a dedicated reservation/result follow-up memo card.

## Changed

- Added artifact-field coverage for vehicle inspection memo fields.
- Added reservation, document, precheck evidence, result sheet, and repair/reinspection follow-up fields.
- Updated stale conversion-note language.
- Added E2E coverage and desktop/mobile screenshots.

## Validation Boundary

This is not validation. The route still needs a simulated or observed user session to confirm the memo fields match actual inspection preparation and post-result behavior.

## Verification

- RED: `npm test -- lib/flow/artifact-fields.test.ts`
- PASS: `npm test -- lib/flow/artifact-fields.test.ts`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "vehicle inspection route"`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` with CRLF warnings only

## Screenshots

- `docs/screenshots/2026-05-25-vehicle-inspection-evidence-first-desktop.png`
- `docs/screenshots/2026-05-25-vehicle-inspection-evidence-first-mobile.png`
