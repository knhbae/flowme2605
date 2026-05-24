# Setup Export Card Reduction Audit

**Date:** 2026-05-24
**Branch:** `codex/setup-export-card-reduction`
**Related spec:** [setup export card reduction](../specs/2026-05-24-setup-export-card-reduction/spec.md)

## Decision

After artifact-near export actions landed, the setup-level export card became duplicate UI. The common first screen should now keep setup focused on the minimum anchor input and move export intent to the workbench.

## Natural Artifact Simulations

| Route | Simulated user action | Natural artifact | UX gap fixed |
| --- | --- | --- | --- |
| `moving-d30-basic` | Enter `2026-07-15`, check move method and defect-check tasks, download xlsx. | D-30 checklist plus monthly calendar. | Export is no longer presented before the user reaches the calendar/checklist artifact. |
| `computer-skills-d30-study` | Enter exam date, edit chapter progress, check first study task, download xlsx/ics. | Source-derived study sheet plus calendar. | Study export now follows the generated progress artifact instead of a generic setup panel. |
| `year-end-tax-docs` | Open no-anchor checklist and start checking required documents. | Checklist text/sheet without calendar. | No-anchor flows avoid showing an irrelevant setup export block; calendar export remains hidden in the workbench. |

## Current Flow/UX Reinforcement

- Setup now has one job: collect the route anchor when needed.
- Workbench has the execution artifact and export controls.
- Mobile sticky export and bottom sheet remain because they serve thumb-reachable export after scrolling.
- Source/risk copy is unchanged.

## Follow-Up

1. Move export actions from the workbench header into artifact-specific sub-cards where useful.
2. Review whether no-anchor setup cards should be collapsed further.
3. Check mobile first screens after one more layout diet because setup plus workbench can still be tall.
