# Source Risk Representative Review Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** `docs/ROADMAP.md` Stage 0 content/UX hardening

## Goal

Run the first representative-readiness pass on three routes from the source replacement/risk review queue: `computer-skills-d30-study`, `new-car-delivery-check`, and `diet-habit-2week`. The output is a tracked readiness decision, not an immediate public representative promotion.

## Stage Fit

This belongs in Stage 0 because it protects the public surface from premature promotion. The three routes now have artifact surfaces and item copy, but they still need visible page QA and user behavior evidence before actual representative exposure changes.

## User Need

As the product operator, I need the strongest reshaped routes separated from the remaining fix queue, so that the next validation pass can focus on the routes most likely to become representative or public MVP examples.

## Scope

In:
- Add representative-readiness review records for the first three routes.
- Surface the review counts and route cards in Content Lab.
- Add regression coverage for the decision split and lifecycle hold.
- Document UX review findings and next action.

Out:
- Changing `getRepresentativeFlowSlugs`.
- Changing source-fit decisions to `keep_representative`.
- Promoting health/financial routes to representative exposure.
- Claiming real validation without behavior data.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Product operator opens Flow Lab and sees which route is representative candidate versus public MVP candidate. |
| Completion signal | The three review records are visible in Content Lab and covered by tests. |
| Artifact destination | Computer: calendar + study logs. New car: evidence table. Diet: spreadsheet log. |
| Source/risk boundary | All three remain lifecycle `fix` until final promotion QA. |
| Natural artifact | Review records reuse the PR #25/#26 artifact surfaces and item-copy decisions. |
| Verification | RED/GREEN unit test, docs check, build, and E2E. |

## Acceptance Criteria

- `computer-skills-d30-study` is recorded as `representative_candidate`.
- `new-car-delivery-check` and `diet-habit-2week` are recorded as `public_mvp_candidate`.
- All three still appear in lifecycle fix slugs.
- Flow Lab renders a Representative Readiness section with the three routes.
- Docs explain why actual promotion is held.
