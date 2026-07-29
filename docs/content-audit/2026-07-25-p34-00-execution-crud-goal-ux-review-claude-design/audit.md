# FlowMe P34-00 UX / CRUD Audit

## Overall verdict

`bounded_crud_revision`

P33의 canonical identity 정렬을 보존하고, source/personal/run/occurrence/export 계약을 다시 쓰지 않는다. P34는 lifecycle 발견성, 공통 명령 문법, 저장 전 조정, Item detail, Calendar keyboard, recurrence hierarchy, export scope를 함께 다듬는 범위로 제한한다.

## Blocking

### B-01. P32 production의 moving 저장 단위가 진입점마다 다르다

- surfaceVersion: `production_p32`
- route: `/flows`, `/f/moving-d30-basic`, `/flow-maps/moving-d30`
- viewport: `390x844`, `1024x768`
- 시작 상태: localStorage 초기화
- 재현:
  1. Production `/flows`의 이사 카드를 확인한다.
  2. 같은 카드의 public 상세를 열거나 `/f/moving-d30-basic`으로 이동한다.
  3. card count와 public Flow count를 비교한다.
- 기대: 같은 source/job/variant는 모든 surface에서 같은 제목, 24개 Item, 같은 canonical identity를 읽는다.
- 실제: Production P32의 Find card는 5개로 보이고 direct public Flow는 24개다.
- 사용자 영향: 저장 전에 본 단위와 저장 후 단위를 신뢰하기 어렵고, 5개 간단판과 24개 전체판의 관계를 오해할 수 있다.
- evidenceKind: `current_production_interaction`, `current_package_screenshot`, `current_source`
- P33 상태: local source에서는 Find가 24개로 정렬되고 legacy map이 canonical public route로 307 redirect된다. P33 Preview interaction은 인증 때문에 `inaccessible`.
- 권장 변경: 새 P34 설계로 해결하지 말고 P33 publish/smoke gate로 닫는다.
- acceptance marker:
  - `P33-PRODUCTION-CANONICAL-MOVING-24`
  - production `/flows` card, `/f`, receipt, My Flow, Calendar, export가 모두 24개
  - legacy 5개 개인 사본은 자동 병합/삭제되지 않음

## High

### H-01. Flow 삭제 lifecycle은 안전하지만 활성 Flow에서 경로를 예측할 수 없다

- surfaceVersion: `shared`
- route: `/my?view=flows`
- viewport: `390x844`, `1024x768`
- 시작 상태: 저장된 active Flow 1개
- 재현:
  1. My Flow `Flow 목록`을 연다.
  2. Flow row를 연다.
  3. workspace의 `⋯`을 연다.
  4. `보관`을 실행한다.
  5. 목록으로 돌아가 `보관된 Flow 보기` 또는 `보관됨` 필터를 연다.
  6. archived row의 두 번째 `⋯`에서 `이 기기에서 영구 삭제`를 연다.
- 기대: 첫 관리 진입에서 보관, 복구 위치, 영구 삭제 조건을 예측할 수 있다.
- 실제: active 메뉴에는 `원문 보기`, `보관`만 있다. 영구 삭제가 보관 후에 나타난다는 단서가 없다.
- 사용자 영향: 삭제 기능이 없다고 판단하거나, 보관이 삭제인지 모른 채 실행할 수 있다.
- evidenceKind: `current_production_interaction`, `current_source`, `current_package_screenshot`
- source: `components/flow/AppClient.tsx`의 management menu, archived direct restore, permanent delete dialog. `lib/flow/storage.ts`의 permanent delete는 published source를 보존하고 personal state만 제거한다.
- 권장 변경: `⋯`을 `Flow 관리` bottom sheet/menu로 통일한다. active 상태에서 `보관` 아래에 한 줄로 `보관함에서 복구하거나 영구 삭제할 수 있습니다`를 보여준다. 별도 카드나 장문 설명은 추가하지 않는다.
- acceptance marker:
  - `P34-01-ACTIVE-LIFECYCLE-PREDICTABLE`
  - `P34-01-ARCHIVED-DIRECT-RESTORE`
  - `P34-01-PERMANENT-DELETE-SOURCE-PRESERVED`

### H-02. 의미가 다른 CRUD는 분리됐지만 명령 문법과 위치가 surface마다 달라 학습이 누적되지 않는다

- surfaceVersion: `shared`
- route: public `/f/*`, receipt, `/my`, `/calendar`
- viewport: `390x844`, `1024x768`
- 시작 상태: source-backed Flow, personal draft, routine 각각 1개
- 재현:
  1. public의 `조정`, receipt의 `내 Flow에서 시작`, My Flow의 `Flow 조정`, `구성 편집`/`여러 할 일 조정`을 비교한다.
  2. Item의 `항목 삭제`, `Flow에서 제외`, `건너뛰기`, `보류`, `완료`, `다시 열기` 위치를 비교한다.
  3. export의 `Flow 가져가기`, `가져가기`, `현재 항목 가져가기`를 비교한다.
