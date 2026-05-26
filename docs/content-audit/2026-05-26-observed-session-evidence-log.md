# Observed-session evidence log

Date: 2026-05-26

This batch creates the first Content Lab evidence surface for Stage 0 observed export-first sessions.

## Change

- Added an observed-session evidence model for `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Carried the existing internal study baseline note as one `no signal` session record.
- Marked `diet-habit-2week` and `new-car-delivery-check` as `not run` until real observed sessions exist.
- Added a Flow Lab panel that separates evidence notes from prep scripts and internal simulations.

## Current evidence state

- Routes tracked: 3
- Session notes: 1
- Not run: 2
- Candidate signals: 0
- Validated: 0

## Boundary

This is evidence capture infrastructure, not validation. No route is called validated. The next evidence step is still a real observed export-first mobile loop.

## Verification

- RED: `npm test -- lib/flow/content-lab.test.ts` failed before observed-session evidence summary fields existed.
- RED: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted"` failed before the Flow Lab evidence panel existed.
- GREEN: `npm test -- lib/flow/content-lab.test.ts` passed after adding the summary model.
- GREEN: `npm run build` passed after type tightening.
- GREEN: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted"` passed after adding the panel.
