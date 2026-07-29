# Cross-entry Canonical Flow — 상세 Audit

**REVIEWER_ROLE** `claude_design` · **reviewedAt** 2026-07-24 KST
**production** https://flowme2605.vercel.app · **originMainSha** `e491d99` · **productionReleaseSha** `30281a7`
**overall verdict** `bounded_cross_entry_alignment` · **추천 대안 B** · **앱 코드 변경 없음** · **observed-user count 0**

> 이 판정은 cross-entry audit handoff의 current production 화면 8장(390px) + GitHub review branch source(AppClient, FlowArtifactDataPreview, storage, url-first-lookup, flows/page 등 manifest) + current 제품 결정(DECISIONS.md P26~P32) + route-evidence 마커 + reference app 현행 문서를 근거로 한 **설계 검토**다. 이 검토에서 라이브 production interaction/console/스크린리더/1024 overflow 실측은 직접 수행하지 않았고 해당 항목은 `inaccessible`로 표기했다. 기존 audit 수치를 그대로 복사하지 않고 재판정했다.

## 1. 범위와 방법

확인 route(화면·source 기준): `/`, `/flows`, `/f/moving-d30-basic`, `/flow-maps/moving-d30`, `/f/curated-ajd-moving-d30`, `/f/source-backed-moving-d30`, `/f/vehicle-inspection-prep`, `/f/curated-wedding-naver-timeline`, `/f/curated-wedding-gongysd-atoz`, `/f/curated-allblanc-morning-workout`, `/my?view=flows`, `/calendar`.

각 route에서 title, source, item count, primary/secondary artifact, shell, save action, adjust, receipt, storage key, My Flow row, Calendar occurrence, projection parity를 비교했다.

**Evidence kind**: `current_package_screenshot`, `current_source`, `prior_release_evidence`, `reference_pattern`, `heuristic_simulation`, `inaccessible`.

## 2. Overall verdict

**`bounded_cross_entry_alignment`.** 6/6 가설이 재현되어 `audit_not_reproduced`는 기각. 그러나 **P26(2026-07-20)이 이미 "Home·Flow finding·save-before·post-save·My Flow·Calendar·export에서 하나의 사용자 Flow object를 쓰고 Flow Map은 내부 bundle로 둔다"를 확정**했다. 따라서 `canonical_flow_contract_reopen`은 불필요(계약은 존재, 미구현일 뿐)하고, `broader_discovery_experience_reopen`은 P31이 확정한 Home/Find 역할 분리·4탭 IA를 근거 없이 흔들어 과범위다.

유일한 신규 데이터 결정: **moving의 canonical 정본이 24개(전체)인지 5개(핵심)인지**와 **기존 중복 저장본의 비파괴 reconciliation 규칙**. 이는 alignment 내부의 bounded 결정이며 계약 반전이 아니다.

## 3. 가설 재판정 (confirmed / reframed / rejected / inaccessible)

### H1 · confirmed(+reframed) — 같은 AJD 이사 원문이 4 사용자 route로 분기

- **route**: Home→`/f/moving-d30-basic`(24, 이사 D-30 준비), Find→`/flow-maps/moving-d30`(5, 원룸 이사 D-30 일정), URL→`/f/curated-ajd-moving-d30`(5), alias→`/f/source-backed-moving-d30`(5)
- **viewport**: 390x844
- **근거**: 화면 03·04에서 제목·항목 수·shell(share vs 4탭)·CTA(검은 '날짜 없이 시작' vs 파란 '그대로 시작')가 모두 다름. route-evidence sameMovingSourceUserFacingRouteCount=4, distinctItemCounts=[5,24].
- **reframe**: route가 여러 개인 것 자체가 아니라 **route마다 canonical content(제목/개수/artifact/저장 identity)가 다른 것**이 결함. 역할별 shell은 유지 가능.
- **DECISIONS 충돌**: P26 "one user-facing Flow object" 위반.
- **evidenceKind**: current_package_screenshot, current_source, heuristic_simulation

### H2 · confirmed — 두 entry 저장 시 My Flow 중복 객체

- **route**: `/my?view=flows` · **viewport**: 390x844
- **근거**: 화면 05에 「이사 준비 0/24」+「원룸 이사 준비 0/5」 공존. storage key도 `flow:saved:moving-d30-basic` vs `flow:map:saved:moving-d30`로 분리. 완료·날짜·메모가 이어지지 않음.
- **evidenceKind**: current_package_screenshot, current_source, heuristic_simulation

### H3 · confirmed — 한 catalog에 legacy와 artifact-first 세대 혼재

- **route**: `/flows`(9 hydrated card) · **viewport**: 390x844
- **근거**: route-evidence findCatalog — legacy Flow Map 5(`/flow-maps/*`, hybrid, receipt 없음) + current public 4(`/f/*`, p29-artifact-first, receipt 있음). 화면 02의 첫 카드가 legacy. 같은 목록에서 무엇을 누르냐에 따라 상세·조정·저장 후 이동이 달라짐. 기존 E2E는 `P30-LEGACY-COMPOSITION-ACTIVE`를 명시 허용 → 회귀가 아니라 미완 rollout gap.
- **evidenceKind**: current_source, current_package_screenshot

### H4 · confirmed(+reframed) — artifact 선택이 일부 category에서만 작동

