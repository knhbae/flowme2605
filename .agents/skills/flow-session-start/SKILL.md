---
name: flow-session-start
description: Establish a broad or resumed FlowMe repo baseline. Use after context loss, for overall status/release/"what next" work, or when a mixed or unclear worktree needs Stage, branch, ownership, evidence, and verification orientation. Skip clear low-risk tasks with obvious scope.
---

# FLOW Session Start

1. Work from the `flow-mvp` repo root and read [the canonical workflow](../../../docs/workflows/session-start.md).
2. Run `npm run workflow:session-start`. Use `-- --json` only when structured composition is useful.
3. Read `AGENTS.md` and `agent.md`, then use their task routes to select only the status, decision, idea, spec, diff, and evidence relevant to the request.
4. Treat every pre-existing dirty path as unowned. Never revert, stage, or include it without task evidence.
5. Separate product-validation Stage, implemented capability, automated QA, deployment, and observed-user evidence.
6. State scope, assumptions, likely files, verification lane, and out-of-scope items before edits. Create a plan for substantial work.

The reporter is read-only and does not replace judgment. Do not present its output as a current product verdict until the request-relevant documents and diffs have been inspected. Do not run it merely because a task exists.
