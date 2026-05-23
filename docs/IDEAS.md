# Deferred Ideas

This file preserves useful ideas and conversation context that are not yet committed to the roadmap.

Use this for:

- Good ideas discovered during implementation but outside the current scope.
- Follow-up work that needs more evidence before becoming a roadmap item.
- Product, UX, technical, or process notes worth revisiting later.
- Conversation context that future agents should not lose.

Do not use this for:

- Work already committed to a version plan. Put that in [ROADMAP.md](./ROADMAP.md).
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

## Ideas

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
