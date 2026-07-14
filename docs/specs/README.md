# FLOW Spec Layer

Use this folder for durable, tool-agnostic specs that should outlive a single agent session. A spec starts when an idea becomes committed work, but before implementation details harden in code.

`docs/superpowers/` remains a useful archive for skill-generated designs and implementation plans. New FlowMe-owned specs should live here unless a user explicitly asks for a tool-specific location. When a skill writes to `docs/superpowers/`, link that artifact from the matching `docs/specs/` folder instead of duplicating it.

## When To Create A Spec

Create a spec folder for:

- New user-facing flows, workbenches, exports, or route behavior.
- Content conversion batches that affect public availability, source/risk labels, or artifact output.
- Data model, storage, event logging, auth, deployment, or security changes.
- Harness/process changes that future agents need to follow.
- Any task that needs more than one implementation pass or more than one verification mode.

Do not create a spec folder for:

- A typo or small wording fix.
- A single local test adjustment with no behavior or process change.
- A one-off investigation that ends with no committed product direction.

## Folder Shape

Use one folder per committed scope:

```text
docs/specs/YYYY-MM-DD-short-topic/
  spec.md
  plan.md
  tasks.md
  qa.md
```

Keep the short topic stable. If the work is rescoped, update the files inside the folder rather than creating a second near-duplicate folder.

## Active Specs

- [2026-07-14 P24 Execution Trust and UX Simplification](./2026-07-14-p24-execution-trust-ux-simplification/spec.md) - closes execution correctness and Claude Design `(8)` UX slices, then requires controlled dependencies and 15 real observed sessions before completion.
- [2026-07-14 URL-to-FLOW Prompt Lab v1](./2026-07-14-url-to-flow-prompt-lab/spec.md) - freezes 12 canonical SourceRow-only cases, provider-neutral semantic proposal contract, deterministic validation, blind review, three-round prompt evidence, and explicit separation from real provider cost or production URL fetching.
- [2026-07-14 Repeated Collaboration Workflows](./2026-07-14-repeated-collaboration-workflows/spec.md) - makes session start, conditional request interviewing, direction capture, and work closeout discoverable across Codex and Claude Code while keeping scripts read-only and repo memory canonical.
- [2026-07-13 Execution Lifecycle Completeness](./2026-07-13-execution-lifecycle-completeness/spec.md) - audits reversible completion, optional scheduling, personal task add/delete/reorder, projection parity, history, and reuse before opening more creator, AI, or integration surface.
- [2026-07-12 URL-to-Flow Backend Readiness Contract](./2026-07-12-url-to-flow-backend-readiness/spec.md) - integrates the content coverage envelope, rich canonical adapters, rules-first/LLM-assisted conversion, cost model, rights/security/operations gates, implementation order, and split Go/No-Go decision before production URL fetching or a real provider.
- [2026-07-11 Canonical Flow Data Model v1](./2026-07-11-canonical-flow-data-model/spec.md) - fixes Item as the minimum independently stateful execution unit, keeps SourceRow provenance and Step grouping separate, and defines projection, storage, API, fixture, and migration contracts before the URL-to-Flow backend.
- [2026-07-11 URL-first AI Draft Gate](./2026-07-11-url-first-ai-draft-gate/spec.md) - defines the provider-neutral AI proposal, user review, safety, privacy, failure, and deterministic fallback contract before any real AI integration.
- [2026-07-05 URL Lookup Production Slice](./2026-07-05-url-lookup-production-slice/spec.md) - adds a `/flows` URL lookup entry that reuses existing source-backed Flow conversions before any AI generation.
- [2026-07-01 My Flow v2 Execution UX](./2026-07-01-my-flow-v2-execution-ux/spec.md) - separates post-save confirmation from normal Today/Flow execution and keeps Calendar as the global dated execution tab.
- [2026-06-29 Post-save Execution UX](./2026-06-29-post-save-execution-ux/spec.md) - planning-first redesign for Today/Next, Calendar selected-date detail, public save CTA, and Flow finding labels before implementation.
- [2026-06-26 Creator Publish Gate and Step Contract](./2026-06-26-creator-publish-step-contract/spec.md) - separates creator/public/My Flow route responsibilities and records the saved Flow Map Step contract needed for future export regeneration.
- [2026-06-24 Source-backed Flow Map Productization](./2026-06-24-source-backed-flow-map-productization/spec.md) - current source-backed Flow Map productization baseline and quality gate.
- [2026-06-24 FlowMe Platform Feature Planning](./2026-06-24-flowme-platform-feature-planning/spec.md) - platform-level planning and deferred feature boundaries.

## Required Gates

Every FlowMe spec should answer these gates before implementation starts:

- **Stage fit:** Why this belongs in the current Stage 0 or Stage 1 scope.
- **First user action:** What the user should do first, and what completion looks like.
- **Artifact destination:** What becomes calendar, sheet, memo, exported text, or internal check state.
- **Source/risk boundary:** How official facts, creator experience, user edits, and cautions stay separate.
- **Natural artifact:** What a user would naturally create outside FLOW with realistic input values.
- **Service structure impact:** Which route, screen tree branch, component boundary, data/export contract, or persistence path changes, and whether [../SERVICE_STRUCTURE.md](../SERVICE_STRUCTURE.md) must be updated.
- **Tooling and verification lane:** Which P0 skill, plugin, or tool lane from [../TOOLING.md](../TOOLING.md) should guide the work, and which verification path proves it.
- **Verification:** Which docs, unit, build, E2E, browser, content, or security checks prove the change.

## Promotion Rules

- Use [../IDEAS.md](../IDEAS.md) for promising but uncommitted ideas.
- Use [../DECISIONS.md](../DECISIONS.md) for settled product, UX, technical, or process choices that future specs should inherit.
- Promote an idea into `docs/specs/` when it becomes planned work.
- When promoting an idea, carry forward the original "why not now" risk and update it into a concrete stage-fit statement, scope boundary, or non-goal.
- When a spec settles a reusable policy while planning, add or link the durable rule in [../DECISIONS.md](../DECISIONS.md) so later work can inherit it without rereading the whole spec.
- When implementation changes a route, shared component boundary, data/export contract, persistence path, or recurring review surface, update [../SERVICE_STRUCTURE.md](../SERVICE_STRUCTURE.md) in the same PR or record why no update was needed.
- When planning changes a repeated skill, plugin, QA, PR, design, or implementation workflow, update [../TOOLING.md](../TOOLING.md) in the same PR or record why no update was needed.
- Keep [../ROADMAP.md](../ROADMAP.md) short; link to the spec instead of copying details.
- Record implementation evidence in [../pr-history/README.md](../pr-history/README.md) and the matching PR history entry.
- Update [../STATUS.md](../STATUS.md) only for current health, focus, or recently completed changes.

## Template

Start from [TEMPLATE.md](./TEMPLATE.md) when creating a new spec folder.
