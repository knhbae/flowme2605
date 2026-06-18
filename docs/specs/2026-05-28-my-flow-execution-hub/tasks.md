# My Flow Execution Hub Tasks

Detailed product queue: [execution-type-roadmap.md](./execution-type-roadmap.md)

## P0/P1 Work Queue

### P0: My Flow 실행 허브 사용성

- [x] Quiet mobile calendar routine visuals: routine icons should read as light indicators, with strong blue emphasis only for the selected date or active routine.
- [x] Define the routine execution model in product terms: category labels the Flow, repeat rule schedules occurrences, and the internal checklist attaches to the routine instance.
- [x] Define the period-goal checklist model using certification study as the reference case.
- [x] Build a feature/UX gap map across planning, UX/UI, data, execution, and export so “done / partial / missing / deferred” is visible outside chat.
- [x] Audit the Flow tab as an execution status board, not a long management/catalog surface.

### P1: Flow Type Coverage

- [ ] Review whether current UX is sufficient by Flow type: schedule, routine, checklist, memo/record, decision/hold, and bucket/long-term goal.
- [ ] Decide whether bucket/long-term goal needs its own user-facing type or can be represented as checklist plus milestones.
- [ ] Confirm which item-type fields stay primary versus hidden in memo/more-details for each Flow type.

### P1: Creation And Creator Surfaces

- [ ] Define Flow creation MVP: source input, structure selection, item editing, preview, and save/publish boundary.
- [ ] Review creator profile/channel screen for real source content, draft Flow ownership, and public/private separation.
- [ ] Decide the relationship between Flow output, category, connected artifacts, and My Flow execution records.

### Deferred Until P0/P1 Evidence

- [ ] Add first-class caution/risk UI only after representative sensitive Flows show that memo/more-details is not enough.
- [ ] Add heavier proof/status evidence fields only after users need them beyond memo, attachment, and link metadata.

- [x] Record the My Flow adaptive execution hub decision as a durable spec.
- [x] Add or preserve E2E for `전체 Flow + Flow별` showing every saved Flow.
- [x] Convert all-Flow `Flow별` cards into compact operating cards/rows.
- [x] Keep selected single-Flow detail management separate from all-Flow overview.
- [x] Represent routine items in the My Flow calendar as dots while keeping details in the selected-day panel.
- [x] Define the My Flow item type matrix for the new UX12 execution model.
- [x] Derive item execution types for UX12 rows without changing canonical seed data.
- [x] Add type badges/counts to the Flow view.
- [x] Keep `log_entry` out of Flow overview chips while preserving detail-level recording.
- [ ] Split the item detail sheet by item type.
  - [x] Add first decision/evidence type-summary slice and shared checklist-row detail entry.
  - [x] Add minimal decision-state and next-review fields for `decision_hold`.
  - [x] Reduce `decision_hold` detail summary to type chips only; keep options in the decision status field.
  - [x] Add a lightweight `log_entry` field that stays within calendar/reminder-level input complexity.
  - [x] Keep `log_entry` guidance in the placeholder only; do not add a separate helper paragraph.
  - [x] Reduce `log_entry` detail summary to the `기록` chip only; do not explain an already-visible record field.
  - [x] Keep `memo_evidence` proof/status fields deferred; use memo, attachment metadata, and links first.
  - [x] Label `memo_evidence` as user-facing `메모` instead of `증빙`.
  - [x] Keep `memo_evidence` detail summary copy at memo/file/link level instead of proof-like examples.
  - [x] Reduce `memo_evidence` detail summary to the `메모` chip only; do not explain an already-visible memo field.
  - [x] Render chip-only type summaries as compact rows instead of padded cards.
  - [x] Render closed `더보기` metadata as a lightweight row instead of a padded card.
  - [x] Remove the redundant visible `상세` eyebrow from item detail; keep accessible drawer labeling.
- [x] Keep `reference_caution` as a deferred detail pattern: do not add a top-level caution tab, checklist row, or primary detail field until user testing proves it is needed.
- [x] Add empty-state and one-Flow scenario coverage.
- [x] Add `?demo=ux12` 12-Flow fixture for grouped design review without writing saved Flow records.
- [x] Restore FullCalendar-based My Flow calendar behavior for UX12 review, including event rendering and date movement.
- [x] Make the mobile calendar card full-width while preserving tablet/desktop framed layout.
- [x] Compress the mobile calendar title/month toolbar so the month grid appears near the top of the viewport.
- [x] Compress the mobile selected-day panel and add schedule color rails so same-day rows scan more like a calendar app.
- [x] Mark the clicked calendar schedule event as active, not only its date cell.
- [x] Mark the clicked routine calendar icon as active while its detail is open.
- [x] Remove default blue event-box outlines from routine rails and schedule overflow markers; keep emphasis on selected date/active item.
- [x] Label D-day timeline chips as Flow-basis context, not recurrence or ordinary event timing.
- [x] Remove the read-only `Flow 기준` primary input from scheduled item detail; keep D-day context in the compact detail chip.
- [x] Add explicit cancel for staged routine repeat-rule edits.
- [x] Clarify routine completion as internal item-level with `이번 항목 완료` copy and `루틴 체크 n/전체` progress.
- [x] Make routine progress visible beside the completion action and tighten compact selected-day row/calendar event padding.
- [x] Move routine completion undo into a separate lightweight notice so the detail header stays within calendar/reminder-level action complexity.
- [x] Rename routine progress from `체크 n/전체` to `항목 n/전체` so the displayed unit matches `이번 항목 완료`.
- [x] Remove the duplicate routine detail metadata completion sentence; keep progress in the action-side `항목 n/전체` pill only.
- [x] Remove the duplicate routine row metadata completion sentence from non-compact Today rows; keep progress in the action-side `항목 n/전체` pill only.
- [x] Add routine occurrence date movement as a single-occurrence operation from calendar detail.
- [x] Add direct routine icon drag-to-move for visible routine icons without breaking horizontal `+N` density.
- [x] Add selected-day row drag-to-move for hidden routine items opened from `+N` overflow.
- [x] Decide the final 6+ saved Flow production behavior after UX12 screenshots are reviewed.
- [x] Add 20+ saved Flow fixture and decide when grouping/collapse appears.
- [x] Verify mobile and desktop screenshots for the current 2-Flow demo scenario.
- [x] Update PR history if implementation lands.
