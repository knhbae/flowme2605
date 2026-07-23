# FlowMe P26 실행용 `/goal` 프롬프트

아래 프롬프트는 한 번에 하나씩 사용한다. 각 goal은 clean `origin/main` worktree에서 시작하고, 이전 goal의 merge/deploy 여부를 먼저 확인한다. 자동 시뮬레이션을 실제 사용자 검증으로 표현하지 않는다.

## P26-01 Date intent contract

```text
/goal FlowMe public 저장의 날짜 의도를 명시적이고 안전한 계약으로 통일하기

문제:
- 빈 날짜 입력에서도 예시 날짜가 실제 saved anchor로 저장된다.
- 날짜 미정은 '다른 방법' 안에 숨겨져 있다.

범위:
- /f/vehicle-inspection-prep를 대표 route로 사용
- 날짜 정하기 / 날짜 없이 저장 / 예시만 보기 3상태를 기본 노출
- example은 transient preview로만 유지하고 saved record에는 custom 또는 undated만 허용
- sticky CTA와 desktop CTA 문구를 현재 상태에 맞게 변경
- 기존 example 저장본을 손실 없이 다루는 localStorage migration 추가
- Today, My Flow, Calendar, checklist, ICS eligibility를 같은 effective date 계약으로 통일

데이터 계약:
- source는 변경하지 않음
- personal overlay에 명시적 schedule intent 저장
- example preview는 execution run과 export에서 제외

검증:
- unit: blank/example/custom/undated 저장 계약
- E2E: 390x844와 1024x768에서 세 경로, reload, Calendar/ICS count
- screenshot: 저장 전 상태와 저장 후 receipt
- docs: decision/spec/QA에 contract와 migration 기록
- npm.cmd run docs:check, npm test, npm.cmd run build, targeted E2E

완료 기준:
- 명시적 날짜 선택이 없으면 dated item 0, ICS event 0
- 예시 날짜가 persisted anchor로 승격되지 않음

제외:
- AI 날짜 인식
- 외부 Calendar API
- 서버 저장/계정
```

## P26-02 Canonical save receipt and route parity

```text
/goal 모든 public/source-backed 저장을 하나의 저장 receipt와 전체 Flow 확인 흐름으로 통일하기

문제:
- /f/moving-d30-basic 전용 CTA는 /my로 이동해 post-save receipt를 건너뛴다.
- 일반 public와 source-backed Flow Map의 저장 후 경험이 다르다.

범위:
- /f/*, /flow-maps/* 저장 handoff helper 통합
- route-specific duplicate save CTA 제거 또는 canonical action으로 교체
- receipt에 저장 이름, 전체/포함 항목 수, dated/undated 수, 날짜 범위, 반복 여부 표시
- 바로 시작 / 전체 Flow / Calendar / 가져가기 action 우선순위 고정
- needs_review/held 저장 기록 variant 유지
- receipt query는 transient pointer로만 사용

검증:
- moving, vehicle, washer, new-car, source-backed, held route contract test
- receipt row count와 실제 My Flow effective rows 일치
- browser back/reload에서 duplicate run 미생성
- 390/1024 screenshot
- docs/unit/build/targeted E2E

완료 기준:
- 어떤 저장 CTA를 눌러도 canonical receipt가 먼저 보임
- receipt에서 한 action으로 실행/전체 보기/Calendar/export 이동

제외:
- onboarding carousel
- server activity log
- 알림 권한 요청
```

## P26-03 Recurrence series and occurrence contract

```text
/goal 반복 Flow의 series definition, occurrence, completion, Calendar, ICS 계약을 하나로 통일하기

문제:
- washer public ICS는 RRULE 1개지만 My Flow export는 Calendar 0개다.
- Calendar undated tray에 series definition 3개와 occurrence 1개가 함께 보인다.

범위:
- source routine과 personal recurrence가 같은 projection/export adapter 사용
- Flow settings에는 반복 정의, Today/Calendar에는 발생 회차만 표시
- series definition을 undated tray에서 제외
- 이번 회차 완료/다시 열기와 반복 전체 수정 scope 분리
- export preview에 반복 일정 수와 표시 회차 수를 따로 표기
- stable seriesId/revisionId/occurrenceId 유지

검증:
- public/My Flow ICS UID와 RRULE parity
- RRULE, EXDATE, RECURRENCE-ID golden tests
- occurrence complete/reopen/reload
- 390/1024 My Flow와 Calendar screenshots
- docs/unit/build/targeted E2E

완료 기준:
- 같은 routine은 public와 My Flow에서 동일한 반복 ICS를 생성
- Calendar에 definition 중복이 없음

제외:
- 알림 발송
- 무한 미래 회차 materialization
- 복잡한 cron editor
```

