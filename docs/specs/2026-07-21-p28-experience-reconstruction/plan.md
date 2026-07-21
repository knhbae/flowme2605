# P28 Execution Plan

## 1. 실행 원칙

1. P28-01에서 화면 문법을 결정하기 전 production UI를 고치지 않는다.
2. 각 slice는 `inventory -> alternative -> simulation -> implementation -> regression -> evidence` 순서로 닫는다.
3. owner feedback을 automated pass보다 높은 UX acceptance signal로 취급한다.
4. 기존 source/personal/run/occurrence/export identity를 다시 설계하지 않는다.
5. 한 route에서만 쓰는 특례 UI를 만들기 전에 공통 item/occurrence/resource grammar로 표현 가능한지 검토한다.
6. actual content fixture와 realistic cardinality를 함께 검증한다.
7. 구현 도중 현재 architecture가 반복적으로 special case를 요구하면 계획을 중단하고 replan gate를 연다.
8. 자동화와 agent simulation을 observed-user validation으로 표현하지 않는다.

## 2. 전체 흐름

```text
Phase A. architecture and contract
  P28-01 comparison simulation and decision
  P28-02 projection, role, artifact policy

Phase B. primary journeys
  P28-03 save-before whole-Flow adjustment workspace
  P28-04 routine interaction unification

Phase C. returning use
  P28-05 My Flow information architecture
  P28-06 Calendar scale and shared occurrence UI

Phase D. portability and closeout
  P28-07 five-shape preview/export representative gate
  P28-08 integrated regression and independent review
```

## 3. Phase A - architecture and contract

## P28-01 비교 시뮬레이션과 결정

앱 코드를 수정하지 않는다.

### 3.1 Current inventory

다음 current surface를 390, 1024, 1440에서 캡처하고 interaction depth를 기록한다.

- `/flows` empty, existing Flow, proposal/draft
- moving save-before and adjustment
- workout save-before
- post-save receipt
- My Flow with 1, 5, 20 Flows
- Calendar with 2, 8, 25 Flow scopes
- ordinary item, routine occurrence, resource, warning

### 3.2 Alternative set

세 가지 composition을 실제 fixture 데이터로 만든다.

#### A. Outline-first

전체 Flow를 먼저 읽고 결과 형태와 조정으로 내려간다.

#### B. Artifact-first

primary destination의 실제 결과를 먼저 보고 outline과 조정을 연다.

#### C. Hybrid

Flow header와 compact whole outline, primary actual-data preview, contextual adjustment를 하나의 task flow로 연결한다.

### 3.3 Cross-surface prototype

선택한 대안은 save-before만 그리지 않는다. 다음 네 화면을 같은 component grammar로 prototype한다.

1. moving save-before
2. workout save-before + one occurrence
3. My Flow library + selected detail
4. Calendar scope picker + selected-day agenda

### 3.4 Simulation tasks

- 이사일 변경 후 특정 item 날짜만 다시 고정
- 홈트 주 2회, 화/토, 8월 31일까지 설정
- 운동 occurrence 완료, 다시 열기, 휴식 처리, 메모 남기기
- 저장 Flow 20개에서 한 Flow 찾아 전체 구조 열기
- Calendar 25개 Flow에서 2개만 선택
- primary Calendar에서 secondary Checklist로 전환하고 손실 확인

### 3.5 Decision scoring

각 대안은 1~5점으로 평가한다.

- whole Flow comprehension
- adjustment discoverability
- content-native artifact clarity
- routine/common grammar consistency
- My Flow browse clarity
- Calendar scale
- mobile density
- keyboard/accessibility
- component reuse
- regression risk

다음 hard fail이 하나라도 있으면 선택하지 않는다.

- routine-only completion system이 남음
- 1024px에서 3개 주요 pane이 잘리거나 overflow
- 20+ Flow selector가 horizontal chip strip
- primary action 2개 이상이 경쟁
- actual-data preview 없이 설명 카드만 존재
- date edit까지 4단계 이상 필요
- 같은 item이 한 surface에서 completion control 두 개를 가짐

### 3.6 Gate result

산출물은 decision matrix, current/proposed screenshots, state fixture, selected anatomy, rejected alternatives, owner decision field를 포함한다. 추천은 Hybrid지만 score가 기준을 통과해야 한다.

## P28-02 공통 projection과 role 정책

P28-01이 선택한 UI가 같은 데이터를 읽도록 pure contract를 만든다.

### 3.7 Projection model

한 projection은 다음을 제공한다.

