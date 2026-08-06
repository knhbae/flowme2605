# FLOW Service Structure

Last updated: 2026-08-04
Status: Living P35 production baseline plus a clearly marked Text Authoring v2 local implementation delta. The v2 delta is uncommitted, unpushed, unmerged, and undeployed; the recorded Vercel Preview is an older snapshot and production is unchanged.

This document is the canonical map of the current app surface, screen feature tree, and service architecture. It is not validation evidence by itself. Use it to keep product PoCs, research surfaces, creator tools, public routes, My Flow execution, and shared domain modules from drifting apart.

## Update Policy

Update this file in the same PR when work adds, removes, renames, or materially changes:

- A route, page state, tab, modal, or first user action.
- A shared `components/flow/` boundary.
- A `lib/flow/` data contract, export path, persistence path, or review pipeline.
- A creator/public/My Flow responsibility split.
- A research or internal QA surface that becomes part of the recurring service workflow.

If a PR does not update this file, the PR history entry should say why the service structure was not affected.

## Screen Feature Tree

| Route | Current role | Primary component | Shared modules |
| --- | --- | --- | --- |
| `/` | State-based entry router. When no valid saved Flow or saved Flow Map entry exists it replaces the route with `/flows`; when at least one such entry exists it replaces the route with `/my`. Other local draft, check, anchor, or UI state alone does not select `/my`. It owns no separate Home surface and is not a fourth persistent destination. | `EntryRouter` in `components/flow/EntryRouter.tsx` | saved Flow and saved Flow Map keys in localStorage, `PlatformNav` |
| `/flows` | Shared URL-or-memo intake plus the public execution-content catalog. Valid URLs keep the hit/needs-review/miss lookup and saveable hits can start as-is or as a personal copy with an anchor, visible result format, saved title, and selected rows. Cross-entry registry resolution runs before a hit is shown, so the same source + user job + editorial variant uses one public detail and save identity rather than route-specific duplicates. Plain text becomes a private rule-based draft made only from the user's phrases; the parser never fills a target count. Before save, each source-mapped row has a stable intake ID and the user explicitly includes/excludes or renames it. Save consumes only accepted rows. It does not imply live AI, and an optional `첫 할 일 날짜` schedules only the first accepted memo row while the rest stay undated. Miss requests can continue into the same local acceptance path and the Studio draft shelf, while internal production handoff data stays separate from the user copy. General discovery shows only unique `representative`/`candidate` maps with explicit user categories. A map may keep a noindex direct route for old links while `publicExecutionEnabled=false` changes its exact URL result to blocked `needs_review`, removes save/export/draft bypass, and preserves existing saved records. | `FlowList` in `components/flow/AppClient.tsx` | `canonical-flow-registry`, `url-first-lookup`, `url-first-supply-queue`, `storage`, `seed-flows`, `types`, `execution-model`, `source-backed-my-flow` |
| `/f/[slug]` | Public Flow execution/detail route for a single slug. Canonical aliases redirect before rendering; for AJD moving, legacy public slugs resolve to the 24-item `moving-d30-basic` detail. It is a share-entry shell before save, not the persistent three-destination app frame. P35 leads with the actual content-shaped result, keeps setup and one adjustment kind at a time contextual, exposes one primary save action, and replaces setup with a distinct saved receipt. That receipt may open the saved Flow with its whole plan expanded once; reload and later library entry start collapsed. Flow-level export remains secondary and source resources remain read-only. | `PublicFlow`, `FlowSaveBeforeFrame`, `PublicFlowAdjustmentPanel`, `FlowArtifactDataPreview`, `SavedFlowReceiptFrame` in `components/flow/` | `canonical-flow-registry`, `flow-experience-projection`, `whole-flow-reading`, `seed-flows`, `parser`, `export`, `storage`, `artifact-plan`, personal overlay helpers |
| `/flows/new` | Local Text Authoring v2 entry on `codex/text-authoring-ta-implementation-20260729`. It parses explicit Markdown-like Items and v2 property bullets while preserving raw prose and unsupported syntax as source-linked issues. Raw `- 기준일:` controls relative-date resolution. Calendar/ICS sort by resolved date without rewriting source; an explicit same-Step operation can align complete Item blocks and undo. The result pane always keeps `캘린더 / 체크·할 일 / 표·엑셀 / 텍스트` slots, explains disabled choices, shows detailed fields and real table columns/URLs, and separates raw from transformed Text. The default journey is `입력 → 결과`: `>=900px` uses two simultaneous panes and `<900px` uses one staged pane. Internal Step/Item structure opens only through the result's optional `항목 검토` drawer/bottom sheet; unresolved source-linked issues promote its warning, while source update, relative anchor, and rights/safety keep separate owners. Product UI has five examples; `?authoringQa=1` has 27 QA fixtures. `?legacy=1` or `FLOWME_TEXT_AUTHORING_ENABLED=0` renders the prior manual `NewFlow`. The route remains `noindex`; these v2 changes are local only and are not in the older Preview or P35 production. | `TextAuthoringWorkspace`, `AuthoringDialog`, `StructurePane`, `AuthoringReviewDialog`, `SourceUpdateDialog`, `InlineHelp`, and focused `components/flow/text-authoring/*`; legacy `NewFlow` rollback | `lib/flow/text-authoring/*`, v2 contract, projection/export, and existing Flow types through the Flow-bundle adapter |
| `/flows/[id]/edit` | Saved/manual Flow editing entry. | `Editor` in `components/flow/AppClient.tsx` | `storage`, `parser`, `types` |
| `/calendar` | Global date-first execution lens. P35 keeps the month grid, selected-day execution, one Flow-scope picker, and the shared completion primitive while leaving structural editing and undated date placement in My Flow. Archived and excluded content is absent. Routine definitions stay outside execution, occurrence wrappers are named non-tabbable groups, and each executable occurrence owns one completion control. | `MyFlowCalendar`, `MyFlowRuntime` with `surface="calendar"`, `MyFlowCalendarSurface`, `CalendarFlowScopePicker` | `storage`, `source-backed-my-flow`, `calendar-flow-scope`, `my-flow-step-export`, `export`, recurrence projection |
| `/my` | User's saved execution hub. Literal `/my` opens cross-Flow `할 일`; the adjacent `Flow` view owns the library and focused Flow workspace. Active work is grouped by exact date, with separate undated and completed groups. A default row owns one row-open target and one trailing completion checkbox; edit, memo, export, and lifecycle commands remain contextual. Mobile drills from the library into one Flow; wide layouts keep a bounded list and inspector. The first entry from a saved receipt may expand the whole plan once, while reload and later library entry start collapsed. `experiment=off` keeps the legacy Flow hub as a rollback path. In the fresh one-Flow public-save representative scenario, it leaves every `flow:*` localStorage key/value byte unchanged; this is not a blanket guarantee for pre-existing workspace normalization. | `MyFlows` in `components/flow/AppClient.tsx` | `storage`, `source-backed-my-flow`, `my-flow-cross-flow-todo`, `personal-flow-lifecycle`, `personal-item-detail-overlay`, `my-flow-local-ia`, `whole-flow-reading`, `my-flow-step-export`, `export`, `artifact-fields` |
| `/flow-maps/[map]` | Source-backed direct route. Registry aliases for a canonical public Flow redirect before the legacy map composition renders; AJD `moving-d30` and `curated-ajd-moving-d30` now resolve to `/f/moving-d30-basic`. Other executable maps lead with title, input-to-result promise, first action preview, and save into My Flow. A quality-held map keeps the old direct/source link alive as a noindex review-hold page but shows no schedule rows, save control, or export; it points to the official source instead. | `SourceBackedFlowMapPublicPage` in `components/flow/SourceBackedFlowMapPage.tsx` | `canonical-flow-registry`, `source-backed-my-flow`, `storage` through save action |
| `/flow-maps/[map]/creator` | Creator-side publish review and Step contract editing route. | `SourceBackedFlowMapCreatorEditor` | `source-backed-my-flow` |
| `/creators` | Internal creator-supply preview directory; direct/noindex until verified public supply is sufficient. | `CreatorDirectory` in `components/flow/AppClient.tsx` | `creator-channel-preview`, `users` |
| `/u/[creator]` | Creator profile/channel surface. Public profiles open with checked real-source or representative content only; review candidates and generated samples remain available through explicit filters instead of mixing into the default library. `/u/my-flow-studio` keeps its personal all-content/draft shelf behavior. | `CreatorProfile` in `components/flow/AppClient.tsx` | `creator-channel-preview`, `users`, `execution-model`, `source-fit` |
| `/content-flows` | Internal Korean content conversion and review workbench. Not a public service surface unless promoted. | `KoreanFlowContentStudio` | `korean-flow-content-*`, `flow-content-coverage-axes`, `app/api/content-flow-review` |
| `/flow-lab` | Internal content QA and review lab. | `ContentLab` | `content-lab`, `content-lifecycle`, `source-review-priority`, `natural-artifact-audit`, `source-fit` |
| `/flow-lab/url-first-p0` | Internal URL-first P0 lab. Tests canonical lookup, hit/needs_review/miss/memo_draft states, export preview, and My Flow/Calendar expected outcomes without changing the production entry router or Flow finding. | `UrlFirstP0Lab` | `url-first-lookup`, `source-backed-my-flow` |
| `/ia-compare` | Internal IA comparison PoC for 3-tab vs 4-tab service-frame review. Not a public service surface unless a decision promotes it. | `IaComparisonReport`, `FourTabIaPoc` | service IA, My Flow execution assumptions |
| `/restart/moving-d30` | Focused restart prototype for moving D-30 content. | `MovingD30Restart` | `moving-d30-restart` |

