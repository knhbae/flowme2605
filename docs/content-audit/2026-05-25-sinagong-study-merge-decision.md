# Sinagong Study Merge Decision Audit

Date: 2026-05-25

## Trigger

The three `my_tests/` evaluation results raised a recurring concern around study Flows: a D-30 plan can look exportable while still hiding whether the source actually provides a curriculum, or whether FLOW is creating the schedule from a book/product page.

This batch applies that conclusion to `real-sinagong-computer-d30-study`.

## Test Result Inputs Used

- Test 01 and Test 02 both support a stricter source-boundary read: the study route needs clearer separation between source-backed book/scope information and FLOW-created D-30 scheduling.
- Test 03 was more optimistic about a 30-day curriculum/video-style study plan, but that assumption conflicts with the current exact Gilbut book page source. Per the core scenario, source fidelity wins.
- The synthesis document already treats `computer-skills-d30-study` as useful but only partial on source-shape clarity and first-screen understanding.

## Final Judgment

- `real-sinagong-computer-d30-study` should not be promoted as a separate representative or featured route.
- The canonical study route remains `computer-skills-d30-study`, which already carries the D-30 FLOW-conversion boundary and export-first study artifacts.
- The Sinagong exact-source route can stay direct-QA accessible, but only as a merge/rewrite candidate.
- If it remains separate, it must first add distinct source-derived rows and a score/wrong-answer spreadsheet shape that the exact source supports.

## Issues

- High: the exact book page is real, but it does not by itself prove a source-authored D-30 curriculum.
- High: the route duplicates the current canonical study route without a distinct user-facing artifact reason.
- Medium: source-derived progress rows, past-exam round rows, score fields, and wrong-answer retry rows are the required minimum before stronger exposure.
- Low: this is an audit/content routing decision, not a visual layout change.

## Small Fix In This Batch

- Added test coverage that keeps the Sinagong exact-source route in `reshape_content_or_ux`.
- Updated the natural artifact audit to state the duplicate/canonical-route decision.
- Updated the UX cleanup backlog to require a canonical route decision before featured framing.

## Larger Work Excluded

- Automatic study-plan generation.
- New curriculum rows that are not visible in the source.
- Full route merge/removal.
- Study workbench redesign or mobile table layout changes.
- Native study record management.

## Figma Use

No Figma canvas is required for this batch because there is no UI layout change. Use Figma in the next study UX/UI batch if the work changes mobile table density, artifact ordering, or the visible relationship between source rows and user-editable fields.
