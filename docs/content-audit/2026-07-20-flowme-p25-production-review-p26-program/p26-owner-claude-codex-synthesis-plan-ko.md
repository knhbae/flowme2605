# FlowMe P26 오너·Claude Design·Codex 통합 실행 계획

## 0. 문서 상태

- 작성일: 2026-07-20
- 문서 성격: 제품/UX 실행 계획, 앱 구현 아님
- 현재 production: <https://flowme2605.vercel.app>
- 현재 확인한 `origin/main`: `48571afeb63dc06a321e5ab49ccf50522bfa7c29`
- 기존 P26 독립 재검토 패키지 기준 SHA: `192a60a19909c3c9990ddb0955c7b339ac4b7ae7`
- 실제 관찰 사용자: `0명`
- 최종 판정: `bounded_structural_correction_required`

이 문서는 오너 피드백, 최신 Claude Design `(9)` 아카이브, 기존 Codex P26 독립 재검토 패키지, 현재 `origin/main` 소스를 대조해 만든 통합 계획이다. 어느 한 자료의 백로그를 그대로 복사하지 않는다.

기존 P26 패키지의 `P26-01~P26-20`을 정본 번호로 유지한다. Claude Design 문서에 있는 별도 `P26-01~P26-14` 번호는 외부 검토 문서의 로컬 번호로만 취급한다. 이번 문서는 두 번호 체계의 충돌을 해소하고, 오너가 새로 제기한 제품 결정을 `P26-00C`와 기존 항목의 하위 slice로 배치한다.

현재 worktree에는 이 계획과 무관한 modified/untracked 파일이 많다. 이번 작업의 소유 범위는 이 파일 하나다. 기존 파일을 되돌리거나 stage하지 않는다.

---

## 1. 한 줄 결론

FlowMe는 전체를 다시 버리고 만드는 단계도, CSS polish만 반복할 단계도 아니다.

먼저 날짜·반복·저장 결과 같은 정확성을 닫고, 동시에 `무엇을 발견하고 → 무엇을 저장하며 → 언제 개인화하고 → 어디서 실행하는가`를 하나의 화면 계약으로 다시 고정해야 한다. 그 뒤 홈·Flow 찾기·저장 전·저장 후·My Flow·Calendar를 같은 객체와 같은 조작 언어로 구현한다.

핵심 결정은 다음과 같다.

1. 사용자에게는 `Flow` 하나만 보인다. `Flow Map`은 내부 구조나 컬렉션 역할로 남길 수 있지만 카드·상세·저장 경험을 다르게 만들지 않는다.
2. 카드의 1차 정보는 과장된 효능이나 가짜 인기 지표가 아니라 `사용자가 하게 될 일과 결과물`이다. 검증된 출처·최근 확인일은 2차 신뢰 정보로 붙인다.
3. `N명이 검증`, `인기순`, 단계별 리뷰는 실제 집계 데이터와 정의가 생기기 전 production에 노출하지 않는다.
4. `그대로 시작`과 `내게 맞게 조정`을 같은 Flow의 두 경로로 제공한다. 조정을 선택하면 source를 바꾸지 않는 개인 작업 사본에서 일정·항목·순서·메모를 손본 뒤 저장하거나 내보낸다.
5. Studio UI를 My Flow에 그대로 이식하지 않는다. 편집 primitive는 공유하되 Studio는 제작/출처/게시, My Flow는 개인 overlay와 실행을 담당한다.
6. 모든 Flow를 같은 목록 모양으로 만들지 않는다. 공통 shell은 통일하되 timeline, checklist, routine, project, record에 맞는 읽기 전략을 사용한다.
7. Calendar는 날짜 우선 화면으로 유지하고 Flow 필터와 명시적 날짜 배치 작업을 강화한다. My Flow는 전체 Flow와 할 일 실행을 담당한다.

---

## 2. 근거와 신뢰 경계

