# FlowMe Workspace And Backlog Stabilization

**Date:** 2026-08-06  
**Status:** Complete
**Owner:** Product owner with AI operations support

## Goal

Restore one trustworthy project state before another product slice starts. The
work protects every unfinished stream, integrates the source already deployed
as P35 Round 2, reconciles the active backlog, and identifies cleanup and
refactoring that can proceed without losing evidence or changing product
behavior accidentally.

## Current Truth

- Production remains sourced from P35 Round 2 commit `f97644a` through Vercel
  deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk`; production smoke remains
  `NOT_RUN`.
- [PR #166](https://github.com/knhbae/flowme2605/pull/166) merged the P35 Round
  2 source into `main` as `2af4c92407925cb0643e20c2c22c6e8c5b8b0f64` after
  Docs, Unit, Build, and Playwright `533/533` passed. The merge did not create a
  new production deployment or observed-user evidence.
- The prior dirty `main` changes were isolated, split, and published through
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
- All superseded or paused local worktrees were removed only after merge or
  remote preservation. One active worktree remains.
- Product refactoring remains deferred to the next explicitly approved slice.
  If that slice touches Calendar or My Flow, the first candidate is a pure
  calendar presentation/filter view-model extraction, not a whole
  `AppClient.tsx` rewrite.

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
