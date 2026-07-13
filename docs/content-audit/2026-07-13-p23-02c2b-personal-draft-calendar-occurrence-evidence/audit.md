# P23-02C2B Audit

## 1. Before

- 개인 draft 반복 규칙은 structural overlay에 저장됐지만 Calendar는 base Item 한 건만 읽었다.
- Calendar 완료 체크는 Item-level `checks`를 사용해 한 회차 완료와 series 전체 완료를 구분하지 못했다.
- occurrence execution record는 pure contract만 있고 local persistence, run snapshot, UI consumer가 없었다.
- My Flow의 series 원본 상세에서 완료 체크가 보이면 사용자가 반복 전체를 완료하는 것으로 오해할 수 있었다.

## 2. Ownership

| Layer | Owns | Does not own |
| --- | --- | --- |
| Personal structural schedule | recurrence series, revisions, schedule | done/reopened |
| Calendar occurrence projection | bounded occurrence date/time and stable occurrence identity | source mutation |
| Execution run | occurrence pending/done/reopened and append-only transition history | recurrence rule |

Occurrence records are included in `MyFlowPersonalExecutionState` snapshots. A completed run keeps its occurrence history; a new run starts without old occurrence completion. Flow-local clear removes only that Flow's occurrence records and preserves other Flows.

## 3. Calendar connection

- Only eligible personal draft `user_created` rows with a valid recurrence contract are expanded.
- Visible month and current execution window are generated separately and deduplicated by occurrence ID.
- Source-backed, published, non-recurring, tombstoned, excluded, and unscheduled behavior remains on the existing path.
- Calendar row identity uses occurrence ID; structural Item ID remains the editor ownership key.
- Same-date ordering continues to use all-day, time, then personal order rank.
- Occurrence rows are not draggable because one-occurrence rescheduling is not yet exposed.

## 4. Completion and reopening

- `pending -> done` checks the selected occurrence only.
- `done -> reopened` unchecks the same occurrence and preserves the previous completion timestamp in history.
- Completion does not remove Calendar membership or change series identity.
- Series base detail has no task completion control. It links to `일정별로 확인` instead.
- `skipped` and `held` remain distinct contract states but have no user controls in this slice.

## 5. Editor safety

Calendar occurrence detail shows the occurrence date for execution, but series editing resolves its base structural schedule. Opening an August 21 occurrence cannot silently replace the series start date with August 21.

## 6. Persistence and recovery

- New additive key: `flow:my-flow:occurrence-execution`
- Records are scoped by Flow slug plus occurrence ID.
- Malformed records are ignored without deleting valid records or Items.
- Local backup includes the key.
- Flow reset removes only matching Flow records.
- Completed run snapshots retain occurrence execution records.
- New run reuse clears occurrence execution state while preserving past history.

## 7. Remaining gaps

1. **P23-02C2C:** ICS RRULE, EXDATE, RECURRENCE-ID, and stable series UID are not connected.
2. **P23-03:** skipped, held, exclude, tombstone, and done/reopened user actions still need a coherent status surface.
3. Series pause/end UI and one-occurrence reschedule are not implemented.
4. Automated browser QA is not actual observed-user evidence.

## 8. Validation results

Current-run results:

- storage/occurrence unit tests: 45/45 passed
- full unit suite: 467/467 passed
- URL-first, public share, and workbench Playwright regression: 63/63 passed
- targeted My Flow/Calendar Playwright regression: 8/8 passed
- targeted recurrence Calendar Playwright with console collection: 1/1 passed
- mobile and wide horizontal overflow: 0
- source-backed occurrence controls: 0
- browser console errors: 0
- production build: passed, 18 static/dynamic routes generated including `icon.svg`
- docs check: passed
- `git diff --check`: passed
