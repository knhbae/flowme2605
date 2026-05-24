# FLOW Product Principles

This document preserves product direction that should guide future work across UX, content, data, and technical decisions.

## Core Position

FLOW starts as an action compiler:

> Turn useful outside content into a user's own calendar, checklist, spreadsheet, or memo so they can act on it.

FLOW should not initially compete with Notion, calendar apps, to-do apps, or spreadsheets as a full workspace. It should make those existing tools more actionable by converting content into portable execution artifacts.

## Stage 0 Direction

Stage 0 is export-first.

The first successful loop is:

1. User opens a Flow or brings useful content.
2. User enters the minimum anchor needed for their situation.
3. FLOW produces a concrete execution artifact.
4. User copies or exports it to an existing tool.
5. User checks or records enough progress to show real execution intent.
6. User can give feedback or return later.

Prioritize copy/export/check behavior before platform expansion, account systems, heavy integrations, native persistence, marketplace features, or broad community features.

## Long-Term Direction

FLOW can later become the place where execution records accumulate.

The long-term path is:

1. Export-first conversion proves repeat value.
2. Users return to continue, modify, or check exported Flows.
3. FLOW saves personal execution records without forcing users to abandon their existing tools.
4. Repeated execution records improve future Flow generation, revision, validation, and creator feedback.

Native save, record, and workspace features should stay secondary until export-first behavior shows that users want to continue the record inside FLOW.

## UX Principles

- The first screen should answer: "What execution artifact will this content become?"
- Show the user's first action before internal labels, audit status, or operational metadata.
- Keep screens calm by progressively revealing detail instead of showing every tool, source note, and export option at once.
- Treat source, creator experience, user notes, and risk warnings as separate layers.
- Prefer concrete output previews over explanatory copy.
- Do not describe a Flow as validated until real user behavior supports that claim.

## Current UX/UI Direction

Stage 0 UI should feel like a conversion workbench, not a full productivity suite.

- Put one first action and one natural artifact ahead of feature lists.
- Choose the artifact from the content shape: calendar, checklist, sheet, memo, comparison table, or reaction log.
- Keep export controls tied to the artifact they produce.
- Move supporting source notes, full-flow previews, and secondary checklists below the first artifact when they compete for attention.
- Preserve the long-term path toward native FLOW records, but do not make record keeping the first-screen value until export-first behavior shows repeat demand.

### Study Content Direction

Study content should not ask users to build a blank progress table from scratch. FLOW should start from the outside course, textbook, exam scope, or curriculum and produce a source-derived study structure that the user can review, adjust, and export.

- Exam prep needs a date-based calendar, source-derived progress rows, and score/wrong-answer tracking.
- Habit study needs routine sessions, completion state, and learning notes.
- Course/curriculum study needs lesson or chapter rows that come from the source before the user edits them.
- Certification/problem-solving study needs mock score, wrong-answer type, retry date, and weak-area notes.

## Content Review Principles

Review content through execution simulation, not only editorial judgment.

For each candidate Flow, simulate:

1. A realistic user situation.
2. Real anchor values.
3. The natural artifact a user would keep.
4. Item-by-item execution and completion.
5. Copy/export output in an external tool.
6. Any return loop or in-FLOW record that would be useful later.

Good Flow content produces a usable artifact: calendar, checklist, sheet, memo, evidence table, question list, or decision record.

## Feature Filter

Before adding or exposing a feature, ask:

1. Does this help turn content into action?
2. Does this help the user move the result into an existing tool?
3. Does this help the user return and continue execution?
4. Does it add screen complexity before Stage 0 behavior is proven?
5. Can it be deferred without weakening the first export/check loop?

If a feature mostly serves future platform depth, keep it behind the current export-first loop or record it in [IDEAS.md](./IDEAS.md).

## Current Default Priority

When in doubt, improve the smallest path from content to action:

content -> anchor -> artifact preview -> copy/export -> check -> feedback
