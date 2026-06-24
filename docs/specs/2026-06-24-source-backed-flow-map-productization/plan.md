# Implementation Plan

**Spec:** [Source-backed Flow Map Productization Baseline](./spec.md)  
**Date:** 2026-06-24  
**Status:** Active planning checkpoint

## Phase 1 - Baseline Freeze

Use the three representative cases as the baseline before expanding UI or content:

1. `middle-school-math-1`
2. `baby-health-schedule`
3. `moving-d30`

Output:

- Productization spec
- Korean HTML summary report
- Decision log entry
- UX backlog update

## Phase 2 - Persistence Shape

Define the production-safe shape for saved Flow Maps before building a heavier editor.

Status on 2026-06-24:

- Added a V1 persistence record builder in the source-backed adapter.
- Public save now writes the existing compatibility snapshot and a separate productization persistence record.
- The record is still a bridge contract, not the final DB schema.

Questions:

- Is `flow:map:persistence:{mapId}` enough as a temporary bridge before DB persistence?
- What parent map fields must survive account/database persistence?
- Which child Flow fields are immutable after a user saves them?
- How should official/sensitive updates be reviewed before apply?

Expected output:

- A durable TypeScript/domain contract or schema note. Done for V1 bridge.
- Tests that prove parent map snapshot and child Flow records stay consistent. Done for V1 bridge.

## Phase 3 - Creator Source-Row Workflow

Move creator work from a publish-prep page toward an actual source-row review workflow.

Status on 2026-06-24:

- Added row-level review status to the source-backed publish package.
- Creator pages now show Step title, parent Flow/section, destination, source/risk labels, actual Item fallback text, completion/memo cues, and source link per row.
- The screen remains review-before-publish only. It is not yet a full editor.

Keep it narrow:

- Source URL or source rows.
- Repeated unit/window/timeline rows.
- Generated Step preview.
- Item fallback preview.
- Source/risk check before publish.
- User save preview.

Expected output:

- Creator source-row review contract. Done for V1 review.
- Tests that prove source rows expose source-derived Item text and do not mix user execution copy. Done for V1 review.
- Editing and version review remain separate follow-up work.

Do not build:

- Full marketplace management.
- AI auto-publish.
- Heavy analytics.
- Complex creator profile features.

## Phase 4 - My Flow Readiness Cleanup

Clean up the saved library so accepted source-backed content does not mix with older review or legacy content.

Focus:

- Product-ready saved maps and child Flows.
- Preview/review/legacy groups or badges.
- Local Step detail expansion.
- Calendar/date crowding behavior.
- Flow Map drilldown only where it helps execution.

Avoid:

- New global taxonomy controls.
- Duplicated progress bars in child cards.
- Developer/review language in user screens.

## Phase 5 - Public Save-Before Polish

Only after the saved result is clear, tighten public Flow Map pages.

Check:

- User knows what will be saved.
- Setup input is minimal.
- Source link is available but not dominant.
- Child Flow preview is readable.
- CTA result is predictable.

## Phase 6 - Measurement Boundary

Add or document event/footprint needs only after the route behavior is stable.

Candidate events:

- map viewed
- setup input entered
- map saved
- first Step opened
- Step checked
- source link opened
- memo edited
- returned later

Do not describe this as validation until real user behavior data exists.
