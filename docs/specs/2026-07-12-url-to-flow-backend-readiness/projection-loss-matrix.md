# Projection And Loss Matrix v1

**Date checked:** 2026-07-12<br>
**Decision stage:** Stage 0 export/import only. This matrix does not approve OAuth, sync, or direct account writes.

## Legend

- **D — direct:** Target has a natural field/row for the canonical value.
- **G — grouped/flattened:** Meaning survives, but hierarchy or type becomes a section, order, or plain column.
- **M — Memo fallback:** Meaning travels in description, note, Markdown, frontmatter, or source column.
- **X — forbidden/omit:** Do not send because the target would misrepresent it or it is internal-only.
- **N/A:** Artifact should not be generated for this Item.

## Core Decision

The canonical model stays richer than every destination. An adapter must return both the artifact and a loss manifest.

```ts
type ProjectionResult = {
  target: 'calendar' | 'checklist' | 'todo' | 'sheet' | 'memo';
  format: 'ics' | 'plain_text' | 'markdown' | 'csv' | 'tsv' | 'xlsx';
  applicability: 'applicable' | 'not_applicable';
  artifact: string | Uint8Array | Record<string, unknown>[] | null;
  lossManifest: Array<{
    canonicalPath: string;
    handling:
      | 'direct'
      | 'grouped'
      | 'memo_fallback'
      | 'omitted'
      | 'forbidden'
      | 'not_applicable';
    reason: string;
  }>;
};
```

`format`는 canonical `ProjectionFormat`과 정확히 같은 이름을 쓴다. 따라서 일반 텍스트는 `plain_text`이고 sheet 계열은 `csv`, `tsv`, `xlsx`를 모두 표현할 수 있다. `applicability='not_applicable'`이면 `artifact=null`이어야 하며, loss manifest에는 요청한 target/Item이 왜 적용 대상이 아닌지 `handling='not_applicable'`인 항목을 최소 하나 남긴다. 반대로 `applicability='applicable'`인 결과는 non-null artifact를 가져야 한다.

예를 들어 unscheduled Item에 `target=calendar&format=ics`를 요청하면 adapter는 빈 ICS 파일이나 임의 날짜 event를 만들지 않는다. `applicability='not_applicable'`, `artifact=null`, `canonicalPath='items.<itemId>.schedule'`, `handling='not_applicable'`로 반환한다. 이는 지원되는 투영에서 필드를 의도적으로 버린 `omitted`나 안전상 생성을 차단한 `forbidden`과 다르다.

## Canonical Capability Matrix

