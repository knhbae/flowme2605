# Mobile Bottom-Sheet Route Check Spec

## Goal

Verify whether the mobile export bottom sheet remains too dense on `diet-habit-2week` and `new-car-delivery-check` after artifact-card export buttons were hidden on mobile.

## Scope

In scope:

- Capture mobile screenshots with the export sheet open.
- Record simulated user values and findings.
- Decide whether a small code PR is needed immediately.
- Update status and PR history.

Out of scope:

- Bottom-sheet redesign.
- Route content rewrite.
- Exposure changes.
- Native FLOW records.
- Automatic generation or external app integration.

## Acceptance Criteria

- Screenshots are saved under `docs/screenshots/`.
- The audit records whether the bottom sheet or page-level density is the bottleneck.
- If no code change is needed, the docs say so explicitly.
- `docs:check` passes.
