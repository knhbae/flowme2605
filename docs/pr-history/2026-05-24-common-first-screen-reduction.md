# Common First-Screen Reduction PR History

**Date:** 2026-05-24
**Branch:** `codex/common-first-screen-reduction`
**PR:** Pending
**Status:** In progress
**Related spec:** [2026-05-24-common-first-screen-reduction](../specs/2026-05-24-common-first-screen-reduction/spec.md)
**Related audit:** [common first-screen reduction](../content-audit/2026-05-24-common-first-screen-reduction.md)

## Why

The agreed UX/UI direction is export-first and artifact-first. A separate page-level progress card in the setup column duplicated the workbench progress and made the first screen feel more like a dashboard than a conversion surface for a user's calendar, checklist, spreadsheet, or memo.

## What Changed

- Added E2E coverage that protects the common first-screen hierarchy.
- Removed the duplicate setup-column progress card from the shared Flow detail page.
- Kept progress inside the artifact workbench.
- Adjusted export card copy so exports follow workbench execution instead of competing with it.
- Recorded moving, study, and passport natural artifact simulations.

## Not Done

- No route-specific content reshaping.
- No artifact-specific export button relocation.
- No collapse behavior for "전체 흐름".
- No native FLOW account-backed record dashboard.

## Verification

- RED: `npm run test:e2e -- --grep "common first screen keeps progress"` failed before implementation because the duplicate setup progress copy was still visible.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "common first screen keeps progress"` passed: 1 test.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 167 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run docs:check` passed after screenshot links: 14 required files, 169 local links.
- GREEN: `npm run test:e2e` passed: 45 tests.
- Browser: captured moving desktop and study mobile screenshots; in-app Browser confirmed duplicate progress copy is absent.

## Risks

- Export controls are still grouped in the setup area; later artifact-specific placement should be tested route by route.
- Removing duplicate progress reduces clutter, but the first screen can still feel dense on routes with large setup copy or multiple export buttons.
