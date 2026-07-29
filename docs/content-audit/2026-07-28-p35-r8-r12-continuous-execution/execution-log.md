# P35-R8~R12 execution log

## 2026-07-28 - Stage 0 시작

### Git 기준

- branch: `codex/p35-mece-ux-reset`
- HEAD: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- upstream: `origin/main`
- ahead/behind: `0/0`
- modified: `58`
- untracked: `56`
- unmerged: `0`

### Ownership

- runtime, tests, content-audit, specs의 기존 P35 변경은 보존한다.
- 이번 연속 실행이 새로 소유하는 경로:
  - `docs/specs/2026-07-26-flowme-mece-ux-reset/p35-r8-r12-continuous-execution-goal-ko.md`
  - `docs/content-audit/2026-07-28-p35-r8-r12-continuous-execution/`
  - 이후 각 Stage에서 명시적으로 기록한 코드와 테스트
- 기존 파일을 stage, revert, delete하지 않는다.

### Baseline command

- `npm.cmd run workflow:session-start`: 통과
- targeted unit:
  - `effective-routine-projection`
  - `routine-schedule-presentation`
  - `artifact-recommendation`
  - `my-flow-shape-aware-workspace`
  - 결과: `23 / 23`
- build: 실행 중

### Known blocker

`occurrenceExecutionRange`가 오늘 기준 `-31일~+7일`이고
`getMyFlowShapeAwareOpenRows`가 Calendar/execution projection의 행만 읽는다.
시작일이 horizon 경계에 걸리면 다음 실제 occurrence가 projection 밖에 있어
series가 유효한데도 종료 문구가 표시된다.

### 다음 작업

Calendar visible range와 별개로 다음 open occurrence 한 건을 찾는 pure selector와
unit regression을 추가한다.

## 2026-07-28 - P35-R8A 완료

### 구현

- Calendar visible range와 분리된 next-open occurrence selector를 추가했다.
- open-ended 반복은 progressive bounded search로 다음 회차 한 건을 찾는다.
- finite count가 끝난 경우에만 종료 상태를 반환한다.
- receipt는 `반복 계획 1개 · 계속 반복`으로 series와 occurrence를 구분한다.
- export summary는 반복 계획 수, ICS event 수, 화면 회차 수를 분리한다.

### 검증

- routine/projection targeted unit: 통과
- `open routine` Playwright: `2 / 2`
- 완료 후 다음 회차 이동과 다시 열기 stable occurrence ID: 통과
- production build: 통과

### Evidence

- `screenshots/p35-r8a-routine-next-occurrence-390.png`
- `screenshots/p35-r8a-routine-series-export-390.png`
- `screenshots/p35-r8a-routine-series-export-1024.png`

## 2026-07-28 - P35-R8B 완료

### 판정

`overseas-safety-register`의 네 항목은 읽기 자료가 아니라 사용자가 수행할 독립
행동이다. 따라서 Checklist primary, Memo secondary로 통일했다.

### 구현

- seed의 primary destination을 checklist로 정정했다.
- public preview, export preflight, receipt, saved workspace가 같은 artifact 의미를
  사용한다.
- source link와 주의 정보는 resource로 남고 completion denominator에는 들어가지
  않는다.

### 검증

- artifact/projection targeted unit 포함 R8 cluster: `64 / 64`
- public -> receipt -> saved execution Playwright: `1 / 1`
- public preview completion checkbox: `0`
- saved current execution completion checkbox: `3`
- 390/1024 overflow와 console/page error: `0`

### Evidence

- `screenshots/p35-r8b-safety-public-checklist-390.png`
- `screenshots/p35-r8b-safety-saved-checklist-390.png`
- `screenshots/p35-r8b-safety-saved-checklist-1024.png`

## 2026-07-28 - P35-R8C 완료

### 구현

- 현재 실행 묶음의 stable Item만 completion control을 소유한다.
- 전체 계획의 같은 stable Item은 `현재 위치 · N개` 요약으로 대체한다.
- 완료한 행이 전체 계획에 남는 경우 snackbar undo를 만들지 않고, 해당 checkbox로
  다시 열게 한다.
