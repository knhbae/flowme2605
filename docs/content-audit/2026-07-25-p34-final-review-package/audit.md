# P34 Execution CRUD UX Audit

## Evidence Boundary

This audit uses current source, current commands, Playwright interaction,
screenshots, and heuristic persona simulation. It does not contain observed
user evidence. `observedUserCount` is `0`.

Baseline:

- P33 dependent SHA: `8c54992ce5628ab2a3884a530a83d2c8226223dc`
- P33 Draft PR: `#156`
- P34 worktree: `D:\flowme2605\flow-p34-execution-crud`
- P34 branch: `codex/p34-execution-crud`

## Decision

Alternative B, a bounded structural revision, was selected.

- Alternative A, copy-only cleanup, did not solve lifecycle discovery or
  Calendar keyboard cost.
- Alternative C, full planner/CRUD redesign, would duplicate stable data
  contracts and add migration risk.
- Alternative B reuses existing handlers and changes only command grammar,
  composition, progressive disclosure, and focus behavior.

## Closed Findings

### P34-01 Flow Lifecycle

- Active Flow management is reachable in at most two interactions from a
  focused Flow.
- Mobile and wide use the same command order.
- `보관` explains that recovery and permanent deletion live in the archived
  inventory.
- Archive has immediate `되돌리기`.
- Archived rows expose direct `복구`.
- Permanent deletion is archived-only, starts on `취소`, offers personal
  backup, and preserves the published source.
- Escape closes the dialog and returns focus to the visible `Flow 관리`
  trigger.

### P34-02 Shared Command Grammar

- Flow: `보관 / 복구 / 이 기기에서 영구 삭제`
- source Item: `이 Flow에서 제외 / 다시 포함`
- personal Item: `항목 삭제 / 항목 복구`
- execution: `완료 / 다시 열기`
- occurrence: `이번 회차 건너뛰기 / 이번 회차 보류 / 이번 회차 다시 진행`
- schedule: `날짜 정하기 / 날짜 없애기`

Visible labels and accessible names use the same object and scope.

### P34-03 Save-before Adjustment

`/f/moving-d30-basic` retains its 24-Item artifact while adjustment is open.
The adjustment receipt reports `24/24개 · 날짜 24개`, and schedule mode exposes
only the selected row. Source content and save identity are unchanged.

### P34-04 Draft And Item Editing

Five memo-derived Items initially expose only inclusion, title, and date
controls within a bounded control budget. Split, merge, and reorder appear only
after `구조 편집`. Existing quick Item editing continues to show title, date,
and memo first, with advanced fields in a secondary disclosure.

### P34-05 Calendar

The 42-date month grid has one Tab stop. Arrow keys move by day/week, Home and
End move within a week, and PageUp/PageDown move by month while keeping focus.
Existing undated placement, batch movement, undo, date removal, and stable
identity regressions pass.

### P34-06 Recurrence

Routine setup reads as a compact effective-rule summary before advanced fields.
Series editing remains `반복 일정 조정`; occurrence actions name the current
occurrence. Existing completion, reopen, skip, hold, Calendar, and ICS tests
confirm that series and occurrence identities remain separate.

### P34-07 Export

The entry point states scope and count before format:

- `전체 N개 가져가기`
- `선택한 N개 가져가기`
- `현재 항목 N개 가져가기`

Existing output tests confirm predicted count equals generated rows/events and
that failed/disabled exports do not create a success receipt.

## Replan During Verification

An initial attempt made every small My Flow library show the full status-filter
strip so an empty archive destination was always visible. This increased
ordinary 1-3 Flow complexity and regressed earlier compact-library contracts.
The change was reverted. The final design previews the recovery destination in
`Flow 관리` and exposes the archived inventory only after archived content
exists.

The full-suite memo segmentation failure was not data loss. It occurred only
when the test resized a selected 1024px workspace to 390px during the same
render. The test now verifies persistence through the stable
`/my?view=flows` route after exercising the receipt path.

## Remaining Risks

1. P34 is stacked on an unmerged P33 branch. Production does not yet represent
   this source.
2. Source-backed Item structural reorder remains intentionally unavailable.
   Personal value edits and source Item exclusion remain supported.
3. Small-screen command comprehension and destructive-action confidence need
   later real-user observation; automated evidence cannot answer them.
4. A user may still expect cloud trash or account recovery. P34 provides local
   backup only and does not imply server recovery.
5. Full routine lifecycle comprehension across multiple weeks remains a human
   research question even though recurrence identity tests pass.

## Recommendation

`publish_ready_for_dependent_preview` after the final full-suite pass,
`git diff --check`, scoped commit, branch push, Draft PR, and Vercel preview
verification. Do not merge to `main` or deploy production in this gate.
