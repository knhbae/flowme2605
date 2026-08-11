# Implementation Plan

**Status:** LOCAL IMPLEMENTATION AND AUTHORIZED QA COMPLETE / PR #176 OPEN / CI PENDING

## 1. Characterize and preserve — complete

- 실행 가능한 Map, save mode, setup input, child Flow, redirect, review-hold 목록을 고정했다.
- 기존 Map snapshot/persistence/transaction과 `/f` 저장 계약을 회귀 테스트로 보존했다.
- 구형 presentation selector와 실제 저장 계약 assertion을 분리했다.

## 2. Shared public presentation — complete

- AppClient 안의 공유 셸을 `PublicPlanShareShell`로 추출했다.
- approved `FlowCapabilityResultPreview`를 `PublicPlanResultPreview`로 감싸 공통 결과 계약을 제공했다.
- `/f`와 실행 가능한 Map이 `FlowSaveBeforeFrame composition="artifact-first"`와 공통 결과 컴포넌트를 사용한다.

## 3. Flow Map result adapter — complete

- canonical child `FlowBundle`별 기존 projection으로 공통 표시 결과를 만들었다.
- Map snapshot의 effective/excluded 선택을 canonical ID에 적용했다.
- child 순서, section, memo, completion criterion, resources, risk, 실제 날짜를 보존했다.
- 표시용 aggregate owner를 Map ID/version/snapshot hash로 명시하고 persistence input으로 사용하지 않았다.

## 4. Controller wiring — complete

- `save_all`은 snapshot, anchor, selected destination을 기존 Map experience와 함께 소유한다.
- Save button은 controlled anchor와 selected artifact mode를 받아 기존 atomic transaction을 실행한다.
- `choose_child`는 선택 child 하나의 공통 결과를 보여 주고 `/f/[slug]`로 이동한다.
- review-hold와 canonical redirect는 기존 경계를 유지한다.
- Default executable Maps use the unified public presentation; exact `visualSubtraction=off` restores the exact legacy Map shell, presentation, action, and anchor behavior for both `save_all` and `choose_child`, and exact `savedPlanLibrary=off` restores the prior/default result mode.

## 5. Verification and closeout — complete locally

- Adapter unit/component tests와 공통 public-surface E2E를 추가했다.
- 구형 Map UI를 정답으로 고정한 positive assertion을 공통 결과 계약으로 교정하면서 rollback, redirect, review-hold 고유 계약을 유지했다.
- Direct executable inventory, save/adjust/reload, choose-child, hold, 390/768/1024/1440 반응형 품질을 검증했다.
- Unit/contract, build, focused E2E, legacy Map contracts, full Playwright, documentation, and diff checks를 최종 evidence에 기록했다.
- Local implementation closeout remains distinct from publication. PR #176 is open; exact-head CI, merge, deployment, and production smoke remain `PENDING` until verified, and observed users remain `0`.

## 6. Publication sequence — PR open, CI pending

- Created initial implementation commit `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a` from base `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`.
- Pushed `codex/public-surface-unification-20260812` and opened [PR #176](https://github.com/knhbae/flowme2605/pull/176) with that opening head.
- Wait for and verify the actual exact-head PR CI result before merge.
- Record the real merge SHA only after merge succeeds.
- Verify that Production serves the exact merged source, then run canonical production smoke.
- Keep R3B as the production baseline until exact-source deployment and smoke pass; keep observed users at `0` unless real session evidence exists.
