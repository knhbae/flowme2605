# Desktop reference rail generalization

Date: 2026-05-26

This batch lands the next P1 item from the design-ref gap queue: desktop source context rail generalization.

## Change

- `moving-d30-basic` remains the reference implementation for the desktop right rail.
- The same desktop rail now applies to dense representative/public-MVP routes:
  - `computer-skills-d30-study`
  - `diet-habit-2week`
  - `new-car-delivery-check`
  - `used-car-buying-check`
  - `baby-food-menu-recipe`
- The rail keeps source context, source-fit status, and route warning context beside the artifact workbench on desktop.
- Mobile keeps the existing single-column behavior, including the baby-food warning/reaction-first ordering.
- Content Lab queue status moved `desktop-reference-rail-generalization` from pending to landed.

## Why

The design reference treats source context as persistent desktop support, not a below-the-fold appendix. Before this pass, only the moving route used that layout. Dense study, diet, vehicle, and baby-food routes still required users to scroll past the workbench to re-check source and risk context.

No route is called validated.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "dense desktop routes keep source context in a right rail beside the workbench"` failed because dense routes had no desktop rail layout.
- GREEN: the same targeted Playwright test passed after extending the desktop rail.
- Regression: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "baby food mobile starts with warning and today reaction record"` passed.
- Regression: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "moving desktop keeps source context in a right rail beside the workbench"` passed.
- Queue RED/GREEN: `npm test -- lib/flow/content-lab.test.ts` failed with the old landed/pending counts, then passed after updating the queue status.
