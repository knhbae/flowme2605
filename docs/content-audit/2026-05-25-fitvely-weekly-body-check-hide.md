# FITVELY Weekly Body Check Hide Decision

Date: 2026-05-25
Route: `real-fitvely-weekly-body-check`

## Decision

`real-fitvely-weekly-body-check` is no longer treated as active source-replacement work. It is a hidden broad-source decision until a matching FITVELY weekly body-check or check-in source is found.

The route remains broad in metadata because the current source is still the FITVELY site, not a route-level original.

This does not validate, promote, or rewrite the route.

## Why

The intended natural artifact would be a weekly measurement sheet plus next-week adjustment memo. That artifact needs source-backed measurement fields, photo conditions, review cadence, and adjustment criteria.

The current broad FITVELY site does not verify those details. Searches on 2026-05-25 found FITVELY/핏블리 brand pages and unrelated body-measurement resources, but did not confirm a matching FITVELY weekly body-check/check-in source. FLOW should not invent the missing method.

## Natural Artifact Simulation

- User input: weekly check day, weight, waist, photo location, workout count, diet adherence, condition note.
- Expected external artifact: spreadsheet rows by week plus a memo for what to keep, change, or hold next week.
- Current gap: the Flow implies a weekly body-check method without a confirmed source for the exact fields or interpretation.
- Export-first fit: strong only after exact source confirmation; weak while the method is inferred.

## Content Action

Hide or remove this route from active source-replacement work unless a matching FITVELY source is found. If a source is found later, create a new small replacement batch and keep the route below public MVP/representative framing until source-specific artifact rows are reviewed.

## Verification

- RED: targeted tests failed while the route remained active broad-source/fix.
- GREEN: targeted tests passed after moving it to hidden broad-source decisions.
