# P25-01A Canonical Effective Routine Projection Spec

**Date:** 2026-07-19
**Status:** implemented and verified by automated/unit/browser evidence
**Parent:** [P25 Execution Workspace Foundation](../2026-07-19-execution-workspace-foundation/spec.md)

## Goal

Use one source-faithful recurrence definition for public preview, source-specific workbench, saved My Flow Calendar, and ICS. A source saying `매월 1회`, `매일`, or a concrete weekly cadence must not silently become the old Monday/Wednesday/Friday fallback.

## Problem

Before this slice, recurrence was calculated in several consumers:

- public routine preview used a generic weekly expansion;
- maintenance workbenches contained route-specific date arrays;
- saved My Flow Calendar generated four weeks of weekday occurrences;
- ICS applied a weekly BYDAY rule whenever weekdays were available.

The same Flow could therefore show a monthly source cadence before save and weekly or one-off dates after save.

## Contract

`buildEffectiveRoutineProjection` is the canonical adapter for saved/published routines.

Input:

- immutable `FlowBundle` source items and source recurrence labels;
- one stable carrier row for a Flow-level recurrence, or item rows with their own `repeat_rule`;
- anchor date, optional user-selected weekdays, projection range, and optional occurrence execution records.

Output:

- effective occurrence rows with stable item, series, revision, and occurrence identities;
- source rule by carrier item;
- semantic occurrence count;
- validation warnings instead of invented dates.

## Source Cadence Priority

1. A valid item-level RRULE or `repeat_rule` wins.
2. Otherwise the first resolvable Flow-level `repeatRules` entry is used for one stable carrier item.
3. Korean labels support daily, weekly, monthly, and numeric intervals when the cadence is unambiguous.
4. User-selected weekdays refine a weekly rule only. They do not turn daily or monthly source cadence into weekly cadence.
5. An ambiguous range such as `7~10일마다` yields a warning and no invented future occurrence.
6. A consumer may keep its existing safe one-date fallback when the canonical adapter cannot resolve a series.

## Identity And Ownership

- Source items, source order, and source recurrence labels are never mutated.
- Completion and reopen remain occurrence execution records, not recurrence structure.
- Calendar event identity remains stable across date/order edits.
- Portable ICS hashes `saved-routine` identities so raw source item IDs are not exposed, while internal series and completion identities remain unchanged.

## Consumer Connection

| Consumer | Canonical adapter | Result |
| --- | --- | --- |
| Public routine preview | yes | source cadence and semantic occurrence count |
| Maintenance workbench | yes | no slug-specific date arrays |
| My Flow Calendar | yes | stable occurrences and occurrence execution state |
| Calendar/ICS export | yes | source cadence RRULE and stable portable UID |
| Whole Flow/list exports | existing item projection | recurrence occurrence count is not duplicated into list rows |

## Scope Boundary

This slice does not redesign the whole-Flow workspace, the undated-task tray, progressive adjustment, completion hierarchy, export scope, or public copy density. Those remain P25-02 through P25-07.

## Acceptance

- `매월 1회` produces monthly dates in preview, Calendar, and ICS.
- Weekly source-backed routines retain accepted weekdays and stable occurrence IDs.
- Daily source cadence is not changed to weekly merely because a weekday selection exists.
- Ambiguous natural cadence does not invent future dates.
- Completion and reopen do not change occurrence membership or identity.
- Source mutation, duplicate occurrences/events, horizontal overflow, console errors, and internal portable-ID hits are zero in the representative evidence.