## Navigation IA And Exposure Depth

This is the user-facing sitemap rule for service-frame work. The route table above says what exists; this section says what should be exposed in navigation and why.

### Primary User Jobs

| Priority | User job | User-facing label | Main route | Navigation treatment | Notes |
| --- | --- | --- | --- | --- | --- |
| P0 | Discover something worth saving | `Flow 찾기` | `/flows` | Primary tab or top nav item | This is the catalog, URL/memo intake, and public browse job. It should not mix internal review candidates with representative service candidates. |
| P0 | Run dated saved work | `캘린더` | `/calendar` | Primary tab or top nav item | This is the fastest way back to scheduled Steps after users save dated Flows. |
| P0 | Continue and manage saved work | `내 Flow` | `/my` | Primary tab or top nav item | This owns cross-Flow `할 일`, the Flow library, focused Flow workspace, Item detail, completion, memo, export, and lifecycle. |
| P1 | Inspect a public Flow before saving | Flow title / `저장 전 보기` / `바로 시작` | `/flow-maps/[map]`, `/f/[slug]` | Deep link from catalog, source URL, or shared link | These are content detail pages, not global tabs. |
| P2 | Create from my own content | `만들기` or `제작자` | `/flows/new`, future creator publish path | Secondary action, not always in bottom tabs | Creation is important for the platform, but early user tests should not let it compete with browse and run. |
| P2 | Browse creators/channels | creator byline / public profile | `/u/[creator]` | Contextual byline or direct profile link | Public profiles remain reachable from their content. `/creators` stays an internal review directory until verified public supply is sufficient. |
| Internal | Review and convert source content | `콘텐츠 검토`, `Flow Lab` | `/content-flows`, `/flow-lab` | Hidden from public nav | These are planning/QA surfaces and should not appear in the normal service frame. |

