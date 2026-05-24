# Export-First Real-User UX Audit

**Date:** 2026-05-24
**Branch:** `docs/study-progress-audit-criteria`
**Scope:** `computer-skills-d30-study`, `moving-d30-basic`, `diet-habit-2week`, `new-car-delivery-check`, `baby-food-menu-recipe`, `used-car-buying-check`

## Summary

The current direction remains correct: Stage 0 should reduce screen complexity and make the first natural artifact obvious. The strongest routes are the ones where a user can immediately see what leaves FLOW: a calendar, spreadsheet, checklist, memo, comparison table, or reaction log.

No route should be called validated yet. `computer-skills-d30-study` remains representative-eligible based on QA and source fit, while `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails.

## Route Audit

| Flow | First action | Simulated natural artifact | Current Flow/UX gap | Content/UX reinforcement | Export-first fit | Mobile density | Source/risk separation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | Enter exam date, then review source-derived chapter rows. | `examDate=2026-06-22`; D-30 calendar plus spreadsheet rows for chapter scope, target date, status, mock score, wrong answers, retry date. | Calendar + progress + score can feel complex if the user thinks they must design the table. | Keep row labels visibly source-derived and limit edits to target date, status, memo, wrong answer, retry date, weak area, and score. | Strong: calendar and xlsx are the natural outputs. | Watch the combination of calendar, progress table, score table, sticky shortcut, and artifact export buttons; keep only artifact-near export controls visible. | Low-risk study. Must not imply pass guarantee or official exam advice. |
| `moving-d30-basic` | Enter move date. | `moveDate=2026-07-15`; D-30 calendar, moving checklist, vendor/proof sheet. | Already the clean control route; extra explanation or record prompts would make it feel heavier than a calendar export. | Keep date input, calendar/checklist preview, and export first. Vendor/proof memo can support but not dominate. | Strong: calendar + sheet + checklist copy. | Baseline for acceptable density: one anchor, one workbench, one mobile shortcut. | Low-risk logistics. FLOW schedules and records evidence, not contract advice. |
| `diet-habit-2week` | Enter start date and open the observation sheet. | `startDate=2026-06-01`; two-week sheet for meal, activity, sleep, measurement, condition, stop/consult condition, weekly review. | It can look like diet coaching if outcome language appears before observation and stop conditions. | Keep observation wording, warning hierarchy, and stop/consult fields near the sheet. Avoid weight-loss claims. | Good with guardrails: spreadsheet is the main artifact. | Dense because health warning, sheet, weekly review, and sticky export compete; keep warning and first sheet, move secondary explanation down. | Health-sensitive. Source, observation, and caution must stay separate. |
| `new-car-delivery-check` | Record vehicle/dealer context and defect evidence before handover. | `deliveryDate=2026-06-03`, `vehicle=Avante CN7`, `dealer=Mapo branch Kim`; evidence sheet with photo filenames, dealer confirmation, document status, hold memo. | Checklist completion can be mistaken for acceptance/signing guidance if the boundary memo is not first-class. | Keep `인수 전 보류 기준` and handover memo beside evidence rows. Export should feel like evidence preservation. | Good with guardrails: xlsx/memo artifact fits the delivery moment. | Dense because warning, comparison table, memo fields, checklist, and export buttons are all urgent; prioritize evidence rows plus memo above generic checklist. | Money-at-risk. FLOW records evidence and questions, not buy/sign advice. |
| `baby-food-menu-recipe` | Start from baby age/start date and review the next meal/reaction row. | `startDate=2026-06-01`, `babyAge=6 months`, `newIngredient=broccoli`; meal calendar plus reaction log sheet. | Recipe richness can compete with the first job: feed, observe, log reaction. | Keep meal slot, reaction fields, and allergy-watch caution before recipe detail. | Good if meal calendar and reaction log remain first; weaker if recipe content dominates. | Potentially dense due to meal calendar, reaction log, caution, recipe notes, and export buttons; hide long recipe detail below first artifact. | Family/health-adjacent. FLOW records reactions and cautions, not diagnosis. |
| `used-car-buying-check` | Compare candidates before reading the long checklist. | `candidateA=2020 Avante`, `candidateB=2019 K3`; candidate comparison sheet plus buy/hold memo and inspection checklist. | Candidate comparison and checklist can compete; the buyer's first decision is comparison/hold, not generic checklist completion. | Keep comparison rows and buy/hold memo first, checklist second. | Strong for sheet/memo; calendar is not primary. | Dense if comparison, memo, checklist, sticky export, and source notes all appear together; comparison table should dominate mobile first screen. | Money-at-risk. FLOW structures evidence, not purchase certification. |

## Mobile Density Findings

Findings from the current screenshot-backed audits and route structure:

1. `moving-d30-basic` is the density benchmark: anchor input, workbench, and one mobile shortcut are enough.
2. Artifact-card export buttons are understandable when they sit beside the artifact, but mobile pages with multiple artifact cards can still feel button-heavy.
3. `computer-skills-d30-study` needs the strictest table discipline because calendar + chapter table + mock-score table can look like a native dashboard.
4. `diet-habit-2week`, `new-car-delivery-check`, and `baby-food-menu-recipe` need risk/caution near the artifact, but long explanatory copy should stay below the first exportable surface.
5. Do not add another global export card or native record prompt to the first screen.

## Study Flow UX Check

`computer-skills-d30-study` now points in the right direction because the progress rows are framed as source-derived. The next copy/doc/test guard is:

- The user should understand that the creator brought the row structure from the source.
- The user should edit only execution fields, not design the table.
- The calendar, progress table, and wrong-answer log should remain separate artifact surfaces.
- The route should stay export-first, not become a native study dashboard.

## Representative Candidate Recheck

| Flow | Current candidate state | Recheck decision |
| --- | --- | --- |
| `computer-skills-d30-study` | Representative-eligible / representative candidate | Keep as representative-eligible, but not validated without user behavior data. |
| `diet-habit-2week` | Public MVP candidate with guardrails | Keep public MVP with guardrails; do not promote to representative because health-sensitive framing still needs real-use evidence. |
| `new-car-delivery-check` | Public MVP candidate with guardrails | Keep public MVP with guardrails; do not promote to representative because purchase/signing risk needs real-use evidence. |
| `moving-d30-basic` | Clean low-risk control route | Keep as export-first density benchmark. |
| `baby-food-menu-recipe` | Simplified first-screen route | Keep monitoring mobile density and source/risk hierarchy before broader exposure. |
| `used-car-buying-check` | Simplified first-screen route | Keep comparison-first; avoid presenting checklist completion as purchase advice. |

## Recommended Small UX Batch

The next code PR should stay narrow. Candidate fixes:

1. Mobile density: hide or compress secondary explanatory copy below the first artifact on one high-density route.
2. Study copy/test guard: assert that progress-table labels remain source-derived for `computer-skills-d30-study`.
3. Artifact buttons: if mobile screenshots show repeated `엑셀로 받기` buttons too close together, keep only the primary artifact export above the fold and leave secondary exports within later cards.

Do not build automatic progress-table generation, integrations, login, payments, native long-term records, community, or AI publishing in this cycle.
