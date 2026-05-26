# next_job2

## Context
- Branch: `design-ref-full-gap-alignment`
- PR: https://github.com/knhbae/flowme2605/pull/112
- Latest Vercel preview: https://flowme2605-m08bbz5gg-flowme.vercel.app
- User asked to apply `my_tests/250526_experiment_checklist.md` broadly, without further approval, then pull/push PR and deploy to Vercel.
- Do not touch unrelated untracked `design-ref/` or `next_job.md` unless explicitly requested.

## Implemented
- Reworked experiment-checklist routes away from unsupported leading artifacts:
  - `diet-habit-2week`: reduced to one 14-day sleep check calendar.
  - `baby-food-menu-recipe`: menu calendar only; no reaction record/log UI on the primary workbench.
  - `new-car-delivery-check` and `used-car-buying-check`: checklist-first; stale comparison export is ignored.
  - `moving-d30-basic`, `vehicle-inspection-prep`, `real-mofa-overseas-travel-prep`: compact list + month calendar, with removed memo/comparison surfaces.
  - `passport-renewal-docs`: checklist-first without memo-card surface.
  - `real-thankyou-bubu-home-workout-starter`, `real-fitvely-diet-record-routine`: check-only routine/calendar treatment.
- Updated export filtering so removed memo fields do not reappear from stale local state.
- Updated artifact plan, field config, execution model, seed conversion, and UI rendering tests to lock these UX/content decisions.

## Verification Run
- `npm test`: passed, 184/184.
- `npm run build`: passed.
- Browser QA against `http://localhost:3001` with Playwright:
  - Desktop routes checked: `diet-habit-2week`, `real-thankyou-bubu-home-workout-starter`, `real-fitvely-diet-record-routine`, `baby-food-menu-recipe`, `moving-d30-basic`, `used-car-buying-check`, `new-car-delivery-check`, `passport-renewal-docs`, `real-mofa-overseas-travel-prep`.
  - Mobile checked: `diet-habit-2week`.

## Remaining For Next Chat
- PR #112 has been updated by pushing branch `design-ref-full-gap-alignment`.
- If more UX polish is requested, focus next on copy density and source-specific labels in the checklist rows, not on adding more artifact surfaces.
