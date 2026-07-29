# FlowMe P31 — Independent My Flow Review · Audit

**REVIEWER_ROLE**: `claude_design`
**reviewedAt**: 2026-07-24 KST · **reviewedOriginMain**: `555da4e013cc9090b76b78cc81619057409772dc`
**production**: https://flowme2605.vercel.app · **observed-user count**: **0**
**app code 변경**: 없음

> 자동화·screenshot·heuristic simulation은 실제 사용자 검증이 아니다. 아래 판정은 current production screenshot(handoff 6장) + current source(GitHub main: STATUS/PRODUCT_PRINCIPLES + P26~P31 changelog, AppClient 등 source-manifest) + reference pattern 관찰을 근거로 한 **설계 검토**다. 실시간 production interaction/console은 직접 수행하지 않았고 해당 항목은 evidenceKind `inaccessible`로 표기했다.

## 1. current SHA & production 접근

- reviewedOriginMain `555da4e` (P31 뒤 research/harness 보존, 앱 composition 미변경).
- production은 handoff screenshot과 smoke로 접근 확인(overflow/unnamed-focusable/console 0). 단, 1024 My Flow에서 우측 잘림이 관찰되어 F-06으로 재계측 요구.
- current production/current source가 위 SHA보다 앞서면 current를 우선한다(본 검토 시점 차이 없음으로 가정).

## 2. Overall verdict

**`my_flow_structural_reopen`** — My Flow 내부 IA와 화면 composition을 재설계한다. 단 4-tab IA와 데이터 계약(source/personal/run/occurrence/export)은 유지.
**선택 대안: B (Library → Focused Workspace)**. C의 definition/run 분리는 recurrence·long-timeline body에 차용.

