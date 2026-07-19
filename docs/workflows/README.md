# FLOW Collaboration Workflows

These workflows turn repeated FlowMe collaboration patterns into stable, tool-independent procedures. They compose the existing harness, skills, scripts, hooks, CI, repo memory, and optional Notion projection instead of creating a second operating system.

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

## P0 Workflows

| Workflow | Primary trigger | Deterministic entry | Agent skill |
| --- | --- | --- | --- |
| [Session Start](./session-start.md) | Start, resume, or reorient repo work | `npm run workflow:session-start` | `flow-session-start` |
| [Request Interview](./request-interview.md) | Material ambiguity could change the requested outcome or scope | None; clarification requires judgment | `flow-request-interview` |
| [Direction Capture](./capture-direction.md) | A conversation changes product or process direction | None; classification requires judgment | `flow-direction-capture` |
| [Work Closeout](./work-closeout.md) | Finish, hand off, publish, or report work | `npm run workflow:closeout` | `flow-work-closeout` |

## Layer Ownership

- `docs/workflows/`: canonical tool-independent procedure.
- `.agents/skills/`: discoverable agent entrypoints; `.claude/skills/` is generated.
- `scripts/workflows/`: deterministic, read-only repo inspection.
- `.githooks/` and `.github/workflows/`: commit, push, and CI enforcement.
- `docs/DECISIONS.md`, `docs/IDEAS.md`, `docs/specs/`, `docs/STATUS.md`: canonical project memory.
- Notion: selective human-facing projection when the connector is available.

Do not duplicate detailed product rules in workflow documents. Link to the existing canonical document and read the current worktree before acting.
