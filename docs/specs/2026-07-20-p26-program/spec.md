# P26 FlowMe 실행 UX 구조 교정 프로그램

## 문서 상태

- 작성일: 2026-07-20
- 기준선: `origin/main` `48571afeb63dc06a321e5ab49ccf50522bfa7c29`
- production: <https://flowme2605.vercel.app>
- 상태: approved for staged implementation
- 실제 관찰 사용자: `0`
- 최종 판정: `bounded_structural_correction_required`

P26은 P25를 폐기하는 전면 재작성도, 색과 간격만 바꾸는 polish도 아니다. P25가 연결한 whole-Flow, personal overlay, reversible completion, Calendar placement, portable export 계약은 유지한다. 그 위에서 날짜·반복·저장 결과의 정확성을 먼저 닫고, 사용자가 `무엇을 발견하고 -> 무엇을 저장하며 -> 어디까지 조정하고 -> 어디서 실행하는가`를 설명 없이 이해하도록 핵심 화면 구조를 교정한다.

자동화, 화면 시뮬레이션, 오너 피드백, prior design artifact는 실제 사용자 관찰과 구분한다. P26 종료 시에도 실제 관찰이 없으면 observed-user count는 `0`이다.

## 입력 근거

| 근거 | 사용 범위 | evidence kind | 한계 |
| --- | --- | --- | --- |
| 오너 피드백 | 카드 정보, Flow/Flow Map 통일, 조정 자유도, Calendar filter, same-date grouping | `owner_feedback` | 재현 로그가 아닌 제품 판단 |
| P25 production/source | 현재 route, state, projection, component 계약 | `current_production_interaction`, `current_source` | 각 slice 시작 시 재검증 필요 |
| P25/P26 구조화 audit | 날짜·반복·receipt·projection·journey 위험 | `current_package_screenshot`, `heuristic_simulation` | 실제 사용자 증거 아님 |
| Claude Design (9) | progressive editor, undo, undated tray, export scope, occurrence control, 단계 메모 | `prior_design_artifact` | 목업 제안이며 구현 정답 아님 |
| `2026-07-19-flow-content-usage-preview-ko.html` | source rail, compact item, destination preview, 날짜 없는 이유·결과 수 표현 | `prior_design_artifact` | original dirty worktree의 로컬 artifact이며 current app evidence 아님 |
| 캘린더·todo·project 도구 패턴 | filter, inbox, quick edit, project receipt, batch move | `reference_pattern` | 외형 복제 금지 |

## 제품 객체 결정

### 사용자에게는 Flow 하나만 보인다

- `Flow`는 사용자가 발견하고, 저장하고, 조정하고, 실행하고, 내보내는 단위다.
- `Flow Map`은 source bundle, creator 구조, 내부 aggregate 모델로 남을 수 있다.
- Home과 `/flows`에서 Flow와 Flow Map이 서로 다른 카드·상세·저장 문법을 사용하지 않는다.
- 여러 child Flow를 하나의 chooser에 숨기지 않는다. 서로 다른 결과물을 주는 결혼 준비 참고표 2종은 각각 독립 entry가 된다.

### source, personal, run, occurrence 소유권

| 소유자 | 책임 | 변경 주체 |
| --- | --- | --- |
| source/version | 원본 제목, 설명, 순서, 일정 단서, 출처, 게시 버전 | creator/content pipeline |
| personal overlay | 개인 이름, 포함/제외, alias, 메모, 날짜, 구조 변경, 순서 | 사용자 |
| execution run | pending, done, reopened, skipped, held, 완료 시각 | 사용자 실행 |
| occurrence | 반복 series의 특정 회차 identity와 회차 override | recurrence adapter + 사용자 |

화면 개편이 이 경계를 우회해 source를 직접 변경하거나 completion을 structure에 저장하면 실패다.

## 발견 카드 계약

카드의 시각적 우선순위는 다음으로 고정한다.

1. 구체적인 사용자 일 또는 결과물 제목
2. 검증 가능한 source 이름·성격·최근 확인일
3. 대표 artifact preview 2~3개
4. 필요한 입력을 짧은 control/chip으로 표시
5. 결과 범위와 item 수

예: 긴 문장 `이사일만 넣으면 D-30 일정과 할 일 5개를 저장합니다` 대신 다음을 분리한다.

- 제목: `이사 준비 D-30`
- source: `원문: 확인된 이사 체크리스트`
- preview: `견적 확정`, `주소 변경`, `전날 점검`
- input: `이사일 필요`
- result: `5개 일정 · D-30~D-Day`

