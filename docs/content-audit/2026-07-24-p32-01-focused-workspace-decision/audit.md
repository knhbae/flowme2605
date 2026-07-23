# P32-01 Audit

## 실행 조건

- repository: `D:\flowme2605\flow-p32-planning`
- branch: `codex/p32-program`
- baseline: `a2e1d72dadda0104f97682ae662dfbc113a85318`
- viewport: `390x844`, `1024x768`
- route: `/my?demo=ux20&view=flows`
- fixture: 27 saved Flow
- evidence boundary: current fixture browser, current source, prior review comparison

## Finding 1: library는 유지할 가치가 있다

- severity: Keep
- reproduction:
  1. Flow 목록 진입
  2. `이사` 검색
  3. `이사 준비` 열기
- actual: 2 interactions로 focused Flow에 도달한다.
- expected: P32 이후에도 1/5/20/60 Flow에서 2 interactions 이하를 유지한다.
- evidenceKind: `current_fixture_browser`

## Finding 2: selected Flow와 global local navigation이 경쟁한다

- severity: High
- route: `/my?demo=ux20&view=flows`
- viewport: 390, 1024
- actual:
  - 상위 `My Flow` 설명, Studio/Data Manager, `지금 / Flow 목록 / 완료`가 남아 있다.
  - 그 아래에 선택한 Flow의 `실행 / 전체 계획 / 기록`이 다시 나타난다.
- expected:
  - library state에는 cross-Flow navigation이 보인다.
  - focused state에는 선택한 Flow object header와 local workspace만 보인다.
- user impact:
  - global question과 object question의 위계가 섞인다.
  - 모바일 첫 viewport에서 선택한 Flow의 실제 행동이 아래로 밀린다.
- evidenceKind: `current_fixture_browser`, `current_source`

## Finding 3: wide shell은 폐기보다 정리가 맞다

- severity: Keep/Change
- viewport: 1024
- actual:
  - rail, 전체 Flow canvas, 다음 행동 inspector가 이미 존재한다.
  - global My Flow header/tabs가 위에 남고 export/manage가 canvas 아래로 분리된다.
- expected:
  - 기존 rail/canvas/inspector를 유지한다.
  - object header와 contextual commands를 canvas/inspector에 통합한다.
- evidenceKind: `current_fixture_browser`, `current_source`

## Finding 4: 닫힌 mixed route를 재공개하면 안 된다

- severity: Correctness
- current source:
  - `real-mofa-overseas-travel-prep`는 `source_fit_review_required`
  - E2E가 public route에서 닫힘을 명시적으로 검증한다.
  - `overseas-travel-d14`도 public execution 대상이 아니다.
- decision:
  - public mixed journey는 blocked로 기록한다.
  - renderer/projection 검증에는 `overseas-travel-d14` fixture만 사용한다.
- evidenceKind: `current_source`

## Finding 5: current dev console warning

- severity: Medium
- actual: `MyFlows` list child의 unique key warning 1건
- expected: P32 final gate에서 console/page error 0
- evidenceKind: `current_fixture_browser`

## B1/B2 결정

| 질문 | B1 | B2 |
| --- | --- | --- |
| 검증된 cross-Flow `지금` 유지 | 예 | 아니오 |
| focused Flow에서 local navigation 경쟁 제거 | 예 | 예 |
| current projection 변경 | 없음 | 필요 |
| rollback | focused-state 조건 제거 | global tab 복원 필요 |
| P31 안정 계약 위험 | 낮음 | 중간 |

따라서 B1을 선택한다. B2는 P32 자동 검증으로 승격하지 않고 실제 사용자 관찰 이후 재검토 후보로 남긴다.