### Recommended Service Frame

Mobile should use a simple app-like frame:

- Bottom or top primary tabs: `Flow 찾기`, `캘린더`, `내 Flow`.
- `/` is a state-based router, not a fourth tab: no valid saved Flow or saved Flow Map entry continues to `/flows`; at least one valid saved entry continues to `/my`.
- Secondary menu: `만들기`. Public creator profiles are reached from creator bylines; `/creators`, Flow Lab, content review, and docs/debug routes stay out of the normal frame.
- Keep `캘린더` as a global primary tab. It may reuse the same My Flow calendar component, but the entry point should feel like a schedule-first execution surface rather than an inventory view.
- Detail pages should keep the same frame but highlight their owning section, except for share-entry public single Flow pages.
  - `/flow-maps/[map]` belongs under `Flow 찾기`.
  - `/f/[slug]` is a share-entry exception before save: it shows a slim FlowMe shell and one primary `내 Flow에 저장` CTA instead of the persistent three-destination frame. This save-first rule also applies to exact-video and input-free workbenches; file export remains one Flow-level secondary action. After save, `/my` resumes the normal app shell.
  - `/calendar` belongs under `캘린더`.
  - `/my` detail states belong under `내 Flow`.
  - Creator edit/review routes belong under `만들기` or a secondary creator menu, not public discovery.