- 기대: object와 scope가 action 이름에 들어가며, 같은 명령은 같은 placement와 feedback을 사용한다.
- 실제: 데이터 의미는 분리되어 있으나 entry와 naming이 화면별로 다르다.
- 사용자 영향: 제외를 삭제로, 보관을 완료로, 가져가기를 저장으로 오해할 수 있다.
- evidenceKind: `current_source`, `current_production_interaction`, `heuristic_simulation`
- 권장 변경: `Flow 관리`, `Flow 조정`, `항목 수정`, `완료/다시 열기`, `날짜 배치/날짜 제거`, `전체 N개 가져가기/선택 N개 가져가기/이 항목 가져가기`를 shared command grammar로 고정한다.
- acceptance marker: `P34-02-SHARED-COMMAND-GRAMMAR`

### H-03. 저장 전 조정은 실제 결과보다 설정 분류와 긴 Item 목록을 먼저 보게 한다

- surfaceVersion: `production_p32`, `p33_preview`는 inaccessible
- route: `/f/moving-d30-basic`, `/f/curated-allblanc-morning-workout`
- viewport: `390x844`
- 시작 상태: 새 방문자
- 재현:
  1. moving에서 전체 결과와 anchor control을 본다.
  2. `조정`을 연다.
  3. 4개 mode와 24개 adjustment row를 확인한다.
  4. workout에서 날짜, artifact 3개, repeat 설정을 연다.
- 기대: 사용자는 먼저 저장 결과를 보고, 바꾸려는 Item을 직접 선택해 before/after를 확인한다.
- 실제: moving은 `항목 고르기/날짜/제목·메모/순서` 4개 분류가 먼저 나오고, workout은 artifact, date intent, repeat form이 한 긴 문서에 이어진다.
- 사용자 영향: 기능은 많지만 처음 저장할 때 무엇이 필수인지 판단하기 어렵다.
- evidenceKind: `current_production_interaction`, `current_package_screenshot`, `current_source`
- P33 차이: local source에서 moving CTA가 `캘린더 24개로 시작`으로 개선됐지만 Preview interaction은 확인하지 못했다.
- 권장 변경: actual artifact outline을 primary surface로 유지하고 `바꿀 항목 선택 -> 해당 row 직접 수정 -> 저장 결과 diff` 순으로 전환한다. batch mode는 secondary command로 둔다.
- acceptance marker:
  - `P34-03-ARTIFACT-FIRST-ADJUSTMENT`
  - 390px first useful preview 전 필수 입력 0~1개
  - first viewport competing primary action 1개 이하

### H-04. Calendar 월 grid가 모든 날짜를 Tab stop으로 만들어 핵심 실행 영역까지의 키보드 깊이가 과하다

- surfaceVersion: `production_p32`
- route: `/calendar?demo=ux20`
- viewport: `390x844`, `1024x768`
- 시작 상태: 20 Flow fixture, 월 보기
- 재현:
  1. header부터 Tab으로 이동한다.
  2. Flow scope와 month picker를 지난다.
  3. selected-day agenda 또는 날짜 없는 queue에 도달한다.
- 기대: calendar grid는 하나의 Tab stop으로 진입하고 화살표 키로 날짜를 이동한다. agenda와 queue는 예측 가능한 다음 landmark다.
- 실제: 각 날짜 버튼이 연속 Tab stop이다. mobile에서 42개 안팎의 날짜를 지나야 다음 workspace에 도달한다.
- 사용자 영향: 키보드와 스위치 사용자가 selected day, 날짜 없는 Item, export에 실질적으로 접근하기 어렵다.
- evidenceKind: `current_production_interaction`, `current_source`, `reference_pattern`
- 권장 변경: WAI-ARIA grid에 맞춘 roving tabindex, arrow/Home/End/PageUp/PageDown 이동, 선택 후 agenda heading focus, mobile detail sheet의 focus return을 적용한다.
- acceptance marker:
  - `P34-05-CALENDAR-ROVING-GRID`
  - header에서 selected-day agenda까지 Tab stop 12개 이하
  - 42개 날짜 중 DOM tabindex=0은 1개

### H-05. 개인 초안은 실제 5개 Item을 만들지만 첫 draft 화면에서 43개 조작과 1,757px 문서가 발생한다

- surfaceVersion: `production_p32`
- route: `/flows`
- viewport: `390x844`
- 시작 상태: localStorage 초기화
- 입력: `8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인`
- 재현:
  1. 메모를 입력하고 `Flow 찾기`를 누른다.
  2. 5개 분할 결과를 확인한다.
  3. 각 row의 include, title, up/down, split/merge를 본다.
