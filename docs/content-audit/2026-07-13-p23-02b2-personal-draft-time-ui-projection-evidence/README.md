# P23-02B2 Personal Draft Time UI and Projection Evidence

P23-02B1의 `unscheduled / all_day / timed` 계약을 개인 draft의 실제 수정 UI와
My Flow, Calendar, ICS, checklist, sheet, memo에 연결했다. 적용 대상은 URL-first miss
또는 메모에서 만든 개인 draft의 user-created Item이며 source-backed/public Flow 경로는
유지했다.

## 결과

- 날짜가 있는 개인 할 일을 `종일` 또는 `시간 지정`으로 바꿀 수 있다.
- timed 일정은 시작 시간과 5분 단위 예상 시간을 저장하며 기본값은 30분이다.
- 신규 또는 수정된 timed 일정은 valid device IANA zone을 저장하고, 기존 zone 없는
  record는 편집 전까지 floating local로 유지한다.
- timed에서 종일로 돌아가면 날짜와 stable Item ID는 유지되고 time, duration, timezone만
  제거된다.
- 날짜를 제거하면 schedule 전체가 사라지지만 제목, 메모, 순서, 완료 상태는 유지된다.
- Calendar는 같은 날짜에서 종일, 시작 시간, personal order 순으로 정렬한다.
- ICS는 all-day와 timed 형식을 구분하고 날짜·시간·duration 수정 전후 같은 UID를 쓴다.
- checklist, sheet, memo는 같은 effective schedule을 읽으며 raw timezone이나 내부 구조어를
  출력하지 않는다.

## 실제 연결 상태

| Surface | P23-02B2 상태 |
|---|---|
| 개인 draft 시간/종일 수정 UI | 연결 |
| My Flow timed 요약 | 연결 |
| Calendar timed row 및 정렬 | 연결 |
| ICS all-day/timed/TZID/duration/stable UID | 연결 |
| checklist/sheet/memo 시간 정보 | 연결 |
| source-backed 구조 시간 편집 | 미연결, control 0 유지 |
| 반복 규칙과 회차 완료 | 미구현, P23-02C 범위 |

## Evidence

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [projection-export-fixtures.json](./projection-export-fixtures.json)
- [모바일 시간 편집](./screenshots/01-personal-draft-time-edit-mobile.png)
- [모바일 Calendar](./screenshots/02-personal-draft-timed-calendar-mobile.png)
- [wide Calendar](./screenshots/03-personal-draft-timed-calendar-wide.png)
- [수정 전 ICS](./downloads/personal-draft-timed-before-edit.ics)
- [수정 후 ICS](./downloads/personal-draft-timed-after-edit.ics)

## 검증 범위

- full unit suite: 459 passed
- P23-02B2 timed user journey: 1 passed
- P23-02A optional date regression: 1 passed
- full URL-first user-surface suite: 17 passed
- targeted My Flow/Calendar/source-backed regression: 5 passed
- public share/workbench regression: 44 passed
- production build: passed

Playwright는 실제 브라우저와 사용자 UI를 통해 상태를 만들었지만 이는 자동화 QA다.
실제 사용자 관찰 세션은 이번 evidence에 포함하지 않았으며 `manualUserObservationCount`는 0이다.

## 다음 범위

P23-02C는 반복 규칙, 반복 회차 identity, 회차별 완료·재개, series 수정 범위를 별도 계약으로
먼저 고정해야 한다. 현재 timed schedule을 반복 모델에 바로 섞지 않는다.
