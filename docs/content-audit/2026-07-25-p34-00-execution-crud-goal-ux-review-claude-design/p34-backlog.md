# P34 Execution CRUD UX Backlog

## 선행 gate

P34 앱 구현 전 P33을 production에 배포하고 다음을 확인한다.

- `/flows`, AJD URL lookup, legacy `/flow-maps/moving-d30`, `/f/moving-d30-basic`이 같은 24개 canonical Flow로 이어진다.
- legacy 5개 personal copy는 자동 병합/삭제되지 않는다.
- receipt, My Flow, Calendar, export의 title/count/identity가 같다.
- P33 Preview 보호 때문에 확인하지 못한 interaction을 production smoke로 재확인한다.

## 순차 / 병렬

```text
P33 production gate
  -> P34-01 lifecycle surface
  -> P34-02 shared command grammar
      -> P34-03 save-before adjustment
      -> P34-04 Item/draft editor
      -> P34-05 Calendar keyboard + undated
      -> P34-06 recurrence hierarchy
      -> P34-07 export scope
  -> P34 final gate
```

P34-03~07은 P34-02가 확정된 뒤 병렬 가능하다. P34-05는 Calendar focus owner와 sheet primitives를 재사용하므로 P34-04와 interface를 먼저 맞춘다.

## P34-01 Flow lifecycle command surface

- 문제: active Flow에서 삭제/복구 lifecycle을 예측할 수 없다.
- route: `/my?view=flows`
- 범위:
  - mobile/wide 공통 `Flow 관리` command model
  - active: 원문 보기, 이름/설정 조정, 새 실행으로 다시 쓰기, 보관
  - archived: 복구, 백업, 이 기기에서 영구 삭제
  - active 메뉴에서 보관 후 복구/영구 삭제 경로를 짧게 예고
  - archive snackbar undo와 permanent delete confirmation 유지
- 비범위: source 삭제, cloud trash, account sync, bulk permanent delete
- dependency: P33 production gate
- 데이터 영향: 없음. 기존 lifecycle/storage contract 재사용
- 390 acceptance:
  - library row 또는 focused workspace에서 2 taps 이내 `Flow 관리`
  - archive 후 direct restore가 first viewport에 노출
- 1024 acceptance:
  - rail/detail 어느 쪽에서 열어도 action order와 label 동일
- 접근성:
  - menu/sheet accessible name `Flow 관리`
  - destructive action은 마지막, focus return 보장
- screenshot marker:
  - `P34-01-ACTIVE-FLOW-MANAGE-390`
  - `P34-01-ARCHIVED-RESTORE-390`
  - `P34-01-LIFECYCLE-1024`
- E2E marker:
  - `P34-01-ARCHIVE-UNDO`
  - `P34-01-RESTORE-RELOAD`
  - `P34-01-PERMANENT-DELETE-BACKUP`
- rollback: 새 command wrapper만 제거하고 기존 archive/delete handlers 유지

## P34-02 Shared Flow / Item command grammar

- 문제: 같은 조작이 surface마다 다른 명칭과 placement를 사용한다.
- route: public `/f/*`, receipt, `/my`, `/calendar`
- 범위:
  - Flow: `Flow 조정`, `Flow 관리`, `새 실행으로 다시 쓰기`, `전체 N개 가져가기`
  - Item: `항목 수정`, `완료`, `다시 열기`, `날짜 배치`, `날짜 제거`
  - 구조 상태: source `Flow에서 제외/다시 포함`, personal `항목 삭제/복구`
  - occurrence: `이번 회차 건너뛰기/재개`, `반복 일정 조정`
  - scope/count가 들어간 export copy
  - shared command anatomy와 feedback/undo placement
- 비범위: 의미가 다른 상태를 하나로 합치기, 4탭 IA 변경
- dependency: P34-01
- 데이터 영향: 없음. presentation/copy/component contract
- 390/1024 acceptance: 동일 object/action은 같은 label, icon, action order를 사용
- 접근성: visible label과 accessible name의 동사/대상이 동일
- screenshot marker: `P34-02-COMMAND-GRAMMAR-MATRIX`
- E2E marker: `P34-02-COMMAND-LABEL-PARITY`
- rollback: copy/token mapping 제거, 기존 handler 유지

