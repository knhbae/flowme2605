# Validation Fix Batch

Date: 2026-05-26

## Source

This batch implements the first pass from the uploaded `docs/flowme.zip` design review bundle. The zip lives on `origin/main`; this branch applies the actionable PR-1 through PR-4 items without adding direct integrations or validation claims.

## Implemented

| Area | Change |
|---|---|
| Route setup anchors | Added `setup_anchor_label` and `setup_anchor_hint` metadata for the 11 routes in `docs/validation-sessions/TESTABLE_CONTENT.md`. |
| Study route sectioning | Split the `computer-skills-d30-study` D-1 item into its own `D-1 최종 확인` section instead of keeping it under the D-7 group. |
| Diet safety boundary | Moved `diet-habit-2week` stop/consult guidance out of checklist items and into `stop_conditions` plus `principles` panels. |
| New-car hold criteria | Added a `hold_section` for `new-car-delivery-check` with reasons, consequence copy, and a memo template. |
| Mobile sticky CTA | Replaced the generic sticky fallback label with route/destination labels such as `시트·캘린더로 받기`, `관찰표 .xlsx 받기`, and `증거표 .xlsx 받기`. |

## Boundary

These changes improve Stage 0 observed-session readiness. They do not validate any route, do not add Google/calendar account integrations, and do not decide health, vehicle, travel, or official-document outcomes for the user.

## Verification

- `npx tsx --test lib/flow/seed-flows.test.ts`
- `npm run build`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile export sheet remains|validation fix surfaces|mobile workbench exposes"`
