# 2026-06-08 Platform API Readiness Matrix

Purpose: advance Phase 4 of the external ecosystem roadmap by deciding which future integrations are plausible after Stage 0 export behavior is proven, and which should remain future platform work or reject-for-now.

Status: API/platform readiness comparison, not implementation approval.

HTML view: [2026-06-08 Platform API Readiness Matrix 한국어 HTML](./2026-06-08-platform-api-readiness-matrix-ko.html)

## Decision Summary

Do not build account integrations yet.

FlowMe should keep Stage 0 on portable artifacts and use API readiness only as a future routing layer:

- `stage0_export_only`: default for all destinations until repeated export behavior is proven.
- `stage1_light_integration`: only after a destination has clear repeat use and import friction.
- `future_platform`: useful but too much OAuth, workspace, automation, or product-surface cost today.
- `reject_for_now`: integration would push FlowMe into credential handling, account management, automation building, or platform cloning before evidence exists.

## Official Source Snapshot

Checked on 2026-06-08.

| Platform/API | Official source | API cue | FlowMe reading |
|---|---|---|---|
| Google Calendar API | [Events: insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Create events](https://developers.google.com/workspace/calendar/api/guides/create-events) | creates events through `POST /calendars/{calendarId}/events`; requires authorization scopes such as calendar or calendar events | plausible Stage 1 after `.ics` import friction is proven, but OAuth/calendar-write permission is too heavy for Stage 0 |
| Google Sheets API | [spreadsheets.values.append](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append) | appends rows to a spreadsheet and requires spreadsheet ID, range, value input option, and OAuth scopes such as Drive/Sheets | plausible Stage 1 for repeated sheet-first Flows after CSV/XLSX export is proven |
| Notion API | [Notion API overview](https://developers.notion.com/guides/get-started/overview), [Create a page](https://developers.notion.com/reference/post-page) | integrations can manage pages/databases/data sources; public connections use OAuth 2.0; page creation needs Insert Content capability | keep as `future_platform`; Notion-ready Markdown/CSV should come first |
| Todoist API | [Todoist API](https://developer.todoist.com/api/v1/) | creates tasks, due dates, deadlines, projects, reminders, and OAuth tokens; due dates and deadlines have separate behavior | keep as `future_platform` until task-manager export demand is proven; CSV import is enough for now |
| Zapier Platform | [Zapier Authentication](https://docs.zapier.com/integrations/build/auth), [OAuth v2](https://docs.zapier.com/platform/build/oauth) | private-data integrations require authentication; OAuth v2 is preferred; app connections persist until revoked/expired | future automation layer, not Stage 0; useful only after FlowMe has stable trigger/action semantics |
| Make Webhooks/API | [Make Webhooks](https://help.make.com/webhooks), [Make hooks API](https://developers.make.com/api-documentation/api-reference/hooks) | custom webhooks create URLs, queue incoming data, process immediately or on schedule, and can reject/rate-limit requests | future automation layer; should not be introduced before FlowMe knows what event payloads should be |

## Readiness Gates

An integration can move from `stage0_export_only` to `stage1_light_integration` only if all gates are met.

| Gate | Evidence required | Why it matters |
|---|---|---|
| Repeated destination use | Users repeatedly choose the same external tool for the same artifact type | avoids integrating a destination that only sounds useful |
| Import friction | Users fail or slow down because file/copy import is the bottleneck | proves API write access solves a real problem |
| Stable artifact schema | Calendar event fields, sheet columns, or task fields are stable across candidates | prevents writing unstable or generic data into user accounts |
| Permission clarity | User can understand exactly what account access FlowMe requests | avoids surprise OAuth/write permissions |
| Reversibility | User can find, edit, or delete what FlowMe created in the destination | prevents hidden state and support burden |
| Source/safety boundary | Source URL, caution, and completion criteria travel with the integrated artifact | keeps FlowMe source-bound, not generic automation |

## Readiness Matrix

| Destination | Current Stage 0 behavior | API possibility | Decision state | Open only when |
|---|---|---|---|---|
| Google Calendar | `.ics` or Google Calendar CSV export | create events with Calendar API | `stage1_light_integration` candidate | users repeatedly import `.ics` and ask for direct save |
| Apple Calendar | `.ics` handoff | no broad server-side account integration in this roadmap | `stage0_export_only` | keep `.ics`; do not pursue native/mobile integration now |
| Google Sheets | CSV/XLSX-ready row export | append rows with Sheets API | `stage1_light_integration` candidate | row schemas stabilize and users repeatedly append to the same sheet |
| Notion | Markdown/CSV workspace handoff | create pages/databases with Notion API | `future_platform` | Notion becomes a dominant user destination and page/database schema is stable |
| Todoist | Todoist-compatible CSV only for task-first Flows | create tasks/projects/reminders through Todoist API | `future_platform` | task-manager demand is proven and FlowMe can avoid becoming a task inbox |
| Zapier | no automation, only export/copy | build app triggers/actions with authenticated connections | `future_platform` | FlowMe has stable event types and users want cross-app automation |
| Make | no automation, only export/copy | webhook/scenario integration | `future_platform` | FlowMe has stable payloads and webhook replay/error handling is worth supporting |

## Integration Do-Not-Build List

Do not build now:

- OAuth/account connection for export destinations;
- persistent calendar/sheet/task/workspace sync;
- generic task inbox;
- recurring-task engine beyond generated calendar/task artifacts;
- Notion-like workspace/database builder;
- spreadsheet editor or formula layer;
- Zapier/Make action builder;
- webhook endpoint for arbitrary Flow events;
- token, refresh token, API key, spreadsheet ID, Notion page ID, Todoist project ID, webhook URL, or automation credential storage in Stage 0.

## Conversion Decision

Product rule: [`integration-readiness-gate`](../flow-rules/integration-readiness-gate.md).

- User need: As a FlowMe product owner, I need to know when an export destination deserves direct integration, so that FlowMe reduces proven friction without becoming a clone or automation platform.
- Content shape: official API/authentication/platform documentation.
- Primary destination: `memo`.
- Structure: decision matrix.
- Action count: 6 readiness gates.
- Playbook: platform/API readiness.
- Exceptions: Google Calendar and Google Sheets may become Stage 1 before Notion/Todoist/Zapier/Make because their destination schemas are narrower.
- Risk/source handling: API capability, user permission, and product boundary decisions stay separate.

## Product Decision

- A/B/C: `A` as a roadmap rule, not a feature.
- Why: it prevents premature integration work while preserving a clear path once export behavior proves value.
- Next action: use [Integration Readiness Gate](../flow-rules/integration-readiness-gate.md) in future candidate reviews when a destination is proposed as more than copy/export.
- Do not build:
  - any direct integration in the current Stage 0 batch;
  - OAuth or token storage;
  - automation triggers/actions;
  - account-level sync.

## Phase 5 Compression

| Candidate | Source | User Moment | Natural Artifact | Anchor | Stage 0 Behavior | Decision |
|---|---|---|---|---|---|---|
| Calendar direct save | Google Calendar API | User repeatedly imports dated Flow events | calendar event | date/time | export `.ics`, measure friction | `stage1_light_integration` candidate |
| Sheet direct append | Google Sheets API | User repeatedly appends Flow rows to a sheet | sheet row table | sheet/range later | export CSV/XLSX, measure friction | `stage1_light_integration` candidate |
| Notion page/database creation | Notion API | User wants Flow notes/rows in a workspace | Markdown/CSV handoff | workspace/page later | export Markdown/CSV | `future_platform` |
| Todoist task creation | Todoist API | User wants Flow tasks in task manager | Todoist CSV | project later | export CSV | `future_platform` |
| Zapier/Make automation | Zapier/Make docs | User wants Flow events to trigger app actions | webhook/action payload | event type later | no automation yet | `future_platform` |

## Rubric Summary

- User Need Fit: 5
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: execution clarity. The readiness gates should be attached to future candidate notes so "integration" requests are judged against evidence, not platform desirability.

## 2026-06-09 Product Rule Pass

`integration-readiness-gate` is now carried forward as a reusable product rule, not as a public route, `/content-flows` candidate, or integration.

What changed:

- Added [Integration Readiness Gate](../flow-rules/integration-readiness-gate.md).
- The rule keeps `stage0_export_only` as the default until all six gates are proven: repeated destination use, import friction, stable artifact schema, permission clarity, reversibility, and source/safety boundary transfer.
- The rule keeps Google Calendar direct save and Google Sheets direct append as Stage 1 light-integration candidates only after evidence.
- The rule keeps Notion, Todoist, Zapier, and Make as future platform work.

Current product stance:

- Product rule: yes.
- Public route: no.
- `/content-flows` review candidate: no.
- OAuth/account connection, persistent sync, token storage, webhook endpoint, automation builder, workspace builder, task inbox, calendar clone, or spreadsheet editor: no.
