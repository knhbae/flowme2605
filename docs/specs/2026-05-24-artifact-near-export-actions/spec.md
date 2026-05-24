# Artifact-Near Export Actions Spec

**Date:** 2026-05-24
**Status:** In review
**Owner:** Codex
**Related direction:** [Product Principles](../../PRODUCT_PRINCIPLES.md), [Common First-Screen Reduction](../2026-05-24-common-first-screen-reduction/spec.md)

## Goal

Move export actions closer to the artifact they produce, so the first screen reads as "work on this calendar/sheet/memo, then take it to your own tool" instead of "configure a page, then find a generic export box."

## Stage Fit

This is Stage 0 export-first work. It improves copy/export/check behavior without adding accounts, integrations, native records, payments, community, or AI ingestion.

## User Need

As a user reviewing a Flow, I need the export action to sit next to the artifact I am about to use, so I understand what will become my calendar, sheet, checklist, or memo before I leave FLOW.

## Scope

In:
- Add artifact-near export controls to `ArtifactWorkbench`.
- Keep existing export functions and file formats unchanged.
- Preserve current disabled behavior until the user checks at least one item.
- Keep mobile bottom-sheet behavior unchanged in this PR.
- Keep the top setup export card for now as a compatibility fallback; do not remove it until artifact-near controls are verified across routes.
- Add E2E coverage for timeline and study spreadsheet routes.
- Record natural artifact simulation and UX gap notes.

Out:
- No Google Calendar/Sheets API integration.
- No route-specific export file format changes.
- No removal of the setup export card in this PR.
- No native FLOW records or account-backed persistence.

## Design

The parent public Flow page already owns export handlers and state:
- `copy`
- `downloadExcel`
- `downloadCalendar`
- `copyToEditableDraft`
- `copyState`
- `downloadState`
- `calendarState`
- `done`
- `canExportCalendar`

`ArtifactWorkbench` will receive a small `exportActions` prop with these values. The workbench will render a compact action row near the workbench heading:
- Primary: `체크리스트 복사`
- Secondary: `엑셀로 받기`
- Secondary calendar: `캘린더 받기` only when calendar export is available
- Tertiary: `내 버전`

The row copy should say `실행판에서 체크한 내용을 내 도구로 옮깁니다.` and stay visually quieter than the artifact title. Disabled buttons keep the existing rule: at least one checked item is required for copy/xlsx/calendar.

## Natural Artifact Simulation

| Route | User-like input | Artifact-near export expectation | UX gap this addresses |
| --- | --- | --- | --- |
| `moving-d30-basic` | 이사일 `2026-07-15`, first task checked, vendor notes started | User sees D-30 checklist/calendar, then exports calendar or xlsx from the same workbench area. | Export no longer feels disconnected from the calendar/checklist artifact. |
| `computer-skills-d30-study` | 시험일, source-derived chapter rows, first study task checked | User sees source-derived study rows and exports xlsx/calendar near the study artifact. | Study export is framed as taking the generated progress sheet out, not as using a generic page toolbar. |
| `passport-renewal-docs` | Travel timing and submission memo fields filled, one checklist item checked | User can copy/export from the memo/checklist workbench area. | Memo remains the first portable artifact, while export is nearby enough to reinforce portability. |

## Acceptance Criteria

- `ArtifactWorkbench` exposes visible export controls in the workbench region.
- The artifact-near copy/xlsx/calendar buttons reuse existing handlers and disabled logic.
- Timeline and study routes show artifact-near export controls after first render.
- Existing top setup export card remains available for now.
- Existing full E2E coverage stays green.
- Browser screenshots show moving desktop and study mobile layouts without overlapping text.
