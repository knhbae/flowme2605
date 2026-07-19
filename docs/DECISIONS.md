# Product Decision Log

This file records durable product, UX, technical, and process decisions that future agents should treat as settled unless the user explicitly reopens them.

Use this for:

- Product or UX choices that affect future screens, specs, or implementation.
- Technical or data-model direction that constrains later work.
- Process rules that decide where future conversation memory should be stored.
- Decisions that are stronger than an idea but smaller than a full spec.
- Decisions made mid-conversation about feature policy, UX boundaries, source/risk separation, creator behavior, or agent workflow that future agents should not re-litigate by default.

Do not use this for:

- Promising but uncommitted ideas. Put those in [IDEAS.md](./IDEAS.md).
- Full designs, implementation plans, or QA records. Put those in [specs/](./specs/).
- Current project health or blockers. Put those in [STATUS.md](./STATUS.md).
- Released changes. Put those in [HISTORY.md](./HISTORY.md).

## Capture Template

```markdown
### YYYY-MM-DD - Short decision title

**Decision:** What is now settled.

**Reason:** Why this direction was chosen.

**Applies to:** Screens, flows, docs, data, or implementation areas affected.

**Reopen when:** Concrete signal that would justify changing this.

**Related docs:** Links to specs, audits, PR history, or handoff notes.
```

## Decisions

### 2026-07-20 - Option B is the released P25 internal production baseline

**Decision:** Keep the P25 Option B whole-Flow workspace contract across save-before, post-save, My Flow, whole Flow, Calendar, item adjustment, batch adjustment, completion/reopen, and export. Treat the owner's instruction to complete P25 and permit substantial changes as implementation authorization. Treat P25-08 current command/browser evidence with unresolved automated Blocking/High `0` as the internal integration gate. Foundation PR #136 and hydration hotfix PR #137 are the released production baseline at `b0fb899c`. Defer only public copy density, 1024px Calendar density, and advanced-editor path length to P26-00 comparison work.

**Reason:** The nine-surface model is implemented and shares one effective personal Flow, source-safe overlays, execution state, Calendar placement, and scoped export. Final anonymous production smoke passed `12 / 12` route/viewport checks after the timezone hydration regression was fixed, with overflow and console/page errors at `0`. Reopening the architecture without a contradictory Blocking/High signal would create another redesign loop. The three remaining issues are bounded comprehension and density hypotheses rather than model failures.

**Applies to:** P25 release closeout, P26 planning, public save-before, first-save and returning My Flow, Calendar placement, progressive editing, batch mode, completion history, portable export, and related regression suites.

**Reopen when:** production smoke exposes a Blocking/High regression, owner or Claude Design identifies a concrete structural contradiction, or later observed users consistently fail the same task under the current frame. Automated simulations remain insufficient to claim usability validation.

**Related docs:** [P25 final closeout](./content-audit/2026-07-20-p25-final-closeout/README.md), [P25-08 evidence](./content-audit/2026-07-19-p25-08-internal-journey-gate/README.md), [P25-00B decision](./content-audit/2026-07-19-p25-00b-core-workspace-prototype-decision/README.md)

### 2026-07-19 - Portable export chooses scope before format and counts the effective projection

**Decision:** My Flow names three export scopes: `Flow 전체`, `직접 선택`, and `현재 항목`. Scope appears before format, and every visible count comes from `buildFlowExportScopePlan`: whole and selected list counts use effective included rows, current item resolves to one row, and each destination uses its own eligibility count. Undated rows remain valid for checklist, sheet, and memo but not Calendar/ICS. Completion and reopen do not change export membership; exclusion and tombstone do.

**Reason:** Raw source length, checkbox count, and output count previously appeared beside one another without one source of truth. A user needs to predict exactly what will leave FlowMe before choosing calendar, checklist, sheet, or memo.

**Applies to:** My Flow whole-Flow export, batch-selected export, item-detail portable export, personal drafts, source-backed personal copies, Calendar eligibility, filename scope suffixes, and P25-08 journey checks.

**Reopen when:** observed users cannot distinguish `직접 선택` from structural inclusion, expect Calendar to contain undated rows, or need a cross-Flow export scope.

**Related docs:** [P25 foundation plan](./specs/2026-07-19-execution-workspace-foundation/plan.md), [P25-05B evidence](./content-audit/2026-07-19-p25-05b-export-scope-count-evidence/README.md)

### 2026-07-19 - Completion belongs to one executable level and remains reversible after reload

**Decision:** A normal executable task has one row checkbox. Completing it exposes an immediate `되돌리기`, while the persistent `완료` view keeps the same checkbox available after reload. A recurrence series definition has no completion control; a projected occurrence has exactly one `이번 회차 완료 체크`; internal checklist checks remain a separate `subcheck` level. A published routine definition may drill into its next concrete occurrence, but the definition row itself does not become a second completion target.

**Reason:** Completion previously changed vocabulary and placement by surface, and recurring definitions could look like executable occurrences. One control per executable level preserves confidence without hiding recovery after the snackbar disappears.

**Applies to:** My Flow Today, whole-Flow mobile and wide workspaces, persistent completed records, Calendar occurrences, recurring personal drafts, published routines, detail checklists, and P25-05B export status handling.

**Reopen when:** observed users cannot discover the persistent `완료` view, interpret `회차` incorrectly, or need completion history beyond the current local execution record.

**Related docs:** [P25 foundation plan](./specs/2026-07-19-execution-workspace-foundation/plan.md), [P25-05A evidence](./content-audit/2026-07-19-p25-05a-completion-reopen-evidence/README.md)

### 2026-07-19 - Anytime tasks execute in My Flow and are only placed from Calendar

**Decision:** An open task without a date is a valid `언제든 할 일`. My Flow owns its completion, detail, notes, and personal adjustment. Calendar exposes the same task only in a selection-only `일정에 놓기` queue, where the user may place it on today or a chosen date, or keep it Anytime without mutation. The Calendar queue never exposes task-completion controls. Removing a personal date returns the task to Anytime. Mobile composes selected-day agenda, month grid, then a compact drawer; wide composes placement queue, month grid, and selected-day agenda.

**Reason:** The previous full-width undated tray acted like a second execution list, while My Flow exposed only a fallback subset. Separating execution from placement makes an undated task useful immediately, prevents duplicate completion controls, and keeps Calendar date-first.

**Applies to:** My Flow `지금`, Calendar placement queue, personal schedule overlays, completion undo, selected-day agenda, mobile/wide Calendar composition, and future P25 execution/export work.

**Reopen when:** observed users interpret `언제든` as unfinished setup, cannot discover placement, or need a dedicated unscheduled planning surface beyond the current compact queue.

**Related docs:** [P25 foundation plan](./specs/2026-07-19-execution-workspace-foundation/plan.md), [P25-04 evidence](./content-audit/2026-07-19-p25-04-anytime-calendar-placement-evidence/README.md)

### 2026-07-19 - Whole-Flow batch adjustment is a temporary mode with recoverable personal changes

**Decision:** Multi-item adjustment appears only after `여러 할 일 조정` inside `전체 Flow`. While active, selection checkboxes replace completion controls and a single toolbar owns date assignment, explicit `언제든` conversion, selected export, and recoverable removal. Applying a date or removal returns to the ordinary list with immediate undo. Direct source-backed Flows may be selected for date/export but cannot be structurally removed; personal drafts use tombstones and source-backed personal copies use included-step overlays. Recurring date changes block until occurrence or series scope is chosen. Explicit date removal is stored as an additive personal unscheduled override and never deletes the source date.

**Reason:** Permanent selection controls would add a second checkbox meaning beside task completion and make every row heavier. Batch actions also need an impact boundary, source-safe ownership, and a real recovery path before destructive controls can appear.

**Applies to:** My Flow mobile and wide whole-Flow workspaces, personal date overrides, personal structural tombstones, source-backed personal-copy inclusion, selected portable export, recurrence date movement, undo evidence, and P25-04 scheduling semantics.

**Reopen when:** observed users cannot find the mode, need cross-Flow selection, or recurrence-heavy users demonstrate a safe and understandable multi-series scope model.

**Related docs:** [P25 foundation plan](./specs/2026-07-19-execution-workspace-foundation/plan.md), [P25-03B evidence](./content-audit/2026-07-19-p25-03b-batch-adjustment-evidence/README.md)

### 2026-07-19 - Personal item adjustment starts with task, date state, and personal memo

**Decision:** My Flow uses one `할 일 조정` action. The first editing surface shows the task title, its date or undated state, and `내 메모`. Time, duration, place, recurrence, and item-type-specific records live behind `세부 일정`, which starts collapsed even when values already exist; the collapsed control summarizes those values. Memo resizing is not a separate command. Published source fields stay immutable and edits continue through personal overlays.

**Reason:** Showing every supported field made a simple date or memo change feel more complex than a calendar or todo tool. Automatically reopening advanced controls on revisit also made stored complexity dominate the common path. A compact default with a truthful summary keeps capability without making every user parse the full model.

**Applies to:** My Flow mobile drill-in, wide detail pane, source-backed personal copies, personal draft user items, Calendar item detail, portable item export inputs, and P25-03 evidence.

**Reopen when:** observed users cannot find advanced schedule controls, a content type demonstrably requires one advanced value at the default level, or a future dedicated editor replaces the shared detail surface.

**Related docs:** [P25 foundation plan](./specs/2026-07-19-execution-workspace-foundation/plan.md), [P25-03A evidence](./content-audit/2026-07-19-p25-03a-progressive-adjustment-evidence/README.md)

### 2026-07-19 - Accepted draft phrases, not a target count, define the saved personal Flow

**Decision:** Memo and URL-miss drafts may normalize user-authored phrases into action titles, but they must not add generic scope, ordering, or first-action rows to reach a minimum count. The pre-save inclusion/title review is the acceptance boundary. Only selected non-empty rows are saved, and their deterministic intake IDs must survive reload and downstream personal projections. Calendar and ICS remain eligible subsets because undated accepted rows stay in My Flow and list exports.

**Reason:** The prior minimum-three behavior contradicted the visible claim that only user text was used and could make a saved Flow appear more complete than the user's input. Count integrity and source mapping must be trustworthy before redesigning the whole-Flow workspace.

**Applies to:** `/flows` memo intake, URL-miss draft continuation, `url-first-supply-queue`, personal draft bundle creation, My Flow effective rows, Calendar eligibility, checklist/sheet/memo export counts, and P25 evidence.

**Reopen when:** a real AI proposal lane is introduced with explicit provenance and review, or observed users require richer semantic grouping. A model-generated suggestion still cannot be represented as a user-authored source phrase.

**Related docs:** [P25-01B spec](./specs/2026-07-19-memo-draft-split-count-integrity/spec.md), [P25-01B evidence](./content-audit/2026-07-19-p25-01b-memo-split-count-evidence/README.md)

### 2026-07-19 - Published routine cadence is canonical and ambiguous cadence does not invent dates

**Decision:** Public preview, source-specific workbench, saved My Flow Calendar, and ICS must consume one effective routine projection. A valid item-level recurrence rule has priority; otherwise one stable carrier may represent an unambiguous Flow-level daily, weekly, or monthly cadence. User-selected weekdays refine a weekly cadence only and cannot turn daily or monthly source cadence into a weekly fallback. Ambiguous natural ranges such as `7~10일마다` return a warning and no invented future occurrence. Source items and occurrence execution records remain unchanged. Portable saved-routine UIDs derive from stable series identity without exposing raw source item IDs.

**Reason:** Independent recurrence generators allowed the same source to appear monthly before save, weekly after save, and one-off in export. That destroys trust in every later visual redesign. Rejecting ambiguity is safer than presenting precise dates that the source did not provide.

**Applies to:** public routine preview, maintenance workbench, My Flow Calendar, source-backed occurrence completion/reopen, Calendar/ICS export, recurrence fixtures, and P25 parity evidence.

**Reopen when:** a reviewed source has a condition-based cadence that requires a first-class state model, multiple independent repeating items in one Flow need separate series export, or a migration plan is required for already-imported portable UIDs.

**Related docs:** [P25-01A spec](./specs/2026-07-19-canonical-effective-routine-projection/spec.md), [P25-01A evidence](./content-audit/2026-07-19-p25-01a-canonical-projection-evidence/README.md)

### 2026-07-19 - P25 centers the complete personal Flow and treats dates as optional scheduling

**Decision:** Treat the P24 deployment as an implementation baseline, not a finished UX. P25 must center the complete personal Flow as the saved object; My Flow `지금`, Calendar, completion history, and exports are projections of that object. A task without a date remains actionable and exportable as an Anytime task; Calendar only places dated work on its grid and exposes an explicit scheduling queue for undated work. Personal changes use overlays and never mutate published source. Common item adjustment shows title, date/Anytime state, and note first; time, duration, recurrence, source detail, and batch operations are progressively disclosed. Before runtime workspace implementation, P25-00B compares mobile/wide prototypes and records owner decisions. Before visual recurrence work, P25-01 makes every consumer use one effective item/series/occurrence projection.

**Reason:** The owner cannot yet understand how undated work is meant to be used, finds adjustment rough and overcomplicated, and does not trust the post-save or whole-Flow experience. Codex found concrete recurrence and memo-count mismatches, while Claude Design found duplicated public artifacts, hidden completion recovery, weak wide composition, and excessive copy. These are one model problem, not independent route polish tasks.

**Applies to:** public/source-backed save-before pages, post-save confirmation, My Flow local views, whole-Flow detail, personal overlays, Calendar undated placement, recurrence projection, completion/reopen, export scope, responsive components, P25 evidence, and future readiness review.

**Reopen when:** P25-00B owner review selects a materially different mental model, canonical projection cannot preserve current source/personal/run ownership, or later observed users consistently understand and prefer a different dated/undated and whole-Flow relationship. Automated agent reviews alone do not satisfy the observed-user condition.

**Related docs:** [P25 foundation spec](./specs/2026-07-19-execution-workspace-foundation/spec.md), [P25 feedback reconciliation](./content-audit/2026-07-19-flowme-p25-ux-feedback-reconciliation/README.md)

### 2026-07-19 - P25 uses title-first execution rows and separates held occurrence recovery

**Decision:** Use one shared responsive visual contract for My Flow, Calendar placement, export, execution notes, navigation, and bottom sheets. Compact execution rows show the effective task title before date and Flow metadata, use one visible `열기` label, and provide at least 44px completion and note targets. Flow colors identify ownership but do not color every command. User-facing undated language is `날짜 없는 할 일`, `날짜 없음`, `날짜 정하기`, and `날짜 없애기`; `Anytime` may remain an internal model term only. A personal recurring occurrence in `held` state is excluded from Today and Calendar ordinary execution while its execution record and stable occurrence ID remain available in a collapsed `보류한 일정` recovery entry under My Flow.

**Reason:** The previous UI required users to parse Flow/date chips before the task title, mixed 32-36px controls, repeated Calendar explanation and legends, and used `언제든` without explaining how undated work participates in execution. A held occurrence also looked like ordinary actionable work even though its completion control was disabled. One title-first row and a separate recovery shelf reduce interpretation without changing source, overlay, recurrence, or execution ownership.

**Applies to:** My Flow Today/whole-Flow/completed rows, Calendar agenda, Calendar date-free placement, execution notes, portable export entry, responsive navigation, personal recurrence held/reopen, and P25 visual evidence.

**Reopen when:** observed users still cannot find date-free work or held recovery, 44px controls materially reduce information density on target devices, or a tested alternative row hierarchy produces faster and more accurate execution. Automated visual review alone does not satisfy the observed-user condition.

**Related docs:** [P25-07 evidence](./content-audit/2026-07-19-p25-07-integrated-visual-language-evidence/README.md), [P25 foundation plan](./specs/2026-07-19-execution-workspace-foundation/plan.md)

### 2026-07-19 - Save before, first-save confirmation, and returning execution are distinct frames

**Decision:** Keep the 4-tab IA and current source, personal overlay, execution, recurrence, and export contracts. On source-backed and public save-before surfaces, show the natural artifact and representative effective items before long explanation. Offer `그대로 저장` as the primary action and a bounded `조정하고 저장` path for personal title and included items. After the first save, show the whole saved Flow at depth 0 before entering the returning My Flow workspace; later visits remain task-first. Calendar keeps dated work in grid/agenda and preserves undated work in a collapsed tray. Content held for source or risk review stays stored but exposes no ordinary execution or post-save action until it becomes eligible again.

**Reason:** The execution capabilities were already connected, but long promise copy, immediate Today reduction, ambiguous save-versus-adjust behavior, Calendar-like Flow filtering, expanded undated lists, and held content made the first-use journey hard to predict. Reordering the frames addresses those problems without replacing the durable execution model or adding another editor.

**Applies to:** source-backed Flow Map save pages, public `/f` save shell, first-save `/my?savedMap=` and `/my?savedFlow=` states, returning My Flow, Calendar undated work, held/review visibility, accessible save labels, P24 evidence, and future first-use tests.

**Reopen when:** observed users still cannot predict the saved artifact or distinguish save from adjustment, the first-save confirmation delays returning execution, a tested Calendar pattern handles undated work more clearly, or a held-content recovery surface is explicitly designed. Automated QA, owner review, and independent agents do not satisfy that observed-user condition.

**Related docs:** [journey reset spec](./specs/2026-07-18-save-personalize-execute-journey-reset/spec.md), [P24 readiness package](./content-audit/2026-07-19-flowme-p24-journey-frame-readiness/README.md)

### 2026-07-14 - Execution notes stay lightweight, private, and separate from source correction

**Decision:** A user may add an optional note directly from an execution row without opening the structural item editor. Personal execution notes and `원본에 알릴 점` are separate records. The latter remains an unsent local draft until a real delivery path exists. When a Flow completes, non-empty notes are collected automatically into separate groups; no rating, tag, or required review step is added. Reusing the Flow clears notes from the new current run while preserving them in the completed-run snapshot and history export.

**Reason:** Users need to capture observations while acting, not reconstruct them only after completion. Keeping the entry one tap away follows the Claude Design `(8)` execution-feedback mockup while avoiding another dense review form. Separating private notes from source correction prevents a local memo from implying that feedback was delivered to a creator or source owner.

**Applies to:** My Flow and Calendar execution rows, completion summaries, completed-run history, memo history export, local backup, recurrence occurrence identity, and any future source-correction delivery surface.

**Reopen when:** observed users cannot distinguish the note icon or the private/correction boundary, a real source-owner delivery workflow is introduced, or account-backed multi-device run history replaces local snapshots.

**Related docs:** [P24 U4 evidence](./content-audit/2026-07-14-p24-u4-inline-execution-notes-evidence/README.md), [P24 feedback reconciliation](./content-audit/2026-07-14-flowme-p24-feedback-reconciliation/audit.md)
### 2026-07-14 - Repeated collaboration uses canonical workflows with read-only automation

**Decision:** Standardize four P0 collaboration workflows: Session Start, Request Interview, Direction Capture, and Work Closeout. Request Interview runs only when unresolved ambiguity could materially change the result; it inspects repo evidence first, asks one round of 1-3 high-information questions with a recommended default, and is skipped for clear low-risk work. Keep the canonical, tool-independent procedures in `docs/workflows/`; expose them through `.agents/skills/` and generated Claude/Codex copies; and limit `scripts/workflows/` to deterministic read-only repo inspection and verification recommendations. Reuse the existing doc graph, hooks, CI, QA commands, and selective Notion projection. Workflow automation must not decide product direction, promote backlog, claim user validation, update external systems, or commit, push, merge, deploy, or clean files automatically.

**Reason:** The same orientation, request clarification, idea/decision routing, dirty-worktree inspection, verification selection, Notion review routing, and publish-state reporting recur across sessions. The user often contributes situated context, discomfort, and a desired change rather than a fixed implementation instruction, so a bounded clarification step prevents literal or solution-first execution without turning every task into an interview. Encoding the sequence reduces omissions and context rebuilding, while separating deterministic collection from judgment prevents stale scripts from becoming a second product authority.

**Applies to:** Codex and Claude Code sessions, `docs/workflows/`, `.agents/skills/`, `.claude/skills/`, optional Codex user-scope skill copies, `scripts/workflows/`, package workflow commands, repo memory updates, Notion review projection, and task closeout reports.

**Reopen when:** the four workflows become too broad or stale in real use, Request Interview delays clear tasks or still misses material intent, another repeated workflow has stable inputs and completion criteria across at least several tasks, or an agent platform provides a portable workflow primitive that preserves the same repo-first and human-gate boundaries.

**Related docs:** [workflow index](./workflows/README.md), [workflow spec](./specs/2026-07-14-repeated-collaboration-workflows/spec.md), [harness README](./harness/README.md)

### 2026-07-13 - Audit the personal execution lifecycle before further platform expansion

**Decision:** Treat the next product milestone as execution-lifecycle completeness, not another broad UI-polish, Studio, creator, AI, or integration expansion. First audit completion reversal, optional scheduling, personal task add/delete/reorder, destructive-action recovery, destination projection, history, and reuse across representative Flow shapes. Implement only Blocking and High findings. Keep My Flow, Calendar, and every export on one effective personal Flow model while preserving source content, personal overlay, and execution run as separate owners. After the correction slices, require repeated-user observation before choosing account persistence, creator/update pilot, or production URL/AI backend.

