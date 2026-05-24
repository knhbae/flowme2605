# Mobile Route Density Collapse Spec

## Goal

Reduce mobile page density for `diet-habit-2week` and `new-car-delivery-check` without changing export behavior, route content, or exposure decisions.

## Product Context

Stage 0 remains export-first. These two routes are public MVP candidates with guardrails, not representative or validated routes.

The prior screenshot pass showed that the mobile bottom sheet itself is acceptable. The next issue is the long stack of expanded execution sections below the first artifact.

## Scope

In scope:

- Collapse secondary execution sections on mobile for the two target routes.
- Keep the first execution section visible.
- Keep desktop sections expanded.
- Add E2E coverage.
- Capture mobile screenshots.
- Update docs/status/PR history.

Out of scope:

- Bottom-sheet redesign.
- Export format changes.
- Route content rewrite.
- Exposure changes.
- Native FLOW records.
- Automatic generation or integrations.

## Acceptance Criteria

- On mobile, `new-car-delivery-check` shows closed secondary execution sections that can be opened.
- On mobile, `diet-habit-2week` shows closed secondary execution sections.
- Desktop behavior remains expanded through the existing non-mobile layout.
- `npm run build`, targeted E2E, unit tests, docs check, and full E2E pass before merge.
