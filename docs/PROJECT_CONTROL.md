# FlowMe Project Control

**Last Updated:** 2026-08-11

**Purpose:** Stable entry point for the current FlowMe stage, evidence boundary, and next owner decision.

This file is an index, not a second source of product truth. Update its links after a meaningful stage or release change. Keep dated reports as immutable evidence snapshots.

## Current View

- [Current status and owner action](./STATUS.md)
- [Current roadmap and inactive shelves](./ROADMAP.md)
- [Active R3B production Escape hotfix and approved boundaries](./specs/2026-08-11-r3b-approved-plan-execution-boundaries/spec.md)
- [R3B production Escape hotfix PR history](./pr-history/2026-08-11-r3b-production-escape-hotfix.md)
- [R3B approved plan-execution PR history](./pr-history/2026-08-11-r3b-approved-plan-execution-boundaries.md)
- [Completed workspace and backlog stabilization](./specs/2026-08-06-workspace-backlog-stabilization/spec.md)
- [Final worktree and preservation inventory](./specs/2026-08-06-workspace-backlog-stabilization/inventory.md)
- [R3A My Flow experience boundary release](./pr-history/2026-08-09-r3a-my-flow-experience-boundary.md)
- [P35 Round 2 MVP production closeout](./pr-history/2026-08-06-p35-round2-mvp-closeout-production.md)

[PR #172](https://github.com/knhbae/flowme2605/pull/172) final head
`b1106b6a319eb2ff5671be99ab446d68d6597f0b` merged R3B into `main` as
`a599370496ee95a52d14cddd27c94b0c8190a863`. Exact-head and post-merge CI
passed, and the exact source reached a successful Production deployment. The
canonical initial smoke passed `21/23`; both failures repeated and isolate
Escape ownership in a nested bottom sheet and the 767px fallback Item editor.
The bounded hotfix is locally verified through unit `182/182`, build `18/18`
at BUILD_ID `wjpnPhhhMBaWzGTXuxK7U`, P26 `1/1`, targeted browser `3/3`, approved
browser `23/23`, and full Playwright `569/569`. Hotfix PR, CI, merge,
deployment, and canonical re-smoke remain `NOT_RUN`. Observed-user validation
remains `0`.

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
