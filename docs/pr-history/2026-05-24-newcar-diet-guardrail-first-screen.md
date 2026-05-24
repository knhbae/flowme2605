# New Car and Diet Guardrail First-Screen PR History

**Date:** 2026-05-24
**Branch:** `codex/newcar-diet-guardrail-first-screen`
**PR:** [#33 Clarify new car and diet guardrail screens](https://github.com/knhbae/flowme2605/pull/33)
**Status:** Open
**Related spec:** [2026-05-24-newcar-diet-guardrail-first-screen](../specs/2026-05-24-newcar-diet-guardrail-first-screen/spec.md)
**Related audit:** [2026-05-24-newcar-diet-guardrail-first-screen.md](../content-audit/2026-05-24-newcar-diet-guardrail-first-screen.md)

## Why

After the baby-food and used-car simplification PR, the remaining public-MVP guardrail routes needed first-screen risk boundaries closer to the actual artifact. The goal is still export-first execution, not native records or expert advice.

## What Changed

- Added a warning card inside decision-table workbenches when a route has warning copy.
- Specialized `new-car-delivery-check` warning title to `인수 전 보류 기준`.
- Added a diet-specific `관찰 기록표` heading and `중단/상담 조건` column.
- Added E2E coverage for the public-MVP guardrail first screen.
- Captured desktop/mobile screenshots and documented natural artifact simulations.

## Not Done

- No representative promotion.
- No new integrations.
- No purchase, signing, health, or diet recommendation logic.

## Decisions

- Sensitive public-MVP routes can remain useful if the warning sits inside the artifact workbench, not only in page metadata.
- Diet should read as observation and stop-condition logging, not a coaching sheet.
- New-car should read as evidence and hold-boundary logging, not signing advice.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/specs/2026-05-24-newcar-diet-guardrail-first-screen/`
- `docs/content-audit/2026-05-24-newcar-diet-guardrail-first-screen.md`
- `docs/screenshots/2026-05-24-new-car-guardrail-first-screen-*.png`
- `docs/screenshots/2026-05-24-diet-guardrail-first-screen-*.png`

## Verification

- RED: `npm run test:e2e -- --grep "public MVP guardrail"` failed before implementation.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "public MVP guardrail|risk-boundary QA"` passed: 2 tests.
- GREEN: `npm test` passed: 128 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 147 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed: 44 tests.

## Risks

- The change improves first-screen clarity but still has no real user comprehension data.
- The warning card adds one more visual element; it is acceptable here because these are sensitive public-MVP routes.

## Follow-Ups

- Run full verification before PR.
- Update this file with PR URL, CI/deploy status, and merge result.
