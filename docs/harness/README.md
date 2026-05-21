# AI-Agnostic Harness

This harness adapts the ideas from `junu0723/claude-harness` for this project without requiring Claude Code or `.claude` runtime features.

## What Was Adopted

- A small document graph for persistent project memory.
- A repeatable SDLC loop: status, issue, plan, implement, QA, PR, review, release, deploy.
- Role separation between orchestration, implementation, review, architecture, and browser testing.
- Verification gates before claims of completion.

## What Was Changed

- `agent.md` remains the root guide instead of introducing a Claude-only `CLAUDE.md`.
- Role and command docs live under `docs/harness/` so Codex, Claude, Gemini, Copilot, Cursor, or a human can follow them.
- Tool names are descriptive, not slash-command dependent.
- Claude-specific hooks are represented as safety rules and optional local automation, not required runtime behavior.

## Compatibility Position

Checked against current public agent-instruction docs on 2026-05-21.

- `AGENTS.md` is the auto-discovered entry point for this repository. Keep it short and point to the document graph.
- `agent.md` is the expanded project guide. It is intentionally linked from `AGENTS.md` because some tools only auto-load standard agent files.
- Do not add `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, or `.github/copilot-instructions.md` by default. If the team adopts a tool-specific workflow, add a short adapter that points back to `AGENTS.md` and this harness instead of duplicating rules.
- Add nested `AGENTS.md` files only when a subdirectory has different setup, commands, or safety rules.

References: [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [AGENTS.md open format](https://agents.md/), [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions), [Claude Code memory](https://code.claude.com/docs/en/memory), [Gemini CLI context files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html), [Cursor rules](https://docs.cursor.com/context/rules-for-ai).

## Core Documents

| Document | Purpose |
|----------|---------|
| [../../agent.md](../../agent.md) | Root operating guide and product constraints |
| [../STATUS.md](../STATUS.md) | Current version, health, and active constraints |
| [../ROADMAP.md](../ROADMAP.md) | Upcoming versions and backlog index |
| [../IDEAS.md](../IDEAS.md) | Deferred ideas and conversation context worth preserving |
| [../REFERENCE.md](../REFERENCE.md) | External UX/UI and productivity-method references |
| [../HISTORY.md](../HISTORY.md) | Released changes |
| [ROLES.md](./ROLES.md) | AI/human role definitions |
| [SDLC.md](./SDLC.md) | Repeatable development cycle |
| [QA.md](./QA.md) | Verification checklist |
| [UX_CONTENT_EVALUATION.md](./UX_CONTENT_EVALUATION.md) | Reusable persona-based UX/content evaluation process |

## Default Commands

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

Use `npm run dev` for local manual testing at `http://localhost:3000`.
