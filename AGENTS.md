# FLOW Agent Entry Point

Use this file as the repository map. Product truth stays in linked canonical docs. Skills live in `.agents/skills/`; `CLAUDE.md` adapts this entry point for Claude Code.

## Start

1. Read the request and directly involved files and tests.
2. Inspect Git state before edits; every pre-existing dirty path is unowned.
3. Read [agent.md](./agent.md) for FlowMe product, content, UX, status, release, or broad/ambiguous work. Skip it for clear low-risk local work.
4. Run `npm run workflow:session-start` only for broad, resumed, status/release, or mixed-worktree work.
5. Load only request-routed context.

## Routes

| Task | Add this context |
| --- | --- |
| Status, priorities, or next work | [PROJECT_CONTROL.md](./docs/PROJECT_CONTROL.md), [STATUS.md](./docs/STATUS.md), [ROADMAP.md](./docs/ROADMAP.md) |
| Product, content, UX, or policy | [agent.md](./agent.md), [PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md), relevant [DECISIONS.md](./docs/DECISIONS.md), matching skill |
| Report or visual artifact | [flow-report-artifact](./.agents/skills/flow-report-artifact/SKILL.md), then the format skill |
| Architecture or data ownership | [SERVICE_STRUCTURE.md](./docs/SERVICE_STRUCTURE.md), relevant code and tests |
| Tooling, harness, CI, or release | [TOOLING.md](./docs/TOOLING.md), [harness README](./docs/harness/README.md), specific QA/workflow doc |
| Approved multi-step work | Relevant folder under [docs/specs](./docs/specs/README.md) |

Search large logs before reading them end to end. Read [IDEAS.md](./docs/IDEAS.md) or [REFERENCE.md](./docs/REFERENCE.md) only when the request needs deferred direction or external patterns.

## Rules

- Treat user statements as evidence or direction unless they are explicit instructions. Judge with evidence, assumptions, and tradeoffs.
- Prefer existing patterns and the smallest coherent change. Protect user work and credentials.
- Separate implementation, internal QA, deployment, and observed-user evidence. Whoever writes a change runs that change's own checks; independence comes from a second reviewer, not from withholding the checks from the author.
- Delegate research, testing, simulation, and review to a read-only Codex run (`codex exec -s read-only`, or a review-only command). `/codex:rescue` defaults to a write-capable run, so state read-only when the task is investigation. Delegate a write-capable run only when the task earns its own worktree; make the small edits here instead. The shared checkout holds other sessions' uncommitted work, which no branch can restore.
- Capture only durable decisions, actionable deferred ideas, approved specs, blockers, or release facts.
- Keep the repo canonical; project to Notion only for active human review or action.
- Do not edit `.env`, credentials, `old/`, `claude_ver/`, or legacy dumps without explicit approval.
- Commit, push, PR, merge, and deploy on your own judgment once the checks your change affects, from [Checks](#checks), pass, Production included; report the exact candidate, checks run, and what stays unverified. A check that already failed before your change does not block you when you confirm the failure is identical before and after and name it in that report; a new, changed, or newly reached failure does block you, and an unrelated red check is never a reason to skip a check your change does affect. Do not force-push, rewrite published history, or destructively clean up without explicit approval.

## Checks

| Change | Minimum check |
| --- | --- |
| Docs, policy, skill, harness | `npm run docs:check` |
| Pure logic | Targeted test; add `npm test` for shared behavior |
| Runtime/app | `npm test` and `npm run build` |
| User-facing route | Relevant browser/E2E check plus logic/build checks |
| Dependency/release tooling | Security audit, docs check, test, and build |

Hooks and CI are the deterministic enforcement layer. Run `npm run workflow:closeout` only for substantial handoff/completion, publish work, overall status, or mixed-worktree ownership review.
