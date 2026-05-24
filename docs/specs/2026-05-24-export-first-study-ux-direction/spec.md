# Export-First Study UX Direction Spec

**Date:** 2026-05-24
**Status:** In Progress
**Owner:** Codex
**Related direction:** [Product Principles](../../PRODUCT_PRINCIPLES.md), [UX Content Simplification](../../content-audit/2026-05-23-representative-ux-content-simplification.md)

## Goal

Preserve the agreed FLOW UX/UI direction and ship one small improvement that makes study content feel source-derived instead of like an empty tracker.

## Stage Fit

This is Stage 0 work. It strengthens the export-first conversion loop without introducing login, native study dashboards, automatic ingestion, or full AI-generated curriculum planning.

## User Need

As a learner using a study Flow from outside material, I need FLOW to start from a source-derived study structure, so I only adjust dates/status and export the result instead of building a blank progress table myself.

## Scope

In:
- Document the UX/UI direction: export-first, first action plus natural artifact, and study source-curriculum conversion.
- Add study UX gap audit for `computer-skills-d30-study`.
- Add common first-screen UX audit across representative/public-MVP routes.
- Add a small source-derived row default improvement for computer-skills study logs.
- Verify with unit tests, E2E, screenshots, and PR history.

Out:
- No full URL ingestion.
- No AI curriculum generator.
- No drag-and-drop scheduler.
- No native study dashboard or account-backed study history.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Enter exam date, then review source-derived study rows rather than create a blank table. |
| Completion signal | User can export calendar plus study sheet with default curriculum rows and edited progress values. |
| Artifact destination | Calendar plus spreadsheet, with optional FLOW check state. |
| Source/risk boundary | Low-risk study workflow; no score guarantee. Source-derived rows are editable defaults, not official exam advice. |
| Natural artifact | D-30 calendar plus source-derived chapter progress sheet and mock score/wrong-answer sheet. |
| Verification | RED/GREEN field/export/E2E tests, browser screenshots, docs check, full test suite. |

## Acceptance Criteria

- `docs/PRODUCT_PRINCIPLES.md` records the export-first UX/UI and study source-curriculum direction.
- Study audit records that empty progress tables are a UX gap and source-derived rows are the next step.
- Common first-screen audit identifies the main page-density problems and follow-up reductions.
- `computer-skills-d30-study` workbench shows source-derived chapter progress defaults before user typing.
- Export includes default study progress rows unless the user edits them.
- Existing calendar, progress, score, and download E2E coverage remains green.
