# Moving Vendor Proof Workbench Design

> Date: 2026-05-23  
> Branch: `codex/moving-vendor-proof-workbench`  
> Source: `docs/content-audit/2026-05-22-real-source-flow-action-matrix.md`

## Goal

`moving-d30-basic` should prove that a timeline Flow can also carry the decision and proof artifacts users naturally create while preparing a move. The first-screen Workbench should support the core path: check dated tasks, compare moving-company candidates, record contract/payment proof, reload, and export those records.

## User Scenario

A user reads an external moving checklist, lands on the Flow page, enters `이사일=2026-07-15`, and then starts arranging a mover. Outside FLOW they would normally create:

- a calendar/list of D-30, D-10, D-Day tasks
- a mover quote comparison table
- a memo with quote screenshot, deposit proof, balance date, and damage-compensation conditions

FLOW should expose those artifacts together instead of forcing the user to keep 업체 비교 and 증빙 in a separate memo app.

## UX Design

Keep timeline as the primary surface:

1. `전체 할 일`
2. `월간 캘린더`

For moving timeline Flows, add two supporting artifact cards below the list/calendar grid:

1. `이사 업체 후보 비교`
   - editable candidate names
   - rows for quote amount, included service, elevator/ladder condition, available date, damage/loss rule
2. `계약·결제 증빙 메모`
   - quote/contract file location
   - deposit proof
   - balance date and transfer limit
   - damage/loss compensation rule
   - final call memo

## Data Model

Candidate comparison continues to use `FlowComparisonState`.

Proof memo uses `FlowWorkbenchState.memoCards`:

```ts
type FlowWorkbenchState = {
  occurrences: Record<string, FlowWorkbenchOccurrenceState>;
  logRows: Record<string, FlowWorkbenchLogRow>;
  memoCards: Record<string, string>;
  weeklyReview?: string;
};
```

No migration is needed because `normalizeWorkbenchState` will default missing `memoCards` to `{}`.

## Export Behavior

- Text export includes the moving candidate comparison in `[후보 비교표]`.
- Text export includes proof fields under `## 실행판 기록`.
- XLSX export includes:
  - `후보 비교` sheet
  - `실행판 기록` sheet with `메모` rows

## Acceptance Criteria

- `moving-d30-basic` Workbench shows `이사 업체 후보 비교`.
- Candidate names and quote notes persist after reload.
- `계약·결제 증빙 메모` fields persist after reload.
- Text and workbook export include comparison and proof memo values.
- Existing used-car decision comparison remains unchanged.
