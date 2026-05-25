# Baby-Food Mobile Density Collapse

Date: 2026-05-25

## Decision

`baby-food-menu-recipe` already prioritizes meal calendar and reaction logging before recipe detail. The remaining mobile risk was that later recipe/check sections still made the page feel like a long recipe checklist rather than an observation-first baby-food artifact.

This pass keeps the first meal/reaction artifact visible and collapses secondary execution sections on mobile.

No representative, public-MVP, or validation status changes in this batch.

## Natural Artifact Simulation

Route: `baby-food-menu-recipe`

Simulated user:

- Start date: `2026-06-01`
- First output: 6 meal slots with reaction log fields for eaten amount, skin reaction, vomiting/diarrhea, stool, sleep/condition, refusal/preference memo.
- Parent task: record what happened after each meal before opening detailed recipes.

Expected mobile output:

- Meal/reaction workbench remains first.
- Recipe/detail-heavy later section is available but collapsed on mobile.
- Allergy/expert-check caution remains visible as source/risk context.

## UX Boundary

FLOW structures a feeding and reaction note. It does not decide readiness, allergy risk, or medical suitability.

## Screenshots

- `docs/screenshots/2026-05-25-baby-food-mobile-density-collapse.png`
- `docs/screenshots/2026-05-25-baby-food-mobile-density-collapse-desktop.png`
