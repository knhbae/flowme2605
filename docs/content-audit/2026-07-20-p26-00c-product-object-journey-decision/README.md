# P26-00C Product Object & Journey Decision

**Date:** 2026-07-20

**Baseline:** `48571afeb63dc06a321e5ab49ccf50522bfa7c29`

**Runtime/schema change:** none

**Observed-user sessions:** `0`

## 판정

P26의 사용자-facing 객체는 `Flow` 하나로 통일한다. `Flow Map`은 source bundle과 내부 aggregate로 남을 수 있지만 Home, `/flows`, save-before, post-save에서 별도 카드와 별도 저장 문법을 사용하지 않는다.

선택한 화면 방향은 다음이다.

1. 카드: `구체적 일 -> 검증 가능한 source -> 대표 항목 -> 필요한 입력 -> 결과 범위`
2. 저장 전: whole artifact를 먼저 보고 `그대로 시작` 또는 `내게 맞게 조정`
3. 저장 후: Today 한 행이 아니라 저장된 whole Flow receipt
4. My Flow: 실행과 개인 조정의 집, 콘텐츠 모양에 맞는 grouping
5. Calendar: dated projection과 명시적 Flow filter, 날짜 없는 일은 on-demand placement tray
6. Editor: quick fields 3개, advanced disclosure, 별도 batch mode
7. Export: 범위와 예상 개수를 형식보다 먼저 선택

이 방향은 P25 Option B의 source/personal/run, whole-Flow, reversible completion, Calendar placement, export scope 계약을 유지하면서 오너 피드백의 정보 부족과 조정 발견성 문제를 교정한다.

## 자료

- [Interactive prototype](./prototype.html)
- [Screen contract](./screen-contract.md)
- [Detailed audit](./audit.md)
- [Decision matrix](./decision-matrix.json)
- [Route evidence](./route-evidence.json)
- [Capture metrics](./capture-results.json)
- [Claude/Codex review prompt](./prompt-ko.md)
- `screenshots/current/`
- `screenshots/proposed/`

## 결정 요약

| 질문 | 선택 | 기각한 방향 |
| --- | --- | --- |
| Flow/Flow Map | user-facing Flow 통일 | 서로 다른 card/detail 문법 |
| 카드 hierarchy | job + verified source + artifact preview | 긴 promise 문장, 가짜 social proof |
| save timing | 그대로 시작 + 조정 두 경로 | 저장만 강제, full planner 선행 |
| whole Flow | content-shape adaptive body | 모든 콘텐츠를 date list로 강제 |
| editor | quick sheet + advanced disclosure | 모든 필드 상시 노출 |
| Calendar tray | 필요 시 열기 | 날짜 없는 전체 실행 목록 상시 노출 |
| wide Calendar | task-focused 2-pane 기본 | queue/grid/agenda 3-pane 항상 고정 |

## Evidence 경계

- `current_source`: 최신 clean main의 코드와 문서
- `current_production_interaction`: 이번 package에서 새로 캡처한 production 화면
- `prior_design_artifact`: Claude Design (9) 제안
- `owner_feedback`: 사용자가 직접 제기한 문제와 기대
- `heuristic_simulation`: prototype 비교와 persona replay
- `observed_user`: 없음

자동화와 prototype은 사용성 검증 완료를 의미하지 않는다.

## Capture 결과

- proposed prototype: `16` frames (`8` surfaces x `390/1024`)
- current production: `10` frames (`5` routes x `390/1024`)
- prototype horizontal overflow / console error: `0 / 0`
- production HTTP failure / horizontal overflow / console error: `0 / 0 / 0`
- representative public save-before visible text blocks: current mobile `63`, proposed mobile `12`
- representative public save-before visible actions: current mobile `16`, proposed mobile `8`

텍스트/action 수 비교는 current production과 heuristic prototype의 정보 밀도 비교다. 사용자가 더 잘 이해했다는 observed evidence가 아니다. Fresh browser에서 `/my?savedMap=...`와 `/calendar?savedMap=...` query만으로 local saved state는 만들어지지 않았으므로 해당 current 캡처는 empty-state evidence이며, 저장 후 상태는 P25 prior artifact와 후속 interactive replay에서 별도로 검증한다.

## 다음 실행

P26-01~05 correctness foundation을 우선한다. P26-06 이후 runtime 화면 구현은 이 package의 화면 계약을 따른다.
