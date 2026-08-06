# QA Record

**Status:** In progress

## Current Evidence

- Session-start reporter: passed on 2026-08-06.
- Git worktree and branch inventory: completed.
- P35 ancestry: the earlier candidate `29cb03a` is an ancestor of correction
  head `5cbf2b3`; the design-handoff branch is separate.
- GitHub authentication: available.
- Draft PR #166: documentation, unit, and build job passed after preserving four
  previously ignored P0-02 screenshots in the repository; Playwright E2E is
  still running.
- PR #164: required checks passed and the planning/evidence package was merged.
- Text Authoring preservation branch: `docs:check`, 594 tests, and production
  build passed before push.
- Content-review archive branch: `docs:check`, 519 tests, and production build
  passed before push. Its older dependency baseline reports four high-severity
  audit findings and remains an archive rather than a release branch.
- Skill synchronization and `docs:check`: passed after the operations package
  was split; 16 required files and 3,686 local links were verified.
- Scheduling deck generator: `node --check` passed after relocation from
  `.tmp` to `scripts/content-audit/`.

## Required Before Closeout

- PR #166 required checks pass, or an exact blocker is recorded.
- `npm.cmd run skills:sync` after canonical skill changes are finalized.
- `npm.cmd run docs:check` after documentation reconciliation.
- `git diff --check` and scoped diff inspection.
- Fresh `npm test` and `npm run build` on the durable production baseline.
- Browser/E2E scope follows the actual runtime diff; prior P35 evidence is not
  relabeled as a current command run.
- Observed-user sessions remain reported separately.
