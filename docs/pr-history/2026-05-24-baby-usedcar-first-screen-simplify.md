# Baby Food and Used Car First-Screen Simplification PR History

**Date:** 2026-05-24
**Branch:** `codex/baby-usedcar-first-screen-simplify`
**PR:** TBD
**Status:** Draft
**Related spec:** [2026-05-24-baby-usedcar-first-screen-simplify](../specs/2026-05-24-baby-usedcar-first-screen-simplify/spec.md)
**Related audit:** [2026-05-24-baby-usedcar-first-screen-simplify.md](../content-audit/2026-05-24-baby-usedcar-first-screen-simplify.md)

## Why

The representative UX/content audit found that `baby-food-menu-recipe` and `used-car-buying-check` had useful content but too much first-screen competition. FLOW should initially help users move outside content into their existing calendar, sheet, checklist, or memo, not feel like a full native workspace.

## What Changed

- Added a `meal_reaction_log` artifact plan for meal-plan Flows.
- Added a baby-food workbench that shows allergy/expert warning, meal calendar, and reaction log before recipe detail.
- Added used-car route-specific comparison rows and buy/hold memo fields.
- Moved decision memo cards ahead of checklist density for decision-table workbenches with memo fields.
- Updated used-car export tests to use the new comparison row IDs.
- Added docs/spec/audit records and desktop/mobile screenshots.

## Not Done

- No representative or public exposure promotion.
- No native account-backed records.
- No car-history, calendar, or spreadsheet integration.
- No medical or purchase advice automation.

## Decisions

- Baby-food first screen should optimize for `먹인 뒤 기록`, not recipe browsing.
- Used-car first screen should optimize for `후보 비교 + 보류 이유`, not checklist completion volume.
- Export compatibility should keep route-specific comparison rows as the canonical export shape.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/artifact-plan.ts`
- `lib/flow/artifact-fields.ts`
- `lib/flow/export.ts`
- `lib/flow/*test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/specs/2026-05-24-baby-usedcar-first-screen-simplify/`
- `docs/content-audit/2026-05-24-baby-usedcar-first-screen-simplify.md`

## Verification

- RED: artifact-plan/artifact-fields tests failed before implementation.
- RED: first-screen E2E tests failed before the new build.
- GREEN: `npm test -- lib/flow/artifact-plan.test.ts lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed: 128 tests.
- GREEN: `npm test` passed: 128 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 133 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "baby food first screen|used-car first screen"` passed: 2 tests.
- GREEN: `npm run test:e2e` passed: 43 tests.
- Screenshots captured for desktop and mobile on both routes.

## Risks

- This improves first-screen clarity but still lacks real user behavior data.
- The used-car comparison row set is intentionally narrower than the full checklist; users may still need the checklist after comparison.
- Baby-food remains medical-sensitive and must keep warning/source separation.

## Follow-Ups

- Run full verification before PR.
- Update this file with PR URL, CI/deploy status, and merge result.
