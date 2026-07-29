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

## Spec Lifecycle

Only **Active Gate** is the current execution backlog. Unchecked boxes inside gated or historical specs do not become current priorities unless [ROADMAP.md](../ROADMAP.md) promotes them.

### Active Gate

- [2026-07-14 P24 Execution Trust and UX Simplification](./2026-07-14-p24-execution-trust-ux-simplification/spec.md) - implementation and operations prep are complete; two first sessions and then 5 participants x 3 sessions are the active gate.
- [2026-07-29 Flow Content UI Full-Corpus Validation & Planning Handoff Lab v1](./2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/spec.md) - builds the standalone 110-content, 550-projection review Gallery and draft planning handoff; final browser QA and direct user review are pending, while observed-user validation and external Calendar/VTODO round-trip remain `NOT_RUN`.

### Completed Or Closed

- [2026-07-29 Flow Projection Semantics, Scheduling, and Event Corpus Lab v1](./2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/spec.md) - completed the 42×5 projection contract, user pacing model, and event Series/Edition/Occurrence planning corpus; runtime migration, external Calendar/VTODO round-trip, and observed-user validation remain gated.
- [2026-07-19 Adaptive Lean Agent Harness](./2026-07-19-adaptive-lean-agent-harness/spec.md) - implemented process cleanup that routes context and verification by task risk while retaining domain rules and deterministic gates; behavioral comparison remains an evidence follow-up.
- [2026-07-14 URL-to-FLOW Prompt Lab v1](./2026-07-14-url-to-flow-prompt-lab/spec.md) - completed controlled prompt-contract experiment; real provider, latency, cost, and observed usability remain unproven.
- [2026-07-14 Repeated Collaboration Workflows](./2026-07-14-repeated-collaboration-workflows/spec.md) - completed operating baseline for session start, request interviewing, direction capture, and closeout.
- [2026-07-13 Execution Lifecycle Completeness](./2026-07-13-execution-lifecycle-completeness/spec.md) - local lifecycle contract closed; observed-user and external-system evidence moved to P24/P25.
- [2026-07-05 URL Lookup Production Slice](./2026-07-05-url-lookup-production-slice/spec.md) - implemented `/flows` URL lookup entry over prepared source-backed conversions.
- [2026-07-01 My Flow v2 Execution UX](./2026-07-01-my-flow-v2-execution-ux/spec.md) - implemented post-save, Today/Flow execution, and global Calendar split.

### Approved But Gated

- [2026-07-12 URL-to-Flow Backend Readiness Contract](./2026-07-12-url-to-flow-backend-readiness/spec.md) - readiness contract for a future production URL fetch and provider lane; not the current build queue.
- [2026-07-11 Canonical Flow Data Model v1](./2026-07-11-canonical-flow-data-model/spec.md) - approved migration contract; runtime database migration waits for the post-observation investment decision.
- [2026-07-11 URL-first AI Draft Gate](./2026-07-11-url-first-ai-draft-gate/spec.md) - approved proposal and safety contract; real AI integration remains gated.
- [2026-06-26 Creator Publish Gate and Step Contract](./2026-06-26-creator-publish-step-contract/spec.md) - approved creator/update boundary; creator pilot remains gated.

### Historical Or Reference

- [2026-06-29 Post-save Execution UX](./2026-06-29-post-save-execution-ux/spec.md) - planning baseline superseded by My Flow v2 and P23/P24 implementation.
- [2026-06-24 Source-backed Flow Map Productization](./2026-06-24-source-backed-flow-map-productization/spec.md) - source-backed productization and quality-gate reference.
- [2026-06-24 FlowMe Platform Feature Planning](./2026-06-24-flowme-platform-feature-planning/spec.md) - long-horizon platform planning reference; uncommitted directions remain in [IDEAS.md](../IDEAS.md).

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
