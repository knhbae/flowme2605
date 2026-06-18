# 2026-06-08 External Ecosystem Analysis Roadmap

Purpose: turn this chat room into a repeatable FlowMe analysis loop for connected apps, services, platforms, content sources, and competitors.

This is not market research for its own sake. Each analysis must end with a FlowMe decision: promote a source-to-Flow experiment, keep a platform as an export target, record a competitor lesson, or reject a direction as overbuild.

HTML view: [External Ecosystem Analysis Roadmap Korean HTML](./2026-06-08-external-ecosystem-analysis-roadmap-ko.html)

Visual summary: [External Ecosystem Roadmap Visual Korean HTML](./2026-06-09-external-ecosystem-roadmap-visual-ko.html)

## Operating Rule

Analyze one user moment at a time.

```text
User moment
-> source/service/platform used today
-> natural execution artifact
-> FlowMe Stage 0 behavior
-> A/B/C product decision
```

Do not start with a feature list. Start with what the user is trying to execute after reading, watching, or saving outside content.

## Phase Roadmap

### Phase 1: Content Source Map

Goal: find Korean-first original content that can become a lightweight Flow artifact.

Primary sources:

- Naver Blog and Tistory posts with actual checklists, timelines, routines, tables, or setup steps.
- YouTube videos or playlists with follow-along, preparation, practice, recipe, or setup structure.
- Official pages and PDFs with dates, required documents, appointment windows, or eligibility boundaries.
- Creator PDFs, templates, and downloadable files where FlowMe preserves the source link instead of copying the original asset.

Output target:

- 10 A/B/C source leads.
- 5 conversion decisions.
- 3 Stage 0 experiment candidates.

### Phase 2: Export Destination Map

Goal: decide where FlowMe results should naturally go before building integrations.

Destinations:

- Calendar: date, repeat, appointment, D-day, inspection, renewal, practice.
- Sheet: inventory, comparison, progress, menu, study rows, status table.
- Memo: source link, caution, question list, preparation note.
- Internal checklist: one-time setup, packing, inspection, admin precheck.
- Hybrid: calendar plus sheet or memo when dates and rows both matter.

Stage 0 stance:

- Prefer copy, CSV/XLSX, memo text, and lightweight calendar export before account-based integrations.
- Treat Google Calendar, Google Sheets, Notion, KakaoTalk, Todoist, and Apple Calendar as export destinations first, not product surfaces to clone.

### Phase 3: Competitor And Adjacent Service Map

Goal: decide what FlowMe should not become.

Services to analyze:

- Notion: strong template/workspace competitor, but FlowMe should win before the workspace by converting outside content into a ready artifact.
- Todoist/Things/TickTick: task-management competitors, but FlowMe should avoid becoming a generic todo app.
- Google Calendar/Apple Calendar: destination, not direct replacement.
- ChatGPT/Perplexity: generation and research references, but FlowMe must provide source-bound execution artifacts, not generic summaries.
- Zapier/Make: later automation layer, not Stage 0.

### Phase 4: Platform And API Readiness

Goal: classify future integrations without building them too early.

Decision states:

- `stage0_export_only`: copy/export is enough for current validation.
- `stage1_light_integration`: integration may reduce friction after export behavior is proven.
- `future_platform`: useful but too heavy before real user behavior data.
- `reject_for_now`: account, privacy, permission, or complexity cost is too high.

### Phase 5: Experiment Compression

Every analysis batch ends in this table:

| Candidate | Source | User Moment | Natural Artifact | Anchor | Stage 0 Behavior | Decision |
|---|---|---|---|---|---|---|
| Example | Source URL | What the user is trying to execute | calendar/sheet/memo/checklist | start date / target date / repeat / none | open, anchor, copy/export, check, feedback | A/B/C |

## Analysis Template

Use this template for every service, platform, or content source.

```md
## Target

- Name:
- Type: content source / export destination / competitor / connected platform / distribution channel
- Source freshness:

## User Behavior

- What the user is trying to do:
- What they currently create or save:
- What breaks or stays manual:

## FlowMe Fit

- Input FlowMe can take:
- Output FlowMe can produce:
- Natural artifact: calendar / sheet / memo / internal checklist / hybrid
- Minimum anchor:
- Stage 0 behavior: open / anchor input / copy-export / check / feedback

## Conversion Decision

- User need:
- Content shape:
- Primary destination:
- Structure:
- Action count:
- Playbook:
- Exceptions:
- Risk/source handling:

## Product Decision

- A/B/C:
- Why:
- Next action:
- Do not build:
```

## Phase 1 First Batch

Checked on 2026-06-08. Items marked `checked` were opened or source text was visible enough to make an initial FlowMe decision. Items marked `lead` need a manual source read before promotion.

