# Common First-Screen Reduction Spec

**Date:** 2026-05-24
**Status:** In progress
**Owner:** Codex
**Related direction:** [Product Principles](../../PRODUCT_PRINCIPLES.md), [Common First-Screen UX Audit](../../content-audit/2026-05-24-common-first-screen-ux-audit.md)

## Goal

Make the shared Flow detail page less busy without changing route content: the first screen should ask for one anchor input, then push the user toward the natural execution artifact rather than a generic progress widget.

## Stage Fit

This is Stage 0 work. It supports open -> anchor input -> copy/export -> check -> feedback by reducing page-level noise. It does not add login, native records, dashboards, integrations, or automatic source ingestion.

## User Need

As a user opening a Flow from outside content, I need to see what I can do now and what artifact I can take away, so I can turn the source into my calendar, checklist, spreadsheet, or memo without learning a complex app screen first.

## Scope

In:
- Remove the duplicate setup-column progress card from the common Flow detail page.
- Keep progress inside the artifact workbench where the user checks items.
- Keep export controls available but framed as a follow-up to checking or editing the execution artifact.
- Record natural artifact simulations for moving, study, and passport routes.
- Add E2E coverage that protects the first-screen hierarchy.

Out:
- No route-specific content reshaping.
- No artifact-specific export button relocation.
- No collapse behavior for "전체 흐름".
- No native FLOW record dashboard.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Enter the route anchor, then work in the visible artifact workbench. |
| Completion signal | User can check/edit at least one artifact row and export or copy the result. |
| Artifact destination | Calendar, checklist text, spreadsheet, or memo outside FLOW. |
| Source/risk boundary | Unchanged by this PR; official and risk-sensitive copy remains route-owned. |
| Natural artifact | Moving calendar/checklist, study calendar/progress sheet, passport submission memo. |
| Verification | RED/GREEN E2E, full tests, docs check, build, browser screenshots. |

## Acceptance Criteria

- The common setup area no longer renders a separate page-level "진행률" card before the artifact.
- The artifact workbench still shows local progress such as `0/24 완료`.
- The save/storage copy remains available near the execution workbench, not as a competing first-screen card.
- `moving-d30-basic` still renders the artifact before "한눈에 보는 전체 루트".
- Documentation records the UX gap and natural artifact simulation.
- Existing representative route E2E tests remain green.
