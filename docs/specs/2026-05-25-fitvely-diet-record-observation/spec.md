# FITVELY Diet Record Observation Spec

**Date:** 2026-05-25
**Status:** Implemented
**Owner:** Codex
**Related roadmap:** Stage 0 export-first execution behavior.

## Goal

Reshape `real-fitvely-diet-record-routine` from a generic diet routine into an export-first observation sheet based on one exact FITVELY video source.

## Stage Fit

This belongs in Stage 0 because the value is moving external nutrition content into a sheet the user can act on. It must not become automated diet planning, medical advice, native long-term tracking, or an external app integration.

## User Need

As a user trying to record diet behavior, I need to choose one source rule and record one meal/condition row, so that I can observe what happened without treating FLOW as a diet prescription.

## Scope

In:

- One source-rule observation action for `real-fitvely-diet-record-routine`.
- Sheet-first `primary_destination`.
- Dedicated observation table fields for meal, selected rule, condition, and next adjustment.
- Stop/consult caution in route detail and warning copy.
- Unit and E2E coverage.

Out:

- Automatic nutrition or gram-target generation.
- Weight-loss outcome claims.
- Multiple reminder-rule UX.
- Native diet records, accounts, or integrations.
- Promotion to representative/public MVP/validated.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Pick one FITVELY source rule and write one observation row |
| Completion signal | One meal has selected rule, meal memo, condition, and next adjustment recorded |
| Artifact destination | Spreadsheet |
| Source/risk boundary | Creator video link is preserved; stop/consult condition is separate from the selected rule |
| Natural artifact | Date, meal memo, selected rule, condition, next adjustment sheet |
| Verification | Unit tests, E2E route render/export-surface check, build, docs check |

## Acceptance Criteria

- `real-fitvely-diet-record-routine` has exact source metadata and `primary_destination: sheet`.
- The route renders one action, not the previous five generic routine actions.
- `getLogTables` exposes `fitvely-diet-observation-log`.
- The route includes meal memo, selected rule, condition, next adjustment fields.
- Warning/caution copy rejects outcome promises and includes stop/consult conditions.
- Documentation records that the route remains unvalidated.