- Calendar 또는 현재 surface에서 사라지는 완료에만 기존 undo를 유지한다.

### 검증

- completion ownership unit: 통과
- focused execution Playwright: `1 / 1`
- 초기 visible completion control: `4`
- 전체 계획 현재 위치 completion control: `0`
- 완료 후 전체 계획에서 다시 열기: 통과
- 불필요한 completion undo: `0`
- 390/1024 overflow와 console/page error: `0`

### Evidence

- `screenshots/p35-r8c-single-completion-owner-390.png`
- `screenshots/p35-r8c-single-completion-owner-1024.png`

## 2026-07-28 - R8 cluster gate

- targeted unit: `64 / 64`
- targeted Playwright: `4 / 4`
- `npm.cmd run build`: 통과
- storage/schema migration: 없음
- stable source/personal/run/series/occurrence/export identity 변경: 없음
- observed-user count: `0`

## 2026-07-28 - P35-R9 완료

### 구현

- 저장 후 실행 행은 제목·메타·열기·완료 영역이 같은 row anatomy를 사용한다.
- 완료 체크는 저장 후 행의 trailing slot 한 곳에서만 제공한다.
- 저장 전 다섯 artifact preview는 같은 시각 문법을 쓰되 완료 기능이 없는 preview 행으로 구분한다.
- 모바일 항목 상세의 닫기 명령을 bottom sheet header 한 곳으로 통합했다.
- 긴 제목은 control 너비를 침범하지 않고 줄바꿈한다.

### 검증

- `tests/e2e/p35-r9-shared-row-grammar.spec.ts`: `6 / 6`
- 390px 다섯 shape preview/saved row grammar: 통과
- 1024px saved row trailing completion: 통과
- preview completion control: `0`
- 모바일 상세 중복 닫기: `0`
- production build: 통과

## 2026-07-28 - P35-R10 완료

### 구현

- My Flow library filter를 `전체 / 진행 중 / 완료 / 보관됨` lifecycle 한 축으로 제한했다.
- Memo shape는 실행 체크와 진행률을 만들지 않고 기록 행으로 표시한다.
- 한 series인 routine은 가짜 `0/1` progress bar 대신 series와 현재 occurrence를 구분한다.
- 같은 날짜의 여러 행은 날짜 group header가 날짜를 한 번 소유한다.
- export preflight의 scope/count summary owner를 한 곳으로 제한했다.
- 사용자 화면의 `내 버전` 표현을 `개인 사본`으로 바꿨다.

### 검증

- `tests/e2e/p35-r10-shape-honesty.spec.ts`: `5 / 5`
- 기존 My Flow lifecycle filter 회귀: `5 / 5`
- 동일 날짜 다중 행 fixture: `vehicle-inspection-prep`
- Memo completion/progress control: `0`
- preview/export 내부 구조어 노출: `0`
- production build: 통과
- storage/schema migration: 없음
- observed-user count: `0`

### Evidence

- `screenshots/p35-r10-memo-record-grammar-390.png`
- `screenshots/p35-r10-routine-series-occurrence-390.png`
- `screenshots/p35-r10-export-one-summary-owner-390.png`
- `screenshots/p35-r10-group-date-owner-1024.png`
- `screenshots/p35-r10-library-lifecycle-filter-390.png`

## 2026-07-28 - P35-R11 완료

### 구현

- 1024/1440 My Flow를 library rail, execution canvas, contextual inspector로
  분리했다.
- 모바일은 별도 inspector 없이 현재 실행 다음에 전체 계획이 이어지는 순서를
  유지했다.
- Routine은 series 정의, 현재 occurrence, 기록을 각각 다른 hierarchy로
  표시한다.
- layout wrapper만 변경하고 projection과 storage는 재사용했다.

### 검증

- `tests/e2e/p35-r11-wide-workspace.spec.ts`: `3 / 3`
- 390/1024/1440 horizontal overflow: `0`
- console/page error: `0`
- production build: 통과

### Evidence

