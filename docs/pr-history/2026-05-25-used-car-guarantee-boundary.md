# Used-Car Guarantee Boundary

Date: 2026-05-25
Branch: `codex/used-car-guarantee-boundary`
Status: Merged
PR URL: https://github.com/knhbae/flowme2605/pull/99
Deploy URL: TBD

## Reason

The `my_tests/` evaluation synthesis found a Blocking risk that `used-car-buying-check` could be copied out of FLOW and mistaken for vehicle quality or safety certification.

## Changes

- Added an explicit `차량 상태를 보증하지 않습니다` boundary to the used-car route warning.
- Added route warnings near the top of text exports so sensitive-route cautions travel to external notes.
- Added tests for route warning copy and text export placement.
- Added `docs/content-audit/2026-05-25-my-tests-ux-content-synthesis.md`.

## Decisions

- The three external evaluations were not treated as validation. They are review inputs only.
- Conflicts were resolved toward source fidelity, export-first usefulness, and preventing user misunderstanding.
- The first PR-sized fix addresses the copied/exported risk boundary instead of larger source replacement work.

## Files Touched

- `lib/flow/seed-flows.ts`
- `lib/flow/export.ts`
- `lib/flow/seed-flows.test.ts`
- `lib/flow/export.test.ts`
- `docs/content-audit/2026-05-25-my-tests-ux-content-synthesis.md`
- `docs/specs/2026-05-25-used-car-guarantee-boundary/`
- `docs/STATUS.md`

## Not Done

- Did not replace passport source URLs.
- Did not prefill MOFA emergency contact values.
- Did not add external integrations or native long-term records.
- Did not call any route validated.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` failed for missing used-car no-guarantee warning and missing text export warning.
- GREEN: `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` passed with 165 tests.
- `npm run docs:check` passed: 14 required files and 256 local links.
- `npm test` passed: 165 tests.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "used-car"` passed: 2 tests.
- PR #99 Vercel status passed before merge.
- Post-merge `npm run docs:check` passed on `main`.

## Risks

- Text exports for all warned flows now include a warning line near the top. This is intentional for portability, but user-facing copy should stay concise.
- Passport and MOFA source issues remain open because they require fresh official source verification.

## Follow-Ups

- Verify passport official URL and fallback source.
- Recheck MOFA top copy/export copy for official-source-only framing.
- Continue mobile first-screen density cleanup only after source/risk blockers are handled.
