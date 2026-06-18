# 2026-06-08 External Ecosystem Phase 5 Compression Table

Purpose: compress the current external ecosystem analysis into one FlowMe decision table so future app, service, platform, and competitor reviews do not drift into feature wishlists.

Status: roadmap decision artifact, not user-behavior validation.

HTML view: [2026-06-08 External Ecosystem Phase 5 Compression Table 한국어 HTML](./2026-06-08-external-ecosystem-phase5-compression-table-ko.html)

Related documents:

- [External ecosystem analysis roadmap](./2026-06-08-external-ecosystem-analysis-roadmap.md)
- [Phase 1 candidate comparison](./2026-06-08-external-ecosystem-phase1-candidate-comparison.md)
- [Remote support adjacent service comparison](./2026-06-08-remote-support-adjacent-service-comparison.md)
- [Remote help session precheck gate](./2026-06-09-remote-help-session-precheck-gate.md)
- [Search console digital setup comparison](./2026-06-08-search-console-digital-setup-comparison.md)
- [Search console setup precheck gate](./2026-06-09-search-console-setup-precheck-gate.md)
- [Naver Search Advisor site readiness scenario](./2026-06-09-naver-search-advisor-site-readiness-scenario.md)
- [Export destination and competitor boundary](./2026-06-08-export-destination-competitor-boundary.md)
- [Export destination fit rules](../flow-rules/export-destination-fit.md)
- [Platform API readiness matrix](./2026-06-08-platform-api-readiness-matrix.md)
- [Integration readiness gate](../flow-rules/integration-readiness-gate.md)
- [Dorm move-in public promotion gate](./2026-06-09-dorm-move-in-public-promotion-gate.md)
- [Elementary entry public route evidence gate](./2026-06-09-elementary-entry-public-route-evidence-gate.md)

## Decision Summary

Use the compression table as the final gate for this analysis room.

Every service, platform, content source, or competitor review should end with:

1. the user's execution moment;
2. the natural artifact the user already needs;
3. the Stage 0 FlowMe behavior to test;
4. the product decision: `A`, `A-`, `B`, `C`, `future_platform`, or `reject_for_now`;
5. the explicit do-not-build boundary.

The table does not approve implementation. It decides what kind of evidence or artifact should come next.

## Decision Scale

| Decision | Meaning | Next action |
|---|---|---|
| `A` | Strong product rule or Stage 0 candidate; aligns with export-first FlowMe behavior | Attach to future candidate reviews, or design `/content-flows` review if the source/artifact is concrete |
| `A-` | Strong but needs framing, source separation, or route-level caution before promotion | Keep in docs or review UI; do not public-promote without a sharper artifact |
| `B+` | Useful docs-level candidate; likely real user need but high variation or support burden | Keep as analysis handoff; wait for a selected source or user scenario |
| `B` | Useful backup direction; lower priority or weaker source evidence | Hold for later batch |
| `C` | Avoid for this batch because it repeats covered patterns or lacks a distinct artifact | Do not promote unless a stronger source appears |
| `future_platform` | Plausible after usage data, stable schemas, and permission clarity | Keep out of Stage 0 implementation |
| `reject_for_now` | Misaligned, too broad, too risky, or would make FlowMe a clone/platform too early | Record boundary only |

## Master Compression Table