| 입력 | 이 계획에서 사용한 내용 | evidenceKind | 한계 |
|---|---|---|---|
| 오너 피드백 | 현재 이해되지 않는 화면, 필요한 자유도, 신뢰 정보, 콘텐츠별 기대 | `owner_feedback` | 재현 로그가 아니라 제품 판단과 문제 제기 |
| production/P25 구조화 evidence | 날짜·반복·receipt·전체 Flow·편집·Calendar·export의 현재 상태 | `current_package_screenshot`, `current_production_interaction` | 기존 P26 패키지는 현재 `origin/main`보다 이전 SHA에서 생성됨 |
| `origin/main` 소스 | Home에 Flow Map 전용 카드가 있고 일반 Flow 카드와 병렬 렌더링됨, 결혼 준비 2종이 하나의 map 안 chooser로 묶임, `인기순` 옵션이 존재함 | `current_source` | 이번 계획에서는 production 브라우저를 재실행하지 않음 |
| Claude Design `(9)` | 설명 대신 상태/조작, progressive editor, 제자리 완료 취소, undated tray, export scope, anchor-linked/fixed date, 중복 제거, 실행 중 메모 | `prior_design_artifact` | 목업과 heuristic 제안이며 실제 사용자 검증 아님 |
| Codex P26 패키지 | date intent, receipt, recurrence, memo, projection, whole Flow, editing, Calendar/export, responsive의 계약 분해 | `current_package_screenshot`, `current_source`, `heuristic_simulation` | 20개 항목은 상세하지만 오너 정보 설계 결정이 앞단에 부족함 |
| 외부 제품 패턴 | undated inbox, project receipt, quick/advanced edit, recurrence occurrence, calendar filtering, batch move | `reference_pattern` | 외형 복제나 FlowMe의 사용자 검증으로 간주하지 않음 |

### 확인된 현재 소스 신호

- Home의 source-backed 추천은 `FlowMapCatalogCard`, 일반 공개 Flow는 `DirectoryFlowCard`를 사용한다. 사용자는 같은 목적의 카드에서 다른 정보 구조를 학습해야 한다.
- Home 추천 문구는 `입력값만 넣으면 + 결과물 + 할 일 수`를 조합한다. 오너가 지적한 로그형 문구가 코드에서 직접 생성된다.
- 결혼 준비는 `결혼 준비 참고표 2종` map 안에서 `두 참고표 중 하나를 고르세요`로 구성된다. 두 child Flow는 출처와 결과 형태가 달라 독립 진입 후보가 된다.
- 카탈로그 정렬에 `인기순`이 있지만, 현재 문서와 로컬 저장 구조에는 production 집계 기준이 명확하지 않다.
- P25는 전체 Flow 작업공간, progressive adjustment, batch mode, undated Calendar placement를 구현했지만 오너는 현재 화면만 보고도 조작 가능성을 예상하기 어렵다고 평가했다. 기능 존재와 발견성/정보 구조를 분리해 다뤄야 한다.

---

## 3. 피드백 종합 판정

### 3.1 공통으로 일치한 문제

| 문제 | 오너 | Claude | Codex | 통합 판정 |
|---|---|---|---|---|
| 설명이 상태와 조작을 대신함 | 강하게 지적 | A~G 공통 원칙 | copy prune/공통 frame | High, 구조로 해결 |
| 저장 전에 무엇이 생기는지 확신이 약함 | 전체 Flow가 보여야 함 | artifact/receipt 강조 | save-before/receipt 분리 | High |
| 조정 자유도와 발견성이 부족함 | 날짜·순서·상세 수정 요구 | progressive/intent-first | quick/advanced/structural edit | High |
| Calendar 날짜 배치가 어렵고 날짜 없음이 모호함 | 직접 지적 | tray와 drag/batch 제안 | undated inbox/batch scheduling | High |
| Calendar/My Flow가 콘텐츠 구조를 충분히 보여주지 못함 | 필터·날짜 묶음 요구 | 역할 분리 | whole Flow/Calendar grouping | High |
| 정확성 계약이 UI보다 먼저임 | 직접 언급은 적음 | 날짜/저장 유실 선행 | date/recurrence/memo/receipt foundation | Blocking 선행 게이트 |

### 3.2 서로 다른 주장과 최종 결정

#### 카드가 `결과 약속`을 먼저 말할지 `출처·검증`을 먼저 말할지

둘 중 하나만 택하지 않는다.

1. 제목: 사용자의 구체적 일 또는 artifact 이름
2. 첫 보조줄: 검증된 source 이름과 source 성격
3. 구조 preview: 대표 항목 2~3개 또는 phase, item 수, 날짜 모델
4. 필요한 입력: 문장이 아니라 chip/control로 `이사일 필요`, `날짜 없이 시작 가능`
5. 결과: `5개 일정 · D-30~D-Day`, `10개 체크`처럼 짧은 구조 값

`이사일만 넣으면 D-30 일정, 할 일 5개를 저장합니다` 같은 한 문장만으로 카드를 설명하지 않는다. 입력, 기간, item 수는 각각 시각적 정보로 분리한다.

