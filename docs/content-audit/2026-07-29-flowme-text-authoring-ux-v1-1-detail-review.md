# FlowMe Text Authoring UX v1.1 Detail Review

- Date: 2026-07-29
- Target: `2026-07-29-flowme-text-authoring-ux-v1-1-detail-ko.html`
- Baseline preserved: `2026-07-28-flowme-text-authoring-ux-v1-ko.html`
- App runtime change: none
- Evidence: deterministic fixture, current browser automation, current planning source
- Observed-user count: 0

## Why v1.1 Exists

The v1 prototype established the `text + preview` direction, but it was not detailed enough to
judge the product interaction. It mostly showed titles, counts, and generic result rows. A reviewer
could not reliably answer:

- which source fragment produced a given Item;
- what detail and completion criterion the Item actually contains;
- which value came from the source and which value came from the user;
- how a date or title edit changes Calendar, Todo, Sheet, Memo, and export;
- what whole, selected, and current export scopes contain;
- what is preserved or lost after save or export.

v1 remains the concept-level baseline. v1.1 is a separate decision-grade simulation.

## Detail Gap And Response

| v1 gap | v1.1 response |
|---|---|
| Source shown as a title only | Linked source or explicit personal-draft state, captured scope, version, and preservation policy |
| Item shown as title and role | Source fragment, stable ID, role, Step, detail, completion criterion, date, resource/place, and changed fields |
| Selected Item detail below a long list | Selected mapping moved above the outline list |
| Edit dialog lacked a clear comparison | Source fragment and source interpretation versus personal result diff |
| Result preview used generic rows | Date-grouped Calendar, grouped Todo, progress Sheet, and guide/record Memo |
| Personal values looked disconnected | Anchor, workout time/end, current week/chapter, playback position, comparison memo, and review date reflected in result summary |
| Export was a direct receipt | Scope -> format -> count/date range/loss -> actual sample -> receipt |
| Receipt did not prove its data | First three included Items and the generated text sample |
| Draft recovery covered only a subset | Item edits, anchor, title, and contextual personal values recover after reload |

## Eight Case Detail Coverage

| Case | Interpreted | Primary | Detail that remains visible |
|---|---:|---|---|
| Moving D-30 | 24 | Calendar | Source row, effective date, detail, completion criterion |
| Vehicle inspection | 10 | Todo | Relative date and optional Calendar placement |
| Allblanc seven-day program | 7 | Calendar | Day sequence, video resource, time, duration, end choice |
| K-MOOC | 14 | Sheet | Week, topic, activity, current progress |
| LibriVox | 38 | Sheet | Chapter order, duration, current chapter, playback position |
| New car purchase | 14 | Todo | Decision, action, and record roles plus comparison criteria |
| Overseas safety | 5 blocks | Memo | Guide, caution, action, official-source boundary |
| Jeju personal memo | 5 | Todo | Original sentence fragment, interpreted Item, optional dates |

## Interaction Evidence

The current local browser run verified:

1. A Jeju sentence is split into five Items.
2. Selecting an Item exposes the exact source fragment and interpreted fields before the list.
3. Editing title, detail, completion criterion, and date updates the outline and result.
4. The same calculated date appears in selected mapping, Todo/Calendar result, export, and receipt.
5. Moving D-30 produces 24 dated Calendar events with a visible date range.
6. K-MOOC produces 14 Sheet rows with week activity and progress.
7. Workout time `06:15` and end choice survive reload and appear in Calendar and ICS samples.
8. Whole, selected, and current scopes show a count before export.
9. ICS, checklist, TSV, Markdown, and text samples use the current personal result.
10. Escape closes edit/export dialogs and returns focus to the opening command.

## Responsive And Accessibility Result

| Viewport | Horizontal overflow | Result |
|---:|---:|---|
| 390x844 | 0 | Stage-based input, mapping, result, and bottom-sheet dialogs |
| 1024x768 | 0 | Structure and result two-column workspace |
| 1440x900 | 0 | Input, structure, and result three-column workspace |

Visible enabled controls in the tested mobile state all had a label, text name, title, or
`aria-label`. The Item editor focuses its title field and returns focus to `선택 항목 수정`.
The export dialog returns focus to `가져가기 확인`. No browser console error or warning was
reported.

## Screenshots

- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-390-mapping.png`
- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-390-result.png`
- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-390-export.png`
- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-390-export-sample.png`
- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-1024.png`
- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-1440-result.png`
- `2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/text-authoring-v1-1-detail-1440-receipt.png`

## Claim Boundary

This remains a standalone deterministic prototype. It does not prove a production parser,
real file generation, account persistence, cloud synchronization, crawler behavior, or observed
user validation.
