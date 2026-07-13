# QA

## Current Evidence

- [x] every screenshot records route, fixture, state, and viewport
- [x] horizontal overflow count is measured
- [x] console errors are measured
- [x] fixture-only states are labeled
- [x] current run evidence is not mixed with prior package pass counts

## Lifecycle

- [x] complete and reopen remain reversible
- [x] skip, hold, exclude, tombstone, and delete remain distinct
- [x] add, delete, restore, and reorder persist where eligible
- [x] unscheduled, all-day, timed, and recurring schedules stay distinct
- [x] My Flow, Calendar, ICS, checklist, sheet, and memo read the same effective state
- [x] completion, reflection, past-run detail, reuse, and source-version boundaries remain intact

## Product Boundary

- [x] personal-draft capability is not generalized to source-backed Flow without evidence
- [x] unavailable source-backed edits are explicitly classified
- [x] backend/AI/account/OAuth gaps are not disguised as UI defects
- [x] actual observed-user count is reported as zero until sessions occur
