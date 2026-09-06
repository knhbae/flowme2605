# FlowMe Project Control

**Last Updated:** 2026-09-07

**Purpose:** Stable entry point for the current FlowMe stage, evidence boundary, and next owner decision.

This file is an index, not a second source of product truth. Update its links after a meaningful stage or release change. Keep dated reports as immutable evidence snapshots.

## Current View

- [Current status and owner action](./STATUS.md)
- [Current roadmap and inactive shelves](./ROADMAP.md)
- [Released Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md)
- [Flow Entry And Preview Clarity release history](./pr-history/2026-08-23-flow-entry-preview-clarity.md)
- [Current source and verification maintenance](./pr-history/2026-09-07-verification-gate-refresh.md)
- [Core-journey wireframe review publication](./pr-history/2026-09-07-core-journey-wireframe-review.md)
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
