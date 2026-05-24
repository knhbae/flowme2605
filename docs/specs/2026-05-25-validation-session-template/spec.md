# Validation Session Template Spec

## Goal

Create a consistent place and format for recording target-user validation sessions.

## Product Context

The next Stage 0 evidence step is observing whether users complete the export-first loop. A route should not become validated because internal QA, screenshots, or route simulations passed.

## Scope

In scope:

- Add `docs/validation-sessions/README.md`.
- Add a reusable `TEMPLATE.md`.
- Add one clearly labeled internal simulated baseline for `computer-skills-d30-study`.
- Update flow-rule docs, content audit, PR history, and status.

Out of scope:

- Running real user sessions.
- Adding analytics or telemetry.
- Changing route behavior or exposure.
- Calling any route validated.

## Acceptance Criteria

- Future session notes have fields for setup, artifact understanding, export/copy, outside destination, completion, friction, rubric snapshot, and decision label.
- Internal simulations are explicitly marked `no signal`.
- `npm run docs:check` passes.
