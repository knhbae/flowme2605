# Real-Source Manual Source-Fit Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** Stage 0 content/source gate hardening

## Goal

Promote the 40 `source_status=real` natural-artifact audits into the same source-fit gate used by representative and `needs_review` routes, so Content Lab, inventory review, lifecycle buckets, and direct-route exposure all read from one manual source-fit decision layer.

## Stage Fit

This is Stage 0 scope because it is a source/content gate, not a platform feature. It does not publish new routes or add new UI surfaces; it clarifies whether existing real-source routes are representative candidates, source-review fixes, or catalog previews.

## User Need

As a FlowMe editor, I need real-source routes to have explicit source-fit decisions, so that exact videos, official pages, broad channel sources, and reshaping candidates are not mixed together as generic derived reviews.

## Scope

In:
- Convert the 40 real-source natural-artifact audit records into source-fit audit records.
- Preserve each route's natural artifact simulation, current gap, next content action, and next UX action.
- Update inventory, lifecycle, Content Lab, tests, and docs counts.

Out:
- No item/content UX reshaping for those 40 routes.
- No representative landing expansion.
- No live source re-fetching.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Editor checks Content Lab source-fit summary and lifecycle bucket. |
| Completion signal | All 40 real-source routes have `getSourceFitAudit(slug)` records. |
| Artifact destination | Source-fit audit summary, inventory counts, lifecycle counts, and docs. |
| Source/risk boundary | Natural-artifact audit remains the source of route-specific artifact/gap evidence; source-fit maps that evidence into exposure handling. |
| Natural artifact | Existing `docs/content-audit/2026-05-22-real-source-natural-artifact-audit.md` simulations are reused. |
| Verification | Unit tests, docs check, build, and Flow Lab E2E. |

## Acceptance Criteria

- Source-fit summary reports 71 audited routes.
- Decision counts are `keep_representative=14`, `reshape_before_featured=50`, `catalog_preview_only=7`, `hide_from_public_catalog=0`.
- Inventory summary reports 71 manual source-fit entries and 0 derived real-source entries.
- Lifecycle counts become `keep=14`, `fix=57`, `preview_only=440`, `hide=0`, `remove_candidate=0`.
- Flow Lab E2E expects the updated manual source-fit count.
