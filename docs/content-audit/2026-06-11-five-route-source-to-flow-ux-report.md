# 2026-06-11 Five Route Source-to-Flow UX Report

## Purpose

This report compares the five representative public routes created during the current source-to-Flow QA loop.

Korean HTML view: [2026-06-11-five-route-source-to-flow-ux-report-ko.html](./2026-06-11-five-route-source-to-flow-ux-report-ko.html)

The question is:

> Does FlowMe now read like a tool for saving online content as a personal execution Flow, rather than a single-purpose checklist or calendar app?

This is a UX/source-to-artifact report. It is not user-behavior validation.

## Routes Reviewed

| Route | Source shape | User job | Primary artifact | Current judgment |
|---|---|---|---|---|
| `/f/jeonse-contract-precheck-docs` | contract-precheck guide | Enter contract date, check D-3/D-Day/D+1 items, keep memo/URL details | hybrid calendar + checklist | Strong benchmark. Sensitive judgment stays outside FlowMe. |
| `/f/elementary-school-entry-d30` | official school notice + parent prep | Enter entry date, follow D-30 prep without storing child records | hybrid timeline + checklist | Good category expansion from contract to parent/school prep. |
| `/f/kids-printable-squishy-craft` | creator printable craft post | Keep original printable as source link, execute parent-side prep/play/cleanup checks | source-link checklist + light timeline | Good creator-material proof. Mobile ordering was improved during this report. |
| `/f/remote-help-session-precheck` | official remote-support docs | Choose lowest sufficient permission method, avoid storing access values | internal checklist | Strong digital-procedure proof. Clear sensitive-value boundary. |
| `/f/fridge-cleanout-weekly-plan` | creator fridge-cleanout article | Fill 7-day inventory sheet before grocery shopping | sheet/inventory | Strongest non-calendar proof. Avoids diet/nutrition/savings app drift. |

## Evidence Collected

Current command evidence:

```powershell
npx tsx --test lib\flow\seed-flows.test.ts
npm run build
npx playwright test tests/e2e/flow-mvp.spec.ts --grep "promoted public routes bring the executable artifact into the first mobile viewport"
```

Additional completion evidence already recorded:

```powershell
npx playwright test tests/e2e/flow-mvp.spec.ts --grep "content flows studio links promoted candidates|promoted content-flow service routes preserve executable source cues|promoted public routes bring the executable artifact into the first mobile viewport"
npm run docs:check
```

Runtime sampling before the mobile-ordering fix found one issue:

| Route | Mobile workbench top before fix | Finding |
|---|---:|---|
| `jeonse-contract-precheck-docs` | 586px | In first viewport. |
| `elementary-school-entry-d30` | 510px | In first viewport. |
| `kids-printable-squishy-craft` | 972px | Too low; setup pushed the executable checklist below the first viewport. |
| `remote-help-session-precheck` | 756px | In first viewport, but near lower edge. |
| `fridge-cleanout-weekly-plan` | 466px | Strong first-viewport execution. |

Fix applied during this report:

- Added `kids-printable-squishy-craft` to the mobile artifact-first ordering list.
- Added it to the mobile first-viewport Playwright coverage.
- Re-ran the targeted e2e test; it passed.

## UX Findings

1. **Strong:** The route set covers enough artifact variety.

   The five routes cover calendar/checklist, D-day timeline, creator source link, internal permission checklist, and sheet/inventory. This is enough to avoid the impression that FlowMe is only a contract, moving, or calendar product.

2. **Strong:** Source/risk separation is visible in the content model.

   The tests and route copy preserve key boundaries: no legal decision, no child-data storage, no creator template copying, no remote access-value storage, and no food-cost/nutrition/safety guarantee.

3. **Medium:** Generic public-route scaffolding still appears below several routes.

   This is not blocking, because the executable artifact is now reachable early enough. But the shared lower sections still feel like product/review copy in places. Future polish should keep source/warning cards but reduce repeated explanation.

4. **Medium:** Calendar-first UI still works for dated flows, but it should not be the default mental model.

   `fridge-cleanout-weekly-plan` is important because it proves FlowMe can lead with a sheet. Future category decisions should continue asking destination first: calendar, sheet, memo, or internal check.

5. **Low:** Desktop workbench can sit lower than ideal on some routes.

   Mobile is the higher-risk surface for this loop. Desktop has more scanning space, but future comparison pages should shorten the top summary and move the first artifact higher.

## Rubric Summary

| Dimension | Score | Reason |
|---|---:|---|
| User Need Fit | 4 | Each route starts from a recognizable real-world situation and a source-derived job. |
| Execution Clarity | 4 | Public routes expose concrete dates, rows, checkboxes, or permission decisions. |
| Content Fidelity | 4 | Source-specific cues are preserved in route tests and item details. |
| Portability | 4 | The set shows calendar, checklist, memo/source link, internal check, and sheet destinations. |
| Cognitive Load | 3 | Main artifacts are usable, but shared route scaffolding still adds explanatory weight. |
| Copy Specificity | 3 | Key actions are concrete; some generic lower-page copy remains. |
| Source/Safety | 4 | Sensitive boundaries are explicit and covered by tests. |
| Accessibility/Operability | 4 | Checkboxes, inputs, links, and mobile overflow checks are covered for the representative routes. |

Average: `3.75`

Judgment: suitable for Stage 0 source-to-Flow QA. Not validated.

## Product Interpretation

The current route set supports this positioning:

> FlowMe turns useful online content into a lightweight personal execution surface: calendar when time matters, checklist when a decision matters, sheet when rows matter, memo/URL when detail belongs outside the main screen.

The clearest UX rule from the set:

> Do not start from content category. Start from the artifact the user would naturally save or use.

Examples:

- Contract precheck: date-driven hybrid.
- School entry: date-driven parent timeline.
- Printable craft: source-link checklist.
- Remote help: internal permission checklist.
- Fridge cleanout: 7-day inventory sheet.

## Recommendation

Do not add another near-duplicate route now.

Next best step:

1. Create a single comparison/decision surface that lets the user see the five examples side by side.
2. Then run a 3-5 person observation using these five routes.
3. Use observation to decide which artifact model should become the default creation prompt.

The next report should not ask "can we make more Flows?" It should ask:

> When users see these five examples, do they understand that FlowMe saves external content into their own execution tools?

## Follow-Up Tasks

- Build a compact comparison page or HTML report for these five routes.
- Write a 15-minute observation script with tasks:
  - choose the Flow they understand fastest,
  - identify what gets saved,
  - complete one checkbox or one sheet row,
  - find source/caution detail,
  - explain whether they would save it.
- Reduce generic lower-page route scaffolding after observation identifies which explanations users ignore.