**Reason:** The app already connects intake, save, edit, execute, complete, export, and reuse, but users can still encounter lifecycle gaps when they reopen completion, add a date to an undated task, change task structure, or export a heavily personalized Flow. Adding more surfaces before these transitions are coherent would widen the product while weakening the core execution contract. Automated screenshots and E2E also cannot prove repeated-use understanding.

**Applies to:** My Flow, Calendar, URL/memo drafts, public saved copies, personal overlay, run history, version review, Calendar/checklist/sheet/memo export, P23 planning, and observed-user QA.

**Reopen when:** observed users show that structural editing is unnecessary, a canonical adapter cannot preserve the proposed personal structure safely, or continuity/account needs block the lifecycle before local editing does.

**Related docs:** [Execution Lifecycle Completeness spec](./specs/2026-07-13-execution-lifecycle-completeness/spec.md), [done/next workboard](./content-audit/2026-07-13-flowme-done-next-workboard-ko.html), [P22 current reassessment](./content-audit/2026-07-11-claude-design-p22-current-reassessment-ko.md)

### 2026-07-12 - URL-to-Flow uses a rich canonical core, rules-first conversion, and a split production gate

**Decision:** Build URL-to-Flow as `safe intake/lookup -> snapshot -> SourceRow extraction -> deterministic structure -> bounded LLM semantic proposal -> validator -> human review -> explicit save -> projection`. Keep the canonical model richer than any external destination and require every adapter to state direct mapping, grouping/flattening, Memo fallback, omission, or forbidden loss. Item count is source-derived; an interactive `maxItems` value is a processing cap, not a target count. Do not invent actions or sequential dates to fill a draft, and do not save, publish, or write Calendar before review. Proceed now with runtime validation, compatibility adapters, projection parity, fake-provider failure fixtures, and cost instrumentation. Keep arbitrary production URL fetch, real LLM, automatic retry, and direct external-account writes at No-Go until rights/retention, URL security, privacy/provider policy, numeric cost/latency thresholds, rollback, and canary evidence close.

**Reason:** The canonical content and storage contracts are strong enough to support deterministic implementation work, but existing Step-first export wording and the AI draft's fixed 3-7 count could cause source loss or invented actions. Production intake also adds SSRF, rights, retention, provider, cost, and failure-recovery risks that a model SDK or database choice does not solve. A rich core plus explicit adapters preserves one Item across calendar, checklist, sheet, and memo without reducing the source to ICS or cloning each destination.

**Applies to:** URL intake, source fetching and extraction, canonical proposal generation, AI provider adapters, review/save states, persistence, migration, ICS/checklist/todo/sheet/memo exports, cost/latency controls, rights/privacy/security operations, and external-platform integration sequencing.

**Reopen when:** golden fixtures cannot express representative source shapes without artificial complexity, observed users consistently need a different Item boundary, a selected provider/runtime changes the risk or cost envelope with verified evidence, or repeated export friction proves one narrow direct integration is worth its permission and support burden.

**Related docs:** [backend readiness contract](./specs/2026-07-12-url-to-flow-backend-readiness/spec.md), [projection/loss matrix](./specs/2026-07-12-url-to-flow-backend-readiness/projection-loss-matrix.md), [rules vs LLM table](./specs/2026-07-12-url-to-flow-backend-readiness/conversion-decision-table.md), [risk/QA checklist](./specs/2026-07-12-url-to-flow-backend-readiness/risk-qa-checklist.md), [PPT-style decision deck](./content-audit/2026-07-12-flow-content-backend-goal-presentation-ko.html)

### 2026-07-11 - Item is the canonical minimum execution unit; ICS and checklist are projections

**Decision:** Use `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map` as the canonical hierarchy for new source conversion, backend, database, versioning, and export work. `Item` is the smallest unit that can independently hold completion, decision, record, hold, and occurrence state. `SourceRow` is the smallest provenance unit, and `Step` is an ordered semantic group that does not replace child Item state. Calendar/ICS, checklist/todo, sheet, and memo are projections of the same effective model rather than canonical storage or content units. Keep schedule, recurrence, completion, record fields, decision fields, memo, caution, and source support as orthogonal Item facets. Published source/content, internal review, user overlay, execution run, and occurrence override remain separate, with user edits and run state preserved across content-version review.

This explicitly reopens the June bridge that described Step as the minimum saved/exportable row. That mapping remains only as a compatibility adapter for genuinely bundled legacy events. New canonical mapping is `FlowSection -> Step`, `FlowItem -> Item`, and `FlowItemDetail -> Memo/Field/SourceRef`; explicit nested source Items must not be flattened into detail prose.

**Reason:** ICS cannot represent unscheduled checks, decisions, record fields, evidence, or cautions, while a checklist cannot represent recurrence, date windows, or structured records. The current primary `itemType` labels also mix time, behavior, and metadata, causing information loss. A stable Item plus independent facets allows one real action to project consistently to calendar, checklist, sheet, and memo while retaining source-row provenance and user state.

**Applies to:** URL-to-Flow backend output, content conversion, source snapshots and rows, Flow/Step/Item naming, database and API contracts, My Flow copies and runs, version review, ICS/checklist/sheet/memo export, current-model compatibility adapters, and golden fixtures.

**Reopen when:** representative source-backed fixtures cannot round-trip through the canonical model without invented actions, independently checkable Items consistently create unusable cognitive load in observed sessions, or an external interoperability standard can express the full execution, provenance, overlay, and version contract without loss.

**Related docs:** [canonical model spec](./specs/2026-07-11-canonical-flow-data-model/spec.md), [reference contract](./specs/2026-07-11-canonical-flow-data-model/canonical-flow-contract.ts), [Korean review board](./content-audit/2026-07-11-flow-canonical-data-model-review-ko.html)

### 2026-07-11 - Sparse lifecycle, operator template, and localization gates

**Decision:** A source-backed Flow does not need multiple visible Items. An official lifecycle obligation may use one primary Item when the source defines a due date or date window, a real consequence, and any conditional next step; supporting inspection phases and fee tables stay in memo/detail. Creator/operator meta content may pass when the primary source supplies a complete reusable row set, a named audience, and a natural calendar, sheet, or checklist destination; broad strategy prose still fails. A translated sensitive source does not pass for Korean users unless its care, insurance, legal, document, and administrative context is locally applicable or explicitly reviewed.

**Reason:** The Round 2 source review found three cases that topic-level rules handled poorly: automobile inspection is useful despite having only one primary user action, a complete 30-day creator calendar is executable despite being operator content, and a 55-row Korean-language hospital-bag page is unsafe to promote because its underlying context is American and commercially tied to cord-blood services. Item count, topic label, and translation language are therefore insufficient promotion signals.

**Applies to:** source scouting, Source-to-Flow conversion, official renewal and inspection Flows, creator/operator templates, translated health and hospital sources, content portfolio promotion, `.agents/skills/flow-content-conversion`, and future app handoffs.

**Reopen when:** observed users cannot act on a one-Item lifecycle Flow, the app gains verified locale-aware policy adapters, or creator templates require private analytics and goals that can be represented without expanding the current calendar/todo input model.

**Related docs:** [source selection rules](./flow-rules/flow-content-source-selection.md), [Round 2 review](./content-audit/2026-07-11-content-portfolio-expansion-round2-review-ko.md), [Round 2 board](./content-audit/2026-07-11-content-portfolio-expansion-round2-board-ko.html)

### 2026-07-11 - Source conversion and catalog promotion are separate gates

**Decision:** Keep the existing Source-to-Flow Conversion Gate as the authority for whether one primary source can become one executable Flow. Evaluate catalog expansion separately with `lifeArea`, `planningPattern`, and `portfolioRole`. A candidate reaches `ready_for_internal_canary` only when its source rows, generated Item mapping, omitted/bundled content, minimal setup, export mapping, source/risk/rights boundary, score-by-score comments, and mobile review artifact are all present. Keep `ready_for_internal_canary`, `ready_second_wave`, app insertion, public exposure, and observed-user validation as different states. User-facing `contentBundles` must remain separate from internal `reviewRecords`.

**Reason:** The prior rules were strong for evaluating one conversion but did not reliably explain which empty life problem to fill next or when a candidate was truly ready for an app handoff. Keeping the gates separate expands coverage without weakening source fidelity or leaking planning language into user content.

**Applies to:** web source scouting, content portfolio planning, source-backed Flow/Map preparation, seed handoffs, score artifacts, mobile review HTML, `.agents/skills/flow-content-conversion`, and future `/flows` breadth canaries.

**Reopen when:** observed users cannot understand the three coverage axes, the current app model cannot represent prepared artifacts without new fields, public rights review requires stricter promotion states, or catalog navigation adopts a tested user-facing taxonomy.

**Related docs:** [source selection rules](./flow-rules/flow-content-source-selection.md), [pre-app review](./content-audit/2026-07-11-content-portfolio-preapp-review-ko.md), [mobile review board](./content-audit/2026-07-11-content-portfolio-preapp-board-ko.html), [implementation handoff](./content-audit/2026-07-11-content-portfolio-preapp-handoff-ko.md)

### 2026-07-11 - Notion is a selective operations view, not the project source of truth

**Decision:** Keep the existing repo document graph as FLOW's canonical project memory. The adopted FlowMe Notion operations board publishes only the active information a human needs to prioritize or unblock work: human decisions, requested input, result reviews, external actions, high-level AI work packages, blockers, next checkpoints, done-when conditions, and links to repo evidence. Map each projected item to a durable product direction, and use the operations home to show the user's current decisions and actions in the context of FLOW's larger product loop. The home also keeps a Now/Next/Expansion/Long-horizon map sourced from `docs/PRODUCT_PRINCIPLES.md` and `docs/IDEAS.md`; showing a deferred vision item there does not promote it into the active backlog. It must distinguish the product-validation Stage from implementation capability, show completed/conditional/unstarted gates and the current repo baseline, and state the evidence required for the next Stage or release-grade decision. After substantial strategy, research, UX, QA, or release work, classify any human follow-up as blocking decision, useful feedback, direct/external action, or ongoing awareness and surface only those items in the top feedback queue with an exact ask, recommendation, and checkpoint; AI-owned follow-up stays separate. Keep detailed AI subtasks, implementation plans, full specs, file-level notes, test logs, decision history, and research evidence in their existing repo locations. On mismatch, update the repo first and treat the Notion row as a stale projection; lack of Notion access must not block repo work.

Every pinned review item must provide a directly openable primary artifact link. Use the committed GitHub file URL when available. If an essential HTML or Markdown artifact is still local and uncommitted, attach a dated Notion review snapshot plus the repo-local path, label the snapshot as non-canonical, and refresh the canonical link after commit.

**Reason:** Notion can make the current human/AI handoff easier to scan, especially what the user must review before AI can continue. Duplicating the full backlog and technical detail would create a second source of truth, increase sync work, and quickly leave one side stale. AI execution detail also changes too frequently to be useful on the human-facing board.

**Applies to:** the active FlowMe Notion home and work-item database, backlog/status reviews, AI-to-human review requests, cross-session handoffs, `docs/DECISIONS.md`, `docs/IDEAS.md`, `docs/STATUS.md`, `docs/specs/`, `docs/content-audit/`, PR evidence, and agents with or without Notion connector access.

**Reopen when:** the team deliberately makes Notion the canonical project system, reliable automated sync removes duplicate-maintenance risk, Claude Code and other supported agents gain equivalent Notion access, or the repo document graph no longer supports the required planning workflow.

