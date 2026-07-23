# FLOW Project Guardrails

> This is the concise, AI-agnostic project guide for Codex, Claude Code, and other agents. It contains stable guardrails, not a second copy of current status, architecture, backlog, or historical product models.

## Product Frame

FLOW is the execution layer between experience content and the tools people already use. It turns blogs, videos, official guidance, creator know-how, and personal notes into structured actions that can move to a calendar, checklist, sheet, memo, or internal execution state.

- Vision: **Record human experience in an executable form.**
- User proposition: **Start from the experience of someone who has done it.**
- Creator proposition: **Make your experience executable by others.**
- Long-term moat: execution and revision footprints, not content volume alone.

Read the current product-validation Stage and active gate from [docs/STATUS.md](./docs/STATUS.md). Do not freeze a historical Stage, route set, or backlog inside this guide, and do not equate implemented capability or automated QA with observed-user validation.

## Non-Negotiable Product Rules

1. Start from one concrete user job and one natural execution artifact, not a broad platform map.
2. Prioritize open, minimal setup, copy/export, check, feedback, and return behavior over passive content consumption.
3. Fit into familiar tools before asking users to adopt a heavy planner or record system.
4. Preserve official facts, creator experience, user edits, cautions, and private execution records as separate layers.
5. Never present health, legal, financial, family, vehicle, or safety content with unsupported certainty.
6. Do not invent source actions, dates, completion criteria, or outcomes to fill a template.
7. Treat polished demos, green tests, screenshots, and internal audits as QA evidence, not user validation.
8. Avoid premature accounts, integrations, marketplace, monetization, social, native-app, or AI automation work unless the current status/spec explicitly opens that gate.

Detailed product direction and feature filters live in [PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md). Current routes, ownership, and architecture live in [SERVICE_STRUCTURE.md](./docs/SERVICE_STRUCTURE.md).

## Content And Data Boundaries

- Use [docs/flow-rules](./docs/flow-rules/README.md) and the `flow-content-conversion` skill for source-to-Flow work.
- Inspect the original source structure. Separate verified evidence, inference, uncertainty, source experience, and risk.
- `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map` is the canonical hierarchy for new conversion work. `Item` is the smallest independently stateful execution/projection unit.
- Calendar/ICS, checklist/todo, sheet, and memo are projections of the effective model, not competing canonical models.
- The old `timeline`, `phase`, `routine`, and `checklist` labels are compatibility shorthands. New work follows the axes in [Canonical Flow Data Model v1](./docs/specs/2026-07-11-canonical-flow-data-model/spec.md).
- Preserve prior user execution records when published content changes; never rewrite history by mutating an old version in place.

## Engineering Guardrails

- Read the code and tests that own the requested behavior before choosing an abstraction.
- Keep edits scoped, preserve pre-existing user changes, and never stage unrelated dirty paths by default.
- Follow the runtime and dependency baseline in `package.json` and [TOOLING.md](./docs/TOOLING.md).
- Use the risk-based checks in [QA.md](./docs/harness/QA.md). Start targeted and broaden according to blast radius.
- Inspect user-facing behavior in a real browser when routes, layout, save/export behavior, calendar behavior, or responsive presentation changes.
- Keep local edits, commit, push, PR, merge, deployment, automated QA, and observed-user evidence as separate reported states.

## Durable Memory Routing

Record only information that another session needs to act correctly.

| Information | Canonical destination |
| --- | --- |
| Current focus, health, or blocker | [STATUS.md](./docs/STATUS.md) |
| Planned milestone or backlog index | [ROADMAP.md](./docs/ROADMAP.md) |
| Settled product, UX, technical, safety, or process rule | [DECISIONS.md](./docs/DECISIONS.md) |
| Useful but uncommitted direction with a revisit trigger | [IDEAS.md](./docs/IDEAS.md) |
| Approved multi-step work | [docs/specs](./docs/specs/README.md) |
| Route, component, data, or ownership contract | [SERVICE_STRUCTURE.md](./docs/SERVICE_STRUCTURE.md) |
| Source research, conversion evidence, or review artifact | `docs/content-audit/` |
| PR-sized implementation and verification history | `docs/pr-history/` |
| Released fact | [HISTORY.md](./docs/HISTORY.md) |

Do not duplicate one fact across several layers. Link to the canonical entry. A passing idea or discomfort is not automatically a decision, roadmap item, or status change.

## Collaboration And External Systems

- Conditional collaboration workflows live in [docs/workflows](./docs/workflows/README.md). Their scripts collect read-only evidence and do not authorize edits, product decisions, commits, publication, deployment, or cleanup.
- Specialist roles in [ROLES.md](./docs/harness/ROLES.md) are review lenses. Use only those justified by scope and risk.
- The repo is the source of truth. Notion is an optional human-facing projection for active decisions, result reviews, direct actions, blockers, and checkpoints. Keep implementation detail and AI subtasks in the repo.
- A pinned human review item needs an openable primary artifact and an exact ask. Notion unavailability must not block repo work.

## Safety And Completion

- Never modify credentials, secrets, production data, `old/`, `claude_ver/`, or legacy dumps without explicit instruction.
- Do not perform destructive cleanup, commit, push, merge, deploy, or external publication unless the user request authorizes that action.
- Never call work done without inspecting the scoped diff and reporting checks that actually ran in the current worktree.
- Never call a product flow validated until target-user behavior provides that evidence.
