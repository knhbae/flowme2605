# FlowMe Project Control

**Last Updated:** 2026-08-12

**Purpose:** Stable entry point for the current FlowMe stage, evidence boundary, and next owner decision.

This file is an index, not a second source of product truth. Update its links after a meaningful stage or release change. Keep dated reports as immutable evidence snapshots.

## Current View

- [Current status and owner action](./STATUS.md)
- [Current roadmap and inactive shelves](./ROADMAP.md)
- [Released public plan surface unification](./specs/2026-08-12-public-plan-surface-unification/spec.md)
- [Merged PR #176 public plan surface release history](./pr-history/2026-08-12-public-plan-surface-unification.md)
- [Open documentation-only release closeout PR #177](./pr-history/2026-08-12-public-plan-surface-release-closeout.md)
- [Inherited R3B approved plan-execution boundaries](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md)
- [R3B production Escape hotfix release history](./pr-history/2026-08-11-r3b-production-escape-hotfix.md)
- [R3B approved plan-execution release history](./pr-history/2026-08-11-r3b-approved-plan-execution-boundaries.md)
- [Completed workspace and backlog stabilization](./specs/2026-08-06-workspace-backlog-stabilization/spec.md)
- [Final worktree and preservation inventory](./specs/2026-08-06-workspace-backlog-stabilization/inventory.md)
- [R3A My Flow experience boundary release](./pr-history/2026-08-09-r3a-my-flow-experience-boundary.md)
- [P35 Round 2 MVP production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md)

[PR #176](https://github.com/knhbae/flowme2605/pull/176) final head
`3555cd1db9f426dcbc30c81652be01dd38b1ce5e` passed exact-head CI run
[`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714)
and merged at `2026-08-11T20:59:16Z` as
`47c54803c6bb7544aad757ce62c4ce58decbfe53`. Post-merge `main` CI run
[`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210)
also passed. GitHub Production deployment record `5858571759`, status
`16686799631`, identifies that exact source and its protected direct
deployment-record URL, which is not anonymous app proof. The
[canonical alias](https://flowme2605.vercel.app) returned HTTP `200`, and the
[Vercel deployment record](https://vercel.com/flowme/flowme2605/BYkEtNVJkGitQcCZfWvfZpyicebp)
reports success.

Canonical production smoke passed `11/11` in sequential isolated contexts in
`19.023s`. Runtime, network, same-origin 4xx/5xx, overflow,
clipped, unnamed, pass-gated fixed-overlap, and pass-gated short-target
violations were `0`. The harness also observed `4` sticky/control intersections
and `10` short targets on rollback, review-hold, and current save transitions;
they are observational usability evidence, not closed user validation. Observed
users remain `0`. No product gate is active. The only current publication task
is [documentation-only PR #177](https://github.com/knhbae/flowme2605/pull/177)
from initial closeout commit `094ce996c71a4005496c9726003a223e29c2fc3e`
and released base `47c54803c6bb7544aad757ce62c4ce58decbfe53`.

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