| Candidate | Source | User Moment | Natural Artifact | Anchor | Stage 0 Behavior | Decision | Do Not Build |
|---|---|---|---|---|---|---|---|
| Dorm move-in preparation | School dorm pages and term PDFs | Student or parent executes school-specific dorm entry instructions | Hybrid: D-day reminders + checklist/memo | Move-in date | Open source-backed candidate, enter move-in date, copy/export reminders, check documents/items/prohibited review | `A` review candidate | dorm marketplace, room tracker, health document upload, payment tracking, school login integration |
| Elementary school entry preparation | Official school notices plus parent checklist sources | Parent prepares first school day without overbuying or missing notice-specific basics | Hybrid: D-30 checklist + memo | Entry ceremony or school start date | Open route/review, enter start date, copy checklist, check notice/buy/defer/label items | `A-` candidate | school assignment lookup, child profile storage, shopping affiliate surface, universal must-buy list |
| Generic remote-help session precheck | AnyDesk, TeamViewer, Chrome Remote Desktop, Zoom, Quick Assist official docs | User chooses screen share, one-time remote control, or repeated management before getting help | Internal checklist + closeout memo | Support time or none | Choose support type, copy permission checklist, check closeout/revoke step | `A-` boundary candidate | remote tool integration, access-code/password/session-link storage, device list, fraud scoring |
| Site search-console setup precheck | Google Search Console, Naver Search Advisor, Bing Webmaster Tools docs | Site owner verifies ownership, checks crawl prerequisites, and schedules revisit | Hybrid checklist + revisit memo | Setup or revisit date | Choose ownership method, copy memo, check sitemap/robots/status, set revisit | `B+` docs umbrella | OAuth import, DNS automation, sitemap generation, token/API-key storage, ranking promises |
| Naver Search Advisor site readiness | Naver Search Advisor official setup, diagnosis, ownership, and report docs | Korean custom-site owner checks whether they can complete ownership and crawl-readiness setup | Hybrid access/status checklist + revisit memo | Setup or revisit date | Choose site unit and access method, record ownership method status, check robots/noindex/readiness, record sitemap/RSS/request status, set revisit | `A-` `/content-flows` review candidate | verification value/DNS value/HTML-tag content storage, SEO scoring, ranking tracker, analytics dashboard, Naver integration |
| Calendar export destination | Google Calendar and Apple Calendar import docs | User wants dated Flow items in an existing calendar | `.ics` or calendar CSV | Date/time | Export file, import event, check event exists | `A` destination rule | calendar clone, account sync, scheduling assistant |
| Sheet export destination | Google Sheets import docs | User wants inventory, progress, comparison, menu, or status rows | CSV/XLSX-ready table | Week/date or none | Export rows, import/append manually, check row shape | `A` destination rule | spreadsheet editor, formula engine, live data connector |
| Memo/Notion handoff | Notion import docs plus FlowMe source-note rules | User wants source notes, caution, or rows in a workspace | Markdown/plain text or CSV | None | Copy/import note or rows, keep source link and caution | `A-` handoff rule | Notion clone, workspace builder, database automation |
| Todoist task handoff | Todoist CSV/template docs | Task-manager user wants a project checklist outside FlowMe | Todoist-compatible CSV | Due date optional | Export project CSV, import manually, check tasks | `B` optional destination | generic task inbox, recurring-task engine, Todoist integration |
| Flow export destination selector | Cross-platform import docs | User wants FlowMe to pick the right export shape before they save | Decision table | Artifact type | Choose destination shape, export, collect feedback | `A-` product rule encoded in flow-rules | destination account connection, workspace automation, all-purpose export wizard before candidate evidence |
| Integration readiness gate | Google Calendar API, Google Sheets API, Notion API, Todoist API, Zapier, Make docs | Product owner decides when export friction deserves direct integration | Roadmap memo/rule | Proven destination behavior | Measure export friction first; only then consider light integration | `A` roadmap rule | OAuth/token storage, arbitrary webhooks, automation builder, persistent sync in Stage 0 |
| Calendar direct save | Google Calendar API | User repeatedly imports dated Flow events and asks for direct save | Calendar event | Date/time | Keep `.ics` first; measure import friction | `stage1_light_integration` candidate | Calendar API in Stage 0, broad calendar-write permission |
| Sheet direct append | Google Sheets API | User repeatedly appends Flow rows to the same sheet | Sheet row table | Stable sheet/range later | Keep CSV/XLSX first; measure append friction | `stage1_light_integration` candidate | Sheets API in Stage 0, Drive/Sheets token storage |
| Notion API page/database creation | Notion API | User wants Flow rows and notes in a Notion workspace | Markdown/CSV handoff first | Workspace/page later | Export Markdown/CSV only | `future_platform` | Notion API, page/database schema builder, workspace automation |
| Todoist API task creation | Todoist API | User wants direct task creation in a task manager | Todoist CSV first | Project later | Export CSV only | `future_platform` | task creation API, reminder engine, task inbox |
| Zapier/Make automation | Zapier Platform and Make webhook/API docs | User wants Flow events to trigger other app actions | Future webhook/action payload | Event type later | No automation; keep export/copy | `future_platform` | FlowMe Zapier/Make app, arbitrary webhook endpoint, trigger/action builder |
| Generic travel packing or appliance cleaning | Existing candidate catalog and roadmap source leads | User repeats a covered category pattern | Checklist or repeat calendar | Trip date or start date | Hold unless source has a distinct decision point | `C` for current batch | more repeated public routes just to grow the catalog |
| Broad AI summary plan | No exact source rows or official execution structure | User asks for a generic plan without source-bound sequence | Unclear | Unclear | Reject until source rows, dates, or decisions exist | `reject_for_now` | generic AI planner, unsourced advice, auto-published plans |

