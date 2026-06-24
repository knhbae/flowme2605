# QA Plan

**Spec:** [Source-backed Flow Map Productization Baseline](./spec.md)  
**Date:** 2026-06-24

## Automated Checks

Run after code changes in this area:

```powershell
npm run docs:check
npx tsx --test lib\flow\source-backed-my-flow.test.ts
npx playwright test flow-mvp.spec.ts --grep "source-backed"
npm test
npm run build
```

For documentation-only updates, `npm run docs:check` is enough.

## Manual Route Checks

Check these routes in mobile and desktop when UI changes:

- `/flow-maps/middle-school-math-1`
- `/flow-maps/middle-school-math-1/creator`
- `/flow-maps/baby-health-schedule`
- `/flow-maps/baby-health-schedule/creator`
- `/flow-maps/moving-d30`
- `/flow-maps/moving-d30/creator`
- `/my`

## User Journey Rehearsal

For each baseline case:

1. Open the public Flow Map page.
2. Confirm the source and generated artifact are understandable in five seconds.
3. Enter only the necessary setup input.
4. Save to My Flow.
5. Confirm My Flow shows the saved result without demo-only copy.
6. Open one Step.
7. Confirm Items, source URL, memo, and completion state are visible only when useful.
8. Return to Today, Calendar, Flow, or Map view without losing context.
9. Confirm the save writes both `flow:map:saved:{mapId}` and `flow:map:persistence:{mapId}`.

## Content Fidelity Checks

Math:

- Step rows match source units.
- Items are source subtopics or concept rows.
- No invented study routine, wrong-answer workflow, or session planning unless source provides it.

Baby health:

- Official checkup/vaccination source is visible.
- Official windows stay one Step.
- FlowMe does not give diagnosis, outcome guarantees, or medical advice.

Moving:

- D-day offsets are tied to moving date.
- Vendor/contact/reservation details stay memo/detail, not top-level required fields.
- Government or registry links remain source/detail context.

## Surface Separation Checks

User-facing routes must not expose:

- PoC
- developer/review/evaluation wording
- source scoring
- internal conversion notes
- generic filler actions that are not source-derived

Creator routes may show source rows and publish checks. Review reports may show critique and simulation results.

## Creator Source-Row Review Checks

For `/flow-maps/[map]/creator`:

- The page labels the review area as source-row review, not user execution.
- Each generated row shows the Step title, parent Flow/section, destination, source/risk labels, and row readiness.
- Rows with Item fallback show the actual source-derived Item text, not generic filler.
- Rows with missing source URL or missing Item fallback expose a creator-facing review status.
- Source links stay near the generated row.
- The creator page does not expose user execution copy such as `오늘 실행` or `완료 체크`.
- The public preview and My Flow links remain navigation aids, not mixed review content inside user screens.

## My Flow Readiness Checks

For a mixed saved inventory:

- Source-backed saved map Flows appear in `my-flow-ready-section`.
- `needs_review`, preview, or legacy saved Flows appear in `my-flow-review-section` or a lower-confidence row/card.
- Review-needed content still has an open action, but it does not share the same visual confidence as ready content.
- Today and Calendar remain execution surfaces and do not become review dashboards.
- Readiness labels remain user-facing: `실행 가능`, `검토 필요`, `샘플 후보`, `이전 기준`.

## Calendar Selected-Date Checks

For `/my` Calendar after saving source-backed maps:

- The selected-date detail renders `my-flow-selected-date-group` before Step rows.
- A single-Flow map shows the map title once and does not repeat child Flow/progress chips inside the Step row.
- A multi-Flow map can keep compact child Flow/progress chips when more than one child Flow appears under the same selected date.
- Clicking a grouped Step still opens the Step detail inline under the tapped row.
- The selected-date section stays user-facing and does not expose review, score, or developer copy.

## Calendar Crowding Checks

For `/my` Calendar with mixed saved schedule and routine rows:

- `my-flow-calendar-scope-filter` appears only when there is more than one meaningful display scope.
- Choosing `루틴` removes scheduled task rows from the selected-date detail and leaves routine rows visible.
- Choosing `일정` removes routine icons/events from the month grid and keeps scheduled task rows visible.
- Scope filters update both the month calendar and selected-date detail together.
- Simple one-type calendars should stay control-light and should not show redundant filters.

## Saved Map Update Checks

For `/my` Flow tab after a source-backed map has been saved:

- A saved map with the same version and source row shape should not show update notice.
- A saved map with a stale version or changed source row shape should show `my-flow-map-update-review`.
- The notice should say the existing saved Steps are not auto-applied or silently changed.
- The notice should link back to the public Flow Map for review.
- The notice should use user-facing reason copy, not raw version/debug language.
- Clicking `my-flow-map-update-dismiss` should hide only the same saved/current version pair and should not change saved Steps.
- Today and Calendar should remain execution surfaces and should not become update-review dashboards.

## Persistence Record Checks

For each public save path:

- Compatibility snapshot exists at `flow:map:saved:{mapId}`.
- Productization record exists at `flow:map:persistence:{mapId}`.
- `schemaVersion` is `1`.
- `recordType` is `saved_source_backed_flow_map`.
- `saved.sourceSurface` is `public_save`.
- `readiness.content` is `ready_for_my_flow` unless creator blockers exist.
- `childFlows` preserve slug, structure type, anchor type, destination, risk, source, Step count, Item fallback count, and Step ids.
- Official or sensitive maps keep `updatePolicy: review_before_apply` separate from current readiness.

## Evidence Boundary

Allowed wording:

- Internal PoC evidence
- route integration evidence
- automated behavior coverage
- productization baseline

Not allowed without observed user behavior:

- user-validated
- proven
- 검증됨
- final product UX
