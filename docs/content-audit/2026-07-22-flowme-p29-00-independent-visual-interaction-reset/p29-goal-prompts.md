# P29 복붙용 `/goal` 프롬프트

아래 목표는 순서대로 사용한다. P29-01을 완료하고 evidence를 확인하기 전 P29-02의 공통 rollout을 시작하지 않는다.

## P29-01

```text
/goal

FlowMe P29-01: `/f/moving-d30-basic`의 저장 전 화면을 artifact-first로 재구성하고 저장 후 별도 receipt frame을 만든다.

먼저 읽을 자료:
- docs/content-audit/2026-07-22-flowme-p29-00-independent-visual-interaction-reset/README.md
- docs/content-audit/2026-07-22-flowme-p29-00-independent-visual-interaction-reset/audit.md
- docs/content-audit/2026-07-22-flowme-p29-00-independent-visual-interaction-reset/p29-backlog.md
- docs/content-audit/2026-07-22-flowme-p29-00-independent-visual-interaction-reset/technical-impact.md
- docs/content-audit/2026-07-22-flowme-p29-00-independent-visual-interaction-reset/review.html
- components/flow/FlowSaveBeforeFrame.tsx
- components/flow/FlowArtifactDataPreview.tsx
- components/flow/FlowExecutionPrimitives.tsx
- components/flow/AppClient.tsx
- lib/flow/flow-experience-projection.ts
- tests/e2e/p28-experience-reconstruction.spec.ts

사용자 문제:
- outline과 Calendar preview가 같은 항목을 반복한다.
- 첫 viewport에서 실제 저장 결과보다 row별 수정과 card가 먼저 읽힌다.
- 저장 후에도 저장 전 화면에 머물러 receipt가 분리되지 않는다.
- mobile fixed CTA가 DOM focus order에서 header보다 먼저 잡힌다.

구현 범위:
- `/f/moving-d30-basic`에만 P29 frame을 opt-in으로 적용한다.
- title/source/count 다음에 실제 Calendar artifact preview를 배치한다.
- 전체 Flow outline은 한 번만, disclosure로 제공한다.
- 기본 frame에서 row별 수정 command를 숨기고 contextual `조정` mode에서 제공한다.
- frame당 visible primary action을 1개 이하로 유지한다.
- 저장 성공 후 `SavedReceiptFrame`으로 전환하고 개인 저장 이름, 포함 항목 수, 날짜 범위, source, 다음 행동을 보여준다.
- mobile DOM 순서를 header -> content -> command -> persistent nav로 맞춘다.
- 기존 projection, save payload, localStorage schema를 그대로 사용한다.

비범위:
- 다른 public Flow rollout
- My Flow/Calendar 재설계
- persistence migration
- seed/content 수정
- account/DB, AI/crawler, OAuth
- 4탭 IA 변경

Rollback 경계:
- route-level opt-in 또는 frame version prop로 legacy composition을 유지한다.
- 새 UI가 실패하면 opt-in만 제거해 기존 frame으로 돌아갈 수 있어야 한다.
- projection/persistence function을 fork하지 않는다.

390 acceptance:
- 첫 viewport에 Flow title, source, 24개 범위, Calendar 실제 결과, primary CTA가 보인다.
- adjust 전 row-level `수정` 0개다.
- 저장 후 save-before input/control 0개, receipt heading 1개, primary next action 1개다.
- focus order가 header -> source -> result -> disclosure -> adjust -> save 순서다.

1024 acceptance:
- artifact canvas와 context inspector가 2-column이다.
- outline은 하단에 한 번만 보인다.
- nested card가 없고 save command가 한 번만 보인다.

필수 marker:
- P29-SAVE-BEFORE-PRIMARY-RESULT
- P29-SAVED-RECEIPT-DISTINCT
- P29-MOBILE-FOCUS-ORDER

필수 screenshot:
- p29-01-moving-save-before-390.png
- p29-01-moving-adjust-390.png
- p29-01-moving-receipt-390.png
- p29-01-moving-save-before-1024.png
- p29-01-moving-receipt-1024.png

검증:
- 관련 unit
- targeted P29 E2E
- 기존 P28 E2E
- npm.cmd run docs:check
- npm test
- npm.cmd run build

완료 시 구현 파일, 유지한 P28 계약, screenshot/evidence, 검증 결과, rollback 상태를 보고한다. 자동 QA를 실제 사용자 검증이라고 표현하지 않는다.
```

## P29-02

```text
/goal

FlowMe P29-02: P29-01 artifact-first save-before composition을 public/source-backed Flow 전체에 확장한다.

범위:
- FlowSaveBeforeFrame과 SourceBackedFlowMapPage의 outline/result 중복 제거
- Flow/Calendar/Checklist/Sheet/Memo 다섯 실제 shape에서 primary 1 + secondary 최대 2만 노출
- unsupported/disabled result tab 제거
- row edit는 contextual adjust mode에서만 노출
- source-backed legacy ArtifactWorkbench가 같은 결과를 반복하지 않게 정리
- 390/1024에서 mobile command DOM order 유지

비범위:
- routine 전용 schedule UX
- creator editor
- 새 source ingestion
- persistence/seed/migration

완료 기준:
- 다섯 shape route의 outline은 화면 구조상 한 번만 나타난다.
- 첫 viewport primary action 1개 이하이다.
- source URL/sourceTrace, item count, artifact eligibility가 P28과 같다.
- five-shape screenshot과 unit/E2E가 통과한다.

Dependency: P29-01 완료 evidence.
```