| Canonical capability | ICS / Google Calendar import | Apple Calendar import | Outlook calendar import | Todoist project CSV | CSV/XLSX for Sheets/Excel | Markdown / Obsidian | Notion handoff | Required fallback or guard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stable Item identity | **D** as `UID` | **D** through ICS `UID` | **D** through ICS `UID` | **M** in description/source marker | **D** hidden/stable ID column | **D** frontmatter or comment | **D/G** ID property in CSV; frontmatter/text in Markdown | Never derive identity from title. Imported files are snapshots, not sync ownership. |
| Item title | **D** event summary | **D** event title | **D** event title | **D** `CONTENT` | **D** title column | **D** heading/task text | **D** page title or database title | Use destination-specific readable title; keep stable ID separately. |
| Step grouping/order | **M/G** prefix or description; separate calendar not required | **M/G** | **M/G** | **D/G** `section` rows and order | **D** Step/order columns | **D** heading/list nesting | **D/G** heading or database properties | Step owns no completion state. Do not merge child Item states into Step. |
| completion mode `check` | **M** completion criterion in description; Calendar import is not execution state | **M** | **M** | **D** task row; imported completion starts open | **D** status column | **D** task checkbox | **D/G** checkbox text or status property | FlowMe execution state is not round-tripped from import-only targets. |
| completion mode `decision` | **M** decision options in description | **M** | **M** | **G/M** task + description | **D** decision/status column | **D** decision list/template | **D** select/status when CSV schema is explicit; otherwise Markdown | Never let the adapter make the decision. |
| completion mode `record` | **M** prompt only | **M** | **M** | **M** prompt in description | **D** typed record columns | **D/G** template fields/frontmatter | **D/G** CSV properties or Markdown template | User-private record value stays overlay-owned. |
| absolute date/time | **D** `DTSTART`/`DTEND` | **D** through ICS | **D** through ICS | **D** `DATE`, `TIMEZONE` where supported | **D** date/time columns | **D/G** frontmatter/text | **D/G** date property via CSV or text | Timezone is explicit. No date means no ICS event. |
| anchor offset | **D after resolution** | **D after resolution** | **D after resolution** | **D after resolution** | **D** resolved date + optional offset column | **D/G** resolved date and rule text | **D/G** | Resolve against user anchor before projection; keep canonical offset in FlowMe. |
| date window | **D/G** all-day start/end or deadline description | **D/G** | **D/G** | **G** deadline/due date plus description | **D** start/end columns | **D** range text/frontmatter | **D/G** two columns or text | Target semantics differ; include original window in note. |
| recurrence | **D** RRULE subset | **D** through ICS subset | **D** through ICS subset | **D/G** recurring date text in Todoist CSV when supported | **G** recurrence columns/text; not active schedule by itself | **D/G** recurrence text/frontmatter | **G** property/text; not a scheduler | Unsupported/custom recurrence becomes explicit text and a loss entry, never a guessed rule. |
| Field values | **M** selected values in description | **M** | **M** | **M/G** description or supported CSV column | **D** one stable column per Field | **D/G** frontmatter or template list | **D/G** CSV property mapping; mixed types may become text | Only export user-approved/private values to destinations the user chose. |
| Memo/how/link | **D/M** description and URL | **D/M** | **D/M** | **D/M** description/note rows | **D** memo/source columns | **D** body/frontmatter/link | **D** page body or CSV text | Memo is the lossless semantic fallback, not a place for internal review data. |
| source URL/checked date | **D/M** description/URL | **D/M** | **D/M** | **D/M** description | **D** source columns | **D** link/frontmatter | **D** page body/properties | Attribution and freshness travel when relevant. |
| caution/hold/stop condition | **D/M** description | **D/M** | **D/M** | **D/M** description/note | **D** caution column | **D** callout/text | **D/G** property/body | If the caution cannot travel clearly, the projection is forbidden. |
| rights-review/provider/prompt/score internals | **X** | **X** | **X** | **X** | **X** | **X** | **X** | Internal-only in every user projection. |
| unscheduled Item | **N/A** | **N/A** | **N/A** | **D** task without date when task-first | **D** row without date | **D** | **D** | Calendar adapter must emit zero events. |

## Target Profiles

### Calendar: Generic ICS, Google, Apple, Outlook

Use when date/time is the main job.

Required fields:

- stable `UID` derived from stable Item ID + occurrence key;
- `SUMMARY`, `DTSTART`, optional `DTEND`, explicit timezone/all-day rule;
- source URL, completion criterion, caution, and unsupported Fields in `DESCRIPTION`;
- supported RRULE subset only;
- one VEVENT per scheduled Item occurrence/series, never per Step merely for grouping.

Known import boundary:

- Google Calendar accepts ICS and CSV on desktop, but CSV recurrence may appear as separate one-off events; use ICS for recurrence.
- Apple Calendar imports `.ics` events.
- Outlook on the web imports `.ics`; an imported file is a snapshot and does not refresh like a subscription.
- File import does not provide FlowMe with round-trip state or ownership. Direct write/sync remains a separate integration gate.

### Todo / Checklist

Use when independent completion is the main job.

- Item becomes the task/checklist row.
- Step becomes a section when the target supports sections; otherwise it is a heading/prefix.
- Todoist CSV supports `task`, `section`, and `note` rows, plus date/timezone/deadline columns.
- Source, caution, and unsupported Fields travel in description/note rows.
- Imported completion begins in the destination; FlowMe does not claim synchronization.

