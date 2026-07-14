# Export Destination Fit Rules

Use this rule when a Flow needs to leave FlowMe as a calendar event, sheet row, memo, workspace note, or task-manager project.

This is a Stage 0 product rule. It does not approve account integrations, OAuth, sync, automation, or platform cloning.

HTML view: [Export Destination Fit Rules 한국어 HTML](./export-destination-fit-ko.html)

## Core Decision

Choose the destination by the artifact's main job, not by the platform the user mentions first.

| Main job | Default destination | Stage 0 shape | Use when | Do not build |
|---|---|---|---|---|
| Dated reminder, D-day item, appointment, inspection, renewal, practice session | Calendar | `.ics`; Google Calendar CSV only when needed | date/time is the primary value | calendar clone, account sync, scheduling assistant |
| Inventory, comparison, progress, menu, status, filter cycle, study rows | Sheet | CSV/XLSX-ready rows | rows and columns are the primary value | spreadsheet editor, formula engine, live connector |
| Source link, caution, setup note, question list, context that must travel | Memo or Notion handoff | Markdown/plain text; Notion Markdown/CSV only when workspace handoff is explicit | context is more important than completion state | Notion clone, workspace builder, database automation |
| One-time setup, packing, inspection, admin precheck, source safety gate | Internal checklist | FlowMe check state plus copyable text | completion state matters while executing | exporting every check to a task app by default |
| Task-manager project with sections and due dates | Todoist/task CSV | Todoist-compatible CSV | user already uses a task manager and the Flow is task-first | task inbox, recurring-task engine, Todoist integration |

## Selector Flow

Before showing an export button or future integration option, answer these in order:

1. What is the artifact's main job: date, row, memo, checklist, or task project?
2. What is the minimum outside shape that can carry it: `.ics`, CSV/XLSX rows, Markdown/plain text, Todoist CSV, or Notion Markdown/CSV?
3. What source context must travel with it: source URL, caution, completion criteria, stop/hold condition, or official boundary?
4. What should remain inside FlowMe: local check state, preview, source review, or feedback?
5. What must not be built yet: account connection, sync, automation, workspace, formula layer, or generic task engine?

## Step And Item Portability

For new canonical content, treat `Item` as the minimum independently stateful execution and projection unit. `Step` groups related Items and does not own completion state. The older Step-first export rule remains a compatibility bridge only for legacy records that already bundle one real execution moment as a Step.

- A scheduled Item may become one calendar event; an actionable Item may become one todo task, checklist row, sheet row, or progress row.
- Preserve Step title and order as section/group metadata when the destination supports grouping.
- If the destination cannot represent a Field, Memo, caution, or source relation structurally, serialize that information into the destination note/description or the explicit Memo fallback.
- Do not invent a date merely to make an Item exportable to Calendar. Unscheduled Items emit no ICS event.
- Do not split explanatory prose into Items. Only source-derived rows with independent check, decision, or record state become separate destination rows.

## Destination Rules

### Calendar

Use calendar when date/time is the primary value.

Use `.ics` by default, especially for D-day schedules and repeated events. Google Calendar CSV is acceptable only when the destination specifically needs CSV rows and recurrence is not the main value.

Calendar export copy must include:

- event title;
- date/time or all-day date;
- source URL or source label;
- completion criterion;
- caution or hold condition when relevant.

Do not call calendar export "validated" until a user imports it and confirms the event exists in their own calendar.

### Sheet

Use sheet when rows and columns are the primary value.

CSV/XLSX-ready rows should include stable columns before any integration is considered. Good sheet candidates include inventory, comparison, progress, menu, document status, filter cycle, and study tracker Flows.

Sheet export copy must include:

- row title or item;
- status;
- date or cycle when relevant;
- source/caution column when the source boundary matters;
- editable memo column.

Do not hide a naturally row-based artifact inside a long checklist.

### Memo And Notion Handoff

Use memo when context must travel but rows or dates are secondary.

Notion is a workspace destination, not the default FlowMe surface. Use Notion-ready Markdown or CSV only when the user explicitly wants source notes or rows in a workspace.

Memo export must include:

- source link;
- what the user decided;
- next action;
- caution or source boundary;
- what FlowMe did not verify.

Do not turn every memo into a Notion database.

### Internal Checklist

Use internal checklist when execution state matters more than outside file shape.

The user may still copy checklist text, but FlowMe remains the primary execution surface until there is evidence that the user wants the checklist inside a task manager.

Internal checklist copy must include:

- first action;
- completion criteria;
- source boundary;
- stop/hold condition;
- optional outside note.

### Todoist Or Task CSV

Use Todoist/task CSV only when the Flow is task-first and the user already wants a task manager destination.

Todoist-compatible rows should preserve sections, task titles, due dates when useful, and notes with source context. Do not convert every Flow into a generic task project.

## Integration Gate

Export destination fit is not integration readiness.

Move from Stage 0 export-only to Stage 1 light integration only when all are proven:

1. repeated destination use;
2. import friction is the bottleneck;
3. stable artifact schema;
4. permission clarity;
5. reversibility in the destination;
6. source/safety boundary travels with the created artifact.

Until then, keep:

- Google Calendar and Apple Calendar as `.ics`/CSV destinations;
- Google Sheets as CSV/XLSX-ready rows;
- Notion as Markdown/CSV handoff;
- Todoist as optional project CSV;
- Zapier/Make as future automation layers only.

## Regression Questions

Use these in future candidate reviews:

- Does the first export option match the artifact's main job?
- Would this artifact still be usable after copy/import into the destination?
- Does the source URL or caution travel with the export?
- Are calendar labels and export wording separate when readability needs differ?
- Is account sync or OAuth being proposed before repeated export friction is proven?
- Is FlowMe accidentally becoming a calendar, spreadsheet, Notion workspace, Todoist inbox, or automation builder?

## Current Source Basis

Checked on 2026-06-09:

- Google Calendar Help supports importing `.ics` and `.csv` on computer and notes CSV repeat events may become one-time events.
- Apple Calendar Support documents importing and exporting `.ics` calendar files on Mac.
- Google Docs Editors Help documents opening/importing spreadsheet formats such as CSV/XLSX in Sheets.
- Notion Help documents desktop/web import for Markdown, text, CSV, HTML, PDF, and other file/app types.
- Todoist Help documents project CSV import/export with task, section, and note row types.

These sources support Stage 0 export and handoff behavior. They do not justify account integration by themselves.
