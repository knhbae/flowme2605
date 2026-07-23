# Session Start Workflow

## Trigger

Use when starting or resuming broad FlowMe work, returning after context loss, answering an overall status/release/"what next" request, or separating ownership in a mixed or unclear worktree.

Skip for a clear low-risk answer or local change with obvious ownership. Before any edit, still inspect current Git state even when this workflow is skipped.

## Inputs

- `AGENTS.md`, `agent.md`, and the user's newest request
- Only the status, roadmap, decision, idea, service, tooling, spec, or audit files routed by the request
- Current branch, HEAD/upstream relation, and worktree status
- The user's newest request and any explicit publish boundary

## Steps

1. Run `npm run workflow:session-start` from the repo root.
2. Read the core entry files, then select only request-relevant context from the routes printed by the report.
3. Inspect diffs for files relevant to the request. Treat every pre-existing change as unowned until evidence shows otherwise.
4. Separate current product-validation Stage, implemented capability, automated QA, deployed state, and observed-user evidence.
5. State the task scope, assumptions, likely files, verification lane, and out-of-scope items.
6. For substantial work, create or update a plan before editing.

## Human Gate

Only the user can resolve ambiguous product priorities, approve destructive handling of existing work, supply external access, or authorize publish actions that were not already requested.

## Outputs

- A short baseline update in chat
- A task plan when the work is substantial
- No repo mutation from the deterministic report itself

## Verification

Confirm that the reported branch, HEAD, upstream, changed-path counts, and required documents match direct git and filesystem evidence. Do not reuse an earlier session report as current evidence.

## Memory Update

Session start normally writes nothing. Update repo memory only after the task changes a decision, idea, spec, current status, service structure, or released fact.
