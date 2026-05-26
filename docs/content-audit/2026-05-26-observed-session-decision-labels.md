# Observed Session Decision Label Alignment

Date: 2026-05-26

## Scope

Observed-session operating docs now use the same non-validated decision labels as Flow Lab note intake and run sheets:

- `no signal`
- `friction`
- `candidate signal`

## Boundary

- Removed older session-note choices that implied partial completion as status language.
- Kept `candidate signal` explicitly below validation.
- No route status changes.
- No route is called validated without repeated target-user behavior and evidence review.

## Verification Notes

- Added a unit guard that reads the validation session template and first-user validation script, checks for the Flow Lab intake labels, and rejects the older decision labels.
