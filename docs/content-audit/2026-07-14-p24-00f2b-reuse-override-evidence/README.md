# P24-00F2B Reuse Override Transfer Evidence

완료한 Flow를 새 기준일로 다시 시작할 때 `내가 바꾼 날짜 유지`가 실제 새 실행에도 유지되도록 수정했다.

- 과거 실행 snapshot은 이전 기준일의 key와 값 그대로 보존한다.
- 새 실행 snapshot과 현재 local state만 새 기준일에서 계산된 source row key로 옮긴다.
- 고정한 개인 날짜 값은 바꾸지 않는다.
- `새 이사일에 맞추기`는 기존처럼 개인 날짜를 지우고 전체 일정을 다시 계산한다.
- Today와 Calendar는 새 실행의 동일한 effective date를 읽는다.

## 결과

| marker | result |
| --- | --- |
| `keepFixedDateValuePreserved` | true |
| `dateOverrideKeyRekeyed` | true |
| `oldActiveOverrideKeyCount` | 0 |
| `completedSnapshotOldKeyPreserved` | true |
| `resetPolicyStillClears` | true |
| `todayUsesRetainedFixedDate` | true |
| `calendarUsesRetainedFixedDate` | true |
| `sourceMutationCount` | 0 |
| `historyMutationCount` | 0 |
| `horizontalOverflowCount` | 0 |
| `consoleErrorCount` | 0 |

원인과 정책은 [audit.md](./audit.md), 기계 판정과 화면 목록은 [route-evidence.json](./route-evidence.json)에서 확인한다.

