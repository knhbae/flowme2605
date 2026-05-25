# FITVELY Diet Source Replacement Spec

Date: 2026-05-25

## Goal

Replace the FITVELY diet-record route's broad site source with an exact original video source, while keeping the weekly body-check route broad until a matching source exists.

## User Story

As a FLOW editor, I need diet-record routes to identify the exact nutrition source, so users know which rule they are turning into a sheet or memo.

## In Scope

- Replace `real-fitvely-diet-record-routine` source metadata with exact FITVELY YouTube video metadata.
- Keep `real-fitvely-weekly-body-check` broad.
- Update natural-artifact audit, source-fit count, broad guard count, artifact-plan tests, Flow Lab E2E expectations, status, audit docs, and PR history.

## Out Of Scope

- Weekly body-check source invention.
- Diet outcome claims.
- Full nutrition calculator.
- Native long-term diet record storage.
- Public MVP or representative promotion.
- Validation claims.

## Acceptance Criteria

- `real-fitvely-diet-record-routine` has `source_precision: exact`.
- Its `source_url` is `https://www.youtube.com/watch?v=qcTxaFMWzKs`.
- Its natural-artifact decision is `reshape_content_or_ux`.
- `real-fitvely-weekly-body-check` remains `source_precision: broad`.
- Broad real-source guard count is 4 and representative leaks remain 0.
