# Vehicle Inspection Evidence-First Spec

**Date:** 2026-05-25
**Status:** Implemented
**Owner:** Codex
**Related roadmap:** Stage 0 export-first execution behavior.

## Goal

Make `vehicle-inspection-prep` produce a portable reservation/result memo beside the timeline so the user has evidence and follow-up records, not only checked tasks.

## Stage Fit

This stays inside Stage 0 because it improves exportable checklist/memo output. It does not add official integration, booking automation, legal interpretation, or long-term vehicle records.

## User Need

As a car owner preparing for inspection, I need to store reservation, document, result-sheet, and repair follow-up details, so that I can act after the inspection without relying on generic checklist notes.

## Scope

In:

- Route-specific memo fields for `vehicle-inspection-prep`.
- E2E coverage for the direct route workbench.
- Audit, status, screenshot, and PR history documentation.

Out:

- Booking integration.
- Automatic inspection eligibility judgement.
- Payment or official result lookup.
- Representative/public MVP/validated promotion.

## Acceptance Criteria

- The route exposes memo fields for reservation, documents, precheck evidence, result sheet, and repair follow-up.
- The public route renders those fields inside the artifact workbench.
- The old conversion note no longer says the follow-up memo gap still needs review.
- Docs record that this is not validation.
