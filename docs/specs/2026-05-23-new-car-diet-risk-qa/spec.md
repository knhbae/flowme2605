# New Car + Diet Risk QA Spec

## Scope

Run focused public-MVP risk QA for:

- `new-car-delivery-check`
- `diet-habit-2week`

This is not representative promotion. Both routes remain lifecycle `fix` until real user behavior data and broader page QA justify stronger exposure.

## User Jobs

| Flow | User need | Primary destination | Sensitive boundary |
|---|---|---|---|
| `new-car-delivery-check` | Record delivery-day defects, photo filenames, dealer confirmation, and handover boundary before signing. | Evidence sheet + memo | FLOW records evidence; it does not decide whether to sign or accept delivery. |
| `diet-habit-2week` | Observe two weeks of meals, activity, measurement, condition, and weekly patterns without a diet prescription. | Observation sheet | FLOW records patterns and stop conditions; it does not prescribe diet, diagnose, or promise weight loss. |

## Acceptance

- New-car workbench exposes a proof memo next to the decision table.
- Diet spreadsheet workbench shows warning/observation framing before weekly review.
- Export tests preserve realistic evidence and observation values.
- E2E test simulates user input and xlsx downloads for both routes.
- Desktop/mobile screenshots are recorded.
- Content Lab summary exposes risk-boundary QA records while both routes stay out of representative keep.
