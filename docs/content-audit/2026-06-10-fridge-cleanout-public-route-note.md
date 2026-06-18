# 2026-06-10 Fridge Cleanout Public Route Note

## Purpose

`fridge-cleanout-weekly-plan` is the sheet/inventory category-expansion sample after jeonse, elementary entry, kids craft, and remote-help precheck.

The goal is to test whether a Korean online fridge-cleanout article can become a lightweight personal Flow without turning FlowMe into a diet, nutrition, food-safety, or savings app.

This is source-to-Flow QA, not user-behavior validation.

## Public Route

- Public route: `/f/fridge-cleanout-weekly-plan`
- Source candidate: `fridge-cleanout-weekly-plan`
- Primary destination: `sheet`
- Structure: `checklist`
- Anchor: `start_date`
- User-facing artifact: 7-day inventory sheet

## Conversion Decision

- User need: As a person about to shop for groceries, I need to pick a few priority fridge ingredients and track 7 days of menu candidates and buy-hold decisions, so that I can use what I already have before adding more groceries.
- Content shape: creator blog article with fridge inventory, 2-3 menu candidates, 7-day cleanout sequence, and grocery-buying tips.
- Primary destination: `sheet`
- Structure: lightweight checklist plus a 7-day sheet.
- Action count: 6.
- Playbook: sheet/inventory exception rather than diet/body-composition.
- Risk/source handling: creator experience stays as source context; FlowMe stores inventory/menu/buy-hold notes only.

## User-Facing Shape

The public route now starts from a 7-day stock-use sheet rather than a calendar.

Visible columns:

- `우선 재료`
- `메뉴 후보`
- `장보기 보류`
- `상태`
- `메모`

The mobile screen puts the artifact before the setup section for this route, so the user sees the executable table in the first viewport. The start date remains available, but it is not allowed to dominate the screen.

## Boundaries

FlowMe does not:

- guarantee food-cost savings,
- calculate nutrition balance,
- prescribe diet behavior,
- judge whether a food is safe to eat,
- encourage eating spoiled or unsafe food,
- manage a full pantry database,
- recommend products or grocery stores.

Unsafe, spoiled, or uncertain food is handled as `폐기/확인`, not as a cleanout target.

## Files Changed

- `lib/flow/seed-flows.ts`
- `lib/flow/artifact-plan.ts`
- `components/flow/KoreanFlowContentStudio.tsx`
- `components/flow/AppClient.tsx`
- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/seed-flows.test.ts`
- `tests/e2e/flow-mvp.spec.ts`

## Verification

- `npx tsx --test lib\flow\seed-flows.test.ts`
- `npm run build`
- `npx playwright test tests/e2e/flow-mvp.spec.ts --grep "content flows studio links promoted candidates|promoted content-flow service routes preserve executable source cues|promoted public routes bring the executable artifact into the first mobile viewport"`
- Mobile QA for `/f/fridge-cleanout-weekly-plan`
  - workbench top: `466px`
  - first table input accepted `양파 1/2개`
  - no horizontal overflow
  - visible columns confirmed
  - no `칼로리`, `체중 감량`, or positive guarantee copy
  - warning/source boundary visible
  - screenshot: `output/playwright/fridge-cleanout-public-mobile.png`

## Judgment

This sample is a good counterweight to the calendar-heavy samples. It shows that FlowMe can convert an online life-content article into a small row-based execution artifact.

The next useful step is not to make the fridge sample deeper. The next step is to compare the completed sample set and decide whether one more category is still needed, likely `college-dorm-move-in-checklist` if the product needs another logistics/checklist proof.