Desktop can use a top nav with the same priority order. It should not expose more primary destinations than mobile.

### Depth Model

| Depth | Product object | Example | User expectation | Navigation rule |
| --- | --- | --- | --- | --- |
| D0 | Service section | Flow finding, Calendar, My Flow | Move between major jobs | Only D0 belongs in persistent primary nav; `/` only routes into one of these jobs. |
| D1 | Catalog group or saved workspace tab | 추천 Flow, 긴 Flow Map, 오늘, Flow, 지도, 필터 | Narrow the current job | Use page-local tabs or filters, not global nav. |
| D2 | Flow Map or single Flow | 중1 수학 목차 진도표, 이사 D-30 준비 Flow | Inspect/save/run one content artifact | Open from card/detail link. |
| D3 | Flow inside a Map | `1. 소인수분해`, `원룸 이사 D-30 준비` | See progress within a larger map | Show inside the Map page or My Flow Map drilldown. |
| D4 | Step | `검진 전 확인`, `견적 비교` | Group related executable Items | Tapping a Step opens its Item list; Step itself owns no completion state. |
| D5 | Item | `예약 상태 확인하기`, `후보를 보류하고 이유 적기` | Minimum independently stateful execution and projection unit | Project each scheduled/actionable Item to the destination; preserve Step only as grouping and use Memo fallback for unsupported detail. |

### Current P35 Production Contracts And Open Evidence

- Persistent primary navigation has exactly three destinations: `Flow 찾기 / 캘린더 / 내 Flow`. Flow creation stays secondary and creator browsing stays contextual.
- `/` owns no independent content surface. It replaces the route with `/flows` when no valid saved Flow or saved Flow Map entry exists and with `/my` when at least one valid saved entry exists.
- `/flows` owns the integrated catalog plus URL/memo intake. Quality-held and duplicate content stay out of normal execution, and normal user copy avoids internal review labels.
- Executable `/f/[slug]` and source-backed routes lead with the actual result, expose one primary save action, and reveal at most one adjustment kind at a time. A successful save replaces setup with a receipt instead of stacking a second workspace below it.
- Literal `/my` owns cross-Flow `할 일`; the adjacent `Flow` view owns the saved library and focused Flow workspace. Exact-date groups own repeated date context, and default rows expose only row-open plus one completion checkbox.
- A saved receipt may use session state to expand the target Flow's whole plan once. Reload, direct re-entry, and later library entry start collapsed; this marker is not product persistence and is excluded from backup.
- `/my?experiment=off` is the bounded rollback path. In the fresh one-Flow public-save representative scenario it opens the legacy Flow hub without rewriting any `flow:*` localStorage key/value bytes. Pre-existing Calendar scope or larger-workspace normalization remains outside this evidence.
- `/calendar` is a date lens over the same effective Items and completion primitive. It owns month and selected-day execution plus Flow scope, not structural editing or undated date placement.
- Personal title, date, memo, inclusion, and order remain overlays. They never rewrite source records, and no current UI writes directly to an external calendar or todo account.
- Empty My Flow and Calendar states use one Flow-finding action. Internal labs, comparison routes, and creator review surfaces remain outside primary navigation.
- Open evidence remains observed-user comprehension, real Google/Outlook/Apple Calendar or VTODO round-trip, cross-device recovery, account persistence, and real creator/update behavior. Automated QA, deployment, and HTTP checks do not close those gates.

### Local Text Authoring TA Branch Delta

