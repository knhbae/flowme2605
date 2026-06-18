# 2026-06-08 Export Destination And Competitor Boundary

Purpose: advance Phase 2/3 of the external ecosystem roadmap by classifying major destination and competitor platforms as Stage 0 export targets, not products FlowMe should clone or integrate with too early.

Status: platform/destination comparison, not user-behavior validation.

HTML view: [2026-06-08 Export Destination And Competitor Boundary 한국어 HTML](./2026-06-08-export-destination-competitor-boundary-ko.html)

## Decision Summary

FlowMe should keep Stage 0 focused on portable artifacts:

- calendar events as `.ics` or destination-specific CSV;
- sheet rows as CSV/XLSX-ready data;
- memo or source notes as Markdown/plain text;
- checklist/task rows as Todoist-compatible CSV only when a user explicitly wants a task manager destination;
- Notion-ready Markdown/CSV only as a workspace handoff, not a workspace replacement.

Do not build account integrations yet. The near-term product question is whether the generated artifact is shaped well enough for the user's existing tool.

## Official Source Snapshot

Checked on 2026-06-08.

| Platform | Official source | Supported import cue | FlowMe reading |
|---|---|---|---|
| Google Calendar | [Import events to Google Calendar](https://support.google.com/calendar/answer/37118?hl=EN) | imports `.ics` and `.csv` on computer; CSV headers must be English; repeat events from CSV may appear as one-time events; guests/conference data are not imported | best primary destination for dated one-off events, D-day schedules, and reminders; use `.ics` first when recurrence matters |
| Apple Calendar | [Import or export calendars on Mac](https://support.apple.com/en-asia/guide/calendar/icl1023/mac) | imports events from `.ics`; exported events are `.ics`; importing a calendar archive can replace current calendar data | useful calendar destination, but FlowMe should avoid archive-level imports and prefer single-event or calendar-file handoff |
| Google Sheets | [Learn how to optimize your data ingestion](https://support.google.com/docs/answer/12236443?hl=en) | `File > Import` supports uploaded files; import can replace or append data; large CSV files may need Connected Sheets/BigQuery | best primary destination for inventory, comparison, progress, menu, and status rows |
| Notion | [Import data into Notion](https://www.notion.com/help/import-data-into-notion?assetsVersion=23.13.20251202.2151) | imports Markdown/text, CSV, HTML, PDF, ZIP, and app data on desktop/web; CSV imports create databases; CSV import adds rows and can duplicate rather than update | strong workspace competitor and memo/database destination; FlowMe should hand off clean Markdown/CSV, not become a workspace |
| Todoist | [Import or export a project as a CSV file in Todoist](https://get.todoist.help/hc/en-us/articles/208821185-Import-or-export-a-project-as-a-CSV-file-in-Todoist), [Introduction to templates in Todoist](https://get.todoist.help/hc/en-us/articles/12245056124700-Introduction-to-templates-in-Todoist) | imports project CSV with task/section/note rows, dates, language, timezone, duration, and deadline fields; CSV template upload is computer-only | useful task-manager destination for project checklists, but FlowMe should not become a generic task app |

## User Behavior

- User moment: a user converts outside content into something they can execute in the tool they already use.
- Current behavior: copy dates into a calendar, paste rows into a spreadsheet, save source notes in Notion/memo, or manually create tasks in Todoist.
- Manual breakpoints:
  - export format does not match the destination's required columns;
  - recurrence and date offsets are lost when exporting through generic CSV;
  - Notion/Sheets rows become a workspace that is too heavy for a one-time Flow;
  - Todoist turns every source step into a generic task list without source context;
  - users cannot tell whether a generated artifact is meant for calendar, sheet, memo, or internal check state.

## Destination Fit Rules

| Flow output | Best Stage 0 destination | Export shape | Use when | Avoid |
|---|---|---|---|---|
| D-day, appointment, inspection, renewal, practice session | Calendar | `.ics`; Google Calendar CSV only when needed | date/time is the primary value | building a calendar UI or syncing accounts |
| Inventory, comparison, progress, menu, status table | Sheet | CSV/XLSX-ready rows | rows and columns are the primary value | hiding the table inside a checklist |
| Source link, caution, question list, setup note | Memo/Notion | Markdown/plain text | context must travel with the artifact | turning every memo into a Notion database |
| One-time setup, packing, inspection, admin precheck | Internal checklist | FlowMe check state + copyable text | completion state matters during execution | exporting every check to a task app by default |
| Project checklist with sections and due dates | Todoist | Todoist-compatible CSV | user already uses Todoist or a task manager | making FlowMe a generic task manager |
| Workspace handoff or repeatable template | Notion | Markdown or CSV database rows | user wants a workspace archive/reference | treating Notion as the default destination for all Flows |

## Conversion Decision

Potential generic candidate: `flow-export-destination-selector`.

- User need: As a user saving a generated Flow, I need FlowMe to choose the right export shape for my existing tool, so that I can execute the plan without rebuilding dates, rows, or notes manually.
- Content shape: destination/platform import documentation plus FlowMe artifact types.
- Primary destination: `hybrid`.
- Structure: decision table.
- Action count: 4 decision rows.
- Playbook: destination/export fit.
- Exceptions: do not add account-based integrations until repeated export behavior proves where friction is highest.
- Risk/source handling: platform import facts, FlowMe artifact design, and competitor/product boundaries stay separate.

Suggested decision rows:

| Step | Decision | Completion |
|---:|---|---|
| 1 | Choose the artifact's main job | User selects date, row/table, memo/source note, or checklist state as the primary output. |
| 2 | Pick the destination-specific format | `.ics`, CSV/XLSX, Markdown/plain text, Todoist CSV, or Notion Markdown/CSV is selected. |
| 3 | Preserve source context | Source URL, warning, and completion criteria are included in the artifact description, memo, or row notes. |
| 4 | Keep integration out of scope | User receives a portable file/copy shape; account sync, OAuth, workspace automation, and platform clone features stay out. |

## Competitor Boundary

| Platform | Competitor lesson | FlowMe stance | Do not build now |
|---|---|---|---|
| Notion | Users like reusable pages, templates, and databases | make Flow artifacts Notion-ready when useful | workspace builder, page editor, database automation, Notion AI competitor |
| Todoist | Users like tasks, projects, due dates, and recurring tasks | export structured task CSV only for task-first Flows | generic task manager, task inbox, recurring-task engine |
| Google Calendar / Apple Calendar | Users already trust calendar reminders | generate correct calendar artifacts | calendar replacement, account sync, scheduling assistant |
| Google Sheets | Users use sheets for rows, inventory, and progress | generate clean sheet rows | spreadsheet editor, formula engine, live data connector |
| Zapier / Make | Automation can reduce friction later | keep as future platform layer | automation builder before export behavior is proven |

## Phase 5 Compression

| Candidate | Source | User Moment | Natural Artifact | Anchor | Stage 0 Behavior | Decision |
|---|---|---|---|---|---|---|
| Calendar export destination | Google Calendar Help, Apple Calendar Support | User needs dated Flow items in their calendar | `.ics` or calendar CSV | date/time | export, import, check event | `stage0_export_only` |
| Sheet export destination | Google Docs Editors Help | User needs rows for inventory, progress, comparison, or menu | CSV/XLSX-ready table | none or week/date | export rows, import/append | `stage0_export_only` |
| Notion workspace handoff | Notion Help | User wants source notes or rows in a workspace | Markdown or CSV database | none | copy/import, keep source note | `stage0_export_only` destination and competitor |
| Todoist task handoff | Todoist Help | User wants a project checklist in their task manager | Todoist CSV | due dates optional | export/import project CSV | `stage0_export_only` destination and competitor |
| Flow export destination selector | Cross-platform import docs | User wants to save a Flow without rebuilding it manually | hybrid decision table | artifact type | choose, export, feedback | `A-` product rule candidate |

## Product Decision

- A/B/C: `A-` for product rule, not public route.
- Why: the decision directly affects every source-to-Flow candidate and keeps the Stage 0 product from drifting into workspace, task, calendar, or spreadsheet clones.
- Next action: encoded as [Export Destination Fit Rules](../flow-rules/export-destination-fit.md) so future candidate reviews can apply the selector before adding integrations.
- Do not build:
  - Notion, Todoist, Google Calendar, Apple Calendar, or Google Sheets account integration;
  - OAuth/account connection;
  - recurring-task or full calendar engine;
  - spreadsheet editor/formula layer;
  - Notion-like workspace builder;
  - Zapier/Make-style automation.

## Rubric Summary

- User Need Fit: 5
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: execution clarity. Each individual Flow still needs a destination-specific export preview so users can see whether they are saving a calendar event, sheet row, memo, or checklist.

## 2026-06-09 Product Rule Pass

`flow-export-destination-selector` is now carried forward as a reusable product rule, not as a public route or `/content-flows` candidate.

What changed:

- Added [Export Destination Fit Rules](../flow-rules/export-destination-fit.md).
- The rule chooses destination by artifact job: date, row, memo, checklist state, or task project.
- The rule keeps source URL, caution, and completion criteria attached to the export shape.
- The rule explicitly separates export destination fit from integration readiness.

Current product stance:

- Product rule: yes.
- Public route: no.
- `/content-flows` review candidate: no.
- OAuth/account integration, persistent sync, workspace builder, task inbox, spreadsheet editor, or automation builder: no.
