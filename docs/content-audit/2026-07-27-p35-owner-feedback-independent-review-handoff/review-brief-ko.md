# P35 사용자 피드백 독립 검토 브리프

## 1. 제품 목표

FlowMe는 캘린더, 할 일 앱, 노션을 대체하는 무거운 planner가 아니다.

```text
원문 URL 또는 메모
→ 실행 가능한 전체 결과 확인
→ 필요한 최소 개인화
→ FlowMe에 저장하거나 기존 도구로 가져가기
→ 실행·완료·다시 열기
→ 수정·기록·재사용
```

를 연결하는 portable execution layer다.

따라서 화면이 기능을 많이 담는 것보다 다음 질문에 명확하게 답해야 한다.

- 무엇이 만들어지는가?
- 지금 무엇을 바꿀 수 있는가?
- FlowMe에 남길 것인가, 기존 도구로 가져갈 것인가?
- 저장한 뒤 어디에서 무엇을 실행하는가?
- 완료와 기록을 어떻게 다시 찾는가?

## 2. P35가 해결하려고 한 문제

P35 이전에는 Home, Flow 찾기, public Flow, 저장 receipt, My Flow, Calendar가
서로 다른 문법을 사용했고 한 화면에 설명, 카드, 조정, 실행, export가 겹쳤다.

P35는 다음 가설로 이를 줄였다.

| 가설 | 현재 구현 |
| --- | --- |
| Home과 Flow 찾기 중복 제거 | `/`를 저장 상태 기반 router로 사용 |
| 결과보다 설명이 먼저 보이는 문제 | public Flow에서 primary artifact와 실제 개수를 먼저 표시 |
| 저장 전 편집기 과밀 | 이름, 기준일, 포함 항목, 반복 중 한 종류만 열기 |
| My Flow의 긴 단일 화면 | library와 focused workspace 분리 |
| Calendar의 역할 과다 | 날짜가 있는 항목의 조회·완료·Flow 열기만 소유 |
| export 범위 불명확 | whole/selected/current 범위와 개수를 형식보다 먼저 표시 |

이 가설은 자동화 기준을 통과했지만 실제 이해도는 검증되지 않았다.

## 3. 이번 피드백의 해석

사용자 피드백은 확정 요구사항이 아니라 현재 후보안에서 드러난 불편과 기대다.
검토자는 그대로 찬성하지 말고 원인, 대안, 부작용을 확인해야 한다.

### F01. 저장 전 항목 상세와 날짜 수정

현재 public `Flow 조정`은 이름, 기준일, 포함 여부, 반복 요약까지만 다룬다.
항목 제목·상세 메모·개별 날짜는 저장 후 개인 Flow의 Item detail이 소유한다.

검토 질문:

- 사용자는 저장 전에 어느 정도까지 결과를 자기 것으로 만들어야 확신하는가?
- 항목 행을 누르면 제목, 상세, 날짜를 바꾸는 contextual sheet를 여는 것이 충분한가?
- source-backed 원본과 personal proposal을 명확히 구분하면서 수정 결과를 즉시 preview할 수 있는가?
- 항목 추가·삭제·순서 변경까지 같은 단계에 넣으면 full planner가 되는가?

검토할 대안:

- A. 현재처럼 저장 전에는 최소 조정만, 상세 편집은 저장 후
- B. 저장 전 contextual Item edit로 제목·상세·날짜만 허용
- C. 저장 전 full editor 제공

기본 가설은 B지만, 실제 행동 깊이와 복잡도로 검증해야 한다.

### F02. 저장 직후 오늘 할 일 보기

현재 receipt는 전체 항목 수와 결과 형태를 보여 주고 `내 Flow에서 시작`을 primary로
제공한다. 별도 `오늘` view는 없지만 primary 이동 뒤 focused workspace의
`다음 행동`이 먼저 열린다.

검토 질문:

- 저장 직후 사용자가 먼저 확인할 것은 저장된 전체 구조인가, 오늘 실행할 항목인가?
- 오늘 항목이 없는 Flow에서도 같은 CTA가 자연스러운가?
- receipt는 축하 화면이 아니라 저장 검증과 경로 선택을 위한 짧은 router여야 하는가?
- `전체 결과 확인`, `첫 실행 열기`, `캘린더에서 보기`, `외부로 가져가기` 중 무엇을
  primary로 삼아야 하는가?

### F03. 같은 날짜의 다음 할 일 묶음

현재 focused workspace의 `다음 행동`은 `getSavedFlowNextRow` 한 건을 우선한다.

검토 질문:

