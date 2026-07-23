# P32 My Flow Focused Workspace 단계별 실행 계획

## 1. 전체 목표

P32는 My Flow를 전면적인 planner로 바꾸는 프로그램이 아니다. P31에서 안정된 library/search, whole-Flow reading, completion/reopen, Calendar projection, export scope, lifecycle 계약을 유지하면서 **선택한 Flow 안의 명령을 한 focused workspace로 모으는 구조 수정**이다.

현재 확정된 문제는 다음 세 가지다.

1. 항목 제목·날짜·메모 수정이 6단계다.
2. whole Flow export가 6단계다.
3. archive -> reload -> restore가 6단계다.

P32의 구현은 아래 순서를 바꾸지 않는다.

```text
근거 정합성
-> 비교 승인
-> 한 vertical slice
-> 빠른 수정
-> 기준일
-> export/lifecycle
-> 콘텐츠 형태 rollout
-> 전체 연속성 gate
```

## 2. 사전 기준선

### Production과 source

- production: <https://flowme2605.vercel.app>
- P31 Codex review 기준 SHA: `a2e1d72dadda0104f97682ae662dfbc113a85318`
- P31 production: green
- observed-user count: `0`

각 구현 slice는 시작 시 최신 `origin/main`과 production SHA를 다시 기록한다. 이 계획의 SHA를 미래 실행의 current truth로 간주하지 않는다.

### 유지할 측정값

- 1/5/20/60 Flow open depth: `2`
- horizontal overflow: `0`
- unnamed focusable: `0`
- actionable duplicate: `0`
- P31 full E2E: 병렬 `306/310`, 메모리 실패 4건 직렬 `4/4`

이 수치는 이전 evidence다. 각 slice 완료 시 관련 항목을 현재 실행으로 다시 측정한다.

## 3. P32-01 Evidence, Route, Prototype Gate

### 목적

두 독립 검토가 합의한 B 구조는 유지하되, 서로 다른 수치와 오래된 route를 먼저 정리한다. 앱 UI를 수정하기 전에 무엇을 실제 문제로 볼지 확정한다.

### P32-01A Current Evidence Reconciliation

#### 작업

1. latest origin/main clean worktree와 production SHA 기록
2. `/my` 1/5/20/60 Flow fixture 재실행
3. 다음 depth를 동일 정의로 다시 측정
   - Flow open
   - Item edit
   - whole export
   - archive
   - archive -> reload -> restore
   - completed -> reopen
4. 같은 stable Item의 동시 primary completion control 수 측정
5. `지금`, Flow workspace `실행`, Home 이어하기의 역할과 command 소유권 기록
6. 1024/1440 rail/canvas/inspector overflow와 clipping 재측정
7. Claude/Codex 수치 차이를 `confirmed / not_reproduced / stale / heuristic_only`로 분류

#### 완료 기준

- metric 정의와 재현 단계가 하나의 JSON/MD에 고정
- current production 수치와 heuristic 수치가 섞이지 않음
- 재현되지 않은 finding을 P32 implementation backlog에서 제거하거나 관찰 질문으로 내림

### P32-01B Mixed Shape Route Contract

#### 문제

기존 mixed travel route는 404이고 대체 route는 같은 date/check/resource shape가 아니다.

#### 선택 순서

1. current production 200 route 중 실제로 세 role을 가진 source-backed Flow 검색
2. 없으면 canonical source data로 fixture-only route/state 구성
3. fixture도 의미를 보존하지 못하면 해당 cell을 `blocked`로 명시

#### 금지

- 닫힌 MOFA Flow를 테스트 편의로 재공개
- source 내용을 임의로 추가
- wedding/memo Flow를 mixed travel로 이름만 바꿈

#### 완료 marker

- `P32-MIXED-SHAPE-ROUTE-CONTRACT`

### P32-01C B1/B2 Comparison Prototype

#### 비교안

- B1: global `지금 / Flow 목록 / 완료` 유지, Flow drill-in에서 global tabs 숨김
- B2: `이어서 하기` strip + library, global `지금` 제거

#### 동일하게 비교할 상태

