# P26-03 반복 series / occurrence 정합성 evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `cd0259cab71007312c8ab04c2bdb06fbcfaa1bac`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

P26-03은 반복 Flow의 설정 정의와 실행 회차를 분리하고, 공개 저장 전과 My Flow 저장 후의 Calendar/ICS가 같은 canonical series를 사용하도록 고정했다. 자동화와 screenshot은 실제 사용자 검증이 아니다.

## 해결한 문제

1. 공개 월간 루틴 ICS는 `RRULE`을 가진 series였지만 My Flow 전체 가져가기는 같은 루틴을 단일 이벤트로 만들었다.
2. Flow 전체에서 반복 정의를 열 때 다음 occurrence를 대신 열어 설정과 실행 레벨이 섞였다.
3. 반복 정의가 날짜 없는 실행 항목으로 분류될 수 있었다.
4. export preview가 반복 series 수와 현재 표시 회차 수를 구분하지 않았다.

## 적용 결과

- Flow 전체: `반복 설정` 정의를 열며 완료 체크박스는 없다.
- Today / Calendar: projected occurrence만 실행하고 occurrence당 완료 체크박스 하나를 사용한다.
- Calendar 날짜 정하기 tray: series definition을 제외한다.
- My Flow 전체/현재 항목 ICS: 공개 Flow와 같은 series ID, UID, RRULE을 사용한다.
- export preview: `반복 일정 N개 · 표시 회차 N개`를 별도로 보여준다.
- exact-video + schedule-user-choice 루틴: 기존 4주 preview 계약을 canonical series 종료일에도 적용한다.

## 핵심 수치

| marker | 결과 |
| --- | ---: |
| public / My Flow monthly UID mismatch | 0 |
| public / My Flow monthly RRULE mismatch | 0 |
| monthly VEVENT count | 1 / 1 |
| series definition completion control | 0 |
| occurrence completion control | 1 |
| series definition undated-tray item | 0 |
| completion/reopen identity change | 0 |
| recurrence duplicate occurrence | 0 |
| console error | 0 |
| horizontal overflow | 0 |

전체 marker는 [route-evidence.json](./route-evidence.json), fixture 판정은 [recurrence-fixtures.json](./recurrence-fixtures.json)에 있다.

## 화면 evidence

- [공개 월간 preview 390px](./screenshots/01-washer-monthly-preview-mobile.png)
- [월간 occurrence agenda 390px](./screenshots/02-washer-monthly-agenda-mobile.png)
- [Calendar wide 1024px](./screenshots/03-washer-monthly-calendar-wide.png)
- [My Flow 반복 설정 390px](./screenshots/04-published-routine-series-mobile.png)
- [My Flow 반복 export preview 390px](./screenshots/05-washer-series-export-mobile.png)

## 다운로드 evidence

- [공개 월간 ICS](./downloads/washer-public-monthly-routine.ics)
- [My Flow 전체 월간 ICS](./downloads/washer-my-flow-monthly-routine.ics)
- [Calendar occurrence 상세 월간 ICS](./downloads/washer-monthly-routine.ics)

## 현재 실행 검증

- targeted recurrence unit: `21 / 21` pass
- full unit: `537 / 537` pass
- targeted Playwright: `4 / 4` pass
- public share / workbench regression Playwright: `44 / 44` pass
- docs check: pass, `2,569` local links
- production build: pass, 18 routes
- `git diff --check`: pass

## 남은 범위

- 여러 독립 series를 가진 한 Flow는 fixture 확장이 더 필요하다.
- 복잡한 cron editor, 알림 발송, 무한 미래 occurrence materialization은 범위 밖이다.
- 실제 사용자가 `반복 설정`과 `이번 회차`를 설명 없이 구분하는지는 P26-19 이후 관찰 후보이며 현재 검증값은 아니다.
