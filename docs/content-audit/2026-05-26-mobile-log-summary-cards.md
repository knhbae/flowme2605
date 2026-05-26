# Mobile log summary cards

Date: 2026-05-26

This batch starts the `design-ref/260526` mobile table-density pass.

## Change

- Generic log-table artifacts now render a mobile-only summary card before the dense table.
- Spreadsheet-first artifacts such as `diet-habit-2week` also render a mobile-only summary card before the spreadsheet table.
- Existing desktop tables and export behavior are unchanged.

## Why

The design reference says mobile users should see a compact artifact summary plus the destination export before needing to inspect a horizontal table. Before this pass, `diet-habit-2week` opened directly into a dense spreadsheet table on mobile.

## Scope

Initial route checked:

- `diet-habit-2week`

The next pass should add comparable mobile summaries for comparison tables such as:

- `new-car-delivery-check`
- `used-car-buying-check`

No route is called validated.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile log artifacts show a summary card before dense tables"` failed before implementation because no mobile summary card existed.
- GREEN: the same targeted Playwright test passed after implementation.
- `npm run build` passed.
