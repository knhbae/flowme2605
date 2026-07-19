# FlowMe P25-00B Core Workspace Prototype Decision

**Date:** 2026-07-19
**Status:** prototype and internal simulation complete; owner screen decisions pending
**Recommended direction:** option B, whole-Flow workspace
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

## Decision To Make

Option A reduces copy and card density while preserving the current route-by-route structure. Option B changes the local product frame:

```text
whole Flow artifact
-> personal adjustment overlay
-> task or occurrence execution
-> Calendar and export projection
```

Option B is recommended because the owner feedback is not limited to visual polish. The current product makes a Today row stand in for the saved result, exposes fields before user intent, and mixes undated execution with Calendar placement.

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

## Gate

The prototype package is ready, but P25-00B is not fully closed until the owner records keep/change/reject for the nine surfaces. Correctness work in P25-01A may proceed independently; runtime workspace implementation in P25-02 waits for the frame decision.