## P26-04 Deterministic memo segmentation

```text
/goal 사용자 메모를 생성 없이 실행 항목 경계로 나누고 저장 전 검토할 수 있게 만들기

대표 입력:
8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인

문제:
- 현재는 5개 행동이 하나의 긴 항목으로 결합된다.

범위:
- newline, checkbox, ordinal, comma, 그리고 clause 후보 처리
- 일부 clause만 action vocabulary에 없더라도 전체 list split을 취소하지 않는 보수적 알고리즘
- 원문 fragment와 draft item의 1:1/1:N 연결 표시
- 저장 전 나누기, 합치기, 제외, 순서 변경
- deterministic suggestion ID와 source fragment ID 유지
- 내용 생성이나 의미 재작성은 하지 않음

검증:
- 제주 예문 최소 5 action items
- '여권, 지갑, 우산 챙기기'는 하나로 유지
- Korean punctuation/list fixture unit tests
- 390 source disclosure, 1024 source/result 2열 screenshot
- save/reload/stable ID/export order E2E

완료 기준:
- 사용자가 저장 전에 모든 생성 항목과 원문 근거를 확인하고 수정 가능

제외:
- AI generation
- URL crawling
- semantic recommendation
```

## P26-05 Projection identity and migration gate

```text
/goal source, personal overlay, execution run, occurrence, export projection의 stable identity와 migration gate를 고정하기

범위:
- effective item set을 만드는 canonical projection adapter 정리
- source item, user-created item, date override, tombstone, order, completion, recurrence identity invariants 정의
- localStorage schema version과 migration 추가
- malformed legacy data fallback과 rollback-safe behavior
- route별 adapter가 같은 effective set을 쓰는지 golden fixture로 고정

검증 매트릭스:
- add/delete/restore/reorder
- date set/move/remove
- complete/undo/reopen
- recurrence occurrence edit
- whole/selected/item export
- refresh and viewport switch

완료 기준:
- 모든 projection과 export가 같은 stable item identity를 사용
- migration 전후 user data 손실 0
- six-journey state snapshot이 deterministic

검증:
- unit fixture matrix
- 390/1024 targeted E2E
- docs: schema/invariant/migration 기록
- docs/unit/build/E2E

제외:
- 내부 ID 사용자 노출
- server persistence
```

## P26-06 Unified save-before artifact frame

```text
/goal public와 source-backed 저장 전 화면을 하나의 artifact-first interaction frame으로 통일하기

범위:
- 공통 순서: 저장될 결과 -> 실행 시점 -> primary action
- 첫 viewport에 title/source, item/phase count, 3~5 row preview, schedule intent, 저장 action
- 설명, source trace, safety detail은 의미에 따라 접힘 또는 관련 항목에 연결
- moving/vehicle/washer/new-car/source-backed variants를 shared view model로 렌더링
- 그대로 저장과 내 버전 조정의 결과 차이를 action 근처에 짧게 표시

390:
- artifact와 primary action이 844px 안에 함께 보임
- sticky CTA와 본문 CTA 중복 금지

1024:
- artifact/setup 2열 가능하되 DOM reading order 동일

검증:
- semantic counts and screenshot snapshots
- long Korean title, 24 items, 3-item routine, safety-sensitive content
- keyboard details summary, focus, overflow
- docs/unit/build/targeted E2E

제외:
- content seed 재작성
- creator profile redesign
- marketing landing page
```

## P26-07 Post-save decision hub