`이사 전문 업체 XXX의 체크리스트`는 source가 실제로 해당 전문 업체의 정확한 원문일 때만 source line으로 표시한다. 광고성 보증 문구로 사용하지 않는다.

`XXX명이 검증`은 아래 조건을 모두 충족할 때까지 금지한다.

- 집계 대상과 기간이 정의됨
- 실제 사용자 실행 또는 리뷰 데이터임
- 중복/내부 QA/자동화 세션이 제외됨
- 사용자가 검증의 의미를 오해하지 않도록 metric 이름이 정확함

현재는 `원문 연결`, `최근 확인`, `공식/제작자/개인 경험` 같은 검증 가능한 source 신호만 사용한다.

#### 저장 먼저인지 조정 먼저인지

한 가지 경로를 강요하지 않는다.

- `그대로 시작`: 최소 입력 후 즉시 개인 실행 사본을 만들고 전체 Flow receipt로 이동
- `내게 맞게 조정`: source를 덮어쓰지 않는 임시 개인 작업 사본을 열고, 일정·항목·순서·메모를 조정한 뒤 `내 Flow에 저장` 또는 `가져가기`

두 경로는 같은 artifact preview와 같은 effective item 계약을 사용해야 한다. 저장 전 full planner를 만들지 않지만, 조정을 선택한 사용자에게 include/exclude만 보여주고 끝내지도 않는다.

#### Studio를 개인 조정에 사용할지

Studio의 화면을 그대로 계승하지 않는다.

| 영역 | 소유권 | 사용 목적 |
|---|---|---|
| Studio | source/creator/version/publish | 원문을 Flow로 구성하고 공개 전 검토 |
| My Flow 조정 | personal overlay | 내 제목·날짜·메모·구조·선택을 수정 |
| Execution | run/occurrence | 완료·재개·건너뜀·보류 |

날짜 picker, row editor, reorder, checklist 같은 primitive는 공유할 수 있다. 그러나 navigation, source editing, publish controls, 검토 문구는 공유하지 않는다.

---

## 4. 목표 사용자 여정

| 단계 | 사용자가 알아야 하는 것 | 주 화면 | 성공 기준 |
|---|---|---|---|
| 1. 발견 | 이것이 내 어떤 일을 어떤 결과물로 바꾸는가 | Home, Flow 찾기 | 카드만 보고 job, source, 구조, 필요한 입력을 말할 수 있음 |
| 2. 검토 | 실제로 어떤 항목이 들어오는가 | Flow 상세 | 첫 viewport에 대표 구조와 저장 단위가 보임 |
| 3. 선택 | 그대로 쓸지 조정할지 | Flow 상세 | 두 경로의 결과가 명확하고 CTA가 경쟁하지 않음 |
| 4. 조정 | 무엇을 바꿀 수 있고 무엇이 원본인가 | 개인 작업 사본 | title/date/detail/order/include를 찾고 수정 가능 |
| 5. 확정 | 무엇이 몇 개 저장됐는가 | 저장 receipt/전체 Flow | 전체 item 수, dated/undated, date range, 반복 여부 확인 |
| 6. 실행 | 지금 할 일과 전체 계획의 관계 | My Flow | 오늘 실행과 전체 Flow를 혼동하지 않음 |
| 7. 일정 배치 | 어느 Flow의 어떤 일을 어느 날짜에 놓는가 | Calendar | Flow 필터, single/batch placement, undo가 예측 가능 |
| 8. 완료/복구 | 완료가 사라지지 않고 되돌릴 수 있는가 | My Flow, Calendar | 즉시 undo와 persistent reopen 모두 가능 |
| 9. 외부 활용 | 전체/선택/현재 중 무엇이 나가는가 | Export | 실행 전 count와 실행 후 결과가 일치 |
| 10. 재사용/피드백 | 이전 실행을 보존하며 다음 실행을 만드는가 | My Flow | 새 run, 회고/수정 메모, source update가 분리됨 |

---

## 5. 공통 shell과 콘텐츠별 본문 전략

### 5.1 통일할 것

모든 사용자-facing Flow는 아래 공통 shell을 사용한다.

- job/title
- source identity/freshness
- artifact type
- item/phase count
- schedule model: 기준일, 고정 날짜, 반복, 날짜 없음
- representative preview
- `그대로 시작` / `내게 맞게 조정`
- 저장 후 whole-Flow receipt

