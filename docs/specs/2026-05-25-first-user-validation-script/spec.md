# First User Validation Script Spec

## Goal

Document a lightweight user-observation script that defines what evidence is needed before calling a FLOW route validated.

## Product Context

Stage 0 is export-first. The route cleanup work has made the first candidate flows easier to start and export, but internal QA is not user validation.

## Scope

In scope:

- Add a first-user validation script to `docs/flow-rules`.
- Cover `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Define common observations, route tasks, evidence needed, fail signals, and status decision labels.
- Update docs README, content audit, PR history, status, and QA docs.

Out of scope:

- Running user sessions.
- Adding telemetry, analytics, login, or data collection UI.
- Changing route exposure.
- Calling any route validated.

## Acceptance Criteria

- The script makes the complete export loop observable.
- It prevents internal QA/screenshots from being treated as validation.
- It includes route-specific fail signals for study, diet, and new-car flows.
- `npm run docs:check` passes.