- 기대: 5개 결과를 먼저 읽고, 필요한 row만 직접 고친다.
- 실제: parsing 결과는 정확하지만 모든 row에 구조 조작을 노출해 interactive control 43개, 문서 높이 1,757px가 된다.
- 사용자 영향: 간단한 메모 저장이 mini editor처럼 느껴지고, 저장 전에 반드시 전체 구조를 고쳐야 한다고 오해한다.
- evidenceKind: `current_production_interaction`
- 권장 변경: 기본 row는 include + title만 보여주고 reorder/split/merge는 `구조 편집` mode에서만 노출한다. first date는 preview 후 optional로 묻는다.
- acceptance marker: `P34-04-DRAFT-PREVIEW-FIRST`

## Medium

### M-01. Item detail은 bottom sheet로 개선됐지만 실행, 수정, 메모, export가 서로 다른 disclosure에 흩어진다

- surfaceVersion: `shared`
- route: `/my`, `/calendar`
- viewport: `390x844`
- 시작 상태: 저장된 Flow의 Item detail
- 기대: 같은 sheet에서 완료, 빠른 수정, 메모, 가져가기의 우선순위를 즉시 이해한다.
- 실제: `할 일 수정`, 실행 메모의 `메모`, `메모·일정`, `현재 항목 가져가기`가 여러 disclosure로 나뉜다.
- 사용자 영향: Item 상세를 열어도 다음 action을 다시 탐색해야 한다.
- evidenceKind: `current_production_interaction`, `current_package_screenshot`, `current_source`
- 권장 변경: sheet header에 완료 control과 `수정`을 두고, body는 제목/날짜/메모 quick fields, `세부 일정` disclosure, footer `이 항목 가져가기`로 고정한다.
- acceptance marker: `P34-04-ITEM-SHEET-ONE-GRAMMAR`

### M-02. recurrence 기능은 완전하지만 public 설정과 run 조정이 한 번에 너무 많은 개념을 노출한다

- surfaceVersion: `shared`
- route: `/f/curated-allblanc-morning-workout`, `/my`, `/calendar`
- viewport: `390x844`, `1024x768`
- 기대: `월·수·금 07:30, 8회` summary를 먼저 보고 필요할 때 series 또는 이번 회차를 수정한다.
- 실제: public 화면에서 시작일, date intent, next dates, weekdays, time, end mode, count가 길게 이어지고, 저장 후에는 occurrence detail 안에서 scope를 다시 선택한다.
- 사용자 영향: 반복 규칙을 설정하는 것과 이번 운동을 실행하는 것이 같은 과업처럼 느껴진다.
- evidenceKind: `current_package_screenshot`, `current_source`, `reference_pattern`
- 권장 변경: summary-first, `반복 일정 조정` sheet, occurrence detail의 `이번 회차만` quick edit를 분리한다.
- acceptance marker: `P34-06-SERIES-OCCURRENCE-HIERARCHY`

### M-03. export scope 계약은 정확하지만 진입 이름과 preview 순서가 일관되지 않다

- surfaceVersion: `shared`
- route: public `/f/*`, receipt, `/my`, Item detail
- viewport: `390x844`, `1024x768`
- 기대: scope와 count를 먼저 고르고, 실제 포함/제외 결과를 보고 destination을 선택한다.
- 실제: public은 artifact를 먼저, My Flow는 `가져가기`, Item detail은 `현재 항목 가져가기 · 1개`로 시작한다. scope/count 계약은 source와 unit test에서 유지된다.
- 사용자 영향: export 전에 whole/selected/current 중 무엇이 나가는지 예측하기 어렵다.
- evidenceKind: `current_source`, `current_package_screenshot`
- 권장 변경: 모든 entry에서 `범위 -> N개 preview -> 형식/도구 -> receipt` 순서를 공유한다.
- acceptance marker: `P34-07-SCOPE-FIRST-EXPORT`

### M-04. My Flow lifecycle 조작은 library, focused workspace, archived filter에 분산돼 있다

- surfaceVersion: `shared`
- route: `/my?view=flows`
- viewport: `390x844`, `1024x768`
- 기대: library row와 focused workspace가 동일한 management entry를 제공하고 archived state가 같은 자리에서 이어진다.
- 실제: mobile은 row를 연 뒤 workspace `⋯`, wide는 rail/detail의 서로 다른 overflow를 사용한다. 보관 후 별도 filter로 이동해야 한다.
- 사용자 영향: 화면 폭이 바뀌면 같은 Flow 관리 방법을 다시 배워야 한다.
- evidenceKind: `current_source`, `current_package_screenshot`, `heuristic_simulation`
- 권장 변경: mobile/wide 모두 `Flow 관리` command model과 action order를 공유한다.
- acceptance marker: `P34-01-CROSS-VIEW-LIFECYCLE-PARITY`

