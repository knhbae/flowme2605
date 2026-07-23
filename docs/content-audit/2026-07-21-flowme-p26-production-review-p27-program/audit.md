# FlowMe P26 production 독립 UX/UI audit

## 1. Executive verdict

최종 판정은 **`focused_iteration_required`**다.

P26은 구조적 교정에 성공했다. 이번에 production을 새 localStorage context로 여섯 번 분리해 조작한 결과, 6개 여정 41개 상태가 모두 종료됐다. 이어 서로 다른 두 Flow를 같은 날짜에 놓은 4개 보조 상태를 추가해 총 45개 상태를 확인했다. 390x844 및 1024x768에서 horizontal overflow, console error, page error는 `0`이었다. 저장 전 전체 artifact, 저장 직후 receipt, quick edit, 구조 변경, 완료 취소, 날짜 없는 항목 배치, 반복 occurrence, 전체/선택 export는 기능적으로 연결됐다.

그러나 상용 수준의 기본 완성도를 막는 마찰은 남아 있다. 가장 큰 문제는 **기능이 없는 것**이 아니라, 기능을 한 화면에 그대로 늘어놓아 사용자의 현재 의도보다 조작 도구가 먼저 읽힌다는 점이다. P27은 긴 설명 추가나 데이터 계약 재작성 없이 다음 네 축을 순서대로 줄여야 한다.

1. URL miss와 메모 진입에서 첫 useful preview까지의 폼 제거
2. structure/batch 편집을 현재 작업 하나에 맞는 contextual mode로 축소
3. export를 `범위 -> 결과 수 -> 형식`의 짧은 sheet/panel로 축소
4. Calendar undated queue와 완료 후 회고를 필요할 때만 펼치는 구조로 변경

이번 결과는 automated interaction과 heuristic simulation이다. 실제 사용자 관찰 또는 사용성 검증이 아니며 observed-user count는 `0`이다.

## 2. Evidence baseline

| 근거 | 결과 | evidenceKind |
| --- | --- | --- |
| Production 6개 여정 + 다중 Flow 보조 시나리오 | 6/6 완료, 총 45 states, 45 screenshots | `current_production_interaction` |
| 화면 안정성 | overflow 0, console error 0, page error 0 | `current_production_interaction` |
| 접근 가능한 이름 scan | 이름 없는 visible anchor가 routine Calendar 상태 2개 viewport에서 1개씩 | `current_production_interaction` |
| P26 final package | Blocking 0, High 0, Medium visual hypothesis 4 | `current_package_screenshot` |
| clean source | `origin/main 63ea641`; release 이후 app/runtime diff 0 | `current_source` |
| 이전 content usage preview | 원문 rail·adjacent preview는 참고 가능, 1024px overflow 116px | `prior_design_artifact` |
| 레퍼런스 | 공식 help/product 자료의 interaction pattern만 비교 | `reference_pattern` |

## 3. Rubric score

| 항목 | 점수 | 판단 |
| --- | ---: | --- |
| User Need Fit | 4.2 | 원문을 실행 Flow와 portable artifact로 바꾸는 목적이 화면에 드러남 |
| Execution Clarity | 3.7 | 완료·취소·날짜 배치는 가능하나 편집 mode와 회고의 다음 행동이 분산됨 |
| Content Fidelity | 4.5 | URL miss에서 가짜 내용을 만들지 않고 source-backed 내용과 개인 overlay를 분리 |
| Portability | 4.1 | ICS/checklist/sheet/memo와 범위 계약이 작동하나 선택 UI가 과밀 |
| Cognitive Load | 2.9 | structure/batch/export/Calendar에서 현재 의도보다 control 수가 많음 |
| Copy Specificity | 3.8 | 결과 지향 label은 늘었지만 일부 성공·설명·내부 용어가 반복됨 |
| Source/Safety | 4.5 | source, 개인 수정, 실행 기록 경계가 유지됨 |
| Accessibility/Operability | 3.7 | overflow/error 0, 주요 label 양호; routine event wrapper의 unnamed anchor는 수정 필요 |

