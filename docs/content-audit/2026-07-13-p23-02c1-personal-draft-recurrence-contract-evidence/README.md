# P23-02C1 Personal Draft Recurrence Contract Evidence

P23-02B2의 날짜 없음, 종일, timed 일정 위에 개인 draft 반복 series와 회차 occurrence를 분리한 pure contract를 추가했다. 이번 slice는 앱 UI, Calendar consumer, ICS builder를 연결하지 않는다.

## 결과

- `daily`, `weekly`, `monthly`와 interval, 요일, 월간 일자, until/count 종료 규칙을 정의했다.
- Item, series, rule revision, occurrence identity를 서로 분리했다.
- 한 회차의 `done`, `reopened`, `skipped`, `held`를 structural recurrence 밖의 execution record로 분리했다.
- `이번 회차만`, `이번 회차부터`, `전체 series` 수정 범위를 pure helper와 문서 정책으로 고정했다.
- legacy `{frequency, interval}`과 `repeatPreset`을 additive하게 revision 1로 변환한다.
- range 밖 회차와 무한 반복을 제한하고 중복 occurrence ID를 방지한다.
- 월말 31일은 존재하지 않는 달을 건너뛴다.
- IANA/floating timed 반복은 local wall-clock 문자열을 유지하며 실제 RRULE/TZID 직렬화는 C2로 남겼다.
- source-backed routine, source-backed/public export, 현재 앱 UI는 변경하지 않았다.

## Evidence

- [audit.md](./audit.md)
- [recurrence-fixtures.json](./recurrence-fixtures.json)
- [occurrence-state-matrix.json](./occurrence-state-matrix.json)
- [contract spec](../../specs/2026-07-13-personal-draft-recurrence-occurrence/spec.md)
- [QA](../../specs/2026-07-13-personal-draft-recurrence-occurrence/qa.md)

## 현재 연결 상태

| Surface | P23-02C1 |
|---|---|
| personal draft recurrence persistence contract | ready |
| pure occurrence generator | ready |
| occurrence execution adapter | ready |
| recurrence user UI | not connected |
| Calendar occurrence rows | not connected |
| ICS RRULE/EXDATE/RECURRENCE-ID | not connected |
| source-backed recurrence adapter | not applied |

자동 테스트와 fixture는 계약을 검증한다. 사용자가 반복을 설정하거나 회차를 완료하는 실제 경로는 아직 없으므로 실제 사용자 관찰 결과로 해석하면 안 된다.

## 검증

- targeted structural/storage suite: 42 passed
- full unit suite: 464 passed
- documentation check: passed
- production build: passed
- scoped strict TypeScript check: passed
- 390px `/my`, `/calendar`: new recurrence control 0, horizontal overflow 0
- 1024px `/my`, `/calendar`: new recurrence control 0, horizontal overflow 0
- browser console: application error 0; existing missing `favicon.ico` 404 observed once