```text
/goal 저장 receipt를 실행·전체 보기·Calendar·export로 이어지는 one-time decision hub로 완성하기

범위:
- primary: 첫 할 일 시작
- secondary: 전체 Flow 보기
- tertiary: Calendar, 가져가기
- 저장 수, phase, date range, undated count, recurrence summary 표시
- held/review-before-apply variant는 실행 CTA 대신 원문 확인 상태 표시
- dismiss/back/reload behavior와 focus return 정의

검증:
- 0/1/multi Flow Map 저장
- dated/undated/routine/held content
- 390 action hierarchy, 1024 summary-outline-actions layout
- no duplicate run on reload/back
- docs/unit/build/targeted E2E

완료 기준:
- receipt 첫 화면에서 저장 결과와 다음 네 가지 경로를 예측 가능
- 저장 후 Flow를 다시 찾지 않고 export 진입 가능

제외:
- onboarding tutorial
- notifications
```

## P26-08 My Flow role and navigation IA

```text
/goal My Flow의 지금, Flow 목록, 완료 역할을 명확히 분리하고 다중 Flow 탐색을 정리하기

범위:
- page title은 My Flow 유지
- subtabs를 지금 / Flow 목록 / 완료로 변경
- 지금은 cross-flow execution queue
- Flow 목록은 저장 계획 inventory와 selected workspace
- 완료는 reopen 가능한 history
- held content는 ordinary execution inventory에서 제외
- 1024 rail selection과 all overview behavior 정의

검증:
- empty, 1, 3, 20 Flow states
- fresh/returning localStorage 분리
- tab URL/state, back/reload
- 390 bottom nav와 subtab 혼동 없음
- 1024 rail-list-detail screenshot
- tabs/heading/focus accessibility

완료 기준:
- 각 tab의 첫 heading과 content만으로 역할을 설명할 수 있음

제외:
- team workspace
- server search
```

## P26-09 Whole Flow reading model

```text
/goal 긴 Flow를 phase-grouped plan outline으로 읽고 실행할 수 있게 재구성하기

대표 Flow:
- moving-d30-basic 24 items

범위:
- phase header, date range, count, progress
- compact row: checkbox, title, date/status, open icon
- row마다 반복되는 memo text button 제거하고 detail 안으로 이동
- phase collapse/expand와 show all
- 날짜형 Flow에만 optional timeline view 제안
- excluded/tombstoned/recurring variants 처리

390:
- 24 items를 phase 단위로 접고 펼칠 수 있음
- stable row height와 long-title wrapping

1024:
- phase outline + detail pane + optional phase index

검증:
- 3/10/24 item screenshots
- keyboard disclosure and row actions
- completion/reopen and export selection compatibility
- docs/unit/build/targeted E2E

완료 기준:
- 전체 Flow의 phase, 기간, 다음 행동, 진행률을 스크롤 초반에 이해 가능

제외:
- kanban/Gantt
- arbitrary custom views
```

## P26-10 Quick edit and advanced editor

```text
/goal item quick edit와 advanced schedule editor를 분리하고 mobile/wide에 맞는 contained surface로 만들기

범위:
- quick edit: title, date/undated, personal memo
- advanced: time, duration, recurrence, location/timezone when supported
- mobile bottom sheet 또는 full-screen editor
- wide persistent detail pane
- atomic save, cancel, dirty-state guard, focus return
- Calendar agenda와 My Flow에서 같은 editor 사용

검증:
- title/date/memo 2 taps 이내 진입
- advanced disclosure 전 지원 필드 비노출
- save/cancel/reload
- date/time/recurrence Calendar/ICS projection
- 390 safe-area and fixed-nav overlap
- 1024 pane width and keyboard flow
- dialog semantics and error association

완료 기준:
- inline editor가 Flow document 높이를 늘리지 않음
- simple edit가 advanced field list를 요구하지 않음

제외:
- natural-language scheduler
- timezone model redesign
```

## P26-11 Structural edit and batch mode

```text
/goal 개인 draft의 구성 편집과 일상 실행 mode를 분리하기

범위:
- normal execution mode에는 complete/open만 노출
- 구성 편집 mode에서 add/delete/restore/reorder/multi-select 노출
- source-owned와 user-created item ownership 유지
- batch toolbar, selection count, undo receipt
- keyboard reorder와 mobile move controls
- export order와 effective item set 즉시 반영

검증:
- source/user item add-delete-restore-reorder
- multiple selection date/export/remove
- reload/stable identity
- 390 toolbar and bottom nav non-overlap
- 1024 list selection/detail pane sync
- accessibility live region and confirmation

완료 기준:
- 사용자가 실행 중 구조를 실수로 바꾸지 않음
- 편집 mode에서 모든 구조 변경과 복구를 예측 가능

제외:
- source-backed 원본 구조 수정
- version tree
```

