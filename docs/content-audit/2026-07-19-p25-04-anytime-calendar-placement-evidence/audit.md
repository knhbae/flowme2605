# P25-04 audit

## Previous failure mode

The Calendar `날짜 없는 할 일` tray behaved like a second execution list. My Flow surfaced only a first undated fallback row, while Calendar repeated the list with another checkbox meaning. The resulting model did not answer whether an undated task was executable, merely unconfigured, or missing from Calendar.

## Product contract

| Surface | Primary job | Completion control | Scheduling control |
| --- | --- | --- | --- |
| My Flow `지금` | Execute open `언제든 할 일` | Existing row checkbox | One `일정에 놓기` entry |
| Calendar queue | Select tasks to place | None | `오늘`, `언제든`, chosen date |
| Calendar agenda | Execute dated occurrences | Existing row checkbox | Existing item detail/edit path |

`언제든` is a valid task state, not an error or incomplete setup state. Moving a task onto a date changes only its personal schedule overlay. Keeping it Anytime does not mutate data. Removing its date returns it to Anytime.

## State transitions exercised

1. Create a personal URL-miss draft and add `충전기 챙기기` without a date.
2. Verify one executable row in My Flow `언제든 할 일`.
3. Complete and immediately undo the same row.
4. Open Calendar placement from My Flow.
5. Verify the queue has selection checkboxes and no completion checkbox.
6. Select the task and keep it Anytime without changing membership.
7. Place it on today, then undo.
8. Place it on 2026-07-21, verify agenda projection, undo, apply again, and reload.
9. Remove the date from item detail and verify it returns to the queue.
10. Verify the wide composition order is queue, grid, agenda.

## Visual review

- Mobile My Flow keeps title, checkbox, task title, `열기`, and edit icon on stable rows.
- Mobile Calendar keeps full task detail out of the month cells and makes placement a collapsible drawer.
- Wide Calendar avoids a full-width undated section and uses a bounded 230px placement queue.
- The full-page mobile screenshot repeats fixed navigation inside the stitched image; this is a Playwright full-page capture artifact, not measured viewport overlap. Viewport and component captures are the primary visual evidence.

## Evidence boundary

All findings in this package are current automated/browser evidence. They do not prove that users understand the word `언제든`, discover the scheduling entry, or prefer this composition. Those questions remain gated until the owner explicitly reopens observed-user work.

## Verification results

- Unit tests: `525 / 525` passed.
- P25-04 targeted Playwright: `1 / 1` passed.
- Full P24 execution-trust file: `15 / 15` passed.
- P24 save-personalize-execute file: `6 / 6` passed.
- URL-first file: `18 / 19` on the first run; the only failure was a stale locator for the P25-02B wide detail pane, and that scenario passed `1 / 1` after correction (`19 / 19` functional accounting).
- Public/workbench files: `43 / 44` on the first run; the only failure expected a date-free public save in the old `지금` section, and passed `1 / 1` after targeting `언제든 할 일` (`44 / 44` functional accounting).
- Focused Flow MVP Calendar/My Flow set: `10 / 11` on the first run; the only failure expected old post-save copy, and passed `1 / 1` after correction (`11 / 11` functional accounting).
- Docs check: passed with `14` required files and `2,472` local links.
- Production build: passed with `18` generated route entries.
- `git diff --check`: passed; line-ending conversion warnings only.
