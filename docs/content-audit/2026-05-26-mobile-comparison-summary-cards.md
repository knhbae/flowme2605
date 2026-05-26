# Mobile comparison summary cards

Date: 2026-05-26

This batch continues the `design-ref/260526` mobile table-density pass for decision/comparison artifacts.

## Change

- Comparison-table artifacts now render a mobile-only summary card before the dense comparison grid.
- The summary card previews the first candidate and first three comparison rows.
- Desktop comparison grids, candidate editing, notes, and sheet export behavior are unchanged.

## Routes checked

- `new-car-delivery-check`
- `used-car-buying-check`

## Why

The design reference asks mobile screens to show a compact artifact summary before table-heavy surfaces. Before this pass, comparison routes opened directly into the horizontally dense comparison grid.

No route is called validated.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile comparison artifacts show a summary card before dense grids"` failed before implementation because no comparison summary card existed.
- GREEN: the same targeted Playwright test passed after implementation.
- Regression: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "decision flow comparison table edits"` passed.
- `npm run build` passed.
