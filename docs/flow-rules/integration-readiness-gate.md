# Integration Readiness Gate

Use this rule when a Flow destination is proposed as more than copy, file export, or manual import.

This is a roadmap/product gate, not an implementation approval. Passing this gate only means a light integration may be considered; it does not approve OAuth, account sync, token storage, automation, or platform cloning by itself.

HTML view: [Integration Readiness Gate 한국어 HTML](./integration-readiness-gate-ko.html)

## Core Decision

Do not ask "can the platform API do this?"

Ask whether FlowMe has evidence that direct account write access would reduce proven user friction without breaking source, safety, permission, or reversibility boundaries.

## Stage States

| State | Meaning | Allowed FlowMe behavior | Do not build |
|---|---|---|---|
| `stage0_export_only` | Default state for every destination | copy, `.ics`, CSV/XLSX rows, Markdown/plain text, Todoist/task CSV, Notion handoff | OAuth, token storage, persistent sync |
| `stage1_light_integration_candidate` | Repeated export friction is proven for a narrow artifact | scoped direct save or append can be explored behind a separate implementation plan | broad account write access, generic sync |
| `future_platform` | Useful platform surface but too heavy for current FlowMe evidence | keep handoff/export shape and record user demand | workspace builder, task inbox, automation app |
| `reject_for_now` | Misaligned, too risky, or would make FlowMe a clone/platform early | record the boundary only | credential handling, arbitrary webhook/action builder |

## Six Gates

Move from `stage0_export_only` to `stage1_light_integration_candidate` only when all six gates have current evidence.

| Gate | Evidence required | Why it matters |
|---|---|---|
| Repeated destination use | Users repeatedly choose the same external tool for the same artifact type | avoids integrating a destination that only sounds useful |
| Import friction | Users fail, slow down, or ask for direct save because copy/file import is the bottleneck | proves API write access solves a real problem |
| Stable artifact schema | Event fields, sheet columns, or task fields are stable across multiple Flow candidates | prevents writing unstable data into user accounts |
| Permission clarity | The requested account permission can be explained in one plain sentence | avoids surprise OAuth/write access |
| Reversibility | The user can find, edit, and delete what FlowMe created in the destination | prevents hidden state and support burden |
| Source/safety boundary travels | Source URL, caution, completion criteria, and stop/hold state travel with the created artifact | keeps FlowMe source-bound rather than generic automation |

If any gate is missing, keep the destination as export-only and improve the export shape instead.

## Destination-Specific Readiness

| Destination | Current default | Plausible next state | Open only when | Boundary |
|---|---|---|---|---|
| Google Calendar | `.ics` export, Google Calendar CSV only when useful | `stage1_light_integration_candidate` | users repeatedly import dated Flow events and ask for direct save | no broad calendar-write permission in Stage 0 |
| Apple Calendar | `.ics` handoff | `stage0_export_only` | keep file handoff; no server-side account path in this roadmap | no native calendar app replacement |
| Google Sheets | CSV/XLSX-ready rows | `stage1_light_integration_candidate` | row schemas stabilize and users repeatedly append to the same sheet | no Drive/Sheets token storage in Stage 0 |
| Notion | Markdown/CSV handoff | `future_platform` | Notion becomes a dominant user destination and page/database schema is stable | no workspace/database builder |
| Todoist/task manager | Todoist-compatible CSV for task-first Flows | `future_platform` | task-manager demand is proven and FlowMe can avoid becoming a task inbox | no task creation API or reminder engine yet |
| Zapier/Make | no automation; copy/export only | `future_platform` | FlowMe has stable event payloads and users ask for cross-app automation | no trigger/action builder or arbitrary webhook endpoint |

## Review Questions

Use these before proposing any direct integration:

1. Which exact Flow artifact is repeatedly exported today?
2. Which outside destination is repeatedly chosen for that artifact?
3. Where does manual import fail or slow the user down?
4. Are the fields stable enough to write into a third-party account?
5. What is the smallest permission scope that would be requested?
6. How will the user find, edit, or delete the created item later?
7. Does the source URL, caution, and completion criterion travel with the item?
8. What support burden appears if the destination API fails or rate-limits?
9. What user behavior evidence would close the integration again if it is not useful?

## Hard Stops

Do not proceed to integration while any of these are true:

- the request is based on platform desirability rather than repeated user behavior;
- the Flow artifact schema is still changing;
- the integration would require broad account write access before the user understands why;
- FlowMe would store OAuth grants, refresh tokens, API keys, spreadsheet IDs, Notion page IDs, Todoist project IDs, webhook URLs, or automation credentials in Stage 0;
- the product would become a calendar, spreadsheet, Notion workspace, Todoist inbox, or Zapier/Make-style automation builder;
- source URL, caution, stop/hold condition, or completion criterion would be dropped from the destination item;
- the integration would imply validation, safety, SEO, legal, financial, or medical certainty.

## Candidate Decisions

| Candidate | Decision | Reason |
|---|---|---|
| Google Calendar direct save | Stage 1 light integration candidate only after evidence | Calendar event schema is narrow, but Calendar API write access still needs OAuth scope clarity and reversibility |
| Google Sheets direct append | Stage 1 light integration candidate only after evidence | Sheet rows can be narrow, but spreadsheet ID/range and row schema must stabilize first |
| Notion page/database creation | Future platform | useful handoff destination, but page/database ownership and workspace schema are too heavy for Stage 0 |
| Todoist task creation | Future platform | useful for task-first users, but FlowMe should not become a generic task inbox or reminder engine |
| Zapier/Make automation | Future platform | useful after FlowMe has stable event payloads; too early before export behavior is proven |

## Relationship To Export Destination Fit

[Export destination fit](./export-destination-fit.md) decides where the artifact should go.

This gate decides whether that destination deserves direct integration.

Run export fit first. Run integration readiness only after export behavior produces evidence.

## Current Source Basis

Checked on 2026-06-09:

- Google Calendar API supports event insertion and requires Calendar API authorization scopes.
- Google Sheets API `spreadsheets.values.append` appends values to a spreadsheet and requires spreadsheet ID, range, `valueInputOption`, and OAuth scopes such as Drive or Sheets.
- Notion API integrations manage pages, databases/data sources, and workspace content through integrations and OAuth/permission capabilities.
- Todoist API supports task, due-date/deadline, project, reminder, and OAuth-token based surfaces.
- Zapier Platform authentication and OAuth v2 docs show app connections and OAuth-based account authorization as core integration behavior.
- Make webhook/API docs show webhook hooks and scenario-trigger behavior, which belongs to a future automation layer.

These official docs confirm capability. They do not by themselves prove FlowMe readiness.
