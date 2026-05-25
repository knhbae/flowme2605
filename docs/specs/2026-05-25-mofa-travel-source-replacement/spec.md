# MOFA Travel Source Replacement Spec

Date: 2026-05-25

## Goal

Replace the broad MOFA travel safety portal source with an exact country-level official source while preserving reshape status.

## User Story

As a FLOW editor, I need `real-mofa-overseas-travel-prep` to cite the exact country page used by the Flow scenario, so users can export safety checks and emergency contact memos without guessing which source page to use.

## In Scope

- Point `real-mofa-overseas-travel-prep` to the MOFA Vietnam country page.
- Change source precision from `broad` to `exact`.
- Keep the route out of representative/public MVP framing.
- Update broad-source guard expectations from 2 to 1.
- Record source and UX limits in audit/docs.

## Out Of Scope

- Destination auto-detection.
- Direct MOFA integration.
- Public promotion.
- Validation claims.
- Full travel UX rewrite.

## Acceptance Criteria

- The route source URL is `https://www.0404.go.kr/ntnSafetyInfo/86/detail`.
- The route source precision is `exact`.
- `getNaturalArtifactAudit('real-mofa-overseas-travel-prep')` remains `reshape_content_or_ux`.
- Broad-source guard count is 1.
- Remaining broad queue is `real-fitvely-weekly-body-check`.