## 4. Findings

### Blocking

없음. 현재 production의 여섯 핵심 여정은 자동 시뮬레이션에서 막히지 않았다.

### High H-01. Structure와 batch 편집이 사용자의 현재 의도보다 많은 도구를 동시에 노출한다

- **Route / viewport:** `/my`, 390x844 중심, 1024x768 비교
- **재현:** 여행 메모 저장 -> `여러 할 일 조정` -> 항목 추가 -> 선택 -> 위/아래 이동 -> 날짜 지정 -> export
- **기대:** `순서 바꾸기`, `날짜 배치`, `선택 내보내기`, `삭제` 중 현재 작업 하나를 고르면 그 작업에 필요한 control만 나타난다.
- **실제:** mobile structure mode에서 추가, 행 선택, 위/아래, 날짜, export, 삭제가 동시에 보인다. 30~35개 visible control과 1,518~1,582px scroll이 측정됐다.
- **사용자 영향:** 항목 자체보다 편집 도구가 먼저 읽히고, 날짜 배치 중 순서 또는 삭제를 잘못 건드릴 위험이 커진다.
- **Evidence:** `current_production_interaction`, `current_package_screenshot`, `current_source` (`AppClient.tsx` structural/batch surface, personal structural overlay)
- **해결:** 구조 mode를 `항목 구성`과 `여러 항목 처리`로 분리한다. 다중 선택 전에는 operation toolbar를 숨기고, 선택 후에도 한 번에 주 action 하나만 강조한다. reorder는 drag handle/키보드 이동, batch는 날짜·제외·export 중 선택한 operation sheet로 연다.
- **Acceptance marker:** `P27-H01-390-structure-before-after.png`, `P27-H01-1024-batch.png`; 선택 전 operation control 0, 선택 후 primary 1; add/reorder/delete/restore/date/export E2E와 stable ID 불변 test.

### High H-02. Export 계약은 정확하지만 panel이 전체 Flow를 다시 출력해 범위 결정을 방해한다

- **Route / viewport:** `/my`, 390x844 및 1024x768
- **재현:** moving 또는 project Flow -> 2개 선택 -> export 열기 -> format 비교
- **기대:** `선택 2개`, Calendar 가능 수, 제외 이유를 먼저 확인하고 format 하나를 고른다. 상세 item은 요청할 때만 본다.
- **실제:** selected export에서 whole Flow, 선택 행, format matrix, 설명과 receipt가 같은 긴 surface에 놓인다. moving은 37/38 controls, 2,239/2,074px; project는 41/42 controls, 2,176/2,030px다.
- **사용자 영향:** scope가 맞는지 확인하려다 format과 중복 목록을 다시 읽어야 하며, Calendar와 checklist의 결과 수 차이를 실행 전에 놓치기 쉽다.
- **Evidence:** `current_production_interaction`, `current_package_screenshot`, `current_source` (`export-scope.ts`, `ArtifactWorkbench.tsx`)
- **해결:** 기존 `FlowExportScopePlan`을 유지하고 `1 범위 -> 2 preflight count -> 3 format`의 compact sheet로 표현한다. item 목록은 기본 3줄 요약, 제외 이유는 destination 옆 count로 표시한다. 실행 후 receipt만 남긴다.
- **Acceptance marker:** `P27-H02-390-export-sheet.png`, `P27-H02-1024-export-panel.png`; scope·eligible·actual count 일치 unit, whole/selected/item E2E, ICS undated exclusion test.

### High H-03. URL miss와 개인 초안은 첫 결과보다 이름·목적 폼을 먼저 요구한다