## P26-12 Completion, reopen, and undo

```text
/goal 완료·즉시 취소·나중에 다시 열기를 동일 item/occurrence identity에서 자연스럽게 연결하기

범위:
- 완료 직후 stable undo bar
- 완료 tab의 same checkbox/reopen action
- recurring은 이번 회차 scope를 label에 포함
- optimistic movement 중 active row/focus 유지
- My Flow와 Calendar action wording 통일

검증:
- ordinary item complete -> undo -> complete -> completed tab reopen
- occurrence complete/reopen and next occurrence
- reload and export status
- 390 undo bar vs bottom nav
- 1024 list/detail focus stability
- screen reader status announcement

완료 기준:
- 실수 완료를 즉시 복원하고 나중에도 완료 tab에서 다시 열 수 있음
- series definition은 completion으로 변경되지 않음

제외:
- streak/gamification
- user-visible audit log
```

## P26-13 Reuse with new anchor

```text
/goal 저장한 날짜형 Flow를 새 기준일의 독립 실행 run으로 다시 사용할 수 있게 만들기

범위:
- Flow menu의 새 기준일로 다시 쓰기
- old/new date comparison preview
- new execution run ID 생성
- completion reset
- personal title/memo/item inclusion clone
- fixed item date overrides 유지/초기화 선택
- save receipt로 합류

대표 검증:
- moving-d30-basic 새 이사일
- source-backed moving personal copy
- routine은 별도 recurrence contract에 따라 처리

검증:
- 기존 run/history 불변
- new run dates and export
- 390 compact sheet, 1024 diff view
- unit/migration/E2E/docs/build

완료 기준:
- 기존 실행을 덮지 않고 새 기준일 Flow를 생성
- override policy를 저장 전에 이해 가능

제외:
- full version history UI
- template marketplace
```

## P26-14 Undated inbox and batch scheduling

```text
/goal 날짜 없는 할 일을 명시적 inbox로 만들고 Calendar batch scheduling을 완성하기

범위:
- public에서 날짜 없이 저장을 primary date-intent option으로 노출
- Calendar tray subtitle: 아직 일정에 놓지 않은 실행 항목
- multi-select -> target date preview -> commit
- date 제거 시 tray 복귀와 undo
- recurring series definition은 tray에서 제외
- tray empty/collapsed/open states

검증:
- vehicle 10 undated -> one schedule 9 -> remove 10
- multiple schedule and undo
- checklist 10, ICS 0/1/N counts
- 390 bottom sheet/collapsed count
- 1024 persistent rail
- selected count/date feedback accessibility

완료 기준:
- 사용자가 undated의 의미와 Calendar에 없는 이유를 이해
- schedule/remove가 reversible하고 counts가 모든 surface에서 일치

제외:
- AI auto scheduling
- capacity optimization
```

## P26-15 Calendar grouping and Flow differentiation

```text
/goal 같은 날짜 여러 Flow와 반복 회차를 Calendar에서 이름과 group으로 구분하기

범위:
- month cell은 concise chips/count
- selected-day agenda는 Flow별 group
- Flow color/initial/title를 함께 사용
- all/Flow/routine filters
- selected Flow rail과 agenda 동기화
- ordinary item과 occurrence label 구분

검증:
- same day 2+ flows
- ordinary + routine occurrence
- long Korean titles and +N overflow
- 390 selected-day agenda below grid
- 1024 tray/grid/agenda 3-pane
- keyboard calendar navigation and selected-date announcement

완료 기준:
- 색상만 보지 않고 어떤 Flow의 어떤 할 일인지 식별 가능

제외:
- week/day time grid
- external calendar sync
```

## P26-16 Unified export scope and result

