# P24-00F2A Effective Date Projection Parity Evidence

항목별 날짜 수정값을 해석하는 우선순위를 하나의 pure resolver로 통합했다.

- 우선순위: 개인 draft 값 > 실행 중 날짜 수정 > 저장한 개인 사본 > 원본 날짜
- Today, 전체 목록, Calendar, 실행 기록 snapshot이 같은 resolver를 사용한다.
- 항목 ID, 완료 상태, 날짜 override localStorage key와 source Item은 변경하지 않았다.
- 날짜 없는 source-backed 체크리스트에 날짜를 지정하는 실제 사용자 경로로 Calendar와 ICS까지 검증했다.

## 결과

| marker | result |
| --- | --- |
| `effectiveDateResolverShared` | true |
| `todayUsesEffectiveDate` | true |
| `fullListUsesEffectiveDate` | true |
| `calendarUsesEffectiveDate` | true |
| `icsUsesEffectiveDate` | true |
| `sourceItemMutationCount` | 0 |
| `completionIdentityChangeCount` | 0 |
| `horizontalOverflowCount` | 0 |
| `consoleErrorCount` | 0 |

상세 원인과 검증 경로는 [audit.md](./audit.md), 기계 판정은 [route-evidence.json](./route-evidence.json)을 본다.
