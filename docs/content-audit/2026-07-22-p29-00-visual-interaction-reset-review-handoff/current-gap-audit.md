# P29-00 Current Gap Audit

## 1. 판정

P28은 기능과 데이터 계약을 닫았지만 사용자가 체감하는 변화는 제한적이다. 화면이 깨졌거나 기능이 없는 문제가 아니라, 새로운 구조가 기존 card, border, chip, label 문법 안에 들어가면서 **무엇을 먼저 보고 무엇을 조작해야 하는지**가 충분히 달라지지 않은 문제다.

현재 가설은 `coordinated_surface_reset_required`다. 데이터 계약과 4탭 IA를 유지하면서 save-before, My Flow, Calendar, result choice의 composition을 함께 재설계해야 한다.

## 2. 확인된 사실과 해석

| Surface | 현재 확인된 사실 | UX 해석 | Evidence |
| --- | --- | --- | --- |
| public save-before | whole outline, 실제 result, row edit가 연결됨 | 기능은 충분하지만 긴 문서와 설정 폼처럼 읽힘 | current_package_screenshot, current_source |
| routine | 주 N회, 시간, duration, 종료 조건이 공통 계약으로 저장됨 | 한 화면에 설정이 누적돼 시작 전 부담이 큼 | current_package_screenshot, current_source |
| My Flow | 모바일 drill-in, wide rail/detail, 검색이 연결됨 | 선택된 Flow에서 지금 해야 할 행동보다 상태 label과 보조 정보가 경쟁함 | current_package_screenshot |
| Calendar | 6개 이상 searchable multi-select picker 사용 | 가로 chip은 사라졌지만 많은 Flow의 찾기, 최근 사용, scope 확인은 picker에 의존 | current_package_screenshot, current_source |
| five shapes | Flow, Calendar, Checklist, Sheet, Memo가 actual rows를 렌더링 | 결과가 별도 preview block으로 보이며 선택, 손실, 다음 행동의 연결이 약함 | current_package_screenshot, current_source |
| cross-surface | 같은 effective item과 stable identity 사용 | data continuity는 있으나 visual continuity가 약해 다른 도구처럼 보일 수 있음 | current_source, heuristic_simulation |

## 3. 화면별 핵심 문제

### 3.1 저장 전 workspace

현재 화면은 `출처와 제목 -> 전체 outline -> 실제 결과 -> 조정 -> 저장/export`를 모두 제공한다. 그러나 모바일에서는 이 모든 층이 세로로 이어지고 각 층이 비슷한 카드 무게를 가진다.

검토할 대안:

- 한 화면 안에서 `결과 확인`과 `내 상황에 맞추기`를 명확한 mode 또는 progressive step으로 나눈다.
- outline은 모든 항목을 같은 row로 펼치기보다 단계 summary와 대표 항목을 먼저 보여준다.
- 수정 control은 row마다 반복하기보다 selection과 contextual command bar를 조합한다.
- 저장 CTA는 “내 Flow에 저장”만 말하지 않고 현재 결과와 다음 위치를 보여준다.

단, 저장 전 full planner를 만들거나 source를 personal value로 덮어쓰면 안 된다.

### 3.2 Routine setup

P28은 홈트 전용 완료 UI를 제거하고 routine schedule을 공통화했다. 남은 문제는 frequency, weekday, time, duration, end condition이 한 번에 노출되는 density다.

검토할 대안:

- 기본값을 `주 3회 · 오전 7시 · 종료 없음` 같은 한 줄 summary로 보여주고 수정할 때만 세부 control을 연다.
- 빈도와 종료 조건을 분리해 첫 저장에 꼭 필요한 값만 요구한다.
- 실행 회차의 완료, skip, hold는 schedule definition과 같은 화면에 동시에 펼치지 않는다.
- resource는 공통 item detail 안에 두고 운동만의 별도 CTA처럼 보이지 않게 한다.

### 3.3 My Flow

My Flow는 library/detail 구조를 얻었지만 사용자가 “오늘 무엇을 할지”, “전체 계획을 볼지”, “조정할지”를 한눈에 선택하는 주 행동이 약하다. 카드와 label이 많아 화면 목적이 다시 흐려질 수 있다.

검토할 대안:

