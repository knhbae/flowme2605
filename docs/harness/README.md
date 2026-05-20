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

## Core Documents

| Document | Purpose |
|----------|---------|
| [../../agent.md](../../agent.md) | Root operating guide and product constraints |
| [../STATUS.md](../STATUS.md) | Current version, health, and active constraints |
| [../ROADMAP.md](../ROADMAP.md) | Upcoming versions and backlog index |
| [../HISTORY.md](../HISTORY.md) | Released changes |
| [ROLES.md](./ROLES.md) | AI/human role definitions |
| [SDLC.md](./SDLC.md) | Repeatable development cycle |
| [QA.md](./QA.md) | Verification checklist |

## Default Commands

```powershell
npm test
npm run build
npm run test:e2e
```

Use `npm run dev` for local manual testing at `http://localhost:3000`.

