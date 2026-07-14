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
- [x] P24-00F3A recurrence occurrence parity.
  - [x] Source routine 4-week Calendar occurrence expansion.
  - [x] Per-occurrence completion and reopen state.
  - [x] Standard bounded RRULE export with stable series UID.
  - [x] Visible-month navigation no longer snaps back to the execution range.
  - [x] Occurrence rows replace ambiguous whole-Flow `0/1` progress with current occurrence state.
- [x] P24-00F3B memo split Item inclusion and empty draft validation.
  - [x] Dated memo drafts retain scheduled and unscheduled source-owned Items in My Flow.
  - [x] Reload and whole-Flow list export preserve every split Item.
  - [x] Calendar continues to include only scheduled Items.
  - [x] Empty miss requests stay unsaved and status copy never becomes an executable title.
- [x] P24-00F4 hard navigation and post-save hydration.
  - [x] Clean production `/flows` hard navigation/reload resolves 7/7.
  - [x] Repeated public save hydrates the matching My Flow 5/5.
  - [x] Dirty dependency/dev findings remain separated from clean baseline evidence.
  - [x] No speculative app-code change when the defect is not reproducible.

## UX Simplification

- [x] P24-00U1 inline completion undo and one occurrence/one control.
- [x] P24-00U2 progressive editor and intent-aware fields.
- [x] P24-00S1 date movement pure contract.
- [x] P24-00U3 Calendar unscheduled tray.
- [x] P24-00S2 export scope contract and shared multi-select.
- [x] P24-00U4 inline notes and reflection aggregation.

## Operations and Observation

- [x] P24-00OPS1 public observation URL.
- [x] P24-00OPS2 controlled dependency upgrade with high `0`, bounded-shard full E2E, rollback evidence, and 390px/1024px capture.
- [x] Prepare the P24-00B1 two-person first-session run kit with fixed routes, tasks, hint ladder, stop rules, and evidence templates.
- [x] Recheck merged production at 390px/1024px against the exact Claude Design `(8)` A-G structure and publish the P24-00B2 design-readiness watchpoints.
- [ ] Execute P24-00B1 with two real participants; current count `0 / 2`.
- [ ] Independent Claude Code regression on the same commit and lockfile.
- [ ] P24-00B 15 observed sessions.
- [ ] P24-00C keep/change/defer review.
- [-] P24-01A source v2 merge until P24-00C.

## Documentation Sync Register

The earlier dirty-worktree ownership block is closed on merged `main`; keep future sync changes scoped to their own commits.

- [x] Update `docs/STATUS.md` to the P24 completion gate.
- [x] Replace the old P23/P24 ordering in `docs/ROADMAP.md`.
- [x] Add this spec to `docs/specs/README.md`.
- [ ] Add only settled interaction rules to `docs/DECISIONS.md` after P24-00C; do not record design proposals as decisions now.
- [ ] Project only the active human gates to Notion when the connector and canonical GitHub links are available.
