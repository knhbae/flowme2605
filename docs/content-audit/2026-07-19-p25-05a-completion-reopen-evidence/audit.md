# P25-05A audit

## Previous failure mode

The same execution action appeared as a row checkbox, a detail checkbox, or a text-like undo action depending on surface. Recurring series and generated occurrences also shared generic `이번 항목` language, so a user could not tell whether one occurrence or the entire series was being completed. Immediate undo existed, but persistent reopen after leaving or reloading the screen was not directly evidenced.

## Product contract

| Level | Completion control | Reopen path |
| --- | --- | --- |
| Normal task | One left row checkbox | Immediate `되돌리기` or persistent `완료` view |
| Recurrence series definition | None | Not an executable occurrence |
| Recurrence occurrence | One `이번 회차 완료 체크` checkbox | Same occurrence checkbox or immediate `되돌리기` |
| Detail checklist | Separate `확인 항목` checks | Same subcheck; parent membership unchanged |

## State transitions exercised

1. Complete one Today task and verify the immediate `되돌리기` action.
2. Undo and verify the same row returns unchecked.
3. Complete it again, reload, enter `완료`, and verify the checked row persists.
4. Uncheck the persistent completed row and verify the same row returns to `지금`.
5. Open a personal-draft recurrence definition and verify completion controls are `0`.
6. Enter Calendar and verify each occurrence has one occurrence-specific checkbox.
7. Complete and reopen one occurrence without changing sibling occurrence membership.
8. Save a published monthly routine and verify its whole-Flow series row has no completion control; drilling in exposes one concrete occurrence control.
9. Verify internal checklist checks remain labeled as subchecks.

## Visual review

- The mobile completed view keeps the persistent reopen cue next to the actual completed row instead of creating another explanatory card.
- The whole-Flow wide view keeps one checkbox in the outline and no duplicate checkbox in the detail pane.
- Recurrence definition and occurrence screenshots are component crops; DOM assertions are the primary evidence for exact control counts and execution levels.
- No new completion button variant was introduced.

## Evidence boundary

Automated checks prove state persistence, control counts, accessible names, and route behavior. They do not prove that users notice the `완료` tab, understand the term `회차`, or prefer the current visual treatment. Those remain future observation questions after the owner reopens user testing.

## Verification results

- `npm.cmd test`: `525 / 525` passed.
- `npm.cmd run build`: passed after the final source change.
- P24 execution-trust file: `14 / 15` on the first combined run; the only failure used the removed detail checkbox and passed after targeting the owning row (`15 / 15` functional accounting).
- P25 whole-Flow mobile/wide scenarios: `3 / 3` functional accounting.
- Personal-draft recurrence scenario: `1 / 1` passed.
- Published monthly routine scenario: `1 / 1` passed.
- Changed Flow MVP completion expectations: `4 / 4` passed.
- `git diff --check`: line-ending conversion warnings only.
