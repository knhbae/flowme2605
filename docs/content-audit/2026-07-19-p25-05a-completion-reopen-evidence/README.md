# P25-05A Completion and reopen evidence

P25-05A gives task completion one reversible contract across My Flow and Calendar. A normal task has one row checkbox, completion exposes an immediate `되돌리기`, and the persistent `완료` view lets the user reopen the same task after reload.

Recurring content now separates three levels:

- a series definition has no completion control;
- a projected occurrence has exactly one `이번 회차 완료 체크` control;
- detail checklist checks are marked as `subcheck` and do not complete the parent task.

This package is current automated/browser evidence. It is not observed-user validation, and observed-user sessions remain `0`.

## Implemented behavior

- Immediate completion feedback uses `되돌리기`.
- Completed tasks survive reload and remain reversible from the persistent `완료` view.
- Mobile and wide whole-Flow rows own completion, so opening detail does not duplicate the control.
- Personal-draft recurrence definitions link to `캘린더에서 회차별 실행` without a completion checkbox.
- Calendar occurrences use one occurrence-specific completion checkbox.
- Published routine definitions do not expose completion; opening one resolves to the next executable occurrence with one control.
- Internal checklist checkboxes have explicit `확인 항목` accessible names and a separate execution-level marker.

## Evidence

- [Audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Screenshots](./screenshots/)
- [Routine ICS sample](./downloads/washer-monthly-routine.ics)

## Current verification

- Unit tests: `525 / 525` passed.
- Production build: passed.
- P24 execution-trust regression: `15 / 15` functional accounting; one stale detail-checkbox locator passed after targeting the new row-owned completion control.
- Mobile and wide whole-Flow completion scenarios: `3 / 3` functional accounting after correcting one test navigation path through the post-save confirmation.
- Personal-draft recurrence series/occurrence scenario: passed after rebuilding the production bundle used by Playwright.
- Published monthly routine series/occurrence scenario: passed after correcting the assertion to match the intentional series-to-next-occurrence drill-in.
- Changed Flow MVP completion expectations: `4 / 4` passed.
- Actual user observation: not run.