실제 집계 계약이 없는 `N명 검증`, 별점, 인기 item, 단계별 aggregate review, `인기순`은 production에서 금지한다. source authority도 실제 원문과 검토 상태가 확인될 때만 표시한다.

## 저장과 조정 결정

한 경로를 강요하지 않고 같은 artifact에서 두 경로를 제공한다.

- `그대로 시작`: 필요한 최소 입력 후 개인 실행 사본을 만들고 whole-Flow receipt로 이동한다.
- `내게 맞게 조정`: source를 덮어쓰지 않는 개인 작업 사본을 열어 일정·항목·순서·메모를 바꾼 뒤 저장하거나 내보낸다.

두 경로는 같은 effective item resolver와 projection을 사용한다. 저장 전 full planner는 만들지 않지만, 조정 경로를 include/exclude만 있는 얕은 화면으로 제한하지도 않는다.

Studio UI를 My Flow에 복사하지 않는다. Studio는 source/creator/version/publish를, My Flow는 personal overlay와 execution을 담당한다. 날짜 picker, row editor, reorder 같은 primitive만 공유할 수 있다.

## surface별 한 문장 목적

| surface | 목적 | 첫 번째 객체 | 주 행동 |
| --- | --- | --- | --- |
| Home `/` | 바로 쓸 Flow 또는 URL/memo 시작점을 찾는다 | 추천 Flow | 열기 또는 URL/memo 입력 |
| Flow 찾기 `/flows` | 같은 카드 문법으로 검색·비교한다 | Flow catalog | Flow 열기 |
| Save-before | 저장될 전체 artifact와 필요한 입력을 확인한다 | whole Flow preview | 그대로 시작 / 조정 |
| Post-save | 방금 저장된 전체 Flow와 다음 행동을 확인한다 | saved whole Flow receipt | 시작 / 조정 / 가져가기 |
| My Flow `/my` | 지금 할 일과 저장한 Flow를 실행·관리한다 | task/occurrence + Flow | 완료 / 열기 / Flow 조정 |
| Calendar `/calendar` | 날짜별 실행과 일정 배치를 관리한다 | dated projection | 선택일 실행 / 날짜 배치 |
| Export | 범위와 예상 개수를 확인하고 외부 형식으로 가져간다 | explicit scope | 범위 선택 / 형식 선택 |

## content-shape adaptive whole-Flow

공통 shell은 통일하지만 본문을 한 목록으로 강제하지 않는다.

| shape | 기본 grouping | 핵심 metadata | Calendar 관계 |
| --- | --- | --- | --- |
| anchor timeline | 날짜·milestone | D-day, fixed override | dated rows만 projection |
| undated checklist | section | 선택 날짜, subcheck | 선택한 항목만 배치 |
| routine | series + occurrence | 빈도, 다음 회차 | occurrence projection |
| project/travel | phase + dated task | phase, 예약/시간 | mixed projection |
| record/memo | row/table | field, note | Calendar opt-in |
| personal draft | editable outline | personal structure | explicit scheduling |

My Flow의 same-date 묶음은 한 Flow 안에서만 적용한다. 서로 다른 Flow를 날짜만 같다고 하나의 무명 그룹으로 합치지 않는다.

## 편집 모델

### 실행 mode

- 제목, 날짜/시간, 완료 상태, 짧은 메모만 읽는다.
- 완료 체크박스는 task/occurrence당 하나다.
- `열기`는 상세 이동이다.

### quick edit

- 제목
- 언제: 날짜 없음 / 날짜 / 시간
- 내 메모

### advanced edit

- 소요 시간
- 반복
- 구조 추가·삭제·복구·순서
- source와 콘텐츠 형태에 실제로 필요한 필드만 표시

### batch mode

- 명시적으로 진입한다.
- 선택 중 completion control을 selection checkbox로 바꾼다.
- 날짜 이동/지우기, 포함/제외, 선택 export를 제공한다.
- 적용 전 대상 수와 before/after impact를 보여주고 즉시 undo를 제공한다.

## Calendar 역할

- Calendar는 날짜 우선 실행 화면이다.
- grid/agenda에는 dated item과 occurrence만 보인다.
- 날짜 없는 항목은 실행 목록이 아니라 `일정에 놓기` 작업 tray로만 접근한다.
- `전체 / 특정 Flow` filter를 명시적으로 제공한다.
- filter는 grid, selected-day agenda, count에 동일하게 적용된다.
- 390px은 grid + agenda + 필요 시 tray를 사용한다.
- 1024px은 3개 pane을 항상 강제하지 않고 현재 작업에 따라 grid/agenda 또는 tray/grid를 보여준다.