| Priority | Candidate | Source Status | User Moment | Natural Artifact | Initial Decision |
|---|---|---|---|---|---|
| A | Elementary school entry preparation | checked: AjinHub 2026 checklist source | Parent prepares school supplies, labels, and first-week readiness | D-30 checklist + memo | Promote as Phase 1 candidate because the source has concrete checklist rows and minimal anchor needs. |
| A | Dorm move-in preparation | checked: school/university PDFs | Student prepares documents, move-in date, items, and restricted items | D-day checklist + packing memo | Promote because it expands the life-transition axis beyond moving/wedding. |
| A | AnyDesk remote-support setup | checked: 2026 setup article | User installs remote tool, finds ID, sets access rule, and avoids unsafe credential sharing | setup checklist | Promote cautiously; must avoid storing passwords or auth values. |
| B | Fridge cleanout / pantry challenge | checked: weekly task article | Household turns existing ingredients into a weekly plan | inventory sheet + 7-day memo | Useful, but avoid savings guarantees and diet/nutrition claims. |
| B | University MT preparation | lead: Naver Blog search result | Participant or organizer splits personal packing and shared roles | role checklist + memo | Keep as lead; useful for group-role Flow, but source quality needs manual check. |
| B | Creator PDF or printable kids activity | lead: existing queue source leads | Parent prints template, prepares materials, runs one activity | source link + one-day checklist | Keep as high-value creator-material axis; must preserve original template link. |
| B | Weekly elementary English word practice | lead: existing queue source leads | Parent uses downloadable material as a weekly routine | weekly routine + file memo | Keep as study/family axis; promote only if source rows are visible. |
| C | Generic travel packing checklist | lead | Traveler packs for trip | checklist | Avoid as next priority unless source interaction is unusually strong; existing travel examples already cover the pattern. |
| C | Generic appliance cleaning routine | lead | Owner schedules cleaning | repeat calendar | Avoid for this batch because the current review set already has strong appliance maintenance examples. |
| C | Broad AI summary of a topic | reject unless exact source rows exist | User asks for "make me a plan" from broad advice | unclear | Reject for Phase 1; FlowMe needs source-bound execution, not generic summary output. |

## Initial Conversion Decisions

### 1. Elementary School Entry Preparation

Conversion decision:

- User need: As a parent of an incoming first grader, I need a short preparation checklist before school starts, so that I can buy only necessary items, label them, and avoid missing first-week basics.
- Content shape: blog checklist and practical preparation guide.
- Primary destination: `internal_check`.
- Structure: `checklist`.
- Action count: 6-8 rows.
- Playbook: source-specific checklist.
- Exceptions: avoid turning school adaptation into a long parent-coaching program; keep school notice confirmation as a first row.
- Risk/source handling: treat the blog as practical guidance, not official school policy. Add a memo cue to check the actual school notice.

Stage 0 behavior:

- open: public Flow preview.
- anchor input: school start date.
- copy/export: checklist or memo copy.
- check: item-level completion.
- feedback: missing supply / school-specific difference.

### 2. Dorm Move-In Preparation

Conversion decision:

- User need: As a student moving into a dorm, I need move-in date, required documents, allowed items, and banned items in one checklist, so that I can arrive without missing admission requirements.
- Content shape: official school/university move-in PDF.
- Primary destination: `hybrid`.
- Structure: `timeline`.
- Action count: 5-7 rows.
- Playbook: moving/admin timeline.
- Exceptions: keep health/document requirements source-specific; do not generalize one school's rule to all dorms.
- Risk/source handling: official source facts stay in memo, and user-specific health or document details are not stored by default.

Stage 0 behavior:

- anchor input: move-in date.
- copy/export: calendar D-7/D-1/D-day reminders plus packing memo.
- check: required document / packing / banned item checks.

### 3. AnyDesk Remote-Support Setup

Conversion decision:

- User need: As a user preparing remote support, I need installation, ID confirmation, connection approval, and closeout steps, so that I can receive help without leaving sensitive access unmanaged.
- Content shape: step-by-step setup article.
- Primary destination: `internal_check`.
- Structure: `checklist`.
- Action count: 5-6 rows.
- Playbook: source-specific setup checklist.
- Exceptions: do not store passwords, workstation IDs, or auth values in FlowMe.
- Risk/source handling: separate source setup steps from security caution; completion is "connection ended and access reviewed," not "remote support solved."

Stage 0 behavior:

- copy/export: setup checklist copy.
- check: install, ID confirm, approval, session close.
- feedback: unclear step / security concern.

### 4. Fridge Cleanout Weekly Plan

Conversion decision:

- User need: As a household trying to reduce waste, I need a one-week fridge inventory and meal-use plan, so that I can use what I already have before buying more.
- Content shape: weekly strategy article with example weekday tasks.
- Primary destination: `sheet`.
- Structure: `checklist` with table rows.
- Action count: row-based weekly plan.
- Playbook: table/menu/plan rows.
- Exceptions: remove or soften savings claims; FlowMe should not promise money, diet, or nutrition outcomes.
- Risk/source handling: source article can be cited as a household strategy, not financial advice.