### Sheet

Use when row comparison, record, status, sort, or filter is the main job.

- Item is one stable row.
- Field is one stable typed column.
- Step/order/source/caution/user memo receive explicit columns.
- CSV must be UTF-8; XLSX is preferred when type/format preservation matters.
- Google Sheets can import Excel files and CSV; Excel imports CSV/text but local date/number interpretation can change values.
- Preserve dates as ISO text plus an optional typed date column where ambiguity matters.

### Markdown / Obsidian

Use when context and user-owned files are the main job.

- Flow/Step become headings; Item becomes task text or a section row.
- Stable identity and source metadata may use YAML frontmatter or HTML comments.
- Obsidian can open/create Markdown notes through its URI, but Stage 0 should provide a `.md` file or copyable text rather than require URI automation.
- No claim of task state synchronization.

### Notion handoff

Use only when the user explicitly chooses a workspace destination.

- Markdown imports as pages; CSV imports as database rows/pages and columns/properties.
- CSV import adds rows and does not update existing rows; relations, rollups, formulas, and nonstandard Markdown may not survive.
- Prefer Markdown for memo/context and CSV for stable row/column artifacts.
- Do not build workspace/database ownership or OAuth before integration readiness is proven.

## Loss Manifest Acceptance Rules

A projection passes only when:

1. every canonical path is marked direct, grouped, Memo fallback, omitted, forbidden, or not applicable;
2. source URL, caution, completion criterion, and hold boundary travel whenever relevant;
3. an unscheduled Item creates no calendar event and returns an explicit not-applicable result rather than an empty/dated artifact;
4. Step grouping cannot hide or merge independently stateful Items;
5. user-private values are exported only after explicit user action;
6. no internal review/provider metadata leaks;
7. the artifact can be regenerated deterministically from the same effective canonical state;
8. target limitations are visible before export when they change execution meaning.

Handling semantics are exclusive at each reported canonical path:

- `not_applicable`: the target has no artifact to generate for this Item/context; result-level `applicability` is `not_applicable` when the whole request is ineligible.
- `omitted`: the artifact is applicable, but this path is intentionally left out without changing user execution meaning.
- `forbidden`: the artifact or path would misrepresent meaning, leak internal data, or drop a required safety/source boundary, so generation is blocked.

## Current Go/No-Go By Destination

| Destination | Export/import | Direct account integration |
| --- | --- | --- |
| Generic/Google/Apple/Outlook Calendar | **GO after projection parity** for `.ics` | **NO-GO** until repeated import friction, permission clarity, and reversibility evidence |
| Todoist/task manager | **CONDITIONAL GO** for validated task CSV | **NO-GO** |
| Google Sheets/Excel | **GO after schema parity** for CSV/XLSX | **NO-GO** until stable repeated append use |
| Markdown/Obsidian | **GO** for `.md`/copy handoff | **NO-GO** for URI or vault automation |
| Notion | **CONDITIONAL GO** for Markdown/CSV handoff | **NO-GO** for workspace/database creation |

## Official Capability Sources

Capability checks support only file/import claims, not product readiness:

- [Google Calendar: import ICS and CSV](https://support.google.com/calendar/answer/37118?hl=en-GB)
- [Apple Calendar: import/export `.ics`](https://support.apple.com/en-lamr/guide/calendar/icl1023/mac)
- [Outlook on the web: import or subscribe to calendars](https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web)
- [Todoist: import/export a project as CSV](https://www.todoist.com/help/articles/208821185-Project-templates)
- [Google Sheets: work with Excel and import data](https://support.google.com/docs/answer/9331167?hl=en)
- [Microsoft Excel: import/export text and CSV](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- [Notion: import Markdown and CSV](https://www.notion.com/help/import-data-into-notion)
- [Obsidian URI: open or create a Markdown note](https://help.obsidian.md/Extending%2BObsidian/Obsidian%2BURI)