## 공개 저장 날짜 의도 계약

공개 Flow의 날짜는 세 상태로 분리한다.

| 상태 | 저장 | Calendar/ICS | 의미 |
| --- | --- | --- | --- |
| `custom` | 유효한 anchor 저장 | 포함 | 사용자가 직접 고른 날짜 |
| `undated` | anchor 없이 저장 | 제외 | 할 일만 먼저 저장 |
| `example` | 저장 schema에 허용하지 않음 | 제외 | artifact preview 전용 |

`example` 상태에서 저장을 누르면 CTA에 표시된 대로 undated 사본을 만든다. saved record에는 `custom | undated`만 들어간다. legacy example record의 preview anchor는 migration metadata로 보존하되 실행 날짜로 투영하지 않는다. source schedule, personal overlay, execution run은 이 migration으로 변경하지 않는다.

## 저장 handoff와 영수증 계약

- public Flow와 개인 draft는 `/my?savedFlow={flowId}`로 이동한다.
- source-backed Flow Map과 URL-first map hit은 `/my?savedMap={mapId}`로 이동한다.
- bare `/my`는 일반 재방문 화면이며 신규 저장 완료 handoff로 사용하지 않는다.
- receipt의 할 일 수는 별도 raw snapshot이 아니라 post-save whole-Flow outline이 실제로 그리는 effective row를 집계한다.
- receipt는 `할 일 N개`, `날짜 있음 N개`, 필요한 경우 `날짜 없음 N개`만 보여준다. 긴 성공 설명이나 숨은 집계 기준을 추가하지 않는다.
- receipt total은 outline effective row 합과 같고, dated + undated는 total과 같아야 한다.
- malformed date와 duplicate stable identity는 행을 조용히 버리지 않고 진단 수치로 기록한다.
- handoff query와 local persistence는 새로고침 후에도 같은 whole-Flow receipt를 복구해야 한다.
- post-save action hub의 대규모 시각 개편은 P26-07에서 다룬다. P26-02는 route와 count correctness만 고정한다.

## Export 역할

모든 portable export는 `범위 -> 예상 개수 -> 형식 -> 결과 receipt` 순서를 따른다.

- 범위: `Flow 전체`, `선택한 항목`, `현재 항목`
- 형식: Calendar/ICS, checklist, sheet, memo
- preview count와 실제 output count는 일치해야 한다.
- undated item은 list export에는 포함하고 Calendar/ICS에서는 제외한다.
- internal term이나 raw schema label을 노출하지 않는다.

## 반복 series / occurrence 계약

- My Flow 전체는 반복 정의를 `반복 설정`으로 보여주고 definition completion control을 만들지 않는다.
- Today와 Calendar는 projected occurrence만 실행하며 회차당 완료 체크박스 하나를 사용한다.
- Flow 전체에서 반복 정의를 열면 series 설정을 열고, 다음 occurrence로 대신 이동하지 않는다.
- series definition은 Calendar `날짜 정하기` tray에 들어가지 않는다.
- public, My Flow 전체, 현재 항목 export는 같은 canonical series ID, UID, RRULE을 사용한다.
- export preview는 `반복 일정 N개`와 현재 visible range의 `표시 회차 N개`를 분리한다.
- exact-video + schedule-user-choice metadata의 4주 preview는 Calendar와 ICS의 같은 종료 경계를 사용한다.
- done, reopened, skipped, held는 occurrence execution run에 남고 series membership과 identity를 바꾸지 않는다.

관련 evidence: [P26-03 recurrence evidence](../../content-audit/2026-07-20-p26-03-recurrence-series-occurrence-evidence/README.md)

## 메모 source fragment / draft item 계약

