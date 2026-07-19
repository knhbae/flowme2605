# P25-03B Audit

## Problem

Single-item adjustment was progressive after P25-03A, but users still needed a bounded way to move or clear dates for several tasks and export only a chosen subset. Putting permanent selection controls on every row would have competed with the completion checkbox and `열기` action.

## Implemented interaction

1. Open `내 Flow` and choose `전체 Flow`.
2. Choose `여러 할 일 조정`.
3. Ordinary completion controls are replaced by temporary selection checkboxes.
4. The toolbar reports the selected and total counts.
5. Choose a date or `언제든으로` and inspect the affected count before applying.
6. Apply, export the selection, or remove selected rows when a persistent recovery path exists.
7. Return to the ordinary list; date and removal changes expose one immediate undo action.

## Ownership and safety

- Published source item, date, and order are not mutated.
- Personal draft user-item dates remain in structural overlay schedules.
- Other personal date changes remain in the existing execution date-override store.
- Explicit personal date removal uses the additive `__flowme_unscheduled__` override marker so source dates remain recoverable.
- Personal draft removal writes structural tombstones.
- Source-backed personal-copy removal updates the included-step personal copy and preserves the previous snapshot for undo.
- Completion and occurrence state remain outside structural and date adjustment records.

## Scope rules

| Action | Personal draft | Source-backed personal copy | Direct source-backed Flow |
| --- | --- | --- | --- |
| Select | yes | yes | yes |
| Date set / clear | personal overlay | personal overlay | personal overlay |
| Selected export | yes | yes | yes |
| Remove from Flow | tombstone + restore | included-step change + restore | no |
| Recurring batch date change | blocked pending occurrence/series scope | blocked pending occurrence/series scope | blocked pending occurrence/series scope |

## Visual inspection

- Mobile 390px uses a sticky batch toolbar and keeps the task list above it readable.
- Wide 1024px gives selection mode the full content width; the ordinary detail pane, structural order list, general export entry, review actions, and source link do not compete while selection is active.
- No permanent selection checkbox is added outside selection mode.

## Remaining risk

- `언제든` remains a product term whose complete model and Calendar placement queue belong to P25-04.
- Recurrence batch edits still require the existing single-item occurrence/series scope path; a multi-series batch policy is intentionally not invented.
- The date-removal marker is browser-local and additive. Account-backed migration remains outside P25.
- Automated checks do not prove first-use discoverability or comprehension.