Stage 0 behavior:

- anchor input: week start date.
- copy/export: XLSX/CSV inventory sheet.
- check: ingredient used / hold / buy.

## Two-Week Execution Plan

### Week 1: Source Discovery And Candidate Triage

1. Search 20 Korean-first content sources across four axes: life transition, creator material, digital setup, and table/household planning.
2. Mark each source as `checked`, `lead`, `backup`, or `reject`.
3. Pick 5 candidates with distinct user moments and artifact shapes.
4. Write conversion decisions for the top 5.
5. Choose 3 Stage 0 experiment candidates.

### Week 2: Destination And Export Fit

1. For the 3 candidates, define the exact export destination: calendar, sheet, memo, checklist, or hybrid.
2. Draft sample exported rows or memo text.
3. Compare against Notion, Google Calendar, Google Sheets, and Todoist only as destination/competitor references.
4. Decide whether each candidate should enter `/content-flows`, stay in `docs/content-audit/`, or remain a search lead.

## Current Recommendation

Start with these three:

1. Dorm move-in preparation: strongest new life-transition moment and clean official-source boundary.
2. Elementary school entry preparation: strong parent need and checklist shape, but needs school-notice caveat.
3. AnyDesk remote-support setup: useful digital setup axis, with a clear "do not store secrets" product boundary.

Hold fridge cleanout as a sheet-first backup. It is useful, but FlowMe must avoid presenting savings or diet outcomes as guaranteed.

## Follow-Up Analysis Notes

