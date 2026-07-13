# P23-03 Personal Occurrence State Evidence

## Result

개인 draft의 반복 일정 한 회차에서 `완료`, `다시 진행`, `이번만 건너뛰기`, `잠시 보류`를 서로 다른 실행 상태로 다룬다. `건너뜀`과 `보류`는 일정 삭제나 개인 사본 제외가 아니므로 Calendar와 ICS series membership은 유지된다.

## User path

1. `/flows` miss에서 개인 초안을 만든다.
2. `/my`에서 사용자 할 일을 추가하고 날짜와 매일 반복, 3회 종료를 지정한다.
3. `/calendar`에서 두 번째 회차를 열고 `이번만 건너뛰기`를 실행한다.
4. 새로고침 후 `건너뜀` 상태와 occurrence ID가 유지되는지 확인한다.
5. `다시 진행` 뒤 `잠시 보류`를 실행하고 다시 새로고침한다.
6. 다시 진행으로 복구하고 transition history와 Calendar membership을 확인한다.

## Interaction policy

- 행 왼쪽 체크박스는 완료와 완료 취소만 담당한다.
- `건너뜀`과 `보류`에서는 체크박스를 잠그고 `다시 진행`을 먼저 선택하게 한다.
- `건너뜀`은 이번 회차를 의도적으로 하지 않는 상태다.
- `보류`는 결정을 잠시 미룬 상태다.
- 개인 사본 제외와 draft 항목 삭제는 구조 변경이며 이 실행 상태들과 구분한다.

## Evidence scope

- Mobile: 390 x 844
- Wide: 1024 x 768 detail panel
- Automated Playwright journey: yes
- Keyboard verification: Space and Enter
- Reload persistence: yes
- Actual observed users: 0
- Source-backed recurrence controls: 0

## Files

- `audit.md`
- `route-evidence.json`
- `state-transition-fixtures.json`
- `screenshots/00-personal-draft-occurrence-skipped-mobile.png`
- `screenshots/01-personal-draft-occurrence-held-mobile.png`
- `screenshots/02-personal-draft-occurrence-state-actions-wide.png`
