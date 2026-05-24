# Artifact-Near Export Actions PR History

**Date:** 2026-05-24
**Branch:** `codex/artifact-near-export-actions`
**PR:** [#37 Add artifact-near export actions](https://github.com/knhbae/flowme2605/pull/37)
**Status:** Merged
**Merge commit:** `134cfee25833fd7f599445e91f81ce71f81c8b5a`
**Related spec:** [2026-05-24-artifact-near-export-actions](../specs/2026-05-24-artifact-near-export-actions/spec.md)
**Related audit:** [artifact-near export actions](../content-audit/2026-05-24-artifact-near-export-actions.md)

## Why

The product direction says export controls should be tied to the artifact they produce. After the duplicate page-level progress card was removed, the next smallest step was to make export available inside the artifact workbench without changing export formats or removing the existing setup fallback.

## What Changed

- Added a committed spec and implementation plan for artifact-near export actions.
- Added E2E coverage that requires export controls inside `Flow artifact workbench`.
- Passed existing export handlers and status into `ArtifactWorkbench`.
- Rendered a compact artifact-near export action row with copy, xlsx, calendar, and editable draft actions.
- Recorded moving, study, and passport natural artifact simulations.

## Not Done

- Did not remove the setup export card yet.
- Did not move each export button into a specific calendar/sheet/memo sub-card.
- Did not change text, xlsx, or ics export formats.
- Did not add account-backed records or integrations.

## Verification

- RED: `npm run test:e2e -- --grep "artifact workbench exposes export actions"` failed before implementation because the workbench did not contain `체크리스트 복사`.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "artifact workbench exposes export actions"` passed: 1 test.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 174 local links.
- GREEN: `npm run docs:check` passed after screenshot links: 14 required files, 176 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed: 46 tests.
- Browser: captured moving desktop and study mobile screenshots; in-app Browser confirmed artifact-near copy/xlsx/calendar actions in the workbench.
- GREEN post-merge: `npm test` passed: 129 tests.
- GREEN post-merge: `npm run docs:check` passed: 14 required files, 176 local links.

## Risks

- Export controls now appear in both the setup panel and workbench. This is intentional for one PR, but the duplicate setup panel should be removed or collapsed after visual verification.
- Workbench header density increased; screenshots must verify mobile text wrapping.
