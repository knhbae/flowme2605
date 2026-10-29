# FLOW Agent Entry Point

Use this file as the repository map. Product truth stays in linked canonical docs. Skills live in `.agents/skills/`; `CLAUDE.md` adapts this entry point for Claude Code.

## Start

1. Read the request and directly involved files and tests.
2. Inspect Git state before edits; every pre-existing dirty path is unowned.
3. Read [agent.md](./agent.md) for FlowMe product, content, UX, status, release, or broad/ambiguous work. Skip it for clear low-risk local work.
4. Run `npm run workflow:session-start` only for broad, resumed, status/release, or mixed-worktree work.
5. Load only request-routed context.
6. In Codex, honor the selected main-task model; normally use Ultra or Max, with `xhigh` as the minimum unless the user explicitly requests otherwise. Default spawned FlowMe subagents to `gpt-6.1-sol` / `xhigh`; preserve existing chats' model/effort by omitting overrides in authorized messages. See the [effort guide](./docs/TOOLING.md#codex-model-and-effort) without adding a mandatory model-selection phase.
7. For UX, use existing code, local HTML, and browser checks by default; Figma is not in current use and requires an explicit request. See [tool routing](./docs/TOOLING.md#ux-without-figma).

## Routes

| Task | Add this context |
| --- | --- |
| Status, priorities, or next work | [PROJECT_CONTROL.md](./docs/PROJECT_CONTROL.md), [STATUS.md](./docs/STATUS.md), [ROADMAP.md](./docs/ROADMAP.md) |
| Product, content, UX, or policy | [agent.md](./agent.md), [PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md), relevant [DECISIONS.md](./docs/DECISIONS.md), matching skill |
| Report or visual artifact | [flow-report-artifact](./.agents/skills/flow-report-artifact/SKILL.md), then the format skill |
| Bulk copy, archive, generated evidence, or workspace storage review | [flow-workspace-storage](./.agents/skills/flow-workspace-storage/SKILL.md) and [workspace storage workflow](./docs/workflows/workspace-storage.md) |
| Architecture or data ownership | [SERVICE_STRUCTURE.md](./docs/SERVICE_STRUCTURE.md), relevant code and tests |
| Cross-file call or import path still unclear after source search | [flow-code-relationship-map](./.agents/skills/flow-code-relationship-map/SKILL.md) and [Graphify routing](./docs/TOOLING.md#optional-code-relationship-map) |
| Tooling, harness, CI, or release | [TOOLING.md](./docs/TOOLING.md), [harness README](./docs/harness/README.md), specific QA/workflow doc |
| Approved multi-step work | Relevant folder under [docs/specs](./docs/specs/README.md) |

Search large logs before reading them end to end. Read [IDEAS.md](./docs/IDEAS.md) or [REFERENCE.md](./docs/REFERENCE.md) only when the request needs deferred direction or external patterns.

## Rules

- Treat user statements as evidence or direction unless they are explicit instructions. Judge with evidence, assumptions, and tradeoffs.
- Prefer existing patterns and the smallest coherent change. Protect user work and credentials.
- Before bulk copying, packaging, or generating evidence, allowlist only the code and legitimate inputs needed for the result. Reference immutable large inputs by canonical path and SHA-256; set the task's file/byte budget from measured inputs and existing outputs, and give parallel work separate output roots. See the [workspace storage workflow](./docs/workflows/workspace-storage.md).
- Check generated file counts, bytes, selected inputs, and large-input references against that plan. At closeout, retain unique work, required QA and failure evidence; report cleanup candidates by exact path, role, and measured size. These checks grant no deletion authority, and an earlier cleanup approval does not authorize a new cleanup.
- Separate implementation, internal QA, deployment, and observed-user evidence.
- Capture only durable decisions, actionable deferred ideas, approved specs, blockers, or release facts.
- Keep the repo canonical; project to Notion only for active human review or action.
- Do not edit `.env`, credentials, `old/`, `claude_ver/`, or legacy dumps without explicit approval.
- Commit, push, PR, merge, and deploy on your own judgment once the change's minimum check in [Checks](#checks) passes, Production included; report the exact candidate, checks run, and what stays unverified. Do not force-push, rewrite published history, or destructively clean up without explicit approval.

## Checks

| Change | Minimum check |
| --- | --- |
| Docs, policy, skill, harness | `npm run docs:check` |
| Pure logic | Targeted test; add `npm test` for shared behavior |
| Runtime/app | `npm test` and `npm run build` |
| User-facing route | Relevant browser/E2E check plus logic/build checks |
| Dependency/release tooling | Security audit, docs check, test, and build |

Hooks and CI are the deterministic enforcement layer. Run `npm run workflow:closeout` only for substantial handoff/completion, publish work, overall status, or mixed-worktree ownership review.
