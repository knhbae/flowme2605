# Artifact-Near Export Actions Audit

**Date:** 2026-05-24
**Branch:** `codex/artifact-near-export-actions`
**Related spec:** [artifact-near export actions](../specs/2026-05-24-artifact-near-export-actions/spec.md)

## Decision

Export actions should appear next to the workbench artifact, not only in the setup panel. This keeps FLOW's Stage 0 promise concrete: turn outside content into a portable calendar, checklist, spreadsheet, or memo.

## Natural Artifact Simulations

| Route | Simulated user action | Natural artifact | Export-near UX reinforcement |
| --- | --- | --- | --- |
| `moving-d30-basic` | User enters `2026-07-15`, checks `이사 방식 정하기`, and starts vendor notes. | D-30 calendar plus checklist and vendor memo that can move to calendar/xlsx/text. | Workbench now offers copy, xlsx, and calendar actions beside the checklist/calendar surface. |
| `computer-skills-d30-study` | User enters exam date, reviews source-derived chapter rows, checks first study item. | Study calendar plus progress/score sheet. | Spreadsheet and calendar export are visible while the user is looking at the study artifact. |
| `passport-renewal-docs` | User fills submission memo values and checks one preparation item. | Submission memo plus checklist for office visit/pickup. | Copy/xlsx actions stay near the memo/checklist workbench so portability is clear. |

## Current Flow/UX Gap

The setup card still has a compatibility export panel. That is acceptable for this PR because removing it at the same time would combine placement change and navigation removal. The next reduction should remove or shrink the setup export panel after route-level screenshots confirm artifact-near controls are discoverable enough.

## Content/UX Reinforcement

- Copy: `실행판에서 체크한 내용을 내 도구로 옮깁니다.` ties the export action to checked execution state.
- Button labels are shorter in the workbench: `체크리스트 복사`, `엑셀로 받기`, `캘린더 받기`, `내 버전`.
- Disabled behavior remains unchanged: copy/xlsx/calendar unlock after at least one checked item.
- No source/risk claims changed.

## Follow-Up

1. Remove or collapse the setup export card after artifact-near controls pass screenshots across representative routes.
2. Split export placement further by artifact type: calendar export inside calendar cards, xlsx export inside sheet/log cards, memo copy inside memo cards.
3. Keep mobile bottom-sheet behavior until a dedicated mobile export pass checks thumb reach and text wrapping.
