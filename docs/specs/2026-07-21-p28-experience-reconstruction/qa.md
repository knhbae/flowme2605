# P28 QA And Simulation Gate

## 1. Evidence classes

모든 결과는 다음 중 하나로 표시한다.

- `current_command`
- `current_browser`
- `current_source`
- `current_package_screenshot`
- `prior_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `observed_user`
- `inaccessible`

`heuristic_simulation`, Playwright, screenshot review는 `observed_user`가 아니다.

## 2. 콘텐츠 fixture matrix

| Shape | 대표 Flow | 핵심 사용자 값 | primary | 핵심 위험 |
| --- | --- | --- | --- | --- |
| 기준일 timeline | 이사 준비 | 이사일 | Calendar | anchor와 fixed override 혼동 |
| 날짜 없는 checklist | 차량 점검 | 선택적 날짜 | Checklist/Todo | Calendar 강제 또는 날짜 배치 발견성 |
| recurring routine | 홈트/청소 | 시작일, 빈도, 요일, 종료 | Calendar + Flow execution | preview/end, series/occurrence 혼동 |
| progress/record | K-MOOC | 시작 진도, 선택 deadline | Sheet | Calendar로 평탄화 |
| safety/reference | 폭염 대응 | 작업일 선택 | Checklist + warning/reference | warning을 완료 item으로 만듦 |
| comparison | 계약 검토 | 후보/결정 | Sheet/Memo | reference와 action 혼합 |
| mixed sequence/date | 여행 동선 | 여행일, 일부 시간 | Flow execution -> Calendar subset | 모든 item에 날짜 강제 |
| personal draft | URL miss/메모 | user-authored item | Flow execution | fake source, 구조 편집 loss |

## 3. Cardinality matrix

| Surface | Fixture | 검증 목적 |
| --- | --- | --- |
| save-before outline | 5, 14, 24, 38 items | 전체 disclosure와 count parity |
| My Flow library | 1, 5, 20, 50 Flows | browse/search/filter threshold와 density |
| Calendar scope | 1, 2, 5, 8, 25 Flows | bounded selector와 searchability |
| selected day | 1, 3, 8 items / 1, 3, 5 Flows | group, completion, title density |
| routine | 1, 4, 12, 52 visible occurrences | preview range와 series end |
| export | whole, selected 2, current 1 | scope/count/receipt parity |

## 4. Viewport matrix

| Viewport | 요구 |
| --- | --- |
| 390x844 | single reading order, bottom nav clearance, one primary, full-screen/sheet editor |
| 1024x768 | maximum two major panes, no forced 3-column, bounded rail/detail |
| 1440x900 | optional contextual third pane only when it reduces task switching |

각 viewport에서 다음을 기록한다.

- `scrollWidth - clientWidth`
- fixed/sticky overlap count
- clipped interactive text count
- visible primary action count
- unnamed focusable count
- console error count
- page error count
- keyboard focus sequence

## 5. P28-01 heuristic simulation

## Scenario S1 - moving adjustment

1. moving Flow를 연다.
2. 전체 24개 item을 확인한다.
3. 이사일을 바꾼다.
4. 한 item 날짜만 별도로 고정한다.
5. primary Calendar preview에서 변경을 확인한다.
6. 저장 결과 count를 예측한다.

기록:

- full outline depth
- anchor edit depth
- item date edit depth
- preview update latency/feedback
- competing primary count
- explanation blocks read requirement

## Scenario S2 - workout simplification

1. workout Flow를 연다.
2. 시작일, 주 2회, 화/토, 종료일을 설정한다.
3. occurrence preview를 확인한다.
4. 한 회차를 완료한다.
5. 다시 연다.
6. 한 회차를 휴식 처리하고 note를 남긴다.
7. source video를 연다.

기록:

- schedule definition control count
- execution state control count
- workout-only control count
- preview horizon/end distinction
- resource completion-like control count
- duplicate occurrence row count

## Scenario S3 - My Flow library

1. 20 Flow fixture를 연다.
2. 최근 저장하지 않은 Flow를 제목 일부로 찾는다.
3. 해당 Flow 전체 구조를 연다.
4. item 하나를 수정한다.
5. library로 돌아간다.
6. 보관하고 undo한다.

기록:

- browse-to-detail depth
- search dependency
- context preservation
- duplicate selector count
- back focus/scroll restoration

## Scenario S4 - Calendar scope

1. 25 Flow fixture Calendar를 연다.
2. 두 Flow만 선택한다.
3. selected-day agenda와 grid count를 확인한다.
4. undated tray를 연다.
5. 한 item 날짜를 지정한다.
6. 전체 scope로 복귀한다.

기록:

- visible scope controls
- horizontal scroll requirement
- picker search depth
- grid/agenda/tray mismatch
- focus return

## Scenario S5 - five shape preview

1. 대표 Flow를 고른다.
2. primary actual-data preview를 확인한다.
3. eligible secondary를 연다.
4. blocked/not-applicable shape가 UI에서 빠졌는지 확인한다.
5. count와 loss note를 확인한다.
6. export/save receipt와 비교한다.

기록:

- actual row/event count
- preview/generated mismatch
- irrelevant destination count
- internal term hit

## 6. Architecture scorecard

각 항목 1~5점. 평균 4.0 이상, 모든 필수 항목 4 이상이 P28-01 통과 기준이다.

| Dimension | 필수 | 질문 |
| --- | --- | --- |
| Whole Flow comprehension | yes | 저장될 전체 구조를 빠르게 확인하는가 |
| Adjustment discoverability | yes | title/date/order/include/memo 변경 위치가 보이는가 |
| Artifact clarity | yes | 결과 형태가 설명이 아닌 실제 데이터로 보이는가 |
| Cross-surface consistency | yes | save-before/My Flow/Calendar가 같은 item grammar인가 |
| Routine clarity | yes | series/occurrence/preview/end를 구분하는가 |
| Calendar scale | yes | 25 Flow에서 scope 선택이 bounded인가 |
| My Flow navigation | yes | browse/search/detail 역할이 명확한가 |
| Mobile density | yes | control과 text가 작업보다 많지 않은가 |
| Accessibility | yes | keyboard, name, focus, state announcement가 맞는가 |
| Implementation coherence | no | shared projection/component로 구현 가능한가 |

## 7. Hard fail markers

- `saveBeforeActualArtifactPreviewVisible: false`
- `saveBeforeWholeOutlineReachable: false`
- `saveBeforePrimaryActionCount > 1`
- `workoutOnlyCompletionControlCount > 0`
- `routinePreviewEndAmbiguousCount > 0`
- `resourceCompletionLikeControlCount > 0`
- `sameItemCompletionControlCount > 1`
- `calendarScopeHorizontalScrollerRequired: true` at 8+ Flows
- `calendarScopeVisibleControlCount > 8`
- `myFlowDuplicateSelectorCount > 0`
- `myFlowBrowseRequiresSearch: true` for direct known selection fixture
- `previewReceiptItemCountMismatch > 0`
- `sourceMutationCount > 0`
- `horizontalOverflowCount > 0`
- `unnamedVisibleFocusableCount > 0`
- `keyboardTrapCount > 0`

## 8. Slice verification minimums

| Slice | Unit | E2E | Browser | Docs/build |
| --- | --- | --- | --- | --- |
| P28-01 | fixture/schema parse | prototype interaction | 390/1024/1440 screenshots | docs:check |
| P28-02 | role/policy/projection exhaustive | representative parity smoke | no UI expected | docs:check, test, build |
| P28-03 | save-before VM/editor | moving/vehicle/draft | 390/1024/1440 | docs:check, test, build, affected/full E2E |
| P28-04 | recurrence mapping | workout save/run/calendar | 390/1024 | same |
| P28-05 | library state/threshold | 1/5/20/50 browse/search/archive | 390/1024/1440 | same |
| P28-06 | scope resolver | 1/5/8/25 scope/date move | 390/1024 | same |
| P28-07 | destination output/count | five-shape export | all representative previews | same |
| P28-08 | all | targeted + full | production-like matrix | all release gates |

## 9. Accessibility checklist

- [ ] visible input에 label 또는 accessible name이 있다.
- [ ] icon button에 tooltip과 accessible name이 있다.
- [ ] expand/collapse에 `aria-expanded`가 있다.
- [ ] selected scope에 `aria-pressed` 또는 equivalent state가 있다.
- [ ] modal/sheet가 focus trap, Escape close, trigger focus return을 제공한다.
- [ ] save/error/result state가 live region으로 전달된다.
- [ ] completion checkbox name에 item title, Flow, occurrence date가 필요한 범위로 포함된다.
- [ ] resource link는 completion control로 읽히지 않는다.
- [ ] disabled/not-applicable destination이 keyboard tab stop이 아니다.
- [ ] 200% zoom과 긴 Korean title에서 control overlap이 없다.

## 10. Copy and density checklist

- [ ] supporting paragraph가 interaction을 대신하지 않는다.
- [ ] 같은 약속을 header, chip, body에서 반복하지 않는다.
- [ ] workout 설명을 지워도 schedule/execute/resource 구분이 유지된다.
- [ ] title과 CTA가 실제 destination/count를 말한다.
- [ ] raw `routine`, `anchor`, `occurrence`, `itemRole`, `Markdown`을 노출하지 않는다.
- [ ] source/safety disclosure는 필요한 Flow에서만 나타난다.
- [ ] card 안 card, section을 card처럼 띄우는 composition을 피한다.

## 11. Regression commands

구체 명령은 각 slice에서 `package.json`과 harness를 확인해 조정한다. 최소 기준:

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/p27-foundation.spec.ts --workers=1
```

변경 영향이 `/flows`, `/my`, `/calendar`, public `/f`, export를 가로지르면 full E2E를 실행한다. timeout 또는 환경 실패는 pass로 쓰지 않고 exact executed/passed/failed count를 기록한다.

## 12. Evidence package rule

각 P28 slice evidence에 다음을 포함한다.

- current SHA와 branch
- changed source scope
- route/viewport/fixture
- before/after screenshot
- current command result
- browser result
- source/personal/run/occurrence/export impact
- observed-user count
- commit/push/PR/merge/deploy state
- residual risk and next dependency

## 13. Current planning verification

이 문서 생성 단계는 docs-only다.

| Check | Result | Evidence |
| --- | --- | --- |
| app source changed | false | `git diff --name-only` is limited to `docs/` |
| `npm.cmd run docs:check` | pass | 14 required files, 2784 local links |
| `git diff --check` | pass | whitespace errors 0; line-ending notices only |
| actual user observation | 0 | no study requested |
