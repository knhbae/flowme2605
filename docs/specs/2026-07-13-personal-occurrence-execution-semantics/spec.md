# P23-03 Personal Occurrence Execution Semantics

**Date:** 2026-07-13
**Status:** Implementation slice
**Scope:** Personal draft recurring occurrences

## Decision

반복 할 일의 한 회차에는 아래 실행 상태를 사용한다.

| State | User meaning | Recovery | Calendar/ICS membership |
| --- | --- | --- | --- |
| `pending` | 아직 처리하지 않음 | 완료, 건너뜀, 보류 | 유지 |
| `done` | 이번 회차를 끝냄 | 완료 체크를 해제해 다시 진행 | 유지 |
| `reopened` | 완료·건너뜀·보류 뒤 다시 진행 | 완료, 건너뜀, 보류 | 유지 |
| `skipped` | 이번 회차는 의도적으로 하지 않음 | `다시 진행` | 유지 |
| `held` | 아직 결정하지 않고 잠시 미룸 | `다시 진행` | 유지 |

`skipped`와 `held`는 구조를 바꾸지 않는다. 따라서 Calendar 행, ICS series, checklist/sheet/memo membership은 유지된다.

## Structural States

- `exclude`: 개인 사본에서 항목을 빼는 구조 변경이다. 다음 실행과 export projection에서 제외된다.
- `delete`: 개인 draft 항목을 tombstone으로 숨기는 구조 변경이다. 복구할 수 있고 원본이나 과거 실행 기록을 지우지 않는다.
- occurrence structural exclusion: 한 회차의 일정을 구조적으로 없애는 예외다. `skipped`와 다르며 이번 UI 범위에는 포함하지 않는다.

## Interaction

- 행 왼쪽 체크박스는 완료와 완료 취소만 담당한다.
- `건너뜀` 또는 `보류`인 회차의 체크박스는 비활성화한다. 사용자는 먼저 `다시 진행`으로 상태를 되돌린다.
- `이번만 건너뛰기`와 `잠시 보류`는 회차 상세 안의 보조 행동으로 둔다.
- 행에는 `건너뜀` 또는 `보류` 상태를 짧은 label로 표시한다.
- 상태 행동의 accessible name은 할 일 제목과 이번 회차 맥락을 포함한다.

## Non-recurring Tasks

일반 1회성 할 일에는 공통 `보류` 메뉴를 추가하지 않는다. 완료/완료 취소, 날짜 변경, 개인 사본 제외, 개인 draft 삭제가 이미 서로 다른 목적을 가진다. 콘텐츠 자체가 결정을 요구하면 기존 domain-specific `보류` 값을 사용한다.

## Invariants

- execution record는 structural recurrence rule이나 source Item을 수정하지 않는다.
- 완료, 다시 진행, 건너뜀, 보류 전환 후 stable occurrence ID를 유지한다.
- 새로고침 뒤 상태와 transition history를 유지한다.
- 완료·건너뜀·보류는 recurrence Calendar/ICS event 수를 바꾸지 않는다.
- source-backed recurrence에는 이 personal occurrence control을 적용하지 않는다.

## Out Of Scope

- 한 회차 일정 제외·이동 UI
- 이번 회차부터 반복 규칙 변경 UI
- series 일시중지·종료 UI
- 일반 1회성 task용 새 execution-state schema
- source-backed recurrence 편집
- account, database, cloud sync, OAuth