`Flow Map`은 여러 source-backed child Flow를 관리하는 내부 aggregate로 남길 수 있다. 하지만 Home/Flow 찾기에서는 일반 Flow와 같은 카드, 같은 CTA, 같은 정보 순서를 사용한다. map 전체가 하나의 실행 artifact가 아니면 각 child Flow를 독립 카드로 노출한다.

### 5.2 통일하지 않을 것

artifact 본문은 콘텐츠 모양에 따라 달라야 한다.

| 콘텐츠 모양 | 기본 읽기 모델 | 첫 정보 | 날짜 표현 | 예시 |
|---|---|---|---|---|
| 기준일 역산형 | 날짜/milestone 그룹 | 기준일, D-day 구간, 같은 날짜 묶음 | 기준일 연동/개인 고정 배지 | 이사 준비 |
| 날짜 없는 checklist | section checklist | 항목 수, 필수/선택, 미정 상태 | 날짜 없음 기본, 필요할 때 배치 | 차량 점검 |
| 반복 routine | series + next occurrence | 반복 규칙, 다음 회차, 최근 기록 | definition과 occurrence 분리 | 운동, 정기 청소 |
| 순서·일정 혼합 project | phase + dated task | phase, 다음 결정, 예약/마감 | phase 안에서 날짜 그룹 | 여행, 프로젝트 |
| 기록·memo/table | row/table/list | 필드, 기록 기준, next review | Calendar는 opt-in | 냉장고/생활 기록 |
| 개인 draft | editable outline | user-created item, 구조 편집 | 날짜 없음에서 시작 가능 | URL/memo draft |

공통 component를 쓰되 모든 콘텐츠를 `날짜순 한 목록`이나 `phase순 한 목록`으로 강제하지 않는다.

---

## 6. 화면별 결정

### 6.1 Home

#### 목표

추천 카드 탐색 전에 FlowMe가 `콘텐츠를 내 실행물로 바꾸는 도구`임을 보여주고, 추천 카드 하나만 봐도 저장 결과를 예측하게 한다.

#### 카드 정보 순서

1. title/job
2. verified source line
3. representative artifact preview
4. schedule/result chips
5. one CTA

예시:

```text
원룸 이사 D-30
OO 이사 체크리스트 기반 · 최근 확인 2026.07

D-30  업체 후보 정리
D-14  인터넷 이전 신청
D-1   냉장고 비우기

[이사일 필요] [5개 일정] [D-30~D-Day]
전체 보기
```

한 카드 안에 약속 문장, summary 문장, reason 문장, 첫 item 문장을 중복 노출하지 않는다.

### 6.2 Flow 찾기

- Flow Map 카드와 일반 Flow 카드를 `FlowCatalogCard` 한 종류로 통합한다.
- search/filter는 `결과물`, `일정 방식`, `상황` 중심으로 재정리한다.
- 실제 사용 데이터가 없으면 `인기순`을 제거하고 `추천순` 또는 `최근 확인순`처럼 근거가 있는 정렬을 사용한다.
- 각 카드에 대표 item 2~3개를 보여주되 전체 row action은 노출하지 않는다.
- 단계별 리뷰/많이 하는 item은 real metric contract가 생기기 전 production에 넣지 않는다.

#### 결혼 준비 참고표 2종

현재 map 안 chooser를 기본 진입으로 쓰지 않는다.

- `결혼 준비 1년 타임라인`
- `결혼 준비 핵심 4가지 시작표`

두 항목은 source, 범위, artifact가 다르므로 Flow 찾기에서 별도 카드로 진입시킨다. 공통 collection page는 비교/출처 탐색용 secondary surface로만 남긴다.

### 6.3 저장 전 Flow 상세

- 첫 viewport: title/source, artifact preview, schedule intent, CTA만 둔다.
- 긴 conversion 설명은 preview row, chip, source disclosure로 대체한다.
- `그대로 시작`과 `내게 맞게 조정`은 같은 저장 단위를 공유한다.
- export는 조정/저장 전에 primary와 경쟁하지 않는다.
- source/safety는 실제 결정을 바꾸는 내용만 보이고 나머지는 접는다.

### 6.4 저장 직후

- Today 한 행으로 바로 보내지 않고 저장한 whole Flow를 먼저 확인한다.
- 보여줄 것: Flow title, 총 item 수, dated/undated 수, date range, phase/date groups, first action.
- 다음 행동: `첫 할 일 시작`, `전체 조정`, `Calendar 보기`, `가져가기`.
- route별 receipt 우회가 없어야 한다.

