# Baby-Food Mobile Density Collapse

Date: 2026-05-25

Branch: `content/baby-food-mobile-density-collapse`

PR: TBD

Status: In progress

Vercel: TBD

Merged SHA: TBD

## Summary

This batch applies the mobile secondary-section collapse pattern to `baby-food-menu-recipe` so meal calendar and reaction logging stay first on mobile while recipe/check density remains available but secondary.

## Changed

- Added baby-food coverage to the mobile collapsed-section E2E.
- Added `baby-food-menu-recipe` to route-scoped mobile secondary-section collapse.
- Reused `FlowExecutionSectionShell` inside `MealPlanRenderer`.
- Captured desktop/mobile screenshots.
- Added content audit, spec, QA, and PR history records.

## Validation Boundary

This is not validation. It reduces internal mobile density risk but does not prove parents can use the route correctly in real feeding decisions.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile sensitive routes collapse"`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile sensitive routes collapse"`
- PASS: `npm test`
- PASS: `npm run docs:check`
- PASS: `git diff --check` (CRLF normalization warnings only)

## Screenshots

- `docs/screenshots/2026-05-25-baby-food-mobile-density-collapse.png`
- `docs/screenshots/2026-05-25-baby-food-mobile-density-collapse-desktop.png`
