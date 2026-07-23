# P29 Visual & Interaction Reset 실행 백로그

## 프로그램 결정

- 전략: `coordinated_surface_reset`
- 데이터 전략: P28 stable contract 보존, persistence migration 없음
- UI 전략: artifact-first, contextual adjustment, distinct receipt, action-first returning surface
- rollout 전략: route/surface 단위 opt-in과 screenshot gate
- observed-user count: 0

## 실행 그래프

```text
P29-01 moving vertical slice
  ├─> P29-02 public/source-backed save-before rollout ─┐
  ├─> P29-03 routine progressive disclosure           ├─> P29-06 result/export continuity
  └─> P29-04 My Flow reset ─> P29-05 Calendar reset ──┘
                                                        └─> P29-07 visual/a11y consolidation
                                                            └─> P29-08 final gate
```

- 반드시 순차: `01 -> 02 -> 06 -> 07 -> 08`
- 병렬 가능: `03`과 `04`; `05`는 `04`의 shared command grammar가 정해진 뒤 합류
- P29-08 전에는 legacy frame 삭제 금지

## P29-01 Moving artifact-first save-before + distinct receipt

### 문제

이사 Flow 저장 전 화면은 outline과 Calendar result가 같은 항목을 반복하고, 저장 후에도 같은 긴 화면에 머문다. fixed CTA의 DOM 순서도 header보다 앞선다.

### 사용자 영향

- 무엇이 저장되는지 첫 viewport에서 판단하기 어렵다.
- 저장 성공과 저장된 개인 사본의 범위를 확인하기 어렵다.
- 키보드 사용자는 문맥보다 CTA를 먼저 만난다.

### 적용 route

- `/f/moving-d30-basic`
- 저장 후 같은 route의 receipt state
- compatibility 확인만 `/my`, `/calendar`

### UX/UI 방향

- title/source/count 다음에 실제 Calendar preview를 둔다.
- 전체 outline은 한 번만, disclosure로 제공한다.
- 기본 frame에서 row별 수정 command를 숨기고 `조정` mode에서 제공한다.
- 저장 후 별도 `SavedReceiptFrame`으로 전환한다.
- mobile fixed command의 DOM 순서를 본문 뒤로 이동한다.

### 구현 범위

- `FlowIdentityStrip`
- `PrimaryArtifactCanvas`
- `FlowCommandBar`
- `SavedReceiptFrame`
- `FlowSaveBeforeFrame`의 opt-in composition
- P29 전용 test marker

### 비범위

- persistence/localStorage schema 변경
- public route 전체 rollout
- My Flow/Calendar 재설계
- 새 artifact format
- seed/content 수정

### 데이터 영향

- 기존 `FlowExperienceProjection`, personal overlay, save handler 재사용
- 새 persisted field 없음
- UI-only `frameMode: preview | adjust | saved` 허용

### 영향 파일 예상

- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `components/flow/AppClient.tsx`
- `components/flow/flow-ui.ts`
- P29 targeted tests

### Dependency

- P28 production baseline 및 현재 projection tests

### 390 acceptance

- 첫 viewport에 Flow title, source, 24개 범위, Calendar actual preview, primary CTA가 보인다.
- competing primary action은 1개 이하이다.
- row-level `수정`은 adjust mode 전 0개다.
- 저장 후 preview input/control이 사라지고 receipt heading이 보인다.
- focus order는 header -> source -> result -> disclosure -> adjust -> save 순서다.

### 1024 acceptance

- artifact canvas와 context inspector가 2-column으로 보인다.
- outline은 하단에서 한 번만 보인다.
- nested card가 없다.
- save command는 context pane 또는 toolbar에 한 번만 보인다.

### 접근성

- visible label과 accessible name이 같은 목적·scope를 표현한다.
- adjust sheet close 후 entry에 focus restore.
- success receipt는 heading과 live status를 함께 제공하되 중복 낭독을 피한다.

### Unit/E2E

- `P29-SAVE-BEFORE-PRIMARY-RESULT`
- `P29-SAVED-RECEIPT-DISTINCT`
- `P29-MOBILE-FOCUS-ORDER`
- 기존 P28 item count/date/export projection tests 유지

### Acceptance screenshots

- `p29-01-moving-save-before-390.png`
- `p29-01-moving-adjust-390.png`
- `p29-01-moving-receipt-390.png`
- `p29-01-moving-save-before-1024.png`
- `p29-01-moving-receipt-1024.png`

