# P31 단계별 실행 계획

## 0. 운영 원칙

1. correctness가 깨진 상태에서 시각 rollout을 하지 않는다.
2. 비교 prototype 승인 전 공통 화면을 대량 수정하지 않는다.
3. 한 slice가 완료되기 전 다음 slice를 함께 구현하지 않는다.
4. 발견된 문제가 계획과 다르면 계획을 먼저 수정한다.
5. automated/heuristic evidence를 observed-user evidence로 쓰지 않는다.
6. 각 slice는 rollback 경계와 acceptance screenshot을 가진다.

## 1. P31-00A Evidence And Reference Inventory

앱 코드 변경: 없음

### 목표

현재 production, current source, Claude Design, Codex multi-session review, 공식 인접 서비스 패턴을 하나의 decision matrix로 정리한다.

### 작업

- 390x844:
  - `/`
  - `/flows`
  - 대표 이사
  - 대표 결혼 2종
  - 대표 홈트
  - `/my?demo=ux20&view=flows`
  - `/calendar?demo=ux20`
- 1024x768에서 같은 route 확인
- current source의 component와 state ownership inventory
- Home/Find, card, save-before, My Flow, Calendar, lifecycle별:
  - user question
  - primary action
  - control count
  - focus stops
  - scroll height
  - duplicated content
- P30 Blocking date precedence를 별도 correctness lane으로 격리
- reference pattern은 [reference-patterns.md](./reference-patterns.md)의 차용/비차용 기준으로 기록

### 산출물

- `current-state-matrix.json`
- `reference-decision-matrix.md`
- current screenshot set
- source impact map

### Gate A

Evidence가 부족한 surface는 `unknown`으로 남긴다. 추정으로 구현 목표를 확정하지 않는다.

## 2. P31-00B Comparison Prototype And Simulation

앱 코드 변경: 없음

### 비교할 Home/Find 3안

#### A. 역할 분리형

- Home first-time: 실제 사용 예시
- Home returning: 이어서 하기
- Find: catalog

#### B. 실행 dashboard형

- Home: today/continue/recent only
- Find: 사용 예시와 catalog 모두

#### C. IA 재개봉형

- Home과 Find를 통합
- 남는 tab 역할을 새로 정의

기본 추천은 A다. C는 A/B가 역할 구분 기준을 통과하지 못할 때만 선택한다.

### 비교할 Flow detail 3안

1. current artifact tabs + 현재 setup
2. common skeleton + inline progressive disclosure
3. common skeleton + bottom-sheet adjustment

결혼과 운동 모두에서 같은 순서로 읽히되 결과 종류는 콘텐츠에 따라 달라야 한다.

### 비교할 My Flow 3안

1. current inline expansion
2. dedicated mobile workspace
3. full-screen item-first workspace

### 비교할 Calendar detail 2안

1. current inline detail
2. bottom sheet/full-screen detail

### 시뮬레이션

8 persona x 3 session = 24 cell

| Persona | Session 1 | Session 2 | Session 3 |
| --- | --- | --- | --- |
| 처음 온 이사 사용자 | 발견·source 확인·날짜 입력·저장 | 일정 변경·완료·재개 | export·재사용 |
| 결혼 준비 사용자 | artifact 선택·결과 예측 | Item 조정·Calendar 확인 | 다른 artifact export |
| 홈트 사용자 | 영상 확인·routine 설정·저장 | occurrence 완료·재개 | routine 변경·기록 |
| 날짜 없는 체크 사용자 | 저장·My Flow 실행 | Calendar 배치 | 날짜 제거·복구 |
| 다중 Flow 사용자 | 20개 Flow 탐색 | 특정 Flow workspace | archive·restore |
| Calendar-heavy 사용자 | scope 선택·날짜 확인 | Item sheet 수정 | batch placement·undo |
| 개인 draft 사용자 | 메모 draft·구조 편집 | 일정·완료 | export·삭제·복구 |
| keyboard/저시력 사용자 | 탐색·저장 | My Flow 실행 | Calendar·dialog recovery |

각 cell은 `supported / hidden / partial / missing / blocked`로 분류한다.

