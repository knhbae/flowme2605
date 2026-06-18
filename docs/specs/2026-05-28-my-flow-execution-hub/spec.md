# My Flow Execution Hub Spec

**Date:** 2026-05-28
**Status:** In progress
**Owner:** Codex
**Related direction:** [Product Principles](../../PRODUCT_PRINCIPLES.md), [Deferred Ideas](../../IDEAS.md)

## Goal

Make `My Flow` behave as an execution hub that adapts to the number and state of saved Flows. The screen should help users answer "what should I do next?" before asking them to inspect detailed Flow cards.

## Stage Fit

This belongs after the current My Flow layout cleanup because it changes the management model, not only styling. It remains Stage 0-compatible if it improves local saved-flow execution, calendar/checklist/routine portability, and next-action clarity without adding accounts, integrations, payment, community, or validation claims.

## User Need

As a user who has saved one or more Flows, I need My Flow to show the most relevant next action and the right level of detail for my saved Flow count, so that I can resume execution without scanning repeated management cards.

## Scope

In:
- Define saved Flow count breakpoints and the corresponding My Flow behavior.
- Define My Flow item execution types separately from content categories.
- Make `Flow별` a scan-first operating view for all saved Flows.
- Keep detailed management for a specific selected Flow.
- Prioritize execution state before category decoration.
- Limit destructive actions in all-Flow views.

Out:
- No account-backed persistence.
- No calendar or sheet API integration.
- No social proof or usage-count claims.
- No validation language without observed user behavior.
- No broad marketplace, creator dashboard, or team workflow expansion.

## Flow Count Scenarios

| Saved Flow count | Default My Flow behavior |
| --- | --- |
| 0 | Empty state with start guidance and links to browse/create a Flow. Hide management tabs unless they help explain the next step. |
| 1 | Single execution mode. Show the saved Flow's next action, primary artifact views, and management actions without forcing a scope selector. |
| 2-5 | Compact operating cards. Show each Flow with progress, next action, date/state, and a small management entry point. |
| 6-20 | Dense list mode. Add search, category/status filters, and sorting before showing rows. Avoid large repeated cards. |
| 20+ | Grouped management mode. Use category/status groups, collapsible sections, archived/completed separation, and search as a primary control. |

## State Priority

The UI should prioritize execution state before category grouping:

1. Today
2. Overdue
3. Upcoming
4. In progress
5. Completed
6. Stale or abandoned
7. Broken routine
8. Date-less checklist

Category remains useful for filtering, but it should not hide urgent or stale execution states.

## Category And Color Rules

- Use restrained category color only as a chip, icon, or left border.
- Do not fill whole cards with category colors.
- Keep the dominant interaction color for selected tabs and primary actions.
- Use neutral badges for storage, metadata, and non-action status.
- Prefer 5-6 stable category color families instead of adding a unique palette for every category.

## Item Execution Types

The durable item type matrix lives in [item-type-matrix.md](./item-type-matrix.md).

The short rule is:

- Category is the life domain: moving, workout, travel, admin, car.
- Item type is the user's execution shape: scheduled task, routine session, check task, log entry, memo/evidence, decision/hold, or reference/caution.
- A Flow can mix item types. My Flow must not flatten everything into a generic checklist.
- `reference_caution` should attach to nearby actionable items rather than become a checkable row.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | User opens My Flow and sees either start guidance, a single next action, or a scan-first saved Flow list depending on saved count. |
| Completion signal | User can identify the next Flow action, check it, or enter the specific Flow's management screen without ambiguity. |
| Artifact destination | Calendar, checklist, routine, and internal check state remain separate tabs/views; Flow별 is the operating overview. |
| Source/risk boundary | My Flow should surface saved execution state only; source facts and cautions remain route/workbench-specific unless needed for a risk cue. |
| Natural artifact | A user with multiple saved plans would naturally make a today list, upcoming calendar, and per-plan progress list rather than repeated full detail cards. |
| Verification | Unit/build/E2E plus mobile and desktop screenshots for 0, 1, 2-5, 6+, and demo data states. |

## Acceptance Criteria

- `전체 Flow + Flow별` shows all saved Flows in a scan-first format, not one selected detail card.
- Selecting one Flow shows detailed management for that Flow only.
- Delete and whole-Flow completion are not repeated as prominent actions on every all-Flow list card.
- The top of My Flow exposes the next useful action or summary before secondary organization.
- Mobile preserves the order: scope or summary, view controls, actionable content.
- E2E covers at least 1 saved Flow and 2 saved Flow scenarios; future implementation should add coverage for empty and larger saved lists.