### Rollback

- `frameVersion="p29"` 같은 route-level opt-in 또는 wrapper로 legacy frame를 유지한다.
- save handler와 persistence payload는 공유한다.
- screenshot/E2E gate 실패 시 opt-in만 제거한다.

### 완료 기준

- 390/1024 acceptance와 targeted E2E 통과
- save 전후 stable Flow id, title overlay, included count, date range가 같음
- P28 전체 unit/E2E 회귀 없음

## P29-02 Public/source-backed save-before rollout

### 목적

P29-01의 composition을 public/source-backed Flow와 다섯 artifact shape에 적용한다.

### 범위

- `FlowSaveBeforeFrame` 공통화
- `SourceBackedFlowMapPage`의 preview 중복 제거
- outline 한 번, primary 1 + secondary 최대 2
- contextual item edit entry
- public mobile command DOM order

### 비범위

- routine 특수 schedule UX
- creator editor
- 새로운 source ingestion

### 영향 surface

- moving, used car, math, safety 및 public `/f`

### Data/migration

- 기존 projection 소비, migration 없음

### Acceptance

- 다섯 shape route에서 unsupported/disabled tab 0
- outline item이 화면 구조상 한 번만 나타남
- mobile 첫 viewport primary action 1개 이하
- source-backed math 390 문서 높이와 bordered surface가 current보다 감소
- source URL과 sourceTrace 의미 유지

### Tests/screenshots

- shape eligibility unit snapshot
- `p29-02-{flow,calendar,checklist,sheet,memo}-{390,1024}.png`

### Dependency

- P29-01

## P29-03 Routine progressive disclosure

### 목적

routine 설정을 지원 field 목록이 아니라 현재 계획 요약과 단계적 조정으로 바꾼다.

### 범위

- compact schedule summary
- next occurrence preview
- schedule edit sheet
- weekday/frequency, time, duration, end mode conditional fields
- resource와 execution item 분리
- series/occurrence label

### 비범위

- recurrence engine 변경
- workout analytics/recommendation
- source content 수정

### 영향 surface

- `/f/curated-allblanc-morning-workout`
- 반복 청소/운동 Flow
- My Flow occurrence detail

### Data/migration

- `effective-routine-projection` 그대로 사용
- ephemeral editor step만 추가, migration 없음

### Acceptance

- 초기 advanced schedule input 0
- summary에 weekday/frequency, time, duration, end condition이 손실 없이 표현
- 선택한 mode에 필요한 field만 표시
- next 3 occurrence와 resource가 구분
- 한 회차 완료/reopen 시 series definition mutation 0

### Tests/screenshots

- routine mode matrix unit
- occurrence identity E2E
- `p29-03-routine-{summary,adjust,occurrence}-{390,1024}.png`

### Dependency

- P29-01 shared primitives; P29-02와 병렬 가능

## P29-04 My Flow action-first library/detail

### 목적

20개 이상 Flow에서도 원하는 Flow와 다음 행동을 찾고, 전체 계획·조정·export를 단계적으로 여는 returning workspace를 만든다.

### 범위

- mobile compact library row
- explicit accessible open action
- search/filter 유지
- wide rail + plan canvas + item inspector
- next action 우선
- export/archive를 detail/overflow로 이동
- completion/reopen 위치 일관화

### 비범위

- 새 tab/IA
- server search
- account/cloud sync
- virtualization 선행 구현

### 영향 surface

- `/my?demo=ux20&view=flows`
- `지금 / 내 Flow / 완료`

### Data/migration

- existing saved copy/run/archive state 재사용
- migration 없음

### Acceptance

- 390에서 최소 8 compact row/viewport
- row당 visible command 최대 1
- 27 fixture 검색 -> 열기 -> 전체 계획 -> item -> 완료 -> reopen -> export 완료
- wide는 rail/canvas/inspector의 역할이 명확하고 nested card 0
- bottom nav는 main 뒤에 포커스

### Tests/screenshots

- 27 fixture targeted E2E
- keyboard focus snapshot
- `p29-04-my-flow-{library,detail,item,reopen}-{390,1024}.png`

### Dependency

- P29-01; P29-03과 병렬 가능

## P29-05 Calendar scope/day/undated reset

### 목적

