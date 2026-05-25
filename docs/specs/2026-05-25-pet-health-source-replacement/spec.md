# Pet Health Source Replacement Spec

Date: 2026-05-25

## Goal

Replace the broad pet-health FAQ source with an exact official source while preserving catalog-review status.

## User Story

As a FLOW editor, I need `real-pet-health-visit-routine` to cite the exact source that supports hospital visit preparation, so users are not asked to act from a broad registration FAQ.

## In Scope

- Point `real-pet-health-visit-routine` to the 서울시 우리동네 동물병원 official page.
- Change source precision from `broad` to `exact`.
- Keep the route out of representative/public MVP framing.
- Update broad-source guard expectations from 3 to 2.
- Record source limits in audit/docs.

## Out Of Scope

- Full pet-health UX rewrite.
- Medical advice.
- Public promotion.
- Validation claims.
- Direct hospital booking or external app integration.

## Acceptance Criteria

- The route source URL is `https://news.seoul.go.kr/env/archives/567583/`.
- The route source precision is `exact`.
- `getNaturalArtifactAudit('real-pet-health-visit-routine')` remains `keep_catalog_review`.
- Broad-source guard count is 2.
- Remaining broad queue is `real-fitvely-weekly-body-check` and `real-mofa-overseas-travel-prep`.
