# Broad Source Code Guard

Date: 2026-05-25
Related audit: [Broad Source Route Review](./2026-05-25-broad-source-route-review.md)

## Decision

The broad-source editorial rule now has a Content Lab summary guard. The summary counts all current real-source routes whose source precision is `broad` and reports any broad route that leaks into the lifecycle `keep` bucket.

Current result:

- Broad real-source routes: 1
- Representative/lifecycle keep leaks: 0

## Why

The document-only audit prevents editorial confusion, but it does not stop future code or seed changes from accidentally treating broad channel/site routes as representative-ready. The guard makes the risk queryable from Content Lab data and adds regression coverage.

## Guarded Route List

- `real-fitvely-weekly-body-check`

## Implementation Notes

- `getContentLabSummary` now returns:
  - `broadRealSourceCount`
  - `broadRealSourceSlugs`
  - `broadRealSourceRepresentativeLeakSlugs`
- The leak list is computed by intersecting real+broad routes with lifecycle `keep` slugs.
- This is a guardrail only. It does not change route exposure or hide direct routes.

## Verification

- RED: `npm test -- lib/flow/content-lab.test.ts` failed because `broadRealSourceSlugs` was not exposed.
- GREEN: `npm test -- lib/flow/content-lab.test.ts` passed after adding summary fields.

## Follow-Ups

1. If a broad source route receives an exact route-level source, update the route metadata and revise the expected broad-source list.
2. If Content Lab UI needs a visible internal panel, render the summary fields without changing public route exposure.

## Updates

- 2026-05-25: The two ThankyouBUBU channel routes received exact YouTube source replacements. The guard now tracks the remaining five broad routes.
- 2026-05-25: `real-fitvely-diet-record-routine` received an exact FITVELY nutrition video source. The guard now tracks the remaining four broad routes.
- 2026-05-25: `real-sinagong-computer-d30-study` received an exact Gilbut/Sinagong book source. The guard now tracks the remaining three broad routes.
- 2026-05-25: `real-pet-health-visit-routine` received an exact 서울시 우리동네 동물병원 official source. The guard now tracks the remaining two broad routes.
- 2026-05-25: `real-mofa-overseas-travel-prep` received an exact 외교부 베트남 국가/지역별 정보 source. The guard now tracks the remaining one broad route.
