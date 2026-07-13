# P23-02B2 Audit

## 원인

P23-02B1은 시간 상태, duration, timezone, stable event identity를 pure contract로만
정의했다. 실제 My Flow 편집은 fixed date만 저장했고 Calendar는 날짜만 읽었으며,
개인 항목 ICS UID는 mutable schedule을 포함하는 이전 경로를 사용했다. 따라서 timed 상태는
fixture로는 검증할 수 있어도 사용자가 만들거나 여러 destination에서 같은 일정으로 읽을 수
없었다.

## 소유권

### Personal structural overlay

- user-created Item의 optional fixed date
- optional `HH:mm` local start time
- optional duration minutes
- optional valid IANA time zone
- stable personal Item ID와 personal order

별도 `allDay` boolean은 추가하지 않았다. 날짜가 있고 시간이 없으면 all-day, 유효한 시간이
있으면 timed다.

### Personal value overlay

source Item의 기존 alias, memo, date override 경로는 유지한다. user-created Item의 schedule은
structural overlay에만 저장해 두 소유권을 중복시키지 않는다.

### Execution run

pending, done, reopened 상태는 schedule과 분리한다. 완료와 완료 취소는 Calendar/ICS/list
membership이나 stable identity를 바꾸지 않는다.

### Source/version

source title, order, schedule, detail, URL은 수정하지 않는다. source-backed/public Flow는 이번
structural time UI와 stable UID wrapper를 적용하지 않는다.

## UX 결정

- 개인 draft user-created Item이 날짜를 가질 때만 `종일 / 시간 지정` segmented control을
  표시한다.
- `시간 지정`은 native time input과 5분 단위 예상 시간 input을 함께 연다.
- 시간 없이 timed 상태를 저장할 수 없고, duration은 5..1440분 범위에서만 저장한다.
- 신규 timed 일정의 기본 duration은 30분이다.
- 사용자 화면에는 raw IANA zone을 표시하지 않고 `현재 기기 시간 기준으로 저장돼요`만
  안내한다.
- My Flow와 selected-day agenda에는 `오전 9:30 · 45분`처럼 한 줄로 표시한다.
- 월간 grid에는 긴 시간 문구를 추가하지 않아 compact marker 기준을 유지한다.

## Timezone 정책

1. 신규 timed 또는 시간/duration을 수정한 일정은 현재 기기의 valid IANA zone을 저장한다.
2. zone을 얻지 못하면 floating local로 저장한다.
3. 기존 zone 없는 timed record는 편집하지 않는 한 floating local을 유지한다.
4. invalid timezone은 Item이나 날짜·시간을 삭제하지 않고 floating local로 낮춘다.
5. timezone 직접 선택 UI는 이번 범위에 없다.

## 상태 전이

1. unscheduled -> all-day: fixed date만 저장
2. all-day -> timed: time, duration, device zone을 추가
3. timed -> all-day: date 유지, time/duration/timezone 제거
4. timed time edit: stable Item ID와 event UID 유지
5. date move: time/duration/timezone 유지
6. date removal: schedule 전체 제거
7. date re-entry: all-day로 시작
8. done -> time edit -> reopened: membership과 stable identity 유지

## Calendar 판정

- 실제 Calendar consumer가 structural `scheduleProjection`을 읽는다.
- 정렬은 date, all-day, start time, personal order 순이다.
- selected-day agenda는 시간과 duration을 한 번만 표시한다.
- monthly grid는 기존 compact marker를 유지한다.
- stable row identity는 mutable schedule이 아니라 Flow와 stable Item ID를 사용한다.
- 한 timed row의 시간 수정 전후 중복 row는 0건이다.

다중 timed 시작 시간 정렬은 pure fixture와 consumer comparator 단위 테스트로 고정했다.
이번 screenshot은 all-day 1개와 timed 1개를 보여 주며, 여러 timed 항목의 사람 관찰 결과로
과장하지 않는다.

## ICS 판정

- all-day: `DTSTART;VALUE=DATE`와 다음 날 `DTEND`
- IANA timed: `DTSTART;TZID`, duration 기반 `DTEND;TZID`
- floating timed: TZID 없는 local DTSTART/DTEND
- UID: saved personal Flow identity와 stable Item ID 기반
- 시간·duration 수정 전후 UID 동일
- 09:30 + 45분은 10:15 종료, 10:15 + 60분은 11:15 종료
- 자정 경계는 다음 날짜 DTEND로 단위 테스트
- tombstoned, excluded, unscheduled Item은 VEVENT 제외
- E2E 다운로드별 VEVENT 중복 0

## List export 판정

- checklist/memo: `일정: 2026-08-12 · 10:15 · 예상 1시간`
- sheet: 날짜, 시간, 예상 시간 열을 개인 draft structural export에 추가
- all-day는 `종일`, unscheduled는 `날짜 없음`
- raw timezone과 내부 구조어는 출력하지 않음
- source-backed/public builder schema는 변경하지 않음

## 자동화와 사용자 관찰 구분

Playwright는 URL miss부터 draft 저장, user Item 추가, 날짜·시간 입력, 새로고침,
Calendar 완료·재개, ICS 다운로드, list export, timed -> all-day까지 실제 UI로 재현했다.
이는 자동화 검증이며 실제 사용자가 의미를 이해했는지 확인한 관찰 세션은 아니다.

## 남은 위험

1. 반복 규칙과 회차별 완료 모델이 없어 운동·청소 루틴을 아직 표현하지 못한다.
2. timezone 선택 UI가 없어 여행 중 다른 zone으로 의도적으로 바꾸는 흐름은 지원하지 않는다.
3. floating legacy 일정은 다른 기기에서도 같은 wall-clock time으로 해석된다.
4. DST gap/overlap은 contract fallback은 있지만 실제 사용자 설명과 관찰이 필요하다.
5. duration은 단일 연속 구간이며 휴식·분할 작업·다일 일정은 표현하지 않는다.
6. localStorage 기반이므로 계정 간 동기화나 복구는 지원하지 않는다.

## P23-02C Gate

반복 구현 전 아래를 계약으로 먼저 닫아야 한다.

- series identity와 occurrence identity
- 반복 규칙 수정이 과거·이번·향후 회차 중 어디에 적용되는지
- 회차별 done/reopened/skipped/held 상태
- Calendar와 ICS RRULE 대 개별 VEVENT 정책
- checklist/sheet/memo에서 series와 회차를 구분하는 방법
- timezone 변경과 DST가 반복 회차에 미치는 영향
