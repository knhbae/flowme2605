# FlowMe cross-entry canonical independent review

## Overall verdict

**canonical_flow_contract_reopen**

P32의 focused My Flow와 Calendar 실행 계약은 유지할 수 있다. 그러나 upstream에서 같은 AJD 이사 원문과 같은 D-30 사용자 job이 Home, Find, URL lookup, direct alias에서 하나의 Flow로 이어지지 않는다. 현재는 4개 route, 3개 saved slug, 24/5/5/5 item snapshot이 공존한다.

이 판정은 production interaction, current source, screenshot, heuristic simulation에 근거한다. 실제 관찰 사용자 수는 **0명**이다.

## Blocking

앱 crash, data corruption, horizontal overflow, console/page error 형태의 Blocking finding은 재현되지 않았다. 다만 기존 데이터 자동 병합은 item cardinality가 맞지 않으므로 **구현 차단 조건**으로 취급해야 한다.

## High

### HIGH-01 같은 source/job이 네 route, 세 save identity, 24/5 item snapshot으로 갈린다.

- Route: `/, /flows, /flow-maps/moving-d30, /f/moving-d30-basic, /f/curated-ajd-moving-d30, /f/source-backed-moving-d30`
- Viewport: 390, 1024
- 재현: Home, Find, AJD URL lookup, direct alias에서 title/count/save key를 비교한다.
- 기대: entry role이 달라도 one canonicalFlowId와 one saved object
- 실제: canonicalFlowId가 없고 3개 slug key로 분기
- 사용자 영향: 이미 저장했는지 알 수 없고 My Flow/Calendar/export 중복이 생긴다.
- evidenceKind: `current_production_interaction + current_source`
- 권장 변경: B안 canonical registry와 role-specific shell
- acceptance marker: `P33-CROSS-ENTRY-INVARIANT`

### HIGH-02 기존 24개/5개 개인 상태는 자동 병합할 수 없는데 reconciliation이 없다.

- Route: `/my, /calendar`
- Viewport: 390, 1024
- 재현: Home와 Find 이사 Flow를 차례로 저장하고 한쪽 완료·날짜 변경 후 비교한다.
- 기대: 중복 감지, 차이 비교, 대표 선택, 비파괴 보관
- 실제: 별도 행과 projection만 생성되고 개별 archive/delete 외 source-level 정리 수단이 없다.
- 사용자 영향: 자동 merge는 memo/completion/date/export selection을 잃을 수 있고 수동 삭제도 불안하다.
- evidenceKind: `current_production_interaction + current_source`
- 권장 변경: dual-read 후 explicit active-copy selection; 24↔5 auto-merge 금지
- acceptance marker: `P33-NO-AUTO-MERGE`

### HIGH-03 moving/vehicle의 visible Checklist control이 false affordance다.

- Route: `/f/moving-d30-basic, /f/vehicle-inspection-prep`
- Viewport: 390
- 재현: Calendar selected 상태에서 Checklist를 누르고 selected shape, preview, CTA를 비교한다.
- 기대: Checklist projection과 count-based CTA로 변경
- 실제: Calendar 상태가 유지된다. wedding/workout에서는 같은 control이 작동한다.
- 사용자 영향: 사용자는 저장될 결과를 잘못 예측한다.
- evidenceKind: `current_production_interaction + current_source`
- 권장 변경: category hardcode 제거, eligibility 기반 handler 또는 unsupported control 숨김
- acceptance marker: `P33-ARTIFACT-CONTROL`

### HIGH-04 Home vehicle promise, detail 기본 결과, Find 재발견이 하나의 job으로 이어지지 않는다.

- Route: `/ -> /f/vehicle-inspection-prep -> /flows`
- Viewport: 390
- 재현: Home card 문구를 읽고 target artifact 확인 후 차량 점검/자동차검사로 검색한다.
- 기대: 필요할 때 Checklist promise와 동일 target/saved signal
- 실제: D-14 Calendar가 기본이고 Find hydrated inventory에 canonical card가 없다.
- 사용자 영향: 첫 기대가 깨지고 저장한 콘텐츠를 다시 찾기 어렵다.
- evidenceKind: `current_production_interaction + current_source`
- 권장 변경: entry promise 계약과 canonical inventory를 같은 registry에서 생성
- acceptance marker: `P33-ENTRY-PROMISE-PARITY`

## Medium

### MED-01 Find의 legacy map과 current public detail/receipt가 다른 화면 문법을 쓴다.

- Route: `/flows, /flow-maps/*, /f/*`
- Viewport: 390, 1024, 1440
- 재현: catalog 앞 5개와 뒤 4개 detail 및 저장 후 화면을 비교한다.
- 기대: entry context는 달라도 Flow anatomy와 receipt action은 동일
- 실제: legacy map shell과 public artifact-first shell, 두 receipt grammar가 공존한다.
- 사용자 영향: 콘텐츠 차이보다 시스템 세대 차이가 먼저 보인다.
- evidenceKind: `current_production_interaction + current_package_screenshot`
- 권장 변경: canonical detail/receipt anatomy 공유, map은 internal bundle 또는 alias로 제한
- acceptance marker: `P33-RECEIPT-PARITY`

### MED-02 반복 규칙의 raw RRULE이 My Flow 사용자 문구로 노출된다.

- Route: `/f/curated-allblanc-morning-workout -> /my`
- Viewport: 390
- 재현: 날짜 없이 저장하고 focused Flow workspace를 연다.
- 기대: 월·수·금 반복처럼 사람이 읽는 summary
- 실제: FREQ=WEEKLY;BYDAY=MO,WE,FR
- 사용자 영향: 데이터 모델이 UI로 새고 반복 설정 신뢰를 낮춘다.
- evidenceKind: `current_production_interaction + current_source`
- 권장 변경: display adapter만 수정하고 occurrence identity는 유지
- acceptance marker: `P33-RRULE-DISPLAY`

