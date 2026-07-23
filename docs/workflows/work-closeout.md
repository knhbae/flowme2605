# Work Closeout Workflow

## Trigger

Use before ending a substantial task, handing work to another session or agent, committing, pushing, opening or merging a PR, deploying, reporting overall status, answering "is it done?", or separating scope in a mixed worktree.

Skip the reporter for a clear answer or tiny local change when the scoped diff and targeted verification are already explicit. Never skip actual diff inspection or required verification.

## Inputs

- Current user request and publish boundary
- `git status`, scoped diffs, branch, HEAD, and upstream relation
- Verification results produced in the current run
- Relevant spec, status, service structure, decision, PR history, and review artifacts
- Any external state such as CI, PR, merge, deployment, or observed-user evidence

## Steps

1. Run `npm run workflow:closeout` to inventory changed paths and recommended verification lanes. In a mixed worktree, pass comma-separated prefixes with `npm run workflow:closeout -- --scope=docs/workflows,scripts/workflows` so recommendations use only the intended slice while the report still shows the full-worktree summary.
2. Review the actual diff. Separate this task's files from pre-existing or concurrent changes; do not infer ownership from modification time alone.
3. Run targeted checks first, then the broader checks required by blast radius. The report recommends commands but does not run or certify them.
4. Update canonical documentation only where the implementation changed current behavior, direction, active status, or release truth.
5. Apply the Direction Capture workflow to material decisions or deferred ideas discovered during the task.
6. Update Notion only for human gates or high-level work packages touched by the task.
7. If publishing was requested, create intentional commit groups, push the correct branch, inspect CI/PR state, and record merge/deploy evidence. Never include unrelated dirty files merely because they are present.
8. Report local edits, verification, commit, push, PR, merge, deploy, and observed-user status separately.

## Human Gate

Require explicit user intent for destructive cleanup, ambiguous inclusion of others' changes, production deployment, or product decisions not already settled. A generic "finish" request does not authorize claiming user validation or silently broadening commit scope.

## Outputs

- Scoped change summary with file links
- Verification commands and pass/fail/skip reasons
- Explicit publish-state ledger
- Remaining risks, human actions, and next checkpoint

## Verification

Use the current repo's QA matrix. Typical lanes are:

- Docs, policy, workflow, or skill: `npm run docs:check`
- Logic or scripts: `npm test`
- Runtime, dependencies, or build configuration: `npm run build`
- User-facing flow: targeted/full `npm run test:e2e` plus browser inspection
- Dependency or release tooling: `npm run security:audit`

Do not report a check as passed unless it ran successfully in the current worktree.

## Memory Update

Update `docs/STATUS.md` for current state, `docs/SERVICE_STRUCTURE.md` for route/architecture changes, the relevant spec for accepted scope, and `docs/pr-history/` plus `docs/HISTORY.md` only when the corresponding publish/release event exists.