- **Route / viewport:** `/flows`, 390x844 및 1024x768
- **재현:** 등록되지 않은 URL 입력 -> miss -> `직접 손볼 초안 준비` -> Flow 이름/원하는 결과 입력 -> 메모 draft
- **기대:** source를 확보하지 못했다는 사실을 보여준 뒤 사용자가 붙인 메모를 바로 3~5개 draft row로 분할하고, 이름은 preview 이후 선택적으로 정한다.
- **실제:** truthful miss는 좋지만 다음 단계에서 Flow 이름과 원하는 결과를 먼저 작성한다. miss draft review는 390px에서 32 controls, 2,133px이며 first useful artifact가 늦다.
- **사용자 영향:** 사용자는 아직 결과를 보지 못한 상태에서 제품 구조를 설계해야 하고, URL과 메모를 서로 다른 도구처럼 학습한다.
- **Evidence:** `current_production_interaction`, `current_source`, `heuristic_simulation`
- **해결:** 하나의 composer가 URL/여러 줄/한 줄을 감지하고 `확보한 범위`와 `분할한 항목`을 먼저 보여준다. source 미확보는 `원문 가져오기` 또는 `내 메모로 초안 보기`로 분기한다. 제목은 저장 직전 기본값을 수정하는 선택 필드로 이동한다.
- **Acceptance marker:** `P27-H03-390-composer.png`, `P27-H03-1024-source-preview.png`; 일반 memo의 useful preview 전 필수 입력 0~1, source_import_required에서 가짜 item 0, existing URL 중복 lookup E2E.

### Medium M-01. Calendar undated queue는 정확하지만 wide rail과 mobile page composition이 작업량을 숨긴다

- **Route / viewport:** `/calendar`, 390x844 및 1024x768
- **재현:** vehicle 10개를 날짜 없이 저장 -> tray 펼침 -> 3개 선택 -> 날짜 배치
- **기대:** 긴 항목 제목과 Flow 소속을 읽은 채 날짜를 정하고, 배치 후 남은 queue와 선택일 결과를 바로 비교한다.
- **실제:** 1024px 왼쪽 rail에서 긴 제목이 ellipsis되고 오른쪽 detail은 비어도 폭을 차지한다. mobile은 tray preview 1,577px, 배치 후 1,956px로 month grid와 queue를 한 페이지에서 모두 통과한다.
- **사용자 영향:** 어떤 항목을 일정에 놓는지 제목을 재확인해야 하며, mobile에서 queue와 결과 사이 이동 비용이 크다.
- **Evidence:** `current_production_interaction`, `current_package_screenshot`, `current_source`
- **해결:** wide는 task-first `queue + grid`와 calendar-first `grid + day detail` 두 composition을 상태에 따라 전환한다. queue 폭은 280~320px, selected row는 전체 제목/Flow marker를 보인다. mobile은 bottom sheet queue와 선택일 agenda를 짧게 왕복한다.
- **Acceptance marker:** `P27-M01-390-undated-sheet.png`, `P27-M01-1024-queue-grid.png`; 30자 제목 식별, batch preview/undo, Flow scope와 count parity E2E.

### Medium M-02. 반복 회차 데이터는 분리됐지만 Calendar DOM과 상세 hierarchy가 아직 회차 중심으로 정돈되지 않았다

- **Route / viewport:** `/calendar`, 390x844 및 1024x768
- **재현:** monthly washer 저장 -> series definition 확인 -> Calendar occurrence 완료 -> 다시 진행
- **기대:** series는 설정, occurrence는 실행으로 구분되고 tab/focus도 이름 있는 회차 control 하나만 지나간다.
- **실제:** 화면 label은 구분되지만 FullCalendar routine event outer anchor가 이름 없이 남고 그 안에 named button이 들어간다. automated scan에서 두 viewport 모두 unnamed visible anchor 1개가 잡혔다. 회차 상태·메모·export도 한 상세에 밀집한다.
- **사용자 영향:** keyboard/screen reader가 빈 event wrapper를 만날 수 있고, 회차 실행보다 설정·메모·내보내기가 경쟁한다.
- **Evidence:** `current_production_interaction`, `current_source` (`AppClient.tsx:9940`, `AppClient.tsx:10217`), `current_package_screenshot`
- **해결:** FullCalendar event wrapper를 하나의 named control로 만들고 nested interactive를 제거한다. occurrence detail은 `완료/다시 진행`과 오늘 메모를 기본, series 설정과 export를 secondary menu로 둔다.
- **Acceptance marker:** `P27-M02-a11y-tree.json`, `P27-M02-390-occurrence.png`; unnamed visible control 0, nested interactive 0, Enter/Space open, occurrence ID와 ICS UID 불변 test.