### MED-03 legacy detail의 focus/accessible-name 문법이 public shell과 다르다.

- Route: `/flow-maps/moving-d30, /f/moving-d30-basic`
- Viewport: 390, 1024
- 재현: keyboard-only로 summary, source link, fixed action을 순회한다.
- 기대: 같은 역할 control의 동일 semantic name과 focus return
- 실제: 일부 summary/link가 unnamed로 잡히고 중첩 interaction 순서가 다르다.
- 사용자 영향: 키보드 사용자는 같은 Flow 과업을 route마다 다시 학습한다.
- evidenceKind: `current_production_interaction + heuristic_simulation`
- 권장 변경: shared semantic anatomy와 explicit accessible name/focus return
- acceptance marker: `P33-A11Y-CROSS-ENTRY`

## Low

### LOW-01 예시 날짜와 '날짜 없이 시작' CTA의 관계는 설명 없이 즉시 명확하지 않을 수 있다.

- Route: `/f/moving-d30-basic`
- Viewport: 390
- 재현: anchor 입력 전 Calendar 예시와 primary CTA를 함께 읽는다.
- 기대: 예시와 실제 저장 상태가 시각적으로 구분
- 실제: 예시 날짜가 먼저 보이는 동안 CTA는 날짜 없이 시작을 제안한다.
- 사용자 영향: 실제 사용자 오해 여부는 아직 확인되지 않았다.
- evidenceKind: `heuristic_simulation`
- 권장 변경: 예시 badge와 anchor-required transition을 직접 조작으로 구분; 설명문 증가는 피함
- acceptance marker: `P33-EXAMPLE-DATE-STATE`


## 기존 가설 재판정

| ID | 판정 | 현재 production 재판정 |
|---|---|---|
| H1 | **confirmed** | 같은 AJD 원문이 네 사용자 route와 24/5/5/5 item snapshot으로 노출된다. |
| H2 | **confirmed** | Home 24개와 Find 5개를 저장하면 서로 다른 saved key와 My Flow 행이 생긴다. |
| H3 | **confirmed** | hydrated catalog 9개 중 앞 5개는 /flow-maps, 뒤 4개는 /f로 연결된다. |
| H4 | **confirmed** | moving/vehicle Checklist 선택은 state를 바꾸지 않고 wedding/workout은 바꾼다. category-gated handler와 controlled component 조합이 원인이다. |
| H5 | **confirmed** | Home은 필요할 때 Checklist를 약속하지만 target은 D-14 Calendar 10개가 기본이다. |
| H6 | **confirmed** | 현재 hydrated catalog에는 vehicle-inspection-prep이 없고 차량 점검/자동차검사 검색으로 canonical target을 재발견하지 못했다. server-to-hydration flicker는 재현되지 않았다. |
| H7 | **confirmed** | 날짜 없이 저장한 focused My Flow에 raw RRULE이 표시된다. Calendar에는 raw 문자열이 표시되지 않는다. |

## Source와 storage graph

- Home: `moving-d30-basic` 24개
- Find map: `moving-d30` → `source-backed-moving-d30` 5개
- URL lookup: `curated-ajd-moving-d30` 5개
- Direct alias: `source-backed-moving-d30` 5개
- 현재 canonicalFlowId: 없음
- 새 저장 key: slug 단위
- 같은 slug 반복 저장: 한 key 갱신
- 다른 alias 저장: 별도 My Flow object

Source URL만으로 합치면 안 된다. 기준은 `source identity + user job + intentional editorial variant`여야 한다. 현재 24개와 5개는 intentional variant label이 없으므로 사용자에게는 alias inconsistency로 보인다.

## Current source pointers

- `docs/DECISIONS.md:122-126`: Home, Flow finding, save-before, post-save, My Flow, Calendar, export에서 one user-facing Flow를 쓰고 Flow Map은 internal bundle로 둔다는 현재 결정
- `components/flow/AppClient.tsx:3290-3307`: Home의 moving, vehicle, workout entry
- `lib/flow/seed-flows.ts:2854-3000`, `lib/flow/seed-flows.ts:3493`: 24-item public moving bundle
- `lib/flow/source-backed-my-flow.ts:535-539`: map saved/persistence key가 mapId에 묶임
- `lib/flow/source-backed-curated-260630.ts:217-225`, `lib/flow/source-backed-curated-260630.ts:873-910`: curated AJD 5-item variant와 discovery 숨김 정책
- `lib/flow/url-first-lookup.ts:335-337`: AJD URL lookup이 curated map/slug로 고정됨
- `lib/flow/storage.ts:62-63`, `lib/flow/storage.ts:511-543`: saved Flow record가 slug key에 묶임
- `components/flow/AppClient.tsx:18757-18760`, `components/flow/AppClient.tsx:19592-19596`: artifact change handler가 특정 category에만 연결됨
- `components/flow/FlowArtifactDataPreview.tsx:206-289`: controlled selected shape가 parent handler 없이는 원래 값으로 돌아감

## Current test gap

현재 관련 E2E는 public save-before, source-backed map, My Flow, Calendar를 각각 검증한다. 하지만 같은 source를 Home→Find→URL lookup으로 이동하며 title/count/save identity가 하나인지 확인하는 invariant test가 없다. 그래서 각 화면은 통과하면서 cross-entry journey는 실패할 수 있다.