- 이사·여행처럼 같은 날짜에 여러 항목이 있는 Flow는 한 날짜 묶음을 보여 줘야 하는가?
- 날짜 없는 체크리스트와 학습 Sheet에도 날짜 묶음 규칙을 강제하면 어색한가?
- routine은 `오늘 occurrence`와 그 안의 실행 항목을 어떻게 묶어야 하는가?

권장 비교:

- 날짜형: 다음 날짜의 모든 미완료 항목
- 날짜 없는 체크형: 다음 1~3개 또는 사용자가 고른 현재 항목
- routine: 현재 occurrence 한 묶음
- sheet/progress: 현재 위치와 바로 다음 행

### F04. 저장 전 artifact와 외부 가져가기

현재 P35는 public Flow에서 primary artifact 하나를 보여 주고 secondary export를
주로 저장 후 개인 Flow의 `가져가기`로 옮겼다.

사용자 피드백은 저장 전 preview에서 자연스러운 artifact를 확인한 뒤
`FlowMe에 저장` 또는 `내 캘린더·할 일·표·메모로 가져가기`를 선택할 수 있어야
한다는 방향이다.

검토 질문:

- portable execution layer라면 외부 가져가기가 저장 이후에만 있어야 하는가?
- 다섯 고정 탭을 되살리지 않고 eligible artifact 1~3개를 어떻게 제시할 것인가?
- 저장과 외부 가져가기가 서로 경쟁하는 두 primary action이 되지 않게 할 수 있는가?
- 외부로만 가져간 경우 FlowMe의 완료·기록·재사용 가치는 어떻게 설명할 것인가?

검토할 대안:

- A. 현재 방식: FlowMe 저장 후 가져가기
- B. preview에서 `FlowMe에 저장`과 `외부로 가져가기`를 동등하게 제공
- C. artifact preflight를 먼저 확정하고, 다음 단계에서 저장 위치를 선택

기본 비교 후보는 C다. 다섯 형태를 모두 강제로 노출하지 않고 primary 1개와
eligible secondary 최대 2개만 사용한다.

### F05. 완료 후 되돌리기 조건

완료 체크 자체가 같은 화면에 남아 다시 해제할 수 있다면 별도 snackbar는 중복일 수 있다.
반대로 완료와 동시에 현재 목록에서 사라지면 사용자는 체크를 되돌릴 경로를 잃는다.

검토할 정책:

| 결과 | 권장 복구 방식 |
| --- | --- |
| 같은 행이 남음 | 체크박스 자체로 다시 열기, 별도 snackbar 생략 가능 |
| 현재 목록에서 사라짐 | 즉시 `되돌리기` 제공 |
| 다른 날짜·보관함으로 이동 | 이동 결과와 `되돌리기` 제공 |
| 영구 삭제 | 되돌리기 대신 사전 확인과 backup |

완료, 제외, 삭제, 날짜 이동, Flow 보관을 같은 undo 규칙으로 뭉치지 않는다.

### F06. `다음 행동`의 정체성

현재 모바일 workspace는 `다음 행동 / 전체 계획 / 기록` 탭을 사용한다.
`다음 행동`은 Flow shape에 따라 다음 Item, 다음 날짜, 현재 단원, 현재 occurrence를
모두 의미할 수 있어 추상적이다.

검토할 대안:

- 탭은 유지하되 콘텐츠별 라벨로 구체화: `다가오는 일정`, `남은 할 일`, `이번 회차`,
  `현재 단원`
- `다음 행동`을 탭이 아니라 workspace 첫 섹션으로 사용
- `전체 계획`을 기본 화면으로 두고 다음 묶음을 상단에 고정

평가 기준은 label 선호가 아니라 첫 3초 안에 “지금 해야 할 것”과 “저장한 전체”를
동시에 이해할 수 있는가다.

### F07. `기록`의 정체성

현재 `기록`에는 진행 수치, held occurrence, 완료 후 feedback, reuse notice가 섞인다.
이는 history, reflection, issue, reuse가 한 탭에 혼재된 상태일 수 있다.

검토할 대안:

- `진행 기록`: 완료·다시 열기·건너뜀·보류의 시간순 history만 표시
- `메모와 회고`: 개인 메모와 단계별 의견을 Item 또는 run 문맥에 배치
- `다시 쓰기`: Flow 관리 명령으로 이동
- 기록량이 적을 때는 독립 탭을 없애고 workspace의 접힌 section으로 제공

## 4. 전체 구조 대안

### 대안 A. 현재 P35 유지

```text
Public result
→ 최소 조정
→ FlowMe 저장
→ receipt
→ 다음 행동 / 전체 계획 / 기록
→ 가져가기
```

