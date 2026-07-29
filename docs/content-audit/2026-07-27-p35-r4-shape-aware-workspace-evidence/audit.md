# P35-R4 Shape-aware execution and history audit

## 변경 전

- 모바일은 모든 Flow에 `다음 행동 / 전체 계획 / 기록` 세 탭을 고정했다.
- memo/guide에도 합성된 다음 행동과 비어 있는 기록 화면이 생겼다.
- wide에서는 전체 계획의 오른쪽 inspector 안에 next summary가 있어 mobile과
  의미 순서가 달랐다.
- 반복 Flow의 source series row와 실제 occurrence가 같은 수준으로 읽혔다.

## 변경 후

- mobile과 wide가 같은 shape-aware model을 사용한다.
- 일정형 날짜 묶음은 Calendar와 같은 stable row identity를 유지한다.
- routine의 실행 행은 기존 Calendar occurrence projection을 읽고 series
  summary는 별도 수준으로 표시한다.
- sheet는 현재 행과 다음 행만 상단에서 예고하고 전체 표는 아래에 둔다.
- memo는 execution unit을 만들지 않는다.
- 완료, held occurrence, run history, reflection 같은 event가 없으면 history를
  렌더링하지 않는다.

## 데이터 경계

| Layer | 결과 |
| --- | --- |
| source | 변경 없음 |
| personal overlay | 기존 값만 읽음 |
| execution run | 완료와 history visibility에 사용 |
| occurrence | 기존 routine projection과 stable identity 재사용 |
| export | 변경 없음 |
| localStorage | key/schema/migration 변경 없음 |

## Evidence

| Shape | Viewport | Execution unit | History |
| --- | ---: | --- | --- |
| dated moving | 390x844 | nearest date group, 4 rows | 첫 완료 전 숨김, 완료 후 표시 |
| routine workout | 390x844 | current occurrence + series summary | 새 실행에서 숨김 |
| sheet new car | 1024x768 | current row + next row | 새 실행에서 숨김 |
| memo passport | 390x844 | 없음 | 새 실행에서 숨김 |

Evidence kind는 current browser automation과 current source다. observed-user
count는 `0`이다.
