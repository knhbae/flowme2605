# P23-02C2B Personal Draft Calendar Occurrence Evidence

## Result

URL-first miss 또는 메모에서 만든 개인 draft의 user-created 반복 할 일이 Calendar visible range에서 개별 일정으로 펼쳐진다. 각 일정은 stable occurrence ID를 가지며, 완료 후 다시 미완료로 돌릴 수 있다. 완료 기록은 structural recurrence rule이 아니라 active execution state에 별도로 저장된다.

## User path

1. `/flows` miss에서 개인 초안을 저장한다.
2. `/my`에서 사용자 할 일을 추가한다.
3. 날짜와 반복 규칙을 지정한다.
4. series 원본에서는 전체 완료 체크 대신 `일정별로 확인`으로 `/calendar`에 이동한다.
5. 선택일의 개별 일정에서 완료 체크한다.
6. 새로고침 뒤 완료 상태가 유지되는지 확인한다.
7. 완료 체크를 해제해 `reopened` 상태로 전환한다.

## Evidence scope

- Mobile: 390 x 844
- Wide: 1024 x 768
- Automated Playwright journey: yes
- Actual observed users: 0
- Source-backed behavior changed: no
- Calendar occurrence connection: yes
- ICS recurrence connection: no, P23-02C2C 대상
- skipped/held controls: no, P23-03 대상

## Files

- `audit.md`
- `route-evidence.json`
- `screenshots/00-personal-draft-series-calendar-entry-mobile.png`
- `screenshots/01-personal-draft-occurrence-done-mobile.png`
- `screenshots/02-personal-draft-occurrence-reopened-mobile.png`
- `screenshots/03-personal-draft-occurrence-calendar-wide.png`

## Validation

현재 실행에서 unit 467/467, URL-first/public/workbench 63/63, 핵심 My Flow/Calendar 8/8, 반복 회차 시나리오 1/1이 통과했다. 이전 package의 수치를 이번 실행 결과로 재사용하지 않았다.