## P34-03 Artifact-first save-before adjustment

- 문제: 저장 전 전체 결과보다 설정 mode와 긴 Item editor가 먼저 읽힌다.
- route: `/f/moving-d30-basic`, routine/public Flow, other source-backed public routes
- 범위:
  - primary artifact outline을 조정 중에도 유지
  - row 직접 선택 후 title/date/include quick edit
  - change summary: 저장 이름, anchor, 포함 count, date count
  - batch reorder/include/date tools는 secondary `여러 항목 조정`
  - dynamic primary CTA: destination + count
- 비범위: full Flow editor, source mutation, AI rewrite
- dependency: P34-02
- 데이터 영향: 없음. existing public adjustment state와 personal overlay 저장 재사용
- 390 acceptance:
  - first viewport에서 artifact, required anchor, primary CTA가 한 흐름으로 보임
  - 조정 진입 후 선택한 row의 before/after가 같은 viewport에 보임
- 1024 acceptance:
  - outline와 contextual editor 2-pane
  - mobile 화면을 단순 확대하지 않음
- 접근성: mode 전환 후 heading focus, unsaved change status, cancel/restore
- screenshot marker:
  - `P34-03-MOVING-SAVE-BEFORE-390`
  - `P34-03-MOVING-ADJUST-1024`
- E2E marker:
  - `P34-03-INCLUDE-TITLE-DATE-RECEIPT-PARITY`
- rollback: new shell 뒤 feature flag로 기존 adjustment workbench 복귀

## P34-04 Personal draft and Item editor simplification

- 문제: 5개 memo Item만 있어도 구조 조작 43개가 한 번에 노출되고 Item detail action이 흩어진다.
- route: `/flows`, `/my`
- 범위:
  - draft 기본 row: include + title + date state
  - split/merge/reorder는 `구조 편집` mode에서만 표시
  - Item sheet header: complete/reopen + title + `수정`
  - quick fields: title, date/time, memo
  - advanced: duration, location, recurrence, subchecks/resources
  - source exclusion vs personal delete wording 유지
- 비범위: AI parsing, source-backed source Item mutation, attachment upload
- dependency: P34-02; P34-05와 sheet/focus contract 공유
- 데이터 영향: 없음. personal structural/detail overlay 재사용
- 390 acceptance:
  - 5개 draft initial interactive controls 20개 이하
  - Item edit primary fields가 한 screen에 들어옴
- 1024 acceptance: selected Item detail pane과 list가 동시에 보이되 nested cards 금지
- 접근성: sheet focus trap/Escape/return, form label, save feedback
- screenshot marker:
  - `P34-04-DRAFT-PREVIEW-390`
  - `P34-04-ITEM-EDITOR-390`
  - `P34-04-ITEM-PANE-1024`
- E2E marker:
  - `P34-04-ADD-DELETE-RESTORE-REORDER-RELOAD`
  - `P34-04-TITLE-DATE-TIME-LOCATION-MEMO-PARITY`
- rollback: visual/editor wrapper만 제거, existing overlay data 보존

## P34-05 Calendar keyboard and dated/undated orchestration

- 문제: 날짜 grid의 42개 Tab stop과 tray/agenda 분리로 keyboard 실행 비용이 크다.
- route: `/calendar`, `/calendar?demo=ux20`
- 범위:
  - roving tabindex calendar grid
  - arrow/Home/End/PageUp/PageDown
  - selected-day heading focus
  - mobile selected-day Item detail sheet 유지
  - undated queue의 batch select/date placement/undo
  - Item detail에서 `날짜 제거` 후 queue 복귀 feedback
  - compact Flow identity label
- 비범위: drag-and-drop 필수화, external Calendar sync, new calendar engine
- dependency: P34-02, P34-04 sheet contract
- 데이터 영향: 없음. calendar selection/manual schedule/stable key 재사용
- 390 acceptance:
  - grid entry 1 Tab stop
  - selected-day sheet와 undated queue가 bottom nav를 가리지 않음
