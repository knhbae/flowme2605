# Representative UX Content Simplification Audit

**Date:** 2026-05-23
**Branch:** `codex/representative-ux-content-audit`
**Principle:** FLOW starts as an export-first action compiler for a user's existing calendar, checklist, spreadsheet, or memo. Native FLOW records come later after repeat behavior is proven.

## Executive Decision

Do not add more major features yet. The next product improvement should reduce first-screen complexity and make each Flow's primary artifact obvious within 10 seconds.

The sample covers 7 routes:

| Flow | Destination | Decision | Why |
| --- | --- | --- | --- |
| `moving-d30-basic` | Hybrid | Keep simple | Best reference for a clean D-day calendar plus sheet path. |
| `baby-food-menu-recipe` | Hybrid | Simplify first screen | Meal/recipe richness should not appear before reaction log and allergy-watch job. |
| `passport-renewal-docs` | Memo | Keep simple | Official document route should stay memo/checklist first. |
| `used-car-buying-check` | Sheet | Simplify first screen | Candidate comparison should dominate before generic checklist density. |
| `computer-skills-d30-study` | Hybrid | Keep simple | Representative control route for calendar plus score sheet. |
| `new-car-delivery-check` | Sheet | Public MVP with guardrails | Evidence sheet and handover memo are useful, but signing advice must remain out of scope. |
| `diet-habit-2week` | Sheet | Public MVP with guardrails | Observation sheet is useful, but health warning and no-prescription boundary must stay visible. |

## Natural Artifact Simulation Summary

| Flow | Simulated user values | Natural artifact | Current Flow/UX gap | Content/UX reinforcement |
| --- | --- | --- | --- | --- |
| `moving-d30-basic` | `moveDate=2026-06-27`, `leaseType=jeonse`, `moveType=packed move` | D-30 calendar plus vendor/proof sheet | Extra platform explanation would make a simple timeline feel heavier than a calendar app. | Keep move date, D-30 calendar, next checklist item, and export first. |
| `baby-food-menu-recipe` | `startDate=2026-06-01`, `babyAge=6 months`, `newIngredient=broccoli` | Meal calendar plus reaction log sheet | Recipe detail can compete with the first job. | Put meal slot, reaction log, and allergy-watch caution before recipe detail. |
| `passport-renewal-docs` | `travelDate=2026-08-15`, `applicant=adult renewal`, `submissionPlace=local passport office` | Submission requirement memo plus official checklist | Calendar should not compete unless there is a deadline. | Keep official source, applicant context, and memo/checklist first. |
| `used-car-buying-check` | `candidateA=2020 Avante`, `candidateB=2019 K3` | Candidate comparison sheet plus inspection checklist | Checklist and comparison can compete even though the first decision is candidate choice. | Show comparison rows and hold/buy memo before the longer checklist. |
| `computer-skills-d30-study` | `examDate=2026-06-22`, `weakArea=spreadsheet functions` | D-30 calendar plus chapter/score sheet | A native study dashboard would blur the export-first value. | Keep calendar, chapter table, mock-score sheet, and export as the core. |
| `new-car-delivery-check` | `deliveryDate=2026-06-03`, `vehicle=Avante CN7`, `dealer=Mapo branch Kim` | Defect evidence sheet plus handover boundary memo | Checklist completion can look like signing guidance if boundary memo is not separate. | Keep evidence memo and photo/dealer confirmation fields next to export. |
| `diet-habit-2week` | `startDate=2026-06-01`, `goal=observe triggers`, `constraint=no prescription` | Two-week observation sheet plus weekly review | Without warning hierarchy it can look like diet coaching. | Keep observation language, stop condition, and warning before result-oriented language. |

## First-Screen Simplification Pattern

Keep on the first screen:
- Required date/context input.
- Primary artifact preview.
- One next action.
- Export/copy path that matches the artifact.
- Sensitive warning or trust boundary if misunderstanding could cause harm.

Move below the fold or behind details:
- Long explanatory source text.
- Full recipe/procedure detail when the first job is scheduling or logging.
- Secondary exports that are not the primary destination.
- Native record-keeping prompts.
- Generic motivation copy.

## Product Direction Note

This audit supports the user's product direction: FLOW should initially help people move useful outside content into the tools they already trust. The later goal can be native FLOW execution records, but the current UI should not ask users to adopt a new workspace before export-first value is proven.

## Next UX Work

1. Convert `baby-food-menu-recipe` and `used-car-buying-check` into first-screen simplification tasks.
2. Keep `new-car-delivery-check` and `diet-habit-2week` as public MVP guardrail examples, not representative routes.
3. Use `moving-d30-basic` and `computer-skills-d30-study` as control routes when measuring whether a page feels too complex.
4. Add real event capture later for open, input, export/copy, check, repeat, and feedback before using "validated" language.

## Screenshot Evidence

Desktop and mobile first-screen screenshots were captured for every audited route:

- `moving-d30-basic`: [desktop](../screenshots/2026-05-23-ux-audit-moving-d30-basic-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-moving-d30-basic-mobile.png)
- `baby-food-menu-recipe`: [desktop](../screenshots/2026-05-23-ux-audit-baby-food-menu-recipe-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-baby-food-menu-recipe-mobile.png)
- `passport-renewal-docs`: [desktop](../screenshots/2026-05-23-ux-audit-passport-renewal-docs-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-passport-renewal-docs-mobile.png)
- `used-car-buying-check`: [desktop](../screenshots/2026-05-23-ux-audit-used-car-buying-check-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-used-car-buying-check-mobile.png)
- `computer-skills-d30-study`: [desktop](../screenshots/2026-05-23-ux-audit-computer-skills-d30-study-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-computer-skills-d30-study-mobile.png)
- `new-car-delivery-check`: [desktop](../screenshots/2026-05-23-ux-audit-new-car-delivery-check-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-new-car-delivery-check-mobile.png)
- `diet-habit-2week`: [desktop](../screenshots/2026-05-23-ux-audit-diet-habit-2week-desktop.png), [mobile](../screenshots/2026-05-23-ux-audit-diet-habit-2week-mobile.png)
