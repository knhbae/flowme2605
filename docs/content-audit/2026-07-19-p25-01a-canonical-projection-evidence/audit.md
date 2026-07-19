# P25-01A Audit

## Finding Closed

The old architecture independently generated recurrence in preview, maintenance workbench, My Flow Calendar, and ICS. As a result, a source label such as `매월 1회` could coexist with weekly dates or a one-event export. The new pure adapter resolves the source cadence once and hands stable occurrence rows or a recurrence series to each consumer.

## Representative Results

### Monthly maintenance

- Route: `/f/washer-tub-clean-monthly`
- Anchor: `2026-07-20`
- Preview dates: July 20, August 20, September 20, October 20.
- Saved Calendar: one stable occurrence on July 20 and one on August 20.
- Completion transition: pending -> done -> reopened on the same occurrence ID.
- ICS: one VEVENT with `FREQ=MONTHLY;BYMONTHDAY=20`.
- Portable UID: stable and hashed; raw source item ID is absent.

### Weekly source-backed routine

- Route: `/f/curated-allblanc-morning-workout`
- Anchor: `2026-07-15`
- Cadence: Monday/Wednesday/Friday.
- Projection: twelve occurrences over four weeks.
- Existing completion, sibling-occurrence independence, and RRULE E2E remain green.

### Ambiguous natural cadence

- Fixture: `7~10일마다`.
- Result: no invented fixed series.
- Behavior: return the source row and a validation warning; consumers may show one current date or ask the user to choose the next execution date.

## Ownership

- Source: item, source order, source recurrence label, and source detail remain immutable.
- Projection: carrier, series, revision, occurrence, effective date, and destination eligibility.
- Execution: occurrence pending/done/reopened remains separate and survives projection.
- Export: portable UID is derived from stable series identity without exposing the raw source item ID.

## Visual Inspection

- Mobile preview clearly shows four monthly dates and the `매월 1회` badge.
- Mobile selected-day agenda contains one occurrence, one completion checkbox, one open action, and no duplicate row.
- Wide Calendar places the August occurrence on the 20th and keeps the agenda aligned.
- No horizontal overflow or console error was observed.

## Residual UX Risk

1. The maintenance preview still contains a long explanatory paragraph. This predates the slice and belongs to P25-06 public simplification.
2. Two supporting checklist items remain in the existing undated tray while one stable carrier represents the monthly occurrence. P25-02/P25-04 must present that relationship as one whole Flow plus an explicit scheduling state, not as unexplained leftovers.
3. Whole-Flow and post-save count parity is not closed here. P25-01B must fix memo split/count integrity before P25-02 runtime workspace work.
4. This is automated/browser evidence, not a real-user observation.
