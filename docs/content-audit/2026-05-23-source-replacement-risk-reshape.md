# 2026-05-23 Source Replacement And Risk Reshape

This document converts the manual follow-up items from [2026-05-23-source-replacement-risk-review-batch.md](./2026-05-23-source-replacement-risk-review-batch.md) into implemented artifact surfaces. These routes remain direct-accessible `reshape_before_featured` content; the batch improves execution fidelity but does not mark them validated.

## Implemented Surfaces

| Flow | Natural artifact simulation | Current Flow/UX gap addressed | Content/UX reinforcement |
| --- | --- | --- | --- |
| `computer-skills-d30-study` | `exam=2026-07-18`, `weekday=90m`, `weak=Access` creates a D-30 calendar plus chapter-progress and mock-score logs. | The previous timeline did not capture score trend, wrong-answer type, or practical-file readiness. | Reused study log tables so the route can track scope, mock scores, wrong-answer counts, and retake notes. |
| `diet-habit-2week` | `start=2026-06-01`, `goal=late-night snacking`, `activity=20m walk` creates a two-week food/activity/condition sheet. | The routine-first UI made the route feel like a prescription instead of observation. | Routed the flow to a spreadsheet-first surface for daily food, exercise, measurement, condition, and review notes. |
| `new-car-delivery-check` | `delivery=2026-06-20`, `model=Avante Hybrid`, `options=sunroof/HUD` creates an inspection evidence table. | The old source fit was weak and the UI did not emphasize defect proof before signing. | Added a new-car defect/option/document/dealer-confirmation decision table and allows memo fields beside decision tables. |
| `year-end-tax-docs` | `companyDeadline=2026-01-23`, `family=spouse/child`, `extra=rent/donation` creates a company-submission memo. | The route needed official schedule and deduction-caution separation. | Added deadline, final-data date, extra proof, deduction caution, and submission-status memo fields. |
| `diet-meal-exercise-log` | `start=2026-06-03`, `duration=14d`, `activity=20m walk` creates a food/activity/condition observation sheet. | Warning and record purpose were not prominent enough. | Routed to the same sheet-first surface so the export reads as observation, not diet advice. |
| `diet-reset-2week` | `start=2026-06-10`, `pattern=snack/late meal`, `replacement=water/walk` creates a reset observation sheet and review note. | The flow could read like a short-term weight-loss promise. | Routed to sheet-first recording so maintainable rules can be reviewed from actual daily rows. |
| `business-registration-basic` | `type=online retail`, `place=home`, `permit=mail-order check` creates a filing-prep memo. | The route needed clearer separation between prep tasks and tax/permit judgment. | Added official-question, workplace proof, permit, Hometax/tax-office question, and submission-proof fields. |
| `happy-birth-service-check` | `birth=2026-06-04`, `area=Seoul Mapo`, `account=parent benefit account` creates a family-info memo. | Region and household conditions involve sensitive family data and official eligibility checks. | Added family-info caution fields for birth date, region, guardian account, official questions, and submission proof. |
| `industrial-accident-claim-docs` | `accident=2026-05-12`, `claim=medical expense`, `receipts=3` creates an evidence/amount memo. | Amount tracking and benefit-eligibility boundaries were weak. | Added claim type, receipt files, amount, official questions, and supplement-request status fields. |
| `national-health-checkup-d7` | `checkup=2026-06-19`, `sedation=yes`, `medicine=blood pressure` creates a D-7 prep calendar plus medical question memo. | Fasting, medicine, and endoscopy notes could read like medical instruction. | Added institution/clinician confirmation fields for medication, fasting, transport, and result method. |
| `vaccination-certificate-issue` | `submitTo=childcare center`, `target=child`, `language=Korean` creates a certificate submission memo. | Missing-record handling and submitter requirements needed structure. | Added target, language, submission requirement, missing-record official check, and file-location fields. |
| `job-change-risk-check` | `resign=2026-06-30`, `join=2026-07-15`, `gap=14d` creates a company/public-insurance/personal-budget memo. | Labor and financial advice boundaries were too implicit. | Added company question, public insurance, retirement-pay, gap budget, and decision-boundary fields. |

## Verification Intent

- Tests assert the implemented field IDs for route-specific logs, comparison rows, and memo cards.
- Tests assert spreadsheet-first routing for the three diet observation flows.
- Decision-table routes can now show route-specific memo-card fields as a sibling panel, so risk notes can sit next to comparison rows without hiding the checklist.
