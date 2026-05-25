# FITVELY Weekly Body Check Hide Spec

Date: 2026-05-25

## Goal

Move `real-fitvely-weekly-body-check` out of the active broad-source replacement queue because no exact FITVELY weekly measurement/check-in source has been confirmed.

## User Story

As a FLOW editor, I need unresolved broad-source routes separated from active source-replacement work, so users are not asked to execute invented measurement, photo, or adjustment rules.

## In Scope

- Keep the route metadata broad.
- Mark the natural-artifact audit as `replace_or_hide_source`.
- Classify the route into the lifecycle `hide` bucket.
- Keep direct route data available for later source replacement review.
- Show hidden broad-source decisions separately in Flow Lab.
- Update broad-source guard docs from 1 active route to 0 active routes plus 1 hidden decision.

## Out Of Scope

- Finding or assigning a non-FITVELY replacement source.
- Inventing measurement rows, body-photo rules, or adjustment criteria.
- Public MVP or representative promotion.
- Validation claims.
- Native tracking, direct app integration, or auto generation.

## Acceptance Criteria

- `getNaturalArtifactAudit('real-fitvely-weekly-body-check')` returns `replace_or_hide_source`.
- `classifyFlowLifecycle` places the route in `hide`.
- Content Lab summary reports `broadRealSourceCount` as `0`.
- Content Lab summary reports `broadRealSourceHiddenSlugs` as `['real-fitvely-weekly-body-check']`.
- Flow Lab shows the active exact-source replacement queue separately from hidden broad-source decisions.
