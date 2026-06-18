# FlowMe External Ecosystem Analysis Room Index

**Created:** 2026-06-09  
**Updated:** 2026-06-11  
**Status:** analysis-room entrypoint, internal document guide, current execution queue  
**HTML view:** [External Ecosystem Analysis Room Index Korean HTML](./2026-06-09-external-ecosystem-analysis-room-index-ko.html)

This document is the fixed entrypoint for analyzing apps, services, platforms, and competing services connected to FlowMe. It is not a market report or validation artifact. It keeps the work anchored to user execution moments, natural output destinations, Stage 0 behavior, product boundaries, and evidence gates.

## Current Active Axis

- Axis: `distribution-channel-handoff`
- Candidate: `school-or-dorm-prep-share-packet`
- Active packet version: `school-dorm-share-packet-v2-2026-06-11-readable-preview`
- Current decision: `no signal`
- Real recipient sessions recorded: `0 / 3`
- Current phase: Phase 5 / Stage 0, first external observation preparation

## Current Execution Order

Do not start from integration, public routes, or another planning document. Start here:

1. Open the [distribution-channel current-state handoff](./2026-06-11-distribution-channel-handoff-current-state-handoff-ko.html).
2. Open the [distribution-channel HTML hub run sequence](./2026-06-11-distribution-channel-handoff-html-hub-ko.html#run-sequence).
3. Send the [recruiting copy](./2026-06-11-school-dorm-share-packet-recruiting-copy-ko.html) as a 15-minute comprehension check.
4. Update only the matching role-labeled slot in the [scheduling tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker-ko.html#snippets) to `invited`.
5. Move a slot to `agreed` only after a reply confirms participation.
6. Before any session, confirm the [version lock](./2026-06-11-school-dorm-share-packet-version-lock-ko.html), [response coding guide](./2026-06-11-school-dorm-share-packet-response-coding-guide-ko.html), and [preflight checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist-ko.html).
7. Run observation only for `agreed` slots using the [observation-day quick start](./2026-06-11-school-dorm-share-packet-observation-day-quick-start-ko.html) and [pilot worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet-ko.html).
8. Record completed usable sessions in the [session log starter](./2026-06-10-school-dorm-share-packet-session-log-starter-ko.html).
9. Fill the [rollup template](./2026-06-11-school-dorm-share-packet-rollup-template-ko.html) only after 3 completed usable sessions.
10. Change the evidence board only through the [evidence board update runbook](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook-ko.html).

Scheduling states such as `not invited`, `invited`, `agreed`, `scheduled`, and `not run` are not observation evidence. A blank worksheet, blank log, or blank rollup is also not evidence.

## Read First

0. [CEO brief](./2026-06-12-external-ecosystem-ceo-brief-ko.html)
   - Use for the shortest executive view: what is complete, what decision is being made, and what external evidence is needed next.
1. [Executive evidence appendix](./2026-06-12-external-ecosystem-executive-evidence-appendix-ko.html)
   - Use for the CEO/exec supporting-document map: which docs prove which decision, which docs are operational only, and which screenshots anchor platform comparisons.
2. [Goal completion report](./2026-06-11-external-ecosystem-goal-completion-report-ko.html)
   - Use for the longer status view of what the analysis-room goal has satisfied, what remains as follow-up pilot work, and which artifacts to open next.
3. [External ecosystem roadmap visual](./2026-06-09-external-ecosystem-roadmap-visual-ko.html)
   - Use for the overall analysis loop and product-boundary model.
4. [Connected internal docs visual hub](./2026-06-09-external-ecosystem-connected-docs-visual-ko.html)
   - Use for document-by-document navigation across the analysis room.
5. [HTML coverage audit](./2026-06-11-external-ecosystem-html-coverage-audit-ko.html)
   - Use to confirm which Markdown handoffs have Korean HTML views.
6. [Phase 5 compression table](./2026-06-08-external-ecosystem-phase5-compression-table-ko.html)
   - Use as the current decision gate for candidate priority.
7. [Export Destination Fit](../flow-rules/export-destination-fit-ko.html)
   - Use before destination or integration discussions.
8. [Integration Readiness Gate](../flow-rules/integration-readiness-gate-ko.html)
   - Use only after export behavior produces evidence.

## Product Boundary

Do not build or claim readiness for:

- KakaoTalk Message API, friend targeting, or group targeting;
- Naver Cafe posting or comment ingestion;
- Google Forms/Sheets creation or response import;
- Notion, Slack, Teams, or Discord API automation;
- OAuth, account sync, token storage, or webhook automation;
- contact storage, member lists, invite links, channel IDs, or channel analytics;
- automatic posting, reply ingestion, or private chat storage;
- `validated`, `public route ready`, `integration ready`, or `channel ready` claims.

## Candidate Queue

| Candidate | Current position | Next judgment |
|---|---|---|
| `school-or-dorm-prep-share-packet` | Active distribution-channel Stage 0 observation prep | Send invite, update tracker, wait for `agreed`, run 3 completed usable sessions, then roll up. |
| `college-dorm-move-in-checklist` | Strong source-to-Flow candidate | Do not promote further until the share-packet observation produces evidence. |
| `elementary-school-entry-d30` | A- public route candidate | Keep source-review status and avoid validation language before guardian observation. |
| `remote-help-session-precheck` | A- digital procedure route | Keep permission checklist boundaries; do not verify helpers or manage devices. |
| `naver-search-advisor-site-readiness` | A- digital setup scenario | Keep as readiness checklist; do not automate DNS, OAuth, API submission, or ranking outcomes. |
| `site-search-console-setup-precheck` | B+ document asset | Do not promote until a Korean-priority scenario is selected. |

## Verification Rule

- Documentation-only changes must pass `npm run docs:check`.
- Changed Korean HTML views should be checked in a browser or Playwright for readable Korean, local links, mobile overflow, and no mojibake.
- User-behavior claims require actual completed recipient sessions and a filled rollup.

## Current Starting Point

The current starting point is not another roadmap document. It is:

1. open the [recruiting copy](./2026-06-11-school-dorm-share-packet-recruiting-copy-ko.html);
2. send the invite outside this repository;
3. update the [scheduling tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker-ko.html#snippets) to `invited`;
4. wait for a reply before using `agreed`.