Calendar를 Flow scope 관리, 날짜 일정, 날짜 없는 항목 배치의 세 역할로 분명하게 만든다.

### 범위

- compact scope summary
- recent/active grouping + all list dialog
- selected-day agenda/inspector
- mobile undated bottom sheet와 internal scroll
- batch date placement/undo
- wide scope rail/calendar/day inspector

### 비범위

- calendar engine 교체
- OAuth/direct sync
- 새로운 recurrence semantics

### 영향 surface

- `/calendar?demo=ux12`

### Data/migration

- existing calendar projection, selected Flow ids, undated tray command 재사용
- recent/active는 client-derived, persisted field 없음

### Acceptance

- 12 fixture 중 검색과 2개 선택이 5 interactions 이내
- 닫힌 state의 scope visible command 1개
- undated sheet를 열어도 page scroll/Calendar 위치가 변하지 않음
- batch date move와 undo 후 counts 일치
- mobile/wide focus return 통과

### Tests/screenshots

- picker grouping unit
- batch move/undo E2E
- `p29-05-calendar-{scope,selected-day,undated}-{390,1024}.png`

### Dependency

- P29-01, P29-04 command grammar

## P29-06 Result choice, export scope, receipt continuity

### 목적

사용자가 primary/secondary result와 export 범위의 차이를 실행 전에 예측하게 한다.

### 범위

- `ArtifactRecommendationVM`: reason, scope, delta, loss
- primary 1 + secondary 최대 2
- whole/selected/current scope summary
- save/export receipt identity continuity
- unsupported projection 숨김

### 비범위

- 새 export format
- OAuth
- recommendation AI

### 영향 surface

- public preview
- saved receipt
- My Flow export
- Calendar export

### Data/migration

- existing role/count/date/resource projection에서 derive
- 저장하지 않음, migration 없음

### Acceptance

- five-shape fixture의 추천 reason과 loss policy snapshot
- preview count = export row/event count
- 전체/선택/현재 scope가 action label에 포함
- unsupported/disabled tab 0
- receipt에 same personal copy id/source marker 유지

### Tests/screenshots

- projection unit matrix
- export E2E
- `p29-06-result-choice-{390,1024}.png`
- `p29-06-export-receipt-{390,1024}.png`

### Dependency

- P29-02, P29-04, P29-05

## P29-07 Visual system, responsive contract, accessibility

### 목적

composition reset 뒤 공통 visual grammar와 focus/contrast/responsive contract를 마감한다.

### 범위

- typography/density/divider/radius/state tokens
- semantic color 제한
- surface/nested-card 정리
- focus order, focus visible, focus return
- 390/1024/1440 layout constraints
- fixed UI overlap/safe-area

### 비범위

- brand identity 전면 교체
- animation showcase
- data/IA 변경

### 영향 surface

- P29 reviewed surfaces 전체

### Acceptance

- horizontal overflow 0
- fixed overlap 0
- unnamed focusable 0
- visible/accessibility label 목적 불일치 0
- contrast gate 통과
- same Flow identity anatomy가 모든 surface에 나타남
- nested card 0 target, card는 반복 entity/modal/tool에만 사용

### Tests/screenshots

- visual regression 390/1024/1440
- keyboard-only scripted journey
- `p29-07-responsive-contact-sheet.html`

### Dependency

- P29-02~06

## P29-08 Integration and final review

### 목적

P29가 시각적 체감만 바꾸고 P28 correctness를 훼손하지 않았음을 production에서 독립적으로 닫는다.

### 범위

- docs check, unit, build
- targeted/full E2E
- production deploy 후 smoke
- 64-state equivalent recapture
- current/proposed evidence package
- final decision matrix와 known gaps

### 비범위

- 실제 사용자 관찰을 자동화로 대체
- P30 기능 구현

### Acceptance

- P28 stable contract regression 0
- P29 markers 모두 통과
- 390/1024/1440 overflow/error/focus gate 통과
- baseline/current screenshot manifest
- observed-user count 0 명시
- rollout/rollback 상태 문서화

### Dependency

- P29-01~07

## P29 final review에서 P30으로 넘길 항목

- account/DB/cloud sync
- AI/crawler runtime
- Google Calendar/Todoist/Notion OAuth
- creator marketplace/payment
- 실제 사용자 관찰과 행동 데이터
- planner-level analytics
