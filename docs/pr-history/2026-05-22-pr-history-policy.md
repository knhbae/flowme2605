# PR: PR History Policy

- Date: 2026-05-22
- Branch: `codex/implement-flow-builder-mvp`
- PR: https://github.com/knhbae/flowme2605/pull/6
- Status: `Open`
- Deploy URL: Not deployed separately

## Why

The repository already had release history and SDLC guidance, but it did not have a durable place to record PR-level context: major changes, decisions, missing work, verification evidence, deployment URLs, and rollback notes.

This matters because FLOW work often includes UX/content judgment. Future agents and humans need to know what was intentionally excluded, not only what changed.

## What Changed

- Added `docs/pr-history/README.md` as the durable PR history policy.
- Added this policy PR history entry.
- Added a history entry for the current Flow UX/UI P0 work.
- Added `.github/pull_request_template.md` so GitHub PRs follow the same structure.
- Updated `agent.md` documentation memory to include `docs/pr-history/`.
- Updated `docs/harness/README.md` to list the PR history document.
- Updated `docs/harness/SDLC.md` to require PR history before PR opening and updates after deploy/merge/revert.

## Not Done

- No automation to enforce PR history file creation.
- No GitHub Action to compare PR body and PR history.
- No backfill for older work beyond the current UX/UI P0 entry.
- No release-history update, because this is process documentation rather than a tagged release.

## Decisions

- Kept PR history separate from `docs/HISTORY.md` so release notes remain concise.
- Kept deferred ideas in `docs/IDEAS.md`; PR history records scoped work and scope cuts.
- Chose one Markdown file per PR because it is easy to review, link, and update.
- Allowed "deployed before PR" as an explicit status because that already happened in this session.

## Files Touched

- `docs/pr-history/README.md`
- `docs/pr-history/2026-05-22-flow-ux-ui-p0.md`
- `docs/pr-history/2026-05-22-pr-history-policy.md`
- `.github/pull_request_template.md`
- `agent.md`
- `docs/harness/README.md`
- `docs/harness/SDLC.md`

## Verification

- `npm run docs:check` passed.
- `git diff --check` passed.

## Risks

- The process depends on human/agent discipline until automation exists.
- PR history can become noisy if entries include every small code detail instead of decisions, evidence, risks, and follow-ups.

## Follow-ups

- Consider a docs check rule that warns when changed files exist without a matching `docs/pr-history/*.md` entry.
- Backfill important prior PRs only if they contain decisions that future work needs.

## Links

- PR history policy: [README.md](./README.md)
- FLOW SDLC: [../harness/SDLC.md](../harness/SDLC.md)