- 2026-06-09: The search-console/webmaster setup candidate was tightened into a docs-only gate after re-checking official Google Search Console, Naver Search Advisor, and Bing Webmaster Tools docs. Result: keep `site-search-console-setup-precheck` as `B+` until a specific Korean-first scenario is selected; the first action must be site-unit/access-method selection, the artifact must distinguish verification/crawl/indexing/ranking, and FlowMe must not store tokens, DNS records, HTML tag contents, OAuth grants, API keys, credentials, or sitemap files. Handoff: [2026-06-09 Search Console Setup Precheck Gate](./2026-06-09-search-console-setup-precheck-gate.md).
- 2026-06-09: The search-console scenario selection pass picked `naver-search-advisor-site-readiness` as the Korean-first implementation shape. Result: keep the generic `site-search-console-setup-precheck` as a docs umbrella, but queue the Naver-first version as the next review-candidate implementation only if it starts from site unit/access-method selection, supports `ask developer/host admin`, keeps sitemap/RSS/request status separate from indexing/ranking, and stores no verification values. Handoff: [2026-06-09 Naver Search Advisor Site Readiness Scenario](./2026-06-09-naver-search-advisor-site-readiness-scenario.md).
- 2026-06-09: Implemented the Naver-first scenario as a `/content-flows` review candidate, still without a public route. `naver-search-advisor-site-readiness` now has official-source candidate data, review metadata, selection-audit metadata, and a dedicated execution preview. The preview starts with site unit/access-method selection, supports `ask developer/host admin`, separates ownership/crawl/indexing/ranking status, and keeps verification values out of FlowMe. Handoff: [2026-06-09 Naver Search Advisor Site Readiness Scenario](./2026-06-09-naver-search-advisor-site-readiness-scenario.md).
- 2026-06-09: Promoted `flow-export-destination-selector` from the compression table into a reusable product rule. [Export Destination Fit Rules](../flow-rules/export-destination-fit.md) now says each Flow chooses calendar, sheet, memo/Notion handoff, internal checklist, or Todoist/task CSV by the artifact's main job, while integration readiness remains a separate gate. This is a rule, not a public route or integration.
- 2026-06-09: Promoted `integration-readiness-gate` from the compression table into a reusable product rule. [Integration Readiness Gate](../flow-rules/integration-readiness-gate.md) now keeps Stage 0 export-only as the default until repeated destination use, import friction, stable schema, permission clarity, reversibility, and source/safety transfer are proven. Google Calendar direct save and Google Sheets direct append stay Stage 1 light-integration candidates only after evidence; Notion, Todoist, Zapier, and Make remain future platform work.
- 2026-06-09: Added a public-promotion gate for `college-dorm-move-in-checklist`, the strongest current Phase 5 review candidate. [Dorm Move-In Public Promotion Gate](./2026-06-09-dorm-move-in-public-promotion-gate.md) keeps the candidate in `/content-flows` review until one current primary source is selected, latest-notice-first behavior is visible, source URL/caution/completion criteria travel with export, mobile stays artifact-first, and sensitive health/payment/room/student data stay outside FlowMe.
- 2026-06-09: Added a public-route evidence gate for `elementary-school-entry-d30`, the Phase 5 `A-` candidate that already has `/f/elementary-school-entry-d30`. [Elementary Entry Public Route Evidence Gate](./2026-06-09-elementary-entry-public-route-evidence-gate.md) keeps the route public only as source-review until observed parent sessions prove that users understand the first card as official 취학통지/예비소집 confirmation, use D-14 as a school-specific hold state, and do not treat parent checklist price/purchase cues as official universal requirements.
- 2026-06-09: The generic remote-help precheck was tightened into a route gate after re-checking official AnyDesk, TeamViewer, Chrome Remote Desktop, Zoom, and Microsoft Quick Assist docs. Result: keep `anydesk-remote-setup-check` conditional in `/content-flows`, and only create `remote-help-session-precheck` as a separate review candidate if the artifact starts with trust/scope confirmation, asks the permission-method question before vendor setup, keeps closeout in the primary checklist, and stores no codes, IDs, passwords, links, tokens, screenshots, chats, or device lists. Handoff: [2026-06-09 Remote Help Session Precheck Gate](./2026-06-09-remote-help-session-precheck-gate.md).
- 2026-06-08: Remote-support adjacent services were compared across AnyDesk, TeamViewer, Chrome Remote Desktop, Zoom, and Microsoft Quick Assist. Result: keep AnyDesk in `/content-flows` review, but frame the stronger future candidate as a generic remote-help precheck that chooses screen share only, one-time remote control, or repeated/unattended management. Handoff: [2026-06-08 Remote Support Adjacent Service Comparison](./2026-06-08-remote-support-adjacent-service-comparison.md).
- 2026-06-08: Search-console and webmaster setup was added as a second digital setup axis outside remote support. Result: keep `site-search-console-setup-precheck` as a docs-level Stage 0 candidate; do not build platform integrations, OAuth import, DNS automation, sitemap generation, ranking promises, or token storage. Handoff: [2026-06-08 Search Console Digital Setup Comparison](./2026-06-08-search-console-digital-setup-comparison.md).
- 2026-06-08: Export destinations and competitor boundaries were compared across Google Calendar, Apple Calendar, Google Sheets, Notion, and Todoist. Result: keep `flow-export-destination-selector` as an `A-` product rule candidate; use `.ics`, CSV/XLSX-ready rows, Markdown/plain text, Todoist CSV, or Notion Markdown/CSV before building integrations. Handoff: [2026-06-08 Export Destination And Competitor Boundary](./2026-06-08-export-destination-competitor-boundary.md).
- 2026-06-08: Platform/API readiness was compared across Google Calendar API, Google Sheets API, Notion API, Todoist API, Zapier, and Make. Result: keep `integration-readiness-gate` as an `A` roadmap rule; only Google Calendar direct save and Google Sheets direct append are plausible Stage 1 candidates after repeated export friction is proven. Handoff: [2026-06-08 Platform API Readiness Matrix](./2026-06-08-platform-api-readiness-matrix.md).
- 2026-06-08: Phase 5 compression now combines the content candidates, export destinations, competitor boundaries, and API readiness decisions into one product gate. Result: keep dorm move-in as the strongest next review candidate, keep elementary entry and remote-help precheck as `A-` candidates, keep search-console setup as a `B+` docs candidate, and treat integration readiness as a roadmap rule rather than a feature. Handoff: [2026-06-08 External Ecosystem Phase 5 Compression Table](./2026-06-08-external-ecosystem-phase5-compression-table.md).

## Source Snapshot

- AjinHub, "초등학교 입학 준비물 체크리스트: 예비 학부모를 위한 실용 가이드", opened 2026-06-08: `https://www.ajinhub.com/post/parenting-elementary-checklist-guide`
- 강원컴퓨터 PC 해결 이야기, "원격 제어 프로그램 애니데스크(AnyDesk) 다운로드 및 설치 방법", opened 2026-06-08: `https://gwinfo.tistory.com/696`
- 부영여고, "안심학숙(기숙사) 입사 안내" PDF, opened 2026-06-08: `https://buyeong.hs.jne.kr/data/attach_data/yeosu/buyeong_hs/k2board/na/bbs_50102/ntt_1800492702/doc_2356va18a%3D92v82%3D46v3d%3D86v9c%3D25ffv0267vfb8b_v5427.pdf`
- 성균관대학교 기숙사, "기숙사 입사 준비물" PDF, opened 2026-06-08: `https://dorm.skku.edu/_custom/skku/_common/board/download.jsp?article_no=61864&attach_no=5517`
- info-srch-blog, "식비 절약 실전법: 냉장고 파먹기 챌린지로 한 달 20% 줄이기", opened 2026-06-08: `https://info-srch.com/64`
- Naver Blog search results were treated as source leads only when direct page text was not accessible through automated browsing.
