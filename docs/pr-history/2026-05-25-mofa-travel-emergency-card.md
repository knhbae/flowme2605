# MOFA Travel Emergency Card

Date: 2026-05-25

Branch: `content/mofa-travel-emergency-card`

PR: TBD

Status: In progress

Vercel: TBD

Merged SHA: TBD

## Summary

This batch reshapes `real-mofa-overseas-travel-prep` around a portable emergency memo card for country confirmation, travel alerts, embassy/consular contacts, local emergency numbers, insurance/shelter notes, and family sharing.

## Changed

- Added MOFA route-specific memo fields.
- Made the route `memo_card` first.
- Added unit and E2E coverage.
- Captured desktop/mobile screenshots.
- Added content audit, spec, QA, and PR history records.

## Validation Boundary

This is not validation. It reduces internal UX/content risk but does not prove travelers can use the route correctly in a real trip.

## Verification

- RED: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts`
- PASS: `npm run build`
- PASS: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "MOFA travel route"`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` (CRLF normalization warnings only)

## Screenshots

- `docs/screenshots/2026-05-25-mofa-travel-emergency-card-mobile.png`
- `docs/screenshots/2026-05-25-mofa-travel-emergency-card-desktop.png`
