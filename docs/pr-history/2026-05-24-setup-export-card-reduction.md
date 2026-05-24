# Setup Export Card Reduction PR History

**Date:** 2026-05-24
**Branch:** `codex/setup-export-card-reduction`
**PR:** [#38 Remove setup export card](https://github.com/knhbae/flowme2605/pull/38)
**Status:** In review
**Related spec:** [2026-05-24-setup-export-card-reduction](../specs/2026-05-24-setup-export-card-reduction/spec.md)
**Related audit:** [setup export card reduction](../content-audit/2026-05-24-setup-export-card-reduction.md)

## Why

PR #37 intentionally left the setup export card as a fallback while adding artifact-near export actions. Screenshot and E2E coverage now confirm the workbench export controls are discoverable, so the setup-level card can be removed to reduce first-screen density.

## What Changed

- Removed the normal desktop setup export card.
- Kept setup focused on anchor input.
- Kept workbench export controls for copy, xlsx, calendar, and editable draft actions.
- Updated E2E downloads to use workbench export controls.
- Kept mobile sticky export and bottom sheet behavior unchanged.

## Not Done

- Did not remove mobile export sheet.
- Did not move export actions into each artifact sub-card.
- Did not change export filenames or formats.
- Did not change source/risk copy.

## Verification

- RED: `npm run test:e2e -- --grep "public moving flow calculates"` failed before implementation because the normal Flow page still rendered `내보내기와 백업`.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "public moving flow calculates|computer skills final QA exports|risk-boundary QA exports|no-anchor checklist"` passed: 4 tests.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 181 local links.
- GREEN: `npm run docs:check` passed after screenshot links: 14 required files, 183 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- RED/GREEN selector cleanup: full E2E first failed because two draft-copy tests still targeted the removed setup button `내 버전 만들기`; `npm run test:e2e -- --grep "my flow workspace|public flow can be copied"` passed after moving those selectors to the workbench `내 버전` button.
- GREEN: `npm run test:e2e` passed: 46 tests.
- Browser: captured moving desktop and study mobile screenshots; in-app Browser confirmed setup export card is absent and workbench export remains available.

## Risks

- Users who previously noticed export in the setup card now rely on the workbench export row or mobile bottom sheet.
- The setup card is simpler but can feel wide on desktop; screenshot review should decide whether it needs a max-width treatment later.
