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

**Decision:** Priority cards in the My Flow `Flow` tab should use destination-specific action copy such as `캘린더에서 열기` instead of generic `열기`. Clicking it should move the user to the Calendar tab, select the row date, and open the same editable detail.

**Reason:** Users should be able to predict whether a priority action opens an in-place drawer, jumps to a calendar date, or navigates to the public Flow page. The priority section is an execution surface, so its primary action should lead directly to the execution context.

**Applies to:** `/my?demo=ux12`, Flow tab priority cards, Calendar selected-day detail, and future cross-view My Flow shortcuts.

**Reopen when:** A dedicated Flow detail route replaces Calendar as the primary execution context for priority items.

### 2026-05-30 - Flow tab next actions open the same item detail

**Decision:** In the My Flow `Flow` tab, overview-card next actions should provide a direct `캘린더에서 열기` control for dated items. It should move to the Calendar tab, select the item's date, and open the same editable detail sheet used by Today and Calendar rows.

**Reason:** The Flow tab is an execution dashboard, not just an inventory. If Today and Calendar item clicks open detail but Flow-level next actions only show text or completion, users lose the consistent "inspect/edit before completing" path.

**Applies to:** `/my?demo=ux12`, Flow overview cards, priority cards, Calendar selected-day detail, and cross-view item opening behavior.

**Reopen when:** My Flow gains a dedicated Flow-detail execution route that can host the shared item editor without jumping to Calendar.

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

**Decision:** My Flow overview cards should not always say `캘린더에서 열기`. Calendar/timeline/routine Flows can keep `캘린더에서 열기`, but memo-first, sheet-first, and checklist/decision Flows should use destination-specific copy such as `메모에서 열기`, `시트에서 열기`, or `체크리스트에서 열기`. Date-less checklist Flows should not show contradictory copy like `날짜 입력 없음 2026-06-03`; demo-only scheduling anchors should be labeled as demo baselines, and missing baselines should say `기준일 필요`.

**Reason:** The Flow tab is an execution dashboard across different artifact types. A universal calendar CTA makes memo, sheet, and decision Flows look like calendar events even when the next action is actually a document, comparison, or checklist task.

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
