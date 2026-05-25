# Mobile Simulation Protocol Spec

Date: 2026-05-25

## Goal

Create a repeatable mobile simulation protocol so internal reviewers can rehearse the three current candidate routes consistently while user recruiting is limited.

## Scope

- Add protocol records for `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check`.
- Expose route count, average score, validation count, and route records in Content Lab / Flow Lab.
- Keep the output explicit that internal simulation is not user validation.
- Document pass/failure signals and next observed-session action.

## Non-Goals

- No route promotion or exposure change.
- No validated claims.
- No automatic progress generation.
- No external app integration.
- No native long-term FLOW records.

## UX Decision

The useful substitute for unavailable recruits is not a vague expert review. It is a scripted mobile rehearsal with concrete task steps, artifacts, pass signals, failure signals, and a next evidence step.

The three routes remain:

- `computer-skills-d30-study`: representative-eligible, not validated.
- `diet-habit-2week`: public MVP candidate with guardrails, not validated.
- `new-car-delivery-check`: public MVP candidate with guardrails, not validated.

## Evidence Boundary

Internal simulation can identify gaps and prepare observed sessions. It cannot prove that users will understand, export, or act on the Flow.

