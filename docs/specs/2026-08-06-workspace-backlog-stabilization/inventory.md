# Workspace Inventory

**Captured:** 2026-08-06  
**Base default branch at capture:** `main` / `c09f859`

## Worktrees

| Worktree | Branch / head | State | Classification | Next action |
| --- | --- | --- | --- | --- |
| `flow-mvp` | `codex/workspace-backlog-stabilization-20260806` / package commits after `c09f859` | Project-control reconciliation remains local | Active operations, research, and project-control maintenance | Reconcile after P35 integration |
| `flow-p35-round2-correction-pprime2` | `codex/p35-round2-correction-pprime2-20260805` / `cddf1c4` | Clean, pushed, Draft PR #166; docs/unit/build green and E2E running | Deployed product integration candidate | Merge only after all required checks pass |
| `flow-p35-production-mobile-p0` | `codex/p35-round2-candidate-20260805` / `29cb03a` | Clean, pushed, no PR | Superseded ancestor of PR #166 | Keep until PR #166 is settled, then remove worktree |
| `flow-p35-claude-design-handoff` | `agent/p35-mobile-design-handoff` / `965eb54` | Clean; PR #164 merged as planning evidence | Closed evidence stream | Remove the redundant worktree |
| `flow-text-authoring-ta` | `codex/text-authoring-ta-implementation-20260729` / `a5d5338` | Clean, committed, pushed | Paused implementation stream | Remove the local worktree; promote the branch only by explicit decision |
| `flow-content-logic-final` | `archive/flow-content-user-review-wip-20260806` / `0d27143` | Clean, committed, pushed | Paused content-review WIP | Remove the local worktree; review before any publication |

## P35 Release Boundary

- Production deployment source: `f97644abf379c46433847f44aa7bd4da7fadac4a`.
- Branch closeout head: `5cbf2b3c7d291550d1a8a954bba57fcb9436177a`.
- Draft integration PR: [#166](https://github.com/knhbae/flowme2605/pull/166).
- The PR changes 518 files with 76,081 additions and 5,321 deletions.
- Recorded release evidence is extensive, but production smoke, fresh
  independent P-prime-prime review, and observed-user validation remain
  `NOT_RUN`.

## Former-Main Change Packages

| Package | Typical paths | Disposition |
| --- | --- | --- |
| Agent operations and harness | `AGENTS.md`, `agent.md`, `.agents/skills/`, `.claude/skills/`, `docs/harness/`, `docs/workflows/`, `scripts/check-docs.mjs` | Coherent operations package; verify generated skill copies |
| Collaborative authoring research | `2026-07-29-flowme-collaborative-*`, matching spec and JSON ledgers | Research package; no runtime claim |
| Calendar, progress, and experience research | 2026-07-29 through 2026-08-04 reports, PPTX, assets, source ledgers | Split by topic where review remains possible |
| Project control | `PROJECT_CONTROL`, `STATUS`, `STATUS_HISTORY`, `ROADMAP`, `DECISIONS`, `IDEAS`, spec index | Publish last after Git and release state settle |
| Temporary output | `.tmp/` had 500 files, about 35.5 MiB | Removed after preserving the unique scheduling-deck generator; `/.tmp/` is now ignored |

## Preservation Commits

- `88058e8`: agent operations and knowledge-maintenance harness.
- `269d777`: collaborative authoring strategy.
- `80fc139`: progress and content evaluation reports.
- `f3ee6ab`: AI scheduling strategy sources and retained generator.
- `c99fcdc`: P35 mobile planning review.
- `8e83248`: experience-loop and governance strategy.
- `a5d5338`: paused Text Authoring implementation state, pushed on its own
  branch.
- `0d27143`: paused content-review package, pushed on its archive branch.

## Refactoring Gate

The P35 Round 2 production branch has an approximately 27,098-line
`components/flow/AppClient.tsx`. This is a real maintenance hotspot, but it is
not the first stabilization action. Refactoring starts only when:

1. the deployed source is durable on `main`;
2. the worktree and current status are reconciled;
3. a fresh baseline is green; and
4. one route-owned extraction has explicit behavior-preservation tests.

The first candidate should be the route surface touched by the next approved
product slice, not a whole-file rewrite.
