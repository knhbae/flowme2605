# Baby Food and Used Car First-Screen Simplification Spec

**Date:** 2026-05-24
**Status:** In Progress
**Owner:** Codex
**Related audit:** [Representative UX Content Simplification Audit](../../content-audit/2026-05-23-representative-ux-content-simplification.md)

## Goal

Simplify the first execution surface for `baby-food-menu-recipe` and `used-car-buying-check` so a real user sees the natural artifact they would actually maintain outside FLOW before long content detail.

## Stage Fit

This belongs in Stage 0 because it reduces screen complexity and strengthens export-first behavior. The work does not add account storage, native records, integrations, or broader marketplace features.

## User Need

As a user, I need the Flow page to immediately show the calendar, sheet, or memo I would copy into my own tools, so that I can act without reading the whole content page first.

## Scope

In:
- Make baby-food first screen a meal calendar plus reaction log.
- Keep baby-food allergy and expert-check warning above recipe detail.
- Make used-car first screen a candidate comparison table plus buy/hold memo.
- Keep longer used-car checklist secondary to comparison and decision notes.
- Preserve existing exports and local check behavior.

Out:
- Native long-term record storage inside FLOW.
- Medical or vehicle purchase recommendations.
- New source exposure decisions.
- New integrations with calendar, sheets, or car-history services.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Baby-food: choose or preview start date, then fill reaction log. Used-car: compare candidates, then write buy/hold memo. |
| Completion signal | The first workbench shows the natural artifact and can receive user notes/checks. |
| Artifact destination | Baby-food: calendar + sheet. Used-car: comparison sheet + memo/checklist. |
| Source/risk boundary | Baby-food warning stays visible and tells users to check official/expert guidance. Used-car memo records evidence and expert checks without purchase advice. |
| Natural artifact | Baby-food reaction sheet and used-car comparison sheet are documented with realistic values. |
| Verification | Unit tests for artifact plans/fields/export, E2E for first-screen workbench, build, docs check, screenshots. |

## Acceptance Criteria

- `getArtifactPlan(baby-food-menu-recipe)` returns `meal_reaction_log` with meal calendar and reaction log surfaces first.
- `used-car-buying-check` exposes route-specific comparison rows and buy/hold memo fields.
- The baby-food workbench renders `meal-reaction-workbench` and `meal-reaction-log-card` before recipe detail.
- The used-car workbench renders candidate comparison rows and `구매 보류/진행 메모` before checklist density.
- Export tests use the route-specific used-car comparison row IDs.