### Medium M-03. 저장 직후 확인은 성공했지만 일반 My Flow로 넘어가는 정보 위계가 길다

- **Route / viewport:** `/my?savedFlow=*`, `/my?savedMap=*`, 390x844 및 1024x768
- **재현:** moving 조정 저장 -> receipt -> 전체 Flow -> 이후 `/my` 재방문
- **기대:** 저장된 이름·항목 수·날짜 범위와 첫 할 일을 한 덩어리로 확인하고, 전체 Flow 또는 Calendar로 바로 이동한다.
- **실제:** receipt는 정확하고 전체 4개 item도 보이지만 summary, next action, whole Flow, Calendar/export가 순차 card로 반복된다. post-save mobile은 1,236px이고 재방문 화면과 시각 문법이 달라진다.
- **사용자 영향:** 저장 성공은 알지만 어느 부분이 일회성 receipt이고 어느 부분이 계속 쓰는 My Flow인지 재학습한다.
- **Evidence:** `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`
- **해결:** receipt를 1개 compact band로 만들고 바로 아래에 일반 whole-Flow surface를 사용한다. 저장 성공 강조는 첫 방문에만, 이후 동일 route에서는 일반 Flow detail로 수렴한다.
- **Acceptance marker:** `P27-M03-390-post-save.png`, `P27-M03-1024-returning.png`; receipt count parity, refresh persistence, query 제거 후 같은 stable Flow open test.

### Medium M-04. 완료 후 회고·보정·export·다시 쓰기가 모두 펼쳐져 다음 한 행동이 없다

- **Route / viewport:** `/my`, 390x844 및 1024x768
- **재현:** record Flow 전체 완료 -> 완료 결과 -> 회고 작성 -> 다시 쓰기
- **기대:** `완료됨`과 `한 줄 회고 남기기`가 먼저 보이고, source correction/export/reuse는 요청할 때 펼친다.
- **실제:** mobile 완료 상태는 32 controls, 1,902px; wide도 1,742px다. 전체 Flow, export, reflection, correction, reuse가 동시에 나타난다.
- **사용자 영향:** 완료의 명확한 끝이 사라지고 회고를 건너뛰거나 원문 보정과 개인 회고를 혼동할 수 있다.
- **Evidence:** `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`
- **해결:** 완료 직후 `완료 summary + 회고 한 줄 + 다시 쓰기`만 기본 노출한다. export와 source correction은 각각 menu와 별도 disclosure로 이동하고 소유권 label을 유지한다.
- **Acceptance marker:** `P27-M04-390-complete.png`, `P27-M04-1024-reflection.png`; reflection/correction storage separation unit, complete/reopen/reuse E2E.

### Medium M-05. Wide My Flow가 단일 Flow에서도 inventory/search chrome을 유지해 작업 공간이 늘어진다

- **Route / viewport:** `/my?view=flows`, 1024x768
- **재현:** routine 하나만 저장 -> Flow 목록 -> 전체 열기
- **기대:** 단일 Flow에서는 Flow의 진행과 item이 중심이고, 두 개 이상일 때 rail/search가 필요에 따라 나타난다.
- **실제:** 검색·filter·inventory header가 하나의 Flow에서도 유지되고 본문 card는 긴 세로 구조다. Calendar는 wide pane을 쓰지만 My Flow는 mobile section을 넓힌 인상이 남는다.
- **사용자 영향:** 실제 실행할 item보다 navigation chrome과 빈 폭이 더 크게 보인다.
- **Evidence:** `current_package_screenshot`, `current_production_interaction`, `current_source`
- **해결:** wide를 `Flow rail / item list / detail peek`의 adaptive workspace로 만들되 Flow가 하나면 rail을 접는다. list row는 compact execution row를 공통 사용한다.
- **Acceptance marker:** `P27-M05-1024-one-flow.png`, `P27-M05-1024-multi-flow.png`; 1/2/5 Flow responsive visual test, focus return test.

