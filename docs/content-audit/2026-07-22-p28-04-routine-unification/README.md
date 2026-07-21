# P28-04 Routine Interaction Unification Evidence

**Date:** 2026-07-22
**Evidence kind:** current source, current browser, automated simulation
**Observed users:** 0

## Verdict

반복 Flow를 운동 전용 실행 도구로 확장하지 않고 일반 Flow의 일정·회차·완료 문법으로 통합했다.

- 저장 전과 My Flow가 같은 `RoutineScheduleEditor`를 사용한다.
- 요일, 시간, 예상 시간, 종료 없음, 날짜까지, 횟수까지, 원문 기간을 한 저장 계약으로 관리한다.
- 화면에 보이는 4주 미리보기와 실제 series 종료를 분리했다.
- 운동 전용 `완료/강도 낮춤/휴식으로 변경` 결과 선택기는 제거했다.
- 영상과 공식 안내는 완료 체크가 없는 공통 자료 block으로 낮췄다.
- Calendar와 ICS는 저장된 routine definition을 canonical occurrence projection으로 읽는다.

## Markers

| Marker | Result |
| --- | --- |
| `sharedRoutineEditorConnected` | true |
| `previewHorizonStoredAsSeriesEnd` | false |
| `openEndedRoutineSupported` | true |
| `untilRoutineSupported` | true |
| `countRoutineSupported` | true |
| `routineTimeAndDurationPersisted` | true |
| `workoutOnlyCompletionControlCount` | 0 |
| `resourceCompletionControlCount` | 0 |
| `stableRoutineUidAfterDefinitionEdit` | true |
| `sourceMutationCount` | 0 |
| `horizontalOverflowCount` | 0 |

## Screenshots

- `screenshots/03-mobile-routine-shared-contract.png`
- `screenshots/04-wide-routine-shared-contract.png`

자동화 결과는 실제 사용자 관찰로 계산하지 않았다.
