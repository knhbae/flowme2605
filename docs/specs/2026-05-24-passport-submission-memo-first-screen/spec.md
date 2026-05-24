# Passport Submission Memo First-Screen Spec

**Date:** 2026-05-24
**Status:** In Progress
**Owner:** Codex
**Related audits:** [Representative UX Content Simplification](../../content-audit/2026-05-23-representative-ux-content-simplification.md)

## Goal

Make `passport-renewal-docs` start with a portable submission memo instead of a generic checklist.

## Stage Fit

This is Stage 0 work because the user still records the result in their own memo app, file folder, or printed checklist. FLOW only helps shape the output before export and does not become the user's passport record system.

## User Need

As a user preparing a passport renewal, I need one compact memo for travel timing, photo readiness, application proof, and pickup/storage details, so I can check official pages and then keep the practical result somewhere I already use.

## Scope

In:
- Promote the passport route's first artifact from checklist to memo card.
- Add passport-specific memo fields for applicant context, photo check, old passport status, application proof, and pickup/storage.
- Keep the checklist as the secondary execution surface.
- Add unit, E2E, screenshot, and documentation evidence.

Out:
- No official eligibility advice beyond pointing users back to official guidance.
- No representative promotion.
- No native passport vault, reminder integration, or document upload feature.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Fill a short submission memo before checking individual tasks. |
| Completion signal | User can export or copy the memo after recording official proof and pickup/storage details. |
| Artifact destination | Memo app, Notion, file note, or printed checklist. |
| Source/risk boundary | Official source remains separate; FLOW records the user's checked values, not eligibility guarantees. |
| Natural artifact | Passport renewal submission memo with realistic travel date, photo check, receipt number, and pickup storage values. |
| Verification | RED/GREEN unit tests, E2E first-screen test, build, docs check, screenshots. |

## Acceptance Criteria

- `passport-renewal-docs` returns `memo_card` as the primary artifact surface.
- The first-screen surfaces are `memo_card` followed by `execution_list`.
- The memo card exposes `여행일·신청자·신청 경로`, `사진 규격 확인`, `기존 여권 상태`, `접수번호·상태 캡처`, and `수령일·보관 위치`.
- The route keeps `memo` as an export target.
- Desktop and mobile screenshots show the memo card before the checklist.
