# Real-Source Official Reshape Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** `docs/ROADMAP.md` Stage 0 content/UX hardening

## Goal

Reshape six `source_status=real` official/service routes that were promoted into `reshape_before_featured` by PR #23. Each route should now expose the natural record a user would keep: Q-Net deadline logs, childcare visit notes, KDCA travel-health confirmation notes, driver-license condition rows, resident-register proof notes, and childcare-support comparison rows.

## Stage Fit

This stays in Stage 0. The source-fit audit already established these are real-source routes, but they still needed content/UX shaping before stronger public exposure. The work adds static artifact fields and tests; it does not add account state, live source crawling, medical/legal advice, or a generalized branching engine.

## User Need

As a user handling an official or service task, I need FLOW to capture the deadline, eligibility condition, disclosure scope, medical question, or institution comparison that determines completion, so that the exported memo/sheet remains useful outside FlowMe.

## Scope

In:
- `real-qnet-application-examday-check` reuses Q-Net application and exam-day log tables.
- `real-safe-driving-license-renewal` reuses driver-license condition comparison rows.
- `real-gov24-resident-register-copy` reuses resident-register submitter/disclosure memo fields.
- `real-childcare-vaccination-visit-prep` gets a medical visit memo card.
- `real-kdca-travel-health-check` gets a KDCA official-check and consultation memo card.
- `real-childcare-support-application-check` gets childcare-center/eligibility comparison rows.
- Docs and tests record natural artifact simulations, current Flow/UX gaps, and content/UX reinforcement.

Out:
- Public representative promotion.
- Conditional hiding of checklist rows by user input.
- Live official source recrawl or medical recommendation generation.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Fill the route-specific record before treating the checklist as complete. |
| Completion signal | A log, memo card, or comparison row contains the user's requirement, deadline, consultation, or institution decision. |
| Artifact destination | Q-Net: calendar + sheet log. Childcare/KDCA/resident: memo + sheet. Driver/support: decision table + sheet. |
| Source/risk boundary | Official facts stay in route metadata and item details; personal values stay in workbench state. Medical/childcare routes ask users to record consultation questions, not accept generated medical advice. |
| Natural artifact | Deadline log, visit memo, official-check memo, condition comparison, proof memo, center comparison. |
| Verification | RED/GREEN unit test for route-specific fields, full test suite, docs check, build, and E2E before PR. |

## Acceptance Criteria

- The six real-source route slugs return route-specific workbench records from `artifact-fields`.
- Existing export paths can include those records through comparison, memo-card, or log-table workbench state.
- Content audit docs explain simulated user inputs, expected artifact output, current Flow/UX gap, and reinforcement for all six routes.
- PR history records the branch, verification, and residual risks.