근거: 전면 재구성 기준 8개 중 3개 재현(#1 지금/실행 혼동, #2 완료 컨트롤 중복, #7 첫 viewport 과밀) + 기준 #8(A의 복잡도 감소 18.4% < 20% 게이트). 복잡도: current 49 → A 40(−18.4%) → C 33(−33%) → **B 26(−47%)**.

## 3. Severity findings (10건: High 3, Medium 6, Low 1)

### F-01 · High — '지금'과 workspace '실행'이 같은 '오늘 할 일'을 두 문법으로 노출

- **route**: /my (지금 탭) ↔ /my Flow workspace(실행 sub-tab)
- **viewport**: 390x844, 1024x768
- **startState**: 5 Flow 저장, 하나 진행 중
- **reproductionSteps**:
  1. /my 진입 → 상단 탭 '지금'에 cross-Flow 실행 큐
  2. 'Flow 목록' → Flow 열기 → workspace 상단 '실행' sub-tab
  3. 두 곳 모두 같은 Item을 오늘 할 일로 primary 표시
- **expected**: 다음 행동을 볼 곳이 한 곳이어야 한다.
- **actual**: page 탭(지금/Flow목록/완료) 위에 workspace 탭(실행/전체계획/기록)이 중첩. '지금'과 '실행'이 의미상 겹쳐 어느 쪽이 canonical next-action인지 라벨로만 구분.
- **userImpact**: 이어하기·완료를 어디서 할지 매번 판단. 설명 의존(explanationDependencyCount=2).
- **affectedPersonas**: P1, P3, P6, P7
- **evidenceKind**: current_production_screenshot, current_source, heuristic_simulation
- **dataContractImpact**: 없음. UI 역할 재배치만.
- **proposedResolution**: B: '지금' 탭 제거, focused workspace가 next-action 단독 소유. cross-Flow 이어하기는 continue strip이 deep-link.
- **rejectedAlternatives**: A(copy만 정리)는 collision 유지. C는 active run으로 대체하나 단순 콘텐츠 과설계.
- **rollback**: flag myflow_focused_workspace off → P31 탭.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png (continue strip + workspace)
- **acceptanceMarker**: firstViewportDistinctCardTypeCount≤2(library); explanationDependencyCount=0
- **observedUserQuestion**: 사용자가 '지금'과 '실행'을 서로 다른 목적으로 예측하는가?

### F-02 · High — 동일 stable Item의 primary completion 컨트롤 중복 (지금/실행/Home 이어하기)

- **route**: / , /my (지금) , /my workspace(실행)
- **viewport**: 390x844
- **startState**: 진행 중 Item 있는 Flow
- **reproductionSteps**:
  1. Home 이어하기 카드에서 Item 완료 가능
  2. My Flow '지금' 큐에서 같은 Item 완료 가능
  3. workspace '실행'에서 같은 Item 완료 가능
- **expected**: 한 stable Item의 primary 완료는 한 시점에 한 곳.
- **actual**: 같은 run Item이 최대 3 표면에서 동시에 완료 primary를 가짐(actionableDuplicateCount=2).
- **userImpact**: 실수 완료/중복 인지 부하; 완료 상태의 '출처' 혼란.
- **affectedPersonas**: P1, P7, P8
- **evidenceKind**: current_production_screenshot, current_source, heuristic_simulation
- **dataContractImpact**: 없음. 완료 상태는 이미 단일 run에 저장. 컨트롤 소유권만 정리.
- **proposedResolution**: B/S1: focused workspace가 완료 소유; 다른 표면은 deep-link(컨트롤 복제 금지).
- **rejectedAlternatives**: A는 중복 유지. C는 1로 감소하나 완전 제거 아님.
- **rollback**: flag myflow_single_completion_owner off.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png
- **acceptanceMarker**: actionableDuplicateCount=0
- **observedUserQuestion**: 이어하기를 실제로 어디서 하는가(Home/지금/실행)?

### F-03 · High — top-level '완료'와 workspace '기록'이 두 개의 완료 모델처럼 중복

- **route**: /my (완료 탭) ↔ /my workspace(기록 sub-tab)
- **viewport**: 390x844
- **startState**: 일부 완료된 Flow
- **reproductionSteps**:
  1. '완료' 탭 = cross-Flow 완료 history
  2. workspace '기록' = per-Flow 완료/회고
  3. 두 뷰가 유사 정보를 다른 위치에 반복
- **expected**: 완료 상태는 하나의 모델, 뷰만 다르다(Things Logbook / Strava log 원칙).
- **actual**: 완료(cross-Flow)와 기록(per-Flow)이 별도 destination처럼 읽혀 reopenDepth 증가(=3).
- **userImpact**: 완료 Item을 어디서 다시 여는지 예측 어려움.
- **affectedPersonas**: P3, P7
- **evidenceKind**: current_source, heuristic_simulation
- **dataContractImpact**: 없음. 동일 run/completion 상태 참조.
- **proposedResolution**: B: '기록'은 workspace 섹션, '완료'는 동일 run 상태의 cross-Flow 필터 뷰로 명시.
- **rejectedAlternatives**: A는 라벨만. C는 history를 secondary로 두되 모델 통일은 동일.
- **rollback**: S1 flag off.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png (기록 섹션)
- **acceptanceMarker**: reopenDepth≤2; 완료↔기록 단일 run 상태 참조
- **observedUserQuestion**: '완료'와 '기록'을 별개로 기대하는가, 중복으로 느끼는가?

### F-04 · Medium — 열린 Flow의 첫 viewport 과밀 (4 card type / 5 heading / 중첩 탭)

- **route**: /my workspace
- **viewport**: 390x844
- **startState**: Flow 목록에서 Flow 하나 열림
- **reproductionSteps**:
  1. page 제목+subtitle+스튜디오/데이터관리
  2. page 탭 3개
  3. '저장한 계획 관리/저장한 Flow' heading
  4. 열린 Flow 카드 + workspace 탭 3개
  5. '지난 할 일' 행 + '전체 진행' + '전체 계획 보기'
- **expected**: 첫 화면은 다음 행동 하나를 명확히.
- **actual**: firstViewportDistinctCardTypeCount=4, headingCount=5, visibleCommandCount≈11. 다음 행동이 여러 섹션과 경쟁.
- **userImpact**: 첫 실행 지연, 스캔 비용 증가.
- **affectedPersonas**: P1, P4, P6
- **evidenceKind**: current_production_screenshot
- **dataContractImpact**: 없음.
- **proposedResolution**: B: progressive disclosure(다음행동→계획→기록), card type 2로 축소.
- **rejectedAlternatives**: A는 density만 완화(3), 근본 축소 아님.
- **rollback**: S2 flag off.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png
- **acceptanceMarker**: firstViewportDistinctCardTypeCount≤3(workspace); firstActionDepth≤2
- **observedUserQuestion**: 첫 화면에서 사용자가 가장 먼저 시선을 두는 요소는?

### F-05 · Medium — mobile library가 20/60 규모에서 search-first/group 없이 스크롤 의존

- **route**: /my (Flow 목록)
- **viewport**: 390x844
- **startState**: 20~60 Flow (fixture_only)
- **reproductionSteps**:
  1. /my 진입 → flat compact list
  2. 원하는 Flow까지 스크롤
  3. 20개에서 open까지 4 interactions 초과 경향
- **expected**: 규모가 커져도 open ≤3, 검색/그룹으로 좁히기.
- **actual**: mobile 검색이 상시 노출되지 않음. wide는 20+에서 grouped inventory(source P26-08) 있으나 mobile parity 약함. flowOpenDepth@20=4.
- **userImpact**: 대규모 사용자(P6) 탐색 피로.
- **affectedPersonas**: P6
- **evidenceKind**: current_production_screenshot, current_source, heuristic_simulation
- **dataContractImpact**: 없음.
- **proposedResolution**: B/S3: search-first + status/next-date section (mobile 상시 검색).
- **rejectedAlternatives**: A 미해결.
- **rollback**: S3 flag off.
- **acceptanceScreenshot**: screenshots/proposed-B-scale-390.png
- **acceptanceMarker**: flowOpenDepth@20≤3
- **observedUserQuestion**: 실제 사용자가 20/60 규모에 도달하는가? 검색 vs 그룹 우선순위?

### F-06 · Medium — 1024 My Flow: canvas 하단 여백 과다 + 상단 nav/버튼 우측 잘림 (overflow 재확인 필요)

- **route**: /my
- **viewport**: 1024x768, 1440x900
- **startState**: 3 Flow, 하나 선택
- **reproductionSteps**:
  1. 1024에서 /my 진입
  2. library rail + plan canvas 표시
  3. 상단 nav '내 Flow'와 canvas '여러 흐름' 버튼이 우측에서 잘림; canvas 하단 여백 큼
- **expected**: 1024/1440에서 overflow 0, canvas가 목적 있는 콘텐츠로 채워짐.
- **actual**: screenshot상 우측 잘림 관찰. 그러나 handoff smoke는 overflow 0 보고 → 상충. live 계측 필요.
- **userImpact**: wide 사용자 정보 손실 가능/빈 공간으로 정보 밀도 저하.
- **affectedPersonas**: P6
- **evidenceKind**: current_production_screenshot, inaccessible
- **dataContractImpact**: 없음.
- **proposedResolution**: B/S3: library/canvas/inspector 채움 + 1024/1440 overflow 계측·수정.
- **rejectedAlternatives**: A 유지.
- **rollback**: S3 flag off.
- **acceptanceScreenshot**: screenshots/proposed-B-1024.png
- **acceptanceMarker**: horizontalOverflowPx=0 @1024/1440
- **observedUserQuestion**: (계측 항목) 실제 브라우저에서 1024/1440 overflow가 0인가?

### F-07 · Medium — Calendar 왕복 후 scroll/filter/expanded-phase 복구 미입증

- **route**: /my → /calendar → /my
- **viewport**: 390x844
- **startState**: library 스크롤+필터 상태, Flow 선택
- **reproductionSteps**:
  1. My Flow에서 스크롤/필터/Flow 선택
  2. Calendar 이동
  3. My Flow 복귀 → 선택은 URL로 복원되나 scroll/filter/열린 phase는?
- **expected**: 복귀 시 이전 위치/필터/스크롤 유지.
- **actual**: selected Flow는 URL query 보존(source P26-08). scroll/filter/expanded-phase 복구는 미입증(contextLossCount=2).
- **userImpact**: 연속 작업(P6-S2) 흐름 끊김.
- **affectedPersonas**: P2, P6
- **evidenceKind**: current_source, heuristic_simulation, inaccessible
- **dataContractImpact**: 없음(뷰 상태만).
- **proposedResolution**: B/S3: back이 library filter/scroll 명시 복원.
- **rejectedAlternatives**: A 부분.
- **rollback**: S3 flag off.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png
- **acceptanceMarker**: contextLossCount=0 (Calendar 왕복)
- **observedUserQuestion**: scroll/filter 초기화가 실제 좌절을 유발하는가?

### F-08 · Medium — /my 저장 hub와 /calendar hub가 동일 green banner + '첫 할 일 시작' primary를 공유

- **route**: /my (post-save) , /calendar
- **viewport**: 390x844
- **startState**: moving Flow 저장 직후
- **reproductionSteps**:
  1. 저장 → /my receipt: green 'My Flow에 저장됨' + '첫 할 일 시작' + '전체 Flow 보기' + 캘린더/가져가기
  2. /calendar 진입: 동일 green banner + 동일 primary가 반복
- **expected**: 실행 진입점(첫 할 일 시작)은 canonical 한 곳; Calendar는 날짜 배치가 주 역할.
- **actual**: 두 탭이 동일 hub/primary를 반복(cross-surface actionableDuplicate=1). Calendar 고유 가치(날짜 배치)가 hub 아래로 밀림.
- **userImpact**: 어느 탭이 실행의 집인지 모호; 중복 인지.
- **affectedPersonas**: P1, P7
- **evidenceKind**: current_production_screenshot
- **dataContractImpact**: 없음.
- **proposedResolution**: canonical hub 1개(My Flow). Calendar는 날짜 배치/undated tray를 먼저. (cross_tab_ia_reopen 게이트에는 미달 — 지속 competing 아님.)
- **rejectedAlternatives**: cross_tab_ia_reopen: 4탭 재설계는 근거 부족(공유 hub는 B로 해소).
- **rollback**: hub 컴포넌트 소유권 flag.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png / current-calendar-390.png(대조)
- **acceptanceMarker**: 동일 primary CTA가 /my와 /calendar에 동시 노출되지 않음
- **observedUserQuestion**: 저장 직후 사용자는 실행을 어느 탭에서 시작하는가?

### F-10 · Medium — icon/lifecycle 컨트롤의 accessible name 맥락 (라이브 SR 미검증)

- **route**: /my, /calendar
- **viewport**: 390x844 + 200% zoom
- **startState**: 키보드/스크린리더
- **reproductionSteps**:
  1. ⋯ 오버플로, 스튜디오, 데이터 관리, 열기, 완료 체크, 재정렬 등
  2. 각 컨트롤 accessible name에 대상 Flow/Item 맥락 확인
- **expected**: completion/open/edit/delete/reorder/lifecycle 이름이 구분되고 Flow/Item 맥락 포함; focus 순서 header→content→nav.
- **actual**: focus 순서는 source(P30)로 header→workspace→tabs 확인. 이름 맥락/구분은 라이브 SR 미검증(smoke unnamedFocusable=0은 존재 여부만).
- **userImpact**: 보조기기 사용자(P8) 대상 Flow 식별 곤란 가능.
- **affectedPersonas**: P8
- **evidenceKind**: current_source, current_structured_evidence, inaccessible
- **dataContractImpact**: 없음.
- **proposedResolution**: B 컴포넌트에 Flow/Item 맥락 name 규약 명문화; 완료 vs 열기 vs 편집 vs 재정렬 이름 분리.
- **rejectedAlternatives**: —
- **rollback**: aria 라벨 revert.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png (a11y 주석)
- **acceptanceMarker**: unnamedFocusableCount=0; 각 컨트롤 name에 Flow/Item 맥락(SR 관찰로 확정)
- **observedUserQuestion**: SR 사용자가 '열기/완료/⋯'의 대상 Flow를 이름만으로 아는가?

### F-09 · Low — 역할 구분이 copy 설명에 의존

- **route**: /my
- **viewport**: 390x844
- **startState**: any
- **reproductionSteps**:
  1. subtitle '지금 할 일과 저장한 Flow를 관리합니다'
  2. 지금/Flow목록/완료, 실행/전체계획/기록 라벨을 읽어야 역할 파악
- **expected**: 구조가 라벨 없이도 예측 가능.
- **actual**: explanationDependencyCount=2. 라벨/subtitle이 hierarchy 문제를 부분적으로 대신 설명.
- **userImpact**: 신규 사용자 학습 비용.
- **affectedPersonas**: P1, P5
- **evidenceKind**: current_production_screenshot, heuristic_simulation
- **dataContractImpact**: 없음.
- **proposedResolution**: B의 구조 단순화로 설명 의존 제거(copy는 보조).
- **rejectedAlternatives**: A: copy 다듬기(1로 감소).
- **rollback**: copy revert.
- **acceptanceScreenshot**: screenshots/proposed-B-390.png
- **acceptanceMarker**: explanationDependencyCount=0
- **observedUserQuestion**: 라벨을 안 읽고도 다음 행동을 찾는가?


## 4. 24-cell 결과 요약

8 personas × 3 sessions = 24 cells. status: **supported 8, partial 16, hidden 0, missing 0, blocked 0**.
"partial"은 기능이 없다는 뜻이 아니라 *기능은 존재하나 구조가 역할을 흐린다*는 뜻이다(이 검토의 핵심). 상세는 `persona-journey-scorecard.json`, 끊김은 `journey-discontinuity-matrix.json`.

## 5. Reference: 채택/배제

Todoist/Things/Reminders(질문축, undated=별도 상태, Logbook 분리), Notion/TickTick(one object·peek·rail/canvas/inspector), Wanderlog(trip identity + day plan), **Hevy(routine vs run → C 차용)**, Strava(history vs plan)의 *구조 원칙*만 번역. 기능/화면 복제, all-in-one 확장, 가짜 social proof는 배제. 상세는 `reference-pattern-matrix.md`.

## 6. 선택 판정과 근거 · 7. 안정 계약 · 8. 다음 프로그램

- 판정/점수/rollback: `decision-matrix.json`
- 유지 계약: source/personal/run/occurrence/export identity + 4-tab IA (migration 불필요; B는 기존 effective projection 소비)
- 단계별 프로그램(S1~S4, feature flag별 rollback/acceptance): `next-program.md`

## 9. Acceptance screenshot / test marker

actionableDuplicateCount=0 · contextLossCount=0(Calendar 왕복) · flowOpenDepth@20≤3 · firstViewportDistinctCardTypeCount≤2(library) · reopenDepth≤2 · horizontalOverflowPx=0 @390/1024/1440 · unnamedFocusableCount=0 · 완료↔기록 단일 run 상태 참조. proposed 화면: `screenshots/proposed-B-*.png`(review.dc.html에서 캡처).

## 10. 실제 사용자에게 물어야 할 질문

decision-matrix.observedUserQuestions 참조(지금/실행 예측, 이어하기 위치, 완료/기록 기대, 20/60 도달·검색 vs 그룹, Calendar 왕복 좌절, continue strip 적합성).

## 11–12. app code 변경 없음 · observed-user count 0

이 검토는 코드/스키마/의존성을 수정하지 않았고, 실제 관찰 사용자는 0명이다. 위치 실험용 프로토타입 요소는 `가상 데이터 - production 금지`로 표시한다.
