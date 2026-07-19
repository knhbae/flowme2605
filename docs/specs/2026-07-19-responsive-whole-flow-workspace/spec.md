# P25 Responsive Whole-Flow Workspace Spec

**Date:** 2026-07-19
**Status:** Active in staged implementation
**Parent:** [P25 Execution Workspace Foundation](../2026-07-19-execution-workspace-foundation/spec.md)

## Goal

Make the complete personal Flow the stable saved object on both first save and later visits. `지금` and `완료` are projections of that object, not replacements for it.

## Contract

- My Flow local views are `지금 / 내 Flow / 완료`.
- Post-save and returning views read the same effective rows and section grouping.
- Post-save shows every saved row and an exact count before any Today projection.
- Opening `내 Flow` from post-save selects the saved Flow instead of returning to an unrelated all-content dashboard.
- A completed row can be reopened from the persistent `완료` view.
- Source records, personal overlays, execution records, Calendar, and export schemas do not change in P25-02.

## Responsive Model

- Mobile: selected Flow opens directly to its complete outline; item detail drills in below the selected row.
- Wide: Flow rail, complete outline, and selected item detail use the available width as one workspace.
- Multiple Flow summaries may stay compact until a Flow is selected, but a selected or single Flow must never be replaced by only its next item.

## Stages

- **P25-02A:** shared hierarchy, exact whole-Flow handoff, local views, persistent completed view.
- **P25-02B:** wide pane layout, mobile drill-in polish, shared responsive workspace primitives.

## Non-goals

- No new persistence or execution schema.
- No batch editor, new scheduling model, export-scope redesign, public preview redesign, AI, database, or global IA change.
- Automated browser evidence is not observed-user validation.

