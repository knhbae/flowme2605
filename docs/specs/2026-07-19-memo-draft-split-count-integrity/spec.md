# P25-01B Memo Draft Split And Count Integrity Spec

**Date:** 2026-07-19
**Status:** implemented and verified by current unit/build/browser evidence
**Parent:** [P25 Execution Workspace Foundation](../2026-07-19-execution-workspace-foundation/spec.md)

## Goal

Turn only user-authored memo or URL-request phrases into draft tasks, let the user accept and rename those tasks before save, and preserve the accepted item identities and count through My Flow, Calendar eligibility, reload, and portable exports.

## Problem

The previous draft generator forced a minimum item count. A short memo could gain generic tasks such as scope definition, execution ordering, or a first action. The preview then claimed that only user text had been used. Count and provenance were therefore unreliable even when all stored rows happened to render.

## Intake Contract

1. Split user text on lines, sentence punctuation, arrows, and unambiguous Korean action lists.
2. Do not split noun lists such as `여권, 지갑, 우산 챙기기`.
3. Remove exact application status copy before executable-title conversion.
4. Never add a task merely to reach a target count.
5. A sparse one-sentence request remains one task.
6. Each proposed task carries a deterministic intake ID and its source phrase.
7. Suggested action wording may be edited before save without changing the intake ID.

## Acceptance Boundary

The pre-save list is the explicit acceptance boundary:

- every parsed task is selected by default;
- the user can exclude a task;
- the user can edit each selected title;
- at least one non-empty selected title is required;
- save consumes only the accepted rows and never falls back to the generated list.

## Persistence And Projection

- The saved Flow item ID contains the stable intake ID rather than an accepted-list index.
- A first accepted memo task may receive the optional first-task date; later accepted memo tasks remain undated.
- All accepted tasks remain visible in the personal-draft effective list and checklist/sheet/memo projections.
- Calendar and ICS include only accepted tasks with effective dates.
- Excluded preview tasks are not tombstones; they were never accepted into the personal Flow.
- Source-backed and published Flow intake paths are unchanged.

## Count Invariant

For one accepted draft revision:

`accepted preview count = saved bundle item count = reloaded effective item count = whole list export count`

Calendar and ICS counts are eligibility subsets of that same accepted list, not competing total counts.

## Scope Boundary

This slice does not redesign the post-save whole-Flow workspace, add AI generation, infer missing tasks, add batch editing, or change source-backed/public Flow schemas. Those remain later P25 slices.

## Acceptance

- Three user phrases produce three preview rows and zero generic filler rows.
- Excluding one row and renaming another saves exactly the two accepted rows.
- Stable saved item IDs survive reload.
- My Flow and list exports use the two accepted rows.
- Calendar shows the one dated accepted row and its undated tray shows the one undated accepted row.
- Sparse URL or memo requests are not expanded to an arbitrary minimum.
