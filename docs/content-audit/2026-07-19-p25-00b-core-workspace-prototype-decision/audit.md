# P25-00B Prototype Audit

## Verdict

`option_b_recommended_owner_decision_pending`

This slice does not claim that the proposed interface is user-validated. It proves that one coherent screen contract can express the owner, Codex, and Claude Design findings without adding a new global tab or replacing source/personal/run ownership.

## Current Production Inspection

The current production was captured on 2026-07-19 in one browser session at 390x844 and 1024x768.

### Save-before

`/f/vehicle-inspection-prep` shows category, title, collapsible Flow explanation, date input, a three-row saved-structure summary, chips, and fixed save/adjust actions. The user sees several different summaries before seeing the full artifact.

### Post-save

After saving, `/my` opens the Today frame. It confirms that saving worked, but the first task and next tasks stand in for the complete saved result. The user must change local view before verifying the full Flow.

### Whole Flow

Mobile `전체` presents saved-content summary, one Flow card, one visible task, and an additional inventory path. Wide uses more horizontal space but still reads as stacked dashboard cards rather than a plan workspace.

### Adjustment

The current mobile item detail can place edit cancel, date, time, advanced schedule, memo, memo enlargement, save guidance, and structural actions in one long surface. Common changes and infrequent scheduling fields have similar visual weight.

### Calendar

The selected-day agenda works as a dated execution surface. In wide view, the calendar and agenda use space reasonably, but undated work has no equally clear scheduling role. In mobile view, grid, agenda, and fixed navigation compete vertically.

## A/B Alternatives

### Option A: minimum correction

Option A is a lower-risk bridge:

- reduce repeated explanations;
- keep existing pages and cards;
- show top tasks plus an explicit whole-list entry;
- keep existing editor structure but reduce obvious labels;
- show undated tasks below Calendar;
- add export scope copy.

It is cheaper, but it preserves the underlying ambiguity: the same saved Flow is still represented differently in save, post-save, My Flow, Calendar, and export.

### Option B: whole-Flow workspace

Option B treats the saved Flow as one durable personal artifact:

- save-before and post-save use the same outline language;
- Today is an execution projection, not the saved object;
- mobile drills from Flow to item detail;
- wide uses Flow rail, outline, and detail panes;
- undated work is executable in My Flow and schedulable in a Calendar queue;
- adjustment is progressive;
- batch actions operate on selected effective items;
- completion and export use explicit scope.

The recommendation is B. It requires larger component work, but P25 was opened because incremental fixes did not produce a coherent product.

## Six Flow Simulations

| Flow type | Whole Flow test | Adjustment test | Execution/projection test | Result in B |
| --- | --- | --- | --- | --- |
| Moving | D-30 groups and complete structure | anchor vs selected item move | dated Calendar and whole export | coherent if projection parity is fixed first |
| Vehicle | ten-item undated checklist | schedule only selected items | My Flow Anytime plus Calendar placement | clear role separation |
| Routine | four monthly occurrences | occurrence vs series scope | completion/reopen and ICS count | frame works; P25-01A truth is blocking |
| Trip/project | grouped reservation, packing, itinerary | mixed date and batch change | grouped whole Flow and selected export | wide workspace is materially better |
| Record | actions and personal records | memo-first edit | list export without fake Calendar dates | progressive fields prevent over-editing |
| Personal draft | all user-written items | add/order/date/time/recurrence | same effective items across destinations | contract fits existing overlay model |

## Dated And Undated Contract

| State | My Flow | Calendar | List exports | ICS |
| --- | --- | --- | --- | --- |
| Anytime | visible and completable | placement queue only | included | excluded |
| Dated | visible and completable | grid and selected-day agenda | included | included |
| Completed | persistent completed history and reopen | remains at date with completed state | included with state | existing policy |
| Held | excluded from ordinary execution | excluded | recovery/review policy only | excluded |

`날짜 없음` is a data condition. The proposed user model is `언제든 할 일` in My Flow and `일정에 놓기` in Calendar. The labels remain subject to owner decision, but the jobs must remain distinct.

## Copy Reduction

Copy remains only when it explains a consequence not visible in the UI:

1. what an anchor date recalculates;
2. what a destructive or batch action changes;
3. why an item cannot be exported to a destination;
4. source or safety limits.

The prototype removes paragraphs that narrate already-visible date fields, item lists, save actions, or destination buttons.

## Responsive Contract

### Mobile 390

- one primary object per screen;
- one local task list, not nested dashboard cards;
- sticky actions reserve bottom-nav clearance;
- detail and placement use drill-in or drawers;
- batch mode replaces row commands instead of adding more permanent buttons.

### Wide 1024

- My Flow and whole Flow use rail/outline/detail panes;
- Calendar uses placement queue/grid/agenda columns;
- no stretched mobile cards or full-width explanation bands;
- selected context remains visible while editing.

## Implementation Dependencies

### Can start after this prototype

- P25-01A projection and recurrence parity;
- P25-01B memo parsing and count integrity.

These are correctness contracts and do not depend on final visual labels.

### Requires owner frame decision

- P25-02 whole Flow workspace;
- P25-03 progressive and batch adjustment;
- P25-04 Anytime and Calendar placement;
- P25-05 completion/reopen and export scope UI.

## Evidence Boundary

- `current_browser`: production captures in this package.
- `prototype_browser`: static A/B screen simulations.
- `heuristic`: owner/Codex/Claude review reconciliation.
- `observed_user`: none.

No app runtime, storage schema, export builder, or source content was changed in this slice.
