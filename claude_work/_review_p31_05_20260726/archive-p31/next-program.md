# Next Program — P32 candidate (My Flow structural reopen, alternative B)

REVIEWER_ROLE: claude_design · reviewedAt: 2026-07-24 KST · observed-user count: 0
verdict: `my_flow_structural_reopen` · selectedAlternative: `B_library_to_focused_workspace` (C의 definition/run 분리를 body 차원에서 차용)
app code 변경 없음 · 데이터 계약(source/personal/run/occurrence/export) 및 4-tab IA 유지 · migration 불필요.

## 왜 재구성인가 (게이트 근거)

framework 전면 재구성 기준 8개 중 3개가 current production에서 재현:
- #1 '지금' vs workspace '실행' 역할 혼동 (P1/P3/P6/P7) — D2
- #2 동일 stable Item의 primary completion 중복 (지금/실행/Home 이어하기) — D1
- #7 첫 viewport card type 4+, competing primary 2+ — D4

그리고 #8: A(Keep and Tighten)의 복잡도 감소가 18.4%로 20% 게이트에 미달. B=47%, C=33%.
→ bounded_revision(A)로는 근본 collision을 못 없애므로 my_flow_structural_reopen.

## 단계별 프로그램 (각 stage 독립 feature flag)

### S1 — Completion 단일 소유 + 완료/기록 의미 정리 (risk: low)
- 동일 Item의 primary completion을 focused workspace가 단독 소유. '지금'/Home '이어하기'는 workspace로 deep-link하며 완료 컨트롤을 **복제하지 않는다**.
- top-level '완료'를 "완료한 run 상태의 cross-Flow 필터 뷰"로 재라벨. per-Flow '기록'과 동일 run 상태를 참조(별도 모델 금지).
- flag: `myflow_single_completion_owner` · rollback: off→P31 컨트롤 복원.
- acceptance: actionableDuplicateCount=0; 완료↔기록 단일 run 상태 참조.

### S2 — Library → Focused Workspace shell (risk: medium)
- /my 첫 화면 = `이어서 하기` strip + compact library(뱃지: 다음 날짜/진행/상태). '지금' 탭 제거.
- Flow open = focused workspace(global 숨김) + progressive disclosure: **다음 행동 → 전체 계획 → 기록** (단일 세그먼트, 페이지+workspace 이중 탭 폐지).
- flag: `myflow_focused_workspace` · rollback: off→P31 탭.
- acceptance: firstViewportDistinctCardTypeCount ≤2(library)/≤3(workspace); firstActionDepth ≤2.

### S3 — Scale + wide + context restore (risk: medium)
- 20/60: search-first 기본 + status/next-date section. mobile에서도 검색 상시.
- wide: library(고정 폭)/canvas(focused workspace)/inspector(선택 Item detail) — canvas 여백 제거. **1024/1440 horizontal overflow 재계측**(F-06, smoke=0과 상충 해소).
- mobile back = library filter/scroll 명시 복원.
- flag: `myflow_scale_restore` · rollback: off.
- acceptance: flowOpenDepth@20 ≤3; contextLossCount=0; horizontalOverflowPx=0 @390/1024/1440.

### S4 — Content-shape body renderers (risk: medium)
- body: anchor_timeline(phase/date group+anchor vs 고정날짜), undated_checklist(날짜 압박 없는 리스트+선택적 날짜 입구), recurrence_routine(**definition vs current run 분리, Hevy 차용**), artifact_choice(primary 1+최대 2 secondary+예측 count), mixed_travel(date/check/resource 분리), personal_draft(편집 리스트+구성 편집).
- 공통 header/identity/action grammar 유지.
- flag: `myflow_shape_bodies` · rollback: off→공통 generic body.
- acceptance: 각 shape에서 explanationDependencyCount=0; reopenDepth ≤2.

## 관찰(사용자 스터디)이 먼저 답해야 할 질문
1. '지금' vs '실행'을 실제로 다르게 예측하는가?
2. 이어하기를 Home/지금/실행 중 어디서 하는가?
3. '완료'(cross-Flow)와 '기록'(per-Flow)을 별개로 기대하는가?
4. 20/60 규모에 실제 도달하는가? 검색 vs 그룹 우선순위는?
5. Calendar 왕복 후 scroll/filter 초기화가 실제 좌절을 만드는가?
6. continue strip이 이어하기 멘탈모델과 맞는가?

> 이 프로그램은 설계 제안이다. 어떤 stage도 observed-user 게이트를 통과하기 전엔 "검증됨"이라 표기하지 않는다. 가짜 social proof 없음. 위치 실험 필요 시 프로토타입에 `가상 데이터 - production 금지` 표시.
