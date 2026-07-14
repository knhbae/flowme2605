# P24-00B2 Production Design Readiness Audit

## 감사 경계

이 감사는 실제 사용자 관찰 전에 수행한 browser QA와 디자인 대조다. 자동화가 화면 노출, 상태 전환, overflow, console error를 확인할 수는 있지만 사용자의 이해나 선호를 증명하지는 못한다. 따라서 결과는 `ready_with_watchpoints`이며 `validated`가 아니다.

## Claude Design `(8)` 원문 해석

원문은 문제를 설명 문구로 덮지 말고 상태와 조작으로 보여 주라는 방향을 제시한다. 목업 번호는 다음과 같다.

| ID | 목업 방향 | 현재 제품 | 사용자 관찰 질문 |
| --- | --- | --- | --- |
| Pre | 빌드·접근·날짜·저장 정합성 선행 | dependency high 0, 공개 production, 날짜/반복/draft 정합성 회귀 통과 | 결과 날짜나 저장 내용이 실제 예상과 다른가 |
| A | 편집 폼 progressive disclosure | 기본 제목·날짜·시간·메모와 접힌 세부 설정 | 설명 없이 필요한 수정入口를 찾는가 |
| B | 완료와 완료 취소를 제자리에서 | 행 왼쪽 체크, 즉시 실행 취소, 같은 목록의 완료 섹션 | 잘못 완료한 뒤 스스로 되돌리는가 |
| C | 날짜 없는 할 일을 Calendar의 1급 상태로 | 날짜 없음 tray, 선택 배치, 적용 전 범위, undo | Calendar에서 날짜 없는 일을 발견하고 배치하는가 |
| D | Flow-level export와 명시적 범위 선택 | 전체/선택/현재 범위 뒤 destination 선택 | 다운로드 전에 결과 항목 수를 맞게 예측하는가 |
| E | 기준일 연동과 개인 고정 날짜 분리 | 연동/고정 계약, preview, undo, reuse 정책 | Flow 전체 이동과 한 항목 이동을 구분하는가 |
| F | 한 occurrence에 실행 control 하나 | 현재 실행 한 행, 다음 예정은 control 없는 예고 | 같은 일로 오해하거나 다른 행을 찾는가 |
| G | 실행 중 인라인 메모와 완료 시 자동 수집 | 한 번의 메모入口, 내 메모/원본 보완 분리, 완료 시 수집 | 기록과 전달 요청의 차이를 이해하는가 |

## Route 관찰

### `/`

- H1은 `콘텐츠를 일정과 할 일로 저장`이다.
- `URL이나 메모로 Flow 찾기`가 추천 Flow보다 먼저 보인다.
- 390px에서 첫 화면의 visible text는 312자, 전체 높이는 983px다.
- 판정: `ready`. 첫 행동이 단일하고 설명 밀도가 낮다.

### `/flows`

- URL/메모 입력과 `Flow 찾기`가 첫 화면에 있다.
- category와 추천 목록은 입력 다음에 온다.
- 모바일 전체 높이 2009px이나 첫 행동은 above fold다.
- 판정: `ready`. miss draft의 결과 이해는 별도 사용자 여정에서 본다.

### `/f/vehicle-inspection-prep`

- 모바일 첫 화면에서 검사일 설정과 sticky `내 Flow에 저장`이 보인다.
- 저장 이후 실행 preview, Calendar preview, export, 제작자·원문·주의가 순서대로 이어진다.
- 모바일 전체 높이 3204px, visible text 1326자, 접힌 상세 6개다.
- 판정: `ready_with_watchpoint`. 정보가 틀렸다는 근거는 없지만 화면이 길다. 사용자가 첫 행동과 저장 후 결과를 이해하는지 먼저 관찰하고, 단순 길이만으로 콘텐츠 근거를 삭제하지 않는다.

### `/my`

- Today에는 실행 가능한 한 행이 있고 다음 예정은 checkbox 없는 예고다.
- 완료 control과 `열기`, 수정 icon의 역할은 분리되어 있다.
- 모바일 전체 높이 972px, overflow 0이다.
- 판정: `ready_with_watchpoint`. 연필 icon을 사용자가 수정入口로 해석하는지 P1-S1에서 확인한다.

### `/calendar`

- 모바일은 선택일 agenda가 월간 grid보다 먼저 나온다.
- wide는 월간 grid와 선택일 agenda가 두 열로 분리된다.
- Flow 색·라벨, 완료 checkbox, 열기, 수정이 유지된다.
- 판정: `ready_with_watchpoint`. 날짜 없음 tray는 데이터가 있을 때만 나타나므로 P2-S1에서 발견 가능성을 확인한다.

## 시각 완성도 판단

### 유지할 것

- 흰 배경, 검정 typography, 파란 실행 accent의 대비
- 모바일 bottom navigation과 wide top navigation의 역할 일치
- Today 한 행, Calendar agenda-first, Flow-level save CTA
- 8px 이하 card radius와 얕은 border 중심의 restrained surface

### 관찰 후 판단할 것

1. public `/f`의 긴 근거 영역이 신뢰를 만드는지, 행동을 가리는지
2. 편집 icon과 `열기`의 역할이 설명 없이 구분되는지
3. 날짜 없음 tray가 Calendar에서 자연스럽게 발견되는지
4. 전체/선택/현재 export 범위를 결과 개수와 함께 이해하는지
5. 내 메모와 원본 보완 메모가 별도 목적이라고 읽히는지

### 지금 재설계하지 않는 이유

- current production은 정확성·overflow·console 기준에서 안정적이다.
- 목업 A~G의 핵심 interaction은 이미 구현됐다.
- 남은 의문은 대부분 발견성과 인지 부하다.
- 자동화나 디자인 선호만으로 실제 사용자 행동을 대신하면 P24-00B의 목적을 훼손한다.

## 결론

P24-00B1을 시작할 제품·운영·디자인 준비는 갖춰졌다. P24 완료를 주장하려면 실제 15세션, P24-00C 결정, 관찰 기반 Blocking/High 수정, 최종 production 감사가 추가로 필요하다.