### 평가 항목

- 설명 없이 다음 행동을 예측하는가
- primary action이 하나인가
- action label에 결과가 드러나는가
- source/개인화/실행 상태가 섞이지 않는가
- 뒤로 가기·reload 후 맥락이 유지되는가
- 390/1024에서 같은 capability에 도달하는가
- keyboard와 screen reader 이름이 일치하는가

### Gate B

Owner가 current/proposed 390/1024를 비교해 아래를 승인해야 구현한다.

- Home/Find 역할
- card anatomy
- wedding/workout common skeleton
- My Flow navigation model
- Calendar detail layer
- lifecycle vocabulary

승인이 없으면 P31-02~04 구현을 시작하지 않는다.

## 3. P31-00C Decision And Replan

### 결정

- `keep_current`
- `bounded_revision`
- `structural_reopen`

### structural reopen 조건

- Home과 Find의 성공 상태를 3개 이상 persona가 구분하지 못함
- common save-before가 콘텐츠별 예외를 줄이지 못함
- dedicated My Flow가 current보다 interaction depth를 줄이지 못함
- Calendar sheet가 context recovery를 보존하지 못함

### 계획 변경 절차

1. 실패한 가정과 evidence 기록
2. 영향받는 P31 slice 중지
3. 데이터 계약 영향 분석
4. 새 wireframe/prototype
5. 같은 persona cell 재실행
6. 승인 후 plan/tasks 갱신

## 4. P31-01 Effective Date Correctness

앱 코드 변경: 있음  
우선순위: Blocking

### 문제

public save-before adjustment date와 이후 My Flow personal date가 충돌할 때 Calendar/whole ICS가 오래된 날짜를 읽는다.

### 목표

My Flow, Calendar, ICS, list export가 같은 effective date precedence를 읽는다.

### 범위

- 모든 date source inventory
- precedence pure resolver
- public adjustment, current My Flow override, anchor-derived date 구분
- refresh/reload parity
- Calendar/ICS/list export parity
- malformed legacy fallback

### 비범위

- 새로운 date UI
- schema rewrite
- recurrence model 변경

### 완료 기준

- My Flow `2026-08-03`이면 Calendar/ICS도 `2026-08-03`
- stale `2026-08-01` event 0
- source mutation 0
- existing P30 date/occurrence/export tests pass

### Gate C

additive migration 없이는 고칠 수 없다면 구현을 중지하고 migration spec을 먼저 작성한다.

## 5. P31-02 Discovery And Save-Before Simplification

### P31-02A Home/Find Role

- P31-00C 승인안 구현
- first/returning 상태를 분리
- Home의 catalog duplication 제거
- URL/memo entry는 유지
- recent/popular/review는 실제 데이터가 있을 때만

완료 기준:

- Home과 Find의 첫 heading, 첫 action, 성공 상태가 서로 다름
- Home catalog card repetition count 0 또는 승인된 최소 수
- fake social proof 0
- 390 첫 viewport primary 1개

### P31-02B Flow Card Anatomy

- source를 별도 외부 링크로
- representative Item 1~2개
- 번호 목록 제거
- chip budget 최대 1줄
- `Flow 열기` 대신 `더보기`/chevron
- 실제 count와 primary artifact

완료 기준:

- source keyboard activation
- nested interactive violation 0
- card 전체 detail action과 source action 구분
- fake usage/review count 0

### P31-02C Public Entry Grammar

- `/f`와 `/flow-maps`의 같은 콘텐츠가 같은 decision grammar를 사용
- legacy route와 identity는 유지
- shared save-before component 재사용

### P31-02D Wedding/Workout Contextual Artifact

- wedding:
  - primary artifact 1개
  - alternative disclosure
  - artifact change -> preview/input/CTA 동시 변경
- workout:
  - resource와 execution Item 분리
  - compact routine summary
  - next 3 occurrences
  - configuration-driven artifact eligibility

### P31-02E Save-Before Complexity Gate

- first viewport primary <=1
- save primary focus path <=8 stops 또는 동등한 landmark navigation
- initial advanced inputs 0
- current/proposed screenshots

