# P33 — Cross-entry Canonical Flow Alignment 제안

**REVIEWER_ROLE** `claude_design` · 2026-07-24 KST · **observed-user count 0** · **앱 코드 변경 없음**
**verdict** `bounded_cross_entry_alignment` · **selectedAlternative** `B` (canonical registry + role-specific shell + one save identity)

P32 downstream workspace·4탭 IA·public `/f` shell·source/personal/run/occurrence/export identity·localStorage schema는 유지한다. discovery/detail/save identity의 **미완 rollout**만 제한적으로 닫는다. migration은 비파괴이며 스키마를 바꾸지 않는다.

## 왜 대안 B인가

- **A**(canonical /f + legacy alias)는 identity/중복은 줄이나 catalog 이중 세대·죽은 artifact 버튼·기존 중복 화해·Home 약속을 남긴다.
- **C**(broader discovery consolidation)는 P31이 확정한 Home/Find 역할 분리와 4탭 IA를 근거 없이 재오픈한다(과범위·롤백 난이도↑).
- **B**만이 P26 계약("하나의 Flow object")을 **구현**하면서 positive control(Home/Find 역할, focused workspace, /f shell, identity/persistence)을 보존하고 stage별 flag로 되돌릴 수 있다.

## 단계별 프로그램 (각 stage 독립 feature flag)

### P33-00 — canonical inventory + reconciliation 계약 (risk: none, UI 무변경)
- source URL·Flow Map ID·public slug·URL lookup·saved slug의 **alias graph → canonical Flow ID**.
- representative source별 canonical Flow table 확정.
- moving 24-item/5-item 정본을 source fidelity + user job으로 판정(관찰 입력).
- 기존 localStorage 중복 record의 **보존·병합·충돌 규칙을 fixture로 고정**, 완료·날짜·메모·personal overlay·run 기록 무손실 rollback plan.
- **완료 gate**: canonical source→Flow table · alias→canonical route table · duplicate saved fixture · no destructive migration.
- **rollback**: 계약/테이블 문서 제거.

### P33-01 — moving vertical slice (risk: medium)
- Home·Find·URL lookup의 moving entry를 하나의 canonical Flow로 연결.
- `/flow-maps/moving-d30`을 internal bundle 또는 canonical handoff로 강등.
- title·source·24/5 결정·artifact 선택·adjust·receipt를 하나로 통일.
- 두 legacy alias를 순서대로 저장해도 My Flow object 1개. 기존 개인 날짜/메모/완료/run 보존.
- **flag** `crossentry_moving_canonical` · **rollback**: alias registry/flag 제거 → legacy route 복귀, persistence fork 금지.
- **acceptance**: sameMovingSourceSavedMyFlowObjectCount=1; title/itemCount parity; `screenshots/proposed-B-canonical-save-before-390.png`, `proposed-B-receipt-myflow-390.png`, `proposed-B-detail-1024.png`.

### P33-02 — catalog rollout (risk: medium)
- 나머지 4개 `/flow-maps` catalog entry를 canonical public Flow에 연결.
- hydrated catalog ↔ server fallback inventory 일치.
- Home example이 Find에서 같은 identity로 재발견.
- Flow Map은 사용자 card/save grammar가 아니라 내부 source bundle로 유지.
- **flag** `crossentry_catalog_unify` · **rollback**: flag off → legacy catalog.
- **acceptance**: 단일 anatomy; hydrated==fallback; homeVehicleFindSearchResultCount≥1.

### P33-03 — artifact parity + promise/copy (risk: medium)
- 모든 eligible result choice가 실제 projection/CTA/save result를 바꾼다. 선택 불가 shape는 버튼으로 렌더링하지 않는다(false affordance 제거).
- Home card의 title/source/result를 target default와 정합. vehicle을 generic checklist인지 D-14 calendar인지 **하나의 job**으로 확정.
- raw recurrence rule(`FREQ=WEEKLY;BYDAY=MO,WE,FR`)을 사용자 문구("매주 월·수·금 · 시간 미정 · 계속 반복")로 projection.
- category hardcode 대신 **eligibility 기반 projection contract**(wedding grammar 일반화).
- **flag** `crossentry_artifact_parity` · **rollback**: flag off → 공통 generic body.
- **acceptance**: visible artifact choice→projection 100%; false affordance 0; raw RRULE visible false; home vehicle promise==target; `screenshots/proposed-B-result-choice-390.png`, `proposed-B-content-shape-fixes-390.png`.

### P33-04 — cross-entry regression gate (risk: low)
- Home / Find / URL lookup → detail → save → My Flow → Calendar 세 경로 + 같은 source 연속 실행.
- duplicate Flow count 0 · item count/result mismatch 0 · artifact false affordance 0 · 390/1024/1440 overflow·focus·console/page error 0.
- 필수 E2E: same source→one canonical Flow · aliases share title/count/primary artifact · saving aliases→one My Flow object · every visible artifact shape changes projection · one receipt/one storage identity · legacy alias preserves personal/run data.

### P33-05 — production closeout (risk: low)
- clean origin/main · unit/docs/build/targeted+full E2E · production deploy smoke · current route screenshot 재캡처 · **observed-user count 별도 기록**.

## 우선순위

`P33-00 → P33-01 → P33-02 → P33-03 → P33-04 → P33-05`

P33-00 승인 전에는 slug 삭제·localStorage merge·redirect를 바로 구현하지 않는다.

## reconciliation 최소 UI (P33-01 동반)

기존 중복 보유자에게만 노출: **이어서 실행** / **하나로 합치기**(canonical Flow로 통합, 각 항목 개인 날짜·메모·완료·run 보존) / **따로 유지**. 자동 병합·삭제·redirect 금지, 명시적 미리보기만. (`review.dc.html` ⑥ 참조.)

## 관찰(사용자 스터디)이 먼저 답해야 할 질문

1. 24-item과 5-item 이사 Flow를 같은 원문으로 인식하는가? canonical 정본은 24(전체)인가 5(핵심)인가?
2. 예시 Calendar와 '날짜 없이 시작'을 동시에 보면 저장 결과를 예측하는가?
3. Home 차량 카드를 보고 법정검사 D-14를 기대하는가, 상시 체크리스트를 기대하는가?
4. 중복 발생 시 이어서/합치기/따로를 판단할 수 있고 '합치기'를 안전하다고 느끼는가?
5. Home과 Find 역할 차이가 유용한가, 중복으로 느끼는가?
6. 'Home 예시와 동일 Flow' 같은 연결 문구가 재발견을 돕는가?

> 이 프로그램은 설계 제안이다. 어떤 stage도 observed-user 게이트를 통과하기 전엔 "검증됨"으로 표기하지 않는다. 가짜 social proof 없음. 위치 실험 프로토타입은 `가상 데이터 - production 금지` 표시.
