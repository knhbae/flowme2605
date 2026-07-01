# My Flow v2 Execution UX Tasks

| Status | Task | Notes |
|---|---|---|
| Done | Planning/spec package | Durable spec and three Korean HTML planning artifacts created. |
| Done | Post-save compact banner | Mini inventory removed. Date-bearing content routes to Today; date-less progress content routes to Flow. |
| Done | Test updates | Post-save expectations now target normal Today/Flow surfaces. Time-dependent calendar test fixed by selecting month explicitly. |
| Done | Status docs | Service structure, spec index, QA, and status note updated. |
| Done | Verification | docs:check, tests, build, targeted E2E, full E2E, mobile simulation, and Vercel preview passed. |
| Done | Figma v2.1 adoption | Flow tab and Today tab were adjusted toward the compact row/detail pattern from the Figma draft. |
| Done | Today v2.1 simplification | Mobile Today now prioritizes one continuation row, nearby next rows, and compact secondary state rows. |
| Done | Flow detail v2.1 simplification | Mobile Flow-tab inline detail now puts Step execution and Item checks first, while memo/source/export remain collapsed support details. |
| Done | Today vs Flow role separation | Today mobile rows are now Step-first execution entries without progress percent bars, while Flow mobile rows stay Flow-first structure/progress entries with next Step preview. |
| Done | Backlog checkpoint | Current progress, pending decisions, and next priorities are summarized in `docs/content-audit/2026-07-01-my-flow-pr-backlog-status-ko.html`. |

## Severity Rules

- P0: User cannot tell what to do after saving.
- P1: User can proceed but must choose between duplicated surfaces.
- P2: Copy, density, or visual hierarchy adds friction.
- P3: polish.

## Deferred Backlog

- Curated source review: re-check the 9 user-selected sources before adding more service-facing content.
- Representative content: keep only 2-3 strong public examples on Home and `/flows`; park weak or legacy candidates.
- Source popularity and trust signals: reviews, usage count, completion signals, original-content engagement, and creator credibility.
- My Flow top frame density: revisit after representative content and real saved-flow data are stable.
- Step scheduling metadata: date, time, repeat, location, URL, and reminder fields should be added progressively without making the Step card heavy.
- Creator publish-side trace: show how source rows become Flow, Step, and Item before publishing.
- Rich bulk edit and before-save Step customization.
- Direct external calendar/todo/sheet integrations.
- Account-backed multi-device saved Flow state.
