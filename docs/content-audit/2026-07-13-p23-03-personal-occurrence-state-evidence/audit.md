# P23-03 Personal Occurrence State Audit

## Finding

기존 계약은 occurrence별 `pending`, `done`, `reopened`, `skipped`, `held`를 저장할 수 있었지만 사용자 화면은 완료와 완료 취소만 제공했다. 그 결과 사용자가 이번 회차를 의도적으로 넘긴 경우와 아직 결정하지 않은 경우를 완료 또는 미완료로만 표현해야 했다.

## Implemented boundary

- 개인 draft의 반복 occurrence 상세에만 건너뛰기와 보류 행동을 추가했다.
- 공통 persisted transition handler가 기존 occurrence execution record와 history를 사용한다.
- Calendar 행은 `건너뜀` 또는 `보류`를 짧게 표시한다.
- 해당 상태에서는 완료 체크박스를 비활성화하고 `다시 진행`으로 복구한 뒤 완료할 수 있게 한다.
- source-backed Flow와 일반 1회성 할 일에는 새 상태 control을 노출하지 않는다.

## State ownership

| Concern | Owner | Effect |
| --- | --- | --- |
| 완료/다시 진행/건너뜀/보류 | occurrence execution record | 한 회차의 실행 기록 |
| 개인 사본 제외 | personal structural overlay | 모든 미래 projection에서 항목 제외 |
| 개인 draft 삭제 | tombstone | effective list에서 숨김, 복구 가능 |
| 반복 규칙 | personal recurrence contract | 미래 occurrence 생성 |

## Automated journey result

두 번째 occurrence의 stable ID를 기준으로 `pending -> skipped -> reopened -> held -> reopened`을 재현했다. `skipped`와 `held` 각각에서 새로고침 뒤 상태와 ID가 유지됐고 transition history는 순서대로 남았다. 상태 전환 중 Calendar의 세 occurrence는 모두 유지됐다.

## Visual review

- 390px: 상태 label, 잠긴 완료 체크, 복구 행동이 한 패널에서 구분되며 horizontal overflow는 없었다.
- 1024px: selected-day detail의 보조 상태 행동이 완료 체크와 분리되어 보였다.
- 상태 설명은 detail 안에서만 노출해 Calendar row 밀도를 늘리지 않았다.

## Regression boundary

- source-backed demo에는 occurrence execution action이 0개다.
- stable occurrence ID와 recurrence series membership을 유지한다.
- P19의 완료 체크박스 1종 정책을 유지한다.
- 기존 ICS contract상 completion/execution state는 series membership을 변경하지 않는다.

## Remaining risks

- 실제 사용자가 `건너뜀`과 `보류`의 차이를 설명 없이 구분하는지는 관찰되지 않았다.
- occurrence 자체의 날짜 이동/제외와 `건너뜀`의 구분 UI는 후속 범위다.
- series 일시중지와 종료 정책은 아직 UI가 없다.
- wide 증거는 selected-day detail 패널 캡처이며 전체 1024px 화면의 시각 밀도는 P23 최종 시뮬레이션에서 다시 확인한다.
