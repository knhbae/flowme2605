# FlowMe Workspace And Backlog Maintenance Inventory

**Captured:** 2026-08-29 KST  
**Maintenance baseline:** `origin/main@db74a36cbf2325573b2d696589daa659619e50f2`  
**Maintenance branch:** `codex/workspace-status-maintenance-20260829`  
**Scope:** read-only inventory, canonical status reconciliation, and removal of clean merged worktrees only

> Historical snapshot. Continue with the [2026-09-07 preservation and work register](./2026-09-07-flowme-preservation-and-work-register.md), which retains this baseline and adds Personal Workspace, newer Text Authoring, planning, and local-backup state.

## Verdict

The released product baseline is healthy enough to continue, but workspace and knowledge state drifted after PR #194, #196, and #195 merged. Canonical documents still described PR #195 as pending, the primary checkout mixed policy, strategy, skill, report, and test changes, and 24 worktrees remained registered. This maintenance pass does not promote a product program or absorb dirty work into `main`.

## Current Release Truth

- PR #196 merged source refresh as `8c0bfd8de9fb8877c4045b2c3f725b60ca236843`.
- PR #194 merged visual refresh as `c8a57ba37c4087b84b526bc778c3604f68299faa`.
- PR #195 final head `bf11ce250be8df0b438087febe4068713c2783be` merged as `db74a36cbf2325573b2d696589daa659619e50f2`.
- PR #195 exact-head CI run `32588338583` and post-merge `main` run `32589202555` passed both required jobs.
- Production deployment record `6039611238`, status `17168906607`, succeeded for the exact merge source.
- The direct deployment URL and canonical alias returned HTTP `200` on 2026-08-29.
- Canonical Production smoke is `NOT_RUN`; observed users remain `0`.

## Worktree Inventory

Initial count: `24` worktrees, `13` dirty and `11` clean.

### Clean Merged Removal Candidates

These worktrees were clean and their corresponding PRs were merged. Their paths were resolved under `D:\flowme2605`, their clean state and merged PR state were rechecked, and they were removed with `git worktree remove` during this maintenance pass.

| Worktree | Branch | Release |
| --- | --- | --- |
| `flow-pr194-reconcile-20260823` | `agent/pr194-reconcile-20260823` | PR #194 merged |
| `flow-pr195-reconcile-20260823` | `agent/pr195-ci-fix-20260823` | PR #195 merged |
| `flow-source-freshness-refresh-20260822` | `agent/source-freshness-refresh-20260822` | PR #196 merged |

After creating the dedicated maintenance worktree and removing these three paths, `git worktree list` contains `22` worktrees. The removal did not delete branches or remote history.

### Clean Worktrees That Must Stay For Now

| Group | Worktrees | Reason |
| --- | --- | --- |
| Open Text Authoring stack | `flow-text-authoring-pr-p0-20260813`, `flow-text-authoring-pr-p1-c-20260813`, `flow-text-authoring-pr-p1-e-20260813`, `flow-text-authoring-pr-p1-g-20260813` | Draft PR #184-#187 remain open as a reference-only stack. |
| Closed integration with unique local work | `flow-text-authoring-integration-20260811` | PR #175 is closed, but local commit `5ef186d4` is one commit ahead of its upstream. |
| Local-only Text Authoring branches | `flow-text-authoring-p1-c-longform-20260813`, `flow-text-authoring-p1-e-source-update-20260813`, `flow-text-authoring-p1-g-linked-lineage-20260813` | No upstream is configured and the local heads are not ancestors of the matching open-PR branches. Preserve until commit equivalence is audited. |

### Dirty Worktrees Preserved Without Modification

