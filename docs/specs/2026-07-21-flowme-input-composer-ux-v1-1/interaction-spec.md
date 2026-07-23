# Interaction Specification v1.1

## 1. Surface hierarchy

### Desktop

The wide workbench retains the v1 three-column mental model.

1. Context rail (240px): case/recent input, detected kind, source status
2. Composer (min 420px): raw input, scope, personal fields, Item editing
3. Result (min 460px): recommended artifact, alternatives, concrete action/receipt

The left rail no longer asks the user to choose among four input routes. It may show recent entries or the eight evaluation cases. The active product task begins in the composer.

### Mobile

Order is linear:

1. compact case/example selector
2. unified composer and detected-kind confirmation
3. recommended artifact summary and first Items
4. sticky primary action
5. optional personal values
6. source scope, all Items, alternative artifacts, audit notes

The first useful result must not sit below long source-derived lists.

## 2. Unified composer

### Control

- one labeled textarea: `URL, 메모 또는 할 일을 붙여넣으세요`
- primary action: `형식 확인`
- auxiliary: `표·강의계획 가져오기`
- recovered draft feedback above the control

### Detection

The UI shows a human label, not an enum.

- `URL로 감지`
- `한 문장 요청으로 감지`
- `여러 항목으로 감지`
- `표 14행으로 감지`

`다르게 해석` preserves raw input and lets the user correct only the interpretation.

### Scope confirmation

Show:

- source title and domain
- confirmed row/section count
- missing/locked scope
- existing Flow version if found
- one primary action tied to the state

Full URL, fingerprint, source-row IDs, provider response, taxonomy tokens remain in details/internal diagnostics.

## 3. Role-aware lane

Entry determines the default lane.

- published `/f` or URL hit -> final user preview
- explicit `새 Flow 만들기` -> creator review
- imported protected source -> creator review only

The role is not a decorative stage toggle. A low-priority `제작 검토로 전환` action can exist for authorized users, with a warning that it creates a creator draft rather than editing personal values.

## 4. Progressive field contract

| Field | Why | Owner | Appears | Before first useful preview | Optional | Used by | Conflict rule |
|---|---|---|---|---|---|---|---|
| moving date | resolve relative offsets | user | after relative preview / before Calendar action | no | required for dated Calendar | Calendar, ICS, My Flow schedule | overlay wins for this run |
| K-MOOC current week | resume long plan | user/run | `이미 수강 중` | no | yes | Sheet pin, progress | run state wins |
| K-MOOC week note | personal context | user | row edit | no | yes | My Flow/Sheet export | never changes source topic |
| LibriVox current chapter | resume queue | user/run | `이어 듣기` | no | yes | pinned row/progress | run state wins |
| playback position | resume media | user/run | after chapter chosen | no | yes | My Flow/Memo | user value only |
| passport route | adapt submission path | user | after Todo preview | no | yes until execution | Todo details | overlay does not rewrite source options |
| passport location | execute visit choice | user | route=visit | no | yes | Todo detail | hidden/cleared from active output if online |
| washer trigger | start one run | user/run | after condition preview | no | yes | My Flow run | no recurrence generated |
| washer model | change procedure only with evidence | user | when locale/model mismatch is actionable | no | yes | review/variant lookup | source procedure remains preserved |
| AC choice | record decision | user | after comparison | no | yes | Memo, optional Todo | decision overlay only |
| AC quote | record actual cost | user | after choice | no | yes | Memo/Sheet | source's unknown price remains unknown |
| authorized source file | recover missing source | creator | source_import_required | yes for proposal, not for boundary | required to continue | source snapshot | cannot be replaced by user guess |

## 5. Result UX

### Recommended artifact

- complete enough to judge title, count, date/condition, detail, completion, source link
- first 3-8 Items visible; total count and expand/search provided
- action bar states format, scope, and count before execution

### Alternatives

Only eligible alternatives appear under `다른 형태로 쓰기`.

Before switching, show meaningful loss:

- Calendar -> Checklist: dates become labels unless retained in text
- Sheet -> Todo: row fields and progress columns may flatten
- Memo -> Todo: comparison context is lost; offer only after decision
- Todo -> Checklist: external tool may not preserve stable identity or reopen state

### Not applicable or blocked

Do not render empty tabs. Explain the rule next to the recommended result or boundary.

Examples:

- `이 항목에는 실제 날짜가 없어 캘린더 파일을 만들지 않습니다.`
- `실제 task 원문을 확보하기 전에는 Todo를 만들 수 없습니다.`

## 6. Editing

### Quick edit

Visible inline:

- include/exclude
- title
- schedule only when supported
- personal note
- current status/position for long queues

### Advanced/source edit

Creator lane only:

- detail and completion
- source reference mapping
- condition/recurrence interpretation
- projection eligibility
- rights/safety review

The first useful preview does not enumerate every optional field.

### Long Sheet

- progress summary (`4/14`, `12/38`)
- search by title
- filter: all/current/not started/completed
- pinned `다음 항목`
- expand in batches, not one 38-row wall
- row editor opens without losing list position

## 7. Export and save

### Preflight

Every action states:

- object: 24 calendar events / 14 rows / 6 Todo Items
- scope: all / selected / current
- included/excluded count
- date range or `날짜 없음`
- source link retention
- information loss warning

### Receipt

- operation and timestamp
- exact count and format
- retry/fallback for failure
- `내 Flow 열기` for save
- no completion side effect

Concrete examples:

- `캘린더 일정 24개 확인`
- `선택한 5개를 Todo 텍스트로 복사`
- `현재 장 1개를 메모로 복사`
- `14주 TSV 14행 다운로드`

## 8. Feedback, recovery, and source update

- detection uses `aria-live=polite`; errors use assertive status only when action fails
- save/export shows in-place progress and keeps button dimensions stable
- leaving during edit stores raw input and overlay separately
- reload shows a dismissible recovery receipt
- input change invalidates derived proposal, not raw input
- source update creates compare state; never overwrites personal state
- export failure preserves selected scope and offers copy fallback

## 9. Accessibility

- all fields have persistent labels, not placeholder-only names
- segmented controls use radio or `aria-pressed`
- genuine artifact tabs use `role=tablist`; recommendation cards use buttons/links, not fake tabs
- focus moves to state heading after detection and to receipt heading after action
- loading does not trap focus
- every blocked state has a named recovery action
- touch targets are at least 44px where practical
- focus outline has at least 3:1 contrast
- status/color always has text/icon meaning

## 10. Copy rules

- lead with the user's object and count
- distinguish preview, copy/download, save, and start
- do not surface internal enum/backend names
- avoid generic completion such as `처리를 마쳤다` when a source-specific done condition exists
- use exact boundary copy for missing source, rights, and safety
