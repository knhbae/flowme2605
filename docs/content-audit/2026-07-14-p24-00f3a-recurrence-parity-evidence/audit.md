# P24-00F3A Recurrence Occurrence Parity Audit

## 판정

`supported`로 닫는다. 공개 Flow의 저장 전 반복 미리보기, 저장 후 Calendar 회차, 회차별 완료 상태, ICS 반복 규칙이 같은 recurrence 계약을 읽는다.

## 기준과 재현

- baseline: `6e376bc`
- route: `/f/curated-allblanc-morning-workout`
- viewport: `390x844`, `1024x768`
- initial storage: empty localStorage
- input: 시작일 `2026-07-15`, `월/수/금`
- expected: 4주 동안 12회차
- evidence class: `current_command`, `browser_simulated`

Claude Code의 dirty-dev 감사에서 `VEVENT`가 1개였다는 사실 자체는 결함이 아니다. 반복 Calendar의 표준 출력은 master event 1개와 `RRULE`일 수 있다. 실제 결함은 저장 후 Calendar에 첫 날짜만 남고, 내려받은 ICS에 반복 규칙이 없었다는 점이다.

## 원인

1. source routine의 첫 dated row가 `baseCalendarRows`에 들어가면 legacy `generatedRoutineRows`가 Flow 전체를 건너뛰었다.
2. legacy generated row에는 occurrence identity가 없어 완료 상태를 회차별로 소유할 수 없었다.
3. 공개 exact-video 화면의 4주 미리보기 범위가 저장 후 recurrence consumer에 전달되지 않았다.
4. recurrence가 visible-month 범위로 생성된 뒤 월을 이동하면 선택일 보정이 execution range의 이전 달 회차를 다시 선택해 월 이동을 되돌렸다.

## 구현

### Saved routine occurrence adapter

`lib/flow/saved-routine-occurrence.ts`가 source `RRULE` 또는 저장 후 repeat preset을 personal occurrence generator 계약으로 정규화한다.

- series ID: Flow namespace + stable Item ID
- occurrence ID: revision + 원래 회차 날짜/시간
- execution state: occurrence record에서 별도 조회
- date override: 원래 회차 key에 저장하며 occurrence identity는 유지
- source 배열과 source Item mutation: 0

선택 요일은 source 예시보다 사용자의 저장값을 우선한다. `exact-video`와 `schedule-user-choice` 메타데이터를 가진 공개 Calendar Flow는 기존 미리보기 약속과 동일한 4주 범위를 사용한다. 특정 slug 분기는 없다.

### Calendar와 완료 상태

- 7월: `15, 17, 20, 22, 24, 27, 29, 31`
- 8월: `3, 5, 7, 10`
- 첫 회차 완료 후 둘째 회차는 `pending` 유지
- 첫 회차 완료 취소 후 동일 occurrence ID로 `reopened`
- 구조 항목 수와 날짜별 회차 상태를 구분해 occurrence 행에는 전체 `0/1`을 표시하지 않음

월 이동은 현재 사용자가 고른 visible month 안에서 선택일을 보정한다. execution range에 이전 달 회차가 남아 있어도 다음 달을 되돌리지 않는다.

### ICS

- master `VEVENT`: 1
- `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260811`
- `DTSTART;VALUE=DATE:20260715`
- UID: mutable title/date/order가 아닌 stable series ID 기반
- duplicate event: 0
- 사용자 출력 내부어: 0

## 회귀 경계

- 개인 draft recurrence generator와 ICS builder를 재사용하며 별도 규칙 사본을 만들지 않았다.
- 반복 없는 source-backed Flow는 adapter definition이 없어 기존 row를 그대로 반환한다.
- 구조 항목이 여러 개인 legacy routine은 기존 `반복 항목 N/M` 진행률을 유지한다.
- 동일 Item이 날짜별로 반복되는 occurrence routine만 `이번 회차` 상태를 사용한다.
- 완료·재개는 recurrence membership을 변경하지 않는다.

## 시각 확인

모바일과 wide에서 horizontal overflow 및 console error는 0이다. 다만 모바일 item detail은 메모, 확인 항목, source, portable tools가 길게 이어져 Calendar보다 무겁다. correctness gate에서는 구조를 바꾸지 않았고 P24-00U2 progressive editor로 넘긴다.

## 자동 검증과 실제 관찰

자동화가 증명한 것:

- 저장 record와 선택 요일
- 7월/8월 회차 수와 날짜
- occurrence ID 분리
- 완료, 형제 회차 불변, 완료 취소
- ICS 파일의 VEVENT, DTSTART, RRULE, UID 정책
- 모바일/wide overflow와 console error

실제 사용자에게 확인할 것:

- `이번 회차 대기/완료/다시 진행`이 전체 Flow 진행률보다 이해하기 쉬운가
- 월간 grid의 작은 routine icon만으로 반복 일정을 알아볼 수 있는가
- 반복 series 전체를 내려받는 동작이 현재 item detail 위치에서 명확한가

## 다음 slice

P24-00F3B에서 메모 분할 draft의 모든 persisted Item이 My Flow와 export에 정확히 한 번 나타나는지 고치고, 제목과 원하는 결과가 모두 빈 miss draft는 record를 0개 생성하게 한다.
