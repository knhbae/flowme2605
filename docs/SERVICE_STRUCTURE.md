# FLOW Service Structure

Last updated: 2026-07-03
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
| `/` | Home and discovery entry. Surfaces one representative save path and a small number of secondary starts without exposing conversion mechanics first. | `HomeLanding` in `components/flow/AppClient.tsx` | `seed-flows`, `execution-model`, `source-fit`, `source-backed-my-flow` |
| `/flows` | Browse seeded/public content candidates with search, intent chips, and action-first catalog cards. Cards show title, required input/result, first action, trust/status, and CTA; source/detail stays secondary. | `FlowList` in `components/flow/AppClient.tsx` | `seed-flows`, `types`, `execution-model`, `source-backed-my-flow` |
| `/f/[slug]` | Public Flow execution/detail route for a single slug. Leads with input-to-result promise, required input or no-input state, first action preview, one primary save CTA when available, and keeps source/detail/memo below or collapsed. | `PublicFlow` in `components/flow/AppClient.tsx` | `seed-flows`, `parser`, `export`, `storage`, `artifact-plan` |
| `/flows/new` | Manual Flow authoring entry. | `NewFlow` in `components/flow/AppClient.tsx` | `parser`, `types`, `storage` |
| `/flows/[id]/edit` | Saved/manual Flow editing entry. | `Editor` in `components/flow/AppClient.tsx` | `storage`, `parser`, `types` |
| `/calendar` | Global calendar execution entry for saved dated Steps. Reuses My Flow's calendar surface but starts from schedule-first context. | `MyFlows` with `surface="calendar"` | `storage`, `source-backed-my-flow`, `my-flow-step-export`, `export` |
| `/my` | User's saved Flow execution hub. Today/next/overdue actions come before inventory; detail owns memo/source/export regeneration. Dated execution is also exposed through `/calendar`. | `MyFlows` in `components/flow/AppClient.tsx` | `storage`, `source-backed-my-flow`, `my-flow-step-export`, `export`, `artifact-fields` |
| `/flow-maps/[map]` | Source-backed public save route. Leads with title, input-to-result promise, quiet result chips, required input, first action preview, and save into My Flow execution; source/detail stays in supporting areas. | `SourceBackedFlowMapPublicPage` in `components/flow/SourceBackedFlowMapPage.tsx` | `source-backed-my-flow`, `storage` through save action |
| `/flow-maps/[map]/creator` | Creator-side publish review and Step contract editing route. | `SourceBackedFlowMapCreatorEditor` | `source-backed-my-flow` |
| `/creators` | Creator directory. | `CreatorDirectory` in `components/flow/AppClient.tsx` | `creator-channel-preview`, `users` |
| `/u/[creator]` | Creator profile/channel surface. | `CreatorProfile` in `components/flow/AppClient.tsx` | `creator-channel-preview`, `users` |
| `/content-flows` | Internal Korean content conversion and review workbench. Not a public service surface unless promoted. | `KoreanFlowContentStudio` | `korean-flow-content-*`, `flow-content-coverage-axes`, `app/api/content-flow-review` |
| `/flow-lab` | Internal content QA and review lab. | `ContentLab` | `content-lab`, `content-lifecycle`, `source-review-priority`, `natural-artifact-audit`, `source-fit` |
| `/ia-compare` | Internal IA comparison PoC for 3-tab vs 4-tab service-frame review. Not a public service surface unless a decision promotes it. | `IaComparisonReport`, `FourTabIaPoc` | service IA, My Flow execution assumptions |
| `/restart/moving-d30` | Focused restart prototype for moving D-30 content. | `MovingD30Restart` | `moving-d30-restart` |

## Navigation IA And Exposure Depth

This is the user-facing sitemap rule for service-frame work. The route table above says what exists; this section says what should be exposed in navigation and why.

### Primary User Jobs

