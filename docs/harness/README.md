# AI-Agnostic Harness

This harness adapts the ideas from `junu0723/claude-harness` for this project without requiring Claude Code or `.claude` runtime features.

## What Was Adopted

- A small document graph for persistent project memory.
- A repeatable SDLC loop: status, issue, plan, implement, QA, PR, review, release, deploy.
- Role separation between orchestration, implementation, review, architecture, and browser testing.
- Verification gates before claims of completion.
- A FlowMe-specific spec layer for committed multi-step work.

## What Was Changed

- `agent.md` remains the root guide instead of introducing a Claude-only `CLAUDE.md`.
- Role and command docs live under `docs/harness/` so Codex, Claude, Gemini, Copilot, Cursor, or a human can follow them.
- Tool names are descriptive, not slash-command dependent.
- Claude-specific hooks are represented as safety rules and optional local automation, not required runtime behavior.
- Durable product and harness specs live under `docs/specs/`; tool-generated specs and plans may remain under `docs/superpowers/`.

## FLOW Harness Shape

FlowMe uses seven durable memory layers:

1. `AGENTS.md` and `agent.md` define how agents enter the repo and which product constraints are non-negotiable.
2. `docs/STATUS.md`, `docs/ROADMAP.md`, and `docs/IDEAS.md` keep current health, committed direction, and deferred context separate.
3. `docs/PRODUCT_PRINCIPLES.md` keeps durable product vision, UX direction, and feature filters that should survive across chats.
4. `docs/SERVICE_STRUCTURE.md` keeps the current app screen feature tree, route/component ownership, and architecture map versioned with implementation.
5. `docs/TOOLING.md` keeps P0 skill/plugin/tool routing, adoption triggers, and verification lanes explicit.
6. `docs/specs/` holds committed multi-step specs before implementation, with stage fit, natural artifact, source/risk, and verification gates.
7. `docs/pr-history/` records what actually changed, how it was verified, and what remains after PR-sized work.

The goal is not more paperwork. The goal is to keep Stage 0 focused on measurable execution behavior: open, anchor input, copy/export, check, and feedback.

For backlog or planning material that humans are expected to act on, provide an HTML workboard view as the primary review surface. Markdown specs, task files, status notes, and audit documents can remain the source/evidence layer, but the actionable view should show priority, status, next action, done-when, verification, and source links in one scannable page.

## Compatibility Position

Checked against current public agent-instruction docs on 2026-06-11.

- `AGENTS.md` is the canonical entry point for tools that support the AGENTS.md convention. Keep it short and point to the document graph.
- Claude Code does not read `AGENTS.md` directly, so this repository keeps a one-line `CLAUDE.md` adapter containing `@AGENTS.md`. This is the official compatibility policy for Claude Code until it supports AGENTS.md natively.
- `agent.md` is the expanded project guide. It is intentionally linked from `AGENTS.md` because some tools only auto-load standard agent files.
- Repo skills live canonically under `.agents/skills/` for Codex discovery. `.claude/skills/` is a generated copy for Claude Code discovery and must not be edited directly.
- To change a skill, edit `.agents/skills/<skill-name>/SKILL.md`, then run `npm run skills:sync`. `npm run docs:check` includes `node scripts/sync-skills.mjs --check` so drift between `.agents/skills/` and `.claude/skills/` fails CI/local docs checks.
- Do not add `GEMINI.md`, `.cursor/rules`, or `.github/copilot-instructions.md` by default. If the team adopts another tool-specific workflow, add a short adapter that points back to `AGENTS.md` and this harness instead of duplicating rules.
- Add nested `AGENTS.md` files only when a subdirectory has different setup, commands, or safety rules.

References: [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [AGENTS.md open format](https://agents.md/), [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions), [Claude Code memory](https://code.claude.com/docs/en/memory), [Gemini CLI context files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html), [Cursor rules](https://docs.cursor.com/context/rules-for-ai).

## Core Documents

| Document | Purpose |
|----------|---------|
| [../../agent.md](../../agent.md) | Root operating guide and product constraints |
| [../STATUS.md](../STATUS.md) | Current version, health, and active constraints |
| [../ROADMAP.md](../ROADMAP.md) | Upcoming versions and backlog index |
| [../PRODUCT_PRINCIPLES.md](../PRODUCT_PRINCIPLES.md) | Durable product vision, UX direction, and feature filters |
| [../SERVICE_STRUCTURE.md](../SERVICE_STRUCTURE.md) | Current app screen feature tree, route/component ownership, and architecture map |
| [../TOOLING.md](../TOOLING.md) | P0 tool, skill, plugin routing policy and verification lanes |
| [../IDEAS.md](../IDEAS.md) | Deferred ideas and conversation context worth preserving |
| [../specs/README.md](../specs/README.md) | Durable feature, content, security, and harness specs |
| [../REFERENCE.md](../REFERENCE.md) | External UX/UI and productivity-method references |
| [../pr-history/README.md](../pr-history/README.md) | PR-level changes, decisions, verification, risks, and follow-ups |
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
