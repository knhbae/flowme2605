# P27-R QA 계약

## 1. Evidence 규칙

모든 finding과 acceptance 결과에 다음 중 하나를 기록한다.

- `current_production_interaction`
- `current_server_document`
- `current_source`
- `current_package_screenshot`
- `stakeholder_feedback`
- `prior_design_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `automated_browser`
- `observed_user`
- `inaccessible`

자동화, stakeholder feedback, heuristic simulation을 observed user로 바꾸어 쓰지 않는다.

## 2. 공통 viewport와 상태

### Viewport

- Mobile: 390x844
- Wide: 1024x768
- Composer desktop 추가 확인: 1440x900

### Flow count fixture

- 1 Flow
- 3 Flow
- 5 Flow
- 12 Flow

### 콘텐츠 shape

- anchor-relative: moving
- undated checklist: vehicle inspection
- recurring resource-backed: workout
- mixed ordered plan: travel/project
- personal memo draft
- public shared Flow

## 3. 핵심 사용자 시나리오

## S1. 저장 전 조정

1. public 또는 `/flows`에서 Flow를 연다.
2. 입력 없이 전체 Flow 제목, 단계, 핵심 Item, 결과물, 수량을 확인한다.
3. `조정`을 연다.
4. 일정 조정을 선택한다.
5. 항목 하나의 날짜를 바꾼다.
6. 조정 mode를 종료한다.
7. 저장한다.
8. 저장 직후 같은 outline과 변경 날짜를 확인한다.

검증:

- first useful preview before required input
- active edit operation count 1
- save decision surface count 1
- post-save outline parity
- source mutation 0

## S2. Flow 보관·복구

1. 완료 기록과 메모가 있는 Flow를 연다.
2. `보관하기`를 실행한다.
3. 즉시 undo한다.
4. 다시 보관한다.
5. 새로고침한다.
6. `보관됨`에서 복구한다.

검증:

- active list hidden after archive
- immediate undo visible/reachable
- persistent restore visible/reachable
- run/history/reflection preserved
- stable Flow ID preserved

## S3. source Item 빼기·복구

1. source-backed Flow detail을 연다.
2. 항목 하나를 `내 Flow에서 빼기` 한다.
3. My Flow/Calendar/export에서 제외를 확인한다.
4. 새로고침한다.
5. 뺀 할 일에서 복구한다.

검증:

- source object unchanged
- tombstone/exclusion persisted
- restored stable Item ID
- completion state preserved
- projection parity

## S4. 홈트 반복 범위

1. 홈트 Flow를 저장 전에 연다.
2. 4주가 program end인지 preview range인지 확인한다.
3. 시작일, 요일, 시간, 종료 범위를 조정한다.
4. 저장한다.
5. My Flow에서 series와 다음 occurrence를 확인한다.
6. 한 occurrence를 완료하고 다시 연다.
7. Calendar와 ICS를 비교한다.

검증:

- truthful horizon label
- preview range does not mutate series end
- one occurrence one completion control
- Calendar/ICS occurrence count parity
- stable series/occurrence identity

## S5. 영상 resource와 확인 항목

1. 홈트 Item detail을 연다.
2. 영상 링크를 연다.
3. 확인 항목 하나를 수정/추가한다.
4. personal resource를 추가한다.
5. 새로고침한다.

검증:

- resource completion-like checkbox count 0
- source resource preserved
- personal resource persisted
- subcheck progress only in detail
- source subcheck mutation 0

## S6. My Flow 찾기

각 1/3/5/12 Flow fixture에서 반복한다.

1. `/my`에 들어간다.
2. 오늘 실행 항목을 찾는다.
3. 특정 Flow 전체를 연다.
4. 보관된 Flow를 복구한다.
5. 검색이 필요하면 keyboard로 검색한다.

검증:

- small-set unnecessary search chrome count
- find target click/tap depth
- same-date group count
- duplicate primary row count 0
- search result title/state/date parity

## S7. 날짜 없는 항목 배치

1. undated checklist를 저장한다.
2. My Flow에서 날짜 없는 상태를 확인한다.
3. Calendar의 일정 배치 queue를 연다.
4. 한 개 및 여러 개에 날짜를 지정한다.
5. 날짜를 제거하고 undo한다.

검증:

- undated Item remains in My Flow/list export
- Calendar/ICS excludes undated
- filter scope parity
- date move stable identity
- undo/reload persistence

## S8. Export와 receipt

1. Flow 전체, selected, item scope를 각각 연다.
2. eligible destination과 count를 확인한다.
3. export를 실행한다.
4. output file/clipboard를 파싱한다.
5. receipt를 확인한다.

검증:

- preflight/output count parity
- duplicate row/event 0
- excluded/archived policy consistency
- resource/subcheck loss notice truthful
- internal term hit 0

## 4. 접근성

- 모든 icon button에 accessible name과 tooltip.
- row 내부 nested interactive 0.
- overlay open focus, Escape close, trigger return.
- delete/archive/restore/reorder Enter/Space parity.
- live feedback for save, archive, undo, export.
- routine occurrence는 focusable completion control 1개와 named open action만 사용.
- screen reader에서 program end와 preview range를 구분할 수 있어야 한다.

## 5. 시각 품질

### Mobile

- first viewport에 title, 실제 content 일부, next action.
- 7-column routine cell에 긴 제목을 넣지 않는다.
- fixed navigation, snackbar, bottom sheet가 primary action을 가리지 않는다.
- 편집 mode에서 horizontal overflow 0.

### Wide

- 1 Flow에서는 불필요한 rail/search를 접는다.
- multi-Flow에서는 list/detail 관계를 명확히 한다.
- routine grid는 compact marker, detail은 agenda가 담당한다.
- 빈 detail pane이나 잘린 identity row 0.

## 6. 데이터·정합성 marker

| Marker | 목표 |
| --- | --- |
| `flowArchivePreservesRunHistory` | true |
| `flowArchiveUndoVisible` | true |
| `flowArchivePersistentRestoreVisible` | true |
| `sourceItemMutationCount` | 0 |
| `restoredItemStableIdChangedCount` | 0 |
| `recurrencePreviewMutatesSeriesEndCount` | 0 |
| `resourceCompletionLikeControlCount` | 0 |
| `saveDecisionSurfaceCount` | 1 |
| `activeEditOperationCount` | <=1 |
| `postSaveReturningOutlineMismatchCount` | 0 |
| `smallSetSearchChromeCount` | decision-gate value |
| `routineCalendarTextCollisionCount` | 0 |
| `duplicatePrimaryExecutionRowCount` | 0 |
| `exportPreviewOutputCountMismatch` | 0 |
| `flowsServerDocumentMeaningfulEntryVisible` | true |
| `unnamedVisibleControlCount` | 0 |
| `horizontalOverflowCount` | 0 |
| `consolePageErrorCount` | 0 |

## 7. 명령 검증

각 implementation slice는 위험 범위에 따라 다음을 실행한다.

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- <target>
git diff --check
```

다음 경우 full E2E를 실행한다.

- storage/migration 변경
- common Flow outline/row 변경
- recurrence/Calendar projection 변경
- export scope/receipt 변경
- My Flow IA가 여러 route를 건드리는 변경

## 8. 최종 gate

- 모든 Blocking/High finding이 closed 또는 명시적 accepted risk.
- automated evidence와 observed user evidence 분리.
- current production release SHA와 test source SHA 일치.
- screenshot은 fixture, route, viewport, initial state를 기록.
- prior artifact를 current implementation처럼 표시한 증거 0.
