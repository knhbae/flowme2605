# Design-ref queue completion

Date: 2026-05-26

This batch completes the remaining design-ref gap queue items after desktop rail generalization.

## Change

- `computer-skills-d30-study` now has a mobile-only study summary before the source-derived progress table.
- `baby-food-menu-recipe` now has a mobile reaction summary that surfaces today's meal slot, new ingredient, reaction fields, and allergy-watch cue before meal calendar density.
- Content Lab now includes an observed-session prep package for `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- The design-ref queue is now fully landed in code/data: 8 total, 8 landed, 0 pending, 0 validated.

## Observed-session package

Each route now has:

- moderator prompt
- expected artifacts
- screenshot targets
- pass signals
- failure signals
- handoff note

This is preparation for user sessions, not validation.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile study log starts with a source-derived progress summary"` failed before `mobile-study-log-summary-card` existed.
- GREEN: the same targeted Playwright test passed after implementation.
- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "baby food mobile reaction card summarizes meal"` failed before `meal-reaction-summary-card` existed.
- GREEN: the same targeted Playwright test passed after implementation.
- RED: `npm test -- lib/flow/content-lab.test.ts` failed before observed-session prep summary existed and while the queue still had pending items.
- GREEN: `npm test -- lib/flow/content-lab.test.ts` passed after adding observed prep and moving the queue to landed.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted"` passed after adding the Flow Lab observed-session prep panel.