## Stage 0 Experiment Order

1. `Dorm move-in preparation`: strongest next `/content-flows` review direction because the source-to-artifact path is concrete and the artifact is naturally hybrid.
2. `Elementary school entry preparation`: already has a public route, so keep it under the [public route evidence gate](./2026-06-09-elementary-entry-public-route-evidence-gate.md). The route can stay public only as source-review until observed parent sessions prove that the first official-notice card and the D-14 school-specific hold card are understood.
3. `Generic remote-help session precheck`: stronger than a product-specific AnyDesk route because it starts from permission choice and closeout. The 2026-06-09 gate keeps this as `A-` until a review candidate proves trust/scope confirmation, method choice, closeout, and no sensitive-value storage.
4. `Naver Search Advisor site readiness`: the Korean-first scenario is now in `/content-flows` review with regression coverage for access-method selection, crawl/indexing/ranking separation, `ask developer/host admin`, and no verification-value storage. The generic `site-search-console-setup-precheck` remains a `B+` docs umbrella.

## Product Rules To Carry Forward

- External ecosystem analysis starts from a user moment, not a platform feature list.
- Destination platforms are export targets before they are integrations.
- Export destination is selected by artifact job: date, row, memo, checklist state, or task project.
- Competitors are used to clarify what FlowMe should not become.
- API capability is not readiness; [Integration Readiness Gate](../flow-rules/integration-readiness-gate.md) requires repeated destination use, import friction, stable artifact schema, permission clarity, reversibility, and source/safety boundary.
- No candidate should be called validated without real user behavior evidence.

## FLOW Quality Note

- User need: decide which external sources, platforms, and competitors deserve FlowMe attention without overbuilding.
- Destination: roadmap memo and future candidate-review gate.
- Rubric low points: execution clarity can decay if each future review does not include a concrete artifact preview.
- Key decisions: keep Stage 0 export-first; only Google Calendar direct save and Google Sheets direct append are plausible Stage 1 light-integration candidates after export friction is proven.
- Tests: document link verification only.

## 2026-06-09 Integration Rule Pass

The `integration-readiness-gate` row is now encoded as [Integration Readiness Gate](../flow-rules/integration-readiness-gate.md). It remains an `A` roadmap rule, not a feature. The compression table should continue to treat Calendar direct save and Sheets direct append as Stage 1 light-integration candidates only after export friction is proven, while Notion, Todoist, Zapier, and Make stay future platform work.

## 2026-06-09 Dorm Promotion Gate Pass

The `Dorm move-in preparation` row now has a public-promotion gate: [Dorm Move-In Public Promotion Gate](./2026-06-09-dorm-move-in-public-promotion-gate.md). It remains the strongest next review candidate, but public promotion is deferred until one current primary dorm source is selected, latest-notice-first behavior is visible, source URL/caution/completion criteria travel with export, mobile stays artifact-first, and sensitive health/payment/room/student data stay outside FlowMe.

## 2026-06-09 Elementary Public Route Evidence Gate Pass

The `Elementary school entry preparation` row now has a public-route evidence gate: [Elementary Entry Public Route Evidence Gate](./2026-06-09-elementary-entry-public-route-evidence-gate.md). Unlike dorm move-in, this candidate already has `/f/elementary-school-entry-d30`, so the gate is about keeping the route public without overclaiming it. The route must remain official-notice-first, keep parent checklist cues secondary, preserve the D-14 hold state for school-specific supplies, carry source/caution/completion criteria into exports, and avoid child resident numbers, notice images, health records, support-payment details, teacher/class screenshots, shopping affiliate behavior, or school/Government24 integrations.
