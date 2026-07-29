# P30 Persona Journey Simulation

이 문서는 자동화 또는 heuristic simulation을 위한 시나리오다. 실제 사용자 관찰을 대체하지 않는다.

## 공통 상태 분류

- `supported`: 행동과 다음 단계가 설명 없이 도달 가능하고 결과가 일관됨
- `hidden`: 기능은 있지만入口나 의미 발견이 어려움
- `partial`: 일부 surface/destination/session만 이어짐
- `missing`: 기능·정책·복구 경로가 없음
- `blocked`: 계정, 서버, 실제 외부 도구, 운영 결정 등 선행 조건이 필요함

## 기록 단위

각 단계에서 아래를 기록한다.

- 사용자 목적과 현재 맥락
- route, viewport, fixture 또는 시작 데이터
- 사용자가 기대하는 object와 결과
- 실제 행동과 tap/click depth
- 시스템 feedback과 다음 행동
- 새로고침/재방문 persistence
- My Flow / Calendar / export 간 identity·count·title·date 일치
- 막혔을 때 recovery와 데이터 보존
- 설명을 읽지 않고도 이해 가능한지
- status, severity, evidenceKind

## Persona 1 - 마감일 역산형 이사 사용자

**상황:** 30일 뒤 이사하며 Google Calendar를 주 도구로 쓴다. 긴 체크리스트보다 날짜별 실행 결과가 필요하다.

### Session 1 - 발견·개인화·저장

`/ -> /flows -> /f/moving-d30-basic`

1. source와 Calendar 결과를 파악한다.
2. 이사일을 입력한다.
3. 계산된 날짜 범위와 event 수를 확인한다.
4. 한 항목 날짜와 제목을 조정한다.
5. 전체 Flow를 저장하고 receipt에서 저장 결과를 확인한다.

### Session 2 - 실행·수정·복구

`/my -> /calendar`

1. 다음 할 일을 찾고 완료한다.
2. 완료를 취소한다.
3. 기준일을 변경하되 개인 고정 날짜의 정책을 확인한다.
4. Calendar의 이전/새 날짜와 My Flow 요약을 비교한다.

### Session 3 - 외부 활용·재사용

1. whole Flow Calendar export count를 예측한다.
2. ICS 결과의 날짜·제목을 확인한다.
3. Flow를 새 이사일로 다시 쓰고 이전 실행 기록 보존을 확인한다.

## Persona 2 - 날짜 없는 차량 점검 사용자

**상황:** 지금은 체크만 하고 필요한 일부 항목만 나중에 Calendar에 놓고 싶다.

### Session 1

`/f/vehicle-inspection-prep -> /my`

1. 저장 전 preview와 실제 완료 control의 차이를 이해한다.
2. 날짜 없이 전체 checklist를 저장한다.
3. 저장 receipt에서 전체 항목 수를 확인한다.

### Session 2

`/my -> /calendar`

1. 날짜 없는 할 일을 찾는다.
2. 두 항목만 선택해 날짜에 배치한다.
3. 한 배치를 undo한다.
4. 완료/다시 열기와 날짜 배치가 서로 다른 상태인지 확인한다.

### Session 3

1. whole/selected/current export 범위를 비교한다.
2. checklist와 Calendar 결과에서 포함 항목 수 차이를 예측한다.
3. 날짜 제거 후 undated tray 복귀와 export 변화를 확인한다.

## Persona 3 - 반복 홈트 사용자

**상황:** 주 3회 45분 홈트를 설정하고 이번 회차만 완료하거나 쉬고 싶다.

### Session 1

`/f/curated-allblanc-morning-workout`

1. compact routine summary와 다음 3회를 확인한다.
2. 요일, 시간, duration, 종료 조건을 조정한다.
3. 저장 전 occurrence preview와 저장 후 Calendar를 비교한다.

### Session 2

1. 이번 회차를 완료하고 다시 연다.
2. series 설정과 occurrence 실행 상태가 섞이지 않는지 확인한다.
3. 다음 회차가 사라지거나 중복되지 않는지 확인한다.

### Session 3

1. Calendar/ICS 반복 결과와 UID/count를 확인한다.
2. 종료 조건을 바꿀 때 과거 회차 기록 보존 여부를 판단한다.
3. 영상/공식 안내 같은 resource가 실행 항목과 구분되는지 평가한다.

## Persona 4 - Calendar-heavy 다중 Flow 사용자

**상황:** 가족·학습·이사·운동 Flow 20~60개를 저장했고 특정 Flow만 보고 싶다.

### Session 1

`/calendar?demo=ux20`, `/calendar?demo=ux50`

