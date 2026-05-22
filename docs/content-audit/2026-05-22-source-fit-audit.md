# 2026-05-22 Source Fit Audit

This report records the first source-fit audit batch. It complements the UX page audit in `docs/harness/UX_CONTENT_EVALUATION.md`; it judges the original source before judging the page.

## Decision Summary

| Flow | Score | Decision | Main Reason |
| --- | ---: | --- | --- |
| `moving-d30-basic` | 100 | Keep representative | Exact D-day checklist source already includes spreadsheet/PDF/Notion use. |
| `wedding-d180-basic` | 96 | Keep representative | Exact wedding checklist source has strong timeline and decision structure. |
| `baby-food-menu-recipe` | 93 | Keep representative | Exact calendar/recipe source maps well to meal slots and reaction logs. |
| `english-study-30day-routine` | 91 | Keep representative | Exact 30-day routine source maps cleanly to schedule and progress tracking. |
| `used-car-buying-check` | 88 | Keep representative | Exact staged buying checklist strongly fits checklist and comparison views. |
| `car-care-monthly-routine` | 79 | Reshape before featured | Useful recurring checklist, but DIY claims and intervals need tighter risk/source handling. |
| `home-workout-20min` | 76 | Reshape before featured | Routine is useful, but source is a broad channel rather than the exact workout video. |
| `overseas-travel-d14` | 76 | Reshape before featured | Travel Flow needs multiple official sources; current primary URL covers passport only. |
| `running-5k-4week` | 75 | Reshape before featured | Running program is useful, but source is a broad app homepage, not an exact 4-week plan. |
| `study-exam-d30-plan` | 57 | Catalog preview only | Source is general online English advice, not an exam D-30 source. |

## Audited Sources

### `moving-d30-basic`

Source: AJD moving checklist. Checked 2026-05-22.

The source is a strong FLOW candidate. It explicitly provides D-30, D-10, D-3, D-1, and D-Day tasks and links downloadable Excel/PDF/Notion artifacts. This validates the core need: users already want to move the content into external tools.

Action:

- Keep representative.
- Fill remaining item details over time.
- Preserve month calendar, agenda, sheet, memo, and todo outputs.

### `wedding-d180-basic`

Source: Ohprint wedding checklist. Checked 2026-05-22 via indexed source result because direct crawler output was empty.

The source is a strong FLOW candidate because it is a long event timeline with many decisions: venue, guest count, vendor bookings, invitation timing, budget, and final details. It should stay representative, but the current Flow needs better comparison surfaces for vendors/budget and a clearer month calendar.

Action:

- Keep representative.
- Add wedding-specific comparison views for venue, vendors, budget, invitation/guest list.
- Keep source precision under observation because direct page fetching is limited.

### `used-car-buying-check`

Source: Drive Insight used-car buying checklist. Checked 2026-05-22.

The source has staged actions from basic information gathering to inspection and contract. It is high fit because a user naturally wants an on-site checklist, candidate notes, price/condition comparison, and final contract evidence.

Action:

- Keep representative.
- Improve comparison table and evidence memo.
- Add official/reference links for accident history, inspection, and contract checks.

### `study-exam-d30-plan`

Source: EnglishFact online English study tips. Checked 2026-05-22.

The source contains goals and routines, but it does not match the Flow title "시험 D-30 공부 계획". It is not an exam-date source and should not be representative until the source is replaced or the Flow is renamed into a generic online English study routine.

Action:

- Demote to catalog preview in the next public exposure pass unless source/title are corrected.
- Replace with an actual exam or certification D-30 source, or convert into English routine content.

### `english-study-30day-routine`

Source: New English 30-day self-study routine. Checked 2026-05-22.

The source is a strong FLOW candidate. It has week-by-week progression, daily activity blocks, self-check points, and a clear reason to schedule recurring sessions.

Action:

- Keep representative.
- Emphasize start date, weekday/frequency, weekly progression, monthly calendar, and progress checks.

### `home-workout-20min`

Source: ThankyouBUBU channel. Checked 2026-05-22.

The user job is valid, but the source is broad. For a routine Flow, an exact workout video or playlist is better because the Flow should link directly to the session the user will perform.

Action:

- Keep route accessible.
- Reshape before featured by replacing the source with an exact video or positioning it as a channel-based sample.
- Ensure monthly calendar and weekday recurrence remain visible.

### `car-care-monthly-routine`

Source: Tistory car self-maintenance checklist. Checked 2026-05-22.

The source has intervals, tools, and recurring maintenance actions, so it fits FLOW. However, it includes strong savings claims and DIY maintenance risk. The Flow should separate simple checks from actions that could damage a vehicle or require professional service.

Action:

- Reshape before featured.
- Add "inspection only" versus "DIY repair" boundaries.
- Keep recurring calendar, tool list, sheet export, and service-trigger notes.

### `running-5k-4week`

Source: Runday homepage. Checked 2026-05-22.

The Flow type is valid because beginner running programs need dates, sessions, recovery, and missed-session handling. The source is too broad to support a specific 4-week 5 km plan.

Action:

- Keep route accessible.
- Reshape before featured by using an exact training plan source or a clearly labeled FLOW-created sample.
- Keep routine sessions and calendar preview.

### `baby-food-menu-recipe`

Source: Tistory baby food menu and recipe calendar. Checked 2026-05-22.

The source is highly FLOW-worthy because it is already a date-driven feeding calendar with recipes, ingredient changes, and repeated observation. Because it touches baby/health content, it needs stronger official/medical caution separation.

Action:

- Keep representative.
- Preserve meal calendar, recipe detail, and reaction log.
- Add official guidance supplement and caution framing.

### `overseas-travel-d14`

Source: Passport guide page. Checked 2026-05-22.

The Flow's user job is valid, but the single source only covers passport usage while the Flow includes visa, travel alert, insurance, airport, baggage, and safety tasks. This should become a multi-source official travel Flow.

Action:

- Reshape before featured.
- Replace single source card with a multi-source official set: passport, travel safety, airport/baggage, destination entry rules.
- Keep D-day schedule and calendar export.

## Public Handling Rule For This Batch

No route is deleted in this batch.

Applied handling:

- `keep_representative` remains eligible for landing representative exposure.
- `reshape_before_featured` stays directly accessible but is removed from representative exposure and shows a public "source/content strengthening" status banner.
- `catalog_preview_only` stays directly accessible but is removed from representative exposure and shows a public "source review" status banner.
- `hide_from_public_catalog` is reserved for later; no audited route uses it yet.

This keeps demo routes stable while preventing weak-source flows from looking equally validated in the public first screen.
