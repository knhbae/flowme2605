# Workbench Local State Design

> Date: 2026-05-22
> Branch: `codex/workbench-local-entries`

## Goal

Make the first-screen `ArtifactWorkbench` usable as a real working surface, not only a preview. Users should be able to check, record, reload, and export the most important artifact data without scrolling to the full item list first.

## Scope

This pass stays client-only and localStorage-based.

- Timeline/checklist/decision surfaces can toggle existing item completion from the Workbench.
- Routine surfaces can save occurrence-level completion and a short occurrence memo.
- Spreadsheet/log surfaces can save a seven-day table and a weekly review memo.
- Text and workbook exports include the saved Workbench records.

Out of scope:

- Cross-device sync.
- External Calendar, Todo, Notion, or Google Sheets APIs.
- Editing every calendar occurrence in a full month grid.
- Moving all completion math from item-based progress to occurrence-based progress.

## Data Model

Add a local-only `FlowWorkbenchState`.

```ts
type FlowWorkbenchState = {
  occurrences: Record<string, { done?: boolean; note?: string }>;
  logRows: Record<string, Record<string, string>>;
  weeklyReview?: string;
};
```

The key is stored per Flow slug under a new localStorage prefix. It is intentionally separate from `checks`, `itemStates`, and `comparisonState` so existing progress and export behavior remain stable.

## UX

Timeline and checklist Workbench rows get explicit checkboxes with labels like `실행판 완료: 이사 방식 정하기`. Toggling them calls the existing item completion handler, so the full list, progress, and export behavior stay aligned.

Routine Workbench shows a completion checkbox and memo field for the next occurrence. The calendar marks completed visible occurrences, and the saved memo remains after reload.

Spreadsheet Workbench turns placeholder cells into compact inputs. The first seven days have columns for `식단`, `운동`, `측정`, `컨디션`, and `리뷰`; a weekly review textarea sits beside the table.

## Export

When saved Workbench data exists:

- Text export appends a `## 실행판 기록` section.
- Workbook export adds an `실행판 기록` sheet.

This keeps the user expectation intact: if they typed it into FLOW, the copied/exported artifact includes it.

## Tests

Use TDD.

- E2E: Workbench timeline checkbox persists after reload and updates existing progress.
- E2E: Routine occurrence completion and memo persist after reload.
- E2E: Spreadsheet/log inputs and weekly review persist after reload.
- Unit/export: text and workbook exports include saved Workbench state.