- 1 Flow 저장 직후
- 5 Flow 일반 사용
- 20 Flow 검색 후 열기
- 60 Flow 검색 후 열기
- 완료 Item 다시 열기
- Calendar에서 Item 열고 My Flow로 왕복
- personal draft 구조 편집入口
- routine 다음 occurrence

#### 화면

- 390x844
- 1024x768
- 1440x900

#### 판정 기준

- 사용자 질문이 겹치지 않는가
- Flow open depth `<=2`인가
- first viewport competing primary `<=1`인가
- next action과 whole plan이 한 Flow identity 아래 읽히는가
- back 시 filter/scroll이 복구되는가
- completion owner가 하나인가
- cross-Flow queue를 잃지 않는가

#### 권장 default

B1을 기본으로 검증한다. B2는 B1에서 `지금`과 `다음 행동` 역할 충돌이 current browser evidence로 재현될 때만 선택한다.

#### 결과

- 선택안 1개
- reject 사유
- feature flag/rollback 경계
- P32-02 acceptance screenshot

### P32-01 비범위

- production UI 변경
- schema migration
- 4탭 변경
- source route 공개

### P32-01 종료 조건

P32-01 evidence가 승인되기 전 P32-02 공통 rollout을 시작하지 않는다.

## 4. P32-02 Focused Workspace Vertical Proof

### 목적

선택한 B 변형을 실제 My Flow에 한정 적용해 command hierarchy가 줄어드는지 증명한다.

### P32-02A Component Boundary

현재 `AppClient.tsx`에 있는 다음 책임을 bounded component/helper로 분리한다.

- Flow object header
- next action
- whole plan body
- record summary
- command inspector/menu
- mobile back/context restoration

시각 변경 없는 extraction을 먼저 수행한다. projection과 persistence function은 fork하지 않는다.

### P32-02B Representative Vertical Slice

대표 두 Flow에만 opt-in한다.

1. anchor timeline: `/f/moving-d30-basic` 저장본
2. undated checklist: `/f/vehicle-inspection-prep` 저장본

이 두 route로 날짜/무날짜, source-backed, next action, whole plan, completion, Item open을 함께 검증한다.

### Mobile 구조

- Flow drill-in 중 page-level local tab strip은 숨김
- sticky object header: back, personal Flow title, progress/status, management
- first viewport: next action 1개, whole plan入口, record 요약
- Item row: completion, title, date/role, `열기`
- export/archive는 Item row에서 제거

### Wide 구조

- library rail: Flow 검색/상태/다음 날짜
- plan canvas: object header + next action + whole plan
- inspector: 열린 Item 또는 contextual command
- 같은 action을 canvas와 inspector에 중복하지 않음

### Acceptance

- Flow open depth `<=2`
- first viewport visible command `<=12`
- competing primary `<=1`
- actionable duplicate `0`
- mobile back filter/scroll 복구
- current projection count와 workspace count 일치
- 390/1024/1440 overflow·fixed overlap·unnamed focusable `0`

### Rollback

- route/feature-level opt-in 제거 시 P31 renderer 복구
- data write path는 동일하므로 rollback migration 없음

### Marker

- `P32-MY-FLOW-FOCUSED-COMMANDS`
- `P32-MOBILE-OBJECT-FOCUS`

### 재계획 조건

- command를 줄이기 위해 data model fork가 필요함
- vertical slice에서 depth가 목표를 충족하지 못함
- back 복구가 browser history와 충돌함
- 1024에서 rail/canvas/inspector가 3-column으로 유지되지 못함

## 5. P32-03 Quick Item Edit

### 목적

일반 Item의 제목·날짜·개인 메모를 3단계 이내에서 수정한다.

### 사용자 흐름

```text
Flow workspace
-> Item 열기
-> 제목·날짜·메모 수정 및 저장
```

### 범위

- 기존 contained Item editor 재사용
- mobile: focused sheet/full-screen layer
- wide: inspector
- 제목, fixed date/날짜 없음, 개인 메모 우선
- advanced time/location/recurrence는 접힌 상태 유지
- completion, edit, exclusion, user Item delete 의미 분리

### 데이터

