# Study Source-Curriculum UX Gap Audit

**Date:** 2026-05-24
**Branch:** `codex/export-first-study-ux-direction`
**Primary route:** `computer-skills-d30-study`

## Decision

Study content should not ask users to manually build a blank progress table. FLOW should convert source material into a starting curriculum, then let users adjust dates, status, exclusions, and weak areas.

## Natural Artifact Simulation

| Flow | Simulated user values | Natural artifact | Current Flow/UX gap before this batch | Content/UX reinforcement |
| --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | `examDate=2026-06-22`, `weekdayWindow=60m`, `weekendWindow=120m`, weak area `spreadsheet functions`, mock score `68점`, wrong answers `함수식·피벗테이블` | D-30 calendar plus spreadsheet with source-derived chapter rows, target dates, status, mock score, wrong-answer type, and retry date. | The route already has calendar, progress, and score tables, but the progress table still feels like a blank tracker if rows only say "1주차" and every cell starts empty. | Treat the source/curriculum structure as default row values. Users review and edit instead of authoring the table from scratch. |

## UX Principle

The study Flow should behave like a curriculum compiler:

1. Source material supplies the row structure.
2. The user supplies exam date and constraints.
3. FLOW proposes a portable calendar and sheet.
4. The user edits status, dates, weak areas, and exclusions.
5. Export moves the result into the user's calendar and spreadsheet.

## Current Boundary

This batch does not implement URL ingestion or AI curriculum extraction. It only makes the representative study route show editable source-derived defaults, so the interface points in the right direction without broad platform scope.

## Rubric Summary

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 3 before source-derived defaults, 4 after this batch
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

## Follow-Up

- Add a later conversion pass where pasted course outlines create study rows automatically.
- Add edit affordances for excluding or moving generated rows.
- Keep score/wrong-answer records separate from any claim about exam outcome.
