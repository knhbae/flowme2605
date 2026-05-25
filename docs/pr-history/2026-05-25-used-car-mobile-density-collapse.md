# Used-Car Mobile Density Collapse

Date: 2026-05-25

Branch: `content/used-car-mobile-density-collapse`

PR: TBD

Status: In progress

Vercel: TBD

Merged SHA: TBD

## Summary

This batch applies the mobile secondary-section collapse pattern to `used-car-buying-check` so the candidate comparison and buy/hold memo remain the dominant first artifact on mobile.

## Changed

- Added used-car coverage to the mobile collapsed-section E2E.
- Added `used-car-buying-check` to route-scoped mobile secondary-section collapse.
- Captured desktop/mobile screenshots.
- Added content audit, spec, QA, and PR history records.

## Validation Boundary

This is not validation. It reduces internal mobile density risk but does not prove buyers can use the route in a real purchase scenario.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile sensitive routes collapse"`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile sensitive routes collapse"`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` (CRLF normalization warnings only)

## Screenshots

- `docs/screenshots/2026-05-25-used-car-mobile-density-collapse.png`
- `docs/screenshots/2026-05-25-used-car-mobile-density-collapse-desktop.png`
