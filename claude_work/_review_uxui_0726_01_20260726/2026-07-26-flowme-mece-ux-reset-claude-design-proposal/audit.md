# Findings — claude_design 독립 검토

Blocking 0 · High 2 · Medium 6 · Low 3.
현재 fact(`current_*`), 설계 제안(`claude_proposed_artifact`), 외부 패턴(`reference_pattern`), 미검증 가정을 한 finding 안에서 섞지 않는다.

---

## H-1 · 공개 Flow 첫 viewport가 다섯 개의 결정 표면을 동시에 연다

```text
ID: CD-H-1
Severity: high
Title: 저장 전 화면이 “무엇이 만들어지나”와 “어떻게 만들까”를 동시에 묻는다
Route: /f/moving-d30-basic (동일 composition: /f/curated-allblanc-morning-workout)
Viewport: 390x844
Starting state: 저장 없음, 첫 방문, 앵커 미입력
Reproduction: 공개 Flow를 열고 첫 화면에서 조작 가능한 컨트롤을 센다
Expected: 실제 전체 결과 → 필요한 최소 입력 1개 → 시작 1개
Actual: 요약 chip 3(내 조건·저장 결과·전체) + renderer 토글 2(캘린더 일정 24개 / 체크리스트 24개)
        + sticky 2버튼(Flow 조정 / 캘린더 24개로 시작) + 이사일 입력 + 날짜 mode 3버튼
        + 전체 Flow 구조 + Flow 가져가기 + 출처와 주의 = visible command 13, 결정 표면 5
User impact: 첫 결정이 “내 이사일”이 아니라 “결과 형태를 무엇으로 볼까”가 된다.
        제품 원칙 8(콘텐츠별 primary artifact 하나)·10(의미 없는 결과 형태를 tab으로 노출 금지)과 충돌한다.
EvidenceKind: current_package_screenshot (current-public-moving-390.png), current_production_interaction
Recommended change: 요약 chip과 renderer 토글 제거. 결과는 콘텐츠 shape가 정한 primary artifact 하나로 고정.
        최소 입력을 시작 버튼과 같은 고정 영역으로 올려 “입력 → 시작” 순서를 물리적으로 강제.
Acceptance marker: P35-PUBLIC-RESULT-FIRST · saveDecisionSurfaceCount==2 · visibleCommandCount<=4 (390/1024/1440)
Unverified assumption: 사용자가 renderer 토글을 “저장 형식 선택”으로 오해하는지는 관찰로만 확인 가능하다.
```

## H-2 · 최소 입력이 그 입력에 의존하는 primary action 아래에 있다

```text
ID: CD-H-2
Severity: high
Title: `캘린더 24개로 시작`이 이사일 입력란보다 위에 있다
Route: /f/moving-d30-basic
Viewport: 390x844
Starting state: 앵커 미입력
Reproduction: 첫 viewport에서 sticky 하단 bar와 이사일 입력란의 세로 순서를 본다
Expected: 값을 넣어야 결과가 확정되는 화면에서는 입력이 확정 action보다 먼저 읽힌다
Actual: sticky bar(조정 / 시작)가 화면 하단에 고정되고, 이사일 입력·`날짜 정하기`·`날짜 없이`·`예시만 보기`는
        그 아래 스크롤 영역에 있다. 예시 날짜 상태로도 시작할 수 있어 “예시”와 “내 값”의 경계가 흐리다.
User impact: 예시 날짜로 저장한 뒤 개인 Flow에서 다시 기준일을 바꾸는 되돌림 경로가 생긴다.
EvidenceKind: current_package_screenshot (current-public-moving-390.png)
Recommended change: 앵커가 필요한 shape에서는 입력과 시작을 같은 고정 영역에 넣고,
        앵커 미입력 상태의 CTA 라벨을 `예시 날짜로 미리보기`가 아니라 값 입력 요구로 바꾼다.
Acceptance marker: P35-ANCHOR-BEFORE-START · 390 캡처에서 입력과 CTA가 같은 영역
Unverified assumption: 예시 날짜 저장이 실제로 얼마나 발생하는지는 usage data가 없다.
```

## M-1 · `/my`가 목록과 실행을 같은 스크롤에서 소유한다

```text
ID: CD-M-1
Severity: medium
Route: /my · 390x844
Actual: 저장 카드 하나 안에 `첫 할 일 시작` · `전체 Flow 보기` · `캘린더` · `가져가기` 4개가 세로로 경쟁하고,
        그 아래 `저장된 전체 Flow` 아코디언이 이어진다. `스튜디오`·`데이터 관리`가 목록보다 위에 있다.
Expected: “무엇을 저장했나”만 답하고 행 하나당 목적지 1개
User impact: 재방문 첫 초점이 분산되고, 20개 규모에서 카드 높이가 목록을 밀어낸다.
EvidenceKind: current_package_screenshot (current-my-flow-workspace-390.png, current-my-flow-1024.png)
Recommended change: 행 = 열기 하나. 실행·캘린더·가져가기는 개인 Flow. 완료·보관은 목록 필터. 관리 메뉴는 보조로.
Acceptance marker: P35-MY-LIBRARY-ONLY · competingPrimaryCount==1 · 1/5/20개에서 캡처
```

## M-2 · Calendar가 편집까지 소유한다

```text
ID: CD-M-2
Severity: medium
Route: /calendar · 390x844
Actual: 선택일 agenda의 각 행에 체크박스 · `열기` · `메모` 3개 command, 상단에 `날짜 옮기기`.
Expected: 날짜 lens는 “언제 무엇이 있나”에 답하고 편집은 맥락이 있는 곳에서
User impact: 같은 편집이 Calendar와 개인 Flow 두 곳에 존재해 어느 쪽이 진짜인지 학습되지 않는다.
EvidenceKind: current_package_screenshot (current-calendar-390.png)
Recommended change: 완료 토글 1개만 남기고 메모·날짜 옮기기·제목 수정 제거. 행 전체 tap은 Flow 열기.
Acceptance marker: P35-CALENDAR-LENS-ONE-TOGGLE
```