**Related docs:** [00 FlowMe 운영 홈](https://app.notion.com/p/39ac0d8f693f81339a34fdb75552bc27), [agent guide](../agent.md), [harness README](./harness/README.md), [current backlog workboard](./content-audit/2026-07-02-backlog-workboard-ko.html)

### 2026-07-10 - Supported runtime and dependency hygiene are release gates

**Decision:** Use Node.js 24 as the supported local, CI, and Vercel runtime baseline. Keep direct dependencies outside known high-severity advisory ranges, run `npm run security:audit` in CI, retain Playwright failure artifacts, and use weekly grouped Dependabot updates for npm and GitHub Actions. A release-readiness claim must disclose any remaining moderate or higher audit finding instead of treating a passing build as sufficient.

**Reason:** The 2026-07-10 refresh found the repository on EOL Node.js 20 with high-severity advisories affecting Next.js, Playwright, and transitive packages. The app and E2E suite can pass while the runtime or dependency supply chain is stale, so supported runtime and automated update evidence need to be explicit release gates.

**Applies to:** `package.json`, `package-lock.json`, `.node-version`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `playwright.config.ts`, Vercel runtime selection, local verification, and release-readiness reviews.

**Reopen when:** Node.js 24 nears end of support, Vercel changes its supported runtime set, a dependency audit produces a documented false positive that cannot be fixed, or CI audit availability becomes unreliable.

**Related docs:** [TOOLING.md](./TOOLING.md), [tooling refresh board](./content-audit/2026-07-10-tooling-skills-settings-refresh-ko.html)

### 2026-07-10 - FLOW user-scope skills are generated copies

**Decision:** Keep `.agents/skills/` as the only canonical FLOW skill source. Continue generating `.claude/skills/` with `npm run skills:sync`, and allow `npm run skills:install:codex` to generate matching user-scope copies under `$CODEX_HOME/skills` for Codex tasks opened from the workspace parent. Never edit either generated target directly. Notion is adopted only as the selective operations projection defined above; PostHog, Sentry, Promptfoo, Expo, Linear, and office/calendar connectors remain trigger-gated. Do not install duplicate curated skills when an installed plugin already provides the same Figma, GitHub, browser, Sites, or deployment capability.

**Reason:** The refresh found two stale global FLOW skills and no global Korean naturalness skill even though the repo copies were current. It also found several official skill names reported as uninstalled while equivalent plugin skills were already active. Explicit generated copies solve cross-session discovery without creating competing sources of truth or redundant tool instructions.

**Applies to:** `.agents/skills/`, `.claude/skills/`, `$CODEX_HOME/skills`, `scripts/sync-skills.mjs`, `scripts/sync-codex-user-skills.mjs`, Codex tasks started above `flow-mvp/`, Claude Code discovery, and future plugin/skill reviews.

**Reopen when:** Codex reliably discovers nested repository skills from the workspace parent, user-scope installation becomes unnecessary, or a connector/evaluation/observability tool reaches its adoption trigger in [TOOLING.md](./TOOLING.md).

**Related docs:** [harness README](./harness/README.md), [TOOLING.md](./TOOLING.md), [tooling refresh board](./content-audit/2026-07-10-tooling-skills-settings-refresh-ko.html)

### 2026-07-05 - Planning insights are captured into the repo doc graph

**Decision:** During FlowMe product, source, content, creator, or community planning, important insights and direction changes must be saved in the repo doc graph during the same session instead of remaining only in chat. Use `docs/DECISIONS.md` for settled rules, `docs/IDEAS.md` for exploratory directions, `docs/content-audit/` for source/research/review artifacts, `docs/specs/` for approved multi-step work, and `docs/STATUS.md` for active blockers or temporary next-up notes.

**Reason:** Recent content expansion planning produced reusable axes such as demand validation, creator promotion fit, community remix fit, trust anchors, and source-import gates. These affect future source scouting and app-canary selection but can be lost if they stay only in the transcript.

**Applies to:** content source scouting, demand validation, creator/community loop research, URL-first acquisition, edit/fork UX planning, source-to-Flow conversion rules, app seed handoff preparation, and future agent handoffs.

**Reopen when:** a separate product knowledge system becomes canonical, the repo doc graph becomes too noisy for planning work, or the team changes the memory split between decisions, ideas, specs, status, and audit artifacts.

**Related docs:** [IDEAS.md](./IDEAS.md)

### 2026-07-05 - URL misses become local production candidate requests

**Decision:** When `/flows` URL lookup returns `miss` or `needs_review`, the user may save the URL as a local `제작 후보` request keyed by canonical URL. The request stores only canonical URL, original URL, user title, user memo, request status, saved date, and optional last lookup result. Duplicate canonical URLs must show the existing local request instead of creating another row. The user may later reopen the request list, open the original URL, re-run canonical lookup, edit title/memo, delete the local row, or open a `제작용 정보` handoff panel. If the canonical URL later resolves to an executable `hit`, `/flows` marks the candidate as `이제 실행 가능` and moves the user into the normal hit result/start flow. The `제작용 Markdown` handoff may structure the stored request, lookup state, and manual conversion checklist for later human Flow seed/content work, but it must not call AI, crawl the source, generate seed data, create admin workflow, write server/account data, or imply public demand/validation. These requests are not executable Flows until resolved, not public demand counts, not server/account data, and not evidence that a source has been converted or validated.

**Reason:** The URL-first loop should collect real user supply signals without spending AI generation cost or pretending a missing/needs-review source is ready to run. A local candidate queue preserves intent for the user, lets the user return to the same source later, and creates a handoff point for source review, concierge conversion, or AI fallback when cost/quality gates exist. The handoff panel makes that review work easier without crossing into automatic production.

**Applies to:** `/flows` URL lookup miss/needs_review result states, `/flows` requested-candidate list, `lib/flow/url-first-supply-queue.ts`, localStorage candidate queue, candidate revisit/resolved-hit handoff, candidate-to-production handoff Markdown, future source conversion queues, and future AI fallback gates.

**Reopen when:** account-backed request queues, admin review, source crawling, AI draft generation, automatic seed creation, creator/source-owner notifications, or real aggregate demand metrics are introduced.

**Related docs:** [URL lookup production slice spec](./specs/2026-07-05-url-lookup-production-slice/spec.md), [URL lookup production slice QA](./specs/2026-07-05-url-lookup-production-slice/qa.md), [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md)

### 2026-07-05 - URL production candidates close through manual source-backed registration

**Decision:** A saved URL production candidate becomes executable only when a human adds or verifies source-backed Flow seed/content for the same canonical source URL and the source-backed quality decision allows direct-route lookup. Manual source-backed registration must check canonical URL, original/source URL, sourceTrace, Step split, date/relative/repeat rules, risk/execution blockers, and the `directRouteEnabled`/`reject` decision before URL lookup exposure. `/flows` then resolves the candidate through the existing URL lookup path as a normal `hit`, shows it as executable in the local candidate list, and routes the user into the same start/export/My Flow flow used by other hits. Reject-status source-backed maps are excluded from this URL lookup registry even if they remain in internal research data.

**Reason:** This closes the candidate handoff loop without adding AI generation, crawling, admin workflow, account/server queues, or automatic seed creation. The production work remains source-reviewed and human-owned, while users who saved a candidate can later benefit from the same canonical URL once a Flow exists.

**Applies to:** `/flows` URL lookup, local production candidates, candidate-to-production Markdown handoff, `lib/flow/url-first-lookup.ts`, `lib/flow/url-first-supply-queue.ts`, `lib/flow/source-backed-my-flow.ts`, source-backed quality decisions, source-backed manual registration QA, and future manual Flow seed/content registration work.

**Reopen when:** account-backed queues, administrator review, automatic source extraction, AI draft generation, or a richer source-backed publishing lifecycle replaces local candidate rows and static source-backed registration.

**Related docs:** [URL lookup production slice spec](./specs/2026-07-05-url-lookup-production-slice/spec.md), [URL lookup production slice QA](./specs/2026-07-05-url-lookup-production-slice/qa.md), [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md)

### 2026-07-05 - Local Next production build uses build-scoped TypeScript config

**Decision:** Keep the committed production build on direct `next build` and point Next at `./tsconfig.next.json` through `next.config.ts`. Do not disable the default webpack build worker for the current Next 15.3.8 baseline.

**Reason:** During URL-first candidate management verification on Windows, repeated `npm.cmd run build` runs passed TypeScript checks but could fail when stale `.next` output or leftover build processes were present. Rechecking from a clean `.next` state showed that direct `next build` passes when the default build worker remains enabled, while `experimental.webpackBuildWorker=false` can exit silently during compile and leave partial `.next` output. The durable committed change is the build-scoped `tsconfig.next.json`, which keeps production build typechecking focused on app/runtime files while `npm test` remains the test-file gate.

**Applies to:** `next.config.ts`, `tsconfig.next.json`, local production build verification, CI parity checks if CI uses the same Next version, and future build-failure debugging.

**Reopen when:** Next.js is upgraded, CI needs a different typecheck boundary, or repeated clean direct builds fail with evidence that a cleanup wrapper or worker setting solves a reproducible problem.

**Related docs:** [URL lookup production slice QA](./specs/2026-07-05-url-lookup-production-slice/qa.md), [TOOLING.md](./TOOLING.md)

### 2026-07-05 - URL custom starts become personal My Flow copies

**Decision:** When a user chooses a lightweight custom start from URL lookup, the saved result is treated as the user's personal My Flow copy. The personal saved title, included Step ids, excluded Step ids, and local item state must remain attached to that copy. My Flow may expose a quiet personal-copy settings entry for saved name, start date, and Step include/exclude changes only; it must not become a full editor or version-management UI. Step detail export for a personal copy uses the personal title, adjusted date, included Step content, and current Step detail values for memo/Markdown, checklist text, sheet-row TSV, and dated calendar `.ics` output while retaining the original source link. Source-backed map updates may refresh current source metadata and newly available source rows, but applying an update must not overwrite the user's personal title, selected Steps, excluded Steps, start date, or saved execution state.

**Reason:** The URL-first model works only if users can lightly adapt an existing converted Flow without editing the original or losing their changes when the source changes. This keeps Stage 0 lighter than a full editor/version system while making the saved copy feel like a real personal plan.

**Applies to:** `/flows` URL lookup custom start, `/my` saved Flow execution and personal-copy settings, source-backed saved-map snapshots, source-backed persistence records, Step detail export regeneration, map update assessment/apply behavior, and future edit/fork UX.

**Reopen when:** account-backed version history, row-level merge conflicts, or a full personal Flow editor exists and can show explicit overwrite/merge choices.

**Related docs:** [URL lookup production slice spec](./specs/2026-07-05-url-lookup-production-slice/spec.md), [URL lookup production slice QA](./specs/2026-07-05-url-lookup-production-slice/qa.md), [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md)

### 2026-07-04 - Verification hooks stay repo-level and tool-agnostic

**Decision:** Use repository-level automation for the default verification hooks: local Git hooks installed by `npm run hooks:install`, plus GitHub Actions CI on pull requests and pushes to `main`. The local pre-commit hook runs `npm run docs:check`, the local pre-push hook runs `npm run verify`, and GitHub CI runs both core verification and Playwright E2E. Do not make Claude Code or Codex runtime hooks the canonical enforcement layer.

**Reason:** FLOW is intentionally shared between Codex, Claude Code, and humans. Tool-specific runtime hooks would make one agent environment canonical again. Native Git hooks and GitHub CI protect the repo regardless of which tool changed the files, while keeping local hooks light enough that planning and docs work stays fast.

**Applies to:** `.githooks/`, `.github/workflows/ci.yml`, `package.json` scripts, [TOOLING.md](./TOOLING.md), harness workflow, PR readiness, skill sync checks, docs checks, build checks, and Playwright E2E verification.

**Reopen when:** Git hooks become too noisy for normal work, CI runtime becomes too expensive, the repo adopts another central CI provider, or a specific agent runtime becomes the only supported editing environment.

**Related docs:** [TOOLING.md](./TOOLING.md), [harness README](./harness/README.md)

### 2026-07-02 - URL-to-Flow uses lookup before AI generation

**Decision:** The URL-to-Flow entry should check for an existing canonical URL conversion before using AI or creating a new Flow draft. If a Flow already exists for the same URL, FLOW should show that result first and let the user reuse it, change options, edit/fork it into a personal version, or continue to My Flow/export. AI extraction or new conversion work is the fallback when no suitable existing Flow exists or when the user explicitly chooses to revise.

**Reason:** AI generation cost should stay low, and repeated URLs should compound into reusable product value rather than re-running extraction every time. Lookup-first also creates a realistic growth loop: users create Flow links from source content, other users reuse or fork them, and the shared Flow link can eventually flow back to the original creator or content owner.

**Applies to:** URL input, URL canonicalization, duplicate URL handling, source-to-Flow conversion, Flow draft creation, edit/fork UX, My Flow save handoff, export destination previews, future creator/source adoption, and cache/version data models.

**Reopen when:** canonical URL matching proves unreliable, stale converted Flows cause user harm or confusion, AI extraction becomes cheap enough that lookup no longer matters, or observed users strongly prefer fresh regeneration over reusing prior conversions.

**Related docs:** [Flow usage entry backlog](./content-audit/2026-07-02-flow-usage-entry-backlog-ko.md), [Flow usage entry board](./content-audit/2026-07-02-flow-usage-entry-backlog-ko.html), [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md)

### 2026-07-02 - P0 tooling is applied through workflow routing rules

**Decision:** Apply high-priority tooling by routing work through the existing P0 tool lanes in [TOOLING.md](./TOOLING.md), rather than installing more tools by default. The P0 lanes are FLOW repo skills, Playwright/browser QA, GitHub workflow tools, Figma/UX design tools, and Build Web Apps/Vercel/shadcn for real frontend implementation and preview work.

**Reason:** The current environment already has the highest-priority planning, design, frontend, browser QA, and GitHub capabilities available. The bigger risk is inconsistent use: design work without design QA, frontend changes without browser verification, source conversion without FLOW skill guidance, or PR work without current GitHub evidence. A repo-level routing policy makes the available tools operational across future sessions.

**Applies to:** `AGENTS.md`, [harness README](./harness/README.md), [specs README](./specs/README.md), source-to-FLOW conversion, frontend route work, HTML workboards, PR conflict work, design-system handoff, and future tool/plugin adoption.

**Reopen when:** a P0 tool is removed from the working environment, an external planner becomes the canonical workboard, or a P1 candidate has enough concrete project demand to become a default lane.

**Related docs:** [TOOLING.md](./TOOLING.md), [tooling/plugin review](./content-audit/2026-07-02-tooling-plugin-review-ko.html), [backlog workboard](./content-audit/2026-07-02-backlog-workboard-ko.html)

### 2026-07-02 - Backlog users need an HTML workboard view

**Decision:** Backlog material that humans are expected to review or use for planning must have a readable HTML workboard view. Markdown specs, task files, `STATUS.md`, `ROADMAP.md`, and content-audit notes may remain as source and evidence, but the operational user-facing view should be an HTML page that shows current work, next work, blocked/deferred work, recent done items, priority, status, done-when, verification, and source links in one scannable surface.

**Reason:** The current backlog knowledge is rich but spread across Markdown specs, status notes, HTML audits, and task files. For actual planning, users get confused when they must compare multiple text documents. FLOW backlog management should follow the same product principle as FLOW itself: reduce cognitive load by giving people a concrete, visual working surface first and deeper evidence only through links.

**Applies to:** backlog dashboards, service-readiness reviews, content-audit planning pages, future `BACKLOG.md` or workboard data, `docs/harness/README.md`, and any session handoff intended for human planning.

**Reopen when:** a different project-management system becomes the canonical human workboard and the repo only needs machine-readable exports or archive evidence.

**Related docs:** [harness README](./harness/README.md), [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md), [Flow usage entry backlog](./content-audit/2026-07-02-flow-usage-entry-backlog-ko.md)

### 2026-06-28 - Home, Flow finding, Calendar, and My Flow use a reduced service IA for user review

**Decision:** For the next user review, user-facing service surfaces use a reduced IA with four primary tabs: `홈`, `Flow 찾기`, `캘린더`, and `내 Flow`. Home is a promise and representative starting point, `/flows` is the representative catalog, `/calendar` is the schedule-first execution surface for saved dated Steps, and `/my` is the saved Flow management workspace. The homepage exposes one primary Flow Map, up to two secondary entries, and no internal review language. `/flows` exposes two Flow Map candidates plus the accepted single Flow baseline. Checklist and routine work remains inside Flow cards, Step detail, or calendar filters instead of becoming separate global tabs.

**Reason:** The product looked like a mixed review shelf when Home, Flow finding, older single Flows, Flow Maps, and My Flow execution controls were shown at similar weight. User feedback also showed that duplicated CTAs and many cards made the service feel unfinished. Reducing the IA keeps the visible model near calendar/todo app complexity while preserving richer execution behavior under Step detail.

**Applies to:** `/`, `/flows`, `/calendar`, `/my`, `PlatformNav`, source-backed Flow Map promotion, representative single Flow exposure, My Flow E2E, content-audit reports, and future user review previews.

**Reopen when:** observed users cannot find non-representative Flow content, need direct checklist/routine tabs for repeated use, or catalog supply becomes strong enough to require a richer storefront IA.

**Related docs:** [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md), [service IA candidate reclassification](./content-audit/2026-06-28-service-ia-candidate-reclassification-ko.html), [My Flow execution simulation](./content-audit/2026-06-28-my-flow-execution-simulation-ko.html)

### 2026-06-28 - Service structure stays versioned with implementation

**Decision:** Keep the current app screen feature tree, route/component ownership, and architecture map in [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md). Any work that adds, removes, renames, or materially changes a route, screen state, shared component boundary, data contract, persistence/export path, or review surface must update that doc in the same PR or explicitly record why no update was needed.

**Reason:** FLOW now has product PoCs, research surfaces, creator/public/My Flow split, and source-backed map contracts evolving in parallel. Without a canonical service structure map, agents can keep adding screens or modules without noticing duplicated responsibilities or stale architecture assumptions.

**Applies to:** app routes, `components/flow`, `lib/flow` domain modules, specs, PR history, agent workflow, and future product/service planning.

**Reopen when:** route ownership and architecture are generated automatically from code with reliable human-readable summaries, or the repo adopts another canonical architecture registry.

**Related docs:** [SERVICE_STRUCTURE.md](./SERVICE_STRUCTURE.md), [specs README](./specs/README.md), [harness README](./harness/README.md)

### 2026-06-26 - My Flow Step export uses edited Step detail values

> **Superseded for new canonical backend/export contracts on 2026-07-11:** Keep this as the current My Flow UI/runtime bridge only. The durable minimum is now canonical `Item`; the visible Step detail edits an Item or Item overlay while Step remains grouping. See the 2026-07-11 Item decision and 2026-07-12 backend-readiness decision.

**Decision:** My Flow Step detail should regenerate portable text and calendar `.ics` output from the currently edited Step detail values: title, date, time, repeat preset, location, memo, checked Items, completion criteria, caution, and source URL. This action belongs inside the opened Step detail as a small `내 도구로 옮기기` area, not on the first saved-map or Flow inventory surface.

**Reason:** The accepted model treats Step as the minimum unit that can become calendar, todo, sheet, memo, or progress row. If a user changes a Step date or memo inside My Flow but export still uses the original source row, saved execution becomes visual-only. Keeping export controls inside Step detail preserves the Stage 0 export-first loop without making My Flow look like a full project-management workspace.

**Applies to:** `/my` Step detail, source-backed saved Flow Maps, Step-level local drafts, text fallback, calendar `.ics` output, and future todo/sheet regeneration.

**Reopen when:** account-backed Step persistence, bulk scheduling, direct Google Calendar/Todo/Sheet integrations, or richer recurrence rules replace the local Step export path.

**Related docs:** [Creator Publish Gate and Step Contract](./specs/2026-06-26-creator-publish-step-contract/spec.md), [QA Notes](./specs/2026-06-26-creator-publish-step-contract/qa.md), [checkpoint report](./content-audit/2026-06-26-creator-publish-step-contract-ko.html)

### 2026-06-26 - Saved Flow Map persistence includes Step contracts

> **Superseded for new canonical persistence on 2026-07-11:** Preserve this entry as a legacy bridge requirement. New persistence stores independently stateful canonical Items and their overlays; legacy Step contracts are regenerated through the compatibility adapter rather than defining the storage minimum.

**Decision:** A saved source-backed Flow Map persistence record should keep each child Flow's Step contracts, not only child Flow metadata and Step IDs. Each Step contract carries the Step ID, title, destination, calendar metadata, text fallback, and optional source/risk metadata. The bridge snapshot used by current My Flow may remain, but the product-ready record must be rich enough for later calendar/todo/sheet regeneration and source review.

**Reason:** The accepted hierarchy is `Flow Map > Flow > Step > Item`, where Step is the minimum saved/exportable unit and Item is nested checklist or text fallback. Without Step-level persistence, a saved map can look correct in the UI but lose the data needed to regenerate exports, preserve source detail, or keep user edits attached to the correct Step. This also prevents creator/public/My Flow route separation from becoming a visual-only convention.

**Applies to:** source-backed Flow Map saves, `buildSourceBackedFlowMapPersistenceRecord`, My Flow saved execution, future export regeneration, creator publish gate, and source-backed route tests.

**Reopen when:** account-backed persistence replaces the local bridge and defines a different durable Step schema.

**Related docs:** [Creator Publish Gate and Step Contract](./specs/2026-06-26-creator-publish-step-contract/spec.md), [QA Notes](./specs/2026-06-26-creator-publish-step-contract/qa.md), [checkpoint report](./content-audit/2026-06-26-creator-publish-step-contract-ko.html)

### 2026-06-25 - My Flow uses inline Step detail and route-specific CTAs

**Decision:** My Flow should keep the primary execution surface close to calendar/todo/reminder apps: `오늘`, `일정`, and `Flow` are the main user mental model, while checklist/routine-specific views remain secondary execution helpers. When a user taps a Step row, the detail opens directly below that row and closes by tapping the same Step again or using the local close/save/cancel actions. Public catalog/detail, My Flow, and creator routes must use route-specific CTAs instead of sharing one generic action tree: catalog routes open candidates, public detail routes save or export, My Flow executes saved Steps, and creator routes review source rows and publish readiness.

**Reason:** Recent mobile review showed that bottom-sheet detail, duplicated Flow/progress chips, and ambiguous labels such as `Flow 찾기` inside My Flow made the surface feel heavier than accepted Flow examples. Inline Step detail keeps the user in context, while route-specific CTAs prevent review/creator/catalog actions from leaking into execution screens.

**Applies to:** `/my`, `/`, `/flows`, `/f/[slug]`, `/flow-maps/[map]`, `/flow-maps/[map]/creator`, My Flow E2E, route/action audit docs, future saved execution UX.

**Reopen when:** observed users cannot find expanded Step detail inline, large saved inventories require a stronger management model, or creator/public/user route boundaries change with account-backed publishing.

**Related docs:** [My Flow/action tree audit](./content-audit/2026-06-25-my-flow-action-tree-audit-ko.html), [Home UX cleanup backlog](./content-audit/2026-06-25-home-ux-cleanup-backlog-ko.html), [FlowMe service UX backlog](./content-audit/2026-06-19-flowme-service-ux-backlog-ko.html)

### 2026-06-25 - Homepage shows only quality-gated Flow Map candidates

**Decision:** Source-backed Flow Maps should not appear on homepage or representative product surfaces just because their routes work. Homepage exposure is limited to candidates that pass the source-selection and source-to-Flow conversion gate, or to explicitly scoped review surfaces. Weak or exploratory candidates stay in PRD, content-audit, or direct-route testing until their source, conversion model, and user journey are repaired. The code-level candidate status model is `representative / candidate / revise / park / reject`, and homepage cards must use `homepageEligible` rather than a separate hardcoded candidate list.

**Reason:** The eight-card homepage preview made low-fit candidates look comparable to stronger examples. User review showed that several candidates had weak source evidence, low save intent, generic Step content, or a mismatch between source and artifact. Treating those as representative would hide the real product problem behind UI polish.

**Applies to:** homepage Flow Map entry points, source-backed Flow Map promotion, candidate batches, public demo surfaces, PRD/review separation.

**Reopen when:** there is a dedicated internal evaluation page, observed user behavior supports exposing lower-confidence candidates, or the source-backed quality gate changes.

**Related docs:** [Source-backed Flow Map Quality PRD](./specs/2026-06-24-source-backed-flow-map-productization/quality-prd.md), [Source-backed Flow Map candidate reassessment](./content-audit/2026-06-25-source-backed-flow-map-candidate-reassessment-ko.html), [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md)

### 2026-06-25 - Representative catalog candidates need coherent save-to-execute paths

**Decision:** Home and `/flows` should expose only candidates whose public detail, save action, and My Flow destination are coherent. Weak short Flows with broken or low-trust sources, unclear saved destinations, or review-heavy detail pages stay as direct-route/review candidates rather than representative service cards. Demotion from the catalog is not deletion; it means the candidate needs source repair or execution-path repair before promotion.

**Reason:** A cleaned homepage still felt like a test shelf when representative cards linked into older detail pages or saved into unclear execution states. User review specifically flagged the used-car source as unusable and the baby-food save path as unclear. The service catalog must represent flows a user can understand, save, and continue in My Flow without seeing internal review language.

**Applies to:** `/`, `/flows`, `/f/[slug]`, single-Flow save handoff, My Flow saved state, content candidate promotion, legacy candidate separation.

**Reopen when:** there is a separate internal review catalog, weaker candidates gain repaired source-backed detail and saved execution surfaces, or observed users prefer broad exploration over representative quality.

**Related docs:** [Home UX cleanup backlog](./content-audit/2026-06-25-home-ux-cleanup-backlog-ko.html), [Source-backed Flow Map candidate reassessment](./content-audit/2026-06-25-source-backed-flow-map-candidate-reassessment-ko.html), [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md)

### 2026-06-24 - My Flow shows map update notices without auto-applying source changes

**Decision:** Saved source-backed Flow Maps should be reassessed against the current map definition when My Flow loads. If the saved map is no longer up to date, My Flow shows a compact update notice in the Flow tab with the affected map, user-facing reason copy, a link back to the public map, and a temporary dismiss action for the same saved/current version pair. It does not automatically mutate saved Steps or checked state.

**Reason:** Official or sensitive maps can change after a user has saved them. Silent mutation would undermine trust and could mix old user progress with new source rows. A notice keeps the execution surface simple while making update review visible.

**Applies to:** `/my` Flow tab, source-backed saved Flow Maps, official/sensitive schedule maps, saved snapshot comparison, update review notice.

**Reopen when:** users need to apply map updates from My Flow, compare old/new Step rows, or manage dismissed notices across devices/accounts.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md)

### 2026-06-24 - My Flow Calendar shows scope filters only when they reduce crowding

**Decision:** My Flow Calendar may expose a compact `전체 / 지도 / 일정 / 루틴` scope filter, but only when the current saved set actually mixes those row types. The filter changes calendar events and selected-date detail together. If a saved set is effectively one type, the filter stays hidden so a single timeline or schedule does not gain extra controls.

**Reason:** Users need a way to reduce crowding when many saved Flows create schedule and routine rows in the same month. Always-visible category tabs make simple Flows feel heavier than calendar/reminder apps. Conditional filters keep dense calendars usable without turning Stage 0 My Flow into a project-management board.

**Applies to:** `/my` Calendar tab, mixed saved inventories, schedule/routine display, source-backed maps mixed with regular saved Flows, mobile and desktop calendar surfaces.

**Reopen when:** observed users still cannot find dated Steps in a mixed calendar, or high-volume usage needs search, category groups, or saved-map-only views beyond this compact filter.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [Flow execution types](./flow-rules/flow-execution-types.md)

### 2026-06-24 - My Flow Calendar groups selected-date Steps by map or Flow

**Decision:** In My Flow Calendar, the selected-date detail should group Step rows by saved Flow Map or Flow before listing individual Steps. A single-Flow map shows the map title once and hides duplicate Flow/progress chips inside the Step row. A multi-Flow map may keep compact child Flow/progress chips inside rows so the user can distinguish which child Flow owns each Step.

**Reason:** A flat selected-date list becomes hard to read when several saved Flows or Flow Maps place Steps on the same date. Grouping keeps the hierarchy visible without adding global category tabs or turning the calendar into a project board. Hiding duplicate chips in single-Flow maps keeps the mobile card close to calendar/todo complexity.

**Applies to:** `/my` Calendar tab, selected-date detail, source-backed saved Flow Maps, single-child and multi-child map display, mobile and desktop calendar detail.

**Reopen when:** observed users cannot find a Step because it is nested under the group, or a high-volume calendar use case needs stronger filtering, search, or category views beyond selected-date grouping.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [Flow execution types](./flow-rules/flow-execution-types.md)

### 2026-06-24 - My Flow groups multi-Flow maps before child Flow cards

**Decision:** In My Flow `Flow별 보기`, a saved Flow Map with more than one child Flow should render as a lightweight map group before the child Flow cards. The group shows the map title, child Flow count, aggregate completion, and a map source link. Child Flow cards still own the next Step action and progress controls. Single-child maps may stay as a single Flow card with a map context chip instead of adding another wrapper.

**Reason:** A flat list of child Flow cards made Flow Map content feel like unrelated Flows, especially on mobile after saving official schedule maps such as child health checkups plus vaccinations. The map group keeps hierarchy visible without turning My Flow into a heavy project-management board. Single-child maps do not need another visual level because the card already carries enough context.

**Applies to:** `/my` Flow tab, source-backed saved Flow Maps, mobile and desktop Flow inventory, map context chips, and future multi-child creator packages.

**Reopen when:** users cannot find child Flows inside a grouped map, or saved maps commonly contain heterogeneous child Flows that need separate grouping by execution type instead of parent map.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [Flow execution types](./flow-rules/flow-execution-types.md)

### 2026-06-24 - Post-save My Flow screens stay confirmation-first

**Decision:** After saving a public Flow Map into My Flow, the post-save surface should show a confirmation panel, the first actionable Step, and at most three Step previews per Flow. The full My Flow workspace and Flow inventory should open only after the user chooses a navigation action such as `전체 Flow 보기` or the flow-specific full-view button. Dated schedules belong to the global `캘린더` tab, so the post-save My Flow panel should not add another `캘린더 보기` CTA. Step detail should expand directly under the tapped Step and close when the same Step is tapped again.

**Reason:** Showing the saved confirmation panel and the full My Flow workspace at the same time made mobile screens feel duplicated and hard to scan. A confirmation-first surface keeps the first action clear while still letting users move into full management when they are ready. Limiting previews prevents Flow Maps, especially progress maps with many source rows, from turning the save handoff into another long review page.

**Applies to:** `/my?savedMap=...`, source-backed Flow Map save handoffs, My Flow post-save panels, mobile Step detail expansion, and future Flow Map save UX.

