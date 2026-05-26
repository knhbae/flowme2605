# Design-ref full gap audit

Date: 2026-05-26

This audit answers whether the current FLOW UI/content already fully matches `design-ref/260525-2` and `design-ref/260526`.

Short answer: no. PR #110 moved the representative mobile export surface closer to the reference, but it did not complete the full design-ref or all-route content alignment.

## Reference Scope Checked

- `design-ref/260526/analysis.jsx`
- `design-ref/260526/app.jsx`
- `design-ref/260526/flow-desktop.jsx`
- `design-ref/260526/flow-mobile.jsx`
- `design-ref/260526/flow-parts.jsx`
- `design-ref/260526/tokens.jsx`
- `design-ref/260525-2/app.jsx`
- `design-ref/260525-2/flow-routine.jsx`
- `design-ref/260525-2/flow-phase.jsx`
- `design-ref/260525-2/flow-mobile.jsx`

The reference is not a direct component library. It is a screen-direction guide for FLOW's route families: timeline, routine, phase/health-sensitive, checklist/decision, and empty/anchor-missing states.

## Design-ref Rules That Still Matter

1. First viewport should show the user's first action and the natural artifact, not a generic setup/export cluster.
2. Anchor input updates the artifact immediately; the closest export CTA belongs inside or next to that artifact.
3. Each screen should have one primary export and one or two secondary exports with destination verbs.
4. Desktop should use a workbench plus right rail: artifact area on the left, source/caution/feedback on the right.
5. Mobile should be single-column: anchor, primary artifact, one export CTA, then collapsed source/meta/caution.
6. Mobile tables/calendars should prefer summary cards plus sheet/calendar export over horizontal table inspection.
7. Source facts, creator experience, warning/risk, and feedback must stay visually separated.
8. Export labels and ARIA labels should include destination plus artifact name.

## Current Implementation Gaps

### High

| Area | Current state | Reference gap | Impact |
| --- | --- | --- | --- |
| Timeline workbench order | `timeline_calendar` still renders execution list and calendar side by side, with the list visually first in code. | Moving reference makes the monthly calendar the primary artifact and execution list secondary. | Users still read tasks before understanding the calendar artifact they are exporting. |
| Global mobile export fallback | PR #110 added artifact-near mobile CTAs for four routes, but `AppClient` still keeps the sticky mobile export bar and sheet as the global export pattern. | Reference discourages global clustered export and prefers artifact-local destination CTAs. | Mobile can still feel like "where is the export menu" instead of "this artifact goes to calendar/sheet/memo." |
| Mobile table density | Log and comparison surfaces still rely on `min-w` tables with horizontal scroll. | Reference calls for mobile summary cards and sheet export for table-heavy artifacts. | Study, diet, vehicle, and checklist users may inspect dense tables instead of completing the first portable artifact. |
| Full content breadth | Recent work manually improved representative/public-MVP routes and selected direct-QA routes. | User asked whether all content was fixed; design refs only cover route families, not all 511 bundles. | It would be misleading to call the content layer fully aligned. |

### Medium

| Area | Current state | Reference gap | Impact |
| --- | --- | --- | --- |
| Desktop right rail | Some source/risk/status content still appears above or below the workbench globally. | Desktop reference uses a sticky right rail for source, caution, and feedback. | First-screen hierarchy is weaker and source/risk separation varies by route. |
| Empty and anchor-missing state | Existing setup uses a generic anchor section except for selected route patterns. | Reference includes explicit empty/anchor-missing screens where artifact preview explains what will appear. | Users may not know the exact output before entering the anchor. |
| Route-family parity | Routine and baby-food have route-specific mobile passes; timeline, study, decision/checklist, and memo families are uneven. | Reference expects a family-level language system: primary artifact, secondary artifact, rail/disclosure. | Fixes remain route-by-route instead of becoming predictable product behavior. |
| Tokens and visual consistency | The code mostly uses close Tailwind colors, but tokens/radius/card rules are not centralized. | Reference tokens use a restrained surface/line/ink/primary/warning system. | Some screens still feel like accumulated UI rather than one product surface. |

### Low

