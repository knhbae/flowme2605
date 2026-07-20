# P26-13 Reuse With A New Anchor Evidence

P26-13 closes the saved-Flow reuse decision before P26 moves into Calendar scheduling. A completed dated Flow now names the context-specific action (`새 이사일로 다시 쓰기`), compares the current and next anchor, and previews what will move, what personal fixed dates will keep or reset, what completion state will clear, and what history will remain.

This slice reuses the existing run registry and personal overlay contract. It does not add a new history schema, mutate source content, or claim observed-user validation.

## Result

- A dated Flow creates a new run ID instead of overwriting the completed run.
- The moving fixture previews `8월 10일 -> 10월 20일`, `24개 재배치`, and one explicit fixed-date decision.
- `새 이사일에 맞추기` removes the fixed override from the new run while preserving it in the completed run snapshot.
- `내가 바꾼 날짜 유지` rekeys the same fixed value to the new anchor row identity.
- Completion checks reset only in the new run. Past completion, item memo, reflection, and unsent source-correction note remain readable and exportable from history.
- The new-run ICS contains the new anchor event and does not retain the old anchor event.
- Date-free Flow reuse asks for no anchor and keeps the current item set.
- Mobile 390px and wide 1024px show the same policy and result without horizontal overflow.

## Evidence

- [Detailed audit](./audit.md)
- [Structured markers](./route-evidence.json)
- [Screenshots](./screenshots/)

The compact result hierarchy follows the same artifact-first principle reviewed in the local-only reference `D:\flowme2605\flow-mvp\docs\content-audit\2026-07-19-flow-content-usage-preview-ko.html`: show the object and resulting artifact state before explaining mechanisms. That uncommitted reference was read without copying or staging it. This is a reference-pattern application, not observed-user evidence.

## Validation Boundary

Evidence kinds are `current_source`, `current_command`, and `current_browser`. Observed-user sessions remain `0`.
