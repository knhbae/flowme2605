# Development Cycle

This cycle mirrors the referenced harness guide while staying AI-agnostic.

## 1. Status

Read:

```powershell
Get-Content -Raw AGENTS.md
Get-Content -Raw agent.md
Get-Content -Raw docs/STATUS.md
Get-Content -Raw docs/ROADMAP.md
Get-Content -Raw docs/IDEAS.md
git status --short --branch
```

Confirm current focus, branch, dirty files, and required verification.

## 2. Issue / Scope

For new work, define:

- User-visible goal
- Files likely to change
- Product constraints from `agent.md`
- Verification commands
- Out-of-scope items
- Deferred ideas from `docs/IDEAS.md` that should influence or stay out of scope

Keep detailed specs in `docs/superpowers/specs/` or a tracker issue. Keep `docs/ROADMAP.md` short.

If a useful idea appears during implementation but is not part of the current scope, append it to `docs/IDEAS.md` instead of expanding the task.

## 3. Plan

For multi-step work, write a plan with:

- Parallel vs sequential tasks
- Exact files
- Tests to add or update
- Browser/manual checks
- Commit or PR boundary

Small documentation-only changes may use a short inline plan.

## 4. Implement

Follow existing patterns. Keep edits scoped. Preserve user changes.

For behavior changes:

1. Write or update a failing test where practical.
2. Implement the smallest change that passes.
3. Run targeted tests.
4. Run broader checks required by [QA.md](./QA.md).

For documentation/config-only changes, verify with file inspection and project commands that are relevant.
For agent or docs graph changes, run `npm run docs:check`.

## 5. QA

Use [QA.md](./QA.md). Do not move to PR/release until required checks pass or skipped checks are explicitly explained.

## 6. PR / Review

Before opening a PR, create or update a PR history entry under `docs/pr-history/` using the naming pattern:

```text
docs/pr-history/YYYY-MM-DD-short-topic.md
```

Package changes with:

- Summary
- Related roadmap/spec/issue links
- PR history file link
- Test evidence
- Known risks
- Not-done items and follow-ups

Review independently. If the same AI implemented the work, switch to reviewer stance and look for failure modes first.

After the PR is opened, update the PR history entry with the PR URL/number. If the PR is deployed, merged, reverted, or materially rescoped, update its status, deploy URL, smoke-test result, risks, rollback notes, and follow-ups.

## 7. Release

On release:

1. Confirm clean working tree except intended release changes.
2. Confirm tests/build/required browser checks.
3. Tag the release.
4. Update `docs/STATUS.md`, `docs/ROADMAP.md`, and `docs/HISTORY.md`.
5. Record user-facing changes and verification evidence.

## 8. Deploy

Before deployment:

- Confirm target environment and branch.
- Run production build.
- Deploy.
- Smoke test the deployed URL.
- Record rollback notes when relevant.
- Update the matching `docs/pr-history/` entry with deploy URL, smoke-test evidence, and rollback notes.