| Worktree | Dirty paths | Classification |
| --- | ---: | --- |
| `flow-mvp` | 25 | Mixed policy, strategy, skill, report, spec, and test state |
| `flow-ai-plan-complaints-research-20260820` | 3 | Research package |
| `flow-next-review-20260823` | 1 | Decision-board package |
| `flow-plan-edit-trash-structure-unification-20260813` | 39 | Runtime and documentation implementation |
| `flow-platform-cold-start-strategy-20260824` | 7 | Strategy research |
| `flow-platform-strategy-report-restore-20260813` | 19 | Recovered and generated strategy artifacts |
| `flow-r3b-before-after-report` | 25 | Runtime, QA, and report work |
| `flow-text-authoring-flow-view-hybrid-ux-poc-20260828` | 93 | Draft PR #198 follow-up plus local PoC work |
| `flow-text-authoring-flow-view-poc-20260824` | 38 | Draft PR #197 plus local PoC work |
| `flow-text-authoring-review` | 68 | Preserved Text Authoring implementation and review |
| `flow-v37-evaluation-20260823` | 2 | UX evaluation package |
| `flow-v39-s1-prototype-20260826` | 6 | Isolated prototype package |
| `flow-vertical-ecosystem-strategy-20260822` | 5 | Strategy research package |

No dirty worktree is approved for removal, reset, merge, rebase, staging, or cleanup in this pass.

## Primary Checkout Mixed State

The original `flow-mvp` checkout is on `agent/flow-entry-preview-clarity@7650faa2`, behind its upstream by 8 commits. Its 25 dirty paths contain:

- uncommitted `docs/DECISIONS.md` and `docs/IDEAS.md` changes;
- an untracked canonical/generated `strategy-red-team` skill pair;
- 19 recent content-audit report or asset paths, including the 2026-08-28 Today strategy board;
- one untracked content-review spec;
- `tests/e2e/helpers/my-flow-library.ts`, which requires an ownership check before any staging.

These paths remain preserved in place. They are evidence or candidate work, not part of this maintenance branch.

## Open PR Inventory

There are `12` open PRs.

| Class | PRs | Disposition |
| --- | --- | --- |
| Reference-only Text Authoring stack | #184, #185, #186, #187 | Keep open until the Owner chooses whether the newer Flow View PoC supersedes this stack. Do not merge into Production by default. |
| Newer isolated Flow View PoC stack | #197, #198 | Keep as the current isolated PoC review lane. Its dirty worktrees must be preserved. |
| Dependency updates | #188, #189, #190, #191, #192, #193 | Review as one dependency-maintenance batch after the product baseline is stable. Do not auto-merge React, Playwright, build, and workflow changes independently. |

## Backlog State

- No product gate is active after the PR #195 release.
- Flow-derived Today and longitudinal-use preparation are decision candidates, not active implementation.
- Text Authoring PR #184-#187 is a reference-only stack; PR #197-#198 is a newer isolated PoC stack.
- Recent platform, creator, experience, and cold-start reports remain evidence inputs until their untracked files are preserved through a separately owned documentation change.
- The next Owner decision must select exactly one product program. Parallel research shelves do not become an execution queue through age or polish.

## Safe Next Decisions

1. Select one next product gate: longitudinal-use readiness, Flow-derived Today, isolated Text Authoring continuation, or another explicitly named program.
2. Decide whether PR #197-#198 supersedes PR #184-#187 after comparing their boundaries and retained evidence.
3. Audit the four unique/local Text Authoring branches before removing any clean but unmerged worktree.
4. Review dependency PR #188-#193 as a controlled batch with security audit, tests, build, and browser regression.

## Evidence Boundary

This inventory records repository, GitHub, CI, deployment, and HTTP evidence. It does not prove canonical Production journey smoke, observed usability, longitudinal use, or product-market fit.

## Maintenance Result

- Canonical status, roadmap, project-control, spec index, release history, and PR #194-#196 evidence were reconciled on the dedicated maintenance branch.
- `npm run docs:check` passed, including skill synchronization and `4,583` local Markdown links.
- `git diff --check` passed; no runtime file changed, so product tests and a local build were not rerun.
- This maintenance branch remains local. No commit, push, PR, or merge is part of this pass without separate authorization.
