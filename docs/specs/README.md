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

Only **Active Gate** carries the current execution backlog or Owner checkpoint. Unchecked boxes inside gated or historical specs do not become current priorities unless [ROADMAP.md](../ROADMAP.md) promotes them.

### Active Gate

- [2026-08-20 Flow Entry And Preview Clarity](./2026-08-20-flow-entry-preview-clarity/spec.md) is the active Owner-promoted behavior follow-up stacked on the [Production Visual-Only Refresh](./2026-08-20-production-visual-only-refresh/spec.md). It unifies `/flows` query/URL/memo intake, removes a meaningless single-copy ordinal, opens each ordinary or executable Map Flow on source-faithful complete read-only Flow syntax, and shows all approved Todo/Calendar rows with meaningful grouping. Local implementation and automated QA are complete; [Draft PR #195](https://github.com/knhbae/flowme2605/pull/195) and its exact code-head [stable Vercel Preview](https://flowme2605-git-agent-flow-entry-preview-clarity-flowme.vercel.app) are published for Owner review. Initial run `32309777212` ended core `624/625` at the known `30`-record source-review freshness gate and Playwright `623/629` with six failures; remediation code head `597a6f84d593f0788e2c1f5a4fcd20d762d7bf28` passes build `18`, focused unit `13/13`, and those E2E cases `6/6` locally. Exact code-head run `32312436980` has Playwright `629/629` PASS and core non-green only at the same freshness gate; Vercel deployment `dpl_2kkCE8tKVBxDfDb9gmxGNKG2UPhU` is READY/SUCCESS. Merge and Production are not authorized, and observed users remain `0`.

- The Production Visual-Only Refresh remains the presentation baseline for this stack. Its local implementation and scoped automated QA are complete; full `npm test` remains non-green because `30` source records are review-due. Its separate merge and Production decisions also remain unapproved.

### Recently Completed

- The 2026-08-13 Flow Map Item date-parity follow-up to [Public Plan/Item Edit Surface Unification](./2026-08-12-public-plan-edit-surface-unification/spec.md) shipped through [PR #182](https://github.com/knhbae/flowme2605/pull/182). Final head `0aca76687ac582ff4cf11b19a0f46db5593c768e` passed exact-head CI run [`31655643163`](https://github.com/knhbae/flowme2605/actions/runs/31655643163) and merged as `f6f796c035d5762eea07ec35abb7f1af1577a5a5` at `2026-08-13T01:05:33Z`. Production deployment record `5880059975` / status `16743295490` succeeded, and canonical smoke passed `41/41` with workers `1`, retries `0`, unexpected/flaky/skipped `0`. Post-merge `main` run [`31656595092`](https://github.com/knhbae/flowme2605/actions/runs/31656595092) passed core job `94312307779` and Playwright job `94312307849`. See the [release record](../pr-history/2026-08-13-flow-map-item-date-parity.md). Observed users remain `0`.

- [2026-08-12 My Plan Edit And Lifecycle Unification](./2026-08-12-my-plan-edit-lifecycle-unification/spec.md) and [Public Plan/Item Edit Surface Unification](./2026-08-12-public-plan-edit-surface-unification/spec.md) shipped together through [PR #178](https://github.com/knhbae/flowme2605/pull/178). Final head `3cac3cde5bbcf6297b93b8299bfe28693700aebf` passed exact-head CI run [`31596540934`](https://github.com/knhbae/flowme2605/actions/runs/31596540934), merged as `908ee849beb15cb10331b72d7894167a61458b18`, and passed post-merge `main` run [`31597763288`](https://github.com/knhbae/flowme2605/actions/runs/31597763288), including core job `94117373437` and Playwright job `94117373461`. Production deployment record `5869458520` / status `16715443863` succeeded, and canonical smoke passed `38/38` with workers `1`, retries `0`, unexpected/flaky/skipped `0`. See the [release record](../pr-history/2026-08-12-plan-edit-lifecycle-unification.md). Observed users remain `0`.

- [2026-08-12 Public Plan Surface Unification](./2026-08-12-public-plan-surface-unification/spec.md) shipped through [PR #176](https://github.com/knhbae/flowme2605/pull/176). Final head `3555cd1db9f426dcbc30c81652be01dd38b1ce5e` passed exact-head CI run [`31534309714`](https://github.com/knhbae/flowme2605/actions/runs/31534309714) and merged as `47c54803c6bb7544aad757ce62c4ce58decbfe53`; post-merge `main` CI run [`31535691210`](https://github.com/knhbae/flowme2605/actions/runs/31535691210) also passed. Production deployment record `5858571759`, status `16686799631`, identifies the exact merge source; the [canonical alias](https://flowme2605.vercel.app) returned HTTP `200`, and the [Vercel record](https://vercel.com/flowme/flowme2605/BYkEtNVJkGitQcCZfWvfZpyicebp) reports success. Canonical production smoke passed `11/11` in sequential isolated contexts in `19.023s`, with pass-gated layout/runtime/network violations `0`. The harness separately observed `4` sticky/control intersections and `10` short targets on rollback, review-hold, and current save transitions; they are not closed usability evidence. Observed users remain `0`.

- [2026-08-11 R3B Approved Plan Execution Boundaries](./2026-08-11-r3b-approved-plan-execution-boundaries/spec.md) is the inherited selected-Plan and transfer baseline. [PR #172](https://github.com/knhbae/flowme2605/pull/172) delivered the approved plan-execution UX, and [PR #173](https://github.com/knhbae/flowme2605/pull/173) final head `210b7c3ae027782fd91a003e88624b38d0243e74` merged the bounded Escape correction as `2b937ce811b518950f495341d05736ebd102887a` at `2026-08-11T01:31:11Z`. Exact-head CI run `31448713920` and post-merge main CI run `31449546812` passed; Production deployment record `5842830294`, status `16645165737`, identified the exact source, and production approved-spec smoke passed `23/23`. PR #176 later replaced that runtime, PR #178 merge `908ee849beb15cb10331b72d7894167a61458b18` remains the historical Plan-edit foundation, and the latest runtime-bearing PR #182 merge `f6f796c035d5762eea07ec35abb7f1af1577a5a5` preserves the inherited contracts. Automation and production smoke remain separate from observed-user validation, which remains `0`.

- [2026-08-09 R3A My Flow Experience Boundary](./2026-08-09-r3a-my-flow-experience-boundary/spec.md) was merged through [PR #169](https://github.com/knhbae/flowme2605/pull/169) as `95a69257c73633077df2305232299f58cca03f73`, from merged PR #168 baseline `efa4d90a78a06134180701bed74874579ac94154`. It added a versioned JSON-safe, non-persisted workspace snapshot that separates personal saved-route and source identities, preserves multiple occurrence route hints, and is built only for an eligible exact query-only `r3a-lab` request. At that release, the unchanged classic surface was the default and fail-closed fallback; the exact-query boundary now remains a historical rollback comparison surface rather than the current default UX. An internal saved-library candidate delegates navigation to the existing controller, while selected-Plan execution remains behind an explicit `AppClient` compatibility renderer. No storage key/schema/migration, artifact/receipt owner, or default production UX changed. Final local evidence is focused boundary `72/72`, pretest `164/164`, AppClient lock `59/59`, P35 P0 contract `420/420`, main unit/contract `615/615`, production build `18/18`, R3A browser `4/4`, full runtime regression Playwright `545/545`, three-width diagnostics and visual inspection PASS, and independent P0/P1/P2 audit `0`. GitHub run [`31285007308`](https://github.com/knhbae/flowme2605/actions/runs/31285007308) passed Docs, Unit, Build, and Playwright `546/546`; Vercel deployment `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek` reached `READY` at the [canonical alias](https://flowme2605.vercel.app); and production smoke passed for the then-default classic surface and exact-query `r3a-lab` candidate. This is automated production QA; observed-user validation remains `0`.
- [2026-08-06 R2 My Flow Library Controller Boundary](./2026-08-06-r2-my-flow-library-controller-boundary/spec.md) was merged with R0/R1 through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`: saved-library query/filter and list -> Plan -> Item route/history/Back/focus/scroll decisions now pass through a pure transition planner, the stale Item-detail regression is fixed, dirty completion-notice navigation is guarded, and cross-Flow Item history collapses to list -> owning Plan -> Item. Final local evidence is controller `15/15`, pretest `153/153`, lock contract `59/59`, full unit/contract `615/615`, production build PASS with `18/18` generated pages, selected saved-plan E2E `18/18`, final full Playwright `542/542`, representative 390/1024/1440 quality checks PASS, and independent P0/P1 audit `0/0`. UI/copy, storage bytes, source ownership, export/receipt semantics, Calendar behavior, and Text-to-Flow remain unchanged. Production deployment/smoke and observed-user validation are `NOT_RUN`.
- [2026-08-06 R1 Calendar Controller Boundary](./2026-08-06-r1-calendar-controller-boundary/spec.md) was merged with R0/R2 through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`, from baseline `6612c4a`: Calendar-only state, action-specific transitions, selected-Flow preference bridging, focus/scroll orchestration, and Calendar-to-My-Flow navigation now pass through a typed controller while `AppClient` remains the shared My Flow compatibility facade. Final local evidence is controller `12/12`, pretest `138/138`, lock contract `59/59`, main unit/contract `615/615`, build PASS, selected E2E `37/37`, full Playwright `535/535`, three representative viewport checks PASS, and independent scoped diff audit P1/P2/P3 `0`. UI/copy, route and query bytes, saved data, My Flow ownership, result transfer, and Text-to-Flow remain unchanged. Production deployment/smoke and observed-user evidence are `NOT_RUN`.
- [2026-08-06 R0 Behavior-Preserving Architecture Refactor](./2026-08-06-r0-behavior-preserving-architecture-refactor/spec.md) was merged with R1/R2 through [PR #168](https://github.com/knhbae/flowme2605/pull/168) on 2026-08-08 as `efa4d90a78a06134180701bed74874579ac94154`, from baseline `6612c4a`: Calendar calculations now have a pure characterized view-model, Calendar and My Flow rendering have separate typed route surfaces, and `AppClient` remains the compatibility facade and runtime controller. Final local evidence is Docs PASS, lock contract `59/59`, unit/contract PASS, build PASS, Playwright `533/533`, and representative viewport inspection `6/6`. Persistence, source-backed conversion, transfer/receipt logic, UI/copy, routes, and storage bytes remain unchanged. Production deployment/smoke and observed-user evidence are `NOT_RUN`.
- [2026-08-04 P35 Round 2 B/B/B Bounded UX Correction](./2026-08-04-p35-round2-bounded-ux-correction/README.md) is closed for the MVP PoC at `P′ PASS2_REVISE / FINDINGS_INCORPORATED / P′′ CANDIDATE_EVIDENCE_VERIFIED / FRESH_P′′_PASS1_PASS2_NOT_RUN_WAIVED_FOR_MVP / PRODUCTION_READY / SMOKE_NOT_RUN / OBSERVED_USERS_0`. Immutable P′ `29cb03a` received sealed Codex and Claude Design results ending in Pass 2 `REVISE`; their findings were incorporated into P′′. The production source SHA is `f97644abf379c46433847f44aa7bd4da7fadac4a`; candidate-evidence BUILD_ID is `T0QkChgscSgPog-0UdvY-` and epoch is `p35-r2-4fa6af1728eb5ca5`. S01~S23 are `23/23` accounted (S01~S21 captured, S22 `NOT_ASSESSED`, S23 `REVIEWER_CHOSEN_NOT_PRECAPTURED`), all three group manifests pass with failures `0`, and the published verifier passes `33` identity checks, `285` evidence files, and `556` raw URLs with failures `0`. Fresh independent P′′ Pass 1 and Pass 2 were not run and were Owner-waived for this MVP; this is not an independent P′′ review pass. Vercel deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk` was `READY` at [its deployment URL](https://flowme2605-n6jddq8i9-flowme.vercel.app) before R3A replaced it as the production baseline. Production smoke and live runtime BUILD_ID probing were `NOT_RUN`, and observed users remain `0`.
- The same source is durable on `main` through [PR #166](https://github.com/knhbae/flowme2605/pull/166) and merge `2af4c92407925cb0643e20c2c22c6e8c5b8b0f64`. This Git integration is not a new production deployment, production smoke, fresh independent P′′ review, or observed-user validation.

### Inherited Implementation Baseline

- [2026-08-01 P35 Production Mobile Convergence](./2026-08-01-p35-production-mobile-convergence/README.md) is the implementation baseline inherited by Round 2, not the active queue or current production release. It completed P0-01 through P0-08 on a dedicated branch from `c09f859`: one effective result snapshot, date/save/result continuity, public edit/export parity, one atomic mobile editor, a reduced public shell and receipt, a compact My Flow handoff with Item completion, one lossless memo facade, and a map/source/risk/recovery action adapter. Internal checks passed with 597/597 unit/contract tests and 413/413 Playwright tests. Implementation commit `1b669f9` is pushed in Draft PR [#165](https://github.com/knhbae/flowme2605/pull/165), and its [Vercel Preview](https://flowme2605-git-codex-p35-production-mobile-p0-flowme.vercel.app) is ready with green GitHub CI. These states remain inherited implementation evidence; P35 Round 2 P′′ was the production baseline before R3A, while observed-user sessions remain `0`.

### Previous Product Gate (superseded 2026-08-04)

- Before the 2026-08-04 B/B/B approval, P35 production review and the owner's keep, bounded-fix, or block decision were the current gate. The completed [P35 literal-route release-evidence follow-up](../content-audit/2026-07-29-p35-release-hardening/README.md) remains baseline evidence: literal `/my` opens the saved-Flow cross-Flow `할 일` view with the adjacent `Flow` view, and in a fresh one-Flow public-save representative state `/my?experiment=off` opens the legacy Flow hub without changing any `flow:*` localStorage key/value bytes. Pre-existing workspace normalization is outside that evidence. The follow-up changes no runtime, storage, or schema behavior and is retained as rollback regression coverage for the current baseline.

### Design And Research Shelf

These packages inform the active decision but are not parallel product implementation queues.

- [2026-07-29 FlowMe Collaborative Authoring & Editability Strategy v1.1](./2026-07-29-collaborative-flow-authoring-editability-strategy-v1/spec.md) - completed the platform-mechanism, content-type editability, canonical ownership, version-conflict, and validation-planning package, now with denominator-aware evidence, eight real-service examples, and four code-native product UI contracts. It recommends wiki-like small contributions, GitHub-like reviewed canonical changes, Figma/Notion-like private copies, and one-way external projections. The recommendation is pending owner review; runtime implementation, direct creator publishing, external round-trip sync, and observed-user validation remain `NOT_RUN`.
- P′′ follow-up P2 candidates are URL supply-request queue mutation ordering, legacy-off write/no-write auditing, rapid batch-submit idempotency/CAS, and creator/text-authoring mutation ownership. They are not part of the released P′′ scope or an authorized parallel queue; only an explicit Owner decision may retain, drop, or promote them separately.
- [2026-07-28 FlowMe Text Authoring UX v1](./2026-07-28-flowme-text-authoring-ux-v1/spec.md) - hybrid text plus structured preview is selected and the design/prototype handoff is complete; `TA-01` through `TA-06` remain unimplemented until the owner explicitly promotes one slice.
- [2026-07-29 Flow Content UI Full-Corpus Validation Lab v1](./2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/spec.md) - a standalone source-backed review harness and planning snapshot; production app/runtime/DB/API are unchanged. Its extended semantic review and final desktop/tablet/mobile browser-QA package are preserved separately on `archive/research-planning-consolidation-20260729` through commit `a8d977b`, with validator `61 / 61`, targeted tests `14 / 14`, and browser QA `PASS`. The decision remains `DRAFT_PENDING_USER_REVIEW`; user review, external Calendar/VTODO round-trip, and observed-user validation remain `NOT_RUN`, so this is not an active product queue.
- [2026-07-29 Flow Projection Semantics, Scheduling, and Event Corpus Lab v1](./2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/spec.md) - completed the 42x5 projection contract, user pacing model, and event Series/Edition/Occurrence planning corpus; runtime migration, external Calendar/VTODO round-trip, and observed-user validation remain gated.

### Completed Or Closed

- [2026-08-06 Workspace And Backlog Stabilization](./2026-08-06-workspace-backlog-stabilization/spec.md) - preserved all unfinished streams, merged the P35 Round 2 source through PR #166, reconciled canonical project control, removed only reproducible temporary output and remotely preserved worktrees, and established one clean baseline before any bounded refactor. It changes no product behavior and does not promote a next product slice.
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