- This delta is sourced from `D:\flowme2605\flow-text-authoring-ta` on `codex/text-authoring-ta-implementation-20260729`. It is local and uncommitted; no push, PR, merge, new Preview, or production deployment was performed. The recorded Preview predates v2, and P35 remains production truth.
- `TextAuthoringDocument` owns raw source, deterministic blocks and mappings, issues, revisions, source rows, canonical Flow/Step/Item records, and ownership lanes. Stable source ranges, IDs, and lineage survive correction, same-Step Item-block reorder, and undo.
- Canonical v2 begins Items with root `- [ ]` and attaches official properties through indented `  - 속성:` bullets. v1 property lines remain readable; the writer emits v2. Plain prose, unknown colon bullets, and nested checkboxes remain raw source/issues unless the user explicitly classifies supported prose into one Item.
- Raw `- 기준일: YYYY-MM-DD` is the only relative-date anchor. Calendar and ICS order resolved dates ascending with source order as tie-break; canonical, 체크/할 일, 표/엑셀, and 텍스트 preserve source order. No undated VEVENT or hidden-anchor inference is allowed.
- The four result slots are always present. 표/엑셀 requires an original table or at least two Items with at least two shared meaningful fields and exposes real columns, cells, and URLs. 텍스트 separates byte-equivalent raw source from transformed TXT/Markdown. Result previews expose description, completion, schedule context, place, duration, repeat, condition, resources, and caution where relevant.
- `/flows/new` keeps the responsive hybrid shell, deterministic live reflection, protected source-update comparison, local recovery, review gates, and export receipts. Its visible journey is `입력 → 결과`; the internal structure is not a required pane or stage. The result's optional `항목 검토` opens a desktop drawer/mobile bottom sheet, and move, merge, split, role, and inclusion controls live under `순서·묶음 수정`. Long explanations use keyboard-accessible help dialogs/sheets.
- Five representative examples are product-facing. The 27 existing-content, condition, compatibility, and error-boundary fixtures are available only with `?authoringQa=1`. Current internal evidence is authoring `161 / 161`, full unit `694 / 694`, focused Text Authoring E2E/visual scenarios `34`, v2 matrix `35 / 35`, optional-review screenshots `9`, and build `18 / 18`.
- Automated tests, browser checks, and screenshots are internal QA. They do not establish observed-user validation, release readiness, or production behavior.
- AI/provider behavior, accounts, cloud persistence or synchronization, OAuth, direct Calendar/Todo/Sheet writes, creator marketplace/publishing, public publishing, and observed-user validation are outside this TA.

### Creator Publish Gate v1 Baseline

- `/flow-maps/[map]/creator` is a creator/review surface. It may expose source-row-to-`Step`/`Item` contract language because creators need to verify the conversion.
- `/flow-maps/[map]`, `/flows`, `/`, `/calendar`, and `/my` are user-facing surfaces. They should prefer user vocabulary such as `콘텐츠`, `저장한 콘텐츠`, `항목`, `할 일`, `일정`, `체크`, `진도표`, and `저장하고 시작`.
- Creator preview links for the saved result should point to a map-specific My Flow preview, such as `/my?demo=source-backed&savedMap=middle-school-math-1`, instead of a generic source-backed demo.
- Public and My Flow links should say `저장 전 보기`, `전체 보기`, `바로 시작`, or destination-specific labels, not `지도 보기`, unless the user explicitly needs map structure language.
- Public Flow detail should not expose operation or migration labels such as `새 실행모델로 전환 중`; explain the saved outcome in user terms such as schedule, checklist, memo, and source instead.
- The creator draft/publish marker is local-only. Do not describe it as real publishing, marketplace approval, or validation evidence until account-backed publish exists.

### Do Not Expose As Primary Nav Yet

- `/creators`
- `/content-flows`
- `/flow-lab`
- `/flow-lab/url-first-p0`
- `/ia-compare`
- `/restart/moving-d30`
- `/flow-maps/[map]/creator`
- `/flows/[id]/edit`

These may remain directly accessible for testing or development, but they should not shape the normal user's mental model.
Prototype or restart routes must pass the same display gate before promotion: no raw ISO dates in rendered user text, no duplicated export CTA sets, and no internal review/source-backed labels on the visible surface.

