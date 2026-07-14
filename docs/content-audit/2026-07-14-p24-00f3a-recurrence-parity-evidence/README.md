# P24-00F3A Recurrence Occurrence Parity Evidence

저장 전 `4주 12회차`로 보이던 반복 Flow가 저장 후 첫 회차만 남던 결함을 수정했다. 대표 검증은 `/f/curated-allblanc-morning-workout`에서 시작일 `2026-07-15`, 요일 `월/수/금`으로 저장한 상태다.

- Calendar는 7월 8회와 8월 4회, 총 12회차를 표시한다.
- 각 회차는 stable occurrence ID와 별도 실행 상태를 가진다.
- 한 회차 완료와 완료 취소가 다른 회차를 바꾸지 않는다.
- 회차 행은 애매한 `반복 항목 0/1` 대신 `이번 회차 대기/완료/다시 진행`을 표시한다.
- ICS는 이벤트 12개를 복제하지 않고, master `VEVENT` 1개와 표준 `RRULE`로 같은 12회 일정을 표현한다.
- 다음 달 이동은 이전 달의 가장 이른 회차로 되돌아가지 않는다.

## 결과

| marker | result |
| --- | --- |
| `sourceRoutineFourWeekSemanticOccurrenceCount` | 12 |
| `sourceRoutineCalendarJulyOccurrenceCount` | 8 |
| `sourceRoutineCalendarAugustOccurrenceCount` | 4 |
| `sourceRoutineDistinctOccurrenceIdentity` | true |
| `sourceRoutineSiblingCompletionChangedCount` | 0 |
| `sourceRoutineReopenSupported` | true |
| `sourceRoutineAmbiguousProgressCount` | 0 |
| `sourceRoutineIcsMode` | `rrule` |
| `sourceRoutineIcsMasterEventCount` | 1 |
| `sourceRoutineIcsDuplicateEventCount` | 0 |
| `sourceRoutineMonthNavigationStable` | true |
| `horizontalOverflowCount` | 0 |
| `consoleErrorCount` | 0 |

원인과 경계는 [audit.md](./audit.md), 기계 판정은 [route-evidence.json](./route-evidence.json), 전체 회차 fixture는 [recurrence-fixtures.json](./recurrence-fixtures.json)에서 확인한다.

## 화면과 다운로드

- [모바일 선택일 실행 행](./screenshots/01-allblanc-agenda-mobile.png)
- [모바일 7월 Calendar](./screenshots/02-allblanc-calendar-mobile.png)
- [wide 8월 Calendar](./screenshots/03-allblanc-calendar-wide.png)
- [4주 반복 ICS](./downloads/allblanc-four-week-routine.ics)

이 결과는 automated browser simulation이며 실제 사용자 관찰 결과가 아니다. 모바일 상세가 여전히 길고 메모·체크·도구가 한 화면에서 무거워 보이는 문제는 Claude Design `(8)` 목업 A를 반영하는 P24-00U2에서 다룬다.
