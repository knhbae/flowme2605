# P25-04 Anytime and Calendar placement evidence

P25-04 separates two previously competing jobs:

- My Flow owns execution of open tasks that do not yet need a date.
- Calendar owns selection and placement of those tasks onto today or another date.

The user-facing term is `언제든 할 일`. Calendar uses a compact `일정에 놓기` queue instead of presenting a second completion list. This package is automated and browser evidence, not observed-user validation. Observed-user sessions remain `0`.

## Implemented behavior

- My Flow `지금` shows every open undated effective row in one dedicated `언제든 할 일` section.
- Rows retain the ordinary left completion checkbox, `열기`, personal note, and existing edit path.
- Completion removes the row from the open section; immediate undo restores the same row.
- `일정에 놓기` opens Calendar at the placement queue.
- Calendar queue checkboxes mean selection only and expose no completion control.
- Selected tasks can move to `오늘`, a chosen date, or remain `언제든` without mutation.
- Calendar date assignment uses the existing personal overlay and immediate undo contract.
- Removing a date from item detail returns the task to the placement queue.
- Mobile orders selected-day agenda, month grid, then the compact drawer.
- Wide uses placement queue, month grid, and selected-day agenda as three columns.

## Evidence

- [Audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Screenshots](./screenshots/)

## Current verification

- Targeted P25-04 Playwright: `1 / 1` passed.
- P24 execution trust: `15 / 15` passed.
- Save-personalize-execute frame: `6 / 6` passed.
- URL-first functional accounting: `19 / 19` after one stale wide-detail locator was corrected and rerun.
- Public/workbench functional accounting: `44 / 44` after one old `지금`-section expectation was updated to the P25 Anytime section and rerun.
- Focused My Flow/Calendar accounting: `11 / 11` after one stale post-save copy assertion was corrected and rerun.
- Unit: `525 / 525`; docs check and production build passed.
- Actual user observation: not run.
