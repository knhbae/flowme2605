# FITVELY Diet Video Observation Sheet

Date: 2026-05-25

## Summary

PR #103 changed FITVELY nutrition exact-video routes from memo-first to sheet-first observation flows. The routes now expose `기준 후보`, `관찰표`, original video handoff, one source rule, one observation row, and stop/consult copy without diet outcome claims.

## Scope

- Updated generated FITVELY diet exact-video metadata to `sheet`.
- Expanded seed tests to cover six nutrition exact-video routes.
- Fixed exact-video embedded-tool preview copy so diet sheet routes no longer read like workout-plan routes.
- Updated the UX cleanup backlog and dated audit/spec/QA docs.
- Captured desktop/mobile screenshots for `real-fitvely-video-body-fat-6kg-method`.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts` failed before implementation because FITVELY diet exact-video routes still inferred `memo` and lacked `기준 후보` / `관찰표` copy.
- RED: `npm test -- lib/flow/ux-cleanup-backlog.test.ts` failed before backlog update because sheet-first progress was not recorded.
- GREEN: `npm run build` passed.
- GREEN: `npm test` passed with 170 tests.
- GREEN: `npm run docs:check` passed with 14 required files and 260 local links.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "diet exact video flow|artifact workbench shows the primary usable surface first|artifact workbench saves local execution entries"` passed with 3 tests.
- GREEN: `npm run test:e2e` passed with 53 tests.
- Vercel check passed on PR #103 before merge.

## Merge

- PR: #103
- Squash merge commit: `94bdeaef0e03db7079003e21e421513e56283692`
- Post-merge main sync completed locally.
