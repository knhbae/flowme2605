# FlowMe Project Control

**Last Updated:** 2026-08-20

**Purpose:** Stable entry point for the current FlowMe stage, evidence boundary, and next owner decision.

This file is an index, not a second source of product truth. Update its links after a meaningful stage or release change. Keep dated reports as immutable evidence snapshots.

## Current View

- [Current status and owner action](./STATUS.md)
- [Current roadmap and inactive shelves](./ROADMAP.md)
- [Active Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md)
- [Stacked visual-refresh review baseline](./specs/2026-08-20-production-visual-only-refresh/spec.md)
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

[PR #182](https://github.com/knhbae/flowme2605/pull/182) final head
`0aca76687ac582ff4cf11b19a0f46db5593c768e` passed exact-head CI run
[`31655643163`](https://github.com/knhbae/flowme2605/actions/runs/31655643163)
and merged at `2026-08-13T01:05:33Z` as
`f6f796c035d5762eea07ec35abb7f1af1577a5a5`. GitHub Production deployment
record `5880059975`, status `16743295490`, reports success for that exact
runtime-bearing merge; its
[protected direct deployment-record URL](https://flowme2605-hph3l1si0-flowme.vercel.app)
is deployment evidence. Canonical Production smoke against
[flowme2605.vercel.app](https://flowme2605.vercel.app) passed `41/41` with
workers `1`, retries `0`, in `264804.24ms`, with unexpected, flaky, and skipped
results `0`.

The release gives executable single-plan Maps the same shared Item title, memo,
and date editor as ordinary Flows while preserving Map/version/child/storage
identity and the PR #178 Plan edit/lifecycle foundation. Post-merge `main` run
[`31656595092`](https://github.com/knhbae/flowme2605/actions/runs/31656595092)
passed core job `94312307779` and Playwright job `94312307849`.
Automated QA, deployment, smoke, and local capture reports remain separate from
observed-user validation; observed users remain `0`. The active review gate is
[Flow Entry And Preview Clarity](./specs/2026-08-20-flow-entry-preview-clarity/spec.md),
stacked on the unmerged [Production Visual-Only Refresh](./specs/2026-08-20-production-visual-only-refresh/spec.md)
review baseline. The follow-up implements one discovery entry, source-faithful
complete Text, full approved Todo/Calendar, and meaningful copy titles. Local
implementation and automated QA are complete; full `npm test` retains the same
separate source-review-due failure. [Draft PR #195](https://github.com/knhbae/flowme2605/pull/195)
at initial runtime head `1d14c19c387b8f2cd3d61f04698aa097af2ddf2d`
and its [stable Vercel Preview](https://flowme2605-git-agent-flow-entry-preview-clarity-flowme.vercel.app)
are published for Owner review. Initial Actions run `32309777212` ended core
`624/625` at the known `30`-record freshness gate and Playwright `623/629` with
six failures. Remediation code head `597a6f84d593f0788e2c1f5a4fcd20d762d7bf28`
passes current-source build `18`, focused unit `13/13`, and the same six E2E cases
`6/6` locally. Exact code-head Actions run `32312436980` has Playwright `629/629`
PASS; core docs `16/4575`, pretest `176/176`, and P35 `455/455` pass before the
sole main failure at `lib/flow/seed-flows.test.ts:1290` leaves main `624/625` for
`30` records past `review_due:2026-05-21`. CI build was skipped after that failure,
while the local `18`-page build remains PASS. Vercel deployment
`dpl_2kkCE8tKVBxDfDb9gmxGNKG2UPhU` is READY/SUCCESS at the stable Preview. Merge
and Production remain unapproved; observed users remain `0`.

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
