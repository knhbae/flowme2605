# FlowMe P25-00B Core Workspace Prototype Decision

**Date:** 2026-07-19
**Status:** closed as the P25 internal implementation baseline
**Selected direction:** option B, whole-Flow workspace
**Runtime/schema change:** none
**Observed-user sessions:** 0

## Open The Prototype

- [Interactive A/B prototype](./prototype.html)
- [Owner review sheet](./owner-review-ko.md)
- [Detailed audit](./audit.md)
- [Structured decision matrix](./decision-matrix.json)
- [Current production captures](./screenshots/current/)
- [Proposed captures](./screenshots/proposed/)

The prototype can switch among six Flow types, nine core surfaces, mobile/wide layouts, and options A/B. Each surface has `유지 / 수정 / 기각` controls and an optional note. Decisions are stored only in the local browser and can be copied as JSON.

## Decision Record

Option A reduces copy and card density while preserving the current route-by-route structure. Option B changes the local product frame:

```text
whole Flow artifact
-> personal adjustment overlay
-> task or occurrence execution
-> Calendar and export projection
```

Option B was adopted as the P25 implementation baseline because the owner explicitly directed the full P25 program to continue and allowed substantial structural changes. The completed P25-08 journey gate then found no remaining automated Blocking or High issue in this frame.

This is an **implementation decision**, not a claim that the owner approved every pixel or that observed users validated the frame. Observed-user sessions remain `0`.

## Recommended Screen Contract

1. Save-before shows the actual whole Flow, then `먼저 조정` or `이 Flow 저장`.
2. Post-save opens the same whole Flow component, not a single Today item.
3. My Flow separates `지금 / 내 Flow / 완료`.
4. Whole Flow uses mobile drill-in and a wide rail/outline/detail workspace.
5. My Flow owns `언제든 할 일`; Calendar owns `일정에 놓기`.
6. Item adjustment defaults to title, when, and personal memo; time and recurrence stay collapsed.
7. Batch mode supports date move, date clear, include/exclude, and selected export.
8. Completion provides immediate undo and persistent reopen.
9. Export chooses scope and expected count before format.

## Current Evidence

- Production URL: `https://flowme2605.vercel.app`
- Current captures: 14
- Proposed screen captures: 24
- Interactive review-shell captures: 2
- Total current/proposed/review captures: 40
- Prototype widths: 390x844 and 1024x768
- Horizontal overflow: 0
- Console errors: 0
- Current production, prototype, and heuristic evidence are not observed-user evidence.

## Final Surface Decisions

| Surface | P25 decision | Deferred refinement |
| --- | --- | --- |
| Save-before | Keep option B structure | Recheck public explanatory-copy density in P26 |
| Post-save | Keep option B structure | None required for P25 |
| My Flow | Keep option B structure | None required for P25 |
| Whole Flow | Keep option B structure | None required for P25 |
| Calendar | Keep option B role split | Recheck 1024px queue/grid/agenda density in P26 |
| Item adjustment | Keep progressive structure | Recheck advanced-editor path length in P26 |
| Batch adjustment | Keep option B structure | None required for P25 |
| Completion/reopen | Keep option B structure | None required for P25 |
| Export | Keep option B structure | None required for P25 |

## Gate

P25-00B is closed as an internal product contract. P25-01 through P25-08 implemented and verified that contract. The three deferred refinements are Medium hypotheses for P26; they do not reopen P25 and must not be described as observed-user findings.