장점:
- visible primary action을 하나로 유지하기 쉽다.
- 실행·기록·export identity가 개인 Flow에 모인다.

위험:
- 저장 전에 충분히 조정하거나 외부로 바로 가져가려는 사용자를 막는다.
- `다음 행동`과 `기록`이 추상 탭이 될 수 있다.

### 대안 B. 저장 전 full editor

```text
Public result
→ 전체 구조 편집
→ 저장 또는 export
```

장점:
- 저장 전에 모든 것을 조정할 수 있다.

위험:
- 첫 사용자가 planner 설정을 먼저 배워야 한다.
- source와 personal edit 경계가 흐려진다.
- 모바일에서 길고 복잡해질 가능성이 높다.

### 대안 C. Artifact preflight + contextual personalization

```text
Public result
→ 필요한 항목만 contextual edit
→ 자연스러운 artifact와 개수 확인
→ FlowMe에 저장 또는 외부 도구로 가져가기
→ 짧은 receipt
→ 개인 Flow의 shape-specific 실행 workspace
```

장점:
- portable execution layer 방향과 직접 맞닿는다.
- 저장 전 확신과 외부 도구 사용을 모두 지원한다.
- full editor 없이 제목·상세·날짜 수정이 가능하다.

위험:
- 저장과 외부 가져가기의 action hierarchy를 잘못 잡으면 다시 복잡해진다.
- export 전후 개인 상태 보존 정책이 명확해야 한다.

이번 검토는 C를 무조건 채택하는 절차가 아니다. 세 대안을 실제 5개 Flow shape와
390px 화면에서 비교해 최종 판정한다.

## 5. 공통 시뮬레이션 관점

각 시나리오에서 다음 세 session을 이어서 본다.

1. 발견과 결정
   - 실제 결과 이해
   - 필요한 조정 발견
   - 저장 또는 외부 가져가기 선택
2. 실행과 수정
   - 저장 전체 확인
   - 다음 날짜/항목/회차 실행
   - 완료와 다시 열기
   - 제목·상세·날짜 수정
3. 기록과 재사용
   - history와 개인 메모 확인
   - 전체·선택·현재 범위 가져가기
   - 새 실행으로 다시 쓰기

다음 Flow shape를 반드시 비교한다.

- Calendar/timeline: 이사 D-30
- undated checklist/todo: 차량 점검
- routine/occurrence: 홈트
- sheet/progress: 중학교 수학 학습
- memo/guide 또는 개인 memo draft

## 6. 판정 기준

### 사용자 가치

- 첫 화면에서 결과와 필요한 입력을 이해한다.
- 저장과 외부 가져가기의 차이를 예측한다.
- 저장 뒤 전체 Flow가 맞게 저장됐는지 확인한다.
- 다음 실행과 전체 구조를 설명 없이 찾는다.
- 완료 후 복구 경로를 잃지 않는다.

### 복잡도

- 한 frame의 visible primary action은 원칙적으로 1개다.
- 모든 artifact를 고정 탭으로 늘어놓지 않는다.
- 모든 항목에 모든 편집 command를 반복하지 않는다.
- 390px에서 긴 editor가 기본으로 펼쳐지지 않는다.

### 일관성

- 같은 Item title/date/memo가 preview, My Flow, Calendar, export에서 일치한다.
- 같은 날짜 묶음과 occurrence identity가 surface마다 달라지지 않는다.
- 완료, 제외, 삭제, 날짜 이동, 보관의 용어와 복구 규칙이 구분된다.

### 접근성

- keyboard만으로 조정, 저장 위치 선택, 완료, 다시 열기, export가 가능하다.
- sheet/dialog를 닫으면 원래 trigger로 focus가 돌아온다.
- visible label과 accessible name의 목적이 일치한다.
- horizontal overflow, fixed overlap, unnamed control이 없다.

## 7. 검토자가 제출할 결론

1. P35 방향 전체 판정
2. F01~F07별 판정과 근거
3. 390px current/proposed 핵심 화면
4. 1024px current/proposed workspace
5. 최종 surface ownership
6. 유지·제거·이동할 command
7. 다음 구현 slice와 rollback 경계
8. 실제 사용자 관찰 전에 반드시 고칠 것
9. 실제 사용자에게만 확인할 질문

문구를 조금 바꾸는 것으로 구조 문제를 덮지 않는다. 필요하면 public preview,
receipt, focused workspace의 composition을 다시 설계할 수 있다. 단, 안정된 데이터
계약을 깨는 우회 구현은 제안하지 않는다.
