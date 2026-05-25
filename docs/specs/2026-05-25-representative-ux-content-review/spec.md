# Representative UX Content Review Spec

Date: 2026-05-25

## Goal

Create a current, test-backed UX/content review queue for the three representative/public-MVP candidates before deeper route rewrites.

## Routes

- `computer-skills-d30-study`
- `diet-habit-2week`
- `new-car-delivery-check`

## In Scope

- Record simulated user run notes for first action, natural output, current UX gap, content rewrite priority, export-first fit, mobile density risk, source/risk separation, next small fix, and status.
- Keep `computer-skills-d30-study` as representative-eligible, not validated.
- Keep `diet-habit-2week` and `new-car-delivery-check` as public MVP candidates with guardrails, not representative and not validated.
- Surface the queue in Flow Lab for editors.
- Add unit and E2E coverage.

## Out Of Scope

- Full route rewrite.
- Public exposure change.
- Real-user validation claims.
- Native execution records, direct integrations, or auto generation.

## Acceptance Criteria

- Summary covers exactly the three current candidate routes.
- `computer-skills-d30-study` is `ready_for_observed_session`.
- `diet-habit-2week` and `new-car-delivery-check` are `needs_guardrail_rewrite`.
- Each review records a concrete external artifact and a source/risk boundary.
- Flow Lab shows the new review queue.