### Medium M-06. My Flow는 같은 날짜의 여러 Flow 항목을 하나의 scan sequence로 보여주지 않는다

- **Route / viewport:** `/my`, 390x844 및 1024x768; `/calendar` 대조
- **재현:** moving과 vehicle을 함께 저장 -> moving D-30과 vehicle 1개를 2026-07-21에 배치 -> `/my` 지금 -> `/calendar` 7월 21일
- **기대:** `오늘 2개`가 날짜 아래에서 Flow marker로 구분된 두 행으로 이어지고, 가장 먼저 할 항목만 시각적으로 강조되더라도 목록에서 빠지지 않는다.
- **실제:** My Flow wide는 count를 `오늘 2개 남음`으로 정확히 계산하지만 moving 항목을 큰 `오늘 실행` 카드로, vehicle 항목을 별도 `오늘 할 일` 목록으로 나눈다. mobile은 primary continuation만 기본 표시한다. Calendar는 같은 날짜에 두 Flow group을 각각 유지한다.
- **사용자 영향:** 오늘의 전체 작업량을 한 번에 훑기 어렵고 primary 카드와 아래 목록이 같은 집합인지 판단해야 한다.
- **Evidence:** `current_production_interaction` (`cross-flow-results.json`), `current_package_screenshot`, `current_source`
- **해결:** Today를 날짜 단위 compact list로 만들고 첫 행에만 `다음 실행` 강조를 준다. Flow marker와 count는 유지하며 primary item을 별도 집합처럼 분리하지 않는다.
- **Acceptance marker:** `P27-M06-390-same-date.png`, `P27-M06-1024-same-date.png`; 두 Flow/같은 날짜 fixture에서 count 2, visible rows 2, Flow marker 2, completion/reopen parity.

### Low L-01. 동일 개념의 label과 chip 수가 화면마다 달라 빠른 scanning을 방해한다

- **Route / viewport:** `/f/*`, `/my`, `/calendar`, both
- **재현:** public -> post-save -> My Flow -> Calendar 순서로 같은 Flow 확인
- **기대:** Flow marker, 날짜 상태, source, 완료 상태가 같은 순서와 색 역할로 반복된다.
- **실제:** `FLOW`, `Flow`, `My Flow`, `Flow 목록`, 날짜/반복 chip, source label이 surface별로 다른 밀도와 위치를 가진다.
- **사용자 영향:** 기능 오류는 없지만 같은 identity를 매 화면에서 다시 해석한다.
- **Evidence:** `current_package_screenshot`, `heuristic_simulation`
- **해결:** row anatomy를 `status control / title / timing / Flow marker / secondary action`으로 고정하고 chip은 상태 1개 + source 1개 상한으로 둔다.
- **Acceptance marker:** `P27-L01-row-anatomy.png`; Home/Find/My/Calendar visual regression.

### Low L-02. Fixed feedback와 bottom navigation이 일부 mobile 상태에서 층을 늘린다

- **Route / viewport:** `/my`, `/calendar`, 390x844
- **재현:** 완료 취소 또는 occurrence 다시 진행 -> snackbar 확인
- **기대:** feedback가 bottom navigation과 한 offset contract를 사용하고 긴 제목이 잘리지 않는다.
- **실제:** overlap은 0이지만 snackbar와 bottom navigation이 연속으로 쌓이고 routine 제목이 축약된다.
- **사용자 영향:** 성공 feedback의 대상이 불분명할 수 있고 content viewport가 일시적으로 줄어든다.
- **Evidence:** `current_package_screenshot`, `current_production_interaction`
- **해결:** snackbar를 `동작 + 짧은 대상 + 실행 취소` 한 줄로 제한하고 existing responsive layer contract의 단일 feedback slot을 사용한다.
- **Acceptance marker:** `P27-L02-390-feedback.png`; long-title screenshot and live-region test.

## 5. 화면별 Keep / Change / Remove / Defer

