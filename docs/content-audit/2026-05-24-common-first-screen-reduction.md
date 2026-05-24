# Common First-Screen Reduction Audit

**Date:** 2026-05-24
**Branch:** `codex/common-first-screen-reduction`
**Related spec:** [common first-screen reduction](../specs/2026-05-24-common-first-screen-reduction/spec.md)

## Decision

The common Flow detail page should not show a standalone progress card before the user reaches the natural artifact. Progress belongs inside the artifact workbench because that is where the user checks, edits, and saves browser-local execution state.

## Natural Artifact Simulations

| Route | User-like input | Natural output the user expects | Current Flow/UX gap | Reinforcement in this PR |
| --- | --- | --- | --- | --- |
| `moving-d30-basic` | 이사일 `2026-07-15`, 업체 후보 메모, 견적 캡처 위치 | D-30 calendar, checklist text, candidate notes that can move to calendar/sheet/memo | Setup card showed a separate progress card before the calendar/checklist artifact, making FLOW feel like an app dashboard instead of an exportable execution plan. | Remove the setup progress card; keep `0/24 완료` inside the workbench and keep "전체 흐름" after the artifact. |
| `computer-skills-d30-study` | 시험일, source-derived chapter rows, mock score and wrong-answer log | D-30 study calendar plus editable progress sheet to export to xlsx/calendar | Study users need source-derived progress rows, not a blank tracker; duplicate progress UI competes with the exam date and study sheet. | Keep progress in the workbench only so the source-derived sheet stays the primary first artifact. |
| `passport-renewal-docs` | travel timing, photo readiness, receipt/pickup/storage notes | Submission memo plus checklist for office visit and pickup | A page-level progress card can pull attention away from the memo fields that decide whether the user is ready to submit. | Keep the common first screen lighter; route-specific memo remains the first portable artifact. |

## UX Notes

- Removing the duplicate progress card is a layout diet, not a feature removal.
- The workbench still displays progress and browser-local save state.
- Export controls remain in the setup area for now; a later PR should move export actions closer to artifact-specific destinations.
- "전체 흐름" remains available below the workbench because users still need route context, but it should not compete with the first execution surface.

## Content/UX Follow-Ups

1. Move calendar export near calendar artifacts and xlsx export near sheet artifacts.
2. Convert route-level warnings into in-artifact decision support where they affect execution.
3. Continue replacing blank study/routine trackers with source-derived rows when the source content provides a natural syllabus, schedule, or program structure.
4. Test whether mobile first screens need the setup card split further after export buttons move.
