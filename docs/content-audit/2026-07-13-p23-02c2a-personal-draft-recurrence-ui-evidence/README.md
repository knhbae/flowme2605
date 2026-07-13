# P23-02C2A Personal Draft Recurrence UI Evidence

P23-02C1의 반복 series/revision/occurrence 계약 중 첫 사용자 slice를 My Flow에 연결했다.
URL-first miss 또는 메모로 만든 개인 draft의 user-created 할 일만 대상으로 매일, 매주,
매월 반복과 간격, 요일, 종료 조건을 설정하고 다시 반복 없음으로 돌릴 수 있다.

## 결과

- 날짜가 있는 개인 할 일에서 `없음 / 매일 / 매주 / 매월` 반복을 선택할 수 있다.
- 매주 반복은 복수 요일, 모든 반복은 간격과 `계속 / 날짜까지 / 횟수만큼` 종료 조건을
  저장한다.
- 새로고침 후 같은 stable Item ID와 series ID로 반복 규칙이 복원된다.
- 반복 횟수처럼 한 필드만 수정해도 현재 전체 규칙과 병합되며 기존 반복이 지워지지 않는다.
- 반복 중 날짜·시간을 바꾸면 같은 series ID에서 future 기준일과 schedule template이 함께
  갱신된다.
- 반복을 없애면 날짜, 시간, 예상 시간, 제목, 메모, 완료 상태는 유지된다.
- 1024px 전체 Flow 목록에서도 모든 개인 draft 항목에 visible `열기` 진입을 제공해 상세
  편집 방에 도달할 수 있다.
- source-backed Flow에는 personal structural recurrence control을 노출하지 않는다.
- Calendar occurrence 확장, 회차별 완료, ICS RRULE/exception은 아직 연결하지 않았다.

## Evidence

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [모바일 반복 편집](./screenshots/01-personal-draft-recurrence-edit-mobile.png)
- [wide 반복 편집](./screenshots/02-personal-draft-recurrence-edit-wide.png)
- [모바일 반복 해제](./screenshots/03-personal-draft-recurrence-removed-mobile.png)

## 검증 경계

Playwright는 `/flows` miss부터 draft 저장, user-created 할 일 추가, 날짜·시간·반복 설정,
새로고침, wide 재진입, 반복 해제까지 실제 UI 경로로 수행했다. 이는 자동화 QA이며 실제
사용자가 반복 개념을 이해했는지 관찰한 세션은 아니다. `manualUserObservationCount`는 0이다.

## 검증 결과

- full unit suite: 465 passed
- P23-02C2A recurrence user journey: 1 passed
- URL-first + public share + workbench regression: 62 passed
- targeted My Flow/Calendar regression: 5 passed
- production build: passed
- docs check: passed

## 다음 단계

1. P23-02C2B: visible range occurrence를 Calendar에 확장하고 회차별
   `pending / done / reopened / skipped / held` 실행 상태를 연결한다.
2. P23-02C2C: simple series는 RRULE, 예외 회차는 EXDATE/RECURRENCE-ID 정책으로 ICS에
   연결하고 stable series UID를 검증한다.
