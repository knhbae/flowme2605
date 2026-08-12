# Implementation Plan

**Status:** IMPLEMENTATION, PUBLICATION, PRODUCTION DEPLOYMENT, AND CANONICAL SMOKE COMPLETE

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
- Local implementation closeout remained distinct from publication. PR #176 exact-head CI, merge, post-merge CI, exact-source deployment, and canonical production smoke are now separately verified; observed users remain `0`.

## 6. Publication sequence — complete

- Created initial implementation commit `1cf1fc4dc85773bed3ac4e880920369e1aba1e3a` from base `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`.
- Pushed `codex/public-surface-unification-20260812` and opened [PR #176](https://github.com/knhbae/flowme2605/pull/176) with that opening head.
- Froze final PR head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e`; exact-head CI run [`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714) passed.
- Merged at `2026-08-11T20:59:16Z` as `47c54803c6bb7544aad757ce62c4ce58decbfe53`; post-merge `main` CI run [`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210) passed.
- Verified GitHub Production deployment record `5858571759`, status `16686799631`, for the exact merged source. The canonical alias returned HTTP `200`.
- Ran the authoritative canonical production smoke: `11/11` in sequential isolated contexts in `19.023s`, with pass-gated runtime/network/layout violations `0`. Observational sticky/control intersections were `4` and short targets were `10`; they are not closed usability evidence.
- Promoted the public plan surface release to the current Production baseline. Keep observed users at `0` unless real session evidence exists; no product gate is active after release.
