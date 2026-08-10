# FLOW Service Structure

Last updated: 2026-08-06
Status: Living baseline. Keep this current with implementation PRs.

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
| `/f/[slug]` | Public Flow execution/detail route for a single slug. Canonical aliases redirect before rendering; for AJD moving, legacy public slugs resolve to the 24-item `moving-d30-basic` detail. It is a share-entry shell before save, not the persistent three-destination app frame. The current R3A production baseline inherits the P35/Round 2 result-first shell: only an unchanged, eligible, local-only result may create one session-only quick result after confirmation, with no saved plan, persistent receipt, or history write. The approved R3B candidate additionally shares date-grouped Todo rendering and non-mutating public Item preview while preserving that ownership boundary. The saved receipt may open the saved Flow with its whole plan expanded once; reload and later library entry start collapsed. Source resources remain read-only. | `PublicFlow`, `FlowSaveBeforeFrame`, `PublicFlowAdjustmentPanel`, `FlowArtifactDataPreview`, `FlowTransferConfirmation`, `SavedFlowReceiptFrame` in `components/flow/` | `canonical-flow-registry`, `flow-experience-projection`, `whole-flow-reading`, `flow-result-capability`, `effective-flow-transfer-artifact`, `result-transfer`, `seed-flows`, `parser`, `export`, `storage`, `artifact-plan`, personal overlay helpers |
| `/flows/new` | Manual Flow authoring entry. | `NewFlow` in `components/flow/AppClient.tsx` | `parser`, `types`, `storage` |
| `/flows/[id]/edit` | Saved/manual Flow editing entry. | `Editor` in `components/flow/AppClient.tsx` | `storage`, `parser`, `types` |
| `/calendar` | Global date-first execution lens. P35 keeps the month grid, selected-day execution, one Flow-scope picker, and the shared completion primitive while leaving structural editing and undated date placement in My Flow. Archived and excluded content is absent. Routine definitions stay outside execution, occurrence wrappers are named non-tabbable groups, and each executable occurrence owns one completion control. | `MyFlowCalendar`, `MyFlowRuntime` with `surface="calendar"`, `MyFlowCalendarSurface`, `CalendarFlowScopePicker` | `storage`, `source-backed-my-flow`, `calendar-flow-scope`, `my-flow-step-export`, `export`, recurrence projection |
| `/my` | User's saved-plan recovery and execution hub. The current R3A production baseline keeps a compact Today summary only when derived open work exists, followed by the canonical saved-plan library and selected detail; `r3a-lab` remains exact-query only. The approved R3B candidate adds URL-backed Plan ordering, one date-grouped Todo mapping, responsive mobile/stacked/desktop composition, and the typed selected-Plan execution boundary without adding a saved identity or completion store. Save deep-links and Plan/Item Back preserve query, selected objects, document/rail scroll, owning plan, and focus. Saved detail remains the authoritative transfer owner: format, destination, scope, IDs/count, loss, one-way, and duplicate risk are confirmed before the local clipboard/file effect, and only a successful effect writes a persistent receipt. Archive keeps receipts, backup preserves the exact registry, and permanent deletion removes only the owning plan's receipts with cleanup recovery. Exact rollback switches restore their bounded prior behavior without key rename or migration. | `MyFlows` in `components/flow/AppClient.tsx` | `storage`, `source-backed-my-flow`, `my-flow-local-ia`, `p35-round2-flags`, `result-transfer`, `export-receipt-storage`, `export-receipt-cleanup-journal`, `my-flow-cross-flow-todo`, `personal-flow-lifecycle`, `projection-identity`, `personal-item-detail-overlay`, `whole-flow-reading`, `my-flow-step-export`, `export`, `artifact-fields` |
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
| P0 | Continue and manage saved work | `내 Flow` | `/my` | Primary tab or top nav item | The local Round 2 shell owns compact derived Today, the canonical saved-plan library, selected detail, Item execution, memo, export, and lifecycle without duplicating saved identities. |
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

### Current R3A Production Baseline And Inherited P35/Round 2 Contracts

- R3A is the current production source. `classic` remains the default and exact
  `myFlowExperience=r3a-lab` remains an internal query-only candidate. The
  approved R3B worktree is not production until its exact merge source is
  deployed and the canonical alias is smoked.