- personal overlay write path 유지
- source Item 원본 불변
- run completion 불변
- stable Item ID 유지
- Calendar/export가 같은 effective value를 읽음

### Acceptance

- `itemEditDepth <=3`
- 저장 후 My Flow/Calendar/export value mismatch `0`
- cancel/dirty guard
- Escape와 focus return
- 완료 상태, order, occurrence identity 손실 `0`
- source-backed 원본 mutation `0`

### Marker

- `P32-ITEM-QUICK-EDIT`

### 비범위

- source structure edit
- universal property editor
- recurrence schema 변경

## 6. P32-04 Flow Anchor Adjustment

### 목적

저장한 이사 Flow의 전체 이사일/기준일을 다시 조정하되 개인 fixed date와 memo를 보존한다.

### 사용자 흐름

```text
Flow workspace
-> Flow 설정 또는 기준일
-> 새 이사일 확인
-> 영향 범위 preflight
-> 적용
```

### preflight

- 바뀌는 anchor-linked Item 수
- 유지되는 personal fixed date 수
- 날짜 없음 Item 수
- 과거 run과 완료 기록 보존
- 새 Calendar 범위

### 규칙

- Flow anchor와 Item fixed date를 구분
- anchor-linked date만 재계산
- personal fixed date와 memo는 유지
- 과거 execution run은 수정하지 않음
- current source/personal/run identity 유지

### Acceptance

- public moving 저장본에서 Flow-level anchor command visible
- anchor 변경 후 fixed date/memo loss `0`
- My Flow/Calendar/ICS/list export parity
- reload persistence
- old run mutation `0`

### Marker

- `P32-ANCHOR-RECALCULATION`
- `P32-PERSONAL-FIXED-DATE-PRESERVED`

### 중단 조건

기존 projection/resolver로 규칙을 표현할 수 없고 migration이 필요하면 즉시 중단하고 별도 승인 요청.

## 7. P32-05 Export And Lifecycle Command Unification

### 목적

Flow-level command inspector에서 가져가기와 lifecycle을 예측 가능하게 제공한다.

### Export

- scope 먼저: `Flow 전체 / 직접 선택 / 현재 항목`
- destination별 count와 손실을 실행 전에 표시
- action label에 scope와 결과 포함
- existing `buildFlowExportScopePlan`과 receipt 재사용
- unsupported destination은 숨김

Acceptance:

- `wholeExportDepth <=3`
- preview count = output count
- selected/current stable Item identity 유지
- duplicate row/event `0`

### Lifecycle

활성 Flow:

- management menu에서 `보관`
- 보관 후 즉시 undo

보관된 Flow:

- library row 직접 `복구`
- archived detail danger zone에서만 `이 기기에서 영구 삭제`
- source-backed public source 보존
- personal draft는 draft 구조 포함 삭제 문구 사용

Acceptance:

- active archive depth `<=3`
- archive -> reload -> restore `<=4`
- permanent delete -> reload ghost personal state `0`
- source-backed Flow rediscovery 가능
- dialog Escape/cancel/focus return

### Marker

- `P32-EXPORT-SCOPE-ENTRY`
- `P32-LIFECYCLE-DISCLOSURE`
- `P32-PERMANENT-DELETE-BOUNDARY`

### 비범위

- 새 export format
- archive/delete 의미 통합
- cloud trash

## 8. P32-06 Six-Shape Rollout

### 목적

vertical proof를 여섯 콘텐츠 형태에 확장하되 route별 별도 workspace를 만들지 않는다.

### Shapes

1. anchor timeline
2. undated checklist
3. recurrence routine
4. artifact choice
5. mixed date/check/resource
6. personal draft

### Rollout 순서

```text
anchor timeline + undated checklist
-> recurrence routine
-> artifact choice
-> personal draft
-> mixed shape (P32-01 route contract가 유효할 때)
```

### 콘텐츠별 확인

#### Routine

- series definition과 next occurrence/current run 분리
- occurrence completion/reopen owner 1개
- history는 record body
- 운동 분석 UI 추가 금지

#### Artifact choice

- primary artifact 1개
- secondary 최대 2개
- destination count와 loss
- 5개 card/tab 상시 노출 금지

#### Personal draft

