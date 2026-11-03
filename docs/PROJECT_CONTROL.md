# FlowMe Project Control

<!-- alpha-transition-20260920:start -->
## 현재 격리 작업 — 실사용 알파 전환 (2026-09-20)

9/26 현재: Render를 M7-2 다기기 시험 경로로 선택하고 [배포 전 코드 준비·검증](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m7-2-personal-trial.md#926-현재--render-다기기-시험-경로-선택배포-전-코드-준비)을 마쳤다. 서비스·요금제·실제 URL·Auth 변경·발행/배포는 별도 승인 전 미실행이고 실제 기기/일상 사용과 M7-2 전체는 미완료다. 아래 9/24는 당시 판정 이력이다.

9/24 최신: [제한 PC 사용 시작 판정과 다음 순서](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m7-2-personal-trial.md#924-현재--제한-pc-사용을-먼저-시작)가 현재 진입점이다. 복원 승인은 PC 시작 조건에서 분리했다. 다음은 다기기 접속 환경 준비이며 배포는 별도 승인이다. 아래는 이전 단계 이력이다.

9/23 현재: **기존 콘텐츠 전체의 비공개 보존·열람 완료, 전체 편집·실행 연결은 미완료**. [전체 반입·판정·잔여](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m7-2-full-catalog.md): 002에 Flow177·Item957·구간371·Map26 및 현재 다른 판본2개를 원본 구조로 보존했다. 계정 r74→75 명령1건, 001·기존 제작 사본2개·개인 기록·공유 자료 불변. 표적70/70·통합2188/2188·npm2255/2255·빌드/타입 통과, 실제 브라우저34/34 및 독립 재검사37/37·다섯 해상도 확인. 반입 후 압축 백업1.67MB와 서버 preview 검증을 마쳤다. 다음은 반복·기간·표·Map 의미를 유지한 편집/개인 실행 사본 연결이며, 독립 사본·실제 복원·일상 사용·실기기와 M7-2 전체는 남는다. 공개·배포는 하지 않았다. 아래는 이전 단계 이력이다.

9/23 최신: **M7-1 안전성·운영 준비 준비 목표 완료.** [현재 결과와 다음 결정](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m7-1-readiness.md)에서 강화 QA·수정·원본/QA 경계·D03/D04/D05·실기기/배포 절차를 확인한다. M7 전체 실사용/배포 완료나 실제 자료의 유일본 투입 승인으로 확대하지 않는다. 아래 M6는 직전 완료 이력이다.

9/23 현재 **M6 개발계 목표 완료**. [M6 실행 원장](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m6-preservation.md)에 이관·백업·복원·호환·QA 정리와 종료 판정을 기록했다. 다음은 M7 실사용 준비이며 미실행 강화 검사와 정책·기기·배포 gate는 잔여 M6-R01–08로 연결한다. 보고서 HTML 시각 검사는 미검증으로 유지하되 사용자 승인 대기 사유로 삼지 않는다. 아래 M5 문단은 이전 단계의 완료 이력이다.

기능형 통합 PoC 이후의 현재 실행 계획은 [실사용 알파 전환 원장](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-transition.md)에서 관리한다. v4.1·개발1·개발2의 요구 연결과 M0–M7 완료 조건을 유지한다. M1–M4에 이어 [M5 공개 탐색·공유·커뮤니티](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m5-social.md)의 개발계 구현·실제 두 계정/브라우저 검증과 QA 자료 정리를 완료했다. 다음은 M6 기존 자료 이관·전체 백업/복원·업데이트 호환이며 M7 실사용/배포와 D05 운영 정책은 후속이다.

PR #203 코드 병합과 M1 로컬 계약 이후 [M2 실제 인증·개발 환경](./specs/2026-09-12-flowme-integrated-product-poc-program/alpha-m2-auth.md)의 구현·실제 계정 권한/복구/만료 검증을 마쳤다. 개발 M2 완료와 서비스 전체 실사용 준비는 구분하며, 아래 운영 release·9/7 정리는 기존 이력이다.
<!-- alpha-transition-20260920:end -->

**Last Updated:** 2026-09-26 (격리 알파 M7-2 Render 배포 전 코드 준비; 발행·배포 미실행)

**Purpose:** Stable entry point for the current FlowMe stage, evidence boundary, and next owner decision.

This file is an index, not a second source of product truth. Update its links after a meaningful stage or release change. Keep dated reports as immutable evidence snapshots.

## Current View

- [Current status and owner action](./STATUS.md)
- [Current roadmap and inactive shelves](./ROADMAP.md)
- [Released Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md)
- [Flow Entry And Preview Clarity release history](./pr-history/2026-08-23-flow-entry-preview-clarity.md)
- [Current source and verification maintenance](./pr-history/2026-09-07-verification-gate-refresh.md)
- [Core-journey wireframe review publication](./pr-history/2026-09-07-core-journey-wireframe-review.md)
- [Workspace status reconciliation publication](./pr-history/2026-09-07-workspace-status-reconciliation.md)
- [Current preservation and work register](./content-audit/2026-09-07-flowme-preservation-and-work-register.md)
- [2026-08-29 workspace and backlog maintenance inventory](./content-audit/2026-08-29-flowme-workspace-backlog-maintenance-inventory.md)
- [Released visual-refresh baseline](./specs/2026-08-20-production-visual-only-refresh/spec.md)
- [Approved visual-only Production review](./content-audit/2026-08-19-flowme-production-ux-visual-only-refresh-ko.html)
- [Released Flow Map Item date parity](./pr-history/2026-08-13-flow-map-item-date-parity.md)
- [Released Plan edit and lifecycle unification](./pr-history/2026-08-12-plan-edit-lifecycle-unification.md)
- [Released Public Plan/Item edit contract](./specs/2026-08-12-public-plan-edit-surface-unification/spec.md)
- [Released My Plan edit and lifecycle contract](./specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md)
- [Public Plan/Item edit Korean local UI capture review](./content-audit/2026-08-12-public-plan-edit-surface-unification-ui-review-ko.html)
- [Released public plan surface unification](./specs/2026-08-12-public-plan-surface-unification/spec.md)
- [Merged PR #176 public plan surface release history](./pr-history/2026-08-12-public-plan-surface-unification.md)
- [Merged documentation-only release closeout PR #177](./pr-history/2026-08-12-public-plan-surface-release-closeout.md)
- [Inherited R3B approved plan-execution boundaries](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md)
- [R3B production Escape hotfix release history](./pr-history/2026-08-11-r3b-production-escape-hotfix.md)
- [R3B approved plan-execution release history](./pr-history/2026-08-11-r3b-approved-plan-execution-boundaries.md)
- [Completed workspace and backlog stabilization](./specs/2026-08-06-workspace-backlog-stabilization/spec.md)
- [Final worktree and preservation inventory](./specs/2026-08-06-workspace-backlog-stabilization/inventory.md)
- [R3A My Flow experience boundary release](./pr-history/2026-08-09-r3a-my-flow-experience-boundary.md)
- [P35 Round 2 MVP production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md)

[PR #196](https://github.com/knhbae/flowme2605/pull/196) refreshed the source
contracts and merged as `8c0bfd8de9fb8877c4045b2c3f725b60ca236843`.
[PR #194](https://github.com/knhbae/flowme2605/pull/194) released the visual
refresh as `c8a57ba37c4087b84b526bc778c3604f68299faa`. The follow-up
[PR #195](https://github.com/knhbae/flowme2605/pull/195) final head
`bf11ce250be8df0b438087febe4068713c2783be` passed exact-head CI run
[`32588338583`](https://github.com/knhbae/flowme2605/actions/runs/32588338583)
and merged at `2026-08-22T17:55:30Z` as
`db74a36cbf2325573b2d696589daa659619e50f2`. Post-merge `main` run
[`32589202555`](https://github.com/knhbae/flowme2605/actions/runs/32589202555)
passed both required jobs. GitHub Production deployment record `6039611238`,
status `17168906607`, succeeded for that exact merge source at
[its direct URL](https://flowme2605-2exs7soph-flowme.vercel.app); that URL and
[the canonical alias](https://flowme2605.vercel.app) returned HTTP `200` on
2026-08-29. A separate canonical Production smoke suite is `NOT_RUN`.

[PR #200](https://github.com/knhbae/flowme2605/pull/200) is the later runtime
maintenance line. It refreshed nine due source reviews, replaced one retired
official EV URL, patched the audited transitive dependencies, and fixed a
calendar E2E test whose unfrozen clock had crossed the product's 31-day lookback
boundary. [PR #201](https://github.com/knhbae/flowme2605/pull/201) publishes the
29-file core-journey review package as design evidence. These changes restore
verification and make the review artifact durable; they do not promote a new
feature gate or count as observed-user validation.

No Production product gate is active. The isolated Personal Workspace PoC has a
separately recorded next development slice, K4-A1 pure read-preview, after its
bounded K1-K3 implementation and K4-D design package. Text Authoring remains an
unreleased Draft PR chain, and the 2026-09-06 vision review plus the completed
2026-09-07 core-journey wireframe package published through PR #201 remain UX
decision inputs rather than implementation approval. See the current
preservation and work register for their exact paths, QA boundary, commits, PR
dependencies, and publication boundaries.
Automated QA, deployment, HTTP checks, and local reports remain separate from
observed-user validation; observed users remain `0`.

## Canonical Project Truth

| Question | Canonical document |
| --- | --- |
| What is active, blocked, or required now? | [STATUS.md](./STATUS.md) |
| What sequence or backlog is committed? | [ROADMAP.md](./ROADMAP.md) |
| Which multi-step scope is active, gated, completed, or historical? | [specs/README.md](./specs/README.md) |
| Which product or process rules are settled? | [DECISIONS.md](./DECISIONS.md) |
| Which directions remain deferred? | [IDEAS.md](./IDEAS.md) |
| What routes, components, and ownership contracts exist? | [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md) |
| What has actually been released? | [HISTORY.md](./HISTORY.md) |
| Where is older status detail preserved? | [STATUS_HISTORY.md](./STATUS_HISTORY.md) |

## Update Policy

- Update this index after a meaningful release, stage change, or whole-project review.
- Do not continuously rewrite dated HTML reports. Generate a new dated report and update the two current-view links here.
- Keep one active product gate consistent across `STATUS`, `ROADMAP`, and `specs/README`.
- When no product gate is active, state that explicitly instead of treating a research or maintenance shelf as implementation work.
- Treat implementation, automated QA, deployment, and observed-user evidence as separate states.
- Use [Knowledge Maintenance](./workflows/knowledge-maintenance.md) only on demand when these documents drift or become difficult to navigate.

## Archived Human-Facing Backlogs

The following snapshots remain available for historical reasoning but are no longer current control surfaces:

- [2026-06-19 service UX backlog](./content-audit/2026-06-19-flowme-service-ux-backlog-ko.html)
- [2026-06-19 wide project backlog](./content-audit/2026-06-19-flowme-wide-project-backlog-ko.html)
