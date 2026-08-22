# FlowMe Project Control

**Last Updated:** 2026-08-23

**Purpose:** Stable entry point for the current FlowMe stage, evidence boundary, and next owner decision.

This file is an index, not a second source of product truth. Update its links after a meaningful stage or release change. Keep dated reports as immutable evidence snapshots.

## Current View

- [Current status and owner action](./STATUS.md)
- [Current roadmap and inactive shelves](./ROADMAP.md)
- [Active Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md)
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
contracts, leaving `135` normal-user routes current with overdue and missing
counts `0`, and merged as `8c0bfd8de9fb8877c4045b2c3f725b60ca236843`.
[PR #194](https://github.com/knhbae/flowme2605/pull/194) then passed its exact-head
release gate, merged as `c8a57ba37c4087b84b526bc778c3604f68299faa`, and its
resulting Production deployment was verified at
[flowme2605.vercel.app](https://flowme2605.vercel.app). It is the current
visual-refresh Production baseline.

The active product gate is
[Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md).
The Owner completed FPC-11 and authorized [PR #195](https://github.com/knhbae/flowme2605/pull/195)
for release after PR #194. Its bounded discovery, complete Text/Todo/Calendar,
and copy-title behavior is implemented, but the reconciled exact head must still
pass CI before merge and the resulting Production deployment must be verified.
Earlier `624/625`, `623/629`, and `629/629` runs remain dated QA history rather
than a current source-freshness blocker. Automated QA, deployment, smoke, and
local capture reports remain separate from observed-user validation; observed
users remain `0`.

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