**Reopen when:** observed users cannot find the full saved content from the confirmation panel, or analytics/session evidence shows users expect immediate full-list management directly after saving.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [My Flow before/after UX alignment](./specs/2026-05-28-my-flow-execution-hub/my-flow-before-after-ux-alignment.md)

### 2026-06-24 - Progress Flow scheduling is optional and Step-level

**Decision:** Progress-style Flow Maps, such as a curriculum or table-of-contents study map, should default to source-derived progress rows instead of requiring a calendar setup before save. A user may attach a date to an individual `Step` after saving, and only those dated Steps should appear in My Flow Calendar. Repeat settings should stay default-visible for routine Flows, not for reference/progress maps unless the source itself provides a cadence or the user explicitly opens a later bulk-scheduling tool.

**Reason:** The middle-school math map is useful as a progress table, but forcing start date, weekday, pace, or repeating study sessions made earlier PoCs more complex than the source and felt like invented study coaching. Step-level optional dates preserve the calendar/reminder-level complexity the user wants while still answering how a no-date progress Flow can enter the calendar.

**Applies to:** My Flow saved execution surfaces, source-backed progress/sheet Flow Maps, middle-school math Flow Map, future curriculum/course/source index conversions, calendar export/edit affordances, and Flow Map public save pages.

**Reopen when:** observed users repeatedly need bulk scheduling for progress maps before they can start, or a creator source provides explicit weekly pacing/repetition that should be preserved as source-derived cadence.

**Related docs:** [Flow execution types](./flow-rules/flow-execution-types.md), [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md)

### 2026-06-24 - Creator source-row review stays separate from user execution

**Decision:** Source-backed Flow Map creator pages should show how each source row becomes a generated Step and Item fallback before publishing. This review may show source/risk labels, readiness state, completion cues, memo hints, and source links, but it should not reuse My Flow execution controls or insert creator review notes into public/user screens.

**Reason:** The product repeatedly became confusing when creator review, public save, My Flow execution, and internal critique were mixed. A creator needs source-to-Step traceability before editing or publishing, while users need a lightweight saved execution surface. Keeping creator source-row review separate preserves source fidelity without making My Flow feel like an admin/review dashboard.

**Applies to:** `/flow-maps/[map]/creator`, source-backed publish package rows, creator publish checks, public Flow Map pages, My Flow saved execution surfaces, and future creator editor/version review work.

**Reopen when:** real creator sessions show review is impossible without inline editing controls in the same surface, or observed users need source-row review details inside My Flow to execute saved maps correctly.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md)

### 2026-06-24 - My Flow separates ready execution content from review and legacy content

**Decision:** My Flow should render source-backed saved maps and real-source Flows as normal execution content, while `needs_review`, preview, and legacy/unclassified saved Flows are visually separated into a lower-confidence review section. The separation belongs primarily in the Flow inventory surface. Today and Calendar should stay execution-first and should not become review dashboards.

**Reason:** Users need to know which saved content is ready to execute without reading internal review notes. A small badge inside the same card was not enough because review-needed and legacy content still looked equal to accepted source-backed content. A separate section keeps the main path simple while preserving access to older saved content.

**Applies to:** `/my` Flow tab, saved Flow inventory sheet, source-backed public saves, readiness badges, preview/needs-review/legacy saved content, and future My Flow content lifecycle cleanup.

**Reopen when:** observed users ignore the separated review section, or a formal content lifecycle/admin system provides a stronger readiness model that can replace the current lightweight grouping.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [My Flow before/after UX alignment](./specs/2026-05-28-my-flow-execution-hub/my-flow-before-after-ux-alignment.md)

### 2026-06-24 - Flow Map save keeps compatibility snapshot and persistence record separate

**Decision:** A public source-backed Flow Map save should keep writing the existing compatibility snapshot at `flow:map:saved:{mapId}` and also write a V1 productization record at `flow:map:persistence:{mapId}`. The snapshot remains the lightweight bridge consumed by current My Flow grouping. The persistence record carries schema version, source surface, readiness, update assessment, and child Flow bindings for later DB, update review, and creator workflow work.

**Reason:** Replacing the current saved map snapshot would risk breaking the accepted My Flow surface. But the snapshot alone is not explicit enough for production persistence or future creator/source update handling. Keeping the two records separate lets the user surface stay simple while preserving enough structure for the next product slice.

**Applies to:** `/flow-maps/[map]` public save, `SourceBackedFlowMapSaveButton`, source-backed adapter records, My Flow saved map grouping, future account/database persistence, and source update review.

**Reopen when:** production persistence lands and the compatibility snapshot can be derived from, migrated into, or removed in favor of a durable database record.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md)

### 2026-06-24 - Three source-backed Flow Maps define the productization baseline

**Decision:** Before adding more Flow Map UI or more categories, use three representative source-backed Flow Maps as the productization baseline: `middle-school-math-1`, `baby-health-schedule`, and `moving-d30`. These cases cover progress/sheet, official schedule/calendar, and creator timeline/hybrid shapes. They should guide the next product code slice, but they are still internal PoC and automated-behavior evidence, not user validation.

**Reason:** The recent work showed that user-facing My Flow can stay simple when source-backed maps preserve the source shape and save into Step-centered execution. It also showed that the product can drift quickly if every category gets a new custom UI or if review/creator commentary leaks into user screens. A three-case baseline keeps the next implementation grounded while avoiding another broad PoC loop.

**Applies to:** `/flow-maps/[map]`, `/flow-maps/[map]/creator`, `/my`, source-backed map persistence, saved map snapshots, creator/public/review surface separation, and future source-backed category expansion.

**Reopen when:** observed user sessions show one of the three cases is not a useful baseline, or the production persistence/editor model requires a different representative set before implementation.

**Related docs:** [Source-backed Flow Map productization baseline](./specs/2026-06-24-source-backed-flow-map-productization/spec.md), [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md)

### 2026-06-24 - Reference study maps preserve source topics as Step Items

**Decision:** For reference or table-of-contents study sources, such as a math curriculum index, FlowMe should not invent coaching tasks like range planning, wrong-answer logging, or session routines unless the source provides them. Keep one source unit as a `Step`, and put the source's subtopic links or concept rows inside that Step as `Item` checks or text fallback. The user may add a short memo for concepts to revisit, but the default Flow should read like a progress table, not a study-management app.

**Reason:** The first middle-school math Flow Map rendered correctly but felt artificial because every Step reused generic actions such as opening the source, marking today's range, and memoing wrong answers. The actual source is a curriculum/table-of-contents page with eight units and many subtopic links. Preserving those source rows gives the user enough necessary information without making the UI heavier than a calendar/todo-style progress list.

**Applies to:** Source-backed study Flow Maps, Mathbang middle-school math fixtures, progress/sheet destinations, My Flow Step detail, creator source-row checks, and future education/reference conversions.

**Reopen when:** a study source provides an explicit schedule, assignments, wrong-answer workflow, or creator-led routine that legitimately makes session planning or log fields part of the source-derived artifact.

**Related docs:** [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md), [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md)

### 2026-06-24 - My Flow separates ready content from review or legacy content

**Decision:** My Flow should keep product-ready saved content visually separate from review, preview, or legacy content. Source-backed saved Flow Maps, real-source Flows, and map-backed child Flows can appear as normal execution cards. Preview, `needs_review`, and older unclassified Flows should be grouped or badged as sample, review-needed, or legacy content instead of appearing at the same confidence level. In save-to-My-Flow handoffs, Step details should open directly under the selected Step row; only calendar/date contexts may use a separate selected-date panel or mobile sheet.

**Reason:** The post-save My Flow path became usable once it showed concrete Step and Item content, but it still risked mixing accepted source-backed execution paths with older PoC or unreviewed content. Users also lose context when a card opens detail far below the tapped row. Separating content readiness and keeping detail expansion local preserves calendar/todo-level complexity while making the saved artifact feel actionable.

**Applies to:** `/my`, source-backed Flow Map save paths, saved Flow grouping, Flow card status badges, post-save Step expansion, future My Flow inventory cleanup, and content migration from PoC fixtures into product surfaces.

**Reopen when:** observed users prefer one undifferentiated saved library, or a formal content lifecycle/admin review system replaces the current lightweight readiness grouping.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [Flow execution types](./flow-rules/flow-execution-types.md)

### 2026-06-24 - Single mobile My Flow defaults depend on Step shape

**Decision:** On mobile My Flow, a single saved dated Flow should still open in the lightweight Today surface, but a single saved non-dated progress/sheet Flow should default to the Flow card surface even when global tabs are hidden. The single-saved screen stays simple, but the primary action must still reveal the Step detail and source-derived Item checks without requiring a hidden tab.

**Reason:** Manual mobile rehearsal of the public middle-school math Flow Map save path showed that hiding tabs and forcing `today` made the `sheet` action look tappable while leaving no visible Step detail target. The accepted single-saved simplification is still valid for dated calendar/todo Flows, but non-dated progress/sheet Flows need the Flow card surface as their minimal execution view.

**Applies to:** `/my` mobile single-saved state, source-backed progress/sheet Flow Maps, Flow card primary actions, Step detail rendering, and future saved Flow Map execution paths.

**Reopen when:** observed users expect all single-saved Flows to start from Today regardless of date shape, or a first-class mobile Map/Step launcher replaces the current single-saved card behavior.

**Related docs:** [My Flow before/after UX alignment](./specs/2026-05-28-my-flow-execution-hub/my-flow-before-after-ux-alignment.md), [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md)

### 2026-06-24 - My Flow action cards must be visually distinct from summary cards

**Decision:** In My Flow execution surfaces, static summary or inventory cards should not reuse the same visual language as tappable Step, Flow, or Flow Map controls. Clickable cards should expose a clear outcome label such as `열기`, `접기`, `보기`, or `선택됨`; static cards should remain informational and should not carry selected/active styling. User-facing PoC files must stay free of review commentary, with rehearsal or evaluation notes kept in a separate report artifact.

**Reason:** The saved-execution v11 PoC showed that users could not reliably tell whether some cards were buttons or explanations when summary, map, and action cards shared the same border, active state, and card treatment. Separating information cards from action cards keeps My Flow close to calendar/todo complexity and prevents review UI from leaking into the product surface.

**Applies to:** My Flow Today, Calendar, Flow, and Map tabs, saved Flow Map inventory summaries, clickable Step and Flow cards, content-audit user PoCs, and paired rehearsal reports.

**Reopen when:** observed users prefer lower-label card controls, or the production design system introduces a stronger universal affordance that makes outcome labels unnecessary.

**Related docs:** [My Flow saved execution v11](./content-audit/2026-06-24-my-flow-saved-execution-v11-ko.html), [v11 rehearsal](./content-audit/2026-06-24-my-flow-saved-execution-v11-rehearsal-ko.html)

### 2026-06-23 - Public Flow Map saves keep a versioned map snapshot

**Decision:** Saving a public Flow Map should write both child Flow saved records and one parent map snapshot, keyed as `flow:map:saved:{mapId}`. The snapshot stores map version, saved child Flow slugs, Step counts, risk levels, source checked dates, saved time, and the shared anchor when present. Update assessment should stay a product contract first: same version is quiet, missing maps require reconnect, safe low-risk patch updates may be auto-applied later, and official or sensitive schedule changes require user review before applying.

**Reason:** Flow Map is more than a bundle of child Flows. Without a parent snapshot, FlowMe cannot later answer whether a creator/source update changed the saved map, whether the user's saved child Flows still match the published structure, or whether a sensitive official schedule should be reviewed before updating. The snapshot lets My Flow remain simple while preserving enough metadata for future version/update UX.

**Applies to:** `/flow-maps/[map]` public save, source-backed map packages, My Flow saved-library state, future creator update publishing, official schedule updates, and Flow Map version policy.

**Reopen when:** production persistence replaces localStorage or observed users show they expect child Flow updates without parent-level map history.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [source-backed adapter](../lib/flow/source-backed-my-flow.ts)

### 2026-06-23 - Mobile My Flow shows small saved inventories directly

**Decision:** On mobile My Flow, when the visible saved Flow inventory is small, currently 1-4 Flows, show the Flow cards directly in the Flow tab instead of hiding them behind a `Flow 찾기` hub. Keep the search/inventory hub for larger inventories where a long list would make the tab heavy.

**Reason:** The source-backed baby health save path proved that the records were stored and Today showed due/overdue Steps, but the mobile Flow tab looked empty because it only showed a `Flow 찾기` card. That made the product feel broken even though the data path worked. Small inventories should stay as direct calendar/todo-level cards.

**Applies to:** `/my` mobile Flow tab, source-backed public save paths, Flow Map child Flow display, and future saved-library IA.

**Reopen when:** observed users prefer a universal search-first mobile inventory even for 1-4 saved Flows, or when a first-class Map tab changes where child Flows should appear.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [service UX backlog](./content-audit/2026-06-19-flowme-service-ux-backlog-ko.html)

### 2026-06-23 - Range-based official schedules remain one Step, not multi-day progress

**Decision:** When a source row is a date range, such as a baby health checkup window, FlowMe should keep it as one executable `Step` and put the official period in the title, detail text, or calendar description. Do not use `duration_days` to represent every eligible day unless the user genuinely needs a day-by-day routine. For official health/legal-ish windows, the Step should remind the user to check, reserve, complete, or memo the result; it should not inflate progress counts or create hundreds of checkable rows.

**Reason:** The input-bearing baby health Flow Map initially used long `duration_days` values for checkup windows, which made My Flow show progress like `0/2373` for 12 real schedule rows. That violated the working model that a Step is the smallest calendar/todo/sheet unit and made the user surface much heavier than the accepted Jeonse and 10-Flow baselines.

**Applies to:** Source-backed timeline fixtures, official schedule conversion, ICS/export mapping, My Flow progress counts, baby health schedules, and future range-based public Flow Map saves.

**Reopen when:** product requirements add first-class date-window semantics that can represent eligibility periods without turning each day into a separate executable row.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [source-backed adapter](../lib/flow/source-backed-my-flow.ts)

### 2026-06-23 - Flow Map publish package keeps creator, public, and My Flow surfaces separate

**Decision:** Source-backed Flow Map work should use one package contract but separate the three product surfaces. Creator publish preparation shows source rows, generated Step rows, and publish checks. Public save-before detail shows source, generated artifact, and save actions. My Flow shows only saved execution rows through the accepted My Flow surface. The first implementation covers `/flow-maps/middle-school-math-1`, `/flow-maps/middle-school-math-1/creator`, `/flow-maps/baby-health-schedule`, `/flow-maps/baby-health-schedule/creator`, `/my?demo=source-backed`, and the real saved-record path from the public Flow Map into `/my`.

**Reason:** The user repeatedly flagged that user-facing Flow UX, creator editing, and developer/review screens were getting mixed. Keeping the map package split lets the product verify the full source-to-save-to-execute path without bloating the My Flow screen or implying the fixture is a public catalog seed. The public page should create local saved Flow records before routing to `/my`; demo mode remains available for review, but it should not be the only proof of the user path.

**Applies to:** Source-backed Flow Map packages, creator publish prep, public save-before detail pages, My Flow source-backed demo, and future creator/public map persistence.

**Reopen when:** real creator sessions show the publish-prep view needs direct editing fields before source rows are understood, or real users cannot decide whether to save a map without more public preview detail.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [service UX backlog](./content-audit/2026-06-19-flowme-service-ux-backlog-ko.html)

### 2026-06-23 - Source-backed progress rows stay on FlowItem before adding progress_step

**Decision:** The first source-backed My Flow implementation slice keeps progress-oriented rows, such as middle-school math units, as existing `FlowItem` rows and derives a `progress` bridge row for My Flow/export behavior. Do not add a first-class `progress_step` type yet. `source-backed-moving-d30` proves dated Steps can remain calendar `FlowItem`s with ICS descriptions, while `source-backed-middle-school-math-1` proves progress Steps can preserve source rows, source links, memo hints, and text fallback without a new visible user type.

**Reason:** The accepted My Flow UX should stay near calendar/todo complexity. The code slice in `lib/flow/source-backed-my-flow.ts` and `lib/flow/source-backed-my-flow.test.ts` shows that the current `FlowBundle` / `FlowItem` / `FlowItemDetail` contract can express the representative timeline and progress examples without inventing extra user-facing layers.

**Applies to:** Source-backed My Flow fixtures, Flow Map child Flow handling, progress Flow rows, ICS/text fallback mapping, and future `/my` adapter work.

**Reopen when:** progress rows need state or export behavior that the bridge cannot represent cleanly, such as durable row-level progress status, wrong-answer table fields, progress-specific sheet columns, or creator-controlled row grouping that cannot live in `FlowItemDetail` and map metadata.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [My Flow v10 product data bridge](./content-audit/2026-06-22-my-flow-v10-product-data-bridge-ko.html)

### 2026-06-23 - Source-backed bridge enters My Flow through demo path before public seed

**Decision:** Source-backed bridge bundles should be available to the actual My Flow renderer through `/my?demo=source-backed`, but they should not be promoted into the public seed/catalog by default. The demo path merges `source-backed-moving-d30` and `source-backed-middle-school-math-1` into My Flow only, separates `단일 Flow` from `중1 수학 지도`, and keeps Flow Map parent metadata in `sourceBackedMyFlowMaps` rather than exposing a heavier My Flow model.

**Reason:** This verifies the product path without implying that the source-backed fixtures are public content or final creator/publish data. It also keeps the accepted My Flow execution surface close to calendar/todo complexity while preserving the parent map relationship for later creator/public work.

**Applies to:** `/my?demo=source-backed`, source-backed My Flow adapter fixtures, Flow Map parent metadata, My Flow demo fixtures, and future creator/public Flow Map persistence.

**Reopen when:** these source-backed fixtures are ready for public catalog exposure, or when creator/public Flow Map publishing requires a durable parent-map schema instead of the bridge registry.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [service UX backlog](./content-audit/2026-06-19-flowme-service-ux-backlog-ko.html)

### 2026-06-22 - Source-backed My Flow maps to the existing Flow item contract first

**Decision:** The v9 source-backed My Flow examples should be bridged into the existing `FlowBundle`, `FlowItem`, and `FlowItemDetail` contract before introducing any new visible product hierarchy. `Flow` maps to `FlowBundle.flow`, `Step` maps to one `FlowItem`, and `Item` maps to detail text, links, completion criteria, memo hints, event description lines, sheet note fields, or nested internal checks. A user-facing `Item` should not become a separate scheduled task unless the original source makes it an independent execution row. `Flow Map` persistence remains a parent/grouping concern and should not leak into the Step detail. Progress-style source rows, such as middle-school math units, were a known gap on 2026-06-22; the first 2026-06-23 implementation slice keeps them on `FlowItem` with a derived `progress` bridge unless stronger product evidence requires `progress_step`.

**Reason:** The source-backed v9 PoC works because the visible surface stays close to calendar/todo complexity while retaining source-specific Steps and Items. The current product code already has `FlowItem.day_offset`, `duration_days`, `repeat_rule`, `source_type`, `risk_level`, `FlowItemDetail`, and ICS export descriptions. Creating a new visible data model now would add complexity before proving the current contract cannot express the accepted examples.

**Applies to:** My Flow v9 fixtures, `/my` implementation, Flow Map saved-library behavior, source-to-Flow adapters, calendar/ICS export, and future progress Flow handling.

**Reopen when:** the existing `FlowItem` / `FlowItemDetail` contract cannot preserve source rows, nested Items, calendar descriptions, source links, or progress state without awkward UI or lossy export.

**Related docs:** [Source-backed Step contract](./specs/2026-05-28-my-flow-execution-hub/source-backed-step-contract.md), [v9 source-backed My Flow](./content-audit/2026-06-22-source-backed-my-flow-v9-ko.html), [v9 rehearsal](./content-audit/2026-06-22-source-backed-my-flow-v9-rehearsal-ko.html), [Flow execution types](./flow-rules/flow-execution-types.md)

### 2026-06-22 - My Flow UI PoCs need source-backed fixtures before product judgment

**Decision:** Treat the current My Flow v8 progressive-management PoC as a UI/IA validation artifact, not as proof that the included Flow contents are source-faithful. Before using this UI to judge product readiness, replace the rough or partially-derived sample data with source-backed fixtures that pass the Source-to-Flow gate: one primary source, one user job, a natural artifact, source-derived Steps/Items, and no invented checklist filler. The accepted UI shell can be reused, but the content model must be rebuilt from real source rows and previously accepted Flow conversion principles.

**Reason:** User review on 2026-06-22 found the v8 UI generally clean, but noted that several Flow contents still look partial or roughly mocked rather than fully derived from original content. A polished My Flow surface can hide weak content conversion, so source fidelity must be tested separately before the UI is treated as service-level evidence.

**Applies to:** My Flow v8 fixtures, future source-backed My Flow PoCs, representative Flow sample batches, Flow Map user PoCs, and any claim that My Flow can manage creator/source-based Flow content.

**Reopen when:** a source-backed fixture pass shows that real Flow contents make the My Flow surface significantly heavier, require different Step detail fields, or need a different saved-content IA.

**Related docs:** [My Flow v8 progressive management](./content-audit/2026-06-21-my-flow-v8-progressive-management-ko.html), [v8 rehearsal](./content-audit/2026-06-21-my-flow-v8-progressive-management-rehearsal-ko.html), [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md)