- `screenshots/p35-r11-mobile-execution-plan-order-390.png`
- `screenshots/p35-r11-wide-execution-inspector-1024.png`
- `screenshots/p35-r11-routine-series-current-history-1440.png`

## 2026-07-28 - P35-R12 완료

### 구현

- `/my?experiment=todo`에 opt-in 교차 Flow Todo 실험을 연결했다.
- Todo는 today, upcoming, undated, completed로 묶고 실행 Item만 포함한다.
- Memo 기록, resource, routine series 정의는 제외하고 routine current
  occurrence와 Sheet current row만 포함한다.
- Todo에서 날짜를 지정하면 같은 stable Item이 Calendar로 이동하고, 날짜를
  제거하면 다시 undated로 돌아온다.
- 실험을 닫으면 저장 데이터 변경 없이 기본 My Flow로 복귀한다.

### 검증

- pure projection unit: `5 / 5`
- `tests/e2e/p35-r12-cross-flow-todo-experiment.spec.ts`: `3 / 3`
- 390/1024/1440 horizontal overflow: `0`
- source/personal/run/occurrence/export identity mutation: `0`
- production build: 통과

### Evidence

- `screenshots/p35-r12-cross-flow-todo-390.png`
- `screenshots/p35-r12-cross-flow-todo-1024.png`
- `screenshots/p35-r12-cross-flow-todo-1440.png`
- `screenshots/p35-r12-date-remove-undated-390.png`

## 2026-07-28 - Completion visibility bounded revision

### 발견

R0의 현재 날짜 묶음에서 완료한 행이 접힌 전체 계획 안으로 이동해 실제 화면에서
사라졌지만, selected Flow가 열려 있다는 이유만으로 undo가 생략됐다.

### 수정

- 완료 후 해당 Item이 속한 전체 계획 group이 실제로 열려 있는지 계산한다.
- 펼쳐진 group에 동일 checkbox가 남으면 snackbar undo를 생략한다.
- 접힌 group으로 이동하면 `되돌리기`를 제공한다.
- Calendar에서 완료 행이 계속 보이는 경우에는 undo를 만들지 않는다.
- reopened feedback은 `항목 보기`로 같은 stable row에 focus를 돌린다.

### 검증

- Calendar/R0/R8 continuity cluster: `8 / 8`
- My Flow library workspace: `5 / 5`
- P35 전체 첫 실행: `75 / 76`, 오래된 snackbar 기대 1건만 갱신
- 제품 assertion 실패: `0`

## 2026-07-28 - P35-H1 준비

- A안 current My Flow screenshot 준비
- B안 opt-in Todo screenshot 준비
- C안 전역 Todo 정적 proposal screenshot 준비
- C안 app code/global navigation 변경: `0`
- owner review package:
  `../2026-07-28-p35-r8-r12-owner-review-gate/`
- observed-user count: `0`

## 2026-07-28 - 최종 회귀 게이트

### 장기 E2E 안정화

- P35의 current execution / whole plan 분리 뒤 구형 테스트가 화면의 첫 행을 다시
  선택하던 경합을 발견했다.
- source-backed 메모 재확인은 같은 stable item을 다시 연다.
- 모바일 item 재확인은 중복 가능한 local item ID 대신 정확한 accessible open
  label을 사용한다.
- 저장 직후 My Flow 진입은 직접 DOM 상태를 분기하지 않고 공통
  `openMyFlowLibraryFlow` helper를 사용한다.
- personal draft reorder 검증은 execution projection과 structure order를 섞지 않고
  structure mode의 batch row order를 읽는다.
- 각 수정 대상은 `3~5회` 연속 재실행으로 먼저 안정화했다.

### 최종 결과

- P35 targeted E2E: `76 / 76`
- 전체 unit: `692 / 692` (`pretest 98`, `test 594`)
- full E2E: `402 / 402`, single worker, `24.0m`
- docs check: 필수 문서 `14`, local link `3,457`
- production build: 통과
- 390 / 1024 / 1440 horizontal overflow: `0`
- fixed overlap: `0`
- console/page error: `0`
- `git diff --check`: 통과
- observed-user count: `0`
- commit, push, PR, merge, deploy: 수행하지 않음