| Priority | User job | User-facing label | Main route | Navigation treatment | Notes |
| --- | --- | --- | --- | --- | --- |
| P0 | Discover something worth saving | `Flow 찾기` | `/flows` and selected home modules | Primary tab or top nav item | This is the main catalog/browse job. It should not mix internal review candidates with representative service candidates. |
| P0 | Run dated saved work | `캘린더` | `/calendar` | Primary tab or top nav item | This is the fastest way back to scheduled Steps after users save dated Flows. |
| P0 | Manage saved work | `내 Flow` | `/my` | Primary tab or top nav item | This owns Today, saved Flow, saved Map, Step detail, checks, memo, and export regeneration. |
| P1 | Understand the service promise | `홈` | `/` | Primary nav item, but not a dense catalog | Home should frame the product and route users to Flow finding or My Flow. It should not become a full content lab. |
| P1 | Inspect a public Flow before saving | Flow title / `저장 전 보기` / `바로 시작` | `/flow-maps/[map]`, `/f/[slug]` | Deep link from catalog/home/card | These are content detail pages, not global tabs. |
| P2 | Create from my own content | `만들기` or `제작자` | `/flows/new`, future creator publish path | Secondary action, not always in bottom tabs | Creation is important for the platform, but early user tests should not let it compete with browse and run. |
| P2 | Browse creators/channels | `제작자` / `채널` | `/creators`, `/u/[creator]` | Secondary nav or menu item | Useful when creator supply is strong. Do not promote ahead of representative Flow quality. |
| Internal | Review and convert source content | `콘텐츠 검토`, `Flow Lab` | `/content-flows`, `/flow-lab` | Hidden from public nav | These are planning/QA surfaces and should not appear in the normal service frame. |

### Recommended Service Frame

Mobile should use a simple app-like frame:

- Bottom or top primary tabs: `홈`, `Flow 찾기`, `캘린더`, `내 Flow`.
- Hamburger or secondary menu: `만들기`, `제작자`, `Flow Lab`, `콘텐츠 검토`, docs/debug links.
- Keep `캘린더` as a global primary tab. It may reuse the same My Flow calendar component, but the entry point should feel like a schedule-first execution surface rather than an inventory view.
- Detail pages should keep the same frame but highlight their owning section:
  - `/flow-maps/[map]` and `/f/[slug]` belong under `Flow 찾기`.
  - `/calendar` belongs under `캘린더`.
  - `/my` detail states belong under `내 Flow`.
  - Creator edit/review routes belong under `만들기` or a secondary creator menu, not public discovery.

Desktop can use a top nav with the same priority order. It should not expose more primary destinations than mobile.

### Depth Model

| Depth | Product object | Example | User expectation | Navigation rule |
| --- | --- | --- | --- | --- |
| D0 | Service section | Home, Flow finding, Calendar, My Flow | Move between major jobs | Only D0 belongs in persistent primary nav. |
| D1 | Catalog group or saved workspace tab | 추천 Flow, 긴 Flow Map, 오늘, Flow, 지도, 필터 | Narrow the current job | Use page-local tabs or filters, not global nav. |
| D2 | Flow Map or single Flow | 중1 수학 목차 진도표, 이사 D-30 준비 Flow | Inspect/save/run one content artifact | Open from card/detail link. |
| D3 | Flow inside a Map | `1. 소인수분해`, `원룸 이사 D-30 준비` | See progress within a larger map | Show inside the Map page or My Flow Map drilldown. |
| D4 | Step | `거듭제곱 확인`, `견적 후보 정하기` | Calendar/todo minimum executable unit | Tapping a Step opens inline detail. |
| D5 | Item | Step memo/checklist text | Checklist item or text fallback | Hide until Step detail is open; export as text if destination app cannot represent checklist items. |

### Current Navigation Gaps To Resolve

