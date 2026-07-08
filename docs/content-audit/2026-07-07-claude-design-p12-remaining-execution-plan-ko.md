# Claude Design P12 잔여 실행 계획

> **For agentic workers:** 이 문서는 P12-01~P12-05/P12-10 완료 상태와 Claude Design 원문에 실제로 남은 P12-06~P12-09 항목을 분리한 실행 계획이다. 앱 UI, 테스트, capture script를 이 문서 작성 중에는 수정하지 않는다. 다음 구현은 아래 "다음 /goal 후보" 중 하나를 별도 목표로 실행한다.

**Goal:** P12 완료/잔여 상태를 한 문서에서 판정하고, 다음 구현 목표를 안전하게 고른다.

**Scope:** planning artifact only. No app code, test code, seed data, capture script, storage/export schema changes.

**Sources Checked**

- Repo: `D:\flowme2605\flow-mvp`
- Latest reviewed commit in worktree: `06d4c9d` (`Gate URL-first flow lab as prototype`)
- Claude Design source: GitHub ZIP `FlowMe UXUI 전체 검토 (2).zip`
- Extracted Claude document: `FlowMe UX 재검토 P11 마감 (P12 백로그).dc.html`
- Evidence package: `docs/content-audit/2026-07-07-claude-design-p12-url-first-slice-evidence/`
- Evidence package: `docs/content-audit/2026-07-07-claude-design-p12-prototype-gate-evidence/`
- Tests referenced: `tests/e2e/url-first-user-surface.spec.ts`, `tests/e2e/flow-mvp.spec.ts`
- Capture script referenced: `scripts/content-audit/capture-claude-p7-final-review-package.mjs`

## Current P12 Status

| Item | Status | Priority | Judgment |
| --- | --- | --- | --- |
| P12-01 | Done | Blocking | `/flows` URL-first hit/custom-start/miss/candidate states are captured as normal user-route scenarios. Evidence records `urlFirstScenarioCount: 4`, states `hit/custom-start/miss/candidate`, and URL-first guardrail buckets at 0. |
| P12-02 | Done | High | URL-first hit source slug leakage such as `Mathbang` is covered by the URL-first normal route guardrail. Current evidence reports `urlFirstNormalSourceSlugHitCount: 0`. |
| P12-03 | Done | High | URL-first candidate raw ISO and production-copy leakage are covered. Current evidence reports `urlFirstNormalRawIsoHitCount: 0` and URL-first internal hit count 0. |
| P12-04 | Done | High | P0/queue/pipeline wording is covered by normal route URL-first guardrail. Current evidence reports URL-first internal hit count 0. |
| P12-05 | Done | Medium | `/flow-lab/url-first-p0` is separated into a prototype/internal bucket. Evidence records `flowLabPrototypeBucket: true`, `flowLabPrototypeNoindex: true`, and user nav link count 0. |
| P12-06 | Remaining | Medium | Public `/f/*` workbench sticky primary CTA labels still need unification. Claude source identifies mixed labels such as `내 Flow에 저장`, `내 도구로 가져가기`, and `캘린더 파일 받기`. |
| P12-07 | Remaining | Medium | URL-first transferable-format chips still expose technical copy such as `Markdown`. Current P12 evidence still contains `Markdown 받기` in URL-first hit/custom-start scenarios. |
| P12-08 | Done via P12-01 | Low | Claude source asks custom-start scenario s28 to be included in P12-01 scan. Current evidence includes `custom-start` in `urlFirstStatesCaptured` and counts 4 URL-first markers. |
| P12-09 | Remaining | Low | URL-first hit start-date input needs a stable test id and native date input exemption bucket if it carries a visible/native raw ISO value. Current URL-first hit scenario has `rawIsoInputValueHits: []` and no URL-first-specific exemption record. |
| P12-10 | Done with P12-05 | Low | Source-backed manual registration QA remains an internal docs-only report. Prototype-gate evidence records `manualRegistrationQaUserLinkCount: 0`. |

## P12-06~P12-09 Original Text Check

P12-06 through P12-09 do exist in the latest Claude Design P12 backlog document. They are not inferred items.

### P12-06

