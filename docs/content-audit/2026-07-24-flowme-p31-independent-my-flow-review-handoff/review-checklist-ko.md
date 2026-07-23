# FlowMe P31 Independent Review Checklist

## 0. 실행 조건

- [ ] 검토자 역할을 `claude_design` 또는 `codex_independent`로 기록했다.
- [ ] 검토 시각과 timezone을 기록했다.
- [ ] production 접근 가능 여부를 기록했다.
- [ ] current `origin/main` SHA를 기록했다.
- [ ] clean worktree 또는 read-only 브라우저 검토 환경을 사용했다.
- [ ] prior evidence 수치를 current 결과로 재사용하지 않았다.
- [ ] observed-user count를 `0`으로 기록했다.
- [ ] 앱 코드, dependency, persistence schema를 수정하지 않았다.

## 1. Evidence 표기

모든 finding과 journey cell에 하나 이상을 붙인다.

- `current_production_interaction`
- `current_production_screenshot`
- `current_source`
- `current_structured_evidence`
- `prior_design_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `inaccessible`

다음 표현은 금지한다.

- 자동화 성공을 “사용자가 쉽게 사용했다”고 표현
- screenshot을 “실제 사용자 관찰”이라고 표현
- prototype 선호를 production 정답이라고 표현
- reference 앱의 기능을 FlowMe에도 필요하다고 바로 결론

## 2. Production route

- [ ] `/`
- [ ] `/flows`
- [ ] `/my`
- [ ] `/calendar`
- [ ] `/f/moving-d30-basic`
- [ ] `/f/vehicle-inspection-prep`
- [ ] `/f/curated-allblanc-morning-workout`
- [ ] `/f/curated-wedding-naver-timeline`
- [ ] `/f/real-mofa-overseas-travel-prep`
- [ ] `/u/my-flow-studio`

각 route에서:

- [ ] hard navigation
- [ ] reload
- [ ] client navigation
- [ ] mobile `390x844`
- [ ] wide `1024x768`
- [ ] representative wide `1440x900`
- [ ] console error
- [ ] page error
- [ ] horizontal overflow
- [ ] fixed/sticky overlap

## 3. My Flow 규모

- [ ] 1 Flow: 저장 직후 확인
- [ ] 5 Flow: 일반 반복 사용자
- [ ] 20 Flow: 검색·filter·workspace open
- [ ] 60 Flow: search-first, group, rendering, context restore

각 규모에서:

- [ ] 원하는 Flow open depth
- [ ] visible row count
- [ ] row당 visible command count
- [ ] 검색 결과의 source/title/date/progress 구별
- [ ] selected Flow identity 유지
- [ ] back 후 filter/scroll 복구
- [ ] archive filter와 restore
- [ ] 완료 Flow와 active Flow 구분

## 4. My Flow 정보 구조

- [ ] `지금`과 workspace `실행` 역할이 다르다.
- [ ] top-level `완료`와 workspace `기록` 역할이 다르다.
- [ ] Flow row가 다음 행동을 선택하는 데 필요한 정보만 준다.
- [ ] Flow open 후 global list와 focused workspace가 경쟁하지 않는다.
- [ ] next action, whole plan, record 순서가 content shape에 맞다.
- [ ] 전체 계획을 보기 전에 같은 Item이 반복 노출되지 않는다.
- [ ] 완료·다시 열기는 한 stable Item에 같은 상태로 연결된다.
- [ ] 수정, export, archive, delete가 completion과 경쟁하지 않는다.
- [ ] source-backed와 personal draft의 문법 차이가 필요한 만큼만 보인다.

## 5. Content shape

### Timeline

- [ ] phase/date group
- [ ] anchor와 personal fixed date
- [ ] 다음 날짜와 전체 범위
- [ ] batch move와 개별 override 차이

### Undated checklist

- [ ] 날짜 없이 실행 가능
- [ ] 날짜 지정入口
- [ ] Calendar undated tray
- [ ] 날짜 제거 후 list 유지

### Routine

- [ ] series summary
- [ ] current occurrence
- [ ] resource와 action 분리
- [ ] occurrence 완료·reopen
- [ ] history와 future occurrence 분리

### Artifact choice / mixed plan

- [ ] primary artifact 1개
- [ ] secondary artifact 최대 2개
- [ ] 선택 전 count/loss 예측
- [ ] timeline/check/resource 구분

### Personal draft

- [ ] add/delete/undo/restore/reorder
- [ ] date/time/recurrence
- [ ] title/memo edit
- [ ] Calendar/export parity

## 6. 주요 행동 depth

다음 행동마다 interaction 수와 찾은 경로를 기록한다.

- [ ] Flow 찾기
- [ ] Flow 열기
- [ ] 첫 Item 완료
- [ ] 즉시 undo
- [ ] 하루 뒤 다시 열기
- [ ] 제목·날짜·메모 수정
- [ ] 전체 Flow 구조 확인
- [ ] 전체 export
- [ ] 선택 export
- [ ] 현재 Item export
- [ ] 보관
- [ ] reload 후 복구
- [ ] 영구 삭제 취소
- [ ] 새 run 시작
- [ ] 이전 run history 확인

## 7. 복잡도 metric

- [ ] `firstViewportDistinctCardTypeCount`
- [ ] `firstViewportHeadingCount`
- [ ] `firstViewportVisibleCommandCount`
- [ ] `firstActionDepth`
- [ ] `flowOpenDepth`
- [ ] `reopenDepth`
- [ ] `itemEditDepth`
- [ ] `wholeExportDepth`
- [ ] `archiveRestoreDepth`
- [ ] `actionableDuplicateCount`
- [ ] `contextLossCount`
- [ ] `horizontalOverflowPx`
- [ ] `unnamedFocusableCount`
- [ ] `explanationDependencyCount`

current와 A/B/C proposed에서 같은 fixture로 측정한다.

## 8. 접근성

- [ ] visual order와 DOM focus order 일치
- [ ] bottom nav가 main content 뒤에 focus
- [ ] 모든 icon button에 tooltip과 accessible name
- [ ] accessible name에 Flow 또는 Item 맥락
- [ ] completion checkbox와 open/edit/delete/reorder 이름 구분
- [ ] Enter/Space 조작
- [ ] Escape cancel
- [ ] sheet/dialog/menu focus trap
- [ ] close 후 trigger focus return
- [ ] error/status live announcement
- [ ] 200% zoom
- [ ] 긴 한국어 제목
- [ ] reduced motion 또는 motion 없이도 상태 이해

## 9. Projection·데이터 정합성

- [ ] source definition은 수정되지 않음
- [ ] personal overlay는 개인 수정만 보유
- [ ] execution run은 completion/reopen 보유
- [ ] recurrence series와 occurrence 구분
- [ ] export identity와 receipt 일치
- [ ] My Flow/Calendar/export effective title 일치
- [ ] effective date와 unscheduled eligibility 일치
- [ ] tombstone/excluded/restore 결과 일치
- [ ] reorder가 stable identity를 바꾸지 않음
- [ ] UI 대안이 별도 임시 ID/count/state를 만들지 않음

## 10. Reference 비교

- [ ] Todoist: Today와 project/context 분리
- [ ] Things: When과 project 영역 분리
- [ ] Apple Reminders: smart list와 원본 list 분리
- [ ] Google Calendar: placement와 detail/edit 역할
- [ ] Notion: one object, multiple view, peek pattern
- [ ] TickTick: list/calendar/detail 역할
- [ ] Wanderlog: day plan과 trip identity
- [ ] Hevy: routine plan과 active workout/run
- [ ] Strava: history/log와 current plan

각 pattern은 다음을 기록한다.

- [ ] FlowMe에 번역할 원칙
- [ ] 그대로 복제하면 안 되는 이유
- [ ] 어떤 persona/session을 개선하는지
- [ ] 데이터 계약 영향

## 11. My Flow 비교 prototype

- [ ] A. P31 Keep And Tighten
- [ ] B. Library To Focused Workspace
- [ ] C. Run-First Workspace
- [ ] 390px current/proposed 비교
- [ ] 1024px current/proposed 비교
- [ ] 1/5/20/60 Flow 결과
- [ ] 6 content shape 결과
- [ ] 24-cell 통과율
- [ ] complexity metric
- [ ] keyboard flow
- [ ] component impact
- [ ] rollout과 rollback

prototype에 가짜 social proof를 넣지 않는다. 위치 실험이 꼭 필요하면 `가상 데이터 - production 금지`를 화면과 audit에 표시한다.

## 12. Finding 형식

각 finding:

```text
id
severity
title
route
viewport
startState
reproductionSteps
expected
actual
userImpact
affectedPersonas
evidenceKind
dataContractImpact
proposedResolution
rejectedAlternatives
rollback
acceptanceScreenshot
acceptanceMarker
observedUserQuestion
```

## 13. 최종 결정

- [ ] `keep_p31`
- [ ] `bounded_revision`
- [ ] `my_flow_structural_reopen`
- [ ] `cross_tab_ia_reopen`

선택한 판정에 대해:

- [ ] current production 근거
- [ ] A/B/C 비교 결과
- [ ] 수정 범위
- [ ] 안정된 계약
- [ ] migration 필요 여부
- [ ] 단계별 implementation slice
- [ ] 실제 사용자 관찰 전제
- [ ] rollback gate
