# New Car and Diet Guardrail First-Screen Spec

**Date:** 2026-05-24
**Status:** In Progress
**Owner:** Codex
**Related audits:** [Representative UX Content Simplification](../../content-audit/2026-05-23-representative-ux-content-simplification.md), [New Car + Diet Risk QA](../../content-audit/2026-05-23-new-car-diet-risk-qa.md)

## Goal

Make the two public-MVP guardrail routes clearer on the first execution screen without promoting them to representative status.

## Stage Fit

This is Stage 0 work because it tightens the export-first execution surface and risk boundary before adding features. It does not introduce native records, integrations, purchase advice, health advice, or representative claims.

## User Need

As a user, I need sensitive routes to show exactly what I should record and when to stop or defer a decision, so I can move the output into my own sheet or memo without mistaking FLOW for expert advice.

## Scope

In:
- Put a visible new-car handover warning inside the execution workbench.
- Keep new-car photo/dealer/signing-boundary memo fields before checklist density.
- Rename the diet sheet surface as an observation log.
- Add a diet `중단/상담 조건` column on the first sheet preview.
- Record natural artifact simulations, screenshots, tests, and PR history.

Out:
- No representative promotion.
- No purchase recommendation, health coaching, or automatic diagnosis.
- No new third-party service integration.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | New-car: compare handover evidence and record a hold boundary. Diet: enter start date and fill observation/stop-condition rows. |
| Completion signal | User can export the evidence memo or observation sheet after checking one item. |
| Artifact destination | New-car: sheet + memo. Diet: observation sheet + weekly memo. |
| Source/risk boundary | Warning stays inside the execution workbench, close to user-entered records. |
| Natural artifact | Delivery evidence sheet and two-week observation sheet use realistic simulated values. |
| Verification | E2E guardrail test, risk-boundary export test, build, docs check, full test suite, screenshots. |

## Acceptance Criteria

- `new-car-delivery-check` workbench shows `인수 전 보류 기준` before the evidence memo/checklist.
- `new-car-delivery-check` still exposes `인수 보류/서명 경계 메모`.
- `diet-habit-2week` workbench shows `관찰 기록표`.
- `diet-habit-2week` first sheet preview includes `중단/상담 조건`.
- Existing new-car/diet export E2E still passes.
