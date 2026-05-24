# Artifact Subcard Export Placement Audit

**Date:** 2026-05-24
**Scope:** common Flow artifact workbench export placement

## Findings

1. **Medium / Cognitive load:** After setup export card reduction, export controls still appeared as a generic row above the natural artifacts. Users could act, but they still had to infer which artifact each export came from.
2. **Medium / Portability:** Calendar, checklist, and spreadsheet destinations were available, but destination fit was not visible at the card level.
3. **Low / Copy:** The row copy explained a mechanism that the UI should show structurally.

## Natural Artifact Simulation

### Moving Timeline

- User records `이사일=2026-07-15`.
- User checks `이사 방식 정하기`.
- Natural artifact: an execution list plus a month calendar.
- Export expectation: list card gives todo/checklist copy and spreadsheet backup; calendar card gives `.ics`.

Current Flow/UX gap before this batch:

- Export actions were technically inside the workbench, but still detached from list and calendar cards.

Content/UX reinforcement:

- Put checklist copy, Excel, and editable draft in the list card.
- Put calendar export in the calendar card.
- Remove the generic explanation row.

### Study Progress

- User records `시험일=2026-06-22`.
- User adjusts source-derived rows such as `스프레드시트 실기 함수·피벗`.
- Natural artifact: a source-derived progress table plus mock-score/error table.
- Export expectation: progress table gives Excel; calendar card gives `.ics`.

Current Flow/UX gap before this batch:

- Study rows were source-derived, but the Excel export still looked like a global workbench tool rather than the table's output.

Content/UX reinforcement:

- Keep the study table prefilled from source/curriculum shape.
- Put Excel export beside the first progress table.
- Keep calendar export beside the study calendar.

## Rubric Summary

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

## Recommended Next Fixes

1. Replace generic text-heavy workbench headings with destination-specific microcopy where the artifact already explains itself.
2. Audit mobile density after the export buttons move into cards.
3. Later, design true source import for study curricula so the source-derived rows can come from uploaded or pasted material.