### 6.5 My Flow

- `지금`: cross-Flow 실행 projection
- `Flow 목록`: 저장한 whole artifact inventory
- `완료`: 기록과 reopen

#### 같은 날짜 묶기

같은 Flow 안에서 같은 날짜 item은 date header 아래 묶는다. 다른 Flow를 날짜만 같다고 한 그룹에 섞지 않는다.

- timeline/anchor Flow: date group이 1차, phase가 2차
- checklist/record Flow: source section이 1차, date가 row meta
- routine: occurrence date/time이 1차
- 날짜 없음: 별도 `날짜 없음` group

### 6.6 개인 조정 workspace

정상 실행 화면에 모든 편집 control을 상시 노출하지 않는다.

| 모드 | 노출 control |
|---|---|
| 실행 | 완료, 열기, 짧은 memo 상태 |
| 빠른 조정 | title, date/undated, personal memo |
| 세부 일정 | time, duration, recurrence, location |
| 구성 편집 | add, delete, restore, reorder |
| 선택 작업 | batch date move, export, include/exclude |

첫 item 화면에는 title, current date state, anchor-linked/fixed state, memo 존재 여부가 보여야 한다. 사용자는 편집 화면에 들어가기 전 어떤 수정이 가능한지 예상할 수 있어야 한다.

### 6.7 Calendar

- 기본은 `month grid + selected-day agenda`다.
- 상단에 `전체 Flow` 기본값과 Flow filter를 compact하게 제공한다.
- filter는 month marker, selected-day agenda, 열린 undated queue에 같은 범위로 적용한다.
- 날짜 없는 일은 상시 긴 목록이 아니라 count/pill로 열고, 선택한 뒤 target date와 변경 결과를 preview한다.
- 단일 이동과 batch 이동은 같은 commit/undo 계약을 사용한다.
- source-backed relative date와 personal fixed date가 섞이면 `연동`/`고정` 상태를 표시한다.

### 6.8 Export와 리뷰

- Flow header에서 scope-first export를 연다.
- `Flow 전체 / 선택 항목 / 현재 항목`과 실제 row/event count를 실행 전에 보여준다.
- 실행 후 파일명, format, 포함 수, 제외 수를 receipt로 남긴다.
- 단계 메모는 실행 중 item에서 짧게 남기고 완료 후 회고에 자동 모을 수 있다.
- aggregate review와 social proof는 실제 데이터 contract가 생길 때까지 defer한다.

---

## 7. 기존 P26 번호 정합성

기존 Codex 패키지의 20개 항목을 정본으로 유지한다. 최신 Claude Design의 14개 항목은 아래처럼 흡수한다.

| Claude 문서 항목 | 정본 P26 배치 |
|---|---|
| 예시·기본 anchor 날짜 정합 | P26-01 |
| SSR/route 정합 | P26-02, P26-19 |
| AppClient 분할 | 병렬 engineering lane `P26-E1`, interaction contract 확정 후 |
| public 최소 frame/CTA | P26-06B |
| My Flow/Calendar 역할, undated | P26-08, P26-14 |
| intent-first 편집 | P26-10 |
| 복구/순서 발견성 | P26-11, P26-12 |
| Calendar 2영역 | P26-15, P26-18 |
| 반복 회차 언어 | P26-03, P26-12, P26-17 |
| export 사후 결과 | P26-16 |
| 시각 시스템/날짜 picker/copy | P26-17 |
| public wide 2-pane | P26-18 |
| 통합 재게이트 | P26-19 |
| final review | P26-20 |

오너의 신규 피드백은 다음 sub-slice로 추가한다.

| 신규 결정 | 배치 |
|---|---|
| 정보 우선순위, 저장/조정 타이밍, content-shape wireframe | P26-00C |
| Home/Flow 찾기 카드 통합과 trust signal | P26-06A |
| Flow/Flow Map 사용자 shell 통합 | P26-06A/P26-06B |
| 결혼 준비 2종 독립 진입 | P26-06C |
| 저장 직후 whole Flow receipt | P26-07 |
| 같은 날짜 item 묶음 | P26-09 |
| richer personal adjustment | P26-10/P26-11 |
| Calendar Flow filter | P26-15 |
| 날짜 이동/undated placement | P26-14/P26-15 |
| 실제 인기/리뷰 data gate | P27 후보, P26에서는 가짜 지표 제거만 |

---