- The service frame now uses primary `홈 / Flow 찾기 / 캘린더 / 내 Flow` navigation, with creation and creator browsing kept in a secondary menu.
- Home shows the service promise, one primary representative Flow Map, and the menu tree for `Flow 찾기 / 캘린더 / 내 Flow / 만들기`; it should not become a second full catalog.
- `/flows` is the catalog. Current exposure is one integrated content catalog with the existing 2 representative maps, 9 source-backed curated maps, and 1 single Flow baseline in the same card grid. It should not carry a duplicate persistent `내 Flow 보기` CTA that competes with the global bottom tab, except in contextual post-save or empty-state moments.
- `/flows` now distinguishes multi-Flow map candidates and one-Flow candidates inside a single integrated catalog, not by separate curated-source/seed or one-off sections. The catalog has a plain search field, quick situation chips, and compact decision-first cards that lead with an input-to-result promise, then one `먼저 할 일` preview. Category, status, scale, and source are quiet one-line metadata rather than heavy chips. Catalog card controls use one strong `저장 전 보기` action with quieter `바로 시작` and `원문` links. It still needs real usage/trust signals once account-backed use exists.
- Home and `/flows` should use result-oriented user copy. Avoid internal review labels such as `후보`, `검토`, or `대표 노출` on normal user surfaces; keep those labels in creator, content-lab, or report pages.
- A single Flow that is intentionally promoted into the representative catalog should not appear as `검토 필요` in `/my`; otherwise the user sees a service recommendation become a warning after saving.
- `/calendar` should open the saved calendar surface directly and hide duplicate page-local view tabs.
- `/calendar` should keep the route title as `캘린더`, while the inner calendar card uses a job label such as `월간 일정` so the first viewport does not repeat the same heading.
- `/my` should open as a saved-work continuation dashboard, not as a today-only empty state. Its page-local tabs should stay to `오늘` and `전체`; `캘린더` belongs to the global primary tab, not another My Flow local tab. Single saved Flow and many saved Flows should use the same local tab rule so the user does not learn a different interface after saving the first Flow.
- `/my` Today should show the user's immediate execution queue first. If a real today item exists, label it as today's work; if today is empty, label the first future item as `다음 할 일` instead of implying it is due today. Flow name/progress stays as secondary context and overdue/completed status stays compact. Full Flow/checklist structure stays available on demand through Flow cards or Step detail.
- `/my` 전체 should stay saved-content-first: saved Flow title, progress, next item preview, and the item list come before any item detail. Tapping a saved content row opens a limited item list first; the collapsed next-item preview is removed while the list is open so the same item is not repeated. Long item lists expand only after an explicit full-list action. Tapping a specific item row opens item detail. Today and 전체 may share row/detail components, but they should not look like the same card for the same job.
- `/my` should keep read-first Step detail and avoid mixing input/edit controls into default viewing. Mobile Step detail should show the Step title, date, completion state, and checklist first. When a Step has no checklist, show one concise `바로 할 일` hint from the source-backed detail before the collapsed support rows. Memo, schedule, source, copy/export, and edit actions stay collapsed. It remains the saved-work management space; checklist and routine work stays inside Flow cards or Step detail instead of pushing users back into calendar navigation.
- In `/my` 전체 view, an item action opens detail inline under the same saved-content card and tapping the same item action again closes it.
- In `/my` 전체 view, mobile cards should show the next item before full inventory or list-management controls. Hide/restore is an inventory preference for larger management states, not a default mobile action for a single saved Flow.
- After saving a Flow Map, `/my` should show a compact saved banner and the same Today/전체 workspace underneath. The saved banner may show saved counts, one `먼저 할 일 열기` action, and one `전체 할 일 보기` action, but it should not render a second mini inventory or item detail inside the banner. Dated content is available from the global `캘린더` tab, so `/my` should not repeat `캘린더 보기` CTAs.
- Source-backed public Flow Map pages should show the result promise, required input, save action, and first action preview before the source section. Full checklist plus memo/source detail stay behind expanders so users can scan the map before saving without reading every source row at once.
- Public single Flow detail pages should show the result promise, required input or no-input state, first action, and save CTA before source context. Source title, conversion note, memo, and warning context remain available as `원문과 근거` or supporting sections instead of competing with the first action.
- Export-first public Flow pages should avoid duplicate mobile save pressure. The sticky mobile bar may open a single export sheet, while the inline artifact area keeps save, calendar, sheet, and text actions.
- Creator and internal review surfaces need secondary placement until the public creator workflow is ready.

### IA v3 Product-Route Working Design

Use this as the next product-route baseline until user evidence reopens it.

- Keep the primary service frame at `홈 / Flow 찾기 / 캘린더 / 내 Flow`.
- Promote `캘린더` to a global primary tab because saved dated Steps are a core return path, not only a nested management view.
- Make `/calendar` schedule-first and make `/my` feel less like inventory by default: `/my` lands on `오늘`, uses `전체` as the saved-content manager, and does not repeat a local `캘린더` tab.
- After a user saves dated content, route them to the first actionable item inside the normal My Flow shell. The post-save banner should be a confirmation/router only; the actual Step detail opens in the normal Today or Flow surface. The global `캘린더` tab is the clear path for full dated schedules, and it should default to the nearest saved dated Step instead of an unrelated empty date when saved rows are available.
- Hide internal hierarchy words from normal discovery copy. `Flow Map`, `Step`, and `Item` can exist in source contracts, creator tools, tests, and reports, but user-facing discovery should say `큰 흐름`, `항목`, `일정`, `체크`, or `진도표` when that is enough.
- Home should explain the service and show one representative starting point plus a small number of secondary starts. `/flows` owns catalog browsing.
- Reopen the 4-tab decision only if observed users treat `캘린더` as redundant with `/my`, or if dated saved content remains too sparse for a global schedule entry.

### Creator Publish Gate v1 Baseline