- **route**: `/f/moving-d30-basic`, `/f/vehicle-inspection-prep` vs `/f/curated-wedding-*` · **viewport**: 390x844
- **근거**: wedding(07)은 3-way(캘린더/체크리스트/메모) 토글 작동 + CTA '캘린더 6개로 시작'으로 선택 반영. moving(03)·vehicle(06)은 토글이 보이지만 CTA '날짜 없이 시작' 고정. source상 `FlowArtifactDataPreview`는 controlled `selectedShape`를 우선하고 `AppClient`가 모든 public route에 넘기지만, change handler는 결혼/운동/러닝 category에만 연결.
- **reframe**: category 문제가 아니라 **change handler가 일부 category에만 연결된 false affordance**. eligible shape를 버튼으로 보이게 하고 선택은 일부만 허용.
- **evidenceKind**: current_package_screenshot, current_source, heuristic_simulation

### H5 · confirmed — Home 차량 약속과 target 불일치

- **route**: `/`→`/f/vehicle-inspection-prep` · **viewport**: 390x844
- **근거**: Home(01) "차량 점검표를 내 체크리스트로 · Checklist · 필요할 때 실행" vs target(06) "자동차검사 D-14 준비 · 원문 TS한국교통안전공단 · 검사일 · 캘린더 10개". job(상시 점검 vs 법정검사 기한)과 기본 artifact(checklist vs calendar)가 모두 어긋남. 게다가 checklist 토글이 죽어 약속 결과로 복귀 불가.
- **추가**: `/flows`에서 '차량/차량 점검/자동차검사' 검색 0건. `app/flows/page.tsx` server fallback엔 vehicle이 있으나 hydrated catalog엔 없음(inventory 불일치).
- **evidenceKind**: current_package_screenshot, current_source, heuristic_simulation

### H6 · confirmed(경미) — undated workout My Flow에 raw RRULE

- **route**: `/my` (focused workspace) · **viewport**: 390x844
- **근거**: 화면 08에 「FREQ=WEEKLY;BYDAY=MO,WE,FR」 노출.
- **reframe**: 계산은 정상(custom date 저장 시 Calendar occurrence 월27/29/31 생성). **display adapter 누락**에 가까운 낮은 심각도. → 사용자 문구 projection으로 해소.
- **evidenceKind**: current_package_screenshot, current_source

## 4. 잘 된 부분 (positive control)

- 결혼 timeline과 4-item sheet가 별도 entry로 분리되어 있고 artifact 선택이 실제 작동한다.
- 운동 Flow의 recurrence summary·다음 3회차·Calendar occurrence가 작동한다.
- **P32 focused My Flow workspace**는 한 객체를 연 뒤 command hierarchy를 명료히 유지한다(다음 행동/전체 계획/기록).
- 9개 catalog의 mobile horizontal overflow·console/page error는 0.

이들은 문제가 discovery·detail·save identity(도달 **이전** 단계)에 몰려 있고, downstream workspace·content-shape 자체는 건강함을 보여준다.

## 5. 기존 테스트가 놓친 이유 & 권장 회귀 계약

기존 테스트는 route 내부 요소·marker를 잘 검증하나 cross-entry invariant가 없다. 필수 E2E: `same source resolves to one canonical Flow` · `aliases share title/item-count/primary artifact` · `saving Home+Find aliases -> one My Flow object` · `Home examples rediscoverable in Find` · `every visible artifact shape changes projection` · `canonical save uses one receipt/one storage identity` · `legacy alias preserves personal/run data after reconciliation`. (INV-1~7은 `cross-entry-invariant-matrix.json`.)

## 6. Reference (채택/배제 요약)

Notion(preview→명시적 1회 duplicate=1 객체) · Todoist(상대 날짜 재계산, single/project taxonomy는 배제) · Things/TickTick(하나의 객체, Today/Logbook은 필터 뷰) · Wanderlog(하나의 trip이 date/check/resource를 담음) · Hevy(**routine 정의 ↔ logged run 분리**, 소셜 proof 배제). 구조 원칙만 번역, 기능/화면 복제·planner 확장·가짜 social proof 배제. 상세는 `review.dc.html`.

## 7. 24-cell 요약

8 personas × 3 sessions = 24. supported **6**, partial **10**, missing **8**, hidden/blocked 0. "partial"은 기능 부재가 아니라 *기능은 존재하나 같은 원문이 하나의 Flow로 이어지지 않음*. 상세는 `persona-journey-scorecard.json`.

## 8. 판정·계약·프로그램

- 판정/점수/rollback: `decision-matrix.json`
- 유지 계약: source/personal/run/occurrence/export identity + 4탭 IA + /f shell + P32 workspace + Calendar engine + localStorage schema (migration 불필요, 비파괴 reconciliation)
- 단계별 프로그램(P33-00~05, stage별 flag/rollback/acceptance): `p33-recommendation.md`

## 9. Acceptance / test marker

sameSourceUserFacingRouteCount 4→1(effective) · sameMovingSourceSavedMyFlowObjectCount 2→1 · movingArtifactChoiceChangesProjection true · homeVehicleFindSearchResultCount ≥1 · workoutUndatedRawRecurrenceRuleVisible false · duplicateReconciliationReachable true · 개인 날짜·메모·완료·run·export 보존 · horizontalOverflowPx 0 @390/1024/1440.

## 10. 실제 사용자에게만 확인할 질문

`decision-matrix.observedUserQuestions` 참조(24/5 정본 인식, 예시 날짜 vs '날짜 없이 시작', 차량 약속 기대, 중복 화해 판단·'합치기' 안전감, Home/Find 역할 유용성, 재발견 연결 문구).

## 11–12. 무결성

앱 코드/스키마/의존성을 수정하지 않았고, 실제 관찰 사용자는 0명이다. 자동 simulation·screenshot·heuristic은 검증이 아니다. 가짜 사용량/리뷰/평점 없음. 위치 실험용 프로토타입 요소는 `가상 데이터 - production 금지`로 표시한다.