| Area | Current state | Reference gap | Impact |
| --- | --- | --- | --- |
| Export ARIA coverage | PR #110 improved mobile sheet and selected artifact CTAs. | All artifact exports should name destination and artifact. | Accessibility is improving but not yet global. |
| Captions/table labels | Some tables expose headings but do not consistently use captions/aria-labelledby. | Reference asks for accessible table identification. | Screen-reader context can be weak on dense artifacts. |

## Content Alignment Status

Done or partially done:

- `moving-d30-basic`: export-first redesign batch and PR #110 mobile artifact CTA pass.
- `computer-skills-d30-study`: source-derived rows, read-only scope cells, action-specificity copy, mobile artifact CTA pass.
- `diet-habit-2week`: observation-sheet guardrails, warning hierarchy, mobile artifact CTA pass.
- `new-car-delivery-check`: evidence/hold memo guardrails, mobile artifact CTA pass.
- `baby-food-menu-recipe`: sensitive mobile caution and today reaction card pass.
- `used-car-buying-check`: comparison/memo first-screen and mobile secondary collapse pass.
- Selected exact video, official service, travel, vehicle, and broad-source cleanup routes have targeted content passes.

Not done:

- All 511 bundles have not been manually rewritten against design-ref.
- Route-family mobile summary-card replacements are not global.
- Desktop right-rail source/caution/feedback layout is not generalized.
- Empty/anchor-missing artifact preview is not generalized.
- Content lifecycle still correctly keeps many routes in fix/catalog/preview-only buckets.

## Recommended Implementation Batches

### Batch 1: Layout spine

Scope:

- Generalize a desktop `artifact + rail` layout in `AppClient`.
- Move source-fit, lifecycle, source card, warning, and feedback-adjacent blocks into the right rail on desktop.
- Keep those blocks as mobile disclosures below the first artifact.
- Preserve Stage 0 export-first behavior and do not add integrations.

Acceptance:

- Moving desktop shows calendar primary before execution-list density.
- Mobile first viewport for representative routes shows anchor, primary artifact, and one destination CTA.
- Source and warning are separated and not mixed into artifact facts.

### Batch 2: Mobile artifact summaries

Scope:

- Add route-family summary cards for table-heavy surfaces.
- Keep full tables available on desktop.
- On mobile, show compact summary/first-row capture plus sheet export before full table density.

Initial routes:

- `moving-d30-basic`
- `computer-skills-d30-study`
- `diet-habit-2week`
- `new-car-delivery-check`
- `used-car-buying-check`
- `baby-food-menu-recipe`

Acceptance:

- No first-screen horizontal-scroll table is required to understand the primary artifact on mobile.
- Sheet/calendar/memo export still downloads the same data shape.

### Batch 3: Content lifecycle audit queue

Scope:

- Add a tracked design-ref/content gap queue to Content Lab.
- Separate route families by lifecycle: representative-eligible, public-MVP candidate, direct-QA, reshape, catalog, preview-only, hidden/remove.
- Do not bulk-promote routes.

Acceptance:

- The app can report how many routes are still design-ref/content-review pending.
- No route is labeled validated without real user behavior.

### Batch 4: Observed-session prep

Scope:

- After layout/content cleanup, update observed-session scripts for the first routes.
- Record whether users can identify the artifact, choose destination export, check first item, and explain source/risk boundary.

Acceptance:

- Evidence remains `ready_for_observed_session`, not `validated`, until real sessions exist.

## Branching Recommendation

PR #110 is still open on `mobile-export-surface-cleanup`. The next implementation should not be stacked deeply on that PR.

Recommended path:

1. Merge PR #110.
2. Sync `main`.
3. Create a new branch, for example `design-ref-full-gap-alignment`.
4. Implement Batch 1 first.
5. Verify with `npm test`, `npm run build`, targeted Playwright, and full `npm run test:e2e` before broader content batches.

## Figma Status

Figma was attempted on the existing PR #110 artifact file:

- `https://www.figma.com/design/dYp9mFToSEOPjMSwAVcnuJ`

The write failed because the connected Figma account hit the Starter plan MCP tool-call limit. No Figma nodes were created in this pass.