- Priority: Medium
- Route/surface: public `/f/*` workbench sticky CTA
- Problem: public workbench sticky first-action label differs by route: `내 Flow에 저장`, `내 도구로 가져가기`, `캘린더 파일 받기`.
- Requested direction: sticky first action should be a save/input-oriented primary action. Calendar/sheet/memo export actions should stay in the body export area.
- Acceptance from Claude source: sticky first action is save/input-oriented across public workbench routes, `publicPrimaryPathVisible` remains 9/9, `public-share-cta-order` passes.

### P12-07

- Priority: Medium in detailed backlog, listed near Low in summary.
- Route/surface: `/flows` URL-first hit/custom-start chips
- Problem: "옮길 수 있는 형태" exposes `Markdown`, which reads like a file-format implementation detail.
- Requested direction: replace with user-facing wording such as `메모` or `문서`; export capability itself must not change.
- Acceptance from Claude source: URL-first chips have 0 visible file-format technical terms such as `Markdown`.

### P12-08

- Priority: Low
- Route/surface: `/flows` URL-first custom-start
- Problem in original P12 source: custom-start panel evidence only had scrollHeight-like metadata, not normal marker coverage.
- Current judgment: completed by P12-01. Current evidence includes `custom-start` in `urlFirstStatesCaptured` and URL-first marker count 4.
- No separate implementation goal is recommended unless future evidence loses the custom-start marker.

### P12-09

- Priority: Low
- Route/surface: `/flows` URL-first hit start date input
- Problem: hit start-date input displays native `yyyy-mm-dd` behavior similar to flow-map moving-date inputs, but the URL-first input lacks a stable test id / raw ISO input exemption marker.
- Requested direction: add stable test id and record route/testId/reason in the raw ISO input exemption bucket where applicable.
- Acceptance from Claude source: URL-first hit date input is covered by the same native date input exemption policy as flow-map moving date input.

## Completed Baselines To Preserve

- 4-tab IA remains: home, Flow finding, calendar, My Flow.
- Public `/f/[slug]` remains a share shell, not forced into the 4-tab app shell.
- Seed/source-backed data structure remains unchanged.
- Save/run/export schema remains unchanged.
- `sourceUrl`, `sourceTrace`, detail, memo, and export access remain available.
- URL-first canonical lookup/source-backed reuse remains unchanged.
- Normal route guardrail buckets stay at 0 for internal copy, source slug, structural display, raw ISO, first-task repetition, and overflow.
- URL-first normal route guardrail buckets stay at 0.
- `/restart/moving-d30` prototype bucket remains green or explicitly exempted only for native date input values.
- `/flow-lab/url-first-p0` remains prototype/internal, noindex, and absent from normal user nav/catalog links.
- Manual registration QA report remains docs-only and unlinked from normal user routes.
- Public share browse links remain accessible but after the primary save/setup path.
- P11/P12 evidence packages remain historical evidence; do not mutate them during implementation unless the next goal explicitly regenerates a new review package.

## Remaining Implementation Plan

### Step 1: P12-06 Public Workbench Sticky CTA Label Unification

- Status: next recommended goal
- Impact routes:
  - `/f/vehicle-inspection-prep`
  - `/f/moving-d30-basic`
  - `/f/fridge-cleanout-weekly-plan`
  - `/f/washer-tub-clean-monthly`
  - `/f/new-car-delivery-check`
  - `/f/used-car-buying-check`
- Expected files:
  - `components/flow/AppClient.tsx`
  - `components/flow/ArtifactWorkbench.tsx`
  - `tests/e2e/public-share-cta-order.spec.ts`
  - `scripts/content-audit/capture-claude-p7-final-review-package.mjs` only if the marker cannot distinguish sticky primary labels
- Implementation range:
  - Keep the public share primary path as save/input/setup.
  - Keep export actions available, but avoid making a sticky export label read as the primary route action.
  - Add or refine evidence marker for public workbench sticky first-label class if current `publicWorkbenchExportLabels` is not enough.
- Verification:
  - Mobile 390px public workbench routes.
  - `tests/e2e/public-share-cta-order.spec.ts`.
  - Targeted public workbench export label check.
  - Normal route guardrail 0.
  - `npm.cmd test`, `npm.cmd run docs:check`, `npm.cmd run build`, `git diff --check`.
- Dependency:
  - Depends on P12-05 prototype separation only as a baseline.
- Risk:
  - Do not remove export labels or break export generation. This is label hierarchy and sticky surface only.

### Step 2: P12-07 + P12-09 URL-First Copy/Input Evidence Cleanup

