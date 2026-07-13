# P23-02C2C Personal Draft Recurrence ICS Evidence

## Result

개인 draft의 반복 할 일을 기존 `캘린더 파일 받기`로 내보내면 단순 series는 stable UID와 RRULE 한 건으로 생성된다. 구조적으로 제외한 회차는 EXDATE, 날짜를 옮긴 회차는 같은 UID의 RECURRENCE-ID 예외로 표현된다. 완료·다시 진행은 실행 기록이므로 ICS membership을 바꾸지 않는다.

## User path

1. `/flows` miss에서 개인 초안을 만든다.
2. `/my`에서 사용자 할 일을 추가하고 날짜와 매일 반복, 3회 종료를 지정한다.
3. 상세의 `원문·내 도구`에서 `캘린더 파일 받기`를 실행한다.
4. `/calendar`에서 첫 회차를 완료한 뒤 다시 진행으로 돌린다.
5. `/my`로 돌아와 같은 파일을 다시 내려받는다.
6. 두 파일의 series UID, RRULE, VEVENT 수가 같은지 확인한다.

## Evidence scope

- Mobile: 390 x 844
- Wide: 1024 x 768
- Actual downloaded ICS files: 2
- Automated Playwright journey: yes
- Actual observed users: 0
- RRULE user reachable without fixture: yes
- EXDATE/RECURRENCE-ID user reachable without fixture: no; contract fixture only
- Source-backed behavior changed: no

## Files

- `audit.md`
- `route-evidence.json`
- `recurrence-ics-fixtures.json`
- `screenshots/00-personal-draft-recurrence-ics-entry-mobile.png`
- `screenshots/01-personal-draft-recurrence-ics-entry-wide.png`
- `downloads/personal-draft-recurrence-before-completion.ics`
- `downloads/personal-draft-recurrence-after-reopen.ics`
