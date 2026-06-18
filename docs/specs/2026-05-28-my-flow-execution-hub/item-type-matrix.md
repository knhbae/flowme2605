# My Flow Item Type Matrix

**Date:** 2026-05-29
**Scope:** New My Flow UX/UI, especially `/my?demo=ux12`
**Status:** Draft decision for implementation batches

## Why This Exists

`Flow` category and `item` execution type must stay separate.

- Category answers: what life area is this about? Examples: moving, workout, travel, admin, car.
- Item type answers: what does the user do with this row? Examples: put it on a calendar, check it, record something, hold a decision.

The new My Flow UX should not treat every item as a generic checklist row. A single Flow can contain multiple execution item types.

## Proposed Item Types

| Type ID | User-facing label | User action | Natural outside artifact | Primary state |
| --- | --- | --- | --- | --- |
| `scheduled_task` | 일정 | Do this on or before a date | Calendar event, dated checklist row | date, done |
| `routine_session` | 루틴 | Repeat this session or habit | Routine calendar, session grid, habit tracker | repeat rule, session date, done |
| `check_task` | 체크 | Confirm a condition or complete a small task | Checklist | done |
| `log_entry` | 기록 | Record what happened or what was observed | Sheet row, diary row, tracker row | value/note, recorded |
| `memo_evidence` | 메모 | Save proof-like context such as a memo, filename, confirmation, or official reference result without adding a heavy form | Memo, attachment/link context | memo |
| `decision_hold` | 결정/보류 | Choose, defer, hold, or revisit a risky/important decision | Decision table, hold memo | decision status, next review date |
| `reference_caution` | 참고/주의 | Read a boundary, source, or caution before acting | Inline note, warning text | acknowledged only when necessary |

`reference_caution` should not normally become a standalone executable row. It should attach to the nearest actionable item or detail sheet.

## Deferred Caution Boundary

For the current UX12 execution hub, `reference_caution` is intentionally pending as a primary UI pattern.

- Do not add a top-level caution tab.
- Do not turn caution/source notes into checkable rows.
- Do not restore `주의` as a primary editable detail field beside title/date/time/place/memo.
- Keep caution/source content either route/workbench-specific or inside a secondary detail/memo context until observed user behavior proves users need a stronger caution surface.
- If a future pass promotes caution UI, it must explain whether the user is acknowledging a source boundary, recording evidence, or making a decision; it should not look like generic task completion.

## Surface Rules

| Surface | scheduled_task | routine_session | check_task | log_entry | memo_evidence | decision_hold | reference_caution |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today | Show if date is today, overdue, or explicitly pulled into today | Show today's generated occurrence | Hide unless pinned/scheduled | Show if today's record is expected | Show if evidence is due today | Show if review/deadline is today or overdue | Attach inside detail only |
| Calendar | Show title, 1-2 lines if single item | Show color dot/count, not full title by default | Hide unless scheduled | Show small record marker when date-bound | Show small proof/memo marker when date-bound | Show deadline or hold-review marker | Do not show |
| Flow view | Show next dated task and progress | Show routine rhythm, missed/today count | Show remaining checklist count | Show latest record state | Show missing proof/memo count | Show open/held decision count | Show risk/source chip only when relevant |
| Detail sheet | Date move, title, method, completion criteria, caution | Session complete, repeat context, record note | Check state, criteria, related note | Input fields for record values | Memo/status/proof fields | Choice, hold reason, next review date | Source/caution block |
| Export intent | Calendar + checklist | Calendar/routine grid + log | Checklist | Sheet/log | Memo/sheet | Decision table/memo | Included only near the related item |

## Input Complexity Rule

My Flow detail inputs should stay at the complexity level of familiar calendar and reminder apps.

- Do not add separate proof/status forms for `memo_evidence` by default.
- Treat evidence as a reason to preserve memo text, attachment metadata, or links, not as a new primary editing mode.
- Use `memo_evidence` primarily for internal grouping and lightweight context; show it to users as `메모` unless a specific Flow requires stronger proof language.
- Add dedicated evidence fields only after observed users repeatedly fail because memo/attachment/link surfaces are insufficient.
- If a future Flow needs richer evidence capture, it should be route-specific and still avoid turning the shared detail sheet into a database form.

