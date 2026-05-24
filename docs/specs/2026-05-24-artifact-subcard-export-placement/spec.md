# Artifact Subcard Export Placement Spec

**Date:** 2026-05-24
**Branch:** `codex/artifact-subcard-export-placement`
**Status:** In progress

## Goal

Reduce the remaining generic workbench export row by placing export actions next to the natural artifact that produces the matching external file.

This follows the current FLOW UX/UI direction:

- Export-first: users should move the useful artifact into calendar, checklist, sheet, or memo before FLOW asks for native record keeping.
- First action plus natural artifact: the first screen should show the thing the user can immediately use, not a generic feature panel.
- Study content uses source-derived progress rows: the user should not start from an empty progress table when the source already has curriculum, range, or practice structure.

## User Simulation

### Moving Timeline Flow

User input:

- `이사일=2026-07-15`
- Checks `이사 방식 정하기`

Expected natural artifacts:

- Checklist copy: checked execution list that can be pasted into a todo app.
- Excel file: dated checklist rows for backup or spreadsheet tracking.
- Calendar file: dated moving tasks for the user's calendar.

UX decision:

- Checklist copy, Excel, and editable draft belong on the execution list card.
- Calendar export belongs on the month calendar card.
- The generic sentence `실행판에서 체크한 내용을 내 도구로 옮깁니다.` is removed from the shared workbench top.

### Computer Skills Study Flow

User input:

- `시험일=2026-06-22`
- Edits source-derived progress rows such as `스프레드시트 실기 함수·피벗`
- Adds mock score and wrong-answer rows.

Expected natural artifacts:

- Calendar file: D-30 study milestones.
- Excel file: source-derived chapter progress and mock-score/error rows.
- Checklist copy: first execution list for the user's todo app.

UX decision:

- Calendar export belongs beside the calendar card.
- Excel export belongs beside the first progress/log table card, because that table is the primary study artifact.
- The study progress table remains prefilled from source/curriculum shape, not a blank table users must design manually.

## Scope

- Remove the shared workbench export row.
- Add reusable export button/status helpers inside `ArtifactWorkbench`.
- Place export controls in list, calendar, spreadsheet/log, comparison, routine, meal-reaction, and fallback checklist surfaces.
- Keep export formats, filenames, disabled state, and mobile bottom sheet behavior unchanged.

## Non-goals

- No new export format.
- No native FLOW record expansion.
- No route promotion or source-fit status change.
- No new study auto-import parser.

