# FlowMe Workspace And Backlog Stabilization

**Date:** 2026-08-06  
**Status:** In progress  
**Owner:** Product owner with AI operations support

## Goal

Restore one trustworthy project state before another product slice starts. The
work protects every unfinished stream, integrates the source already deployed
as P35 Round 2, reconciles the active backlog, and identifies cleanup and
refactoring that can proceed without losing evidence or changing product
behavior accidentally.

## Current Truth

- Production is sourced from P35 Round 2 commit `f97644a`, but that source is
  not yet merged to `main`.
- Draft PR [#166](https://github.com/knhbae/flowme2605/pull/166) is the only
  integration path for the P35 Round 2 correction branch. Its earlier
  candidate branch is an ancestor and must not be merged separately.
- The prior `main` changes are isolated on
  `codex/workspace-backlog-stabilization-20260806`.
- Text Authoring is preserved at commit `a5d5338` and pushed on its existing
  branch. It remains a separate paused stream until explicitly promoted.
- The detached content-review worktree is now attached to
  `archive/flow-content-user-review-wip-20260806`; its review package is
  preserved at commit `0d27143` and is not a publication candidate.
- Draft PR #164 was merged as planning evidence. It does not replace or
  validate the P35 Round 2 runtime integration in PR #166.
- Reproducible `.tmp` output was removed after the unique scheduling-deck
  generator was retained under `scripts/content-audit/`.
- Product refactoring is deferred until the production source is durable on
  `main`, the worktree is clean, and a fresh verification baseline exists.

See [inventory.md](./inventory.md) for the evidence snapshot and disposition
of each worktree.

## In Scope

- Inventory and ownership classification for every worktree and dirty path.
- Loss prevention for detached and uncommitted work.
- One reviewed integration path for the deployed P35 Round 2 source.
- Explicit disposition for the older P35 candidate and design-handoff PR.
- Separation of operations/harness, research, project-control, and temporary
  output changes.
- Reconciliation of `PROJECT_CONTROL`, `STATUS`, `ROADMAP`, and the spec index
  after the release branch is integrated.
- Removal only of reproducible temporary output and worktrees whose content is
  merged, remotely archived, or otherwise preserved.
- A fresh docs, unit, build, and risk-based browser baseline before refactoring.

## Out Of Scope

- New product functionality or another UX redesign.
- Broad `AppClient` rewrite while the production branch is unresolved.
- Implicit promotion or completion of Text Authoring.
- Deletion of research evidence, user work, raw review inputs, or unknown files.
- Claims of observed-user validation; the current count remains `0`.

## Workstream Rules

1. Preserve first; delete only after merge, remote archive, or byte-verifiable
   reproduction is confirmed.
2. Treat P35 Round 2 correction as the only product integration candidate.
3. Keep Text Authoring and content review separate from P35 and project-control
   maintenance.
4. Publish project-control documents last so they describe the final Git and
   release state rather than an intermediate snapshot.
5. Start refactoring only through one approved product slice or one explicit
   no-behavior-change extraction with coverage.

## Acceptance Criteria

- Every worktree has a named branch, owner state, preservation state, and next
  action.
- The deployed P35 source has one PR and is either merged with green checks or
  recorded with an exact blocker.
- No superseded P35 branch is merged independently.
- Text Authoring and content review are preserved without being promoted.
- Current canonical documents agree on one operational gate and at most one
  next product slice.
- Temporary output and redundant worktrees are removed only after their safety
  conditions are met.
- Verification results are recorded in [qa.md](./qa.md), with automated QA kept
  separate from observed-user evidence.