| 화면 | Keep | Change | Remove | Defer |
| --- | --- | --- | --- | --- |
| Home | 실제 Flow 카드와 source/result count | URL·memo composer를 첫 product surface로 | 긴 hero와 중복 소개 | social proof |
| Flow 찾기 | truthful lookup, existing hit, candidate | 하나의 composer와 detected scope preview | preview 전 이름/목적 필수 폼 | live crawler/AI |
| 저장 전 Flow | 전체 artifact, 최소 입력, start/adjust | source rail은 compact identity로 adapt | 같은 설명 반복 | creator publish |
| 저장 직후 | count/date receipt와 whole Flow | compact receipt band 후 일반 detail로 수렴 | 여러 success card | cloud sync |
| My Flow | 지금/Flow 목록/완료, reversible completion | adaptive wide rail/list/detail, 같은 날짜 compact list | 단일 Flow의 상시 inventory chrome, primary item의 별도 집합화 | collaboration |
| Calendar | dated grid, undated queue, Flow scope | task-first/calendar-first adaptive composition | 빈 right pane 고정 | external calendar sync |
| Item editor | quick/advanced/structure/batch 계약 | 현재 operation 한 개만 contextual 노출 | 모든 field 동시 노출 | full planner fields |
| Completion | 같은 위치의 complete/reopen | 완료 summary와 회고 우선 | 모든 secondary section 기본 펼침 | analytics |
| Export | scope/count/format/receipt 계약 | compact sheet, destination eligibility 우선 | full list 재출력 | OAuth direct export |

## 6. Current vs proposed structure

### Current

`Flow 전체 -> 여러 조작 mode -> 전체 목록 반복 -> format 전체 노출 -> 결과` 구조가 기능 정확성을 보여주지만 각 단계가 세로로 누적된다. Wide는 Calendar만 pane을 적극 사용하고 My Flow/export는 긴 mobile section을 확장한 형태가 남는다.

### Proposed

`현재 객체 -> 현재 한 행동 -> 결과 preview -> 필요할 때 상세`를 모든 surface의 공통 문법으로 사용한다.

- Home/Find: composer + detected source + first artifact
- Save-before: whole Flow + 최소 입력 + 주 action 1개
- Post-save: compact receipt + 동일 whole-Flow detail
- My Flow: Flow rail(optional) + execution list + detail peek
- Calendar: undated queue 또는 grid 중 현재 작업을 우선 + 선택일 detail
- Editor: quick field inline, structure와 batch는 서로 다른 contextual mode
- Export: scope summary -> destination count -> format -> receipt
- Completion: done summary -> optional reflection -> reuse

## 7. 계약 및 회귀 위험

| 계약 | P27 원칙 | 회귀 위험 | migration |
| --- | --- | --- | --- |
| source/version | 읽기 전용 identity와 trace 유지 | composer가 source 부족을 개인 입력으로 덮는 위험 | 없음 |
| personal overlay | 기존 title/date/note/structure key 사용 | mode split 중 save 시점 불일치 | 없음 |
| execution run | completion/reopen 위치만 재배치 | selection checkbox와 completion 혼동 | 없음 |
| occurrence | series/occurrence ID와 revision 유지 | Calendar wrapper 변경 시 event key 손실 | 없음 |
| export | 기존 plan/receipt가 UI의 단일 truth | panel 축소 중 제외 이유를 숨길 위험 | 없음 |
| composer ephemeral state | detect/scope/preview/confirm 상태 추가 | URL hit와 personal draft 분기 혼동 | persistence migration 없음; UI state contract 필요 |

## 8. Reference pattern comparison

