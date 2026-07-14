# P24-00F1 Local Date Boundary Evidence

UTC timestamp와 사용자 local calendar date를 분리했다.

- timestamp serialization: 기존 `formatDate` UTC 계약 유지
- 사용자 오늘/기본 날짜: 새 `formatLocalDate` 사용
- KST 오전, UTC-08, DST 경계 fixture 추가
- Today, Calendar 초기일, 개인 draft 날짜 지정 기본값, public workbench의 현재일 기준 계산에 적용

## 결과

| marker | result |
| --- | --- |
| `localDateContractSeparatedFromUtc` | true |
| `kstMorningDefaultDate` | `2026-07-14` |
| `utcSerializedDateForSameInstant` | `2026-07-13` |
| `dstBoundaryFixturePass` | true |
| `personalDraftDateDefaultUserReachable` | true |
| `sourceDateOnlyContractChanged` | false |

상세 경로와 검증 결과는 [audit.md](./audit.md), 기계 판정은 [route-evidence.json](./route-evidence.json)을 본다.
