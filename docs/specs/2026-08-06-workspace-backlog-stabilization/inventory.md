# Workspace Inventory

**Captured:** 2026-08-06  
**Base default branch at capture:** `main` / `c09f859`

## Initial Worktrees And Final Disposition

| Worktree | Branch / head | State | Classification | Next action |
| --- | --- | --- | --- | --- |
| `flow-mvp` | `codex/workspace-backlog-stabilization-20260806` during publication | The only remaining worktree | Operations, research, and project-control maintenance | Merge the stabilization PR, then return this checkout to clean `main` |
| `flow-p35-round2-correction-pprime2` | `codex/p35-round2-correction-pprime2-20260805` / `96201a3` | PR #166 merged as `2af4c92`; worktree removed | Released source integration | Preserve remote/Git history only |
| `flow-p35-production-mobile-p0` | `codex/p35-round2-candidate-20260805` / `29cb03a` | Confirmed ancestor of PR #166; worktree removed | Superseded immutable P′ evidence | Preserve remote/Git history only |
| `flow-p35-claude-design-handoff` | `agent/p35-mobile-design-handoff` / `965eb54` | PR #164 merged as planning evidence; worktree removed | Closed evidence stream | Preserve merged history |
| `flow-text-authoring-ta` | `codex/text-authoring-ta-implementation-20260729` / `a5d5338` | Clean, committed, pushed; worktree removed | Paused implementation stream | Promote only by explicit owner decision |
| `flow-content-logic-final` | `archive/flow-content-user-review-wip-20260806` / `0d27143` | Clean, committed, pushed; worktree removed | Paused content-review WIP | Review before any publication |

## P35 Release Boundary

- Production deployment source: `f97644abf379c46433847f44aa7bd4da7fadac4a`.
- Final correction-branch test head: `96201a3`.
- Merged integration PR: [#166](https://github.com/knhbae/flowme2605/pull/166),
  merge `2af4c92407925cb0643e20c2c22c6e8c5b8b0f64`.
- The PR changes 518 files with 76,081 additions and 5,321 deletions.
- Final GitHub run `31074433364` passed Docs, Unit, Build, and Playwright
  `533/533` with no failed or flaky scenario.
- Recorded release evidence is extensive, but production smoke, fresh
  independent P′′ review, and observed-user validation remain `NOT_RUN`.

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
- `f3cc6c4`: stable project-control surface before P35 integration.
- `a5d5338`: paused Text Authoring implementation state, pushed on its own
  branch.
- `0d27143`: paused content-review package, pushed on its archive branch.

## Final Cleanup State

- One worktree remains: `D:/flowme2605/flow-mvp`.
- The former `.tmp` tree contained 500 generated files, about 35.5 MiB. It was
  removed after the unique scheduling-deck generator was retained at
  `scripts/content-audit/build-ai-calendar-task-scheduling-strategy-deck.mjs`;
  repository-root `/.tmp/` is ignored.
- No user work, raw review input, research evidence, or unknown dirty path was
  deleted.

## Refactoring Gate

The P35 Round 2 production branch has an approximately 27,098-line
`components/flow/AppClient.tsx`. This is a real maintenance hotspot, but it is
not the first stabilization action. Refactoring starts only when:

1. the deployed source is durable on `main`;
2. the worktree and current status are reconciled;
3. a fresh baseline is green; and
4. one route-owned extraction has explicit behavior-preservation tests.

If the next approved slice touches Calendar or My Flow, the first candidate is
the pure date formatting, scope/marker/focus, filtering, and sorting block used
by the My Flow calendar presentation. Extract it to
`lib/flow/my-flow-calendar-view-model.ts` and preserve behavior with the
existing Calendar/My Flow unit and P35 E2E coverage. If the next slice touches
another route, extract that route's pure block instead. Do not start a whole
`AppClient.tsx` rewrite.
