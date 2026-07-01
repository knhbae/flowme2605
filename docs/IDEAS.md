# Deferred Ideas

This file preserves useful ideas and conversation context that are not yet committed to the roadmap.

Use this for:

- Good ideas discovered during implementation but outside the current scope.
- Follow-up work that needs more evidence before becoming a roadmap item.
- Product, UX, technical, or process notes worth revisiting later.
- Conversation context that future agents should not lose.
- Exploratory product directions raised in chat, such as "what if this page used X style?", when they are not yet approved implementation work.
- Deferred alternatives that were considered but held back because they need user evidence, product sequencing, or a clearer owner.

Do not use this for:

- Work already committed to a version plan. Put that in [ROADMAP.md](./ROADMAP.md).
- Settled product, UX, technical, or process decisions. Put those in [DECISIONS.md](./DECISIONS.md).
- Current health or active blockers. Put those in [STATUS.md](./STATUS.md).
- Released changes. Put those in [HISTORY.md](./HISTORY.md).
- Detailed approved designs or implementation plans. Put durable project specs under `docs/specs/`; keep tool-generated artifacts under `docs/superpowers/`.

## Capture Template

```markdown
### YYYY-MM-DD - Short title

**Idea:** One or two sentences.

**Why not now:** Scope, evidence, dependency, or risk.

**Revisit when:** Concrete signal or milestone.

**Source context:** User conversation, implementation task, QA finding, or file reference.
```

## Capture Rule

Capture the idea during the same session when it could influence future product direction but is not being implemented now. Do not leave ideas only in chat history. If the idea later becomes planned work, promote it into [specs/](./specs/) and link back to the original idea when useful.

## Ideas

### 2026-07-01 - Lightweight daily memo intake

**Idea:** Let users start from the lightweight daily memo behavior they already keep in a notes app: write and revise today's tasks in plain language, then let FLOW convert that memo into suggested times, missing checks, related Flows, reminders, and later experience records. The product should preserve the speed and low pressure of a scratchpad while adding tracking and guidance that a normal memo app cannot provide.

**Why not now:** Stage 0 still needs to avoid becoming a full daily planner or todo app before the content-to-action loop is proven. Daily memo intake also needs careful UX so FLOW does not make a light habit feel heavy with too many required fields, categories, or productivity judgments.

**Revisit when:** My Flow saved records become a stronger validation target, users repeatedly describe using external notes for daily planning, or a PoC needs a low-friction input path that does not depend on finding a source URL or creator-published Flow first.

**Source context:** User note on 2026-07-01: they currently organize daily tasks in a memo app because it is lightweight and easy to revise, but it does not track what was missed or suggest what to do, when to do it, or how it connects to FLOW's longer-term vision.

### 2026-06-29 - Experience value data and personal gain briefing

**Idea:** As FLOW collects experience data from plan content and real execution, it can also record what value each experience produced: knowledge gained, practical skill, emotional state, confidence, risk avoided, relationship progress, money/time saved, or other user-defined value. Over a day, week, project, or custom period, FLOW could summarize what the user gained, where they are strong or weak, what patterns keep repeating, and what next actions would produce the most useful growth.

**Why not now:** Current Stage 0 still needs to prove that users execute individual Flows, export/check artifacts, and leave reliable feedback. Value analysis also needs careful data design, privacy boundaries, self-assessment language, and evidence quality rules so the product does not overclaim psychological, educational, or performance insight from thin usage data.

**Revisit when:** FLOW has repeated saved Flow records, check/export events, user notes, reviews, or observed sessions across multiple days or experience categories, and users start asking what they learned, improved, avoided, or should do next.

**Source context:** User vision note on 2026-06-29: future FLOW should collect experience data from plan content and also capture what value the experience had, such as knowledge, experience, emotion, strengths, weaknesses, daily/periodic gains, and recommended next actions.

### 2026-06-06 - Living connected Flow experience map

**Idea:** Over time, individual Flows can connect to each other and form a living experience map. This should not be a static map of related checklists; it should accumulate real user execution, edits, reviews, corrections, creator updates, source notes, and branching follow-up Flows so the map keeps improving as people use it.

**Why not now:** Stage 0 still needs to prove that users open one Flow, enter an anchor, copy/export, check, and give feedback. Connecting Flows into a graph or map would add navigation, data-model, recommendation, and visualization complexity before single-Flow execution behavior is proven.

**Revisit when:** Users have multiple saved Flows, ask to connect one Flow's result to another, leave meaningful corrections/reviews after execution, or creator/source clusters make it useful to show next/related Flows without implying validation or fake social proof.

