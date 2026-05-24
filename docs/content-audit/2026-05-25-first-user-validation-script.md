# First User Validation Script Audit

Date: 2026-05-25

## Scope

This docs-only audit adds a practical observation script for the next evidence step after the representative/public-MVP route cleanup.

## Routes Covered

- `computer-skills-d30-study`
- `diet-habit-2week`
- `new-car-delivery-check`

## Why Now

Recent work improved export-first artifacts, mobile density, source-derived study rows, and route status language. The remaining gap is not another feature. The next product question is whether target users can complete the open -> setup -> artifact -> export/copy -> outside-use loop.

## Output

The script defines:

- Common observations for every route.
- Route-specific user tasks.
- Evidence needed before stronger status language.
- Fail signals that should keep the route in fix/review.
- Decision labels that avoid calling a route validated too early.

## Status Impact

No route status changes. `computer-skills-d30-study` remains representative-eligible, while `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails. None are validated.