- memo와 URL-miss input은 newline, checkbox, ordinal, 문장부호, arrow, 보수적 comma/`그리고` list만 deterministic하게 분리한다.
- parser는 사용자가 쓰지 않은 행동, 세부 단계, 날짜, 의미를 생성하지 않는다.
- source fragment와 draft suggestion은 deterministic stable ID를 가진다.
- 한 source fragment는 여러 draft item을 만들 수 있고 item은 하나 이상의 source fragment를 참조할 수 있다.
- 목적어 나열처럼 불확실한 목록은 하나로 유지하고 사용자가 저장 전 직접 나눈다.
- 저장 전 review는 include/exclude, title edit, split, merge, up/down reorder를 제공한다.
- 390px에서는 source fragment당 disclosure 하나, 1024px에서는 source/result 2열을 사용하며 source text를 item마다 반복하지 않는다.
- accepted order가 saved item order와 list export order의 입력이 된다.
- 저장된 item detail은 source fragment ID와 원문을 additive하게 보존하지만 내부 ID를 사용자 화면/export에 노출하지 않는다.

관련 evidence: [P26-04 memo evidence](../../content-audit/2026-07-20-p26-04-memo-segmentation-evidence/README.md)

## 후속 시각 참조 원칙

`2026-07-19-flow-content-usage-preview-ko.html`에서 재사용할 것은 구성 원리다.

- source 선택 rail 또는 compact source identity
- timing, title, 짧은 요약을 우선한 실행 item row
- Calendar/checklist/sheet/memo 결과를 같은 effective item으로 비교하는 destination preview
- 날짜 없음·제외 이유와 결과 개수를 destination 수준에서 짧게 보여주는 방식

긴 intro, 사용법 설명, 내부 검토 상태, source audit 문구는 production 화면에 복제하지 않는다. P26-06/07/10/16/17은 이 원칙을 current source와 current browser evidence에 맞게 재구성한다.

## P26 실행 단계

### Stage 0: 결정과 정확성

- P26-00C product object, save/adjust, adaptive whole-Flow decision
- P26-01 date intent correctness
- P26-02 canonical save receipt and route parity
- P26-03 recurrence series/occurrence parity
- P26-04 memo segmentation integrity
- P26-05 projection identity gate

### Stage 1: 발견과 저장

- P26-06A unified discovery card
- P26-06B unified save-before
- P26-06C independent wedding entries
- P26-07 post-save whole-Flow hub

### Stage 2: My Flow와 조정

- P26-08 My Flow IA and content-shape selector
- P26-09 adaptive whole-Flow reading model
- P26-10 quick/advanced editor
- P26-11 structural and batch editing
- P26-12 completion/reopen/undo
- P26-13 reuse and anchor policy

### Stage 3: Calendar와 export

- P26-14 undated inbox and batch scheduling
- P26-15 Calendar Flow filter/group/date move
- P26-16 unified export scope/result

### Stage 4: integration

- P26-17 visual/copy/component system
- P26-18 responsive workspace
- P26-19 six-journey harness
- P26-20 final audit, release, deploy

## 비기능 품질 기준

- 390x844, 1024x768에서 horizontal overflow와 fixed overlap `0`
- interactive target 최소 44x44
- visible keyboard focus
- icon button은 lucide 등 익숙한 icon과 accessible name 사용
- body/input text 최소 16px on mobile input
- 한 화면의 primary CTA는 하나
- 긴 설명을 state/action label 대신 사용하지 않음
- candidate/user copy internal term hit `0`
- normal-route guardrail hit `0`
- source mutation `0`
- identity/count mismatch `0`

## 이번 프로그램에서 하지 않을 것

- 계정, DB, cloud sync
- 실제 AI provider/API
- OAuth 또는 직접 Calendar/Notion/Todo 동기화
- 5번째 primary tab
- Studio를 primary app으로 승격
- public `/f`를 4-tab app shell에 편입
- 검증되지 않은 social proof
- source-backed 원본 직접 수정
- 자동 시뮬레이션을 실제 사용자 관찰로 표현

## P26 종료 기준

1. 날짜·receipt·반복·memo·projection foundation이 green이다.
2. Flow와 Flow Map이 사용자-facing에서 하나의 Flow 문법으로 읽힌다.
3. card와 save-before가 긴 설명 없이 artifact, source, input, result를 보여준다.
4. 그대로 시작과 내게 맞게 조정이 같은 effective Flow를 만든다.
5. 저장 직후 전체 Flow가 확인되고 post-save receipt가 route별로 일치한다.
6. quick/advanced/batch editing이 source를 덮어쓰지 않는다.
7. 완료·완료 취소·skip·hold가 명확히 구분된다.
8. Calendar filter, undated placement, single/batch date move, undo가 일관된다.
9. export scope/count/output이 일치한다.
10. six content shapes의 모바일/wide journey가 통과한다.
11. Blocking/High automated finding이 `0`이다.
12. observed-user count는 실제 실행값으로 정확히 기록된다.
