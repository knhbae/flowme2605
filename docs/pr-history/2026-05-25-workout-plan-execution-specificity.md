# Workout-Plan Exact Video Execution Specificity

Date: 2026-05-25
Branch: `content/workout-plan-execution-specificity`
PR: #55

## Why

After workout and diet exact-video passes, FITVELY workout-plan videos still needed their own conversion shape. These videos are not follow-along sessions or one-meal diet memos; they are source-derived rules that should be moved into a weekly workout table.

## Changed

- Added seed-flow coverage for FITVELY workout-plan exact-video detail requirements.
- Updated workout-plan generated details to include summary, preparation, selected rule, weekly workout table guidance, original video instruction, record fields, and revise-or-hold condition.
- Added a workout-plan execution-specificity audit.
- Updated execution-specificity rules with workout-plan standards and examples.
- Added a durable spec under `docs/specs/2026-05-25-workout-plan-execution-specificity/`.

## Not Done

- Did not redesign workout-plan exports into rich weekly sheets.
- Did not generate multi-week training plans.
- Did not extract movement sequences or prescribe exercise.
- Did not mark any route validated.

## Verification

Targeted TDD evidence:

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed on missing weekly-plan summary.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts` passed.

Full verification:

- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run test:e2e` passed.
- `git diff --check` passed.

## Risks

- The details are more executable, but the workbench/export artifact is still lightweight for workout-plan routes.
- These routes remain below validation until observed users can choose one rule and use it outside FLOW.

## Follow-Ups

- Add richer workout-plan sheet/log artifacts only if these routes become public MVP candidates.
- Review broad source routes and keep them preview-only unless replaced with exact sources.