| 공식 제품 | 확인한 pattern | FlowMe 판단 |
| --- | --- | --- |
| [Google Calendar](https://support.google.com/calendar/answer/9901136?hl=en-uk) | 날짜가 있는 task만 grid에 나타나고 pending task를 별도로 관리; 반복 한 회차/전체 수정 분리 | `적용`: dated projection 원칙. `변형`: Flow context와 undated queue를 함께 유지 |
| [Apple Reminders](https://support.apple.com/guide/reminders/view-reminder-lists-remnd854fc47/mac) | Today/Scheduled/All/Completed를 역할별 Smart List로 분리 | `적용`: My Flow 지금/전체/완료 역할. `금지`: app 전체를 task manager로 확대 |
| [Fantastical](https://flexibits.com/fantastical/help/calendar-sets) | Calendar Set으로 현재 관련된 calendar/task만 scope | `적용`: Flow filter. `변형`: 자동 위치 전환 같은 planner 기능은 제외 |
| [Todoist](https://www.todoist.com/help/articles/get-started-with-todoist-OgNNJR) | Inbox, Today, Upcoming; 완료와 uncomplete; project section 접힘 | `적용`: undated와 실행 view 분리. `변형`: Flow source identity 유지 |
| [TickTick](https://help.ticktick.com/articles/7358389904469917696) | task list와 calendar split, drag scheduling; 선택 후 batch toolbar | `적용`: queue + grid, contextual batch. `금지`: 모든 productivity field 복제 |
| [Microsoft To Do](https://support.microsoft.com/en-US/ToDo/my-day-and-suggestions) | My Day는 focus view이고 미완료 원본은 Tasks에 유지 | `적용`: Today는 projection이며 Flow 원본을 변경하지 않음 |
| [Notion Calendar](https://www.notion.com/en-us/help/use-notion-calendar-with-notion) | 왼쪽 list에서 날짜 없는 page를 filter하고 grid에 배치, 오른쪽 context edit | `적용`: undated queue와 context panel. `변형`: database property editor 전체는 제외 |
| [Notion](https://www.notion.com/help/views-filters-and-sorts) | 같은 data를 list/calendar/timeline으로 보고 side peek으로 상세 | `적용`: 동일 effective item의 destination projection. `금지`: 사용자가 view를 설계하게 하지 않음 |
| [Hevy](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them) | routine은 plan, workout은 실제 log | `적용`: series definition과 occurrence run 분리 |
| [Fitbod](https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod) | 시작 전/실행 중/기록 후 편집 범위를 분리 | `적용`: save-before personalization, execution edit, reflection 경계 |
| [Nike Training Club](https://www.nike.com/help/a/ntc-info) | multi-week program과 guided workout을 다른 실행 단위로 제시 | `적용`: Flow 전체와 현재 Step/회차의 위계. `금지`: 미디어 중심 경험 복제 |
| [Wanderlog](https://wanderlog.com/pages/help-center) | itinerary와 map을 한 view에 두고 day 단위로 재배치 | `적용`: project sequence와 date를 함께 읽기. `변형`: 지도는 장소가 핵심일 때만 |
| [TripIt](https://help.tripit.com/en/support/solutions/articles/103000063302-create_ticket) | trip 전체 detail과 개별 plan edit를 구분 | `적용`: Flow 설정과 item edit 분리 |

## 9. 자동 확인과 사용자만 확인 가능한 가정

### 이번에 자동 확인한 것

- 6개 journey가 production에서 막히지 않는가
- 두 Flow의 같은 날짜 항목이 My Flow와 Calendar에서 어떻게 구분되는가
- route/state별 item count, completion/reopen, date move, export scope가 변하는가
- 390/1024 overflow, console/page error, accessible name scan
- current source의 identity/projection/export 계약과 production 동작이 일치하는가

### 실제 사용자에게만 확인 가능한 질문

- `날짜 없음`을 미완성 설정이 아니라 나중에 배치할 queue로 이해하는가
- 저장 전에 `그대로 시작`과 `조정`의 결과 차이를 설명할 수 있는가
- series 설정과 오늘 occurrence 실행을 같은 Flow의 다른 층으로 이해하는가
- compact export에서 전체/선택/현재 범위를 실행 전에 정확히 예측하는가
- 완료 직후 회고가 도움이 되는가, 아니면 실행 종료를 방해하는가
- My Flow와 Calendar의 역할을 별도 설명 없이 구분하는가

이 질문은 P27 내부 구현 판단과 분리한다. 이번 문서는 사용자 모집·관찰 계획을 제안하지 않는다.