### 2026-06-22 - Step can carry calendar-event metadata for future ICS export

**Decision:** A Step is still the minimum user-facing execution row, but it may carry calendar-event-compatible metadata for future iCal/ICS export and schedule adjustment. This can include fields such as start date/time, end date/time or duration, all-day flag, timezone, recurrence, reminder, location, URL, description/body text, and status. These fields should remain internal/export metadata unless the user is explicitly editing a calendar export or schedule setting; My Flow execution screens should not expose raw ICS fields by default.

**Reason:** The user noted that a Step can represent a calendar schedule item and therefore may need ICS-format data later. Capturing this now prevents the team from treating Step as only a plain checklist row, while still protecting the current UI from calendar-form complexity.

**Applies to:** Step data modeling, calendar export, iCal/ICS generation, schedule adjustment UI, My Flow Step detail, and future export/storage schemas.

**Reopen when:** real calendar export tests show that Step-level metadata is insufficient, or when recurrence/timezone/reminder editing becomes a primary user workflow rather than export metadata.

**Related docs:** [Flow execution types](./flow-rules/flow-execution-types.md), [My Flow v8 progressive management](./content-audit/2026-06-21-my-flow-v8-progressive-management-ko.html)

### 2026-06-21 - My Flow separates individual Flows from Flow Maps

**Decision:** My Flow should separate `Today`, `Calendar`, individual saved Flows, and Flow Maps instead of showing every saved unit in one duplicated list. `Today` can aggregate due Steps from individual Flows and child Flows inside maps. `Calendar` is a secondary date-finding view: it shows dated Steps on a month grid but should not expand every date's items by default. If a selected date contains many Steps, the date detail should first group them by owning Flow or Flow Map path instead of introducing conditional category tabs; global category tabs should not be added by default. The `Flow` tab should show standalone saved Flows only. The `Map` tab should start from the parent Flow Map, then reveal child Flows and their Steps through one-depth-at-a-time drilldown instead of nested expansion. Step details, checks, and memo should stay hidden until the user selects a Step, and on mobile they should open directly under the selected Step row rather than at the bottom of the whole list. Selecting the same Step again closes the detail. User-facing Step detail should not show separate `execution basis` blocks or outside-app fallback text by default; those belong to export/handoff surfaces when the user explicitly needs them. Today and Calendar should not repeat date badges on every Step because the date context is already set, while Flow and Map views can keep date badges to explain when a Step happens. Step rows should carry the owning path as quiet metadata only where it adds context, such as Today or an ungrouped Calendar list. Inside an already-open Flow or Map, hide repeated owning path and completion count because the parent card already provides that context. Do not repeat row-level progress bars when the parent Flow card already shows progress. A selected Step detail should feel closer to a calendar/todo detail than to a review card, so it should show the minimum execution metadata such as `일정`, `저장`, and `진행` before item checks and memo. Flow, Map, Step, and Item depth should be visually distinguishable without turning the page into a dense dashboard. In Map drilldown, tapping the open upper Flow area should collapse the lower Step list.

**Reason:** The v7 My Flow management PoC handled variable Step counts and Flow Maps, but it still felt like a dense dashboard because map child Flows appeared both as saved Flow rows and again inside the map. User mobile feedback on v8 showed that opening Step details at the bottom forced extra scrolling, Step rows lacked enough Flow context in aggregate views but repeated too much context inside Flow cards, Flow/Step/Item depth looked too similar, row-level progress bars repeated parent progress, and repeated date/status/external-text blocks made the user screen feel like a review surface. The revised v8 progressive-management rehearsal reduces initial visible structure: Flow first screen shows standalone Flows, Map first screen shows parent maps, Calendar first screen shows only the month grid, crowded dates are grouped by Flow path, and detailed Step content appears inline after a user selection with only item checks and memo. This better matches the accepted Jeonse and 10-Flow complexity level while keeping calendar affordance available for date-oriented users.

**Applies to:** My Flow IA, mobile Today, saved Flow list, Flow Map list, Step detail drawers, future `/my` implementation, and Flow Map user PoCs.

**Reopen when:** Observed users expect map child Flows to appear in the individual Flow list by default, or search/filter behavior makes it clear that hiding child Flows from the Flow tab prevents users from finding current work.

**Related docs:** [My Flow v8 progressive management](./content-audit/2026-06-21-my-flow-v8-progressive-management-ko.html), [v8 rehearsal](./content-audit/2026-06-21-my-flow-v8-progressive-management-rehearsal-ko.html), [service UX backlog](./content-audit/2026-06-19-flowme-service-ux-backlog-ko.html)

### 2026-06-21 - My Flow mobile adapts by saved Flow count

**Decision:** On mobile, My Flow should adapt visible controls to the number and type of saved Flows. A single saved Flow should not show every global management tab by default; after the v4 alignment pass, the mobile single-saved state hides the global tabs entirely and opens into the execution-first Today surface. Single-saved screens should also avoid standalone hold/later and item-complete action bars by default; saved state, checks, memo, source/detail, and fallback text are enough until the user has multiple Flows to manage. Multi-Flow states can keep Today, Calendar, Flow, Check, and Routine, but dense lists should open through search/filter sheets or compact pickers. On mobile, the Flow hub should expose `Flow 찾기` as the primary action and avoid separate status shortcut buttons such as `밀린 Flow` or `다음 실행` unless observed users need them. When the saved inventory exceeds 20 Flows, the mobile `Flow 찾기` sheet should not show every Flow by default; it should show a short initial set and require an explicit `전체 Flow 보기` action, while search and filters can reveal their full matching results. Compact execution rows should not repeat text buttons such as `완료` on every row; they may keep an accessible check control while the detailed completion action remains inside the item drawer. In the item drawer, completion should look like a small check toggle, not a large primary CTA, because memo/detail review is the main job once the row is open.

**Reason:** The integrated My Flow v3 simulation showed that one saved D-day Flow looked heavier than a calendar/todo app when it still exposed five tabs and repeated completion text across many overdue rows. The user also questioned whether actions like "this item complete" are necessary before a Flow is opened. Keeping the check affordance but reducing visible text preserves execution while lowering cognitive load.

**Applies to:** `/my`, My Flow mobile Today, Flow, Calendar, Check, and Routine tabs, saved-Flow count scenarios, compact execution rows, and future My Flow IA PoCs.

**Reopen when:** Observed mobile users prefer global tabs even for a single saved Flow, or direct text completion buttons prove materially faster without causing accidental completion or visual clutter.

**Related docs:** [My Flow v3 integrated simulation](./content-audit/2026-06-21-my-flow-v3-integrated-simulation-ko.html), [My Flow v3 implementation scope](./content-audit/2026-06-21-my-flow-v3-implementation-scope-ko.html), [My Flow v4 actual `/my` alignment](./content-audit/2026-06-21-my-flow-v4-actual-my-alignment-ko.html), [My Flow 20+ saved inventory check](./content-audit/2026-06-21-my-flow-ux20-large-inventory-ko.html)

### 2026-06-17 - Flow content renders differently by product surface

**Decision:** A Flow content record should not use the same screen shape everywhere. Creator screens show source structure, conversion rules, publication state, and user preview. Save-before user screens show what artifact will be created and the minimum setup input. In-app user screens show today's or the selected execution item, checks, memo, and source link. Internal conversion structure should not leak into the in-app execution surface.

**Reason:** The middle-school math Flow became too heavy when creator-side structure, save-before preview, and in-app execution were mixed into one user page. The user noted that the same Flow content likely needs different screens when viewed by a creator and when viewed inside the user's app.

**Applies to:** Creator authoring UX, public/save-before Flow pages, My Flow execution screens, Flow of Flow/curriculum PoCs, source-to-Flow previews, and future claims that FlowMe works as a creator platform.

**Reopen when:** Observed users or creators clearly prefer one shared surface across authoring, saving, and execution, or the product intentionally chooses a single canonical embedded Flow viewer for all contexts.

**Related docs:** [Math Flow context split PoC](./content-audit/2026-06-17-math-flow-context-split-poc-ko.html), [Math user Flow](./content-audit/2026-06-17-math-flowof-flow-user-poc-ko.html), [Math creator Flow](./content-audit/2026-06-17-math-flowof-flow-creator-poc-ko.html), [Math simulation report](./content-audit/2026-06-17-math-flowof-flow-simulation-report-ko.html)

### 2026-06-17 - Flow of Flow work must pass through small Flow management first

**Decision:** Do not continue Flow of Flow work by polishing parent-map screens alone. Before a parent map, pack, curriculum, or Flow of Flow is treated as a product direction, the individual child Flows must first pass the same source-to-artifact standard as the earlier Jeonse/source-gated examples, and the service must show how users manage saved Flows and how creators operate published Flows. The next validation surface is therefore: small Flow baseline -> user saved-Flow library -> creator Flow operations -> collection/curriculum/true Flow of Flow classification.

**Reason:** The latest Flow of Flow v2 PoC looked plausible but still felt far from the product because it skipped the operating layer. The user pointed out that the Flow contents were still odd, and that the real question is how passed Flow units are collected, managed, produced, and only then grouped into larger structures.

**Applies to:** `docs/content-audit/` service IA PoCs, creator authoring UX, saved Flow management, channel/collection/curriculum design, Flow of Flow candidate selection, and future claims that FlowMe works as a creator platform.

**Reopen when:** Real user or creator sessions show that parent maps can be understood and executed without first exposing child Flow artifacts and operating states, or FlowMe intentionally tests a separate visual roadmap product.

**Related docs:** [Flow service IA recovery report](./content-audit/2026-06-17-flow-service-ia-recovery-report-ko.html), [saved Flow user screen](./content-audit/2026-06-17-flow-service-user-library-poc-ko.html), [creator operations screen](./content-audit/2026-06-17-flow-service-creator-ops-poc-ko.html), [service IA simulation report](./content-audit/2026-06-17-flow-service-ia-simulation-report-ko.html)

### 2026-06-17 - Flow of Flow requires repeated child-Flow operations

**Decision:** Treat a true Flow of Flow as an upper structure that creates or manages multiple lower Flows with the same repeated operating pattern. A large theme that merely gathers different Flows is a Flow map or collection, and a timeline/checklist that can stand alone remains a single Flow. For example, "passing a certification" is usually a map, while subject-by-subject progress, practice, and wrong-answer routines can become Flow of Flow. A middle-school math year can become Flow of Flow when chapters become repeated study units. Moving preparation should remain a single timeline unless the source naturally repeats a child pattern such as room-by-room, vendor-by-vendor, or family-member-by-family-member operations.

**Reason:** The first Flow of Flow PoC over-accepted broad roadmaps and bundles. The user clarified that the product value is not "many Flows under one label" but a creator being able to define a large runnable structure and fill it with repeatable lower Flow units.

**Applies to:** Creator authoring UX, experience-map IA, `docs/content-audit/` Flow of Flow PoCs, source-to-Flow candidate selection, public route promotion, and future claims that FlowMe supports platform-level maps.

**Reopen when:** Real creator/user behavior shows that heterogeneous collections are saved, executed, and revisited like repeatable child-Flow structures, or FlowMe intentionally launches a separate collection product mode.

**Related docs:** [Flow of Flow v2 candidate reassessment](./content-audit/2026-06-17-flowof-flows-v2-candidate-reassessment-ko.html), [Flow of Flow v2 model](./content-audit/2026-06-17-flowof-flows-v2-model-ko.html), [Flow of Flow v2 user PoC](./content-audit/2026-06-17-flowof-flows-v2-user-poc-ko.html), [Flow of Flow v2 creator PoC](./content-audit/2026-06-17-flowof-flows-v2-creator-poc-ko.html), [Flow of Flow v2 simulation report](./content-audit/2026-06-17-flowof-flows-v2-simulation-report-ko.html)

### 2026-06-17 - Source-to-Flow conversion must start from one primary source and one natural artifact

**Decision:** Representative source-to-Flow work must pass the [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md) before UI design or batch expansion. Each Flow needs one primary source, one user job, and one natural artifact such as calendar, checklist, memo, sheet, todo, or bucket item. Supporting links may provide official boundaries or utility, but they must not control the Flow structure. Fixed checklist counts, artificial sections, and top-level inputs that should live in memo/detail/URL are treated as conversion failures.

**Reason:** The 2026-06-16 ten-sample PoC was clickable but user review showed it was not service-ready: multiple sources were blended into one Flow, several candidates had three checklist rows forced into each section, and fields such as guide URLs, listing URLs, method choices, and repeat intervals were exposed as setup inputs without being required by the artifact. The product risk is false polish: a screen can look organized while failing the original content-to-execution job.

**Applies to:** `docs/content-audit/` source-to-Flow PoCs, representative category batches, future Jeonse-level UX/UI samples, `/content-flows` previews, public `/f/[slug]` route promotion, seed Flow creation, and Figma/UI pattern work.

**Reopen when:** Observed users prefer multi-source synthesized Flows over creator/source-specific saved artifacts, or FlowMe intentionally launches a separate "AI generated plan" product mode distinct from source-to-Flow conversion.

**Related docs:** [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md), [10 Flow user samples](./content-audit/2026-06-16-ten-flow-user-samples-ko.html), [10 Flow expansion report](./content-audit/2026-06-16-ten-flow-expansion-report-ko.html), [2026-06-16 user feedback](../my_tests/260616_check_01.md)

### 2026-06-17 - Small Flow conversion does not prove the creator platform or experience map

**Decision:** The current small source-to-Flow work proves only the lowest execution unit: one source can become one calendar/checklist/sheet/memo/bucket artifact. It does not by itself prove FlowMe as a creator platform or experience-map service. Future platform validation must add a higher layer where a creator can define a large experience map, such as a certification journey, moving journey, parenting preparation, or learning path, and then attach smaller Flow contents inside that map. Users should be able to save the full map or select only the child Flow they need.

**Reason:** The user clarified that FlowMe should let creators turn their own content and experience into a platform-level map, not only isolated checklist items. For example, a certification creator may draw the whole route to earning the certificate, then fill it with child Flows for eligibility checks, registration dates, subject study schedules, practice routines, exam-week preparation, and post-pass paperwork. The 2026-06-17 ten-sample UX pass mostly tested child Flow artifacts, so it should not be treated as complete platform validation.

**Applies to:** Creator authoring UX, experience-map IA, source-to-Flow batches, `/content-flows`, public `/f/[slug]` route promotion, future creator pages, and any claim that FlowMe works as a platform rather than only a converter.

**Reopen when:** Observed creators consistently prefer publishing only independent one-off Flow artifacts, or user behavior shows that map-level navigation adds friction without increasing save, export, check, or return behavior.

**Related docs:** [Source-to-Flow conversion gate](./flow-rules/source-to-flow-conversion-gate.md), [source gated user sample](./content-audit/2026-06-17-source-gated-flow-user-v2-ko.html), [candidate reassessment](./content-audit/2026-06-17-source-gated-candidate-reassessment-ko.html), [simulation report](./content-audit/2026-06-17-source-gated-simulation-report-ko.html)

### 2026-06-15 - Representative categories must prove product/business connection

**Decision:** Category coverage is not enough reason to keep a source-to-Flow candidate. When expanding beyond the Jeonse baseline, replace a category or source if it does not help prove a FlowMe business/product hypothesis: a real user would save it after consuming the source, the resulting artifact clearly becomes calendar/checklist/sheet/memo, the source has visible demand or credible creator/official context, and the Flow demonstrates a repeatable serving pattern for future public routes, creator content, search traffic, or export use.

**Reason:** Recent PoC reviews repeatedly showed the same failure mode: weak or mismatched sources were pushed into a common UI shell because the batch wanted category variety. That created confusing buttons, forced stages, and cards that looked like UX review artifacts rather than natural user screens. The user clarified that category content can be changed when the business connection is weak, so representative sets should optimize for source-to-Flow proof rather than taxonomy decoration.

**Applies to:** `docs/content-audit/` source-to-Flow reviews, representative category batches, public `/f/[slug]` candidate promotion, `/content-flows` previews, source selection rules, and future Jeonse-level UX/UI PoCs.

**Reopen when:** Real user behavior shows that a low-business-connection category still drives meaningful saving/reuse, or FlowMe intentionally runs an edge-case breadth test separate from representative candidate work.

**Related docs:** [Flow content source selection rules](./flow-rules/flow-content-source-selection.md), [6 category source-to-Flow UX design](./content-audit/2026-06-15-six-category-source-journey-flow-ux-ko.html), [6 category user PoC](./content-audit/2026-06-15-six-category-jeonse-level-user-poc-ko.html)

### 2026-06-08 - External ecosystem analysis ends in a compression gate

**Decision:** Reviews of apps, services, platforms, competitors, content sources, and API opportunities connected to FlowMe must end in a compression table before feature work. The table should name the user moment, natural artifact, minimum anchor, Stage 0 behavior, decision state, and do-not-build boundary.

**Reason:** Platform and competitor research can easily turn into a feature wishlist. FlowMe needs each analysis to decide whether the result is a source-to-Flow experiment, an export destination rule, a competitor boundary, future platform work, or a reject-for-now direction.

**Applies to:** External ecosystem analysis docs, `/content-flows` candidate promotion, export destination decisions, API/integration proposals, and future competitor reviews.

**Reopen when:** Real user behavior shows a platform-specific integration or vertical focus should replace the current export-first Stage 0 analysis gate.

**Related docs:** [External ecosystem analysis roadmap](./content-audit/2026-06-08-external-ecosystem-analysis-roadmap.md), [Phase 5 compression table](./content-audit/2026-06-08-external-ecosystem-phase5-compression-table.md)

### 2026-06-07 - Representative content discovery must diversify user moments

**Decision:** Representative Flow content discovery should not keep selecting the same high-fit maintenance, moving, wedding, and used-car examples. Each review batch should intentionally include different user moments and artifact patterns, such as travel setup, creator recipe/video execution, kids play, study, household maintenance, buying decisions, and official/admin checklists.

**Reason:** The user clarified that the direction was not wrong, but repeated examples made it hard to judge whether FlowMe can handle broader external content. Good representative candidates should test whether the lightweight calendar/checklist/memo UX works across meaningfully different contexts, not only whether one familiar category can be polished.

**Applies to:** `/content-flows`, Korean source candidate discovery, source scoring docs, representative candidate promotion, static content-audit HTML, and future seed Flow selection.

**Reopen when:** Real user behavior shows one vertical should dominate Stage 0 testing, or a category-specific product focus replaces broad source-to-Flow exploration.

**Related docs:** [Flow content source selection rules](./flow-rules/flow-content-source-selection.md), [STATUS.md](./STATUS.md)

### 2026-06-07 - Baby food Flows prioritize menu calendars over reaction logging

**Decision:** Early baby-food Flows should lead with a start-date-based menu calendar and recipe details, not a reaction-log-first surface. Reaction and allergy notes can remain as lightweight memo or caution context, but the public execution UI should not feel like a medical record app.

**Reason:** The user clarified that a baby-food candidate is useful when the original daily/phase menu table can become a calendar or exportable schedule. A dense reaction form makes the product feel heavier than calendar/reminder tools and can blur the line between source-based meal planning and health judgment.

**Applies to:** `baby-food-menu-recipe`, meal-plan workbenches, meal calendar export, recipe disclosures, source/risk copy, and future baby/family food candidates.

**Reopen when:** Observed caregiver sessions show that the primary need is structured reaction logging rather than menu planning, or a specific official/clinical source requires a first-class record table.

**Related docs:** [STATUS.md](./STATUS.md), [FLOW quality gate](./flow-rules/quality-gate.md)

### 2026-06-07 - Source-based Flow validation starts from original-to-execution usefulness

**Decision:** The primary validation question for source-based Flow content is whether a user can read the original content and then use the Flow artifact to execute it. A Flow is not acceptable just because the UI is polished, the source is summarized, or the category seems useful. The executable artifact must let the user compare the source with the saved Flow and see the actual dates, repeat rules, checklist items, memo cues, links, and decision points they would use.

**Reason:** The current product risk is false confidence: a candidate can look like a nice Flow while losing the source's real sequence, interval, conditions, or practical checks. The user needs to judge FlowMe's usefulness from the same screen they would actually use after saving the content.

**Applies to:** `/content-flows`, public `/f/[slug]` routes, `lib/flow/seed-flows.ts`, `ArtifactWorkbench`, source-fit reviews, promoted candidates, screenshots, and E2E expectations for source-based examples.

**Reopen when:** The product has real user behavior data showing that users can reliably evaluate source fidelity from a different review surface, or the service replaces separate review previews with a single canonical production execution artifact.

**Related docs:** [FLOW quality gate](./flow-rules/quality-gate.md), [STATUS.md](./STATUS.md)

### 2026-06-06 - Public Flow examples must keep the executable artifact first without hiding required detail

**Decision:** Promoted public content Flow routes should bring the executable artifact into the first mobile viewport, but should not hide route detail that is required for execution. Timeline Flows such as wedding should show the date-based calendar and execution list first, while comparison tables remain secondary artifacts below. Maintenance routines can use a simplified workbench because the date-level checklist already carries the execution detail.

**Reason:** The user needs to judge whether a source-based Flow is actually usable from the service UI, not from a descriptive preview. Moving the artifact up helps mobile judgment, but over-simplifying a long timeline or leading with a secondary comparison artifact makes the saved Flow feel unrelated to the promised date plan.