**Source context:** User idea thread on 2026-06-06: later, Flows can connect with each other into a large experience map, but the map should be alive through user use, edits, and reviews.

### 2026-06-04 - Confluence-style creator page

**Idea:** Explore a Confluence-style creator page for FLOW creators: a structured knowledge/workspace page that can organize a creator's Flows, source notes, update history, and shareable execution assets without feeling like a social profile feed.

**Why not now:** Creator pages are not the current Stage 0 validation path, and a Confluence-like surface could pull FLOW toward a broad workspace before copy/export/check behavior and creator publishing needs are proven.

**Revisit when:** Creator publishing becomes an active batch, users need a clearer home for multiple related Flows, or creator/source maintenance needs page-level organization beyond a simple profile and Flow list.

**Source context:** User idea thread on 2026-06-03/2026-06-04 asking whether the creator page could use a Confluence style.

### 2026-06-02 - Obsidian-like plan and checklist workspace

**Idea:** Let users manage their own plans and checklists inside FLOW with a familiar note/workspace feel, similar to Obsidian, and share selected plans or checklist views with others. The long-term version could support personal execution records, linked plans, lightweight editing, and shareable public/private artifacts without forcing every user into an external calendar or sheet.

**Why not now:** Stage 0 is still focused on proving the smaller export-first loop: open, anchor input, copy/export, check, and feedback. Building a full native workspace too early would make FLOW compete with note, task, and database tools before users have shown that they want to keep execution records inside FLOW.

**Revisit when:** Users repeatedly export/check Flows and ask to continue editing, organizing, or sharing the same execution record inside FLOW, or when My Flow saved-record usage becomes a core validation target after the first export-first evidence.

**Source context:** User idea thread on 2026-06-02: FLOW should eventually let users manage plans or checklists like Obsidian and share them.

### 2026-05-31 - FlowMe 실행 콘텐츠 카테고리 taxonomy

**Idea:** FlowMe 카테고리는 넓은 콘텐츠 주제가 아니라 사용자가 실제로 수행하려는 실행 영역 기준으로 묶는다. 초안 문서: [FlowMe 카테고리 taxonomy](./content-audit/2026-05-31-flowme-category-taxonomy.md).

**Why not now:** 이 문서는 탐색, seed 선정, IA를 위한 기획 taxonomy다. 강한 카테고리가 검증되기 전부터 큰 내비게이션 구조로 바로 확장하면 안 된다.

**Revisit when:** 다음 seed Flow 배치를 고르거나, 둘러보기/카테고리 내비게이션을 다시 설계하거나, 크리에이터 채널의 우선 발행 영역을 정할 때.

**Source context:** 사용자가 FlowMe의 원래 컨셉인 "따라 할 콘텐츠를 잘 메모하고 계획대로 실행하게 돕는 것"을 기준으로 저축, 육아, 여행, 반려동물/식물, 식단, 가전 관리 등 가능한 카테고리를 많이 정리해 문서화하자고 요청했다. 원 콘텐츠와 Flow 변환 결과를 함께 보는 검증 형식: [온라인 콘텐츠 검증 형식](./content-audit/2026-05-31-online-content-validation-format.md).

### 2026-05-28 - My Flow adaptive execution hub

**Idea:** Treat `My Flow` as an execution hub that adapts to saved Flow count and context, rather than one fixed set of repeated detailed cards. `Flow별` should help users scan active Flows and decide the next action; detailed management should appear after selecting a specific Flow. Durable spec: [My Flow Execution Hub](./specs/2026-05-28-my-flow-execution-hub/spec.md).

**Why not now:** The current batch is focused on correcting the immediate `My Flow` layout and demo UX. A full adaptive hub needs product decisions for empty state, single-Flow mode, compact multi-Flow rows, search/filter behavior, category grouping, and state priority without overbuilding before real repeated-use evidence.

**Revisit when:** Saved Flow management becomes the next product batch, or when test/demo scenarios cover 0, 1, 2-5, 6-20, and 20+ saved Flows.

**Source context:** My Flow UX review conversation on 2026-05-28. Important deferred decisions: 0 saved Flows should show start guidance; 1 Flow should behave like a single execution screen; 2-5 Flows can use compact operating cards; 6+ Flows need search, filters, and sorting; 20+ Flows need category/status grouping and collapsible sections. State priority should lead category: today, overdue, in progress, completed, stale, broken routine, and date-less checklist. Category colors should stay restrained, using chips or left borders rather than full-card color fills. Repeated destructive actions like delete should not appear on every all-Flow list card.

