# P28-04 Audit

## Before

홈트 Flow만 별도 결과 선택기와 영상 전용 source bridge를 사용했고, 4주 미리보기 범위가 저장된 반복 종료처럼 읽힐 수 있었다. 저장 전과 저장 후 반복 설정도 서로 다른 입력 문법을 사용했다.

## Implemented contract

`SavedFlowRoutineDefinition`은 기존 저장 record에 additive하게 들어간다.

- `time`, `durationMinutes`
- `end: source | none | until | count`
- 기존 `weekdays`는 호환을 위해 유지

원문 기간이 있는 Flow의 기본값은 `source`, 없는 Flow의 기본값은 `none`이다. 사용자가 `until` 또는 `count`를 선택했을 때만 개인 종료값을 저장한다. preview는 표시 범위일 뿐 저장 종료가 아니다.

## Cross-surface behavior

| Surface | Behavior |
| --- | --- |
| Find/public Flow | 공통 schedule editor와 actual occurrence preview |
| My Flow | 같은 weekdays/time/end 정의 수정 |
| Today | 일반 occurrence 완료/다시 열기 |
| Calendar | canonical occurrence row와 stable identity |
| ICS | 같은 time, duration, end, stable UID |
| Resource | 원문/공식 안내 link, completion control 없음 |

## Ownership

- source cadence와 source duration: source
- 개인 요일·시간·종료 선택: saved personal record
- 회차 done/reopened/skipped/held: execution occurrence state
- 영상/공식 안내: resource

구조, 실행 상태, 자료 link를 서로 덮어쓰지 않는다.

## Residual risk

운동 세트·횟수·강도 coaching은 의도적으로 포함하지 않았다. routine이 아닌 복잡한 운동 처방은 FlowMe의 portable execution 범위를 넘어가므로 별도 제품 결정 없이는 추가하지 않는다.
