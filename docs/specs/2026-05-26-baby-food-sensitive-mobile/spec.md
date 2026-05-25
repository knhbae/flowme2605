# Baby Food Sensitive Mobile Spec

**Date:** 2026-05-26
**Status:** Implemented
**Owner:** Codex
**Related roadmap:** v0.1.0 Stage 0 First Flag MVP in `docs/ROADMAP.md`

## Goal

Bring `baby-food-menu-recipe` closer to `design-ref/260525-2` phase/sensitive guidance by making mobile open with the caution boundary and today's food/reaction record, not a long recipe or meal-calendar table.

## Stage Fit

This is Stage 0 export-first UX cleanup. It improves first action, source/risk separation, and sheet portability without adding medical advice, accounts, direct integrations, or validation claims.

## User Need

As a caregiver checking the baby-food Flow on mobile, I need to see the caution boundary and record today's ingredient/reaction first, so that I can track a concrete observation without mistaking FLOW for medical authority.

## Scope

In:
- Move the sensitive caution and reaction-record card to the top of the baby-food workbench on mobile.
- Keep the reaction log exportable to sheet/copy/draft.
- Keep the meal calendar/recipe details available below the first record action.
- Preserve desktop and existing export behavior unless mobile-specific order requires responsive styling.

Out:
- New baby-food recommendations or invented medical content.
- Full phase system redesign.
- Direct doctor/hospital integration.
- Any claim that the route is validated.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Record today's food/reaction observation. |
| Completion signal | The mobile first viewport shows caution plus a reaction-record card with inputs and sheet export access. |
| Artifact destination | Reaction log goes to sheet; meal plan can still go to calendar/sheet. |
| Source/risk boundary | Warning remains separate from recipe/detail content and appears before the artifact. |
| Natural artifact | A caregiver records amount, skin reaction, vomiting/diarrhea, stool, sleep/condition, and preference note for the first current meal slot. |
| Verification | RED/GREEN Playwright, build, unit tests, docs check, full e2e, screenshots. |

## Acceptance Criteria

- Mobile `390x844` shows a sensitive warning and today's reaction card before the meal calendar.
- The reaction card has visible record fields and an export-to-sheet action in or near the card.
- Meal calendar and recipe detail remain available but are not the first dominant mobile artifact.
- No medical authority or validation claim appears.

## Implementation Notes

- Mobile `baby-food-menu-recipe` now uses the same responsive workbench-first ordering pattern as routine routes, limited to this sensitive route.
- The meal warning is first inside the workbench. On mobile it renders as a compact caution banner with an expandable full warning; desktop keeps the full warning visible.
- A mobile-only today reaction card appears before the meal calendar with amount/reaction fields and a sheet export CTA.
- The wide reaction-log table is hidden on mobile, while the calendar preview remains below the first record action.