**Applies to:** `/f/[slug]`, promoted Content Flow candidates, mobile public Flow ordering, `ArtifactWorkbench`, `FlowOverview`, route-specific renderer visibility, and E2E expectations.

**Reopen when:** Observed users prefer a single-page compressed artifact for long timelines and do not use the lower calendar/list detail.

**Related docs:** [STATUS.md](./STATUS.md), [FLOW quality gate](./flow-rules/quality-gate.md)

### 2026-06-06 - Public service Flow routes do not show internal source-fit scores

**Decision:** Public service Flow routes used for user evaluation should not show internal source-fit panels such as `대표 노출 전 보강 중`, `적합도`, or `보강 기준`. Keep those review signals in `/content-flows`, Flow Lab, docs, or non-promoted direct-access routes where source review status is the point of the page.

**Reason:** The user needs to judge whether the Flow feels like a usable service. Internal audit labels make the page feel like a test harness and compete with source-derived execution content.

**Applies to:** `washer-tub-clean-monthly`, `monstera-care-routine`, `water-purifier-filter-cycle`, promoted public Flow route rendering, and future candidates that are linked from the Content Flow evaluation screen as service examples.

**Reopen when:** The product intentionally exposes public beta/review status to end users as part of trust or creator review UX.

**Related docs:** [STATUS.md](./STATUS.md), [Content Flow evaluation](./content-audit/2026-06-06-flow-content-ui-evaluation.html)

### 2026-06-06 - Fixed-interval maintenance routines do not ask for weekday selection first

**Decision:** Maintenance routines with source-defined fixed intervals, such as monthly washer tub cleaning or 7-10 day plant checks, should ask for a start date and display the fixed repeat cadence instead of showing a generic weekday picker. Weekday selection remains available for routines where the user is genuinely choosing execution days.

**Reason:** A weekday picker makes appliance/plant maintenance feel like a workout habit setup and adds input complexity before the user has judged the Flow. The natural artifact is a management calendar plus date-level checklist, not a freeform weekly training schedule.

**Applies to:** `washer-tub-clean-monthly`, `monstera-care-routine`, future appliance/plant maintenance routes, public route setup UI, mobile first-screen checks, and content conversion rules for maintenance.

**Reopen when:** Real users need weekday-level scheduling for these maintenance Flows more than fixed interval reminders.

**Related docs:** [STATUS.md](./STATUS.md), [Content conversion playbooks](./flow-rules/content-conversion-playbooks.md)

### 2026-06-04 - Capture feature policies and pending ideas during the same session

**Decision:** When a session settles a product/UX/technical/process policy, record it in `docs/DECISIONS.md`; when a session raises a useful but uncommitted direction, record it in `docs/IDEAS.md`; when the direction becomes planned multi-step work, promote it into `docs/specs/`. Agents should not rely on chat history alone for mid-session policy changes or pending ideas.

**Reason:** FLOW direction changes often happen during informal product discussion, not only during implementation. Without an explicit capture rule, ideas such as page style directions or feature policy boundaries can be lost or repeatedly reconsidered.

**Applies to:** Agent operating workflow, product direction discussions, creator/page UX discussions, My Flow policy decisions, source/risk decisions, pending ideas, and future spec promotion.

**Reopen when:** The document graph becomes too noisy, or another durable tracking system replaces `DECISIONS`, `IDEAS`, and `specs`.

**Related docs:** [agent.md](../agent.md), [IDEAS.md](./IDEAS.md), [specs/README.md](./specs/README.md)

### 2026-05-31 - My Flow memo evidence uses memo wording

**Decision:** Keep the internal `memo_evidence` item type for rows that involve photos, file names, confirmation numbers, official results, or other proof-like context, but expose it to users as `메모` in My Flow chips and detail summaries. Do not surface `증빙` as the default shared My Flow label.

**Reason:** `증빙` sounds like a heavier proof workflow and can make My Flow feel more complex than familiar calendar or reminder apps. The current product direction is to keep proof-like context inside memo, attachment metadata, and links unless a specific Flow proves that stronger evidence capture is needed.

**Applies to:** `/my?demo=ux12`, Flow overview type counts, `memo_evidence` detail summary, future My Flow item-shape labels, and item-type copy.

**Reopen when:** A representative Flow requires explicit legal/financial/official evidence handling where `메모` hides important user intent or risk.

