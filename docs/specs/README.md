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

- [2026-08-01 P35 Production Mobile Convergence](./2026-08-01-p35-production-mobile-convergence/README.md) completed P0-01 through P0-08 on a dedicated branch from `c09f859`: one effective result snapshot, date/save/result continuity, public edit/export parity, one atomic mobile editor, a reduced public shell and receipt, a compact My Flow handoff with Item completion, one lossless memo facade, and a map/source/risk/recovery action adapter. Internal checks passed with 597/597 unit/contract tests and 413/413 Playwright tests. Implementation commit `1b669f9` is pushed in Draft PR [#165](https://github.com/knhbae/flowme2605/pull/165), and its [Vercel Preview](https://flowme2605-git-codex-p35-production-mobile-p0-flowme.vercel.app) is ready with green GitHub CI. Text-to-Flow and observed-user sessions remain outside this program. The active human gate is Preview review before merge and Vercel production deployment.

### Previous Gate (superseded 2026-08-01)

- No new implementation spec is active. P35 is released; the current product gate is the owner's production review and keep, bounded-fix, or block decision. Separately, the completed [P35 literal-route release-evidence follow-up](../content-audit/2026-07-29-p35-release-hardening/README.md) adds two non-fixture cases: literal `/my` opens the saved-Flow cross-Flow `할 일` view with the adjacent `Flow` view, and in a fresh one-Flow public-save representative state literal `/my?experiment=off` opens the legacy Flow hub without changing any `flow:*` localStorage key/value bytes. Pre-existing workspace normalization is outside this evidence. The follow-up changes no runtime, storage, or schema behavior and does not itself promote or block another product slice. Do not promote `TA-01`, another P35 revision, or a separate research package until the owner decision names exactly one scope.

### Design And Research Shelf

These packages inform the active decision but are not parallel product implementation queues.

- [2026-07-28 FlowMe Text Authoring UX v1](./2026-07-28-flowme-text-authoring-ux-v1/spec.md) - hybrid text plus structured preview is selected and the design/prototype handoff is complete; `TA-01` through `TA-06` remain unimplemented until the owner explicitly promotes one slice.
- [2026-07-29 Flow Content UI Full-Corpus Validation Lab v1](./2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/spec.md) - a standalone source-backed review harness and planning snapshot; production app/runtime/DB/API are unchanged. Its extended semantic review and final desktop/tablet/mobile browser-QA package are preserved separately on `archive/research-planning-consolidation-20260729` through commit `a8d977b`, with validator `61 / 61`, targeted tests `14 / 14`, and browser QA `PASS`. The decision remains `DRAFT_PENDING_USER_REVIEW`; user review, external Calendar/VTODO round-trip, and observed-user validation remain `NOT_RUN`, so this is not an active product queue.
- [2026-07-29 Flow Projection Semantics, Scheduling, and Event Corpus Lab v1](./2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/spec.md) - completed the 42x5 projection contract, user pacing model, and event Series/Edition/Occurrence planning corpus; runtime migration, external Calendar/VTODO round-trip, and observed-user validation remain gated.

### Completed Or Closed

- [2026-07-26 P35 MECE UX Reset](./2026-07-26-flowme-mece-ux-reset/p35-r13-final-internal-gate-goal-ko.md) - released through [PR #161](https://github.com/knhbae/flowme2605/pull/161) and merge `4a51b08`; the state-based root router, three primary destinations, result-first public Flow, cross-Flow date-grouped `할 일`, Flow workspace continuity, Calendar date lens, and scope-first export are live. GitHub CI, Vercel production, all unit `694 / 694`, P35 Playwright `79 / 79`, and full Playwright `405 / 405` are green. PR #162 records a bounded six-scenario production smoke without linking its raw artifact. The separate [literal-route evidence follow-up](../content-audit/2026-07-29-p35-release-hardening/README.md) adds `2 / 2` non-fixture regressions without runtime, storage, or schema changes and did not rerun that smoke. Observed-user sessions remain `0`.

- [2026-07-25 P34 Execution CRUD UX](./2026-07-25-p34-execution-crud-ux/spec.md) - released through PR #157 and merge `98ede0f`; GitHub CI, Vercel Production, production smoke, full Playwright `326 / 326`, and dependency audit `0` are green, while observed-user sessions remain `0`.

- [2026-07-24 P33 Cross-entry Canonical Alignment](./2026-07-24-p33-cross-entry-canonical-alignment/spec.md) - released through PR #156 and merge `7948bc4`; the AJD moving job resolves through one canonical 24-item identity while legacy 5-item copies stay readable, explicitly selectable, and never auto-merged.

- [2026-07-24 P32 My Flow Focused Workspace](./2026-07-24-p32-my-flow-focused-workspace/README.md) - released through PR #154 and merge `30281a7`; B1 focused workspace, direct quick edit, anchor adjustment, consolidated export/lifecycle commands, and the six-shape shell shipped without a persistence migration, while observed-user sessions remain `0`.

- [2026-07-23 P31 Mobile Journey Reconstruction](./2026-07-23-p31-mobile-journey-reconstruction/README.md) - released through PR #150 and merge `0227cd2`; current production smoke is green, while independent Claude/Codex review promoted the selected-Flow command hierarchy into P32 without reopening the global IA or persistence model.

- [2026-07-22 P30 Evidence Gap Closure](./2026-07-22-p30-evidence-gap-closure/README.md) - released through PR #148 and merge `b3c8500`; current production smoke is green, while owner and independent mobile review promoted coordinated interaction simplification and one date-precedence Blocking into P31.

- [2026-07-22 P29 Coordinated Surface Reset](./2026-07-22-p29-coordinated-surface-reset/plan.md) - released through PR #146 and merge `10e6e515`; independent review promoted two mobile correctness findings and bounded composition/evidence gaps into P30 without reopening P29 data contracts.

- [2026-07-21 P28 Cross-Surface Experience Reconstruction](./2026-07-21-p28-experience-reconstruction/spec.md) - released through PR #144 and merge `9a839d02` with Hybrid save-before, shared routine/execution grammar, scalable My Flow/Calendar, five actual-data shapes, unit `584/584`, full E2E `346/346`, and observed-user sessions `0`; owner and independent review promoted the remaining composition work into P29.

- [2026-07-21 P27 Flow Lifecycle Workspace Reconciliation](./2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md) - released through PR #141 and merge `2829b37`; canonical production browser evidence is green while observed-user sessions remain `0`.

- [2026-07-19 P25 Execution Workspace Foundation](./2026-07-19-execution-workspace-foundation/spec.md) - released through PR #136 and hydration hotfix PR #137; canonical production smoke passed `12 / 12`, while observed-user sessions remain `0 / 15`.

- [2026-07-19 Adaptive Lean Agent Harness](./2026-07-19-adaptive-lean-agent-harness/spec.md) - implemented process cleanup that routes context and verification by task risk while retaining domain rules and deterministic gates; behavioral comparison remains an evidence follow-up.

- [2026-07-19 P25 Responsive Whole-Flow Workspace](./2026-07-19-responsive-whole-flow-workspace/spec.md) - completed P25-02 contract for shared first-save/return hierarchy and mobile/wide whole-Flow composition.

- [2026-07-19 Memo Draft Split And Count Integrity](./2026-07-19-memo-draft-split-count-integrity/spec.md) - implemented source-phrase parsing, explicit pre-save acceptance, stable intake IDs, and accepted-count parity for personal memo/URL drafts.

- [2026-07-19 P25-01A Canonical Effective Routine Projection](./2026-07-19-canonical-effective-routine-projection/spec.md) - completed correctness slice under the active P25 gate; public preview, saved Calendar, and ICS now share source-faithful routine cadence, while P25-01B memo/count integrity remains next.
- [2026-07-18 Save, Personalize, Execute Journey Reset](./2026-07-18-save-personalize-execute-journey-reset/spec.md) - P24-J0~J5 implemented and deployed the artifact-first baseline; owner/Codex/Claude feedback reopened the broader execution-workspace frame under P25.
- [2026-07-14 P24 Execution Trust and UX Simplification](./2026-07-14-p24-execution-trust-ux-simplification/spec.md) - implementation and operations prep are complete; its 5 participants x 3 sessions protocol remains deferred and is not the active gate.
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
