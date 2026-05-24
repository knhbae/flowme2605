# New Car and Diet Guardrail First-Screen Pass

**Date:** 2026-05-24
**Branch:** `codex/newcar-diet-guardrail-first-screen`
**Input audits:** [Representative UX Content Simplification](./2026-05-23-representative-ux-content-simplification.md), [New Car + Diet Risk QA](./2026-05-23-new-car-diet-risk-qa.md)

## Decision

Keep both routes as public-MVP guardrail examples, not representative routes. The change only strengthens the first-screen warning and artifact fit.

| Flow | Decision | First-screen artifact |
| --- | --- | --- |
| `new-car-delivery-check` | Keep public MVP with guardrails. | Handover evidence comparison + hold/signing boundary memo + warning card. |
| `diet-habit-2week` | Keep public MVP with guardrails. | Two-week observation sheet + stop/consult condition + warning card. |

## Natural Artifact Simulations

| Flow | Simulated user values | Natural artifact | Current Flow/UX gap before this batch | Content/UX reinforcement |
| --- | --- | --- | --- | --- |
| `new-car-delivery-check` | `deliveryDate=2026-06-03`, `vehicle=Avante CN7`, proof files `door-scratch-4821.jpg`, `hud-test-20260603.mp4`, dealer memo `repair date will be sent in writing`, boundary `do not sign until repair memo is attached` | Delivery-day evidence sheet plus handover hold memo. | The proof memo existed, but the warning was not close enough to the comparison and memo fields. | Add `인수 전 보류 기준` inside the workbench before the evidence memo and checklist. |
| `diet-habit-2week` | `startDate=2026-06-01`, daily entries `breakfast oatmeal`, `30m walk`, `waist 82cm`, condition `normal`, stop condition `dizziness repeated, stop and consult professional` | Two-week observation sheet plus weekly review memo. | The sheet showed diet/activity/measurement, but the stop/consult condition was not a first-class column. | Rename the sheet to `관찰 기록표` and add `중단/상담 조건` next to the daily observation fields. |

## Source And Risk Boundary

- New-car copy records evidence and a hold boundary; it does not tell the user to accept, reject, or sign.
- Diet copy records observations and stop/consult conditions; it does not prescribe a diet, weight target, or diagnosis.
- Both routes remain in fix/public-MVP guardrail posture until real usage data exists.

## Screenshot Evidence

- `new-car-delivery-check`: [desktop](../screenshots/2026-05-24-new-car-guardrail-first-screen-desktop.png), [mobile](../screenshots/2026-05-24-new-car-guardrail-first-screen-mobile.png)
- `diet-habit-2week`: [desktop](../screenshots/2026-05-24-diet-guardrail-first-screen-desktop.png), [mobile](../screenshots/2026-05-24-diet-guardrail-first-screen-mobile.png)

## Follow-Up

- Use these two routes as sensitive public-MVP controls when evaluating future health/finance/vehicle flows.
- Do not promote either route until event data shows users understand the warning and still export/check successfully.
