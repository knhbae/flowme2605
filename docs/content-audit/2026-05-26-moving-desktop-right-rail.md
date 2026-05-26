# Moving desktop right rail

Date: 2026-05-26

This batch applies the first `design-ref/260526` desktop workbench plus right-rail pattern to `moving-d30-basic`.

## Change

- `moving-d30-basic` now wraps the export-first hero and artifact workbench in a desktop two-column layout.
- The left column keeps the anchor, calendar-first workbench, and execution-list secondary artifact.
- The right rail keeps source context and warning/status cards when present.
- Mobile keeps source context below the main flow instead of forcing a rail.

## Why

The design reference expects desktop screens to keep the main artifact workbench on the left and source/caution context in a sticky right rail. Before this batch, source context still appeared as a full-width block below the execution content, which made the first execution surface less distinct from background/reference information.

## Scope

This is intentionally route-scoped to `moving-d30-basic`.

The next pass should generalize the same rail pattern only after checking source/risk duplication for:

- `computer-skills-d30-study`
- `diet-habit-2week`
- `new-car-delivery-check`
- `used-car-buying-check`
- `baby-food-menu-recipe`

No route is called validated.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "moving desktop keeps source context in a right rail"` failed before implementation because the desktop rail did not exist.
- GREEN: the same targeted Playwright test passed after implementation.
- `npm run build` passed.
- `npm test -- lib/flow/artifact-plan.test.ts` passed through the full configured unit suite.