## 8. 단계별 실행 프로그램

### Gate 0. P26-00C 제품 객체·사용자 여정 의사결정

앱 코드를 수정하지 않고 아래 화면을 current/proposed로 비교한다.

- Home recommendation
- Flow 찾기 catalog
- Flow detail/save-before
- 조정해서 시작
- post-save whole Flow
- My Flow date/phase grouping
- Calendar filter/placement

6개 콘텐츠 모양을 모두 switchable하게 만든다: 이사, 차량 checklist, routine, 여행/project, record, 개인 draft. 결혼 준비 2종은 독립 entry 판단을 포함한다.

이 gate가 닫히기 전 P26-06 이후 runtime UI를 구현하지 않는다.

### Stage 1. Foundation/correctness

#### P26-01 Date intent contract

- example date와 persisted date 분리
- custom/undated/preview-only 명시
- KST/opposite timezone 검증
- Calendar/ICS membership 일치

#### P26-02 Canonical save receipt and route parity

- 모든 저장 route가 같은 receipt model 사용
- `/f`, `/flow-maps`, URL-first 저장 결과 parity
- route alias와 hydration/hard-navigation 검증

#### P26-03 Recurrence series/occurrence contract

- definition, generated occurrence, run state, ICS 분리
- public/My Flow/Calendar/ICS count parity

#### P26-04 Deterministic memo segmentation

- source fragment와 item boundary 보존
- split/merge/review 가능
- 오류/status 문장을 item으로 만들지 않음

#### P26-05 Projection identity/migration gate

- source/personal/run/occurrence/export identity invariant
- malformed/legacy migration과 데이터 손실 0

P26-01을 먼저 시작하고, 02/03/04는 영향 파일 충돌을 피할 수 있을 때 병렬 진행한다. 05가 통합 gate다.

### Stage 2. Discovery/save object

#### P26-06A Home/Flow 찾기 object card

- 하나의 user-facing card component
- job + verified source + artifact preview + schedule/result chips
- fake popularity/social proof 0
- `인기순` 근거 없으면 제거/교체

#### P26-06B Unified save-before artifact frame

- `/f`와 `/flow-maps`의 reading order/CTA 통일
- 공통 whole-artifact preview
- one save decision surface

#### P26-06C Multi-source/variant entry split

- 결혼 준비 2종을 독립 entry로 노출
- collection/map는 secondary browse surface
- 다른 multi-child map에도 적용 가능한 일반 판별 규칙

#### P26-07 Post-save decision hub

- 저장한 전체 artifact receipt
- dated/undated/repeat count
- start/adjust/calendar/export action hierarchy

### Stage 3. My Flow/adjustment

#### P26-08 My Flow role/navigation

- 지금/Flow 목록/완료 역할 고정
- held/review-only content는 ordinary execution에서 숨김

#### P26-09 Whole Flow reading model

- content-shape별 date/phase/section grouping
- 이사에서 same-date 묶음
- 긴 Flow에서 compact row + detail

#### P26-10 Quick/advanced editor

- quick: title/date/memo
- advanced: time/duration/repeat/location
- user intent와 맞지 않는 field 미노출

#### P26-11 Structural/batch mode

- add/delete/restore/reorder
- selection 후 date move/export/include/exclude
- 실행 mode와 편집 mode 분리

#### P26-12 Completion/reopen/undo

- 같은 identity에서 reversible
- same-list completed section 또는 stable reopen path
- occurrence scope 명시

#### P26-13 Reuse/new anchor

- 기존 run/history 보존
- linked date 재계산과 fixed date 유지 선택

### Stage 4. Calendar/export

#### P26-14 Undated inbox/batch scheduling

- 날짜 없음의 명확한 집
- count → select → target date preview → commit → undo

#### P26-15 Calendar grouping/filter/date placement

- 전체/특정 Flow filter
- grid/agenda/filter parity
- 같은 날짜 Flow group
- anchor-linked/fixed date 이동 preview

#### P26-16 Unified export scope/result

- whole/selected/current vocabulary 통일
- preview count와 actual output parity
- result receipt

### Stage 5. Visual/responsive integration

#### P26-17 Execution component/copy system

- common card/row/editor/receipt/export components
- copy budget와 source/safety hierarchy
- 44px target, focus, contrast, error/disabled state

#### P26-18 Responsive workspace

- 390: one object + sheet/drill-in
- 1024: rail/outline/detail 또는 grid/agenda
- public wide 2-pane