- Persistent primary navigation has exactly three destinations: `Flow 찾기 / 캘린더 / 내 Flow`. Flow creation stays secondary and creator browsing stays contextual.
- `/` owns no independent content surface. It replaces the route with `/flows` when no valid saved Flow or saved Flow Map entry exists and with `/my` when at least one valid saved entry exists.
- `/flows` owns the integrated catalog plus URL/memo intake. Quality-held and duplicate content stay out of normal execution, and normal user copy avoids internal review labels.
- Executable `/f/[slug]` and source-backed routes lead with the actual result, expose one primary save action, and reveal at most one adjustment kind at a time. A successful save replaces setup with a receipt instead of stacking a second workspace below it.
- The current `classic` `/my` baseline inherits the compact derived Today, one canonical saved-plan library, and selected detail; no Today heading or placeholder is rendered when Today is empty. R3A adds only the exact-query internal candidate on top of that baseline.
- A saved receipt may use session state to expand the target Flow's whole plan once. Reload, direct re-entry, and later library entry start collapsed; this marker is not product persistence and is excluded from backup.
- Round 2 uses exact `/my?savedPlanLibrary=off` as its independent Q2 rollback. It restores the P35 route and DOM while preserving sorted raw localStorage key/value bytes with `setItem`, `removeItem`, and `clear` calls all `0`; `experiment=off` remains a separate legacy Todo-surface flag.
- Round 2 library routes preserve `q`, one lifecycle `status`, selected `flow`, selected `item`, document scroll, wide-rail scroll, owning plan, and return focus. Direct detail links do not manufacture a fake internal Back entry, and archiving the last active plan enters the archived lens and survives reload.
- Round 2 result paths share one capability manifest and effective snapshot. Public quick is limited to unchanged eligible local-only results and remains session-only; saved detail confirms the immutable request before the effect and writes a persistent receipt only after the clipboard/file effect succeeds.
- Saved result receipts follow the saved plan lifetime: archive keeps them, backup preserves the exact registry bytes, and permanent deletion removes only that plan's receipts. A tab-session cleanup journal recovers interrupted or failed receipt cleanup across reload without regenerating the artifact; closing the tab session also removes that recovery marker.
- `quickLocalResult=off`, `savedTransfer=off`, and `savedPlanLibrary=off` are independent exact-lowercase rollback switches. No switch renames storage keys or performs a migration.
- `/calendar` is a date lens over the same effective Items and completion primitive. It owns month and selected-day execution plus Flow scope, not structural editing or undated date placement.
- Personal title, date, memo, inclusion, and order remain overlays. They never rewrite source records, and no current UI writes directly to an external calendar or todo account.
- Empty My Flow and Calendar states use one Flow-finding action. Internal labs, comparison routes, and creator review surfaces remain outside primary navigation.
- Open evidence remains observed-user comprehension, real Google/Outlook/Apple Calendar or VTODO round-trip, cross-device recovery, account persistence, and real creator/update behavior. Automated QA, deployment, and HTTP checks do not close those gates.

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
| Product UI | `components/flow/AppClient.tsx` and focused `components/flow/*` files | `AppClient.tsx` remains the compatibility facade and shared My Flow runtime owner. `calendar/MyFlowCalendarRouteSurface.tsx` owns Calendar route rendering, `calendar/useMyFlowCalendarController.ts` owns only Calendar React state, refs, selected-Flow preference bridging, and route/focus/scroll orchestration, and `my-flow/MyFlowRouteSurface.tsx` owns My Flow route rendering through typed model/action contracts. None owns saved-plan persistence, completion records, source mutation, or result transfer. |
| My Flow Calendar view-model | `lib/flow/my-flow-calendar-view-model.ts` | Purely derives date/month ranges, scope and month filters, partitions, ordering, date groups, Flow markers/counts, compact-grid state, and default focus from narrow readonly data. It imports no React, route, DOM, browser storage, or `AppClient` owner. |
| My Flow Calendar controller | `lib/flow/my-flow-calendar-controller.ts`, `components/flow/calendar/useMyFlowCalendarController.ts` | The pure module characterizes action-specific state transitions, shared-reset profiles, focus reconciliation, scope persistence decisions, and Calendar-to-My-Flow hrefs without React or browser APIs. The hook applies those plans to Calendar-only React state and narrow browser ports while exposing typed date-sync commands to the shared My Flow runtime. |
| My Flow saved-library controller | `lib/flow/my-flow-library-controller.ts`, `components/flow/AppClient.tsx` | The pure planner owns saved-library query/filter and list/Plan/Item route-history state and effect decisions, including dirty-discard policy, direct entry, Back, focus, and scroll requests. `AppClient` remains the narrow React/browser adapter that applies history and UI effects; it still owns no new persistence, completion, export, or receipt semantics through this boundary. |
| Approved execution presentation | `components/flow/DateGroupedTodoList.tsx`, `components/flow/PublicFlowItemPreview.tsx`, `components/flow/my-flow/MyFlowSortMenu.tsx`, `components/flow/FlowContextDisclosure.tsx`, `components/flow/FlowExportPanel.tsx`, `lib/flow/date-grouped-todo-list.ts`, `lib/flow/my-flow-local-ia.ts`, `lib/flow/approved-item-raw-memo.ts`, `lib/flow/responsive-execution-workspace.ts`, `lib/flow/export-scope.ts` | Shared pure mappings own date grouping, Plan ordering, raw memo/checklist preservation, responsive mode, and export scope. Focused components render those mappings across public preview, My Plan, and Calendar without creating content-specific persistence owners. Public controls remain non-mutating; personal completion and artifact effects still use existing runtime commands. |
| Approved Plan execution boundary | `components/flow/my-flow/MyPlanExecutionSurface.tsx`, `lib/flow/saved-plan-transfer-controller.ts`, `components/flow/AppClient.tsx` | `MyPlanExecutionSurface` owns selected-Plan composition through narrow typed model, action, and renderer contracts. `saved-plan-transfer-controller` purely prepares immutable transfer requests and revalidates the confirmed projection. `AppClient` remains the runtime adapter and owns saved data, completion/edit mutation, URL/history/focus effects, clipboard/download effects, and receipt persistence. These boundaries add no storage key, schema, migration, route/query, feature flag, or export format. Item detail/editor remains an injected compatibility renderer until a separate narrow read-only boundary is proven. |
| My Flow experience boundary | `lib/flow/my-flow-workspace-snapshot.ts`, `lib/flow/my-flow-experience-variant.ts`, `components/flow/my-flow/MyFlowExperienceContract.ts`, `components/flow/my-flow/MyFlowExperienceHost.tsx`, `components/flow/my-flow/MyFlowClassicExperienceAdapter.tsx`, `components/flow/my-flow/experiences/MyFlowR3aLabSurface.tsx` | Builds a versioned JSON-safe read-only snapshot only for an eligible exact `r3a-lab` request, keeps personal saved-route and source identities separate, and selects the unchanged classic surface or an internal saved-library candidate through semantic navigation intents. Repeated Items retain all occurrence route hints. Selected-Plan rendering uses the approved execution boundary, while `AppClient` remains its runtime data and command adapter. This layer owns no storage key, migration, mutation, artifact effect, or receipt. |
| Source-backed map UI | `SourceBackedFlowMapPage.tsx`, `SourceBackedFlowMapCreatorEditor.tsx`, `SourceBackedFlowMapSaveButton.tsx` | Keep source-backed public inspection, creator publish editing, and save-to-My-Flow actions separate. |
| Artifact UI | `FlowSaveBeforeFrame.tsx`, `FlowArtifactDataPreview.tsx`, `FlowTransferConfirmation.tsx`, `FlowExportPanel.tsx`, `FlowExportReceipt.tsx`, `RoutineScheduleEditor.tsx`, `ArtifactWorkbench.tsx`, `ArtifactPreview.tsx` | Render the compact whole-Flow outline, actual-data content-native result, contextual adjustment, shared routine definition, immutable transfer confirmation, and saved persistent receipt. Keep the legacy full workbench behind a secondary disclosure and keep source evidence separate from personal editing. |
| Domain model | `lib/flow/types.ts`, `flow-experience-projection.ts`, `whole-flow-reading.ts`, `effective-routine-projection.ts`, `calendar-flow-scope.ts`, `seed-flows.ts`, `curated-source-app-seed.ts`, `execution-model.ts`, `source-backed-my-flow.ts` | Define Flow, Flow Map, stable item roles and projection eligibility, shared whole-Flow reading order, routine definition/occurrence projection, Calendar scope predicates, source-backed seed adapters, execution assumptions, URL lookup eligibility, and manual registration readiness checks. Resource, reference, and warning rows remain visible context but do not become executable completion rows. |
| Cross-entry canonical identity | `lib/flow/canonical-flow-registry.ts`, `lib/flow/canonical-flow-storage.ts` | Resolve route/public slug/Flow Map/URL lookup aliases by source + user job + intentional editorial variant. Record additive canonical origin/reconciliation metadata, dual-read legacy copies, require explicit active-copy selection, and preserve every existing saved/personal/run/occurrence/export key. |
| URL-first intake | `lib/flow/url-first-lookup.ts`, `lib/flow/url-first-supply-queue.ts` | Canonicalize incoming source URLs, classify URL-first P0 states, and register a source-backed map as a saveable hit only when source URL, direct-route access, non-reject status, and public execution eligibility all pass. A known review-hold URL returns blocked `needs_review` with no save, export, or draft bypass. Saveable hits may build direct or lightly customized start packages. Memo/miss drafts parse only user-authored phrases, retain stable source mappings, and require an explicit pre-save acceptance list; no generic row is added to reach a count. Internal handoff data stays separate. |
| Parsing and time | `parser.ts`, `date.ts`, `recurrence.ts`, `destination.ts` | Normalize user input, dates, recurrence, and artifact destinations. |
| Persistence and export | `storage.ts`, `canonical-flow-storage.ts`, `local-data-backup.ts`, `result-transfer.ts`, `effective-flow-transfer-artifact.ts`, `export-receipt-storage.ts`, `export-receipt-cleanup-journal.ts`, `export.ts`, `my-flow-step-export.ts`, `export-labels.ts`, `artifact-plan.ts`, `artifact-fields.ts` | Save local records; create immutable transfer requests and actual clipboard/file artifacts; persist versioned saved-plan receipts only after a successful effect; recover permanent-delete receipt cleanup across reload; and regenerate text, calendar, workbook, Step-detail exports, and shared result-first export labels from edited state. Receipt registry bytes are included in personal backup, while public quick feedback and cleanup journals stay session-only. Canonical metadata is additive; legacy saved keys remain readable and recoverable. |
| Review and evidence | `content-lab.ts`, `source-fit.ts`, `source-review-priority.ts`, `natural-artifact-audit.ts`, `observed-session-*` | Keep QA, source/risk labels, observed sessions, and internal review evidence out of public validation claims. |
| Content conversion | `korean-flow-content-*`, `content-inventory.ts`, `content-lifecycle.ts`, `flow-content-selection-audit.ts` | Convert and audit source content before it becomes public or saved Flow Map material. |
| API boundary | `app/api/content-flow-review/route.ts` | Server-side review endpoint for content-flow review workflows. |
| Verification | `lib/flow/*.test.ts`, `tests/e2e/flow-mvp.spec.ts`, `scripts/check-docs.mjs` | Prove behavior, docs health, and route-level workflows before claims of completion. |

