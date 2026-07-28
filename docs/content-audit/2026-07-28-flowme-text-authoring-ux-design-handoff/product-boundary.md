# Product Boundary

## Product Job

```text
source URL / memo / text
-> executable Flow structure
-> minimum personalization
-> natural artifact preview
-> save to FlowMe or move to an existing tool
-> execute, record, reuse
```

FlowMe is a portable execution layer. It is not a replacement for Obsidian, Notion, a calendar,
a spreadsheet, or a task manager.

## Authoring Scope

The text authoring UX may:

- accept plain text, Markdown, tables, and mixed URL notes;
- detect Flow, Step, Item, detail, completion criteria, source, and resource candidates;
- show an interpreted outline and artifact preview;
- let the user correct a local mapping;
- save a personal draft or creator draft;
- export a portable result.

It must not:

- implement a generic document database;
- expose internal taxonomy or raw backend fields;
- invent missing source facts;
- turn prose into tasks only to fill a UI;
- invent dates for Calendar eligibility;
- overwrite a published Flow with a personal edit;
- present fixture parsing as a live AI capability.

## Ownership Boundary

| Layer | Owner | Editable in this UX | Canonical impact |
|---|---|---:|---|
| Source snapshot | source owner | no | evidence only |
| Creator draft | creator/editor | yes | none before approval |
| Published Flow | versioned product content | no direct overwrite | approved release only |
| Personal draft | user | yes | none |
| Personal overlay | user | yes | none |
| Execution run | user | execution state only | none |
| Recurrence occurrence | user/run | occurrence state only | none |
| Correction suggestion | proposer | proposal body only | none before review |

## Validation Boundary

Screenshots, prototypes, deterministic fixtures, automated tests, and agent simulations are
internal evidence. They are not observed-user validation.
