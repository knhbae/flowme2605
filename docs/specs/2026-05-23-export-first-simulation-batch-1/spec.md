# Export-First UX + Content Simulation Batch 1

## Summary

Run an export-first execution simulation on the first three representative readiness candidates:

- `computer-skills-d30-study`
- `new-car-delivery-check`
- `diet-habit-2week`

The goal is to verify whether a realistic user can enter anchor values, create a natural artifact, move it to an external tool, and understand the current source/risk boundary.

## Product Fit

This follows [PRODUCT_PRINCIPLES.md](../../PRODUCT_PRINCIPLES.md): FLOW should first act as an action compiler that turns useful outside content into a user's existing calendar, checklist, spreadsheet, or memo.

This is not a native FLOW workspace expansion. Native record keeping remains a later direction after export-first behavior proves repeat use.

## User Stories

1. As a test-prep user, I want a D-30 calendar and score log that I can move into my calendar and sheet.
2. As a new-car buyer, I want a defect evidence sheet and handover memo that I can use before signing.
3. As a health-conscious user, I want a two-week observation sheet that records meals, activity, sleep, condition, and stop conditions without diet promises.

## In Scope

- Record realistic user simulation inputs for the three routes.
- Record the natural artifacts each route should export.
- Record current UX/content gaps and feature-diet decisions.
- Surface the simulation queue in Flow Lab.
- Add unit and E2E coverage.
- Document review findings and residual risk.

## Out of Scope

- Actual representative promotion.
- Native account-backed execution records.
- AI ingestion or URL parsing.
- Calendar/Sheet API integrations.
- Medical, financial, or contract recommendations.

## Acceptance Criteria

- Flow Lab shows the export-first simulation section.
- The summary counts one final QA candidate and two public-MVP-after-UX-fix candidates.
- Each review includes external tool, user scenario, first action, simulated inputs, artifact rows, UX gaps, content fixes, feature-diet notes, risk boundary, and next action.
- `computer-skills-d30-study` remains the only final promotion QA candidate.
- `new-car-delivery-check` and `diet-habit-2week` remain public MVP candidates after UX/risk review, not representative candidates.

