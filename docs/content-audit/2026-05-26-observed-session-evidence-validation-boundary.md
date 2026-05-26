# Observed Session Evidence Validation Boundary

Date: 2026-05-26

## Scope

Flow Lab observed-session evidence now treats `candidate signal` as the strongest evidence-log decision and removes the `0 validated` counter from the observed-session evidence panel.

## Boundary

- Evidence log decisions are limited to `not run`, `no signal`, `friction`, and `candidate signal`.
- `candidate signal` remains below validation.
- Route validation remains a separate evidence-review decision, not a note-intake or single-session label.
- No route status changes.

## Verification Notes

- Unit coverage now exports and checks the observed-session evidence decision options.
- Content Lab summary no longer exposes `observedSessionEvidenceValidatedCount`.
- E2E coverage verifies the Flow Lab evidence panel shows candidate signals instead of a validation count.
