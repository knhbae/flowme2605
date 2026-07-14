---
name: flow-work-closeout
description: Close, hand off, commit, publish, or report FlowMe work with scoped diff ownership, risk-based verification, canonical memory updates, and explicit local/commit/push/PR/merge/deploy status. Use before saying work is done, preparing a handoff, or performing requested GitHub and release actions.
---

# FLOW Work Closeout

1. Read [the canonical workflow](../../../docs/workflows/work-closeout.md).
2. Run `npm run workflow:closeout`, then inspect the actual scoped diff. In a mixed worktree, pass `-- --scope=path,path`. The report recommends checks but runs none.
3. Separate this task's files from pre-existing or concurrent changes. Never stage everything by default.
4. Run verification based on blast radius and report every pass, failure, and skip from the current worktree.
5. Apply `flow-direction-capture` to material decisions or deferred ideas and update current behavior/status docs only when needed.
6. Update Notion only for human gates or high-level packages touched by the task.
7. Commit, push, open/merge a PR, or deploy only when requested; verify each external state rather than inferring it.
8. Report local edits, verification, commit, push, PR, merge, deploy, and observed-user evidence separately.

For overall MVP or launch readiness, also use `flow-release-readiness`. Never call automated QA user validation.
