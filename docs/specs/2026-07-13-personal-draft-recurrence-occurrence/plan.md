# P23-02C1 Plan

## Completed

1. Inventory source-backed routine expansion, legacy `repeatPreset`, item completion, Calendar, and ICS consumers.
2. Add an additive recurrence series, revision, rule, schedule-template, and occurrence-override contract.
3. Add deterministic series, revision, and occurrence identity builders.
4. Add pure legacy migration for simple repeat fields and `repeatPreset`.
5. Add a range-bounded daily, weekly, and monthly occurrence generator.
6. Add occurrence execution records and transition validation.
7. Add malformed data, source mutation, duplication, range, and generation-limit defenses.
8. Add 30 named golden scenarios and targeted unit tests.
9. Record evidence without changing UI or runtime Calendar/ICS consumers.

## P23-02C2 Gate

P23-02C2 may start only after C1 keeps all of these invariants:

- series and occurrence identity are distinct
- execution state is not stored in recurrence rules
- past records survive future rule revisions
- open-ended recurrence is range-bounded
- DST fixtures preserve local wall-clock time
- source-backed adapters remain untouched
- Calendar and ICS connection markers remain false in C1

## Recommended C2 Split

1. **C2A:** recurrence rule UI and persistence for personal draft user-created Items.
2. **C2B:** visible-range Calendar occurrence projection and occurrence-level completion controls.
3. **C2C:** ICS RRULE/EXDATE/RECURRENCE-ID generation and download verification.

This split avoids combining rule editing, run-state semantics, and export serialization in one change.