**Related docs:** [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md), [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-31 - My Flow overview hides log-entry chips

**Decision:** Keep `log_entry` visible inside item detail as a lightweight `오늘 기록` field, but do not show `기록` as a separate Flow overview card chip by default.

**Reason:** Flow overview cards should help users choose the next operating surface, not expose every secondary internal signal. A separate `기록` count makes cards feel more like database summaries and adds cognitive load before the user opens a specific item.

**Applies to:** `/my?demo=ux12`, `/my?demo=ux20`, Flow overview type counts, `log_entry` detail display, and future overview-card density rules.

**Reopen when:** Users need to find record-heavy Flows from the overview card before opening the Flow, or a record-first Flow becomes a representative My Flow validation target.

**Related docs:** [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md), [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-31 - My Flow large inventory thresholds

**Decision:** My Flow should treat saved Flow count as a layout threshold. With 6 or more saved Flows, the full Flow inventory starts collapsed behind `전체 Flow 보기` when the user is looking at all Flows with no search/filter applied. With 20 or more saved Flows, the long left-side Flow list is hidden and the inventory is grouped by demo group or category. Search and status filters immediately expand the matching inventory instead of requiring the user to open the collapsed list first.

**Reason:** A long saved-Flow list makes the execution hub feel like a catalog and duplicates the grouped inventory. Users first need priority actions, then a searchable grouped list only when they decide to browse.

**Applies to:** `/my`, `/my?demo=ux12`, `/my?demo=ux20`, the Flow tab, production saved-Flow dashboards, and future large saved-Flow QA fixtures.

**Reopen when:** Observed users with many saved Flows rely on the left-side list more than grouped search/filter, or need persistent pinned Flow shortcuts.

**Related docs:** [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-31 - Log entries stay lightweight in My Flow

**Decision:** `log_entry` items may expose one short `오늘 기록` field in the My Flow detail sheet, backed by the same staged save/cancel behavior as title, date, time, location, and memo. Do not introduce multi-column log tables, score grids, proof statuses, or route-specific record templates in the shared My Flow detail sheet yet.

**Reason:** Users need a clear place to record an observed value, status, or result, but the input surface must not exceed familiar calendar/reminder app complexity. One short field plus memo gives a stronger recording signal without turning My Flow into a database.

**Applies to:** `/my?demo=ux12`, `log_entry` item detail, routine/vehicle/admin rows that carry record signals, and future shared My Flow detail fields.

**Reopen when:** Observed users repeatedly need structured values that cannot be recovered from one short record field and memo, or a specific Flow proves a route-level record template is required.

**Related docs:** [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md), [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-31 - Responsive routine calendar rail density

**Decision:** My Flow month-calendar routine indicators stay as semantic icons instead of dots. Desktop cells may show up to two routine icons before collapsing the rest into `+N`. Mobile cells show one 28px routine icon and collapse every additional routine into a compact `+N` counter.

**Reason:** Desktop calendar cells have enough horizontal width for two icons, but mobile month cells are too narrow for multiple 28px controls. Keeping one recognizable icon plus a compact overflow counter preserves the "icon not dot" direction while preventing vertical stacks, overlap, or clipped controls.

**Applies to:** `/my?demo=ux12`, FullCalendar routine rail rendering, routine overflow behavior, and mobile calendar density tests.

**Reopen when:** Real users cannot understand the compact mobile `+N` counter, or a future mobile calendar layout gives each date enough width for multiple full-size routine icons.

**Related docs:** [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-31 - Routine completion is item-level in My Flow

**Decision:** A routine completion action in My Flow completes the visible routine checklist item, not the whole routine Flow or every checklist step inside that Flow. The user-facing action should use current-item language such as `이번 항목 완료`, and routine rows/details should show progress such as `루틴 체크 n/전체` so users understand there are more internal checklist items. Moving a routine date from detail or dragging a visible routine icon should move only that one occurrence; broader recurring rule changes must stay behind explicit save/cancel controls.

**Reason:** Users can mistake a routine completion button for “complete the entire Flow” or “complete every internal checklist item.” The current My Flow routine model advances through the Flow's internal checklist items, so the UI needs to expose both the action unit and the remaining count.

**Applies to:** `/my?demo=ux12`, Calendar selected-day routine rows, routine detail, routine repeat editing, occurrence date edits, and routine icon drag/move behavior.

**Reopen when:** User testing shows people prefer completion to mean a different unit, such as a full routine checklist or an entire saved routine Flow.

**Related docs:** [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-31 - My Flow input complexity stays at calendar/reminder level

**Decision:** My Flow detail inputs should not become more complex than familiar calendar and reminder apps. Evidence/proof concepts may remain as internal item typing, badges, or lightweight summary context, but they should not add a separate top-level form surface by default. Users should usually capture proof-like context through the existing memo field, attachment metadata, or links hidden behind `더보기`.

**Reason:** FlowMe's execution hub should help users act, not force them into a database workflow. Evidence matters when a user may need to re-check a photo, file name, receipt, listing, confirmation number, or official result later, but exposing dedicated proof/status fields for ordinary items would make My Flow heavier than Apple/Samsung calendar or reminders.

**Applies to:** `/my?demo=ux12`, My Flow item detail, `memo_evidence` display, attachment/link placement, future evidence/proof/status field design, and item-type derivation.

**Reopen when:** Observed users repeatedly lose important proof context when it is kept in memo/attachment/link surfaces, or a selected representative Flow proves that a dedicated evidence field is necessary for safe execution.

**Related docs:** [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md), [My Flow Execution Hub QA](./specs/2026-05-28-my-flow-execution-hub/qa.md)

### 2026-05-30 - Capture durable decisions separately from ideas

**Decision:** Use this `docs/DECISIONS.md` file for settled product, UX, technical, and process decisions. Keep uncommitted or deferred thoughts in `docs/IDEAS.md`; promote committed implementation work into `docs/specs/`; keep content/source analysis in `docs/content-audit/`.

**Reason:** Prior discussion was being preserved, but important choices were spread across ideas, specs, audits, status notes, and handoff files. A short decision log makes future sessions easier to resume without treating every idea as approved work.

**Applies to:** Agent documentation workflow, planning handoffs, UX/product decisions, and future spec promotion.

**Reopen when:** The decision log becomes noisy, duplicates specs, or agents stop using the other documentation layers correctly.

**Related docs:** [agent.md](../agent.md), [IDEAS.md](./IDEAS.md), [specs/README.md](./specs/README.md)

### 2026-05-30 - My Flow item click opens detail instead of toggling completion

**Decision:** In My Flow views, clicking an item opens the shared detail editor. Completion, hold, record, and evidence actions should be handled by explicit controls inside or near the detail experience.

**Reason:** Items often require editing, proof, hold reasons, notes, or source/risk context. Treating the whole item box as a completion toggle is too ambiguous and too destructive, especially on mobile.

**Applies to:** `/my?demo=ux12`, Today view, Calendar view, Flow-specific views, and the My Flow detail editor.

**Reopen when:** Observed users consistently expect single-tap completion and do not need detail review for the relevant item type.

**Related docs:** [My Flow Execution Hub spec](./specs/2026-05-28-my-flow-execution-hub/spec.md), [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow exposes three simple item types first

**Decision:** User-facing My Flow item categories should start with `일정`, `루틴`, and `체크`. More specific concepts such as `log_entry`, `memo_evidence`, `decision_hold`, and `reference_caution` should appear as detail fields, badges, statuses, or secondary context rather than as top-level tabs.

**Reason:** Exposing too many execution types early makes My Flow feel like a complex database. The Apple/Galaxy-style baseline should stay simple while still supporting records, evidence, hold reasons, and cautions in the detail layer.

**Applies to:** My Flow type filters, item badges, detail sheet design, UX copy, and item type derivation.

**Reopen when:** Real usage shows that users need first-class navigation for records, evidence, decisions, or cautions before they can execute a Flow.

**Related docs:** [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md), [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow calendar keeps dates separate from action titles

**Decision:** Calendar cells should not repeat D-day labels such as `D-30` inside item titles. The calendar owns the date context; item text should focus on the action. Completed items can use strikethrough, and routines can use light dot indicators instead of dense event text.

**Reason:** Mobile calendar space is scarce. Mixing D-day metadata into event titles reduces scannability and makes the item feel less like an action.

**Applies to:** `/my?demo=ux12`, FullCalendar rendering, mobile calendar density, routine calendar indicators, and moving-style timeline Flows.

**Reopen when:** User testing shows D-day labels inside calendar cells materially improve execution without harming mobile readability.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow routines use a horizontal icon rail in calendar cells

**Decision:** Routine occurrences in the My Flow calendar should render as a compact horizontal icon rail near the top of the date cell, not as vertical dots. Show the first two routine icons and collapse additional routines into a `+N` overflow marker.

**Reason:** Dots are compact but too ambiguous, hard to click, and stack vertically on desktop. Icons make routine type recognizable at a glance while keeping scheduled task text readable. A `+N` marker prevents dense routine days from crowding the month grid.

**Applies to:** `/my?demo=ux12`, My Flow calendar routine rendering, desktop and mobile calendar cells, routine click targets, and item detail opening behavior.

**Reopen when:** Real users find icon meaning unclear, or dense routine days require a full popover/list instead of `+N`.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - Defer caution-specific My Flow detail UI

**Decision:** Do not design or implement a first-class `caution` detail surface in the next My Flow item-detail pass. Treat caution, risk, and other sensitive guidance as pending product work while the immediate detail sheet moves toward a calendar-style structure with title, date/time, repeat, location, memo, attachment, and links.

**Reason:** Caution content can be important, especially for health, family, finance, legal, and safety-adjacent Flows, but exposing it too early as a separate field may overload the item detail sheet and make the UI feel like an internal Flow editor. The next pass should simplify the everyday execution experience first, then revisit caution treatment with clearer rules for badges, memo placement, source separation, and sensitive-topic escalation.

**Applies to:** `/my?demo=ux12`, My Flow item detail sheet, memo/description mapping, item type display, and future source/risk UI rules.

**Reopen when:** A sensitive representative Flow is selected for My Flow validation, or users need caution visibility to complete or safely pause an item.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md), [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md)

### 2026-05-30 - My Flow item detail uses calendar-style fields

**Decision:** My Flow item detail should look like a calendar item editor: title, completion action, date, time, repeat, location, memo, attachment, and links. Source-derived `why`, `how`, and completion criteria should be composed into the memo instead of appearing as separate top-level form fields. Attachment and link metadata should sit behind a `더보기` section by default so the main editing surface stays focused on the fields users change most. `caution` remains pending per the separate caution decision.

**Reason:** Users opening an item from Today or Calendar expect a familiar event/task detail, not an internal Flow authoring schema. Memo preserves the core Flow guidance while keeping the execution sheet calmer and closer to Apple/Samsung calendar conventions. Attachments and links are useful context, but exposing them immediately makes the sheet feel heavier than a normal calendar edit.

**Applies to:** `/my?demo=ux12`, Today item detail, Calendar item detail, desktop inline detail, mobile bottom sheet, and local My Flow item drafts.

**Reopen when:** Users cannot find completion criteria after the memo merge, or a Flow category needs structured guidance fields to execute safely.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md), [Item type matrix](./specs/2026-05-28-my-flow-execution-hub/item-type-matrix.md)

### 2026-05-30 - My Flow mobile calendar uses usable event tap targets

**Decision:** My Flow mobile calendar cells should keep date-number selection separate from item-detail opening, and scheduled event rows should provide a minimum touch target instead of relying on FullCalendar's default compact event height. Closing the mobile detail sheet should also clear the active row state.

**Reason:** In user simulation, tapping the date should only activate that date, while tapping an item should open the editor. FullCalendar's default mobile event row was too short for reliable tapping, and stale active-row state can make the next detail interaction feel inconsistent after closing the sheet.

**Applies to:** `/my?demo=ux12`, mobile FullCalendar rendering, selected-day behavior, mobile detail bottom sheet, and item click handling.

**Reopen when:** Real mobile testing shows the larger event target makes dense calendar days too crowded, or the calendar moves to a dedicated agenda/list interaction for mobile.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md), [My Flow Execution Hub spec](./specs/2026-05-28-my-flow-execution-hub/spec.md)

### 2026-05-30 - My Flow execution hub does not show Studio empty state

**Decision:** The My Flow execution hub should not render the creator/studio empty state such as `아직 만든 내 버전이 없습니다` below saved Flow management. Keep only a small `스튜디오` navigation link from `/my`; show authored Flow stats, draft filters, and empty creator states inside the Studio/Profile page.

**Reason:** `/my` is for executing and managing saved Flows. Creator ownership and authoring inventory are a different mode, and showing an empty creator block at the bottom makes the execution hub feel like it is following the user with unrelated content.

**Applies to:** `/my`, `/my?demo=ux12`, creator profile navigation, and My Flow E2E expectations.

**Reopen when:** The product deliberately merges execution and authoring into one dashboard with a clearer mode switch.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow calendar starts from today and separates timing from repeat

**Decision:** The My Flow execution hub should open on `오늘` by default, including the UX12 demo. Calendar detail should show timeline offsets and phase windows such as `D-30` or `D+6~D+8` as `타이밍`, not as `반복`. Only true routine rows should expose repeat controls.

**Reason:** Users first need to know what to do now. Timeline offsets explain where an item sits in a Flow, but they are not recurrence rules. Putting them in a repeat field makes schedule editing look misleading.

**Applies to:** `/my`, `/my?demo=ux12`, Today view, Calendar view, selected-day detail, and My Flow E2E expectations.

**Reopen when:** Users prefer a planning-first default over execution-first, or when timeline Flows gain a richer “relative schedule” editor.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - Routine calendar edits use weekday controls and explicit scope

**Decision:** Routine item detail should expose weekday chips, repeat end date, and an explicit application scope (`이 항목만`, `앞으로 모든 항목`, `전체 반복`) instead of a free-text repeat field. Updating weekdays should immediately update the generated routine occurrences in the current My Flow calendar.

**Reason:** Calendar products treat recurring schedules as structured rules. A free-text repeat input does not tell users whether the current occurrence, future occurrences, or the entire series will change.

**Applies to:** `/my?demo=ux12`, routine icon rail, routine detail sheet, generated routine calendar rows, and future repeat editing behavior.

**Reopen when:** Real calendar integration requires matching a provider-specific recurrence exception model.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow calendar provides direct month navigation

**Decision:** The My Flow calendar should include a direct month picker in addition to previous/next, today, and first-schedule shortcuts. Routine end dates entered in the detail sheet should constrain generated routine occurrences in the visible calendar.

**Reason:** Long timeline Flows such as wedding D-180 or year-end tax preparation make previous/next-only navigation too slow. Routine users also expect an end date to affect what appears in the calendar, not just be stored as inert text.

**Applies to:** `/my?demo=ux12`, My Flow calendar header, routine detail repeat settings, generated routine occurrences, and E2E coverage.

**Reopen when:** A full date navigator or external calendar sync replaces the local month picker.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow separates D-day timing from step labels

**Decision:** In My Flow lists and item detail headers, relative timing such as `D-180`, `D-30`, or `D+6~D+8` should be displayed as a timing chip, while the human step label should remove that prefix. For example, `D-180 큰 일정 확정` becomes timing `D-180` plus step label `큰 일정 확정`.

**Reason:** Users read combined strings as event titles or repeat rules. Separating timing from the step label keeps calendar rows closer to Apple/Samsung calendar conventions while preserving Flow-relative context.

**Applies to:** `/my?demo=ux12`, Today rows, selected-day rows, item detail headers, and future timeline/phase My Flow displays.

**Reopen when:** User testing shows that combined D-day section labels are easier to scan than separate timing chips.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - Single-occurrence routine edits do not change repeat rules

**Decision:** In My Flow routine detail, choosing `이 항목만` should not allow editing repeat weekdays or repeat end date. It should explain that this scope is for the current occurrence's time, location, and memo. Repeat weekday and end-date edits belong to `앞으로 모든 항목` or `전체 반복`.

**Reason:** Calendar products separate occurrence edits from series-rule edits. Letting users change weekdays while `이 항목만` is selected makes the scope control misleading and risks accidental series changes.

**Applies to:** `/my?demo=ux12`, routine detail repeat editor, routine generated calendar rows, and future recurrence exception design.

**Reopen when:** My Flow implements full provider-style recurrence exceptions where a single occurrence can carry its own modified date/time while the series remains intact.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - My Flow execution rows avoid duplicate D-day labels

**Decision:** My Flow execution rows and item detail headers should show D-day timing once as a timing chip. If the Flow title itself contains a D-day token such as `D-180` or `D-30`, the execution surface should use a shortened display title such as `결혼 준비 Flow` or `이사 준비 Flow`.

**Reason:** Users read calendar rows as event/task records. Repeating `D-180` in both the timing chip and Flow name makes the row look heavier and can be mistaken for a repeat or schedule rule.

**Applies to:** `/my?demo=ux12`, Today rows, Calendar selected-day rows, desktop inline detail, mobile detail sheet, and future My Flow execution surfaces.

**Reopen when:** Flow titles become user-editable per saved copy and users explicitly prefer preserving the full source Flow title inside every execution row.

### 2026-05-30 - Demo today dates must be labeled as demo baselines

**Decision:** If a My Flow demo uses a fixed date rather than the real current date, the Today summary should label the section as `데모 오늘` and explain that the date is a fixed demo baseline, not the user's actual today.

**Reason:** A fixed demo date keeps tests and demo data deterministic, but users should not have to infer why the Today tab shows a date different from their actual current date.

### 2026-05-30 - My Flow artifact views are visible top-level execution tabs

**Decision:** My Flow should expose `체크` and `루틴` as visible top-level execution tabs alongside `오늘`, `캘린더`, and `Flow` whenever artifact-specific actions can route there.

**Reason:** Buttons such as `체크리스트에서 열기` and `시트에서 열기` should not send users into a hidden state where no visible tab explains where they landed.

**Applies to:** `/my?demo=ux12`, Flow overview CTAs, checklist-oriented Flows, routine management, and My Flow tab navigation.

**Reopen when:** The product replaces these tabs with a different visible destination model, such as a segmented artifact launcher or per-Flow workspace.

**Related docs:** [My Flow Execution Hub spec](./specs/2026-05-28-my-flow-execution-hub/spec.md)

### 2026-05-30 - Dense My Flow calendar days use schedule overflow

**Decision:** Dense My Flow month cells should show only a small number of schedule rows and collapse additional scheduled items into a `+N` marker. Routine overflow remains separate in the routine icon rail.

**Reason:** Mobile and desktop month cells become unreadable when every scheduled item is rendered as text. A `+N` marker keeps the calendar scannable while the selected-day list remains the full source of truth.

**Applies to:** `/my?demo=ux12`, FullCalendar event rendering, selected-day list behavior, and mobile calendar density.

**Reopen when:** Users need an inline popover/list from the `+N` marker instead of selecting the date to see all items.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

### 2026-05-30 - Routine edit scope defaults to the current occurrence

**Decision:** Routine repeat settings should open with `이 항목만` selected. Weekday and repeat end-date controls are disabled until the user explicitly switches to a series scope such as future or all occurrences.

**Reason:** Calendar users often intend to adjust the current occurrence first. Defaulting to future/all occurrences risks accidental series changes.

**Applies to:** `/my?demo=ux12`, routine detail editor, routine generated calendar rows, and future recurrence editing.

**Reopen when:** Observed users mostly enter this panel to edit the series rule rather than the current occurrence.

**Related docs:** [My Flow handoff](./content-audit/2026-05-30-my-flow-content-handoff.md)

**Applies to:** `/my?demo=ux12` and future deterministic demo routes.

**Reopen when:** UX12 switches to generating all demo anchors from the real current date without losing repeatable QA coverage.

### 2026-05-30 - Flow tab starts with execution priority before full inventory

**Decision:** When the My Flow tab is showing all saved Flows, the first section should be `실행 우선순위` with Flow-level cards for overdue, today-open, and next-seven-day items. Full grouped inventory remains below that priority section.

**Reason:** Users opening the Flow tab need to decide which Flow deserves attention first. Showing the full inventory first repeats the side list and makes the page feel like a catalog rather than an execution hub.

**Applies to:** `/my?demo=ux12`, My Flow `Flow` tab, all-saved-Flow mode, grouped demo inventory, and future saved-Flow dashboards.

**Reopen when:** User testing shows people use the Flow tab mainly for browsing saved templates rather than deciding what to execute next.

### 2026-05-30 - Priority Flow actions name their destination

**Decision:** Priority cards in the My Flow `Flow` tab should use `항목 열기` and open the item detail inline under the same card. Dated schedules are reached from the global `캘린더` tab, so Flow-tab priority cards should not jump users to Calendar.

**Reason:** Users should be able to predict that a Flow-tab card opens more detail in place. After Calendar became a global primary tab, another calendar jump inside `/my` made the action tree feel duplicated.

**Applies to:** `/my?demo=ux12`, Flow tab priority cards, Calendar selected-day detail, and future cross-view My Flow shortcuts.

**Reopen when:** observed users cannot find dated items through the global Calendar tab, or a dedicated Flow detail route replaces inline card detail.

### 2026-05-30 - Flow tab next actions open the same item detail

**Decision:** In the My Flow `Flow` tab, overview-card next actions should use `항목 열기` for dated and non-dated items, then open the same editable detail inline under the Flow card. The global `캘린더` tab owns full dated schedule navigation.

**Reason:** The Flow tab is an execution dashboard, not just an inventory. If Flow-level next actions jump to Calendar, users lose the sense that `/my` is saved Flow management. Inline detail keeps the interaction local while preserving the same editor used by Today and Calendar rows.

**Applies to:** `/my?demo=ux12`, Flow overview cards, priority cards, Calendar selected-day detail, and cross-view item opening behavior.

**Reopen when:** My Flow gains a dedicated Flow-detail execution route, or user sessions show that inline detail is less understandable than a Calendar jump.

### 2026-05-30 - My Flow date selection and item opening stay separate

**Decision:** In the My Flow calendar, clicking the date number selects the date and clears any open detail. Clicking a calendar item opens the editable detail.

**Reason:** Users expect calendar date selection and event opening to be different actions. If date selection opens the first item automatically, the calendar feels jumpy and the user cannot simply inspect a day.

**Applies to:** `/my?demo=ux12`, FullCalendar day cells, selected-day list, desktop detail, and mobile detail behavior.

**Reopen when:** Observed users consistently tap date cells expecting the first item to open.

### 2026-05-30 - Today view separates remaining and completed items

**Decision:** The My Flow Today view should show remaining items first and completed items in a separate completed section. Counts such as `오늘 남음` must describe actionable open work, not total items on the date.

**Reason:** Showing `오늘 남음 0` while a list titled `오늘 할 일` still contains completed rows makes the execution state ambiguous.

**Applies to:** `/my?demo=ux12`, Today summary, Today list, mobile Today detail access, and Flow priority counts.

**Reopen when:** Users prefer a single chronological Today list and can still distinguish open versus completed state quickly.

### 2026-05-30 - Routine repeat rules are progressive detail

**Decision:** Routine item detail should show a compact repeat summary by default. Weekday, end-date, and scope controls open only after the user expands repeat settings.

**Reason:** Calendar products treat repeat-rule edits as heavier than changing time, place, or memo. Keeping the full rule editor open by default makes accidental series edits feel too easy.

**Applies to:** `/my?demo=ux12`, routine icon rail, routine detail editor, repeat scope controls, and future recurrence exception design.

**Reopen when:** Routine-heavy users need faster bulk editing and understand scope controls without extra progressive disclosure.

### 2026-05-30 - Routine calendar indicators use semantic icons

**Decision:** My Flow routine indicators should use compact semantic SVG icons such as study, running, workout, meal, or generic routine instead of emoji or anonymous dots. Dense days still show the first two icons and collapse the rest into `+N`. On touch/mobile surfaces, both routine icons and `+N` overflow must be large enough to behave like deliberate controls, not decorative markers.

**Reason:** Dots are too ambiguous and emoji makes the calendar feel like a demo. Semantic icons keep routine type recognizable while staying visually consistent with an app-style calendar. If the icon target is too small, the user understands the symbol but cannot reliably open the routine detail from the calendar.

**Applies to:** `/my?demo=ux12`, routine icon rail, routine overflow, desktop/mobile calendar cells, and future routine category mapping.

**Reopen when:** User testing shows icons are less clear than text labels or users need a full daily routine popover for dense days.

### 2026-05-30 - Calendar event rows expose click affordance

**Decision:** My Flow calendar schedule events should expose a detail-opening hint through accessible labels, button semantics, keyboard activation, and hover/focus styling.

**Reason:** Calendar item clicks are meaningful because they open the editable detail sheet. The UI should make those small event rows feel deliberately clickable, especially on desktop, and keyboard users should be able to open the same detail without relying on pointer clicks.

**Applies to:** `/my?demo=ux12`, FullCalendar schedule events, keyboard/screen-reader affordance, and calendar item visual styling.

**Reopen when:** FullCalendar is replaced by a custom calendar grid with different event interaction semantics.

### 2026-05-30 - Routine repeat edits require explicit apply

**Decision:** Editing routine weekdays, repeat end date, or repeat scope in My Flow should stage the changes first. The calendar series updates only after the user clicks `반복 변경 적용`.

**Reason:** Calendar apps treat recurrence edits as higher-risk than changing a single occurrence's memo, time, or place. Immediate rule changes make it too easy to accidentally remove future routine occurrences.

**Applies to:** `/my?demo=ux12`, routine detail editor, routine generated calendar rows, repeat scope controls, and future recurrence exception design.

**Reopen when:** A provider-backed calendar integration supplies native undo/confirmation semantics or observed users need live preview more than confirmation.

### 2026-05-30 - Flow overview actions follow the Flow artifact destination

**Decision:** My Flow overview cards should not say `캘린더 보기` now that Calendar is a global primary tab. Flow-card actions should say `항목 열기`, `진도 보기`, `표 보기`, or `메모 보기` depending on what opens inline. Date-less checklist Flows should not show contradictory copy like `날짜 입력 없음 2026-06-03`; demo-only scheduling anchors should be labeled as demo baselines, and missing baselines should say `기준일 필요`.

**Reason:** The Flow tab is an execution dashboard across different artifact types. A calendar CTA inside `/my` competes with the global Calendar tab and makes memo, sheet, and decision Flows look like calendar events even when the next action is actually a document, comparison, or checklist task.

**Applies to:** `/my?demo=ux12`, Flow overview cards, grouped Flow inventory, date-less checklist/memo/sheet Flows, and future artifact-specific My Flow surfaces.

**Reopen when:** My Flow gains first-class memo/sheet/detail surfaces with different route mechanics, or observed users prefer one universal `열기` action over destination-specific action labels.

### 2026-05-30 - My Flow detail edits require explicit save or cancel

**Decision:** Editing a My Flow item detail should stage title, date, time, location, and memo changes first. The Today list, selected-day list, and calendar should update only after `변경 저장`; `변경 취소`, `닫기`, or selecting another date should discard unsaved edits. Completion remains an explicit separate action.

**Reason:** Calendar apps distinguish inspecting an event from committing edits. Instant field persistence makes accidental text/date edits too easy, especially in mobile bottom sheets and routine occurrences where users expect a save/cancel moment.

**Applies to:** `/my?demo=ux12`, Today item detail, Calendar selected-day detail, mobile bottom sheet, desktop inline detail, and future routine occurrence editing.

**Reopen when:** Observed users strongly prefer autosave and the product adds undo/history feedback that makes accidental edits recoverable.

### 2026-06-06 - Content Flow previews must show saved execution, not product description

**Decision:** Content Flow evaluation screens should judge a candidate through the saved execution path: setup inputs, generated calendar/sheet/checklist artifact, selected date or row, item detail, internal checklist, and completion/hold actions. A product-style summary card is not sufficient for routine, timeline, sheet, or decision Flows.

**Reason:** Users cannot tell whether a source content works as a Flow from a descriptive card alone. For routines and dated timelines, the critical question is whether saved items appear on the right dates and open into actionable checklists. For sheet or decision Flows, the critical question is whether the row/detail state supports the real decision without unnecessary proof or memo burden.

**Applies to:** `/content-flows`, Flow content audit previews, future creator/source conversion review pages, and representative candidate QA.

**Reopen when:** `/content-flows` is replaced by a direct embedded My Flow sandbox that uses the same production execution components and state as `/my`.

### 2026-06-06 - Content Flow review notes must be repo-backed

**Decision:** `/content-flows` review notes should save through the `content-flow-review` API into JSON and Markdown files under `docs/content-audit/original-source-review/`. Browser local storage may mirror draft state, but it is not the authoritative review record.

**Reason:** The content selection work depends on the user's 1-5 scores, positive/negative flags, and memo comments surviving beyond one browser session and being available to future agent passes. Browser-only storage made review work unreliable in the remote workspace.

**Applies to:** `/content-flows`, the review side panel, `app/api/content-flow-review`, content audit notes, and E2E/API coverage for candidate evaluation.

**Reopen when:** Review notes move to a real database or a dedicated authenticated admin review tool replaces the local repo-backed audit files.

### 2026-06-06 - Content Flow mobile review starts from the execution preview

**Decision:** On `/content-flows`, mobile users should reach the selected candidate's saved execution preview within the first viewport. Candidate browsing remains available as a compact horizontal selector, but it should not push the actual calendar/sheet/checklist/decision simulation below a long catalog surface.

**Reason:** The page exists so the user can judge whether source content becomes a usable Flow. If mobile starts with a long candidate list or product-style framing, the user cannot evaluate routine dates, checklist detail, hold actions, or source-fit quality without excessive scrolling.

**Applies to:** `/content-flows`, candidate rail layout, mobile filter/header density, Flow content UI evaluation screenshots, and E2E coverage for mobile preview position.

**Reopen when:** The candidate picker moves into a bottom sheet or dedicated search route, or `/content-flows` becomes a desktop-only internal review tool.

### 2026-06-06 - Representative Content Flow previews preserve source-specific execution cues

**Decision:** Representative `/content-flows` previews must keep source-specific execution cues visible in the default execution screen, not only in source summaries or hidden notes. Examples include washer door-dry/gasket/detergent-drawer checks, monstera indirect-light/drainage checks, wedding guarantee/headcount/penalty checks, water-purifier outlet/self-sterilization checks, and used-car Carhistory/registration/flood-trace checks.

**Reason:** A generic routine, calendar, sheet, or decision card can look polished while still failing the real source conversion job. The user needs to judge whether the original content became something executable, so source-derived checks must appear where the simulated saved item is actually used.

**Applies to:** `/content-flows`, representative high-fidelity specs, simulated calendar/sheet/checklist/decision surfaces, and E2E source-specific preview coverage.

**Reopen when:** The review page embeds full production Flow records whose item detail already carries source-derived checks from the canonical seed data.

### 2026-06-06 - Mobile Content Flow artifact surfaces appear before simulation chrome

**Decision:** On mobile `/content-flows`, the actual artifact surface should appear before heavy My Flow simulation chrome. A short "saved execution" note can remain, but setup stat cards, app tabs, and explanatory chrome should not push the calendar/sheet/decision artifact outside the first viewport for representative candidates.

**Reason:** The page is an evaluation tool, not a product tour. Users can only judge Flow suitability after seeing the generated calendar, sheet, checklist, or decision artifact.

**Applies to:** `/content-flows`, mobile execution preview layout, representative candidate screenshots, and mobile artifact-position E2E coverage.

**Reopen when:** The app gains a real interactive sandbox where the user intentionally navigates through My Flow tabs as part of the evaluation task.

### 2026-06-06 - Evaluation preview improvements must propagate to public Flow seeds

**Decision:** When a `/content-flows` representative preview identifies source-specific execution cues that make a Flow usable, any matching public seed route should expose the same cues in its executable artifact, not only in the evaluation page. Current examples are `wedding-d180-basic` and `used-car-buying-check`.

**Reason:** `/content-flows` is useful only if it improves the actual service content model. A polished evaluation preview that diverges from the public Flow creates false confidence and does not help users execute saved Flows.

**Applies to:** `/content-flows`, `lib/flow/seed-flows.ts`, public `/f/[slug]` routes, My Flow copied records, and source-specific E2E coverage.

**Reopen when:** The product replaces static seed bundles with a shared canonical content model consumed by both evaluation previews and public Flow routes.

### 2026-06-06 - Promoted Content Flow candidates link to public service routes

**Decision:** `/content-flows` should show a direct `서비스 Flow 보기` link when a review candidate has a matching public `/f/[slug]` service route. The link should appear only for candidates with a confirmed match, currently `washer-tub-clean-monthly` to `/f/washer-tub-clean-monthly`, `monstera-care-routine` to `/f/monstera-care-routine`, `wedding-12-month-timeline` to `/f/wedding-d180-basic`, `water-purifier-filter-cycle` to `/f/water-purifier-filter-cycle`, and `used-car-buying-check` to `/f/used-car-buying-check`.

**Reason:** The evaluation page is only useful if the user can compare the source-based preview with the actual service UI. Without a direct route link, the review page can look improved while the production Flow remains hard to inspect.

**Applies to:** `/content-flows`, `KoreanFlowContentStudio`, public `/f/[slug]` routes, and E2E coverage for promoted candidate links.

**Reopen when:** All candidates share one canonical Flow record model, or `/content-flows` embeds the actual public route UI instead of maintaining a separate evaluation preview.

### 2026-06-06 - Promoted lightweight routine candidates stay source-review until representative UX is proven

**Decision:** Newly promoted public service routes for `washer-tub-clean-monthly`, `monstera-care-routine`, and `water-purifier-filter-cycle` should be direct-accessible `/f/[slug]` Flows, but their source-fit decision remains `reshape_before_featured`. They count as manually audited source-fit routes, not validated or representative routes.

**Reason:** These candidates match the user's preferred Flow shape: calendar or sheet first, light setup, internal checklist/memo, and no heavy proof burden. But the service UI still needs route-specific UX review for routine occurrence details, repeat editing, and sheet-first setup before any featured/representative claim.

**Applies to:** `lib/flow/seed-flows.ts`, `lib/flow/source-fit.ts`, `/content-flows`, public `/f/[slug]` routes, Flow Lab source-fit counts, and E2E source-cue coverage.

**Reopen when:** A shared production execution sandbox proves that routine dates, internal checklist visibility, repeat changes, and source-specific memo/link placement work for these categories on mobile and desktop.

### 2026-06-06 - Household maintenance routines do not use workout session UI

**Decision:** Public household/plant maintenance routine routes such as `washer-tub-clean-monthly` and `monstera-care-routine` should render a maintenance workbench: next management dates, the checklist inside that date, and a lightweight management memo. They should not reuse workout-style routine session fields such as sets, intensity, or condition logs.

**Reason:** The user's expected Flow shape for these sources is close to calendar/reminder apps: save a repeated date, open that date, check a few source-derived items, and optionally leave a memo. Workout session logging makes the product feel heavier than the source content and obscures whether the routine is actually usable.

**Applies to:** `ArtifactWorkbench`, public `/f/washer-tub-clean-monthly`, public `/f/monstera-care-routine`, `/content-flows` promoted route links, and future household/plant care routine conversions.

**Reopen when:** A maintenance category gains source content that genuinely requires per-session measurements, progress charts, or repeated quantitative logs rather than date-level checklists.

### 2026-06-06 - Appliance cycle sheets use route-specific rows

**Decision:** Sheet-first appliance maintenance routes such as `water-purifier-filter-cycle` should render route-specific tables with appliance parts, cycle dates, next check dates, and short state/source memos. They should not fall back to the generic daily diet/exercise spreadsheet columns.

**Reason:** A useful appliance Flow is not a daily diary. Users need a small replacement/inspection table that can be copied to a sheet and maintained over time. Generic columns like meal, exercise, measurement, and condition create false completeness while failing the real artifact.

**Applies to:** `getArtifactPlan`, `getLogTables`, public `/f/water-purifier-filter-cycle`, workbook/text export data, and future filter/consumable replacement Flow candidates.

**Reopen when:** A broader appliance management surface exists with a shared parts-cycle schema that can replace per-route table definitions.

### 2026-06-07 - Used-car purchase Flows keep source order and avoid default evidence burden

**Decision:** `used-car-buying-check` should expose the original checklist order in the execution artifact: pre-visit lookup, daytime visit, exterior/tire/flood cues, engine/start/shift/brake checks, document/mechanic review, and contract-condition review. It should not truncate later contract checks from the public checklist, and it should not default to photo/evidence capture as the main task. Photos can remain an optional memo, while official lookup, mechanic review, and buy/hold/reject notes are the primary user records.

**Reason:** The user needs to judge whether the original article became something they can actually follow at a vehicle visit. A generic decision card or evidence-first form can make the app feel heavy and can hide the source's real sequence. For used cars, the useful lightweight Flow is a field checklist plus a hold memo, not a claims or proof workflow.

**Applies to:** `used-car-buying-check`, `ArtifactWorkbench` checklist rendering, `getHoldMemoFields`, `/content-flows` used-car preview, exports, and promoted-route E2E source-cue coverage.

**Reopen when:** Real observed sessions show users need mandatory photo filenames or a structured vehicle evidence sheet before they can make a safe purchase/hold/reject decision.

### 2026-06-07 - Public Flow screens must prove source-to-execution usefulness

**Decision:** A promoted Flow is not good enough when the original source is summarized only in review copy. The public execution artifact must show the source-derived cues that let a user judge whether they can actually use the Flow after reading the source. For `wedding-d180-basic`, the execution surface now carries the Ohprint timeline cues as a `결혼 준비 D-300 타임라인 Flow`: D-300~D-180 wedding hall, budget, and headcount setup; D-180~D-90 reservation and package decisions; D-90~D-30 guest list and invitation work; and D-30~D-Day meal ticket, BGM, and role-split checks.

**Reason:** The core validation question is whether a user can look at the original content and then use FlowMe to plan and execute it. A polished generic calendar or checklist can hide missing source structure. The bridge between source and artifact must be visible in the same place where the user manages dates and checks items.

**Applies to:** public `/f/[slug]` routes, `/content-flows` representative previews, `lib/flow/seed-flows.ts`, `ArtifactWorkbench`, promoted-route tests, and future creator/official source conversion work.

**Reopen when:** `/content-flows` renders the exact same canonical production Flow artifact as public routes, or observed users can reliably verify source fidelity without an explicit source-to-execution bridge.

### 2026-06-07 - Maintenance Flows keep model/setup details as memo cues, not extra required steps

**Decision:** Lightweight maintenance Flows should keep the calendar input simple while preserving source-derived model/setup details in the date detail and source bridge. For `washer-tub-clean-monthly`, the required execution stays as a monthly management date with a short checklist, while source-specific details such as 드럼/통돌이 preparation, 과탄산소다 or 액상 전용 클리너, purchase-link memo, and 2-week temporary cadence adjustment appear as memo cues.

**Reason:** The user explicitly wants washer-style Flows to behave close to calendar/reminder apps: save a start date and repeat cycle, then open the date to see the checklist and memo. Turning every source paragraph into required inputs would make the app heavier than the original task. But hiding model/setup details would make it hard to judge whether the Flow follows the source.

**Applies to:** `washer-tub-clean-monthly`, `MaintenanceRoutineWorkbench`, `/content-flows` representative preview specs, promoted maintenance E2E, and future appliance/plant maintenance conversions.

**Reopen when:** observed users cannot complete maintenance Flows without structured product profiles, or multiple appliance models require a shared model-specific setup form.

### 2026-06-07 - Sheet-first no-date Flows must not look like generic checklists

**Decision:** When a Flow has `primary_destination: sheet` and does not need a date anchor, the public route should label the setup and hero around the sheet artifact, not around generic checklist completion. For `water-purifier-filter-cycle`, the first action is `필터 주기표 작성`, the hero count is `6개 행`, and the setup copy tells users to fill table values and mark completed rows.

**Reason:** A user judging source-to-Flow usefulness needs to see what the original content became. If a filter-cycle sheet is introduced as `바로 체크 시작` or `체크리스트 6개 항목`, the user may evaluate the wrong artifact and miss the actual job: keep last replacement dates, source cycles, next check dates, and state memos in a portable table.

**Applies to:** public `/f/[slug]` route headers, `AnchorInput`, `FlowHeroMeta`, sheet-first seed metadata, `water-purifier-filter-cycle`, and future consumable/replacement-cycle Flows.

**Reopen when:** sheet-first Flows get a dedicated setup component that no longer shares the generic no-anchor checklist copy.

### 2026-06-07 - No-date field checklist Flows start from checking, not recording

**Decision:** No-date field checklist routes such as `used-car-buying-check` should not label their first action as a date/record input when no input is shown. They should start with the checklist action (`현장 체크 시작`) and keep visit date, official lookup, professional inspection, optional photo notes, and hold reason as secondary memo context.

**Reason:** Otherwise users may think they must enter a date or collect evidence before using the Flow. That conflicts with the desired calendar/reminder-level complexity and the source-to-Flow QA goal: after reading the original source, the user should immediately see the executable checklist and understand how to finish with a lightweight buy/hold/reject decision.

**Applies to:** `used-car-buying-check`, `AnchorInput`, `ArtifactWorkbench`, promoted public route copy, source-to-execution bridge tests, and future field checklist Flows that do not require a setup date.

**Reopen when:** observed users consistently need a structured visit-date/evidence capture step before they can use field checklist Flows.

### 2026-06-07 - Review traces must map source cues to the exact artifact

**Decision:** `/content-flows` review traces for representative candidates should use explicit source-to-artifact mappings when the generic row order can mislead reviewers. A source cue about preparation, cadence, risk, or optional memo placement must point to the actual UI element that preserves it, not merely the next execution card in sequence.

**Reason:** The current platform question is whether outside content can be categorized, converted, and presented as a usable Flow. If the review trace pairs a washer preparation cue with a rubber-gasket card, reviewers cannot tell whether the conversion logic is right even if the execution UI itself is usable.

**Applies to:** `/content-flows`, `KoreanFlowContentStudio`, representative `sourceTrace` records, source-to-execution QA screenshots, and future category conversion review pages.

**Reopen when:** `/content-flows` renders the exact production Flow artifact with structured source anchors that make manual trace rows unnecessary.

### 2026-06-07 - Representative source selection prioritizes creator/source reaction

**Decision:** Representative external content selection should weight source/creator context and visible user reaction highest. The current working score is: source/creator context and user reaction 30%, user desire 20%, execution structure 20%, natural calendar/checklist/sheet/memo fit 15%, input simplicity 10%, and reuse value 5%. Risk or sensitivity is not a separate selection score, though source links and source boundaries still need to remain visible in the conversion.

**Reason:** The platform question is not only whether AI can make a plausible Flow. It is whether FlowMe can take real Korean content that people already follow, save, comment on, or repeatedly search for, and turn it into a lightweight execution artifact. Giving source reaction the highest weight prevents generic SEO/AI-style content from looking equal to creator or official content with real demand.

**Applies to:** Korean source discovery, `docs/flow-rules/flow-content-source-selection.md`, `docs/content-audit/2026-06-07-weighted-korean-source-flow-review.html`, candidate JSON audits, and future `/content-flows` representative promotion decisions.

**Reopen when:** observed users prefer low-interaction but highly structured sources over creator/official sources with stronger visible demand, or when FlowMe gains a reliable internal source-quality signal beyond public reaction/context evidence.

### 2026-06-18 - Flow of Flow conversion starts from source rows before UI

**Decision:** For Flow of Flow or parent-child Flow candidates, define the text content model before designing UI. The model must preserve source rows such as lesson titles, curriculum units, book chapters, official schedule periods, or source-defined steps. The user-facing UI should add only execution state, short memo, optional URL/date, and source link unless the original content itself requires more. Do not add required pace, weekday, progress-process, or fixed checklist fields just because a generic UI component supports them.

**Reason:** Recent Flow of Flow PoCs became more complex than the original Korean content by adding artificial inputs such as progress pace or generic sub-checklists. The user's acceptable complexity is close to a calendar or todo app: save the source structure, check rows, write a memo, and return later. Starting from source rows prevents AI-generated filler and keeps child Flow screens aligned with previously accepted jeonse and 10-category Flow examples.

**Applies to:** Flow of Flow PoCs, creator source-to-Flow conversion, study/curriculum/official-schedule candidates, user-facing parent-child Flow screens, and future source-row import models.

**Reopen when:** observed users cannot manage parent-child Flow content without structured scheduling fields beyond source rows, state, memo, optional URL/date, and source links.

### 2026-06-18 - Parent-child Flow hierarchy uses Flow Map, Flow, Step, Item

> **Superseded for canonical backend/export work on 2026-07-11:** Preserve this entry as the June runtime/UX bridge only. New canonical mapping makes `Item` the minimum independently stateful execution/projection unit and `Step` a semantic group. See the 2026-07-11 Item decision and the 2026-07-12 backend-readiness decision above.

**Decision:** Use `Flow Map > Flow > Step > Item` as the working hierarchy for Flow of Flow and parent-child Flow modeling. A Flow Map is the upper map, a Flow is one executable content unit inside it, a Step is the minimum execution row that can become a calendar event, todo task, checklist row, sheet row, or progress row, and an Item is a detail field attached to a Step such as a memo prompt, URL, material, criterion, selected option, confirmation number, or calendar-event description variable. In FlowMe, Items may render as a nested checklist inside the Step detail when useful. In outside apps that do not support nested checklist items, Items should collapse into plain text in the calendar event description, todo note/body, sheet note column, or memo body. `Item` is optional and should not become a separate scheduled task unless the source truly requires it.

**Reason:** The previous wording mixed internal terms such as Parent Flow, Child Flow, Execution Item, Flow Pack, and Flow List. The user clarified that the accepted single-Flow pattern already works, and Flow of Flow should extend it without inventing checklist rows. This naming keeps large structures understandable, treats Step as the exportable/schedulable execution unit, and allows Items to remain lightweight memo or event-description variables that degrade gracefully in external tools.

**Applies to:** Flow of Flow data modeling, creator authoring UX, user-facing Flow Map screens, source-row import, `docs/flow-rules/flow-execution-types.md`, and future Korean source conversion PoCs.

**Reopen when:** implementation naming conflicts with existing production schemas, or user tests show that Flow Map/Step/Item wording is less understandable than another user-facing vocabulary.

### 2026-06-19 - Flow Map platform PoCs use context-specific surfaces

**Decision:** A Flow Map should keep one source-derived data model while rendering different surfaces for different jobs: creator generation screens focus on source rows and hierarchy, public detail screens focus on save decisions and source trust, and My Flow screens focus on the current Step, local checks, memo, and fallback export text. The same Flow Map data should not be shown as one universal dashboard across all contexts.

**Reason:** The middle-school math Flow Map work showed that FlowMe feels more like a platform when a creator can turn a source course into a public executable map and the user can save it into a lightweight personal execution view. Showing every structural detail to the end user makes the product heavier than the accepted jeonse and ten-Flow baselines.

**Applies to:** Creator authoring UX, public Flow Map detail pages, My Flow execution screens, source-row import, and future end-to-end Flow Map PoCs.

**Reopen when:** observed users need the same full hierarchy or creator mapping information inside My Flow to execute saved maps correctly.

### 2026-06-19 - Service UX backlog is updated after product exploration tasks

**Decision:** Maintain a browseable service UX backlog at `docs/content-audit/2026-06-19-flowme-service-ux-backlog-ko.html`. Update it after a major product/UX task or meaningful milestone, not after every small edit. Use judgment: update when a new PoC/report/spec changes the current judgment, status, completion level, next artifact, or recommended next action. Include the backlog link with the new artifact link in the final handoff when relevant. The backlog's progress section must track completed work, in-progress work, pending/open work, next recommended work, work type or service-flow lane, completion level, dates, artifact links, remaining work, and next action. It should show how product planning, content conversion, creator UX, user UX, and operations/development connect instead of listing tasks as isolated todos. The service-flow lanes should be visually obvious through cards or badges, not buried as plain table text. Completion level should also be visually scannable through a short level label and progress indicator, with a note that it is internal progress rather than user validation.

**Reason:** The FlowMe service questions now span creator onboarding, public detail, My Flow IA, update policy, quality gates, export handoff, discovery, business value, sensitive content, and analytics. Keeping these only in chat makes the direction easy to lose; updating one lightweight backlog lets future PoCs connect back to the overall serviceization work without turning every idea into a committed spec.

**Applies to:** FlowMe service UX exploration, content-audit HTML artifacts, Flow Map PoCs, creator/public/My Flow IA work, and future UX handoffs.

**Reopen when:** this backlog becomes too broad to manage in one file or a formal issue/spec tracker replaces content-audit HTML artifacts.

### 2026-06-19 - Wide project backlog stays separate from service UX backlog

**Decision:** Maintain a broader project backlog at `docs/content-audit/2026-06-19-flowme-wide-project-backlog-ko.html` for cross-cutting work that is larger than the current service UX connection backlog. The broad backlog should separate Stage 0 validation, Source-to-Flow conversion, My Flow management, Creator Map/Flow of Flow work, and long-term platform ideas. Keep it lightweight with tab-like anchor sections rather than a heavy app surface. Update it after major project-level tasks or meaningful planning milestones, not after every small edit. It should include a coverage section that marks whether prior planning/docs/discussion topics are reflected, compressed, or still missing, because this backlog is a decision map rather than a complete archive of previous documents.

**Reason:** The service UX backlog is useful for the immediate creator/public/My Flow connection work, but earlier project context includes wider concerns: export-first validation, source-to-Flow candidate quality, saved-Flow management, creator experience maps, URL ingestion, creator pages, activity signals, QR entry, and marketplace ideas. Mixing all of those into the service UX backlog would make the immediate UX work harder to scan.

**Applies to:** FlowMe project planning, content-audit HTML backlogs, future UX handoffs, Stage 0 planning, Source-to-Flow expansion, My Flow IA, Creator Map PoCs, and deferred platform ideas.

**Reopen when:** a formal issue tracker, roadmap board, or product management tool replaces these HTML backlog artifacts.

### 2026-06-23 - Official date windows stay metadata, not repeated tasks

> **Canonical clarification (2026-07-12):** The no-expanded-daily-rows rule remains. In the new model the date window belongs to the relevant canonical `Item.schedule`, while `Step` remains grouping; legacy Step metadata is a compatibility adapter.

**Decision:** Source-defined official eligibility windows, such as 영유아 건강검진 기간, should be stored as Step metadata (`date_window`) rather than modeled as multi-day `duration_days` task ranges. The Step remains one calendar/todo row. Calendar export creates one reminder event, while the official period and calculated date range are carried in event descriptions, workbook rows, and text fallback.

**Reason:** The approved Flow Map direction keeps user complexity at calendar/todo level. A 검진 가능 기간 such as `생후 14~35일` is not 22 separate tasks. Expanding it into many daily rows would inflate progress, clutter calendars, and make official logistics look like FlowMe is managing medical decisions. Keeping the window as metadata preserves source fidelity without adding visible controls.

**Applies to:** source-backed Flow Map packages, `FlowItem`, ICS export, workbook export, My Flow calendar/progress rows, and future official schedule content with eligibility windows.

**Reopen when:** real export or user behavior shows that a single reminder plus period text is insufficient and users need explicit start/end/reminder rules for official date windows.

### 2026-06-25 - My Flow Step detail carries portable calendar/task fields

> **Canonical clarification (2026-07-12):** Preserve the current user-facing Step-detail UX vocabulary, but map independently stateful rows and portable schedule/completion values to canonical Items and user Item overlays. The visible label does not define the new storage minimum.

**Decision:** A saved Step may carry user-edited calendar/task metadata: date, time, simple repeat preset, location, memo, and source/detail links. These fields belong inside the Step detail, not on the first saved-map or Flow inventory surface. Date changes should affect the My Flow calendar row; time, repeat preset, location, and memo should persist as Step-level local drafts.

**Reason:** The user clarified that one Step is the smallest unit that can be saved to calendar/todo/sheet, while Items are fallback text or checklist variables. Reference task tools such as Todoist and Trello support scheduling sub-items or checklist items, but FlowMe should keep this progressive so My Flow stays closer to calendar/reminder complexity than Jira-style project management.

**Applies to:** `/my` Step detail, source-backed Flow Map saves, progress Flow optional scheduling, future calendar/todo export regeneration, and Step-level local persistence.

**Reopen when:** users need bulk scheduling, custom recurrence rules, or exported ICS/todo regeneration directly from My Flow edits.

### 2026-06-25 - Creator draft publishing stays separated from user execution

**Decision:** Creator pages may save a local draft and mark that draft as a local published version marker, but this does not mutate public/user execution screens until a real account-backed publish workflow exists. The user surface continues to show only saved Steps and Items, while creator screens show source rows, generated Step output, draft state, blockers, and local publish state.

**Reason:** Course-builder references such as Thinkific separate curriculum editing from learner progress, and newly created chapters/lessons can start as draft. FlowMe needs the same split: creator iteration should not leak review labels or draft controls into My Flow, and localStorage PoC publish behavior must not be confused with server-side public content publication.

**Applies to:** `/flow-maps/[map]/creator`, source-backed publish packages, local creator draft storage, future account-backed map versions, and creator/public/My Flow separation.

**Reopen when:** account-backed creator storage exists and public map rendering can read published versions from the server.

### 2026-06-25 - Map updates add missing child Flows but do not delete user progress

**Decision:** When a user applies a source-backed Flow Map update, My Flow updates the saved map snapshot and adds newly included child Flow records if they are missing. Existing saved child Flows, checks, memos, and hidden/list preferences are not overwritten, and child Flows that disappeared from the current published map are not deleted automatically.

**Reason:** Sensitive and official maps require review-before-apply. Silent deletion or mutation would be worse than an outdated map because it could destroy a user's execution record. A conservative add-only merge is enough for the Stage 0 localStorage bridge and keeps update behavior understandable until row-level version IDs and account-backed conflict resolution exist.

**Applies to:** `/my` update notice, source-backed saved Flow Maps, local snapshot apply, missing child Flow records, future map update history, and official/sensitive schedule maps.

**Reopen when:** server-backed version history supports row-level conflicts, user confirmations for deletion, and cross-device update state.

### 2026-06-25 - High-volume My Flow management hides inventory without hiding execution

**Decision:** My Flow may let users hide saved Flow cards from the Flow inventory and restore them through a hidden filter. This is an inventory preference only. Hidden Flows should not disappear from Today, Calendar, checks, or saved progress.

**Reason:** Large saved inventories need cleanup controls, but hiding a card must not cause users to miss dated Steps. This matches the earlier principle that Today and Calendar are execution-first while Flow inventory can have stronger management tools.

**Applies to:** `/my` Flow tab, large inventories, source-backed maps mixed with individual Flows, local hidden-flow state, and future archive/account preference work.

**Reopen when:** observed users expect archive to remove items from all execution surfaces or account-backed archive semantics become necessary.

### 2026-06-28 - User-facing Flow surfaces need a persistent service frame and read-first Step detail

**Decision:** Home, catalog, Flow Map public pages, and My Flow should share a lightweight service frame so users can tell whether they are at the service entrance, a detail page, or their saved execution space. Saved Step detail defaults to read/check/export mode. Date, time, repeat, location, and memo inputs open only after the user chooses to edit the Step.

**Reason:** Mobile feedback showed that polished cards still felt like detached test artifacts without a hamburger/tab navigation frame. It also showed that My Flow detail felt like an edit form and read view at the same time. Keeping the visible surface closer to calendar/todo complexity requires a persistent frame and progressive edit controls.

**Applies to:** Home landing, `/flows`, `/flow-maps/[map]`, `/my`, public card previews, saved Step detail, and future source-backed execution surfaces.

**Reopen when:** observed users cannot find editing controls, or real usage shows that immediate inline editing is more important than read-first execution.

### 2026-06-28 - Browse/copy, calendar execution, and saved management surfaces stay separated

**Decision:** FLOW should follow a three-surface pattern: discovery/catalog pages help users choose and save a source-backed Flow, `/calendar` owns schedule-first execution for saved dated Steps, and `/my` owns saved Flow management through Today/Flow/detail views. After a Flow Map is saved, the first surface should confirm the save, show the first actionable Step, and offer `전체 Flow 보기` for structure management. Dated Steps should be found from the global `캘린더` tab rather than another My Flow CTA.

**Reason:** A quick reference review showed the same split in adjacent products: template galleries such as Todoist Templates, Notion Marketplace, Trello templates, and Asana templates focus on browse/use/copy decisions, while execution products such as Todoist Today/Upcoming, Microsoft To Do My Day, and Google Calendar Tasks organize work by today, scheduled dates, and task detail after the user has captured the work. FLOW should not make Home and `/flows` feel like duplicate catalogs, and it should not make the user open a Flow inventory just to discover that saved dated Steps belong in calendar execution.

**Applies to:** Home landing, `/flows`, `/flow-maps/[map]`, `/f/[slug]`, `/calendar`, `/my`, post-save panels, saved Flow inventory cards, calendar/action copy, and future creator publish handoff.

**Reopen when:** users save many non-dated Flows, global calendar feels empty or redundant, or observed sessions show that Flow inventory is a better post-save landing than Today/Calendar.

### 2026-06-29 - Home uses only real actions, not static button-like chips

**Decision:** The Home hero should avoid static pill labels such as `찾기`, `저장`, or `오늘/캘린더에서 실행` when they are not clickable. If the concept is needed, express it in prose or in the menu tree. Primary actions should be real links or buttons.

**Reason:** Mobile review showed that the product already has a persistent 4-tab frame and a menu tree. Extra pill labels looked like controls but did not do anything, weakening action predictability and repeating the problem where buttons and explanations looked mixed.

**Applies to:** `HomeLanding`, future landing-page promise sections, and other service entry surfaces that summarize execution steps.

**Reopen when:** observed users cannot understand the service promise without a visible step summary, or when the chips become real navigation/actions.

### 2026-06-29 - Representative service screens use user-facing result copy

**Decision:** Home, `/flows`, public Flow Map pages, and My Flow representative cards should avoid internal review labels such as `후보`, `검토`, `대표 노출`, `Step에 들어갈 Item`, or misleading save labels when the actual click opens a detail page. Discovery cards should describe the user result, for example `미리 보고 저장`, `저장 후 보이는 항목`, or `세부 메모 항목`. If a single Flow is promoted into the representative catalog, My Flow should treat it as executable content even if older source metadata still says `needs_review`.

**Reason:** The June 29 mobile rehearsal showed that small internal labels made the service feel like a review board rather than a product. It also showed a button-result mismatch: `내 Flow로 저장` appeared on cards that opened details instead of saving. Treating representative catalog items as executable in My Flow prevents accepted baseline content, such as the jeonse Flow, from falling into a confusing `검토 필요` bucket after saving.

**Applies to:** Home landing cards, `/flows` catalog copy, `/flow-maps/[map]` public detail copy, `/my` content readiness grouping, E2E copy assertions, and future representative-candidate promotion.

**Reopen when:** account-backed publish status can replace local representative allowlists, or observed users need explicit quality labels on catalog cards to decide what to save.
