# P24 Execution Trust and UX Simplification Tasks

## Status Legend

- `[x]` evidence or planning complete
- `[ ]` not started
- `[-]` blocked or intentionally deferred

## Intake and Reconciliation

- [x] Record the eight user feedback items.
- [x] Read the clean-baseline Codex P24-00A journey audit.
- [x] Read the dirty-dev Claude Code P24-00A audit.
- [x] Inspect the current Claude Design `(8)` proposal rather than the stale ZIP root README.
- [x] Compare current package/runtime changes with tracked `a9ae10e`.
- [x] Review official Todoist, Apple Reminders, Google Calendar, Notion, and Carbon patterns.
- [x] Run P24-00R in isolated worktrees.

## P24-00R

- [x] Create clean worktree at `211827d`.
- [x] Install with tracked lockfile and record exact runtime versions.
- [x] Run docs, unit, build, and targeted production E2E; record the full-suite timeout separately.
- [x] Create dependency-upgrade-only worktree from the same commit.
- [x] Apply only package/runtime candidate changes.
- [x] Run the same install/docs/unit/build and `/flows` production smoke matrix.
- [x] Reconcile disputed findings against clean evidence and current code paths.
- [x] Verify Vercel anonymous access without using a signed-in session.
- [x] Publish `reproduction-matrix.json` and the P24-00F1 implementation goal.

## Correctness

- [x] P24-00F1 local date boundary.
- [x] P24-00F2A effective-date summary parity.
- [x] P24-00F2B reuse override transfer.
- [ ] P24-00F3A recurrence occurrence parity.
- [ ] P24-00F3B memo split Item inclusion and empty draft validation.
- [ ] P24-00F4 hard navigation and post-save hydration.

## UX Simplification

- [ ] P24-00U1 inline completion undo and one occurrence/one control.
- [ ] P24-00U2 progressive editor and intent-aware fields.
- [ ] P24-00S1 date movement pure contract.
- [ ] P24-00U3 Calendar unscheduled tray.
- [ ] P24-00S2 export scope contract and shared multi-select.
- [ ] P24-00U4 inline notes and reflection aggregation.

## Operations and Observation

- [ ] P24-00OPS1 public observation URL.
- [ ] Controlled dependency upgrade or explicit rollback decision.
- [ ] Independent Claude Code regression on the same commit and lockfile.
- [ ] P24-00B 15 observed sessions.
- [ ] P24-00C keep/change/defer review.
- [-] P24-01A source v2 merge until P24-00C.

## Documentation Sync Register

The following root files already contain unrelated dirty changes. Do not mix them into this planning commit.

- [ ] Update `docs/STATUS.md` primary focus after existing ownership is resolved.
- [ ] Replace the old P23/P24 ordering in `docs/ROADMAP.md` after existing ownership is resolved.
- [ ] Add this spec to `docs/specs/README.md` after its current uncommitted index changes are committed or discarded by their owner.
- [ ] Add only settled interaction rules to `docs/DECISIONS.md` after P24-00C; do not record design proposals as decisions now.
- [ ] Project only the active human gates to Notion when the connector and canonical GitHub links are available.
