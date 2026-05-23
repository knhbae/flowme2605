# Source Replacement And Risk Reshape Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** `docs/ROADMAP.md` Stage 0 content/UX hardening

## Goal

Turn the twelve post-PR #19 `needs_review` follow-up routes from manual audit notes into visible artifact-first execution surfaces. The source replacement routes should produce the natural records users would keep, and the risk review routes should separate official confirmation questions from personal notes or sensitive judgments.

## Stage Fit

This remains Stage 0 hardening. The work adds static field mappings, primary-surface routing, documentation, and regression tests. It does not promote the routes to representative exposure, add live official-source crawling, infer legal/medical/tax eligibility, or introduce account-backed persistence.

## User Need

As a user opening a route that has source mismatch or safety risk, I need the page to ask for the date, proof, official question, or external record that determines completion, so that copied/exported output remains useful beyond a generic checklist.

## Scope

In:
- Add study logs for `computer-skills-d30-study`.
- Route the three diet routes to a sheet-first weekly record surface.
- Add a defect/evidence decision table for `new-car-delivery-check`.
- Add memo-card fields for tax, business registration, Happy Birth, industrial accident, health checkup, vaccination certificate, and job-change risk routes.
- Ensure decision-table routes can display route-specific memo fields beside the table.
- Record natural artifact simulation, current Flow/UX gap, and reinforcement in docs and tests.

Out:
- Representative/public promotion.
- Real-time validation against government or publisher sites.
- Medical, tax, labor, or legal recommendations.
- Conditional branching or user-specific eligibility decisions.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Fill the route-specific record before treating the checklist as complete. |
| Completion signal | A sheet row, memo card, log table, or decision row contains the user's deadline, proof, official question, or risk boundary. |
| Artifact destination | Study calendar/log, diet spreadsheet, car defect table, official memo card, and exported workbench rows. |
| Source/risk boundary | Source facts and official confirmation prompts stay separate from personal values, sensitive notes, or eligibility judgments. |
| Natural artifact | D-30 study log, two-week diet sheet, new-car evidence table, submission memo, medical question memo, and job-change risk memo. |
| Verification | RED/GREEN unit tests, docs check, full test suite, build, and Playwright E2E before merge. |

## Acceptance Criteria

- The twelve audited routes expose the artifact records listed in the content audit.
- The three diet routes open with a spreadsheet-first primary surface.
- Decision-table routes can also display route-specific memo fields without nested cards.
- Unit tests cover both field mappings and primary-surface routing.
- Specs, content audit, QA notes, and PR history record the simulation, UX gap, and reinforcement.