- whole Flow outline
- effective item identity, title, schedule, memo, order
- item role
- occurrence or series identity
- completion eligibility
- five-shape destination eligibility
- primary/secondary/blocked artifact
- destination count and loss note
- resource/safety/reference blocks

### 3.8 Item role

additive role 후보:

- action
- confirmation
- reference
- warning
- resource
- decision
- record

legacy item은 무조건 action으로 확정하지 않는다. current source와 artifact plan으로 안전한 fallback을 정하고, non-action 분류가 불확실하면 completion/export를 hold할 수 있어야 한다.

### 3.9 Artifact policy

- one primary
- zero to two secondary
- not-applicable omitted
- blocked with reason only when user action exists
- destination count from same projection
- no slug-only visual branch in consumer

### 3.10 Contract fixtures

- moving timeline
- vehicle undated checklist
- exact-video workout routine
- K-MOOC progress Sheet
- heat safety checklist/reference
- contract comparison/record
- trip mixed sequence/date

source가 없는 fixture는 synthetic structure-only로 표시하고 production content로 오해하지 않게 한다.

## 4. Phase B - primary journeys

## P28-03 Save-before whole-Flow adjustment workspace

### 4.1 Route scope

- `/f/[slug]`
- `/flow-maps/[slug]`
- `/flows` existing_flow_found
- `/flows` proposal_ready/personal draft

### 4.2 Implementation order

1. `FlowSaveBeforeFrame` 5-row truncation을 read-only whole outline contract로 교체한다.
2. primary actual-data preview를 P28-02 projection에서 렌더한다.
3. existing include/date/title+memo/order logic을 shared contextual editor에 연결한다.
4. title/date/order/include/memo를 outline과 preview를 보며 수정한다.
5. cancel은 persistent write 0, save는 existing overlay path에 atomic commit한다.
6. CTA와 receipt가 같은 count를 사용한다.

### 4.3 Responsive composition

- 390: header -> outline summary -> actual preview -> required value -> action; edit는 full-screen 또는 sheet
- 1024: two-pane; outline+preview 또는 preview+editor
- 1440: context가 증명될 때만 optional third pane

### 4.4 Scope control

P28-03은 moving, vehicle, personal draft를 먼저 연결한다. routine editor는 P28-04에서 연결한다. source rights/safety가 막힌 Flow는 fake preview를 만들지 않는다.

## P28-04 Routine interaction unification

### 4.5 Contract mapping

| 현재 홈트 표현 | P28 공통 의미 |
| --- | --- |
| 완료 | occurrence done/reopened |
| 강도 낮춤 | occurrence note 또는 personal adjustment |
| 휴식으로 변경 | occurrence skipped/held |
| 몸 상태 메모 | execution note |
| 원본 운동 영상 | resource |
| 공식 안내 | source/safety/resource |
| 미리보기 4주 | bounded visible range |
| 종료일 없음/4주 프로그램 | series end |

### 4.6 Routine editor

저장 전과 저장 후에 같은 control을 사용한다.

- 시작일
- 주 N회 또는 weekday direct selection
- 선택적 time
- 종료 없음 / until / count / source-defined
- preview range는 control이 아니라 display preference

### 4.7 Shared rendering

- save-before: series summary + actual occurrence preview
- My Flow detail: series definition, next occurrence, resource
- Today: one occurrence row
- Calendar: same occurrence row + date context
- export: same series/occurrence identity

### 4.8 Remove special completion UI

`ExactVideoTodayResultCard`와 유사한 content-specific completion selector를 제거하거나 공통 occurrence detail로 흡수한다. 운동 안전 정보는 safety block으로 유지한다.

## 5. Phase C - returning use

## P28-05 My Flow information architecture

### 5.1 Prototype cardinality

1, 5, 20, 50 saved Flow fixture를 사용한다.

### 5.2 Target hierarchy

- top local navigation: `지금`, `Flow`, `완료`
- `지금`: date group and next execution
- `Flow`: browseable library
- selected Flow: same whole outline/detail grammar as save-before
- `완료`: reopenable run/history

### 5.3 Library behavior

- 1 Flow: direct selected workspace, compact way back to library
- 2~4: direct browse list
- 5~19: browse list + compact search utility
- 20+: grouped/virtualized or paged inventory + search/filter
- archive is a filter, not a competing top-level dashboard

Threshold는 P28-01 score와 browser fixture로 조정한다. 숫자 자체를 product truth로 고정하지 않는다.

### 5.4 Selected Flow

- header, scope, date range/undated, next item
- whole grouped outline
- current item detail
- contextual `조정`, `가져가기`, `보관`
- receipt는 temporary compact band만 추가

