# P23-02C1 Personal Draft Recurrence And Occurrence Contract

**Date:** 2026-07-13
**Status:** Contract, recurrence UI, Calendar occurrence execution, and ICS series/exception projection implemented through P23-02C2C
**Scope:** URL-first miss or memo personal draft recurrence only

## Decision

반복 할 일 자체와 매번 실행하는 회차를 분리한다.

| Owner | Owns | Must not own |
|---|---|---|
| Source/version | published title, source schedule, source metadata | personal recurrence or occurrence state |
| Personal structural schedule | recurrence series, revisions, schedule template, occurrence schedule overrides | done, reopened, skipped, held |
| Occurrence projection | bounded dates/times and destination eligibility | source mutation or execution history |
| Execution run | occurrence-level pending, done, reopened, skipped, held and timestamps | recurrence rule or structural membership |

한 회차의 완료는 반복 series 전체 완료가 아니다. `skipped`는 완료나 삭제가 아니며, `held`는 건너뜀과 다른 보류 상태다.

## Existing Model Inventory

### Existing user-facing paths

- Source-backed routine screens use `lib/flow/recurrence.ts` and `expandRoutineOccurrences` for a finite preview. This is an existing product path, but it has no personal series/revision/occurrence contract.
- Generic My Flow item editing persists `repeatPreset` as `daily`, `weekly`, or `monthly`. The item-level portable export can emit a simple RRULE.
- Source-backed Flow export has a separate RRULE builder. It remains unchanged.

### Personal draft state before C1

- `PersonalStructuralSchedule.repeat` accepted only `{ frequency, interval }`.
- Personal draft UI had no recurrence control.
- Personal draft Calendar and ICS projected one structural schedule row, not occurrence rows.
- Completion and reopening were item-level. Occurrence-level done/reopened/skipped/held were not persisted as a dedicated contract.

Therefore, legacy `repeatPreset` and source-backed routine behavior are compatibility inputs, not proof that personal draft recurrence is user-reachable.

## Minimum Recurrence Rule

Supported frequencies:

- `daily`
- `weekly`
- `monthly`

Each rule has an integer `interval` from 1 through 365. Weekly rules contain explicit weekday tokens (`MO` through `SU`). Monthly rules contain `dayOfMonth` and use `skip` when that day does not exist in a month. A series may end by an inclusive `until` date or by an occurrence `count`, but not both. When malformed input contains both, `until` wins and a warning is recorded.

Open-ended rules are never expanded without a projection range and a generation cap.

## Identity Contract

1. **Item ID** identifies the personal task.
2. **Series ID** is stable for that Item within a saved personal Flow.
3. **Revision ID** identifies one generation of a recurrence rule and schedule template.
4. **Occurrence ID** identifies a scheduled instance from its revision and original local slot.

The following do not change series or occurrence identity:

- title or memo edits
- personal order changes
- done, reopened, skipped, or held transitions
- moving one occurrence through an occurrence override

Changing weekdays, interval, or future time creates a new revision for future occurrences. Past occurrence IDs and execution records remain attached to the old revision.

## Schedule Template

Each revision may snapshot the all-day/timed template used for its future occurrences:

- local `HH:mm` start time
- duration from 5 to 1,440 minutes
- optional valid IANA time zone

If a legacy revision has no template, the current fixed-date schedule is the fallback. Local date/time strings are generated without UTC conversion, so IANA and floating recurrence retain their wall-clock time across DST boundaries. P23-02C2C now serializes these templates through the existing all-day, IANA, and floating-time ICS policy.

## Edit Scope Contract

| Scope | Contract |
|---|---|
| This occurrence | Store a structural occurrence override with the same occurrence ID. Execution state remains separate. |
| This and future occurrences | Append a revision effective from the selected occurrence. Past revisions and records remain. |
| Entire series | If there is no execution history, replace the first revision in place. If history exists, append a revision instead. |

An occurrence override may reschedule or structurally exclude one occurrence. Structural exclusion is distinct from execution `skipped`.

## Occurrence Projection

The pure generator accepts a fixed-date schedule, recurrence contract, inclusive projection range, optional execution records, and a maximum occurrence count. It returns:

- series and revision identity
- stable occurrence identity
- original and effective local date/time
- all-day/timed schedule projection
- execution state
- Calendar and ICS eligibility
- warnings and generation-limit state

Projection rules:

1. Generate only within the requested range.
2. Sort by date, all-day before timed, start time, personal order, stable ID.
3. Do not duplicate occurrence IDs.
4. Tombstoned or excluded Items keep history but have no eligible future projection.
5. An occurrence `skip` or `hold` does not remove structural membership.
6. A malformed rule removes recurrence only; it never removes the Item or base fixed date.
7. A paused or ended series stops future generation at its explicit effective date.

## Execution State Contract

Occurrence execution records use these states:

- `pending`
- `done`
- `reopened`
- `skipped`
- `held`

`done -> reopened` is supported and preserves the prior completion timestamp. Transition history is append-only in the pure adapter. State records carry occurrence, series, and revision identity and are rejected when those identities do not match.

## Migration

- Legacy schedule `{ frequency, interval }` becomes revision 1.
- Legacy `repeatPreset` values `daily`, `weekly`, and `monthly` become revision 1.
- A weekly legacy rule defaults to the start date weekday.
- A monthly legacy rule defaults to the start date day and the `skip` month-end policy.
- Legacy timed values become the revision schedule template.
- Invalid legacy recurrence is ignored while the Item and fixed date remain.
- Existing structural overlay schema version and storage key remain unchanged; recurrence has its own additive schema version.

## Calendar And ICS Policy For P23-02C2

Calendar will expand occurrences only for the visible range and retain the current all-day/time/order hierarchy. Simple compatible series should use stable series UID plus RRULE in ICS. Occurrence exclusion and rescheduling require EXDATE or RECURRENCE-ID. A finite VEVENT fallback is allowed only when a rule cannot be represented without losing meaning.

Completion must not silently remove an occurrence from ICS or Calendar membership.

## Out Of Scope

- series pause or end UI
- occurrence skip and hold UI
- one-occurrence reschedule or exclusion UI
- this-and-future revision UI
- source-backed recurrence editing
- AI, database, cloud sync, OAuth, or IA changes

## P23-02C2 Connection Status

- **C2A:** personal draft user-created Items expose daily, weekly, and monthly recurrence editing.
- **C2B:** Calendar expands bounded occurrences and stores per-occurrence done/reopened state in the execution run.
- **C2C:** personal draft calendar download uses one stable series UID with RRULE when the rule is compatible, EXDATE for structural exclusion, and RECURRENCE-ID for one-occurrence rescheduling. Multiple revisions or timed-until rules use bounded standalone VEVENTs because one RRULE would lose meaning.
- Source-backed and public Flow recurrence/export paths remain on their existing contracts.
- Exception and revision serialization is fixture-covered; the corresponding user editing controls remain deferred.