- quick value edit와 structure mode 분리
- add/delete/restore/reorder는 existing structural overlay 사용
- source-backed Flow에는 구조 edit controls 0

#### Mixed

- date/check/resource 역할을 별도 row semantics로 표시
- resource에 completion control 없음

### Acceptance

- 각 shape explanation dependency `0`
- completion owner `1`
- source/personal/run/occurrence/export mismatch `0`
- route-specific identity fork `0`
- shared shell block보다 예외 block이 많아지지 않음

### Marker

- `P32-SIX-SHAPE-FOCUSED-WORKSPACE`
- `P32-SINGLE-COMPLETION-OWNER`

## 9. P32-07 Continuity, Accessibility, Final Gate

### 목적

P32를 기능 완료가 아니라 cross-session continuity와 회귀 기준으로 닫는다.

### Continuity

- My Flow library query/filter/scroll
- selected Flow
- selected Item
- Calendar scope/date
- export receipt identity
- archive filter
- browser back/forward
- reload

### 규모

- 1 Flow
- 5 Flow
- 20 Flow
- 60 Flow fixture-only

### 24-cell

8 persona x 3 sessions를 재실행한다.

1. anchor timeline
2. undated checklist
3. recurrence routine
4. artifact choice
5. mixed shape
6. personal draft
7. completion/history
8. archive/delete/reuse

세션:

- S1 save/open/understand
- S2 edit/execute/Calendar/export
- S3 return/reopen/archive/restore/reuse

### Viewport

- 390x844
- 1024x768
- 1440x900

### 접근성

- DOM focus order
- visible focus
- accessible name
- Enter/Space
- Escape
- dialog/sheet focus trap
- close/back focus return
- keyboard-only quick edit/export/archive/restore

### 최종 명령

- `npm.cmd ci`
- `npm.cmd run docs:check`
- `npm.cmd test`
- `npm.cmd run build`
- targeted P32 E2E
- affected P31/P30 E2E
- full E2E
- `git diff --check`

### 최종 marker

- `P32-CONTEXT-RESTORE`
- `P32-FINAL-24-CELL-GATE`
- `P32-IDENTITY-REGRESSION-COUNT-0`

### 완료 판정

- confirmed Blocking/High `0`
- 목표 depth 달성
- overflow/fixed overlap/unnamed focusable/console/page error `0`
- 24-cell 결과와 evidenceKind 분리
- observed-user count `0` 명시
- production SHA, deploy, rollback 상태 기록

## 10. P32-OPS Security Lane

P32 UX와 병렬 조사할 수 있으나 별도 change set으로 처리한다.

1. advisory와 dependency chain 확인
2. compatible patched version 존재 여부 확인
3. Next downgrade 없는 upgrade plan
4. unit/build/full E2E
5. critical/high `0`
6. rollback lockfile 보존

`npm audit fix --force`는 사용하지 않는다.

## 11. 계획 변경 규칙

### 작은 계획 수정

다음은 같은 slice 안에서 plan을 갱신할 수 있다.

- component boundary 조정
- screenshot fixture 변경
- copy/label 조정
- view-only body grouping 변경

### owner 재승인 필요

다음은 구현을 멈추고 별도 승인받는다.

- global 4탭 변경
- `지금` 제거가 cross-Flow queue 기능 제거를 동반
- localStorage schema migration
- source/personal/run/occurrence/export identity 변경
- Calendar 전체 재설계
- 새 external integration
- generic planner/editor 도입

## 12. 최종 산출물

각 slice마다 다음 evidence folder를 만든다.

```text
docs/content-audit/YYYY-MM-DD-p32-XX-<slug>/
  README.md
  audit.md
  route-evidence.json
  screenshots/
```

필요한 slice는 추가로 아래를 포함한다.

- interaction-metrics.json
- journey-scorecard.json
- decision-matrix.json
- export fixtures/downloads
- rollback.md

P32 final package:

```text
docs/content-audit/YYYY-MM-DD-p32-final-review-package/
  README.md
  audit.md
  review.html
  route-evidence.json
  journey-scorecard.json
  interaction-metrics.json
  decision-matrix.json
  screenshots/
```