## Type Selection Rules

Use the first matching rule as the primary item type:

1. If the item has a fixed or calculated date and the main action is doing something by that date, use `scheduled_task`.
2. If the item repeats by weekday, cadence, or session number, use `routine_session`.
3. If the user must record a value, observation, score, note, meal, symptom, or session result, use `log_entry`.
4. If the user must capture proof, file names, confirmation text, official result, or submission memo, use `memo_evidence`.
5. If the user must choose, compare, sign, hold, stop, consult, or revisit, use `decision_hold`.
6. If the item is a simple yes/no confirmation without a date, record, proof, or decision, use `check_task`.
7. If content is only a source boundary, caution, or official context, attach it as `reference_caution` to the nearest item.

Secondary flags are allowed. Example: a moving item can be a `scheduled_task` with a `memo_evidence` need.

## Current UX12 Coverage

| Type | Current demo coverage | Current UI support | Gap |
| --- | --- | --- | --- |
| `scheduled_task` | High. Moving, wedding, travel, passport, tax, license all create dated rows. | Strong. Calendar, today, overdue/upcoming, date move, complete, editable detail. | Needs type badge and better deadline vs normal date distinction. |
| `routine_session` | Medium. Workout, running, English, baby-food-like routines. | Medium. Calendar dots and Today rows exist. | Needs routine-specific detail fields: session note, skipped/missed, repeat edit, streak/missed count. |
| `check_task` | Medium in source data, low in new UX12 surface. | Weak. Flow view progress exists, but date-less checklist items do not have a clear execution home. | Needs Flow-level checklist section or type filter. |
| `log_entry` | Low to medium. Baby food, routine, and vehicle check routes imply records. | Lightweight. Current detail has one `오늘 기록` field plus memo instead of a sheet-like form; overview cards do not show a separate `기록` chip by default. | Latest-record display and route-specific record templates remain deferred until observed users need them. |
| `memo_evidence` | Medium in routes like moving, passport, used car, admin. | Deliberately lightweight. Current detail can edit memo and hide attachment/link context behind more details. | Dedicated proof/status fields are deferred unless user evidence proves memo/attachment/link is insufficient. |
| `decision_hold` | Medium in used car, driver/admin, money/risk routes. | Weak. Treated as checklist/detail text. | Needs decision state, hold reason, next review date, and non-commanding copy. |
| `reference_caution` | High in source/risk content. | Medium. Existing detail can show caution text. | Needs consistent placement so cautions do not become checkable tasks. |

## UX12 Fixture Interpretation

| Demo group | Flow examples | Expected item type mix |
| --- | --- | --- |
| 생활 일정 | moving, wedding, travel, passport | Mostly `scheduled_task`, with `memo_evidence` and occasional `decision_hold` flags |
| 반복 루틴 | baby food, workout, running, English | `routine_session` plus `log_entry`; baby food may also need `reference_caution` |
| 행정/결정 | business registration, tax, license, used car | `check_task`, `memo_evidence`, and `decision_hold`; dated admin deadlines become `scheduled_task` |

## Implementation Order After This Matrix

1. Add a lightweight item-type derivation function for My Flow rows.
2. Apply the type to UX12 demo rows without changing the canonical seed data yet.
3. Add type badges and counts in Flow view.
4. Split Detail sheet fields by type while staying within calendar/reminder-level input complexity.
5. Add Today and Calendar visibility rules by type.
6. Expand tests for at least one item per type.

## Open Questions

- Should users be allowed to manually change an item type in My Flow, or should type remain derived from the Flow content?
- Should date-less `check_task` items appear in Today only when pinned, or should My Flow automatically recommend the next unchecked item?
- Should `memo_evidence` support real attachments later, or stay memo/file-name/link only in Stage 0?
- Should `decision_hold` live in Today when held, or only when its next review date arrives?
