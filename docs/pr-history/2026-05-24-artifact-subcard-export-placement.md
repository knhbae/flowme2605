# Artifact Subcard Export Placement PR History

**Date:** 2026-05-24
**Branch:** `codex/artifact-subcard-export-placement`
**PR:** [#39 Move artifact export actions into subcards](https://github.com/knhbae/flowme2605/pull/39)
**Status:** Open
**Related spec:** [2026-05-24-artifact-subcard-export-placement](../specs/2026-05-24-artifact-subcard-export-placement/spec.md)
**Related audit:** [artifact subcard export placement](../content-audit/2026-05-24-artifact-subcard-export-placement.md)

## Why

PR #37 moved export actions into the workbench and PR #38 removed the setup-level export card. This batch continues the agreed FLOW UX direction by placing export actions beside the natural artifact they produce.

## What Changed

- Removed the shared workbench export row and its generic explanatory sentence.
- Added reusable export button/status helpers for artifact cards.
- Put list exports beside execution list/checklist cards.
- Put calendar export beside calendar cards.
- Put Excel export beside progress/log/spreadsheet cards.
- Kept study progress rows source-derived instead of blank user-authored tables.

## Not Done

- Did not add new export formats.
- Did not add source import or OCR for study materials.
- Did not change mobile bottom sheet behavior.
- Did not promote any route exposure status.

## Verification

- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "artifact workbench exposes export actions next to the natural artifact"` failed because `artifact-list-card` export buttons did not exist.
- GREEN: `npm run build` passed.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "artifact workbench exposes export actions next to the natural artifact"` passed.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 185 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed: 46 tests.
- Browser: moving desktop DOM check confirmed the generic export row is absent and list/calendar card export controls exist.
- Screenshots:
  - [moving desktop](../screenshots/2026-05-24-artifact-subcard-export-placement-moving-desktop.png)
  - [study mobile](../screenshots/2026-05-24-artifact-subcard-export-placement-study-mobile.png)

## Risks

- Card headers now carry more controls, so mobile screenshots should confirm they wrap without crowding the artifact title.
- Existing E2E selectors can become ambiguous if duplicate export buttons appear in one workbench; this batch keeps one primary export target per destination where practical.