## P28-06 Calendar scale and common occurrence UI

### 5.5 Flow scope picker

Flow 수에 따라 다음을 사용한다.

- 1: filter hidden
- 2~5: compact shortcuts may be visible
- 6+: single scope trigger + searchable picker
- 20+: recent/in-month grouping, selected count, clear/reset

한 줄에 모든 Flow chip을 렌더하지 않는다.

### 5.6 Scope parity

선택 scope는 다음에 동시에 적용한다.

- month grid
- selected-day agenda
- counts
- undated tray
- date move selection
- export preflight

### 5.7 Routine parity

routine occurrence는 ordinary Calendar agenda row를 사용한다. series settings는 Calendar event detail에서 별도 command로 연다. resource는 common resource block이다.

## 6. Phase D - portability and closeout

## P28-07 Five-shape and representative content gate

### 6.1 Five-shape actual data

각 shape에 최소 한 대표 fixture를 연결한다.

- Flow execution: mixed/project or personal draft
- Calendar: moving
- Checklist/Todo: vehicle/heat action subset
- Sheet: K-MOOC/contract
- Memo: trip/reference

### 6.2 Source gate

- exact source trace
- rights/direct-route decision
- safety role
- no inferred item
- no source: hold/source_import_required

### 6.3 Export parity

- preview count == generated count == receipt count
- non-action role eligibility respected
- whole/selected/item scope preserved
- user edits reflected
- internal term 0

## P28-08 Integration and independent review

### 6.4 Automated gate

- docs, unit, build
- P27 and P28 targeted E2E
- full E2E according to blast radius
- storage/migration round trip
- production-like screenshot matrix

### 6.5 Journey replay

- first visit -> Flow find -> save-before -> adjust -> save
- returning My Flow -> find -> open -> edit -> complete/reopen
- routine -> frequency/end -> occurrence -> Calendar
- Calendar 25 Flow -> select 2 -> move date -> undo
- five-shape preview -> export -> receipt

### 6.6 Independent review

같은 package를 Codex와 Claude Design에 전달한다.

- Codex: correctness, source/data boundaries, current source, regression
- Claude Design: hierarchy, density, discoverability, visual consistency
- owner: acceptance and readiness decision

독립 검토가 같은 Blocking/High를 재현하면 P28을 닫지 않고 해당 slice로 돌아간다.

## 7. Replan gates

## Gate A - after P28-01

다음이면 architecture를 다시 그린다.

- 선택 대안 score 평균 4.0 미만
- cognitive load 또는 consistency 3 미만
- hard fail 1개 이상
- owner가 current 문제를 그대로 느낀다고 판정

이 gate에서는 component composition을 대폭 바꿀 수 있다. data ownership과 4탭 IA 변경은 별도 승인 없이는 금지한다.

## Gate B - after P28-03

다음이면 save-before implementation을 확장하지 않고 extraction을 먼저 한다.

- route별 adjustment branch가 2개 이상 새로 추가됨
- preview와 receipt count resolver가 분기됨
- 1024에서 fixed 3-pane이 필요함
- title/date/order 수정이 같은 editor contract를 쓰지 못함

## Gate C - after P28-04

다음이면 routine model을 재검토한다.

- workout-only completion state가 남음
- preview horizon과 series end를 같은 field로 저장
- save-before/My Flow/Calendar가 다른 occurrence component 사용
- resource가 completion-like control을 가짐

## Gate D - after P28-05/P28-06

다음이면 library/filter architecture를 다시 설계한다.

- 20 Flow에서 visible selector/control이 12개 초과
- search 없이는 Flow를 찾기 어렵고 search만으로도 browse context가 사라짐
- horizontal overflow 또는 clipped title 발생
- selected Flow identity가 route/query/reload에서 유지되지 않음

## 8. 변경 관리

- 한 slice는 별도 branch/commit/evidence로 관리한다.
- dirty worktree의 사용자 변경을 revert/delete/stage하지 않는다.
- docs-only prototype과 app implementation commit을 분리한다.
- data migration이 필요하면 contract, migration, UI slice를 분리한다.
- release/deploy는 P28-08 전용 승인과 green gate 뒤 수행한다.
- out-of-scope finding은 다음 slice 또는 gated backlog에 기록한다.

## 9. 권장 첫 실행

다음 목표는 P28-01이다. 앱 코드 수정 없이 current/proposed prototype, 1/5/20/50 Flow fixtures, moving/workout/My Flow/Calendar cross-surface simulation, decision matrix를 만든다. P28-01이 끝날 때까지 기존 `P28-01 save-before shell` production 구현을 시작하지 않는다.