### 2026-05-21 - Separate idea memory from roadmap

**Idea:** Keep a dedicated `docs/IDEAS.md` file so agents can preserve good but unapplied ideas and important conversation context without bloating `docs/ROADMAP.md`.

**Why not now:** This is a process/documentation improvement rather than product behavior.

**Revisit when:** If ideas accumulate enough that they need prioritization, promote selected entries into `docs/ROADMAP.md` or a formal spec.

**Source context:** User asked whether the harness stores good ideas and unapplied conversation content; recommendation was to add `docs/IDEAS.md` first.

### 2026-05-21 - URL to executable experience plan

**Idea:** Let users paste a URL and have FLOW extract the useful experience from the page, then turn it into an executable checklist, schedule, or route. This can make the first strong use case "I found a useful article/video/post; make it actionable for me" instead of asking users to browse a platform.

**Why not now:** Stage 0 still needs to prove the simpler copy/export/check loop with curated seed flows. URL ingestion also introduces extraction reliability, copyright/source attribution, safety wording, and AI cost/latency questions.

**Revisit when:** Users show demand for turning external content into plans, or when curated flows produce enough copy/export/check behavior to justify testing an ingestion feature.

**Source context:** Product brainstorming conversation on 2026-05-21. User noted that if users paste a URL, they could experience the "turn experience into my checklist" function directly.

### 2026-05-21 - Cache repeated URL ingestion results

**Idea:** If multiple users submit the same URL, FLOW should avoid sending it through the LLM again and instead load the previously extracted/structured result, possibly with version metadata and a refresh option.

**Why not now:** This depends on the URL ingestion feature existing and requires decisions about canonical URL normalization, stale content refresh, source attribution, user-private edits, and whether cached results are shared globally or scoped by workspace/user.

**Revisit when:** URL ingestion moves from idea to prototype, especially before any paid LLM extraction path is exposed to users.

**Source context:** Product brainstorming conversation on 2026-05-21. User suggested that duplicate URLs should fetch stored results instead of re-running LLM processing.

### 2026-05-21 - Show active execution count per flow

**Idea:** Show how many users are currently or recently performing a flow so visitors can see live execution momentum, not just static content. This could appear as "12 people are following this route this week" or a recent footprint signal near the flow header.

**Why not now:** Stage 0 does not yet have reliable real usage data, and fake social proof would violate the product rule against calling things validated before evidence exists. It also requires defining what counts as "currently performing": copied, checked an item, exported, returned within N days, or created a personal copy.

**Revisit when:** FLOW has event logging or user plan copies with enough real activity to compute honest active-use signals.

**Source context:** Product brainstorming conversation on 2026-05-21. User suggested showing how many users are currently performing a flow.

### 2026-05-21 - Show similar-flow activity for cold start

**Idea:** When a specific flow has little or no activity, show aggregated execution signals from similar flows, such as "42 people are following related moving routes this month." Similarity can start with category, tags, structure type, and anchor type before introducing embeddings or behavioral similarity.

**Why not now:** This needs enough flows and event data to avoid misleading users. The UI must clearly distinguish exact flow activity from related-flow activity so it does not imply the current flow itself is proven.

**Revisit when:** There are multiple flows per category or tag, and active execution counts are available for at least one related cluster.

**Source context:** Product brainstorming conversation on 2026-05-21. User noted that early individual flows may have low usage, so showing activity from similar flows could provide useful trust context.

### 2026-05-21 - QR entry point for books and offline guides

**Idea:** Add QR codes to books, printed guides, PDFs, workshops, or offline materials so readers can jump from "read and follow this" instructions into an executable FLOW checklist or schedule. This makes FLOW the action layer attached to long-form expertise.

**Why not now:** It requires publisher/creator distribution or at least a printable/shareable flow link, and the current MVP still needs to validate basic copy/export/check behavior before pursuing external distribution channels.

**Revisit when:** FLOW has stable public flow URLs and at least one creator/publisher-style use case where readers are asked to follow multi-step instructions.

**Source context:** Product brainstorming conversation on 2026-05-21. User noted that many books tell readers to follow steps, and adding a QR code could bring those steps into FLOW.

### 2026-05-21 - Flow asset marketplace and exchange standards

**Idea:** Let FLOW content, derived data, templates, execution improvements, or related assets become tradeable with cash, credits, or tokens. This could support creators, curators, translators, validators, or users who improve flows.

