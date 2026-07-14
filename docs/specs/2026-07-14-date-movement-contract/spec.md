# P24-00S1 날짜 이동 계약

**상태:** 구현 및 단위 검증 완료

**적용 범위:** pure contract, fixture, 테스트

**앱 UI 변경:** 없음

## 목적

날짜 변경을 단순한 date input 저장이 아니라 `어떤 범위를 어떤 규칙으로 옮기는가`로 정의한다. Claude Design `(8)`의 핵심 제안인 `연동 일정 재계산 / 고정 일정 유지 / 적용 전 영향 예고`를 코드 계약으로 고정한다.

## 상태 소유권

| 상태 | 의미 | 직접 날짜 변경 결과 |
| --- | --- | --- |
| `linked` | Flow 기준일과 상대 간격으로 계산되는 일정 | 단일·선택 이동 시 `fixed`로 전환 |
| `fixed` | 사용자가 직접 지정한 날짜 | 기준일 변경 시 유지 |
| `unscheduled` | 유효한 날짜가 없는 할 일 | My Flow와 목록 export에는 남고 Calendar/ICS에서는 제외 |

완료, 완료 취소, 건너뜀, 보류는 실행 상태다. 날짜 이동은 이 상태와 이력을 변경하지 않는다.

## 이동 범위

| 범위 | 계약 |
| --- | --- |
| `single` | 한 항목의 날짜를 지정·이동·제거한다. 직접 지정한 결과는 `fixed`다. |
| `selected` | 선택한 항목 전체에 같은 목표 날짜 또는 같은 일수 차이를 원자적으로 적용한다. |
| `anchor` | 기준일과 `linked` 항목만 다시 계산한다. `fixed`와 `unscheduled`는 유지한다. |
| `occurrence` | 반복의 이번 회차만 reschedule override로 이동한다. occurrence ID와 실행 이력을 유지한다. |
| `future_series` | 현재 pending/reopened 회차부터 새 recurrence revision을 만든다. |
| `whole_series` | 실행 이력이 없으면 기존 revision identity를 유지한 채 전체 시작을 이동한다. 이력이 있으면 과거를 보존하는 새 revision으로 처리한다. |

## 원자성 및 미리보기

- 모든 bulk 이동은 `isAtomic: true`다.
- 선택 목록에 날짜 없는 항목이 포함된 상태에서 delta 이동은 전체를 차단한다.
- 반복 항목을 `single` 또는 `selected`로 이동하지 않는다. 먼저 회차/series 범위를 선택해야 한다.
- 미리보기는 선택 수, 변경 수, 연동 재계산 수, 고정 변경/유지 수, 날짜 없음 변경/유지 수, 회차·series 수, 실행 상태 수를 제공한다.
- consumer는 이 수치로 `연동 2개 재계산, 고정 1개 유지`처럼 적용 전 결과를 보여준다.

## 반복 일정 안전 정책

- 이번 회차 이동은 done/skipped/held 상태여도 occurrence ID를 유지한 채 날짜만 이동할 수 있다.
- `future_series` cutover는 pending/reopened 회차에서만 시작한다.
- 미래 시작을 뒤로 미루면 기존 규칙이 그 사이에 만들 회차를 명시적 exclude override로 막는다.
- 미래 series를 과거 방향으로 이동하려면 `cutover date`와 `new start date`를 분리하는 추가 계약이 필요하므로 현재 차단한다.
- 실행 이력이 있는 전체 series 수정은 과거 revision과 실행 기록을 보존하고 새 revision을 추가한다.
- 반복 회차의 날짜 제거는 `날짜 없음`으로 바꾸지 않는다. 회차 skip 또는 series 종료 정책을 사용해야 한다.

## 시간과 DST

- 날짜 차이는 UTC milliseconds가 아니라 plain calendar date 일수로 계산한다.
- time, duration, IANA timezone은 날짜 이동 전후 그대로 보존한다.
- 따라서 DST 경계를 지나도 사용자가 정한 현지 wall-clock 시간이 바뀌지 않는다.

## Projection

| 상태 | Calendar | ICS | checklist | sheet | memo |
| --- | --- | --- | --- | --- | --- |
| 날짜 있음 | 포함 | 포함 | 포함 | 포함 | 포함 |
| 날짜 없음 | 제외 | 제외 | 포함 | 포함 | 포함 |
| tombstoned/excluded | 제외 | 제외 | 제외 | 제외 | 제외 |

## Undo와 동시 수정 방어

- plan은 적용 전 상태, 적용 후 상태, source/result fingerprint, undo token을 함께 가진다.
- source fingerprint가 달라진 stale plan은 적용하지 않는다.
- result fingerprint가 다른 상태에는 undo를 적용하지 않는다.
- undo는 날짜, 시간, 순서, 실행 상태, recurrence data를 포함한 이전 상태를 그대로 복구한다.

## 비범위

- UI와 localStorage consumer 연결
- Calendar `날짜 없음` 트레이
- drag-and-drop
- source-backed 원본 수정
- 반복 series 과거 방향 cutover
- 계정, DB, cloud sync, OAuth
