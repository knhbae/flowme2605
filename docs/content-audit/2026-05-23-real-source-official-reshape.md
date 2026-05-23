# 2026-05-23 Real-Source Official Reshape

This document records the first real-source `reshape_before_featured` reshaping batch after PR #23. The batch focuses on official/service flows where the source is usable, but the current Flow needed stronger memo, log, or comparison artifacts before broader exposure.

## Batch Scope

| Flow | Natural Artifact Simulation | Previous Flow/UX Gap | Content/UX Reinforcement |
| --- | --- | --- | --- |
| `real-qnet-application-examday-check` | User inputs `exam=2026-07-15`, `application deadline=2026-06-10 18:00`, `payment status=done`, `exam site=Seoul`; expected output is an application/payment deadline log plus exam-day record for admission ticket, site, and result date. | The route had an exam-date timeline, but secondary official deadlines were not first-class workbench records. | Reused Q-Net log tables so application, payment, refund/change, admission ticket, exam site, and result date can be exported as rows. |
| `real-childcare-vaccination-visit-prep` | User inputs `visit=4-month vaccination`, `recent symptoms=none`, `questions=post-shot bath`, `next visit=2026-07-05`; expected output is a caregiver visit memo and post-visit observation note. | The route had timeline/checklist structure, but medical questions and observation notes were mixed into generic task text. | Added a childcare visit memo card for purpose/time, symptoms, questions, post-visit observation, and next visit. |
| `real-kdca-travel-health-check` | User inputs `destination=Thailand`, `official check date=2026-06-20`, `consultation=travel clinic`, `recheck=7 days before departure`; expected output is a KDCA confirmation and consultation memo. | The route could schedule travel preparation, but did not preserve the official-check date or consultation decision. | Added KDCA travel-health memo fields for destination, official check date, vaccine/medicine consultation, medicine kit, and recheck date. |
| `real-safe-driving-license-renewal` | User inputs `license=class 2 ordinary`, `expiry=2026-08-31`, `photo=needed`, `pickup=visit`; expected output is a condition comparison table for renewal type, health-check data, materials/fee, and application/pickup route. | The real-source route stayed a flat checklist even though the official guide is condition-driven. | Reused driver-license comparison rows for the real-source safe-driving route. |
| `real-gov24-resident-register-copy` | User inputs `submitter=bank`, `document=copy`, `display=address changes`, `resident number=masked`, `file=PDF saved`; expected output is a submitter/privacy proof memo. | The route named the right administrative actions, but disclosure scope and proof location were not structured user values. | Reused resident-register memo fields for submitter requirement, document kind, display items, disclosure scope, and file location. |
| `real-childcare-support-application-check` | User inputs `child=24 months`, `hours=half day`, `center A/B available slots`, `first visit docs=family certificate + ID`; expected output is a center/eligibility comparison table. | The checklist did not help users compare age eligibility, monthly hours, available centers, and first-visit documents. | Added childcare-support comparison rows for age condition, monthly hours, center slot, and first-visit documents. |

## Source/Risk Boundary

- Official facts stay in each route's `source_title`, `source_url`, item details, and warnings.
- User-entered dates, symptoms, questions, disclosure choices, file locations, and institution comparisons stay in workbench state.
- Childcare and KDCA flows do not create medical advice; they help users record official confirmation dates and questions for professionals.
- The routes remain `reshape_before_featured`; this is execution value hardening, not public representative validation.

## Export Outcome

- Q-Net log values export through the existing workbench log path.
- Childcare, KDCA, and resident-register memo values export through the memo-card workbench path.
- Driver-license and childcare-support comparison notes export through the candidate comparison path.

## Remaining Follow-Up

- Add conditional row filtering when FlowMe supports route-specific user inputs.
- Add multi-anchor deadline handling for Q-Net and KDCA rather than using one timeline anchor plus log rows.
- Review first-screen copy and representative eligibility after enough route-specific workbench fields exist across the remaining `reshape_before_featured` real-source batch.