### Stage 6. Evidence/final

#### P26-19 Six-journey harness

- current command/browser evidence 재생성
- owner 질문을 marker로 고정
- automated/heuristic/observed 경계 유지

#### P26-20 Final review

- Blocking/High 0
- 6개 콘텐츠 모양과 7개 핵심 surface current screenshot
- observed users는 실행하지 않았으면 계속 0으로 기록

---

## 9. 바로 다음 목표: P26-00C

### 목표

구현 전에 `하나의 Flow 객체`, `저장/조정 타이밍`, `콘텐츠별 whole-Flow 읽기 모델`을 current/proposed wireframe과 decision matrix로 고정한다.

### 산출물 후보

```text
docs/content-audit/2026-07-20-p26-00c-product-object-journey-decision/
  README.md
  audit.md
  prototype.html
  screen-contract.md
  decision-matrix.json
  route-evidence.json
  screenshots/
    current/
    proposed/
```

### 반드시 비교할 대안

1. 기능 약속 우선 vs source 우선 vs 통합 hierarchy
2. 그대로 저장 후 조정 vs 조정 후 저장 vs 두 경로 병존
3. Flow Map 별도 card vs user-facing Flow card 통일
4. phase group vs date group vs content-shape adaptive group
5. Calendar 상시 undated queue vs 필요 시 열리는 queue
6. inline full editor vs quick sheet + advanced disclosure

### 의사결정 기준

- 첫 5초에 저장 artifact를 예측할 수 있는가
- 긴 설명 없이 정보가 보이는가
- source/personal/run 소유권을 깨지 않는가
- 기존 calendar/todo 사용자가 학습한 조작과 충돌하지 않는가
- timeline/checklist/routine/project/record에 같은 shell을 쓰면서 본문을 억지로 통일하지 않는가
- 390/1024에서 같은 hierarchy를 유지하는가

### 완료 기준

- Home/Flow 찾기/상세/저장 후/조정/My Flow/Calendar의 한 문장 목적이 고정됨
- `Flow Map` user-facing 별도 card pattern 제거 여부가 결정됨
- 카드 trust signal과 금지 social proof가 확정됨
- 결혼 준비 2종 독립 진입 wireframe이 있음
- 조정 전/후 저장 모델이 하나로 결정됨
- 콘텐츠 모양별 grouping 전략이 결정됨
- 오너가 current/proposed를 보고 keep/change를 선택할 수 있음
- 앱 runtime과 data schema 변경 0

### 병렬 허용

P26-01 date intent correctness는 P26-00C와 병렬로 시작할 수 있다. 날짜 정확성은 어떤 화면안이 채택돼도 필요한 foundation이다. P26-06 이후 화면 구현은 P26-00C 결정 전 시작하지 않는다.

---

## 10. Evidence marker 초안

### Discovery/trust

- `homeFlowAndMapUserFacingCardPatternCount: 1`
- `homeCardVerifiedSourceVisible: true`
- `homeCardRepresentativeItemPreviewCount: 2..3`
- `homeCardUnverifiedSocialProofCount: 0`
- `catalogUnsupportedPopularityControlCount: 0`
- `weddingIndependentEntryCount: 2`
- `weddingPostEntryVariantChooserCount: 0`

### Save/adjust

- `saveBeforeArtifactPreviewVisible: true`
- `saveDecisionSurfaceCount: 1`
- `saveBeforeDeepAdjustmentPathVisible: true`
- `postSaveWholeFlowReceiptVisible: true`
- `postSaveEffectiveItemCountMatches: true`
- `personalAdjustmentMutatesSourceCount: 0`

### My Flow/editor

- `sameDateGroupingAppliedForTimelineFlow: true`
- `sameDateCrossFlowAccidentalGroupCount: 0`
- `quickEditorDefaultFieldCountMax: 3`
- `advancedFieldVisibleBeforeDisclosureCount: 0`
- `structuralControlsVisibleInExecutionModeCount: 0`

### Calendar/export

- `calendarFlowFilterVisible: true`
- `calendarFilteredGridAgendaMismatchCount: 0`
- `calendarBatchMovePreviewVisible: true`
- `calendarDateMoveUndoVisible: true`
- `exportScopePreviewActualCountMismatch: 0`

### 품질

- `horizontalOverflowCount: 0`
- `fixedUiOverlapCount: 0`
- `consoleErrorCount: 0`
- `internalTermHitCount: 0`
- `observedUserSessionCount: 0` until real observation starts