## P29-03

```text
/goal

FlowMe P29-03: 반복 운동·청소 Flow의 설정을 summary-first progressive disclosure로 바꾼다.

범위:
- `월·수·금 · 07:30 · 45분 · 8회` 형태의 compact routine summary
- 다음 3개 occurrence preview
- schedule adjust sheet
- 선택한 weekday/frequency, time, duration, end mode에 필요한 field만 표시
- resource와 execution item 구분
- series와 current occurrence label

비범위:
- recurrence engine 변경
- 운동 analytics/advice
- source content 수정
- migration

완료 기준:
- initial advanced input 0개
- summary가 effective routine projection을 손실 없이 표현
- 한 occurrence 완료/reopen이 series를 mutate하지 않음
- 390/1024 screenshot, mode matrix unit, occurrence E2E 통과

Dependency: P29-01. P29-02와 병렬 가능.
```

## P29-04

```text
/goal

FlowMe P29-04: My Flow를 20개 이상 Flow에서도 스캔 가능한 action-first library/detail workspace로 재구성한다.

범위:
- 390 compact Flow rows, row 전체의 명시적 accessible open action
- next action metadata 우선
- export/archive는 detail 또는 overflow로 이동
- mobile detail: next action -> whole plan -> contextual commands
- wide: 280px library rail -> flexible plan canvas -> 320px inspector
- completion/reopen 위치 일관화

비범위:
- 새 tab/IA
- server search/account/cloud sync
- persistence migration
- 무거운 planner 기능

완료 기준:
- 390에서 최소 8 row/viewport, row당 visible command 최대 1
- 27 fixture 검색 -> 열기 -> item -> 완료 -> reopen -> export 여정 통과
- bottom nav는 main 뒤에 포커스
- wide nested card 0, rail/canvas/inspector 역할이 명확

Dependency: P29-01. P29-03과 병렬 가능.
```

## P29-05

```text
/goal

FlowMe P29-05: Calendar의 Flow scope, selected day, 날짜 없는 항목 배치 composition을 통합한다.

범위:
- 닫힌 상태 compact scope summary
- recent/active grouping과 전체 목록 dialog
- selected-day agenda/inspector
- 390 undated bottom sheet + internal scroll + focus return
- batch date placement/undo
- 1024 rail/calendar/day inspector

비범위:
- calendar engine 교체
- OAuth/direct sync
- recurrence semantics 변경

완료 기준:
- 12 fixture 중 검색·2개 선택 5 interactions 이내
- 닫힌 state scope command 1개
- undated sheet open 시 page scroll/calendar 위치 변화 0
- batch move/undo count 일치
- focus trap/return, 390/1024 screenshot, targeted E2E 통과

Dependency: P29-01, P29-04 command grammar.
```

## P29-06

```text
/goal

FlowMe P29-06: primary/secondary artifact와 전체/선택/현재 export 범위를 실행 전에 예측할 수 있게 만든다.

범위:
- 기존 projection에서 derive하는 ArtifactRecommendationVM
- primary reason, scope, row/event count
- secondary delta와 loss summary
- primary 1 + secondary 최대 2
- whole/selected/current scope를 action label에 포함
- save/export receipt에서 personal copy/source identity 유지

비범위:
- 새 export format
- OAuth
- recommendation AI
- persistence migration

완료 기준:
- five-shape reason/loss policy unit snapshot
- unsupported/disabled shape 0
- preview count = export row/event count
- whole/selected/current E2E와 receipt screenshot 통과

Dependency: P29-02, P29-04, P29-05.
```

## P29-07

```text
/goal

FlowMe P29-07: P29 composition 위에 공통 visual system, responsive contract, keyboard accessibility를 마감한다.

범위:
- typography/density/divider/radius/semantic state token
- card stack과 nested card 정리
- DOM focus order, focus visible, sheet/dialog focus return
- 390/1024/1440 responsive constraints
- fixed UI overlap/safe-area

비범위:
- brand 전면 교체
- animation showcase
- data/IA 변경

완료 기준:
- horizontal overflow/fixed overlap/unnamed focusable 0
- visible label과 accessible name 목적 불일치 0
- contrast gate 통과
- same Flow identity anatomy가 reviewed surface 전체에서 일치
- 390/1024/1440 visual regression과 keyboard journey 통과

Dependency: P29-02~P29-06.
```

## P29-08

```text
/goal

FlowMe P29-08: P29 production integration과 독립 final review를 수행한다.

범위:
- docs check, unit, build, targeted/full E2E
- deploy 후 production smoke
- P29-00 64-state와 동등한 state recapture
- current/proposed screenshot package
- P28 stable contract와 P29 marker reconciliation
- known gap, rollback, publish state 기록

비범위:
- 실제 사용자 관찰을 automation으로 대체
- P30 기능 구현

완료 기준:
- P28 contract regression 0
- P29 marker 전체 pass
- 390/1024/1440 overflow/error/focus gate pass
- screenshot manifest와 production SHA 기록
- observed-user count 0 명시
- legacy frame 삭제 여부는 evidence를 보고 별도 결정

Dependency: P29-01~P29-07.
```
