# Study Source-Derived Guard And Validation Status

Date: 2026-05-25

## Scope

This audit records a small guardrail for `computer-skills-d30-study` and the status language that should be used after the representative route review.

## User Simulation

Route: `computer-skills-d30-study`

Simulated user action:

- Open the route.
- Keep the source-derived chapter row for week 1.
- Add a target date of `2026-06-01`.
- Mark status as `reviewed`.
- Export the workbook.

Expected natural artifact:

- A sheet row keeps the original source-derived study scope.
- The user date and status are carried into the export.
- A user override to the source scope is ignored in export output.

## UX Gap Closed

Before this guard, the progress table could be interpreted as a blank tracker if a user or future UI path overwrote the source scope field. The route now records metadata that separates source-derived columns from user-editable fields.

## Current Status

`computer-skills-d30-study` remains representative-eligible, not validated. It has internal QA and source-derived study table behavior, but no real target-user behavior data yet.

## Follow-Up

- Make the read-only/source-derived state visible in copy or disabled input behavior if mobile study UX still feels like user-authored table design.
- Keep validation language tied to user behavior evidence, not internal QA.