1. scope picker에서 active/recent/inactive 구조를 이해한다.
2. 검색해 2개 Flow를 선택하고 적용한다.
3. 닫힌 상태에서 현재 범위를 다시 파악한다.

### Session 2

1. 같은 날짜의 5개 Flow를 grid에서 구분한다.
2. selected day에서 full identity와 할 일을 확인한다.
3. 완료/열기/날짜 이동 중 한 행동을 수행한다.

### Session 3

1. 날짜 없는 일 2개를 batch 배치하고 undo한다.
2. page scroll, focus return, stable identity를 확인한다.
3. Calendar가 모든 일을 담는 planner처럼 과밀해지지 않는지 평가한다.

## Persona 5 - 기존 도구 중심 export 사용자

**상황:** FlowMe 안에서 오래 관리하기보다 Calendar, Todo, Sheet, Memo로 가져가 사용한다.

### Session 1

1. public Flow에서 primary artifact와 secondary artifact 차이를 이해한다.
2. export 전에 scope, format, row/event count, 정보 손실을 예측한다.

### Session 2

1. My Flow에서 whole/selected/current export를 각각 찾는다.
2. export panel이 현재 작업을 가리거나 완료 control과 경쟁하지 않는지 확인한다.
3. receipt가 실제 생성 결과와 다음 행동을 설명하는지 확인한다.

### Session 3

1. Calendar/checklist/sheet/memo 결과가 같은 personal overlay를 읽는지 비교한다.
2. 외부 도구 재가져오기, 중복 import, cross-device는 현재 supported인지 blocked인지 분류한다.

## Persona 6 - URL/메모 개인 초안 사용자

**상황:** 준비된 Flow가 없는 URL 또는 메모를 여러 할 일로 만들어 개인적으로 조정한다.

### Session 1

`/flows`

1. URL/한 줄/여러 줄 입력入口를 찾는다.
2. hit/miss/source-import-required 경계를 확인한다.
3. 가짜 source-backed 결과 없이 draft를 저장한다.

### Session 2

`/my`

1. 항목 추가·삭제·복구·순서 변경을 수행한다.
2. 제목·날짜·시간·메모를 수정한다.
3. 완료와 구조 편집이 다른 mode인지 확인한다.

### Session 3

1. Calendar와 list export가 같은 effective item을 읽는지 확인한다.
2. 새로고침 후 stable ID와 개인 값을 확인한다.
3. 공유 가능한 Flow 제작과 개인 draft가 구분되는지 평가한다.

## Persona 7 - 재방문·회고·재사용 사용자

**상황:** 한 번 저장하고 끝내지 않고 실행 중 의견을 남기고 완료 후 다시 쓴다.

### Session 1

1. 저장 직후 전체 Flow와 다음 행동을 확인한다.
2. 항목별 메모 또는 수정 의견을 남긴다.

### Session 2

1. 일부 완료 후 다시 열고 수정한다.
2. source 수정 요청, 개인 메모, 실행 회고가 구분되는지 확인한다.

### Session 3

1. 전체 완료 후 과거 기록을 확인한다.
2. 새 기준일 또는 새 run으로 다시 쓴다.
3. 이전 완료·메모·회고와 새 실행 상태가 섞이지 않는지 확인한다.

## Persona 8 - 키보드·저시력 보조 사용자

**상황:** 390px 확대 화면 또는 키보드 중심으로 앱을 사용한다.

### Session 1

1. header -> workspace -> persistent tabs 순서로 탐색한다.
2. save-before 조정과 disclosure를 keyboard로 사용한다.

### Session 2

1. dialog/sheet/menu를 열고 Escape로 닫는다.
2. focus trap과 invoking control 복귀를 확인한다.
3. visible label과 accessible name 목적을 비교한다.

### Session 3

1. 완료/다시 열기, 날짜 배치/undo, export를 keyboard-only로 수행한다.
2. fixed layer overlap, contrast, enlarged text, horizontal overflow를 확인한다.

## 서비스·플랫폼 종합 판정

각 항목을 1~5점과 근거로 평가하되 자동화 점수를 실제 만족도로 해석하지 않는다.

1. 가치 제안 명확성
2. source 신뢰와 provenance
3. artifact 품질과 목적지 적합성
4. 개인화 자유도와 복잡도 균형
5. 실행·완료·복구 연속성
6. My Flow / Calendar / export 상태 정합성
7. 재방문·재사용 이유
8. creator/source correction loop
9. 접근성·반응형 operability
10. 많은 Flow에서의 확장성

마지막에 journey discontinuity를 다음 형식으로 정리한다.

| Persona | Session transition | 끊기는 지점 | 데이터 보존 | recovery | 판정 | P31 필요 여부 |
| --- | --- | --- | --- | --- | --- | --- |