## Ownership Rules

- Calendar is a separate route and presentation owner but remains a derived lens over My Flow data; it must not create a second saved-plan or completion store.
- R1 moves Calendar state, selected-Flow preference bridging, Calendar focus/scroll, and Calendar-to-My-Flow navigation behind a typed controller. R2 additionally moves saved-library query/filter and list/Plan/Item transition decisions behind a pure controller. `AppClient` still applies browser/React effects and retains persistence, recovery, completion/edit mutation commands, and result-transfer ordering.
- R3A is query-only and internal. `classic` remains the default; null, degraded, ineligible, and classic-only states fail closed to the established surface. Workspace snapshots are render-derived only for an eligible exact `r3a-lab` request and are never persisted. R3B separates selected-Plan rendering and saved-transfer request planning behind typed boundaries; Item detail/editor remains runtime-owned until a separate narrow read-only boundary is proven.
- New pure `lib/flow` projections must not import `AppClient`, React, route components, or browser storage. UI adapters may retain the original runtime object but must not persist projection-only DTO fields.
- Public routes should stay user-facing and should not expose internal review language unless the user needs it to act safely.
- Creator routes may show publish readiness, source/risk, and Step contract controls, but they should not become the user's saved execution workspace.
- My Flow owns saved user state, edited Step details, and regenerated exports.
- Research surfaces under `/content-flows`, `/creators`, `/ia-compare`, and `/flow-lab` remain internal until a spec or decision promotes a behavior into the service tree.
- Shared domain changes belong in `lib/flow/` tests first. UI changes should consume those contracts rather than duplicating conversion logic in components.
- Curated source app handoff bundles enter the canonical `seedBundles` path through `seed-flows.ts`. `source-backed-my-flow.ts` keeps Flow Map, publish-package, and saved-map metadata for those same child Flow slugs, and its runtime merge helper should stay a dedupe fallback rather than the only seed attachment path.

## Related Docs

- [DECISIONS.md](./DECISIONS.md) records settled product, UX, technical, and process choices.
- [specs/README.md](./specs/README.md) defines when a committed workstream needs a spec and which gates it must answer.
- [harness/README.md](./harness/README.md) explains the agent/human document graph.
- [pr-history/README.md](./pr-history/README.md) records PR-sized implementation evidence and follow-ups.
