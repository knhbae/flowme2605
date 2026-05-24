# Mobile Artifact Density Spec

**Date:** 2026-05-24
**Status:** In Progress
**Owner:** Codex
**Related audit:** [Mobile Artifact Density Audit](../../content-audit/2026-05-24-mobile-artifact-density.md)

## Goal

Reduce mobile first-screen density by removing repeated artifact-card export buttons on small screens while keeping desktop artifact-near export controls.

## Stage Fit

This is Stage 0 UX simplification. It supports the export-first loop without adding new export formats, native records, integrations, or account-backed state.

## User Need

As a mobile user reviewing a dense Flow, I need one compact export entry after I start execution, so I can get the calendar/sheet/checklist artifact without seeing repeated buttons in every card.

## Scope

In:

- Hide workbench artifact-card export buttons below the `sm` breakpoint.
- Keep desktop artifact-card export buttons unchanged.
- Keep the mobile sticky export bar and bottom sheet as the mobile export path.
- Add RED/GREEN E2E coverage.
- Capture a mobile screenshot.

Out:

- No new export type.
- No redesign of the bottom sheet.
- No route content rewrite.
- No native FLOW record feature.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | User enters the route anchor and checks one execution item. |
| Completion signal | Mobile workbench cards no longer expose export buttons, but the sticky sheet still exposes enabled export actions. |
| Artifact destination | Same calendar/sheet/checklist/draft exports as before. |
| Source/risk boundary | No source or risk content changes. |
| Natural artifact | `computer-skills-d30-study` calendar plus source-derived study spreadsheet. |
| Verification | RED/GREEN E2E, build, docs check, screenshot, broader tests. |

## Acceptance Criteria

- Mobile `computer-skills-d30-study` artifact cards do not expose `엑셀로 받기` or `캘린더 받기`.
- Mobile sticky `산출물 받기` remains visible and opens the export sheet.
- Mobile export sheet still exposes enabled Excel and calendar buttons after one item is checked.
- Desktop artifact-card export button coverage remains green.