- `/flow-maps/[map]/creator` is a creator/review surface. It may expose source-row-to-`Step`/`Item` contract language because creators need to verify the conversion.
- `/flow-maps/[map]`, `/flows`, `/`, and `/my` are user-facing surfaces. They should prefer user vocabulary such as `콘텐츠`, `묶음`, `항목`, `할 일`, `일정`, `체크`, `진도표`, and `전체 저장하고 시작`.
- Creator preview links for the saved result should point to a map-specific My Flow preview, such as `/my?demo=source-backed&savedMap=middle-school-math-1`, instead of a generic source-backed demo.
- Public and My Flow links should say `저장 전 보기`, `전체 보기`, `바로 시작`, or destination-specific labels, not `지도 보기`, unless the user explicitly needs map structure language.
- Public Flow detail should not expose operation or migration labels such as `새 실행모델로 전환 중`; explain the saved outcome in user terms such as schedule, checklist, memo, and source instead.
- The creator draft/publish marker is local-only. Do not describe it as real publishing, marketplace approval, or validation evidence until account-backed publish exists.

### Do Not Expose As Primary Nav Yet

- `/content-flows`
- `/flow-lab`
- `/ia-compare`
- `/restart/moving-d30`
- `/flow-maps/[map]/creator`
- `/flows/[id]/edit`

These may remain directly accessible for testing or development, but they should not shape the normal user's mental model.

## Architecture Map

| Layer | Location | Responsibility |
| --- | --- | --- |
| Route shell | `app/` | Keep Next.js route files thin. Decode params, load package data when needed, and hand off to product components. |
| Product UI | `components/flow/AppClient.tsx` and focused `components/flow/*` files | Own visible interaction, screen state, user-facing copy, and handoff between public, creator, and My Flow surfaces. |
| Source-backed map UI | `SourceBackedFlowMapPage.tsx`, `SourceBackedFlowMapCreatorEditor.tsx`, `SourceBackedFlowMapSaveButton.tsx` | Keep source-backed public inspection, creator publish editing, and save-to-My-Flow actions separate. |
| Artifact UI | `ArtifactWorkbench.tsx`, `ArtifactPreview.tsx` | Render and edit user artifacts without mixing them into source evidence or review-only notes. |
| Domain model | `lib/flow/types.ts`, `seed-flows.ts`, `curated-source-app-seed.ts`, `execution-model.ts`, `source-backed-my-flow.ts` | Define Flow, Flow Map, Step, publish package, source-backed seed adapters, and execution assumptions. |
| Parsing and time | `parser.ts`, `date.ts`, `recurrence.ts`, `destination.ts` | Normalize user input, dates, recurrence, and artifact destinations. |
| Persistence and export | `storage.ts`, `export.ts`, `my-flow-step-export.ts`, `artifact-plan.ts`, `artifact-fields.ts` | Save local records and regenerate text, calendar, workbook, and Step-detail exports from edited state. |
| Review and evidence | `content-lab.ts`, `source-fit.ts`, `source-review-priority.ts`, `natural-artifact-audit.ts`, `observed-session-*` | Keep QA, source/risk labels, observed sessions, and internal review evidence out of public validation claims. |
| Content conversion | `korean-flow-content-*`, `content-inventory.ts`, `content-lifecycle.ts`, `flow-content-selection-audit.ts` | Convert and audit source content before it becomes public or saved Flow Map material. |
| API boundary | `app/api/content-flow-review/route.ts` | Server-side review endpoint for content-flow review workflows. |
| Verification | `lib/flow/*.test.ts`, `tests/e2e/flow-mvp.spec.ts`, `scripts/check-docs.mjs` | Prove behavior, docs health, and route-level workflows before claims of completion. |

## Ownership Rules

- Public routes should stay user-facing and should not expose internal review language unless the user needs it to act safely.
- Creator routes may show publish readiness, source/risk, and Step contract controls, but they should not become the user's saved execution workspace.
- My Flow owns saved user state, edited Step details, and regenerated exports.
- Research surfaces under `/content-flows` and `/flow-lab` remain internal until a spec or decision promotes a behavior into the service tree.
- Shared domain changes belong in `lib/flow/` tests first. UI changes should consume those contracts rather than duplicating conversion logic in components.
- Curated source app handoff bundles enter the canonical `seedBundles` path through `seed-flows.ts`. `source-backed-my-flow.ts` keeps Flow Map, publish-package, and saved-map metadata for those same child Flow slugs, and its runtime merge helper should stay a dedupe fallback rather than the only seed attachment path.

## Related Docs

- [DECISIONS.md](./DECISIONS.md) records settled product, UX, technical, and process choices.
- [specs/README.md](./specs/README.md) defines when a committed workstream needs a spec and which gates it must answer.
- [harness/README.md](./harness/README.md) explains the agent/human document graph.
- [pr-history/README.md](./pr-history/README.md) records PR-sized implementation evidence and follow-ups.