### Route Indexing Policy

- Public discovery routes such as `/`, `/flows`, `/f/[slug]`, public `/flow-maps/[map]`, and verified public `/u/[creator]` may be indexed.
- Stateful personal routes `/my` and `/calendar` are `noindex`; their useful content depends on the current browser's saved state.
- Creator workspaces `/flows/new`, `/flows/[id]/edit`, `/flow-maps/[map]/creator`, and `/u/my-flow-studio` are `noindex` even when reachable through a secondary action.
- `/restart/*`, `/content-flows`, `/creators`, `/ia-compare*`, and `/flow-lab*` are direct-only release-preview or internal routes and must be `noindex` with no normal-route links.
- Preview creator channels and unknown `/u/*` slugs are `noindex`. Only known, non-preview public creator profiles may opt into indexing.

## Architecture Map

| Layer | Location | Responsibility |
| --- | --- | --- |
| Route shell | `app/` | Keep Next.js route files thin. Decode params, load package data when needed, and hand off to product components. |
| Product UI | `components/flow/AppClient.tsx` and focused `components/flow/*` files | Own visible interaction, screen state, user-facing copy, and handoff between public, creator, and My Flow surfaces. |
| Text authoring UI | `components/flow/text-authoring/*` | Own the responsive Input/Structure/Result workspace, outline corrections and original-interpretation restore, issue decisions, contextual inspector, rights/safety review, source compare, personal fork transition, artifact preflight, draft library, reload recovery, and receipts. Keep held/review/source issues visible as outstanding/blocking where applicable, keep source/incoming/user values visibly separate, and keep the legacy route behind the explicit rollback. |
| Source-backed map UI | `SourceBackedFlowMapPage.tsx`, `SourceBackedFlowMapCreatorEditor.tsx`, `SourceBackedFlowMapSaveButton.tsx` | Keep source-backed public inspection, creator publish editing, and save-to-My-Flow actions separate. |
| Artifact UI | `FlowSaveBeforeFrame.tsx`, `FlowArtifactDataPreview.tsx`, `RoutineScheduleEditor.tsx`, `ArtifactWorkbench.tsx`, `ArtifactPreview.tsx` | Render the compact whole-Flow outline, actual-data content-native result, contextual adjustment, and shared routine definition. Keep the legacy full workbench behind a secondary disclosure and keep source evidence separate from personal editing. |
| Domain model | `lib/flow/types.ts`, `flow-experience-projection.ts`, `whole-flow-reading.ts`, `effective-routine-projection.ts`, `calendar-flow-scope.ts`, `seed-flows.ts`, `curated-source-app-seed.ts`, `execution-model.ts`, `source-backed-my-flow.ts` | Define Flow, Flow Map, stable item roles and projection eligibility, shared whole-Flow reading order, routine definition/occurrence projection, Calendar scope predicates, source-backed seed adapters, execution assumptions, URL lookup eligibility, and manual registration readiness checks. Resource, reference, and warning rows remain visible context but do not become executable completion rows. |
| Text authoring domain | `lib/flow/text-authoring/types.ts`, `identity.ts`, `parser.ts`, `operations.ts`, `review-policy.ts`, `source-update.ts`, `validation.ts` | Define and validate the canonical authoring document, deterministic input mapping, stable identities and source lineage, creator/user overlay boundaries, reversible structural/original-interpretation corrections, issue decisions, rights/safety write policy, personal fork, explicit source update resolution, persisted review/source/held semantics, and no-silent-drop accounting. |
| Text authoring projection and persistence | `lib/flow/text-authoring/flow-bundle-adapter.ts`, `artifact-projection.ts`, `file-export.ts`, `markdown-roundtrip.ts`, `receipt.ts`, `storage.ts` | Adapt the authoring document into the existing Flow bundle contract; compute fixed Calendar/check-todo/sheet/text eligibility and visible disabled reasons; sort Calendar/ICS by resolved date while preserving source order elsewhere; generate real XLSX, raw source, structured TXT/Markdown, and ICS files; expose detailed fields and links without external writes; and keep drafts/revisions/review/source/recovery in the isolated `flow:text-authoring:drafts:v1` browser-local store. |
| Cross-entry canonical identity | `lib/flow/canonical-flow-registry.ts`, `lib/flow/canonical-flow-storage.ts` | Resolve route/public slug/Flow Map/URL lookup aliases by source + user job + intentional editorial variant. Record additive canonical origin/reconciliation metadata, dual-read legacy copies, require explicit active-copy selection, and preserve every existing saved/personal/run/occurrence/export key. |
| URL-first intake | `lib/flow/url-first-lookup.ts`, `lib/flow/url-first-supply-queue.ts` | Canonicalize incoming source URLs, classify URL-first P0 states, and register a source-backed map as a saveable hit only when source URL, direct-route access, non-reject status, and public execution eligibility all pass. A known review-hold URL returns blocked `needs_review` with no save, export, or draft bypass. Saveable hits may build direct or lightly customized start packages. Memo/miss drafts parse only user-authored phrases, retain stable source mappings, and require an explicit pre-save acceptance list; no generic row is added to reach a count. Internal handoff data stays separate. |
| Parsing and time | `parser.ts`, `date.ts`, `recurrence.ts`, `destination.ts` | Normalize user input, dates, recurrence, and artifact destinations. |
| Persistence and export | `storage.ts`, `canonical-flow-storage.ts`, `local-data-backup.ts`, `export.ts`, `my-flow-step-export.ts`, `export-labels.ts`, `artifact-plan.ts`, `artifact-fields.ts` | Save local records and regenerate text, calendar, workbook, Step-detail exports, and shared result-first export labels from edited state. Canonical metadata is additive and included in backup; legacy saved keys remain readable and recoverable. |
| Review and evidence | `content-lab.ts`, `source-fit.ts`, `source-review-priority.ts`, `natural-artifact-audit.ts`, `observed-session-*` | Keep QA, source/risk labels, observed sessions, and internal review evidence out of public validation claims. |
| Content conversion | `korean-flow-content-*`, `content-inventory.ts`, `content-lifecycle.ts`, `flow-content-selection-audit.ts` | Convert and audit source content before it becomes public or saved Flow Map material. |
| API boundary | `app/api/content-flow-review/route.ts` | Server-side review endpoint for content-flow review workflows. |
| Verification | `lib/flow/*.test.ts`, `lib/flow/text-authoring/*.test.ts`, `tests/e2e/flow-mvp.spec.ts`, `tests/e2e/text-authoring.spec.ts`, `scripts/check-docs.mjs` | Prove behavior, docs health, and route-level workflows before claims of completion. Keep exact local test results, release state, and observed-user evidence separate. |

