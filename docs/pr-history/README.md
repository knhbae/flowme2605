# PR History

This directory records pull-request-level work history. It sits between `docs/IDEAS.md` and `docs/HISTORY.md`:

- `docs/IDEAS.md`: unresolved or deferred ideas that are not committed work.
- `docs/pr-history/`: what changed in each PR, why, what was not done, and how it was verified.
- `docs/HISTORY.md`: released changes only.

## When To Write

Create or update one PR history file before opening a PR, and update it again when the PR is deployed, merged, reverted, or materially rescoped.

Use this naming pattern:

```text
docs/pr-history/YYYY-MM-DD-short-topic.md
```

Examples:

```text
docs/pr-history/2026-05-22-flow-ux-ui-p0.md
docs/pr-history/2026-05-23-pr-history-policy.md
```

## Required Sections

Each entry should include:

- PR title, date, branch, PR URL, status, and deploy URL when available.
- Why: the user/product reason for the PR.
- What changed: the major implementation, UX, content, or documentation changes.
- Not done: intentionally excluded work, unfinished follow-ups, or scope cuts.
- Decisions: product, UX, architecture, or risk decisions that future agents should not rediscover.
- Files touched: the important files, not every generated or incidental file.
- Verification: commands, browser checks, screenshots, and deployment smoke tests.
- Risks: residual risk, rollback notes, and anything that needs manual review.
- Follow-ups: next PRs, issues, or `docs/IDEAS.md` candidates.
- Links: PR, Vercel deploy, screenshots, related docs, or source references.

## Status Values

Use one or more of:

- `Draft`
- `Open`
- `Merged`
- `Deployed`
- `Reverted`
- `Superseded`

If work is deployed before a PR is opened, say that explicitly. Do not imply that an unmerged change is released through the normal PR path.

## Relationship To PR Body

The GitHub PR body should summarize the same information, but this directory is the durable repository memory. If the two differ, update this file with the final truth before merge.
