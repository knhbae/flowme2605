# P25-03B Selected-item Batch Adjustment Evidence

P25-03B connects a temporary selection mode to the My Flow `전체 Flow` workspace. The ordinary row stays focused on completion and opening detail. Selection checkboxes, date movement, explicit `언제든으로`, selected export, and recoverable removal appear only after the user chooses `여러 할 일 조정`.

## Product result

- Mobile and wide use the same stable item selection keys and impact-plan contract.
- Selection mode replaces task completion controls instead of adding a second checkbox meaning.
- Date application and explicit date removal preserve completion, personal memo, structure, and published source.
- Selected export opens the existing portable export surface with the chosen rows already selected.
- `Flow에서 빼기` appears only for a personal draft or a source-backed personal copy with a recovery path.
- Recurring rows cannot receive an ambiguous batch date edit. The existing date-movement contract requires occurrence or series scope first.
- The operation returns to the ordinary whole-Flow list and offers immediate undo.

## Evidence boundary

This package contains current unit and automated browser evidence. It is not observed-user evidence. Observed-user sessions remain `0` and external recruitment stays closed.

## Files

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [screenshots](./screenshots/)

## Current verification

- Unit: `525 / 525`
- Targeted Playwright batch journey: `1 / 1`
- P24 execution trust regression: `15 / 15`
- URL-first structural/date/time/recurrence regression: `7 / 7`
- Public share and workbench regression: `44 / 44`
- Production build: pass
- Mobile 390px horizontal overflow: `0`
- Wide 1024px horizontal overflow: `0`
- Console errors: `0`

The final push-hook verification is recorded in the implementation closeout. Every result above comes from the current implementation run rather than a prior artifact.