- 1024 acceptance:
  - calendar/agenda split 유지
  - 20~60 Flow scope 선택에서 keyboard search 가능
- 접근성: grid semantics, live selected date, focus restore, target size 44px
- screenshot marker:
  - `P34-05-CALENDAR-390`
  - `P34-05-UNDATED-QUEUE-390`
  - `P34-05-CALENDAR-1024`
- E2E marker:
  - `P34-05-ROVING-KEYBOARD`
  - `P34-05-BATCH-PLACE-UNDO-REMOVE`
- rollback: roving focus hook 제거 후 기존 button grid 유지

## P34-06 Recurrence series / occurrence hierarchy

- 문제: 반복 설정과 이번 실행 조정이 같은 긴 form으로 읽힌다.
- route: `/f/curated-allblanc-morning-workout`, `/my`, `/calendar`
- 범위:
  - public summary `월·수·금 07:30 · 8회`
  - next 3 occurrences
  - `반복 일정 조정` sheet
  - occurrence quick edit `이번 회차만`
  - future/all scope는 advanced choice
  - complete/reopen/skip/hold 상태를 같은 action rail로 표시
- 비범위: habit streak, performance analytics, workout planner
- dependency: P34-02, P34-04
- 데이터 영향: 없음. current routine definition/occurrence identity 재사용
- 390/1024 acceptance: series summary와 occurrence state가 동시에 혼동되지 않음
- 접근성: scope radio/segmented control label, recurrence summary accessible name
- screenshot marker:
  - `P34-06-ROUTINE-SUMMARY-390`
  - `P34-06-RECURRENCE-SHEET-390`
  - `P34-06-SERIES-OCCURRENCE-1024`
- E2E marker: `P34-06-THIS-FUTURE-ALL-IDENTITY`
- rollback: new summary/editor composition 제거, recurrence data untouched

## P34-07 Scope-first export and receipt

- 문제: whole/selected/current 계약은 안정적이지만 format/artifact entry가 먼저 나타난다.
- route: public `/f/*`, receipt, `/my`, Item detail
- 범위:
  - scope first: 전체/선택/현재
  - actual count와 제외 Item summary
  - destination eligibility: Calendar/checklist/sheet/memo
  - loss warning과 2~3 row preview
  - success/failure receipt에 scope/count/stable identity
- 비범위: OAuth/direct sync, cloud export history, XLSX
- dependency: P34-02
- 데이터 영향: 없음. existing export scope/projection identity 재사용
- 390 acceptance: scope/count가 first viewport, destination은 다음 step
- 1024 acceptance: preview와 destination 선택 2-pane
- 접근성: disabled destination 이유, copy/download live status
- screenshot marker:
  - `P34-07-EXPORT-SCOPE-390`
  - `P34-07-EXPORT-PREVIEW-1024`
- E2E marker:
  - `P34-07-WHOLE-SELECTED-CURRENT-COUNT`
  - `P34-07-FAILED-EXPORT-NO-FALSE-RECEIPT`
- rollback: new export shell 제거, export builders untouched

## P34 Final gate

- P33 production canonical parity pass
- lifecycle archive/restore/delete/backup pass
- personal draft add/delete/restore/reorder/reload pass
- source exclude/restore + personal memo preservation pass
- completed/reopen pass across My Flow and Calendar
- undated batch schedule/undo/date-remove pass
- recurrence this/future/all and stable occurrence identity pass
- whole/selected/current export count and receipt pass
- 390, 1024, 1440 screenshots
- horizontal overflow 0
- console/page error 0
- unnamed interactive 0
- Calendar grid roving keyboard pass
- docs:check, unit, build, targeted E2E, risk-based full E2E
- observed-user count remains 0 until actual observation occurs

## Deferred

- bounded Goal overlay
- cloud/account persistence
- external Calendar/Todo/Notion OAuth
- creator marketplace
- AI/crawler
- full planner dashboard
- Home/Find IA reopen