---

## 11. AI가 주변 문제를 발견했을 때의 처리 규칙

오너가 요청한 `AI가 전체 틀과 디테일 문제를 발견하면 개선` 방향은 허용하되 scope creep를 막는다.

1. 지정 goal의 route와 직접 맞닿은 문제는 함께 audit한다.
2. 데이터 손실, 날짜 오류, 저장 결과 불일치, 접근성 차단은 Blocking/High로 즉시 기록한다.
3. 같은 component/contract 안의 낮은 위험 일관성 문제는 goal 안에서 수정할 수 있다.
4. 새 기능, 새로운 data ownership, 다른 route 재설계는 발견만 기록하고 별도 goal로 넘긴다.
5. 모든 추가 수정은 `왜 같은 contract인가`를 final response에 명시한다.
6. 자동 simulation을 실제 사용자 검증으로 표현하지 않는다.

각 goal은 `adjacent-findings.md` 또는 evidence audit의 `발견했지만 이번에 고치지 않은 것` 절을 유지한다.

---

## 12. 하지 말아야 할 것

- 실제 데이터 없이 `N명 검증`, 별점, 인기 item, 단계별 aggregate review 노출
- Flow Map 내부 모델을 사용자가 학습해야 하는 별도 UI로 유지
- Studio를 My Flow 개인 편집 화면으로 그대로 복사
- 모든 콘텐츠를 하나의 date list 또는 phase list로 강제
- 긴 설명으로 모호한 state/action을 보완
- foundation 정합성 전에 visual system만 통일
- 계정, DB, cloud sync, AI API, OAuth를 P26 해결책으로 추가
- public `/f`를 4탭 app shell에 편입
- source 원본을 personal edit로 덮어쓰기
- held/review-only 콘텐츠를 ordinary execution 목록에 다시 노출

---

## 13. P26 종료 조건

P26은 아래를 모두 만족해야 닫는다.

1. date intent, receipt, recurrence, memo segmentation, projection identity foundation이 green이다.
2. Home과 Flow 찾기에서 Flow/Flow Map이 하나의 사용자 객체로 읽힌다.
3. 카드가 job, source, artifact, 필요한 입력, 결과 구조를 설명문 없이 보여준다.
4. 가짜 popularity/social proof가 0이다.
5. 저장 전과 저장 후가 같은 whole-Flow outline 계약을 사용한다.
6. 그대로 시작과 내게 맞게 조정의 결과가 예측 가능하다.
7. 개인 조정에서 title/date/detail/add/delete/reorder/batch가 모드별로 발견 가능하다.
8. My Flow는 content-shape에 맞게 date/phase/section을 묶고 동일 날짜가 읽힌다.
9. Calendar는 특정 Flow 필터, undated placement, single/batch move, undo를 지원한다.
10. export whole/selected/current preview와 실제 결과가 일치한다.
11. mobile 390과 wide 1024에서 overflow, overlap, inaccessible controls가 0이다.
12. 6개 콘텐츠 모양의 current-browser journey가 통과한다.
13. observed-user evidence가 없으면 `0`으로 명시하고 상용성 검증 완료로 과장하지 않는다.

---

## 14. 남은 제품 위험

- source authority를 강조해도 실제 콘텐츠 품질과 최신성 운영이 없으면 신뢰가 오래 유지되지 않는다.
- social proof를 defer하면 초기 카드 정보가 약해 보일 수 있으므로 representative artifact preview 품질이 중요하다.
- user-facing Flow shell을 통일해도 내부 Flow Map/source-backed/public bundle adapter가 여러 개면 route parity 회귀가 생길 수 있다.
- adaptive whole-Flow view는 콘텐츠 type 판별이 부정확하면 오히려 일관성이 깨질 수 있다. 수동 override와 fixture가 필요하다.
- 조정 경로를 풍부하게 만들수록 모바일 복잡도가 다시 올라간다. mode와 disclosure 계약을 먼저 고정해야 한다.
- Calendar Flow filter가 My Flow 선택 상태와 암묵적으로 연결되면 역할이 다시 겹친다. filter state는 Calendar 안에서 명시적으로 관리한다.
- 현재 production/package/source SHA가 서로 다르므로 각 구현 goal 시작 시 current reproduction을 다시 수행해야 한다.

이 계획의 첫 실행은 `P26-00C 제품 객체·사용자 여정 의사결정`이며, correctness 구현은 `P26-01 Date intent contract`부터 병렬로 진행한다.
