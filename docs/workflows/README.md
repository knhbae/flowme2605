# FLOW Collaboration Workflows

These workflows are conditional, tool-independent procedures for collaboration patterns that are costly to reconstruct when they actually occur. They compose the lean harness, skills, scripts, hooks, CI, repo memory, and optional Notion projection; they are not a mandatory lifecycle for every task.

## Workflow Contract

Every workflow defines:

1. Trigger: when to use it.
2. Inputs: evidence required before judgment.
3. Steps: deterministic work and judgment work in order.
4. Human gate: what cannot be decided by automation.
5. Outputs: files, reports, or state changes produced.
6. Verification: commands and evidence required.
7. Memory update: canonical repo documents and optional Notion projection.

Scripts may collect facts and recommend verification. They must not decide product direction, claim user validation, edit Notion, commit, push, merge, or deploy automatically.

## Conditional Workflows

| Workflow | Primary trigger | Deterministic entry | Agent skill |
| --- | --- | --- | --- |
| [Session Start](./session-start.md) | Broad/resumed work, context loss, overall review, or mixed ownership | `npm run workflow:session-start` | `flow-session-start` |
| [Request Interview](./request-interview.md) | Material ambiguity could change the requested outcome or scope | None; clarification requires judgment | `flow-request-interview` |
| [Direction Capture](./capture-direction.md) | A durable direction or actionable deferred item must survive the task | None; classification requires judgment | `flow-direction-capture` |
| [Work Closeout](./work-closeout.md) | Substantial completion, handoff, publish action, status report, or mixed ownership | `npm run workflow:closeout` | `flow-work-closeout` |

Clear low-risk tasks may skip all four workflows. Normal implementation discipline, relevant verification, and dirty-path protection still apply.

## Layer Ownership

- `docs/workflows/`: canonical tool-independent procedure.
- `.agents/skills/`: discoverable agent entrypoints; `.claude/skills/` is generated.
- `scripts/workflows/`: deterministic, read-only repo inspection.
- `.githooks/` and `.github/workflows/`: commit, push, and CI enforcement.
- `docs/DECISIONS.md`, `docs/IDEAS.md`, `docs/specs/`, `docs/STATUS.md`: canonical project memory.
- Notion: selective human-facing projection when the connector is available.

Do not duplicate detailed product rules in workflow documents. Link to the existing canonical document and read the current worktree before acting.