- library row는 제목, 다음 일정, 진행/상태, source trust 정도만 남긴다.
- detail은 `다음 행동`, `전체 계획`, `조정`, `가져가기`의 우선순위를 명확히 한다.
- 같은 날짜 항목은 date group으로 묶되 Flow와 item identity가 사라지지 않게 한다.
- 완료 취소와 실행 중 수정은 별도 설정 페이지가 아니라 실행 맥락에서 찾을 수 있게 한다.
- 모바일과 wide가 서로 다른 제품처럼 보이지 않도록 공통 information order를 유지한다.

### 3.4 Calendar

검색 가능한 picker는 12개 Flow의 가로 과밀을 해결했다. 다음 과제는 large library에서 scope를 빨리 바꾸고, 선택된 범위를 계속 인지하며, 날짜 없는 일을 자연스럽게 배치하는 것이다.

검토할 대안:

- recent, active, selected group을 picker 안에서 구분한다.
- grid 위에는 선택 결과만 짧게 유지하고 관리 UI를 계속 펼치지 않는다.
- selected-day agenda, unscheduled tray, Flow scope가 같은 화면 목적을 놓고 경쟁하지 않게 한다.
- mobile과 wide에서 Flow label, date, completion, open action의 hierarchy를 통일한다.

### 3.5 Five result shapes

P28은 actual-data renderer를 연결했지만 사용자는 여전히 “왜 이 결과가 기본인지”, “다른 결과로 바꾸면 무엇이 사라지는지”, “저장과 export 중 무엇을 해야 하는지”를 명확히 비교하기 어렵다.

검토할 대안:

- primary result를 실제 데이터 preview와 함께 먼저 제시한다.
- secondary result는 최대 2개만 compact alternative로 둔다.
- shape를 바꿀 때 item/event/row 수, 날짜 포함, memo/source 보존, 실행 상태 미포함을 짧게 보여준다.
- 결과 선택과 저장 후 receipt를 같은 vocabulary로 연결한다.

## 4. Cross-surface reset에서 유지할 계약

다음은 시각 개선을 이유로 다시 설계하지 않는다.

- source content는 immutable하다.
- personal overlay와 execution run은 분리한다.
- routine series definition과 occurrence execution은 분리한다.
- stable item/event/export identity를 유지한다.
- Calendar, My Flow, export는 같은 effective projection을 읽는다.
- public `/f`, My Flow, Calendar의 역할과 4탭 IA를 유지한다.
- 적용되지 않는 artifact를 비활성 tab으로 늘어놓지 않는다.

## 5. P29-00에서 비교할 세 대안

### A. Token polish

- typography, spacing, color, radius, border만 조정
- 구현 위험은 낮지만 hierarchy와 interaction depth는 거의 그대로
- acceptance: current DOM/composition 유지

### B. Coordinated surface reset

- save-before, My Flow, Calendar, result choice를 shared grammar로 재구성
- 데이터와 IA는 유지하고 component composition, disclosure, command hierarchy를 변경
- acceptance: 5개 persona journey에서 같은 Flow의 상태와 다음 행동이 연속적으로 보임

### C. Planner rewrite

- editor, calendar, execution, export를 하나의 heavy workspace로 통합
- 현재 제품 방향과 범위를 벗어나므로 명확한 반증 없이는 채택하지 않음

Reviewer는 A/B/C를 점수화하고 하나를 선택하거나 B의 범위를 수정해야 한다.

## 6. 다음 구현을 승인하기 위한 조건

P29-01 구현 전에 최소한 아래가 필요하다.

1. 390, 1024, 1440의 current/proposed wireframe
2. save-before -> saved receipt -> My Flow -> Calendar의 한 persona continuity map
3. shared visual grammar의 component inventory
4. progressive disclosure와 command priority 규칙
5. 기존 data contract를 변경하지 않는 구현 경계
6. acceptance screenshot 목록과 targeted E2E marker
7. 한 번에 구현할 첫 vertical slice와 rollback 경계

## 7. 아직 사람에게 확인해야 할 가설

- long Flow의 5개 요약과 전체 보기가 충분히 신뢰를 주는가
- routine summary를 먼저 보여주면 사용자가 세부 종료 조건을 놓치지 않는가
- My Flow의 “다음 행동” 중심 구조가 library 탐색보다 실제로 더 중요한가
- primary result 추천 이유를 사용자가 납득하는가
- Calendar picker의 recent/active grouping이 50개 이상에서 도움이 되는가

이번 독립 검토는 이 가설을 설계 입력으로 만들 수 있지만 observed-user evidence로 바꾸지는 않는다.