- Status: recommended second goal
- Impact routes:
  - `/flows` URL-first hit
  - `/flows` URL-first custom-start
- Expected files:
  - `components/flow/AppClient.tsx`
  - `lib/flow/url-first-lookup.ts`
  - `lib/flow/user-surface-guardrails.ts` only if a generic file-format term guardrail is added
  - `tests/e2e/url-first-user-surface.spec.ts`
  - `scripts/content-audit/capture-claude-p7-final-review-package.mjs` only for input exemption marker wiring
- Implementation range:
  - Replace visible URL-first chip/export wording `Markdown` with user-facing wording such as `메모` or `문서`.
  - Preserve export payload and actual export capability.
  - Add a stable test id to URL-first hit date input if the input is part of the user surface.
  - Record native date input raw ISO value as an explicit exemption only when the browser value is present and technical.
- Verification:
  - URL-first hit/custom-start/miss/candidate scenarios.
  - URL-first `Markdown` visible count 0.
  - URL-first normal guardrail 0.
  - URL-first input raw ISO hit/exemption policy recorded.
  - `tests/e2e/url-first-user-surface.spec.ts`.
  - `npm.cmd test`, `npm.cmd run docs:check`, `npm.cmd run build`, `git diff --check`.
- Dependency:
  - P12-07 can ship without P12-09, but they share the URL-first hit/custom-start surface and can be a single small slice.
- Risk:
  - Do not change canonical lookup, source-backed reuse, candidate storage, or export schema.

### Step 3: P12 Final Review Package

- Status: run after P12-06/P12-07/P12-09 are completed.
- Output package suggestion:
  - `docs/content-audit/2026-07-07-claude-design-p12-final-review-package/`
- Scope:
  - Regenerate screenshots and route-evidence for normal routes, URL-first states, public workbenches, `/restart`, and `/flow-lab`.
  - Include Claude Design prompt for P13 backlog.
- Verification:
  - `node scripts/content-audit/capture-claude-p7-final-review-package.mjs`
  - P12 normal route guardrail 0.
  - URL-first all buckets 0 or explicit native input exemptions.
  - Public sticky primary labels 9/9 save/input class.
  - Prototype route buckets remain separated.
  - `npm.cmd test`, `npm.cmd run docs:check`, `npm.cmd run build`, `git diff --check`.

## Recommended Execution Order

1. P12-06 alone.
2. P12-07 + P12-09 together.
3. P12 final review package and Claude Design P13 request.

Reason: P12-06 touches public `/f` workbench sticky hierarchy. P12-07/P12-09 touch `/flows` URL-first hit/custom-start surfaces. Keeping those two surfaces separate keeps regressions easy to diagnose.

## Next `/goal` Candidate

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P12 백로그의 P12-06을 해결한다. 공개 `/f/[slug]` workbench 저장 전 화면에서 하단 sticky 1차 CTA 라벨이 route마다 `내 Flow에 저장`, `내 도구로 가져가기`, `캘린더 파일 받기`처럼 갈라져 보이지 않게 정리한다. 저장/입력/setup이 public share shell의 primary path라는 기준은 유지하고, calendar/sheet/memo export는 본문 export 영역의 부차 행동으로 유지한다. P12-01~P12-05/P12-08/P12-10 기준선은 되돌리지 않는다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/SERVICE_STRUCTURE.md
5. docs/content-audit/2026-07-07-claude-design-p12-remaining-execution-plan-ko.md
6. GitHub ZIP 또는 claude_work의 `FlowMe UX 재검토 P11 마감 (P12 백로그).dc.html`
7. docs/content-audit/2026-07-07-claude-design-p12-prototype-gate-evidence/README.md
8. docs/content-audit/2026-07-07-claude-design-p12-prototype-gate-evidence/audit.md
9. docs/content-audit/2026-07-07-claude-design-p12-prototype-gate-evidence/route-evidence.json
10. components/flow/AppClient.tsx
11. components/flow/ArtifactWorkbench.tsx
12. components/flow/PlatformNav.tsx
13. tests/e2e/public-share-cta-order.spec.ts
14. tests/e2e/workbench-source-density.spec.ts
15. tests/e2e/url-first-user-surface.spec.ts
16. scripts/content-audit/capture-claude-p7-final-review-package.mjs

