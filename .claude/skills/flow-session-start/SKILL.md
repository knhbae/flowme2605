---
name: flow-session-start
description: Establish the current FlowMe repo baseline before starting or resuming work. Use for new sessions, context switches, broad "what next" requests, dirty-worktree orientation, or any task that needs current Stage, branch, changed-file, evidence, and verification context before editing.
---

# FLOW Session Start

1. Work from the `flow-mvp` repo root and read [the canonical workflow](../../../docs/workflows/session-start.md).
2. Run `npm run workflow:session-start`. Use `-- --json` only when structured composition is useful.
3. Read `AGENTS.md`, `agent.md`, current status/decision/idea/spec documents, then the request-relevant diff and newest evidence.
4. Treat every pre-existing dirty path as unowned. Never revert, stage, or include it without task evidence.
5. Separate product-validation Stage, implemented capability, automated QA, deployment, and observed-user evidence.
6. State scope, assumptions, likely files, verification lane, and out-of-scope items before edits. Create a plan for substantial work.

The reporter is read-only and does not replace judgment. Do not present its output as a current product verdict until the referenced documents and diffs have been inspected.