**Why not now:** Trade requires standardizing what is being exchanged: the flow template, source extraction, localized version, execution evidence, improvement patch, dataset, or creator service. It also introduces quality control, IP rights, revenue sharing, refunds, fraud, tax/accounting, and token/regulatory risk. Early tokenization would conflict with the current "do not build before validation" rule.

**Revisit when:** FLOW has repeated evidence that users copy/export/check flows and creators want to publish or maintain flows. Before payments or tokens, define asset types, ownership, versioning, quality signals, and revenue splits.

**Source context:** Product brainstorming conversation on 2026-05-21. User wants FLOW-derived content/data/add-ons to be exchangeable with coins or cash but sees standardization as difficult.

### 2026-05-23 - Export-first now, native execution records later

**Idea:** Position FLOW first as an action compiler that turns outside content into a user's existing calendar, checklist, spreadsheet, or memo. Keep the long-term product direction open for users to save, continue, and record execution inside FLOW once export-first behavior proves repeat value.

**Why not now:** Pushing native record keeping too early would make FLOW look like a Notion, calendar, or task-app replacement before the simpler conversion loop is validated. It would also add screen complexity during Stage 0, when the product still needs to prove that users can open a Flow, add an anchor, export, check, and return.

**Revisit when:** Users repeatedly export, check, or modify Flows and ask to continue the same execution record inside FLOW instead of moving everything to external tools.

**Source context:** Product direction conversation on 2026-05-23. User clarified that the initial goal is moving content into existing tools, while the later goal is to let FLOW become the place where execution records accumulate.

### 2026-06-17 - Creator experience map above small Flow units

**Idea:** Add an experience-map layer above small Flow units so creators can define a larger journey, such as certification, school entry, moving, or career transition, and attach executable child Flows to each stage. Users should be able to save the whole map, save only a stage, or save an individual child Flow.

**Why not now:** The small Source-to-Flow conversion work has only shown that individual calendar/checklist/routine/bucket artifacts can be shaped. It has not yet proven that FLOW looks like a creator platform or experience-map service. Marketplace, payments, community, and automatic multi-URL generation would still be premature.

**Revisit when:** The next PoC needs to test whether FLOW can feel like a platform for creators, not only a collection of standalone Flow samples. A good first test is a certification-acquisition experience map with stages, date-based child Flows, repeated study routines, checklists, and source URLs.

**Source context:** 2026-06-17 platform-structure study comparing roadmap, course, creator-product, template-marketplace, project-template, docs, and route/list platforms. See `docs/content-audit/2026-06-17-experience-map-platform-structure-study-ko.html`.

### 2026-06-17 - Flow Pack as Flow of Flows

**Idea:** Treat Flow Pack as a flow of flows, not a flat bundle. A creator can publish a parent Flow such as a running routine collection, middle-school math curriculum, baby vaccination checklist, or baby meal-plan sequence. Under that parent Flow, sections and child Flows can represent levels, grades, units, vaccines, months, weeks, or specific routines. Each child Flow still produces executable calendar, sheet, checklist, memo, or routine artifacts.

**Why not now:** This needs a focused PoC that shows both the user-facing parent/child save experience and the creator-facing assembly experience. It should not jump directly into a marketplace, payments, community, or large roadmap UI.

**Revisit when:** The next UX/UI PoC moves beyond individual source-to-Flow samples. Good candidates are a running creator's routine collection, a study YouTuber's middle-school math curriculum with grade/unit child Flows, a baby vaccination checklist with vaccine-specific child Flows, and a baby meal-plan sequence with 6-month/12-month child Flows.

**Source context:** User clarified that Flow Pack means "flow of flows." The earlier flat-pack example was not the intended model. Corrected structure: creator channel -> parent Flow -> section/subgroup -> child Flow -> execution item. See `docs/content-audit/2026-06-17-flow-of-flows-structure-ko.html`.

### 2026-06-28 - Honest review and usage signals for Flow selection

**Idea:** Add real review, saved-count, active-use, or creator-maintenance signals to Flow and Flow Map cards so users can decide why a Flow is worth saving. Candidate signals include saved users, recent check/export activity, creator update date, short user review snippets, and source freshness.

**Why not now:** Current Stage 0 surfaces do not have reliable user behavior or review data. Adding fake counts or generic testimonials would make the service look more polished but would violate the evidence boundary. Until data exists, cards should use only source-backed signals such as generated artifact, input count, Step preview, source link, and update date.

**Revisit when:** event logging, saved Flow records, feedback forms, or observed sessions produce enough real signals to show on public cards without implying validation.

**Source context:** 2026-06-28 mobile feedback said representative cards show contents but lack detailed Items, reviews, and signs of real use, making selection harder.
