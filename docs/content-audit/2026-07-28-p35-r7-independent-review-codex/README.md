# FlowMe P35-R7 Codex 독립 검토

- 검토일: 2026-07-28
- 검토 역할: `codex_independent`
- repo: `D:\flowme2605\flow-p35-mece-ux-reset`
- branch: `codex/p35-mece-ux-reset`
- HEAD / `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- observed-user count: `0`
- 앱 코드 변경: 없음
- 최종 verdict: `block_publish`

## 1. 검토 기준

현재 R7은 commit, Preview, production 배포가 없는 dirty worktree다. 따라서 현재
production은 R7 interaction evidence로 사용하지 않았다. 다음 증거를 서로 구분해
검토했다.

- `current_source`: 현재 dirty source와 테스트
- `current_local_production_build`: 현재 source로 만든 production build
- `current_browser_interaction`: 로컬 build를 직접 조작한 결과
- `current_browser_automation`: Playwright 기반 route와 상태 재현
- `current_package_screenshot`: R7 handoff의 5개 형태 x 3세션 및 60 Flow 화면
- `current_automated_test`: 이번 검토에서 다시 실행한 docs, unit, build, targeted E2E
- `heuristic_simulation`: 실제 사용자 없이 수행한 인지·발견성 판단

직접 확인한 route:

- `/flows`
- `/f/moving-d30-basic`
- `/f/vehicle-inspection-prep`
- `/f/curated-allblanc-morning-workout`
- `/f/source-backed-middle-school-math-1`
- `/f/overseas-safety-register`
- `/my`
- `/my?demo=ux60&view=flows`
- `/calendar`

직접 interaction은 390x844과 1440x900에서 수행했고, 1024x768은 현재 package
screenshot, targeted E2E, current source로 교차 확인했다. 최신 R7 Preview는 없어서
외부 Preview interaction은 `inaccessible`이다.

## 2. 전체 verdict

`block_publish`

P35-R7의 큰 방향은 유지할 가치가 있다. public result-first, contextual
personalization, 짧은 receipt, library와 focused workspace의 분리, 날짜 묶음,
scope-first export는 이전 구조보다 명확하다. 따라서 `structural_reopen`은 필요하지
않다.

그러나 현재 반복 Flow는 첫 회차를 완료하면 실제 다음 회차가 있는데도
`남은 회차가 없습니다.`라고 표시한다. 또한 Memo로 추천·저장한 Flow가 개인
workspace에서 일반 할 일 4개와 완료율로 바뀐다. 둘 다 핵심 객체의 의미와 실행
연속성을 훼손한다. 현 후보를 publish하기 전 bounded correctness revision이
필요하다.

## 3. Findings

### [Blocking] 반복 Flow가 첫 회차 완료 뒤 종료된 것으로 보인다

- route: `/f/curated-allblanc-morning-workout` → `/my`
- viewport: 390x844
- 시작 상태: 월·수·금 반복, 시작일 `2026-08-03`, 종료 조건 `계속 반복`
- 재현 단계:
  1. public preview에서 다음 회차 `8/3`, `8/5`, `8/7`을 확인한다.
  2. Flow를 저장하고 개인 workspace를 연다.
  3. `8/3` 회차를 완료한다.
- 기대: 현재 회차가 완료되고 다음 미완료 회차 `8/5`가 같은 영역에 나타난다.
- 실제: `남은 회차가 없습니다.`가 표시된다.
- 사용자 영향: 반복 계획을 한 번 실행한 뒤 더 이상 이어갈 수 없다고 판단한다.
  Calendar·ICS preview와 개인 실행 상태도 서로 다른 계획처럼 보인다.
- evidenceKind: `current_browser_interaction`, `current_source`,
  `current_automated_test`
- source 근거:
  - `components/flow/AppClient.tsx:6080`의 execution projection 끝이 오늘+7일이다.
  - `components/flow/AppClient.tsx:14573`은 이 제한된 projection에서 다음 미완료
    회차를 찾는다.
  - `components/flow/AppClient.tsx:14715`는 없으면 series 상태와 무관하게
    `남은 회차가 없습니다.`를 출력한다.
- 제안: series 정의에서 **다음 open occurrence 하나를 찾는 projection**을
  calendar visible range와 분리한다. 종료 조건에 도달했을 때만 종료 문구를
  표시한다.
- 영향 파일:
  - `components/flow/AppClient.tsx`
  - `lib/flow/effective-routine-projection.ts` 또는 현재 recurrence projection 모듈
  - `tests/e2e/p35-r4-shape-aware-workspace.spec.ts`
  - `tests/e2e/p35-r7-bounded-revision-final-gate.spec.ts`
- rollback: next-occurrence lookup만 이전 범위 projection으로 되돌릴 수 있게
  저장 schema와 occurrence identity는 변경하지 않는다.
- acceptance:
  - `P35-R8-ROUTINE-NEXT-OCCURRENCE`
  - 시작일이 execution horizon 경계에 걸린 fixture에서 첫 회차 완료 후 다음 회차가
    보인다.
  - 완료 취소 시 동일 occurrence ID가 복구된다.
  - series 종료 조건 도달 전에는 종료 문구가 나오지 않는다.

### [High] Memo Flow가 저장 뒤 일반 Todo 진행률로 재해석된다

- route: `/f/overseas-safety-register` → `/my`
- viewport: 390x844
- 재현 단계:
  1. public에서 primary artifact `메모 · 4개`를 확인한다.
  2. 저장 receipt에서 `4개 할 일을 저장했어요`를 확인한다.
  3. 개인 workspace에서 `전체 0/4 완료`와 네 개 checkbox를 확인한다.
- 기대: Memo를 선택했다면 전체 내용·기록·resource 중심 문법이 유지된다. 네 항목을
  완료할 실행 항목으로 볼 근거가 강하다면 public primary를 Checklist로 추천해야 한다.
- 실제: public의 artifact 의미와 receipt/workspace의 실행 문법이 다르다.
- 사용자 영향: 무엇을 저장했는지, 읽거나 기록해야 하는지, 완료해야 하는지 예측할
  수 없다.
- evidenceKind: `current_browser_interaction`, `current_source`,
  `current_package_screenshot`
- source 근거:
  - `lib/flow/artifact-recommendation.test.ts:27`은 해당 Flow를 Memo로 고정한다.
  - 원본 `structure_type`은 checklist인데 primary destination만 memo다.
  - `lib/flow/my-flow-shape-aware-workspace.ts:36`은 saved mode를 Memo로 분류하지만
    전체 계획 row는 일반 completion grammar를 그대로 사용한다.
- 제안: 콘텐츠 결정을 먼저 하나로 고정한다.
  - 네 항목이 출국 전 실행 항목이면 `Checklist` primary, `Memo` secondary로 변경한다.
  - 읽기·기록 자료라면 personal workspace에서 task progress와 checkbox를 제거하고
    `전체 내용`과 개인 기록 문법을 사용한다.
- 영향 파일:
  - `lib/flow/artifact-recommendation.ts`
  - `lib/flow/artifact-recommendation.test.ts`
  - `lib/flow/my-flow-shape-aware-workspace.ts`
  - `components/flow/SavedFlowReceiptFrame.tsx`
  - `components/flow/AppClient.tsx`
- rollback: artifact recommendation 또는 presentation model만 되돌린다. 저장
  데이터와 기존 개인 overlay는 migration하지 않는다.
- acceptance:
  - `P35-R8-ARTIFACT-SEMANTIC-CONTINUITY`
  - public, receipt, workspace, export가 같은 primary 의미를 사용한다.
  - Memo mode에서는 완료율이 나타나지 않거나, Checklist로 바꾼 경우 public부터
    완료 가능한 항목임을 명확히 보여준다.

### [High] 날짜형 workspace가 같은 Item과 완료 control을 두 번 보여준다

- route: `/f/moving-d30-basic` → `/my`
- viewport: 390x844
- 재현 단계:
  1. 이사 Flow를 저장한다.
  2. 저장된 전체 Flow를 연다.
  3. 첫 화면의 `다음 할 일` 날짜 묶음과 바로 아래 펼쳐진 `전체 계획` 첫 날짜를
     비교한다.
- 기대: 현재 실행 묶음은 한 곳에서만 완료를 소유하고, 전체 계획은 맥락·나머지
  구조를 보여준다.
- 실제: 같은 날짜의 같은 네 Item과 checkbox가 두 영역에 반복된다.
- 사용자 영향: 어느 쪽이 현재 상태의 owner인지 불명확하고 화면 길이가 늘어난다.
  같은 항목을 서로 다른 곳에서 완료할 수 있어 실행 집중도가 낮아진다.
- evidenceKind: `current_browser_interaction`, `current_package_screenshot`,
  `heuristic_simulation`
- 제안: 실행 묶음이 열려 있을 때 전체 계획의 동일 그룹은 `현재 실행 중 · 4개`라는
  접힌 요약으로 대체한다. 사용자가 전체 계획을 명시적으로 펼친 경우에도 완료
  control owner는 한 영역만 갖는다.
- 영향 파일:
  - `components/flow/AppClient.tsx`
  - `lib/flow/my-flow-shape-aware-workspace.ts`
  - `tests/e2e/p35-r0-temporal-first-group.spec.ts`
  - `tests/e2e/p35-r4-shape-aware-workspace.spec.ts`
- rollback: duplicate suppression flag만 제거한다. Item identity와 completion
  저장은 바꾸지 않는다.
- acceptance:
  - `P35-R8-SINGLE-COMPLETION-OWNER`
  - 첫 viewport에서 동일 stable Item ID의 visible checkbox는 하나다.
  - 전체 계획에서 현재 그룹의 맥락과 개수는 여전히 확인할 수 있다.

### [Medium] 저장 전 Checklist의 장식 사각형이 완료 checkbox처럼 보인다

- route: `/f/vehicle-inspection-prep`
- viewport: 390x844, 1024x768
- 재현 단계:
  1. 저장 전 Checklist preview를 본다.
  2. 저장 후 개인 workspace의 실제 checkbox와 비교한다.
- 기대: 저장 전 preview는 결과를 읽고 조정하는 상태이며 완료 control로 오해되지
  않는다.
- 실제: `components/flow/FlowArtifactDataPreview.tsx:145`의 `aria-hidden` 사각형이
  저장 후 checkbox와 거의 같은 모양이다.
- 사용자 영향: 저장 전에 완료할 수 있다고 예상하거나, 눌리지 않는 control로
  인식한다.
- evidenceKind: `current_browser_interaction`, `current_source`
- 제안: preview에는 ordinal, bullet, 얇은 guide line처럼 비상호작용 표식을 쓴다.
  저장 후 실행 화면만 checkbox를 소유한다.
- 영향 파일: `components/flow/FlowArtifactDataPreview.tsx`,
  `tests/e2e/p35-r1-artifact-preflight-parity.spec.ts`
- rollback: preview marker CSS만 되돌린다.
- acceptance: `P35-R8-PREVIEW-NOT-COMPLETION`; 저장 전 캡처에서 checkbox로
  읽히는 사각형이 없고 접근성 tree에도 completion control이 없다.

### [Medium] 반복 receipt와 export count가 series와 occurrence를 구분하지 못한다

- route: `/f/curated-allblanc-morning-workout`
- viewport: 390x844, 1024x768
- 재현 단계:
  1. `계속 반복`으로 Flow를 저장한다.
  2. receipt의 `1개 할 일을 저장했어요`와 한 날짜 범위를 본다.
  3. export preflight의 series/event count를 비교한다.
- 기대: `반복 계획 1개`, `예정된 회차 12개`처럼 series와 projection 범위를
  구분한다.
- 실제: 일반 Item count와 한 날짜 receipt가 계속 반복되는 계획 전체로 읽힌다.
- 사용자 영향: 저장 규모와 ICS 결과를 잘못 예측한다.
- evidenceKind: `current_browser_interaction`, `current_package_screenshot`,
  `heuristic_simulation`
- 제안: receipt와 preflight에 shape-aware count label을 사용한다. raw recurrence
  rule은 노출하지 않는다.
- 영향 파일: `components/flow/SavedFlowReceiptFrame.tsx`,
  `components/flow/FlowExportPanel.tsx`, artifact/export presentation tests
- rollback: copy/presentation mapping만 되돌린다.
- acceptance: `P35-R8-ROUTINE-SERIES-OCCURRENCE-COUNT`; 390/1024에서 series와
  projected occurrence count가 계산 없이 구분된다.

### [Medium] 60 Flow library의 `상태` filter가 콘텐츠 형태를 섞는다

- route: `/my?demo=ux60&view=flows`
- viewport: 1440x900
- 재현 단계:
  1. library의 `상태` filter를 연다.
  2. `전체 / 진행 중 / 루틴 / 완료 / 보관됨`을 비교한다.
- 기대: 상태 filter는 lifecycle·진행 상태만 다루고, 콘텐츠 형태가 필요하면 별도
  기준으로 제공한다.
- 실제: `루틴`만 콘텐츠 형태인데 상태 옵션 사이에 놓여 있다.
- 사용자 영향: 필터의 규칙을 예측하기 어렵고 다른 형태를 찾는 방법도 불명확하다.
- evidenceKind: `current_browser_interaction`, `current_package_screenshot`
- 제안: `상태`에서는 루틴을 제거한다. 실제 검색 요구가 확인되기 전에는 형태
  filter를 새로 추가하지 않고 검색과 상태만 유지한다.
- 영향 파일: `components/flow/AppClient.tsx`, My Flow library E2E
- rollback: filter option mapping만 되돌린다.
- acceptance: `P35-R8-LIBRARY-FILTER-ONE-AXIS`; 상태 옵션이 lifecycle 기준으로
  MECE하고 1/60 Flow 모두 같은 규칙을 쓴다.

### [Low] Item detail sheet에 닫기 명령이 중복된다

- route: `/my`, `/calendar`
- viewport: 390x844
- 재현 단계: Item을 열고 sheet header의 닫기와 본문 `실행할 일` 영역의 `닫기`를
  비교한다.
- 기대: sheet close는 header 한 곳과 Escape/backdrop에만 있다.
- 실제: 동일 sheet를 닫는 명령이 두 곳에 보인다.
- 사용자 영향: 작은 화면에서 `할 일 수정`, 메모, 완료보다 닫기가 경쟁한다.
- evidenceKind: `current_browser_interaction`, `current_source`
- 제안: 본문 close를 제거하고 header close, Escape, focus return을 유지한다.
- 영향 파일: `components/flow/AppClient.tsx`
- rollback: 본문 close 조건만 되돌린다.
- acceptance: `P35-R8-DETAIL-SINGLE-CLOSE`; visible close command 하나, Escape와
  focus return 통과.

## 4. Owner 질문 F01-F10

| ID | 판정 | 근거 | 결정 |
| --- | --- | --- | --- |
| F01 public과 saved workspace 시각 문법 | `partly_supported` | 제목·날짜·Item identity는 이어지지만 preview 사각형과 saved checkbox가 혼동되고 row anatomy가 달라진다. | preview는 비상호작용 표식, saved만 checkbox를 사용한다. |
| F02 저장 직후 목적지 | `supported` | receipt가 저장한 전체 Flow의 수량·범위와 `저장한 전체 Flow 보기`를 먼저 제공한다. | Today 중간 화면을 추가하지 않는다. |
| F03 같은 날짜 묶음 | `partly_supported` | 다음 날짜의 미완료 Item을 묶는 방향은 맞지만 전체 계획에 같은 행이 중복된다. | 날짜 묶음은 유지하고 completion owner를 하나로 만든다. |
| F04 저장 전 조정과 export | `supported` | Flow 수준 최소 조정, contextual Item edit, 실제 artifact preflight가 있다. | full editor를 만들지 않는다. |
| F05 완료 후 되돌리기 | `supported` | 행이 실행 묶음에서 사라질 때 snackbar undo가 나타나고, 남아 있는 행은 checkbox로 다시 연다. | 현재 정책을 유지한다. |
| F06 shape-aware 실행 영역 | `partly_supported` | Calendar·Checklist·Sheet는 형태별 첫 단위가 보이나 Routine은 다음 회차가 끊기고 Memo는 실행 문법이 충돌한다. | 두 correctness gap을 publish 전에 수정한다. |
| F07 기록 영역 | `partly_supported` | 실제 기록이 없으면 접혀 있으나 Item 메모, 완료 history, 회고의 관계가 아직 한눈에 분리되지 않는다. | 새 기록 기능은 추가하지 않고 실제 run이 있을 때만 history를 노출한다. |
| F08 60 Flow 규모 | `partly_supported` | 검색·rail·focused canvas는 작동하지만 모든 row가 한 번에 렌더되고 filter 축이 혼합된다. | 먼저 filter 축만 정리하고 virtualization은 실제 성능 증거가 생길 때까지 보류한다. |
| F09 hidden capability | `partly_supported` | Item edit와 whole/selected/current export는 도달 가능하지만 archive/restore와 current export는 상세 disclosure에 있다. | 새 command를 늘리지 말고 Flow 관리와 Item detail owner를 고정한다. |
| F10 서비스 연속성 | `partly_supported` | source/personal identity는 유지되지만 Routine과 Memo에서 surface 의미가 끊긴다. | stable identity는 보존하고 presentation/projection만 bounded 수정한다. |

세부 구조화 결과는 [owner-feedback-matrix.json](./owner-feedback-matrix.json)에 있다.

## 5. 다섯 형태 x 세 세션

| 형태 | Session 1: public | Session 2: receipt/workspace | Session 3: edit/export/reuse | 판정 |
| --- | --- | --- | --- | --- |
| Calendar | 전체 24개와 날짜 구조, 기준일, contextual edit가 보인다. | receipt는 명확하지만 다음 날짜 행이 전체 계획에 중복된다. | 날짜 수정과 whole export identity는 유지된다. | `partial` |
| Checklist | 10개와 preflight count가 보인다. preview 장식이 checkbox처럼 보인다. | 저장 후 실제 checkbox와 완료·다시 열기가 작동한다. | undated Item의 날짜 지정·제거와 checklist export가 이어진다. | `partial` |
| Routine | series summary와 다음 3회가 보인다. | receipt count가 모호하고 첫 회차 완료 뒤 다음 회차가 사라진다. | ICS projection과 personal execution이 불일치한다. | `blocked` |
| Sheet | 8개 행과 Sheet primary가 명확하다. | 현재/다음 행과 전체 진도를 확인할 수 있다. | row 수정과 sheet export가 같은 personal 값으로 이어진다. | `supported` |
| Memo | Memo primary와 4개 내용이 보인다. | receipt와 workspace에서 일반 Todo 완료율로 바뀐다. | memo export는 가능하지만 실행 의미가 불일치한다. | `partial` |

전체 15개 셀은 [journey-scorecard.json](./journey-scorecard.json)에 기록했다.

## 6. Current / proposed hierarchy

상세 anatomy는 [current-proposed-wireframes.md](./current-proposed-wireframes.md)에
정리했다.

### 390px

- 유지: result-first public, 한 종류씩 조정, bottom sheet Item detail, 짧은 receipt,
  날짜 묶음, sticky primary action
- 변경: preview와 completion 표식 분리, 현재 실행 묶음과 전체 계획의 중복 제거,
  Routine next occurrence, Memo semantics, sheet close 하나
- 제거: 같은 Item의 두 번째 visible checkbox, 본문 `닫기`, Memo의 근거 없는
  completion progress

### 1024px

- 유지: public result + contextual inspector, library rail + focused canvas,
  Calendar grid + day detail
- 변경: inspector는 사용자가 Item을 열 때만 점유하고, current group을 전체
  계획에서 요약한다.
- 제거: mobile section을 그대로 늘린 반복 카드와 중복 command

### 1440px / 60 Flow

- 유지: 검색, library rail, selected Flow canvas
- 변경: 상태 filter를 단일 축으로 정리한다.
- 보류: virtualization, 별도 콘텐츠 형태 filter, dashboard. 현재 interaction에서
  correctness blocker로 확인되지 않았다.

## 7. 최종 surface ownership

| 행동 | 최종 owner | 제거할 중복 owner | 데이터 계약 영향 |
| --- | --- | --- | --- |
| 발견·원문 확인 | `/flows`, public `/f` | My Flow의 source 설명 반복 | 없음 |
| 저장 전 Flow 조정 | public `/f`의 bounded adjustment | 별도 full editor | personal overlay 재사용 |
| 저장 전 Item 조정 | public contextual Item sheet/inspector | 모든 row의 inline form | personal structural overlay 재사용 |
| 저장 receipt | 저장 직후 receipt | Today 중간 route | export/save receipt presentation만 |
| 완료·다시 열기 | focused workspace의 현재 실행 단위 | 전체 계획의 동일 Item checkbox | run/occurrence 유지 |
| 날짜 수정 | 공통 Item detail | Calendar와 My Flow의 별도 editor | personal date override 유지 |
| 구조 수정 | Flow workspace의 `여러 할 일 조정` | 행별 구조 명령 반복 | structural overlay 유지 |
| export | public preflight 또는 personal workspace export | 각 행의 상시 export button | whole/selected/current identity 유지 |
| 기록·회고 | 실제 run history, Item 개인 메모 | 비어 있는 기록 shell | run과 memo 유지 |
| archive·restore·delete | Flow 관리 | Item 행·Calendar cell | lifecycle schema 유지 |

## 8. Reference pattern 판정

| 패턴 | 판정 | FlowMe 적용 |
| --- | --- | --- |
| Todoist/Things의 current list와 project 전체 보기 분리 | `adapt` | current execution과 whole Flow를 분리하되 동일 row 중복은 피한다. |
| Google Calendar의 선택일 detail | `adopt` | mobile day sheet, wide agenda/inspector를 유지한다. |
| Notion의 row → page detail | `adapt` | Item detail을 공통 owner로 쓰되 property 전체를 기본 노출하지 않는다. |
| Wanderlog의 날짜별 itinerary grouping | `adopt` | 날짜형 Flow의 같은 날짜 미완료 묶음에 적용한다. |
| Strava/Nike Training의 series/current/history 분리 | `adopt` | 반복 정의, 현재 회차, 지난 실행을 서로 다른 수준으로 표시한다. |
| 외부 제품의 full planner dashboard | `reject` | portable execution layer 범위를 넘는다. |

확인한 공식 reference:

- [Todoist Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs)
- [Todoist projects](https://www.todoist.com/help/articles/introduction-to-projects-TLTjNftLM)
- [Google Calendar event create/edit](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DDesktop&hl=en)
- [Notion database item/page model](https://www.notion.com/help/intro-to-databases)
- [Wanderlog daily itinerary](https://help.wanderlog.com/hc/en-us/sections/5154228681883--Daily-itinerary)
- [Strava Training Log](https://support.strava.com/en-us/articles/15402077-training-log)

## 9. Keep / Change / Defer

### Keep

1. `Flow 찾기 / 캘린더 / 내 Flow` 3개 전역 진입
2. public result-first와 primary 1개, secondary 최대 2개
3. contextual personalization과 full editor 비채택
4. 짧은 receipt에서 전체 Flow로 이동
5. source/personal/run/occurrence/export identity 분리
6. whole/selected/current export preflight

### Change

1. 반복 Flow의 다음 occurrence projection
2. artifact 의미의 public → receipt → workspace 연속성
3. 현재 실행 묶음과 whole-plan 중복 control
4. preview와 completion control의 시각 문법
5. Routine series/occurrence count copy
6. 60 Flow 상태 filter 축
7. Item detail close command 중복

### Defer

1. full editor
2. 별도 goal 객체와 dashboard
3. 60 Flow virtualization
4. 새로운 artifact tab 또는 global navigation
5. account, DB, cloud sync, OAuth
6. 실제 사용자 반응을 가정한 사용량·평점·리뷰

## 10. 데이터·migration 영향

- storage migration: 필요 없음
- source content: 변경하지 않음
- personal overlay: 기존 title/date/memo/include override 유지
- execution run: 기존 completion/reopen identity 유지
- recurrence: series·occurrence identity는 유지하고 조회 범위만 수정
- export: whole/selected/current receipt identity 유지
- 기존 personal copy: 삭제·병합·재저장하지 않음

## 11. 권장 실행 순서

세부 계획과 첫 `/goal`은 [next-program.md](./next-program.md)에 있다.

1. **BR-01 publish blocker**: Routine next occurrence와 series-aware receipt
2. **BR-02 semantic continuity**: Memo/Checklist primary와 saved grammar 정합
3. **BR-03 single execution owner**: 현재 실행 묶음과 전체 계획 중복 제거
4. **BR-04 visual/command cleanup**: preview marker, filter 축, detail close
5. **Final gate**: 5 shapes x 3 sessions, 390/1024/1440, docs/unit/build/targeted+full E2E

첫 bounded slice는 BR-01만 수행한다. 저장 schema, artifact recommendation, 전역 IA,
다른 shape workspace는 비범위다.

## 12. 실제 사용자에게만 확인할 질문

1. 저장 뒤 전체 Flow 확인과 첫 실행 중 어느 쪽을 먼저 기대하는가?
2. 날짜형 Flow에서 `다음 날짜 묶음`이 한 항목보다 실제 준비 행동에 더 유용한가?
3. Memo로 분류된 콘텐츠를 사용자는 읽기 자료, 기록 양식, 완료 목록 중 무엇으로
   인식하는가?
4. 반복 Flow에서 사용자가 먼저 알고 싶은 것은 다음 회차, 주간 횟수, 누적 기록 중
   무엇인가?
5. 20~60개 Flow를 실제로 저장한 사용자가 상태 검색 외에 콘텐츠 형태 filter를
   필요로 하는가?

## 13. 검증 및 publish 판단

이번 검토에서 현재 실행한 검증:

- `npm.cmd run docs:check`: 통과
- `npm.cmd test`: pretest 91/91, unit 590/590 통과
- `npm.cmd run build`: 통과
- P35 R0~R7 targeted Playwright: 25/25 통과
- `git diff --check`: whitespace error 없음, 기존 line-ending warning만 존재

기존 package의 full E2E 381/381은 package evidence이며 이번 실행으로 재표현하지
않는다. 현재 targeted E2E가 통과해도 위 routine journey failure를 검출하지 못했다.
따라서 다음 자동화가 추가되어야 한다.

- 첫 routine occurrence 완료 후 다음 occurrence 확인
- Memo primary와 receipt/workspace command grammar parity
- 동일 stable Item의 visible completion control 단일 owner
- preview marker가 interactive completion으로 보이지 않는지 screenshot assertion

Publish 권고:

- app code 변경: 없음
- commit/push/PR/merge/deploy: 수행하지 않음
- 현재 R7: publish 금지
- BR-01과 BR-02 통과 뒤 bounded candidate 재검토
- 실제 사용자 관찰 완료로 표현 금지
