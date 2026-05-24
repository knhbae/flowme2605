# Representative Route Re-Evaluation Spec

## Goal

Re-evaluate representative/public-MVP candidate routes after the study progress criteria and mobile artifact density work, without changing exposure or claiming validation.

## Product Context

Stage 0 remains export-first. FLOW should help users move external content into calendars, sheets, checklists, and memos before building native long-term record features.

The route labels must stay conservative:

- `representative-eligible` means the route is a strong low-risk example after QA.
- `public MVP candidate` means the route can be tested with guardrails.
- `validated` requires real user behavior data.

## Scope

In scope:

- Recheck `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Record how the mobile density fix affects the candidate decision.
- Update PR history and status documentation.
- Record natural artifact, UX gap, and follow-up decisions.

Out of scope:

- Exposure changes.
- Route content rewrites.
- Automatic study progress generation.
- External app integrations.
- Native FLOW long-term records.
- Login, payment, community, or AI auto-publishing.

## Acceptance Criteria

- The audit explicitly says no route is validated.
- `computer-skills-d30-study` remains representative-eligible, not validated.
- `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails, not representative.
- The merged PR #42 history is updated with merge status, Vercel success, and merge commit.
- `docs:check` passes.
