# Adaptive AI-Agnostic Harness

FlowMe keeps a thin repository harness for knowledge and safeguards that a general model cannot infer reliably. It does not try to reproduce every planning, role, or multi-agent behavior already provided by Codex, Claude Code, or another capable runtime.

## Design Position

Keep:

- FlowMe product, content, source/risk, and validation boundaries.
- Dirty-worktree ownership checks.
- Deterministic Git hooks, CI, tests, build, and browser evidence.
- Durable routing for decisions, ideas, specs, status, architecture, and release facts.
- Short task-specific skills that point to canonical repo rules.

Avoid by default:

- Reading the entire document graph for a small task.
- Starting a role swarm when separate implementation, review, and QA passes are enough.
- Running session-start or closeout reporters when they add no new evidence.
- Duplicating Notion, verification, or memory-routing rules in every layer.
- Treating a larger custom prompt as automatically safer or more capable.

## Three Task Lanes

| Lane | Use when | Context and process |
| --- | --- | --- |
| Minimal | Clear, low-risk, local fix or answer | `AGENTS.md`, `agent.md`, request-relevant files, current Git state before edits, targeted verification |
| Standard | Multi-file work, FlowMe product/content work, or user-facing behavior | Minimal lane plus relevant canonical document and skill, short plan, independent review pass, risk-based QA |
| Full | Broad or ambiguous scope, mixed ownership, architecture/security/release/deployment work, or a committed high-risk initiative | Session Start, relevant spec, only needed specialist lenses, broader QA/browser evidence, and Work Closeout |

Choose the lightest lane that still protects the claim. Escalate when evidence reveals wider scope or risk; do not select Full merely because a tool supports subagents.

## Context And Memory

`AGENTS.md` is the automatic router. `agent.md` contains stable FlowMe guardrails. The remaining documents are loaded by task type:

- `STATUS` and `ROADMAP`: current focus and committed sequence.
- `PRODUCT_PRINCIPLES` and relevant `DECISIONS`: durable product judgment.
- `IDEAS`: deferred-direction review only.
- `SERVICE_STRUCTURE`: route, component, data, and ownership changes.
- `TOOLING`, this harness, and `QA`: process, dependency, CI, and release changes.
- `specs`: approved multi-step work.
- `content-audit` and `pr-history`: evidence and implementation history.

The repo remains canonical. Notion is a selective human-facing projection for active decisions, reviews, external actions, blockers, and checkpoints; see [TOOLING.md](../TOOLING.md). It is never a prerequisite for completing repo work.

## Conditional Workflows

[Session Start](../workflows/session-start.md), [Request Interview](../workflows/request-interview.md), [Direction Capture](../workflows/capture-direction.md), and [Work Closeout](../workflows/work-closeout.md) remain available as independent procedures. Their discoverable skills are routers, not mandatory phases:

- Session Start: broad/resumed work, context loss, overall review, or mixed ownership.
- Request Interview: unresolved ambiguity that materially changes outcome or risk.
- Direction Capture: a confirmed durable rule, actionable deferred idea, approved spec, active blocker, or release fact.
- Work Closeout: substantial completion, handoff, publish action, status report, or scoped ownership review.

Workflow scripts collect read-only Git and filesystem evidence. They do not decide product direction, edit external systems, run verification, or authorize commit, push, merge, deploy, or cleanup.

## Roles

Use the four core passes in [ROLES.md](./ROLES.md) for substantial work: orchestrate/product-frame, implement, review, and evidence/QA. Small tasks may combine them in one agent while still performing a distinct review before reporting completion. Add specialist lenses only when the task contains that risk.

## Compatibility Position

- `AGENTS.md` is the canonical automatic entry point for tools that support the convention.
- Claude Code does not read `AGENTS.md` directly, so `CLAUDE.md` contains exactly `@AGENTS.md`. This adapter avoids a second Claude-specific guide.
- Repo skills live canonically under `.agents/skills/`. `.claude/skills/` and optional Codex user-scope copies are generated and must not be edited directly.
- After changing a canonical skill, run `npm run skills:sync`. Use `npm run skills:install:codex` when user-scope copies should be refreshed; `npm run docs:check` and `npm run skills:check:codex` detect drift.
- Do not add more tool-specific instruction files by default. Add a short adapter only when a supported tool cannot consume the existing entry point.
- Add nested `AGENTS.md` files only when a subtree has genuinely different setup, commands, or safety rules.

References: [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [AGENTS.md open format](https://agents.md/), [Claude Code memory](https://code.claude.com/docs/en/memory), [Gemini CLI context files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html), and [Cursor rules](https://docs.cursor.com/context/rules-for-ai).

## Verification

Use [QA.md](./QA.md) for risk-based checks. Repository-level automation remains authoritative:

- Pre-commit: `npm run docs:check`
- Pre-push: `npm run verify`
- CI core: security audit and core verification
- CI/explicit user-flow QA: Playwright E2E and retained artifacts

These deterministic gates are not behavioral prompt overhead and should remain unless measured noise exceeds their protection value.

## Evaluation

Reduced instruction size is not proof of better work. Periodically compare Minimal, Standard, and Full lanes across small fixes, FlowMe domain tasks, and repo-wide/release tasks. Record first-pass correctness, unintended files, verification retries, user corrections, elapsed time, and token use when available. The current protocol and baseline live in the [adaptive harness spec](../specs/2026-07-19-adaptive-lean-agent-harness/spec.md).

## Documents

| Document | Use |
| --- | --- |
| [../../AGENTS.md](../../AGENTS.md) | Automatic entry and context routing |
| [../../agent.md](../../agent.md) | Stable FlowMe guardrails |
| [SDLC.md](./SDLC.md) | Three task lanes and common execution cycle |
| [ROLES.md](./ROLES.md) | Core passes and optional specialist lenses |
| [QA.md](./QA.md) | Verification matrix |
| [UX_CONTENT_EVALUATION.md](./UX_CONTENT_EVALUATION.md) | Task-specific persona/content evaluation, not default context |
| [../workflows/README.md](../workflows/README.md) | Conditional collaboration workflows |

Use `npm run dev` for local testing at `http://localhost:3000`. The supported runtime baseline is defined in `package.json` and [TOOLING.md](../TOOLING.md).
