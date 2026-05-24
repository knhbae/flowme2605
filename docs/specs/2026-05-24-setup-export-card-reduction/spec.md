# Setup Export Card Reduction Spec

**Date:** 2026-05-24
**Status:** In progress
**Owner:** Codex
**Related direction:** [Product Principles](../../PRODUCT_PRINCIPLES.md), [Artifact-Near Export Actions](../2026-05-24-artifact-near-export-actions/spec.md)

## Goal

Remove the duplicate setup-level export card after artifact-near export actions have landed, so the first screen has one setup job and one execution artifact.

## Stage Fit

This is Stage 0 layout reduction. It supports the export-first loop by keeping export actions near the artifact while reducing feature density before the user reaches the workbench.

## User Need

As a user opening a Flow, I need the setup area to ask only for the minimum anchor, then show the execution artifact and its export controls in the same place.

## Scope

In:
- Remove the non-mobile setup export card from public Flow detail pages.
- Keep artifact-near workbench export controls from PR #37.
- Keep the mobile bottom export sheet and sticky mobile bar unchanged.
- Keep exact-video export behavior unchanged.
- Update E2E tests to use workbench export controls for downloads.
- Record natural artifact simulation, UX gap, screenshots, and PR history.

Out:
- No export format changes.
- No Google/Sheets/Calendar integrations.
- No removal of mobile export sheet.
- No per-sub-card export placement yet.

## Natural Artifact Simulation

| Route | User-like action | Expected first-screen behavior |
| --- | --- | --- |
| `moving-d30-basic` | User enters move date, checks two moving tasks, exports xlsx. | Setup asks for move date only; workbench contains checklist/calendar plus export controls. |
| `computer-skills-d30-study` | User enters exam date, edits source-derived chapter rows, checks first task, exports xlsx/ics. | Setup asks for exam date only; workbench contains study artifact plus export controls. |
| `year-end-tax-docs` | User opens no-anchor checklist. | No date setup or calendar export is shown; workbench copy action remains visible. |

## Acceptance Criteria

- `내보내기와 백업` is no longer visible on the normal desktop Flow page before opening the mobile bottom sheet.
- The workbench `엑셀로 받기` and `캘린더 받기` controls remain usable for timeline and study routes.
- No-anchor checklist routes still hide calendar export in the workbench.
- Mobile bottom-sheet test remains green.
- Screenshots show the setup card is simpler and export controls stay discoverable in the workbench.