핵심 문제:
- P12 원문은 public workbench sticky 1차 CTA 라벨이 route마다 다르다고 지적했다.
- s06은 `내 Flow에 저장`, s07은 `내 도구로 가져가기`, s09/s10은 `캘린더 파일 받기`처럼 보일 수 있다.
- 공개 `/f/[slug]` 저장 전 화면의 primary는 저장/입력/setup이어야 하고, export는 부차 행동이어야 한다.
- P10/P11/P12-02에서 정리한 public share CTA order와 source/detail/export 접근은 유지해야 한다.

구현 원칙:
- 새 기능을 추가하지 않는다.
- 특정 콘텐츠 slug 전용 하드코딩을 만들지 않는다.
- 4탭 IA는 유지한다.
- 공개 `/f/[slug]`는 공유 shell로 유지한다.
- seed/source-backed 데이터 구조는 바꾸지 않는다.
- 저장/실행/export 스키마는 바꾸지 않는다.
- export 파일 생성 로직과 결과 중심 라벨은 깨지 않는다.
- `내 Flow에 저장` 또는 입력/setup path는 저장 전 주 행동으로 유지한다.
- `콘텐츠 더 보기`는 접근 가능하되 primary 뒤의 보조 탐색으로 유지한다.
- P12-01~P12-05/P12-08/P12-10 기준선을 되돌리지 않는다.
- 사용자 화면에 `P0`, `대기열`, `파이프라인`, `Canonical URL`, `handoff`, `source-backed`, `Step`, `Item` 같은 내부어를 다시 노출하지 않는다.

구현 범위:
1. public workbench sticky CTA inventory
   - 모바일 390px 기준으로 `/f/vehicle-inspection-prep`, `/f/moving-d30-basic`, `/f/fridge-cleanout-weekly-plan`, `/f/washer-tub-clean-monthly`, `/f/new-car-delivery-check`, `/f/used-car-buying-check`를 확인한다.
   - sticky bar의 첫 visible label, primary path visible/focusable 상태, export 버튼 위치를 기록한다.

2. sticky 1차 CTA 라벨 통일
   - 저장/입력/setup 계열 primary 라벨로 통일한다.
   - calendar/sheet/memo export는 본문 export 영역 또는 부차 컨트롤로 유지한다.
   - export 동작, export payload, copy/download 라벨은 삭제하지 않는다.
   - sticky CTA와 본문 마지막 콘텐츠의 bottom clearance를 깨지 않는다.

3. evidence marker 보강
   - current `publicWorkbenchExportLabels`가 sticky 1차 라벨 판정에 부족하면 marker를 보강한다.
   - 목표 marker는 public workbench sticky first action이 저장/입력 계열인지 route별로 판단 가능해야 한다.
   - P10-01 기준대로 guardrail 정규식 사본을 capture script에 새로 복사하지 않는다.

4. 회귀 방지
   - P12-01~P12-04 URL-first normal guardrail 0 유지
   - P12-05 `/flow-lab/url-first-p0` prototype bucket/noindex/user nav link 0 유지
   - P12-10 manual registration QA user link 0 유지
   - public share CTA order before-primary 0 유지
   - workbench source density 유지

검증:
- 모바일 390px public workbench 6개 route 확인
- sticky 1차 CTA가 저장/입력 계열로 보이는지 확인
- export/copy/download 동작과 본문 export 접근 유지 확인
- `tests/e2e/public-share-cta-order.spec.ts`
- `tests/e2e/workbench-source-density.spec.ts`
- `tests/e2e/url-first-user-surface.spec.ts`
- targeted Playwright E2E
- npm.cmd test
- npm.cmd run docs:check
- npm.cmd run build
- capture script 재실행이 필요한 경우 route-evidence summary 확인
- git diff --check
- 커밋 및 푸시

완료 기준:
- 공개 `/f/[slug]` workbench sticky 1차 CTA가 저장/입력 계열로 일관된다.
- export는 계속 가능하지만 sticky primary와 위계가 뒤집히지 않는다.
- `publicPrimaryPathVisible`/focusable 기준과 public share CTA order 기준이 유지된다.
- 기존 저장/실행/export 구조와 P12-01~P12-05/P12-08/P12-10 기준선이 유지된다.
- 최종 응답에서 수정 파일, 적용 방식, mobile/evidence 확인 결과, 검증 결과, 커밋/푸시 상태, 남은 리스크를 요약한다.
```

## Commit Guidance

This document can be committed as a planning artifact by itself. Do not include unrelated dirty files currently present in the worktree.
