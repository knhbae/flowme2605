# Tasks

**Spec:** [FlowMe Platform Feature Planning From Reference Research](./spec.md)  
**Date:** 2026-06-24

## Completed In This Planning Pass

| Status | Task | Evidence |
| --- | --- | --- |
| Done | Reviewed current FlowMe product constraints | `docs/PRODUCT_PRINCIPLES.md`, `docs/DECISIONS.md`, source-backed baseline spec |
| Done | Researched reference platform patterns | Official docs linked in `spec.md` |
| Done | Defined feature slices from reference patterns | `spec.md` next feature slices |
| Done | Kept Stage 0 and validation boundary explicit | `spec.md`, HTML report |

## P0 - Next Implementation Candidate

**2026-06-24 update:** local draft baseline implemented. This proves the creator/public/user surface split and source-row-to-Step editing loop in code, but it is not yet production persistence or a real publish workflow.

| Priority | Task | Why | Done when |
| --- | --- | --- | --- |
| P0 | Creator source-row editor and version review | FlowMe is a creator platform; source-row review without editing is not enough. | Local draft editor exists for generated Step title, Item fallback, source URL, destination, creator note, blockers, and draft version without changing published user screens. |

## P0 Implementation Baseline

| Status | Task | Evidence |
| --- | --- | --- |
| Done | Expose creator draft metadata from the source-backed Flow Map package | `lib/flow/source-backed-my-flow.ts` |
| Done | Expose source row vs generated Step/Item comparison fields | `lib/flow/source-backed-my-flow.ts` |
| Done | Route creator pages to a separated source-row draft editor | `app/flow-maps/[map]/creator/page.tsx`, `components/flow/SourceBackedFlowMapCreatorEditor.tsx` |
| Done | Save draft edits locally without mutating public/user screens | `flow:map:creator-draft:{mapId}` localStorage contract |
| Done | Add stable e2e hooks for draft note/save and mobile row selection | `components/flow/SourceBackedFlowMapCreatorEditor.tsx`, `tests/e2e/flow-mvp.spec.ts` |
| Done | Verify unit, docs, build, e2e, and browser interaction | See `qa.md` execution log |
| Not done | Persist creator draft to account storage | P2 production persistence |
| Done | Publish/apply draft into a local creator publish marker | `flow:map:published-local:{mapId}` localStorage contract, creator page publish CTA |
| Not done | Publish draft into account-backed public map version | P2 production persistence and server-side publish workflow |

## P1 - Follow-Up

**2026-06-24 update:** saved map update compare/apply local bridge implemented. Users can open a compact comparison and mark the saved map snapshot as current without mutating checked child Flow state. This is still localStorage-backed.

| Priority | Task | Why | Done when |
| --- | --- | --- | --- |
| P1 | Saved map update compare/apply | Current notice is understandable but not actionable beyond review/dismiss. | User can compare saved vs current map and apply the new snapshot without silent Step/check mutation. |
| P1 | Step-level calendar/task fields | Step should behave like a portable calendar/todo unit. | Step detail supports date/time/repeat/location/memo/source URL with progressive disclosure. |
| P1 | High-volume My Flow management | Users may save many Flows and maps. | Search/filter/hide works without making Today/Calendar review dashboards. |

## P1 Implementation Baseline

| Status | Task | Evidence |
| --- | --- | --- |
| Done | Expand update notice into compare/apply surface | `components/flow/AppClient.tsx` |
| Done | Show saved/current versions, affected Flow rows, Step count changes, source checked date changes | `components/flow/AppClient.tsx` |
| Done | Apply new source-backed map snapshot without changing saved child Flow records | `components/flow/AppClient.tsx`, `tests/e2e/flow-mvp.spec.ts` |
| Done | Add missing child Flow records when an applied map update includes a Flow not currently saved | `components/flow/AppClient.tsx`, `tests/e2e/flow-mvp.spec.ts` |
| Done | Keep dismiss flow for users who do not want to review now | `tests/e2e/flow-mvp.spec.ts` |
| Done | Step detail stores portable calendar/task fields locally | date overrides, time, repeat preset, location, memo, source/detail link surface in `components/flow/AppClient.tsx` |
| Done | High-volume Flow inventory supports lightweight hide/restore | Flow inventory hide state and hidden filter in `components/flow/AppClient.tsx` |
| Not done | Row-level conflict merge editor | Requires account-backed versions and per-row published IDs |
| Not done | Account-backed update history | P2 production persistence |

## P2 - Later

| Priority | Task | Why | Done when |
| --- | --- | --- | --- |
| P2 | Account persistence | localStorage bridge is not a service persistence model. | Stable DB records exist for saved maps, Step state, update dismissals, and creator versions. |
| P2 | Footprint logging | Real validation needs behavior evidence. | Open/save/export/check/return/source-link events are recorded with privacy boundaries. |
| P2 | Creator catalog/channel surface | Useful after creator production workflow is credible. | Creator can manage multiple published maps without user app becoming a marketplace. |

## Not Doing Yet

- Marketplace, payments, community.
- AI auto-publish.
- Full Jira-like hierarchy controls.
- Full Notion-style database builder.
- LMS-grade quizzes, scores, certificates, or learner analytics.
