# P23-02C2A Audit

## 시작 상태

P23-02C1은 반복 규칙과 occurrence identity를 pure contract로만 정의했다. 개인 draft의
structural schedule에는 repeat를 저장할 수 있었지만 사용자 UI에서 만들거나 수정할 경로가
없어 `personalDraftRecurrenceUserReachableWithoutFixture`가 false였다.

## 소유권

### Personal structural schedule

- repeat series와 revision
- frequency, interval, weekly weekdays, monthly day policy
- until 또는 count 종료 조건
- stable series ID

### Execution run

회차별 pending, done, reopened, skipped, held는 이번 UI에 넣지 않았다. 반복 규칙 저장과
완료 상태는 계속 별도 소유권이다.

### Source/version

source-backed/public Flow의 원본 반복 규칙과 source Item은 변경하지 않는다. 새 UI는
개인 draft의 `user_created` Item에만 노출한다.

## UX 결정

- 날짜가 있을 때만 반복 제어를 표시한다.
- 최상위 선택은 `없음 / 매일 / 매주 / 매월` 4개로 제한한다.
- interval은 1..계약 최대값의 정수만 저장한다.
- 매주는 최소 한 요일이 필요하다. 첫 선택 시 시작 날짜의 요일을 기본으로 둔다.
- 매월은 시작 날짜의 일자를 쓰고 해당 일자가 없는 달은 건너뛴다고 짧게 알린다.
- 종료는 계속, 날짜까지, 횟수만큼 중 하나다.
- raw series, revision, occurrence, RRULE 같은 내부어는 사용자 화면에 표시하지 않는다.

## 시뮬레이션에서 발견한 결함과 수정

### 1. wide 항목 편집入口 누락

1024px 전체 Flow 카드의 `할 일 순서`는 위/아래 이동만 제공했다. 다음 할 일이 아닌 항목은
제목·날짜·메모·반복 상세를 열 수 없었다. 각 행 제목을 visible `열기` 버튼으로 바꾸고 기존
My Flow 상세 편집 방에 연결했다. 새 편집 화면은 만들지 않았다.

### 2. 부분 반복 수정이 기존 반복을 삭제

반복 횟수만 바꾸면 patch에 frequency가 없었고 저장 함수가 이를 `반복 없음`으로 해석했다.
저장 시 patch와 현재 effective editor state를 병합해 frequency, weekdays, end condition을
모두 보존하도록 수정했다. E2E에서 count 8에서 10으로 바꾼 뒤 series ID가 같고 revision이
하나인 것을 확인했다.

### 3. 저장 계층의 느슨한 validation

UI가 막아도 잘못된 interval, 빈 weekly weekdays, 시작 날짜보다 이른 until date가 adapter로
들어올 수 있었다. pure setter에서도 이를 undefined 결과로 거부해 잘못된 규칙이 기본값으로
조용히 저장되지 않게 했다.

### 4. 반복 중 날짜·시간 변경의 revision 불일치

schedule만 바꾸면 base Item의 날짜·시간은 갱신되지만 series revision의 `effectiveFrom`과
schedule template은 이전 값을 유지할 수 있었다. 반복이 있는 항목의 schedule patch는 현재
effective 반복 규칙을 같은 저장 과정에서 재적용하도록 했다. E2E에서 날짜를 2026-08-17에서
2026-08-18로, 시간을 09:30에서 10:00으로 옮긴 뒤 같은 series ID와 갱신된 revision을
확인했다.

## 상태 전이

1. 날짜 없음: 반복 UI 없음, repeat 없음
2. 날짜 지정: 반복 없음이 기본
3. all-day 또는 timed -> weekly: 날짜·시간을 유지하고 series 생성
4. weekly field edit: same series에서 규칙 갱신
5. 날짜·시간 변경: same series에서 effective date와 schedule template 동기화
6. weekly -> none: repeat만 제거
7. 날짜 제거: 기존 schedule 정책대로 repeat를 포함한 schedule 제거
8. 완료/완료 취소: structural recurrence membership과 독립

## 자동화와 사용자 관찰 구분

Playwright는 390px과 1024px에서 실제 controls를 사용했고 horizontal overflow 0을 확인했다.
스크린샷은 자동화 시점의 화면 evidence다. 반복 용어와 종료 조건이 실제 사용자에게 충분히
이해되는지는 별도 관찰이 필요하다.

## 남은 위험

1. Calendar는 아직 base Item 한 건만 읽으며 visible range occurrence를 확장하지 않는다.
2. 완료 체크는 아직 series Item 수준이고 개별 회차 실행 상태가 아니다.
3. ICS는 RRULE, EXDATE, RECURRENCE-ID를 아직 생성하지 않는다.
4. 규칙 변경 시 `이번 회차만 / 이번 회차부터 / 전체` 범위 UI가 없다.
5. list export는 반복 규칙을 사용자 결과에 어떻게 요약할지 최종 정책이 남아 있다.
6. localStorage 기반이므로 기기 간 반복 기록 동기화와 복구는 지원하지 않는다.