```text
/goal public, whole Flow, selected items, current item export를 하나의 scope/result 계약으로 통일하기

범위:
- scope: Flow 전체 / 선택 항목 / 현재 항목
- formats: calendar, checklist, sheet, memo
- 실행 전 included/omitted/dated/recurring count 표시
- routine RRULE summary와 undated disabled reason
- 실행 후 filename, rows/events, omissions receipt
- effective item set과 canonical recurrence adapter 사용

검증:
- moving whole 24 / selected 2
- vehicle undated ICS 0, scheduled one ICS 1
- washer series ICS 1 RRULE
- personal draft checklist 3, TSV 4 rows, memo 3, ICS 1
- stable UID/source trace/order golden tests
- 390 staged sheet, 1024 preview pane

완료 기준:
- preview count와 실제 output가 모두 일치
- surface가 달라도 scope 용어가 동일

제외:
- direct API integration
- full XLSX redesign
```

## P26-17 Execution component and copy system

```text
/goal FlowMe execution surfaces의 component, visual token, action copy를 상용 앱 수준으로 통일하기

범위:
- ArtifactSummary, ScheduleIntent, FlowOutlineRow, ExecutionRow, Receipt, EditorShell, ExportPlan components
- primary/secondary/icon action rules
- icons and tooltips for familiar utilities
- card radius <= 8px unless retained legacy token has documented reason
- typography/density/focus/error/disabled states
- source/safety copy hierarchy and copy length budget
- route-specific duplicate labels/components 제거

검증:
- long Korean title, small counts, error/disabled/held states
- WCAG contrast, 44px touch targets, visible focus
- 390/1024 component screenshots and visual regression
- CSS color/palette audit; one-hue dominance 피하기

완료 기준:
- 같은 행동은 같은 label과 component
- 화면당 primary action 하나
- safety copy는 유지하되 일반 설명과 위계 구분

제외:
- logo/brand redesign
- marketing hero
```

## P26-18 Responsive workspace composition

```text
/goal mobile과 wide가 같은 정보 위계를 공유하면서 각 viewport에 맞는 workspace로 동작하게 만들기

범위:
- mobile single-column execution + contained sheets
- wide My Flow rail/outline/detail
- wide Calendar tray/grid/agenda
- stable min/max widths, safe-area, sticky regions
- no nested floating section cards
- breakpoint change 시 selection/focus 유지

검증:
- exact 390x844 and 1024x768 screenshots
- long Flow, multi Flow, editor open, export open, tray open
- no horizontal overflow, text overlap, fixed nav collision, layout shift
- logical DOM order and keyboard pane navigation

완료 기준:
- wide가 card stack으로 늘어난 mobile이 아니고, mobile은 desktop controls를 세로로 쌓지 않음

제외:
- 별도 tablet product
- 3D/illustrative assets
```

## P26-19 Six-journey evidence harness

```text
/goal P26 A~F journey를 deterministic하게 검증하는 production-like evidence harness 만들기

환경:
- clean origin/main worktree
- 390x844, 1024x768
- persona별 localStorage isolation

범위:
- first action, click depth, competing CTA, explanation blocks
- item/date/status/stable identity
- export rows/events/RRULE
- accessible name, keyboard focus, overflow, console/page error
- screenshots and structured JSON
- known flake와 product failure를 분리 기록

검증:
- docs:check, unit, build
- targeted A~F E2E
- full E2E one bounded run
- failed test isolated retry는 별도 필드로 기록하고 full pass로 합치지 않음

완료 기준:
- one command로 journey results와 screenshot package 생성
- automated simulation임을 모든 보고서에 명시

제외:
- 실제 사용자 validation
- visual AI scoring
- performance lab
```

## P26-20 Production final review

```text
/goal 배포된 P26 production을 독립 재검토하고 P26을 닫거나 남은 문제를 P27로 넘기기

범위:
- deployed SHA와 origin/main 일치 확인
- A~F journeys를 390/1024 production에서 재실행
- source/personal overlay/run/occurrence/export contract audit
- Blocking/High/Medium/Low findings
- current screenshots, evidence JSON, final decision matrix
- docs/status/roadmap/decisions closeout
- P27 defer list 확정

필수 gate:
- Blocking 0, High 0
- example date persistence 0
- public/My Flow routine export parity
- memo 5-clause baseline
- canonical receipt all routes
- no overflow/fixed overlap/console/page error blocker
- docs/unit/build/targeted/full E2E와 production smoke 기록

판정:
- internally_coherent 또는 focused_iteration_required만 P26 closeout 가능
- structural_correction_required이면 P26을 닫지 않음

제외:
- 실제 사용자 모집/관찰/인터뷰 계획
- P27 기능 구현
```
