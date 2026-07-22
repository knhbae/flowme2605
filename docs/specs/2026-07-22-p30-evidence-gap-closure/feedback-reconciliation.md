# P30 Feedback Reconciliation

## Evidence 원칙

판단 우선순위는 다음과 같다.

1. current production interaction
2. current production DOM/geometry measurement
3. current package screenshot
4. current source
5. prior design artifact와 reference pattern
6. heuristic simulation

자동화, screenshot, agent simulation은 실제 사용자 관찰이 아니다. 현재 observed-user count는 `0`이다.

## 검토 결과 조정

| 주제 | Claude Design | Codex | 종합 판단 | P30 결정 |
| --- | --- | --- | --- | --- |
| 모바일 export | 직접 production 조작 제한으로 Blocking/High 없음 | public save CTA와 My Flow bottom nav가 export primary를 실제로 가림 | Codex evidence가 더 강함 | P30-01 High |
| 모바일 focus order | package 중심 검토 | `/my`, `/calendar`에서 bottom nav가 main control보다 먼저 focus됨 | 접근성 correctness 문제 | P30-02 High |
| 저장 전 결정 영역 | anchor, 날짜 intent, 조정, primary가 한 번에 보여 밀도가 높음 | 24-item 조정이 full list부터 열림 | 같은 원인의 두 표현 | P30-03에서 decision surface와 long-flow adjust를 함께 정리 |
| My Flow detail | source/archive/export가 next action과 peer command | 저장 결과와 일반 detail의 계층은 개선됐지만 nested export 상태 문제 확인 | action hierarchy를 더 줄여야 함 | P30-04 |
| Calendar scope | monthCount 0의 `다른 Flow`가 길게 펼쳐질 위험 | 12-flow picker는 동작하지만 50+와 undated production evidence 부족 | scale evidence와 composition을 함께 닫아야 함 | P30-05A/B |
| Calendar month cell | 1024에서 긴 제목이 축약돼 비교가 어려움 | selected-day detail에는 full identity가 있음 | grid는 marker/count, detail은 full title 역할 분리 | P30-05C |
| routine advanced mode | `시간 없음 · 종료일 없음` 해석과 advanced density가 남음 | 기능 계약은 안정적이고 오류 evidence는 없음 | 낮은 우선순위, engine 변경 금지 | P30-06 조건부 |
| legacy branch | FlowSaveBeforeFrame에 hybrid/legacy path가 남음 | production regression은 없음 | 유지비 위험이지만 조기 삭제 위험도 있음 | P30-07 gate 후 정리 또는 보류 |

## 현재 확정된 finding

### High 1. Mobile export fixed-layer overlap

- Public route: `/f/moving-d30-basic`, `390x844`
- `public-flow-mobile-save-cta`: y `775..844`
- Calendar export primary: y `804..875`
- My Flow route: `/my?demo=ux20&view=flows`, `390x844`
- `platform-mobile-tabs`: y `774..832`
- export primary: y `817..888`
- User impact: primary action의 일부가 가려지고, 사용자는 export가 비활성인지 스크롤이 필요한지 판단하기 어렵다.
- Evidence: `current_production_interaction`, `current_package_screenshot`

### High 2. Mobile workspace focus order

- Routes: `/my`, `/calendar`, `390x844`
- Actual sequence: header brand/menu -> bottom 4 tabs -> main workspace control
- Expected: header/skip -> current page heading/main control -> remaining content -> persistent bottom navigation
- User impact: keyboard와 screen reader 사용자가 화면 상단에서 하단으로 이동한 뒤 다시 본문 상단으로 돌아온다.
- Evidence: `current_production_interaction`, `current_source`

### Medium cluster. Composition remains denser than the product promise

- Save-before: 실제 artifact가 먼저 보이도록 개선됐지만 결정 영역은 anchor/date intent/adjust/save가 경쟁한다.
- Long Flow adjust: 빠른 제목·날짜 수정도 24개 item list를 먼저 통과한다.
- My Flow detail: next action 아래 source/archive/export command가 같은 무게로 남는다.
- Calendar: 0-count Flow group, undated tray evidence, month-cell identity가 20~50 Flow 규모에서 아직 충분히 닫히지 않았다.
- Evidence: `current_package_screenshot`, `current_source`, `heuristic_simulation`

## 유지할 P29 계약

- artifact-first save-before와 distinct saved receipt
- 한 화면의 primary action 최대 1개
- routine definition과 occurrence execution 분리
- My Flow compact library + detail workspace
- Calendar scope + selected-day agenda + undated placement
- primary artifact 1개 + 의미 있는 secondary 최대 2개
- whole/selected/current export scope와 preflight/receipt
- source, personal overlay, execution run, occurrence, export stable identity 분리
- 4탭 IA와 public `/f` shell

P30은 위 계약을 재작성하거나 migration하지 않는다.

## 수정할 것과 보류할 것

### Revise now

- nested export 상태의 fixed layer collision
- mobile DOM/focus order
- save-before decision surface와 long-flow adjustment progressive disclosure
- My Flow detail command hierarchy
- Calendar deterministic undated fixture, 50+ scope behavior, compact grid identity

### Conditional

- routine advanced setting 문구와 grouping: 실제 screenshot/interaction evidence로 정보 과밀이 확인될 때만 변경
- legacy composition 제거: reviewed route 사용량이 `0`이고 visual diff `0`일 때만 수행

### Defer

- planner 전면 재설계
- schema/persistence migration
- 새 export format
- custom Calendar alias/color 저장 기능
- 5번째 탭, Studio 승격
- account/DB/cloud sync, AI/crawler, OAuth/direct sync
- 실제 사용자 관찰을 자동화로 대체하는 일

## P30 이후 사용자에게 확인할 질문

1. 저장 전 화면에서 실제 결과와 필요한 입력을 한 번에 이해하는가?
2. 24개 Flow에서 제목·날짜·항목 포함 조정 중 원하는 경로를 바로 찾는가?
3. My Flow detail에서 다음 행동과 보조 관리 행동의 차이를 이해하는가?
4. 20~50개 Flow 중 Calendar 범위를 빠르게 좁힐 수 있는가?
5. 날짜 없는 항목 tray를 오류가 아닌 배치 대기 목록으로 이해하는가?
6. month cell의 compact marker에서 Flow identity를 충분히 구분하고, 상세는 agenda에서 확인하는가?
7. routine의 `시간 없음`, `종료일 없음`을 의도대로 해석하는가?

이 질문은 P30-08 자동 gate 통과 후 owner가 관찰 준비 여부를 판단할 때 사용한다.