## Low

### L-01. Home과 Flow 찾기의 제품 역할 차이가 여전히 약하다

- surfaceVersion: `shared`
- route: `/`, `/flows`
- viewport: `390x844`
- 기대: Home은 “Flow가 어떻게 쓰이는지”를 보여주고 Find는 검색/비교를 담당한다.
- 실제: 두 화면 모두 URL/메모와 사례 진입을 제공해 목적이 겹친다.
- 사용자 영향: 치명적이지 않지만 첫 방문자의 navigation 학습이 느려진다.
- evidenceKind: `current_production_interaction`, `heuristic_simulation`
- 권장 변경: P34 CRUD scope에서는 보류한다. Home은 사용 장면과 최근 내 실행 resume에 집중하고 catalog/검색은 Find에 유지하는 후속 bounded review만 허용한다.
- acceptance marker: `DEFER-HOME-FIND-ROLE`

### L-02. Calendar compact event label은 Flow가 많을 때 의미를 잃지만 detail sheet가 복구한다

- surfaceVersion: `shared`
- route: `/calendar?demo=ux20`
- viewport: `1024x768`, `1440x900`
- 기대: compact row에서도 Flow와 Item을 구분할 최소 identity가 남는다.
- 실제: 긴 제목은 `컴퓨터활용능력...`처럼 잘리며 color/icon에 의존한다. selected-day agenda와 sheet에서는 전체 제목을 확인할 수 있다.
- 사용자 영향: 한 달 overview scan이 느려지나 실행은 막히지 않는다.
- evidenceKind: `current_package_screenshot`, `heuristic_simulation`
- 권장 변경: compact label을 `[Flow short label] Item short title` 규칙으로 고정하고 full accessible name/title을 유지한다.
- acceptance marker: `P34-05-COMPACT-IDENTITY`

## Rubric

| Dimension | 1~5 | 근거 |
| --- | ---: | --- |
| User Need Fit | 4.0 | source content를 실행 artifact로 바꾸고 외부 이동시키는 job이 분명하다. |
| Execution Clarity | 3.0 | next action은 존재하지만 lifecycle/edit/export entry가 분산된다. |
| Content Fidelity | 4.0 | source-backed Flow와 sourceTrace, canonical variant를 보존한다. |
| Portability | 4.0 | Calendar/checklist/sheet/memo와 whole/selected/current 범위가 있다. |
| Cognitive Load | 2.5 | 저장 전 24 Item 조정, 5 Item draft 43 controls, recurrence form이 무겁다. |
| Copy Specificity | 3.0 | count가 있는 action은 좋지만 `조정`, `가져가기`, `보관`의 후속 결과가 불충분하다. |
| Source/Safety | 4.0 | source와 personal overlay가 분리되고 sensitive Flow의 source가 유지된다. |
| Accessibility/Operability | 3.0 | accessible name/overflow/error는 양호하나 Calendar Tab 깊이가 크다. |

이 점수는 heuristic/automated review이며 실제 사용자 검증이 아니다.

## Correctness / UX / Visual / Contract 분리

| 분류 | 현재 판단 | P34 처리 |
| --- | --- | --- |
| Correctness | P32 moving cross-entry count mismatch만 release blocker. P33 source에서 수정됨 | P33 publish/smoke로 닫음 |
| UX structure | lifecycle, adjustment, Item detail, Calendar keyboard, recurrence, export scope hierarchy가 핵심 gap | P34-01~07 |
| Visual polish | spacing/color/border만 바꿔서는 해결되지 않음 | 각 structural slice 이후 제한적으로 적용 |
| Data contract | source/personal/run/occurrence/export 분리는 안정적 | 보존, migration 없음 |
| Goal data | 독립 Goal 객체 없음 | A 유지. B/C 구현 안 함 |

## 실제 사용자에게만 확인 가능한 질문

1. 사용자는 active Flow의 `보관`을 삭제, 숨김, 완료 중 무엇으로 예상하는가?
2. source Item의 `Flow에서 제외`와 personal Item의 `항목 삭제` 차이를 설명 없이 이해하는가?
3. moving 24개에서 artifact preview 후 실제로 몇 개 Item을 저장 전에 수정하는가?
4. 날짜 없는 Item을 My Flow에서 실행할지 Calendar에 배치할지 어떤 기준으로 결정하는가?
5. routine 사용자는 반복 전체와 이번 회차 수정을 언제 구분해 찾는가?
6. export에서 사용자가 가장 먼저 확인하는 것은 범위, 형식, 목적지 중 무엇인가?
7. long-running study Flow에서 별도 Goal 없이 progress와 다음 action만으로 충분한가?

observed-user count: 0.
