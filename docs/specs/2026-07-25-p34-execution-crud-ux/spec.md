# P34 Execution CRUD UX

## Status

Approved for implementation on the P33 branch baseline. P33 is not merged to
`main`, so P34 remains a dependent branch until canonical production parity is
released and smoke-tested.

## Product Decision

P34 uses a bounded structural revision. It does not add a new CRUD data model.
Current source already supports:

- reversible Flow archive and restore;
- archived-only permanent deletion with local backup;
- source Item exclusion and personal draft tombstones;
- completion and reopen;
- recurring series, revisions, occurrence overrides, skip, hold, and reopen;
- whole, selected, and current Item export scope.

The principal gap is that these capabilities use different labels, locations,
and recovery paths across public Flow, My Flow, and Calendar.

## Stable Ownership

| Layer | Owns | P34 rule |
| --- | --- | --- |
| source | published title, Items, source order, source schedule | never mutate or delete |
| personal overlay | aliases, dates, memo, inclusion, user Items, order | preserve stable IDs |
| execution run | completion, reopen, skip, hold, run history | never store in structural overlay |
| occurrence | one generated recurrence instance and its exception | preserve series and occurrence IDs |
| export | destination projection and receipt identity | derive from effective rows |

No localStorage migration is planned.

## Shared Command Grammar

| Object | Remove or pause | Recovery |
| --- | --- | --- |
| active Flow | `보관` | `되돌리기` or `복구` |
| archived Flow | `이 기기에서 영구 삭제` | backup only before confirmation |
| source Item | `이 Flow에서 제외` | `다시 포함` |
| personal Item | `항목 삭제` | `항목 복구` |
| occurrence | `이번 회차 건너뛰기` / `이번 회차 보류` | `이번 회차 다시 진행` |
| completion | `완료` | `다시 열기` |
| schedule | `날짜 정하기` | `날짜 없애기` or undo |

Flow management action order:

1. `Flow 조정`
2. `새 실행으로 다시 쓰기` when eligible
3. `원문 보기`
4. `보관`

Archived action order:

1. `복구`
2. `개인 백업 받기`
3. `원문 보기` when available
4. `이 기기에서 영구 삭제`

## Interaction Composition

### Public save-before

- Keep the usable artifact visible before adjustment.
- Keep row title/date/include editing contextual.
- Put reorder and bulk structure operations behind an explicit secondary mode.
- Save CTA states destination and actual count.

### My Flow

- Library finds a Flow; focused workspace operates on one Flow.
- `Flow 관리` is visible and identical on mobile and wide.
- `보관` previews the recovery destination; the archived inventory appears
  when an archived Flow exists and provides direct restore.
- Item detail uses one `항목 수정` entry. Quick fields precede advanced fields.

### Calendar

- Calendar grid has one Tab stop.
- Arrow keys move by day/week, Home/End move within a week, and PageUp/PageDown
  move by month.
- Selected-day detail remains the execution surface.
- Date removal returns an Item to the undated queue without changing identity.

### Recurrence

- Series summary and next occurrences are read first.
- `반복 일정 조정` edits the series.
- Occurrence actions name `이번 회차` explicitly.
- Completion, skip, hold, and reopen do not rewrite the recurrence rule.

### Export

- Scope and actual count are named before destination.
- Whole, selected, and current Item exports keep one receipt contract.
- Disabled destinations state the omission reason.

## Reference Pattern Decision

- Todoist keeps project archive reversible and restores all project data.
- Notion and Apple place permanent deletion behind a recoverable deleted state.
- Google Calendar asks whether recurrence edits apply to one, future, or all
  occurrences.

FlowMe adopts the hierarchy, not the products' data models.

## Rollback

New command/presentation wrappers can be removed without touching existing
storage, archive, recurrence, completion, or export handlers.

## Non-scope

- 4-tab IA changes
- source deletion
- account, DB, cloud trash, or sync
- OAuth exports
- a Goal object or planner dashboard
- recurrence engine replacement
- export format additions
- automatic merge of P33 24-Item and 5-Item personal copies
- observed-user validation claims
