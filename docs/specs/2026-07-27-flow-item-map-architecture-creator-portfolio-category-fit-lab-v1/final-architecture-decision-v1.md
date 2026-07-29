# Final Architecture Decision

**Decision:** Keep current canonical v1 and add projection-time schedule grouping.  
**Status:** provisional architecture recommendation; user review pending  
**Runtime:** unchanged

## Why

The primary corpus preserves 148 Items and 198 SourceRows across nine life areas. Current canonical v1 scored 96/100 and passed every hard gate. It already asks for an anchor date once at bundle setup, so a persisted SharedContext did not reduce user setup input in most cases.

Item-first shared-context scored 95/100 and preserved meaning, but the frozen adoption gate required three distinct same-date multi-Item bundles. The primary corpus supplied only 1. Keep it as a future proposal rather than a new canonical entity.

Literal ICS-first scored 51/100 and failed the canonical gate. It can serialize scheduled Items, but VEVENT does not natively retain FlowMe manual completion. Unscheduled work, hierarchy and provenance rely on VTODO, VJOURNAL, RELATED-TO and X-properties whose Google/Outlook/Apple round-trip is not proven by the reviewed official documentation.

## Accepted Adapter Rules

1. Calendar is a projection of effective scheduled Items.
2. A Flow may export one VCALENDAR containing sibling VEVENT components.
3. No VEVENT/VTODO nesting and no scheduleless VEVENT.
4. `calendarPolicy=none | per_item | step_bundle` is chosen by the projection adapter.
5. `step_bundle` groups source-equal same-date Items for a compact event, retains child Item IDs, and declares completion-state loss.
6. Unscheduled Items stay in Checklist, Todo, Sheet, Memo, or FlowMe until the user explicitly schedules them.
7. Map type, creator/provider/source attribution, rights, review and SourceRows remain canonical JSON.

## Reopen Persisted SharedContext When

- at least three structurally different contents require repeated editing of the same date/place/session;
- a user can change the group once and override one Item without ambiguity;
- the relation cannot be derived deterministically from source schedule equality or an existing anchor field;
- observed-user evidence shows material friction with projection-time grouping.

## Evidence Boundary

RFC syntax and the lab parser were checked. External Google, Microsoft and Apple account import/export was not run. Internal expert walkthrough is not observed-user validation.
