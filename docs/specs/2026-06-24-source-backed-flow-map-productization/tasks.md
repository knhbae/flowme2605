# Tasks

**Spec:** [Source-backed Flow Map Productization Baseline](./spec.md)  
**Date:** 2026-06-24

## Completed In The Current Baseline

| Status | Task | Evidence |
| --- | --- | --- |
| Done | Source-backed map registry covers three representative cases | `lib/flow/source-backed-my-flow.ts` |
| Done | Public Flow Map save writes child Flow records | `/flow-maps/[map]` path and source-backed Playwright tests |
| Done | Parent saved map snapshot exists | `buildSourceBackedFlowMapSavedSnapshot` |
| Done | Productization persistence record exists next to the compatibility snapshot | `buildSourceBackedFlowMapPersistenceRecord`, `flow:map:persistence:{mapId}` |
| Done | Official date windows stay one Step | `FlowItem.date_window` and export tests |
| Done | My Flow can render saved source-backed records | `/my` source-backed route path and E2E tests |
| Done | My Flow separates ready content from review/legacy content in Flow inventory | `my-flow-ready-section`, `my-flow-review-section`, source-backed readiness E2E |
| Done | Calendar selected-date detail groups Steps by Flow Map or Flow | `my-flow-selected-date-group`, source-backed moving mobile E2E, mobile screenshot |
| Done | Calendar scope filter reduces mixed schedule/routine crowding only when useful | `my-flow-calendar-scope-filter`, `my-flow-calendar-scope-routine`, focused calendar E2E |
| Done | Saved map update notice appears without auto-applying changed source maps | `my-flow-map-update-review`, `my-flow-map-update-dismiss`, source-backed update-review E2E |
| Done | Creator source-row review shows generated Step/Item readiness | `creator.sourceRows.reviewStatus`, `detailItems`, creator page E2E |
| Done | Mobile post-save calendar navigation is checked | source-backed moving mobile Playwright screenshot |

## P0 - Next Product Slice

| Priority | Task | Why | Done when |
| --- | --- | --- | --- |
| P0 | Define production-safe Flow Map persistence shape | The current registry is a bridge. Product code needs a stable parent/child contract before more UI grows. | V1 bridge contract added. Final DB schema still pending. |
| P0 | Separate ready source-backed content from review/legacy content in My Flow | Users should not see accepted source-backed records at the same confidence level as older PoC fixtures. | Done for Flow inventory. Today/Calendar intentionally remain execution-first. |
| P0 | Keep creator/public/My Flow/review surface boundaries enforced | Past failures came from mixing review copy into user screens. | User routes contain no review/scoring/dev copy; creator routes contain source-row prep; review docs stay separate. |

## P1 - Follow-Up Product Slice

| Priority | Task | Why | Done when |
| --- | --- | --- | --- |
| P1 | Creator source-row review before editing | A creator needs to see how their source rows become Steps before publishing. | V1 review is done: source rows show Step, Item fallback, source/risk, and readiness. Editing/version review remains pending. |
| P1 | Creator source-row editing and version review | Review alone is not enough for a real creator workflow. | Creator can edit source rows, Step titles, Item fallback, source links, and publish blockers, with immutable version handling. |
| P1 | Saved map update review UI | Official/sensitive maps need review before applying source changes. | V1 notice + dismiss done: saved map version mismatch produces an understandable Flow-tab review state, can be hidden for the same saved/current version pair, and does not silently mutate saved Steps. Apply/row compare remains pending. |
| P1 | Calendar crowding and mixed map display rules | Multiple maps can create many dated Steps. | V1 done for selected-day detail and compact scope filters: Steps group by saved map or Flow, single-Flow maps hide duplicate Flow/progress chips, and mixed calendars can narrow to schedule/routine/map rows. Higher-volume search remains later. |

## P2 - Later

| Priority | Task | Why | Done when |
| --- | --- | --- | --- |
| P2 | Event/footprint logging | Real validation needs behavior data. | The route records open, setup, save, Step open/check, source link, memo, and return signals. |
| P2 | First-class creator catalog or channel surface | Only useful after creator publishing behavior is credible. | Creator can publish and manage multiple maps without turning the user product into a marketplace first. |
| P2 | More category expansion | More examples are useful only after the three-case baseline is clean in product code. | New categories use the same source-backed gate without adding generic filler. |

## Out Of Scope For This Spec

- Payment, marketplace, profiles, community, recommendation graph.
- AI automatic publication.
- Raw ICS editor on every Step.
- A new visible data model in My Flow beyond the working hierarchy.
