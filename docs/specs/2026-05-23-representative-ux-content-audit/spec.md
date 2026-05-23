# Representative UX Content Audit Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** [ROADMAP.md](../../ROADMAP.md) v0.1.0 Stage 0 First Flag MVP

## Goal

Review representative and public-MVP Flow routes from a real user's point of view, with the explicit product direction that FLOW starts as an export-first action compiler for a user's existing calendar, checklist, spreadsheet, or memo.

## Stage Fit

This belongs in Stage 0 because it reduces product complexity before adding more features. The work must not turn FLOW into a full Notion, calendar, or habit-tracker replacement yet. Native execution records remain a later direction after export, check, repeat, and feedback behavior is proven.

## User Need

As a person who found useful outside content, I need FLOW to turn it into the smallest clear calendar, sheet, memo, or checklist artifact, so that I can act today without learning a new workspace.

## Scope

In:
- Audit 7 representative/public-MVP routes for first-screen clarity, cognitive load, exportability, and risk/source boundaries.
- Record natural artifact simulations with realistic user values.
- Separate what stays on the first screen from what should move below the fold.
- Expose the audit in tests and Content Lab summary data.
- Capture desktop and mobile first-screen screenshots.

Out:
- Adding native record keeping, login, integrations, or a new dashboard.
- Changing representative exposure decisions.
- Claiming real validation without user behavior data.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Open a Flow, enter the required date/context, identify the primary artifact, then export or check one item. |
| Completion signal | The route has a documented natural artifact, first-screen finding, simplification decision, and next action. |
| Artifact destination | Calendar, sheet, memo, internal check, or hybrid per route. |
| Source/risk boundary | Official facts, creator experience, user notes, and risk cautions stay separated. |
| Natural artifact | Each audited route includes realistic input values and expected calendar/sheet/memo/checklist output. |
| Verification | Unit tests, docs check, build, E2E or documented screenshot/browser pass. |

## Acceptance Criteria

- `getContentLabSummary` exposes 7 UX content simplification audit records.
- Decisions include 3 `keep_simple`, 2 `simplify_first_screen`, and 2 `public_mvp_with_guardrails`.
- Audit records include natural artifacts, current Flow/UX gaps, content/UX reinforcement, copy fixes, and risk boundaries.
- Docs and PR history record the selected routes and verification evidence.