## Ownership Rules

- Public routes should stay user-facing and should not expose internal review language unless the user needs it to act safely.
- Creator routes may show publish readiness, source/risk, and Step contract controls, but they should not become the user's saved execution workspace.
- My Flow owns saved user state, edited Step details, and regenerated exports.
- Research surfaces under `/content-flows`, `/creators`, `/ia-compare`, and `/flow-lab` remain internal until a spec or decision promotes a behavior into the service tree.
- Shared domain changes belong in `lib/flow/` tests first. UI changes should consume those contracts rather than duplicating conversion logic in components.
- Text authoring owns an immutable captured-source layer plus explicit creator/user overrides. Its browser-local draft namespace must remain separate from released saved-Flow storage, and artifact previews must not be described as external Calendar/Todo/Sheet writes.
- Curated source app handoff bundles enter the canonical `seedBundles` path through `seed-flows.ts`. `source-backed-my-flow.ts` keeps Flow Map, publish-package, and saved-map metadata for those same child Flow slugs, and its runtime merge helper should stay a dedupe fallback rather than the only seed attachment path.

## Related Docs

- [DECISIONS.md](./DECISIONS.md) records settled product, UX, technical, and process choices.
- [specs/README.md](./specs/README.md) defines when a committed workstream needs a spec and which gates it must answer.
- [harness/README.md](./harness/README.md) explains the agent/human document graph.
- [pr-history/README.md](./pr-history/README.md) records PR-sized implementation evidence and follow-ups.