## M-3 · 월간 cell이 식별이 아니라 축약 벽이다

```text
ID: CD-M-3
Severity: medium
Route: /calendar · 390x844 / 1024x768
Actual: cell이 `이…`처럼 잘린 제목 chip과 `+2` / `+3`으로 채워진다.
Expected: 월 grid는 “어느 날 무엇이 얼마나”만 답하고 전체 제목은 선택일 agenda가 답한다
User impact: cell에서 Flow를 구분하지 못한 채 날짜를 눌러 확인해야 한다.
EvidenceKind: current_package_screenshot (current-calendar-390.png)
Recommended change: cell = Flow 색 dot + 개수. 제목은 agenda에만.
Acceptance marker: P35-CALENDAR-CELL-COLOR-COUNT · truncated-title 의존 0
```

## M-4 · 조정이 “한 번에 한 종류”가 아니다

```text
ID: CD-M-4
Severity: medium
Route: /f/[slug] 조정 state
Actual: 이름·기준일·포함 여부·개별 날짜가 같은 흐름에 이어진다. 변경 전/후 대비가 항상 보이지 않는다.
EvidenceKind: current_source, inaccessible (라이브 조정 클릭 미실행)
Recommended change: 종류를 탭으로 분리하고 변경 전 → 변경 후 count/날짜 범위를 항상 표시.
Acceptance marker: P35-ADJUST-ONE-KIND
```

## M-5 · 개인 Flow에 “다음 하나”가 승격되어 있지 않다

```text
ID: CD-M-5
Severity: medium
Route: /my?savedFlow=… · 390x844
Actual: 6단계 아코디언이 먼저 보이고 완료 체크는 단계를 펼친 뒤 나타난다.
User impact: 재방문 첫 초점이 “지금 할 하나”가 아니라 목록 전체가 된다. 완료까지 2~3탭.
EvidenceKind: current_package_screenshot (current-my-flow-workspace-390.png)
Recommended change: 다음 하나를 카드로 승격하고 전체 구조는 섹션 요약 + 펼침. 완료는 1탭.
Acceptance marker: P35-PERSONAL-SINGLE-FOCUS
```

## M-6 · 가져가기가 형식 우선이다

```text
ID: CD-M-6
Severity: medium
Route: 공개 Flow 하단 / 개인 Flow 가져가기
Actual: `체크리스트 복사` · `엑셀 받기` · `캘린더` · `복사해 수정` 형식 4개가 먼저 보인다.
Expected: 범위(전체/선택/현재)와 개수가 먼저, 형식은 그 다음, 형식별로 빠지는 정보 명시
EvidenceKind: current_production_interaction (하단 bar), current_source (export scope 계약 존재), inaccessible (실행)
Recommended change: scope-first 재배치. 의미 없는 형식은 비활성 + 비활성 이유 표기.
Acceptance marker: P35-EXPORT-SCOPE-FIRST
```

## L-1 · 홈이 자기 부제가 약속한 job을 소유하지 않는다

```text
ID: CD-L-1
Severity: low
Route: / · 390x844
Actual: “저장한 Flow를 이어가거나, URL과 메모에서 새 실행 계획을 찾습니다”라고 쓰지만
        홈에는 저장 Flow를 잇는 surface가 없고 CTA 1개가 `/flows`로 간다.
EvidenceKind: current_production_interaction
Recommended change: 홈 제거 + `/`를 entry router로. copy가 약속한 job은 진입 규칙으로 이행한다.
Acceptance marker: P35-ENTRY-ROUTER-3TAB
```

## L-2 · `/flows` 카드 하나에 목적지가 셋이다

```text
ID: CD-L-2
Severity: low
Route: /flows · 390x844
Actual: 카드 전체 열기 + 원문 링크 + `더보기 →`.
EvidenceKind: current_package_screenshot (current-flows-390.png)
Recommended change: 카드 전체가 하나의 열기. 출처는 표기(텍스트)로만, 원문 열기는 공개 Flow 안에서.
Acceptance marker: P35-DISCOVER-ONE-TARGET
```

## L-3 · JS 없는 첫 페인트가 다른 화면이다

```text
ID: CD-L-3
Severity: low
Route: /f/moving-d30-basic (JS 비활성 DOM)
Actual: 서버 응답 DOM은 `1. 이사일 입력하기 / 2. 실행 항목 체크 / 3. 내보내기와 백업` 3단 구성과
        진행률·복사/엑셀/캘린더 버튼을 노출한다. hydration 후 화면(요약 chip + 결과 먼저)과 구성이 다르다.
User impact: 느린 네트워크에서 첫 페인트와 최종 화면의 동사·순서가 달라 보인다.
EvidenceKind: current_production_interaction (JS 비활성 응답)
Recommended change: 진단 우선. 의도된 progressive enhancement라면 fallback도 같은 순서(결과 → 입력 → 시작)로 맞춘다.
Acceptance marker: P35-NOJS-FIRST-PAINT-PARITY
Unverified assumption: 실제 사용자 중 이 fallback을 보는 비율은 데이터가 없다.
```

---

## 되살리지 않은 것

- 4-tab 자체는 결함이 아니다. 결함은 홈이 소유한 job이 없다는 점이다.
- receipt(`current-receipt-moving-390.png`)는 이미 메시지 2 · primary 1이다. **변경 대상 아님.**
- 자동차검사·중1 수학의 `날짜 없이 저장` 경로는 현재도 정상 동작한다. 유지.
