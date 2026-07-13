# P23 Lifecycle Closure Simulation

**Date:** 2026-07-13
**Status:** Closed on local MVP baseline `e6b1cf3`
**Scope:** Current `main` after P23-01 through P23-04

## Goal

Verify the completed P23 contracts as one user lifecycle instead of treating each implementation slice as sufficient on its own. The review compares personal drafts with saved source-backed Flow types so that draft-only capability is not reported as product-wide capability.

## Flow Types

1. Anchor timeline: source-backed moving preparation
2. Undated checklist: travel or vehicle checklist
3. Recurring routine: study, workout, or cleaning
4. Ordered mixed plan: personal travel/project draft
5. Record and memo: fridge or household record Flow
6. Personal URL/memo draft

## Classification

- `supported`: the user path and all relevant projections work now
- `hidden`: the behavior works but is hard to discover
- `partial`: it works only for some ingress, ownership, viewport, or destination
- `missing`: no user path exists
- `blocked`: backend, account, source-operation, or policy work must precede it

## Required Comparison

Every scenario records discovery/save, personal values, structure, schedule, execution state, Calendar, portable export, reflection, reuse, source update, persistence, mobile/wide layout, and actual-user observation status.

Automated journeys prove operability and persistence only. They do not prove that a first-time user understands or discovers the path.

## Stop Rule

Only a current Blocking or High finding that breaks the core promise becomes another P23 implementation slice. Medium and Low findings move to the post-P23 backlog unless they can be fixed without expanding the data or interaction model.