## 6. P31-03 My Flow Execution Workspace And Lifecycle

### P31-03A Dedicated Mobile Workspace

- compact Flow list
- list 선택 -> dedicated workspace
- back restores query/filter/scroll
- `실행 | 전체 계획 | 기록`
- default는 next action
- Item detail sheet/full-screen

완료 기준:

- list와 workspace가 같은 mobile scroll 안에 동시 누적되지 않음
- first viewport 강조 영역 1개
- first viewport interactive control <=8
- default workspace focusable control을 current 대비 50% 이상 감소

### P31-03B Operation Grammar

spec의 lifecycle 동사를 공통 component/copy mapping으로 고정한다.

### P31-03C Archive/Restore Parity

- workspace header overflow에 archive
- archived row direct restore
- reload persistence
- 390/1024 parity

### P31-03D Current Run Adjustment And Reuse

- 현재 실행 조정과 새 실행으로 다시 쓰기 분리
- 날짜 없는 Flow는 날짜 강제 없이 재사용
- 과거 run/회고 보존

### Gate D

`AppClient.tsx` 안에서 상태를 더 추가하는 방식으로는 control/scroll 목표를 달성할 수 없으면 component extraction을 선행한다.

권장 추출 후보:

- `MyFlowLibrary`
- `MyFlowWorkspace`
- `MyFlowItemSheet`
- `MyFlowLifecycleMenu`
- `MyFlowLifecycleDialog`

## 7. P31-04 Calendar View And Placement Modes

### P31-04A Item Detail Sheet

- mobile bottom sheet
- expandable full-screen
- wide inspector 유지
- focus trap, Escape, focus return
- selected date와 agenda scroll 복원

### P31-04B View/Placement Separation

- default: selected-day execution
- Flow scope: filter mode
- undated: placement mode
- batch move/undo는 placement mode에서만

### P31-04C Keyboard And Month Identity

- roving tabindex/skip path
- month cell은 color/count 중심
- selected-day agenda는 full Flow title
- varied-name 50+ fixture

### 완료 기준

- sheet를 열어도 month position과 page scroll 변화 0
- 닫을 때 trigger focus return
- agenda까지 keyboard focus stops <=10
- horizontal overflow/fixed overlap 0

## 8. P31-05 Delete, Export, Accessibility And Complexity Gate

### P31-05A Permanent Delete Contract

먼저 unit contract를 만든 뒤 UI를 연결한다.

- source-backed saved Flow 삭제 범위
- personal draft 삭제 범위
- archive slug 제거
- run/history/reflection 제거
- public source 보존
- 재발견/재저장
- ghost state 0

### P31-05B Advanced Action Disclosure

- export, reflection, correction, reuse, lifecycle를 default execution과 분리
- scope/count를 format보다 먼저 표시
- whole/selected/current parity 유지

### P31-05C Accessibility

- dialog/sheet focus trap
- Escape/cancel/focus return
- visible label과 accessible name 일치
- bottom navigation은 main 뒤
- unnamed focusable 0

### P31-05D 24-Cell Complexity Gate

목표:

- 설명 없이 이해 가능 `>=20/24`
- 설명 필요 `<=4/24`
- 일반 next action `<=2 taps`
- first viewport primary `<=1`
- save focus path `<=8`
- overflow/overlap/text clipping `0`
- source/personal/run/occurrence/export regression `0`

실패하면 release하지 않고 실패 cell 기준으로 P31-00C 재계획 절차를 반복한다.

## 9. Independent Review And Production Closeout

### 독립 검토

- Claude Design: current/proposed hierarchy와 content-shape consistency
- Codex independent: current production interaction, persistence, recovery, projection parity
- 같은 output contract 사용

### 검증

- `npm.cmd run docs:check`
- `npm.cmd test`
- `npm.cmd run build`
- slice targeted Playwright
- 영향이 넓으면 full E2E
- `npm.cmd run security:audit`
- 390x844, 1024x768, 1440x900 screenshots
- production smoke

### publish gate

- CI green
- production SHA 기록
- rollback flag/legacy state 기록
- observed-user count `0` 명시
- 실제 관찰 준비도는 별도 판단

