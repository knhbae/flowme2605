# My Tests UX/Content Synthesis

Date: 2026-05-25

## Inputs

`my_tests/` files read:

- `250525_test_result_01.md`
- `250525_test_result_02.md`
- `250525_test_result_03.md`

The three reviews conflict on several routes. This synthesis gives more weight to findings that preserve the current FLOW core scenario: a user arrives from source content, gets a portable calendar/checklist/sheet/memo artifact, can edit it for their situation, can export without joining, and is not misled about source, risk, or validation. No route is validated by this document.

## Current Repo State

- Local branch started from `main` at `94a454c739b4f65ffb302be90528b1574988d91f`.
- `origin/main` matched local `main` at the same commit after fetch.
- Open PR count from GitHub API: `0`.
- `gh` CLI was not available locally.
- `my_tests/` remains untracked source material and should not be committed.

## Flow Final Decisions

| Priority | Flow | Final judgment | Reason |
| ---: | --- | --- | --- |
| 1 | `passport-renewal-docs` | Source mismatch / cannot evaluate | One review observed the Government24 source resolving to a service notice instead of the intended civil-service page; official-condition routes need verified source links before user testing. |
| 2 | `real-mofa-overseas-travel-prep` | Needs content/source rewrite before user test | Official MOFA source and creator/channel framing can be confused; emergency-card output is right, but source-derived values and official recheck boundary need stronger handling. |
| 3 | `used-car-buying-check` | Needs risk-boundary cleanup before user test | The natural artifact is strong, but the checklist must not read as vehicle quality/safety certification, especially once copied outside FLOW. |
| 4 | `baby-food-menu-recipe` | Needs health/risk and mobile-density watch before user test | Meal calendar plus reaction log fit Stage 0, but creator experience, allergy/medical caution, recipe density, and official safety boundary must remain separated. |
| 5 | `diet-habit-2week` | Needs target-context and export-format cleanup | Observation-sheet direction is good, but source context includes youth/growth health information and the route must not become general diet coaching. |
| 6 | `vehicle-inspection-prep` | Needs source-coverage/official-procedure cleanup | Calendar plus memo are useful, but TS inspection procedure stages and separate official pages for reservation/fees/periods need clearer source coverage. |
| 7 | `computer-skills-d30-study` | Needs source-shape clarification before stronger exposure | Export-first study artifacts are useful, but the D-30 plan is FLOW's conversion of a book/product page, not a source-provided 30-day curriculum. |
| 8 | `real-fitvely-diet-record-routine` | Needs source-rule visibility cleanup | Observation-first health boundary is safer, but the source nutrition criteria are too compressed unless users can see the candidate rule they are applying. |
| 9 | `new-car-delivery-check` | Minor UX/copy cleanup | Evidence-first structure is strong; remaining issue is mostly wording and mobile field density. The current title already avoids the old “후보 비교표” concern. |
| 10 | `real-thankyou-bubu-home-workout-starter` | Minor UX/copy cleanup | Exact video to portable routine/calendar is strong; avoid making a simple follow-along video feel like a native long-term workout program. |

## Severity Synthesis

### Blocking

| Flow | Issue | Recommended fix |
| --- | --- | --- |
| `passport-renewal-docs` | Official source could not be reliably evaluated when the source resolved to a service interruption/notice page. | Re-verify the current official passport source URL and add a stable Ministry of Foreign Affairs passport-guide fallback before stronger exposure. |
| `real-mofa-overseas-travel-prep` | Official MOFA information can be mistaken for a creator/travel-channel source if top copy mentions creator framing. | Keep top copy and export text strictly official: “MOFA country/region page to personal emergency card,” with no creator-channel implication. |
| `used-car-buying-check` | A copied checklist can be misunderstood as vehicle condition or safety certification. | Put “this checklist does not guarantee vehicle condition” in route warning and copied/exported text. |
| `baby-food-menu-recipe` | Allergy/medical interpretation risk if creator meal plan appears like general baby-food guidance. | Keep creator experience, official safety caution, and parent reaction log structurally separate. |

### High

| Flow | Issue | Recommended fix |
| --- | --- | --- |
| `computer-skills-d30-study` | Source book page has more detailed subject structure than current rows; D-30 schedule is FLOW-created. | Mark the schedule as FLOW conversion and add source-derived rows only where the source supports them. |
| `diet-habit-2week` | Source context can include growth/youth health, while page may look like general adult dieting. | First sentence should say this is a non-prescriptive observation sheet based on official health guidance, not a diet result plan. |
| `vehicle-inspection-prep` | TS source procedure stages are not visible enough in the portable artifact. | Add or document a separate “official inspection stages” memo/table before expanding other checklist content. |
| `real-fitvely-diet-record-routine` | Original nutrition-video criteria are compressed into an unclear “choose one rule” instruction. | Show source-rule candidates as source notes, then let the user choose one for a 7-day observation sheet. |
| `real-mofa-overseas-travel-prep` | Emergency card can still be empty unless official contacts are source-derived or explicitly checked. | Add source-derived contact placeholders only after verifying the official page; otherwise force “checked date + official link” fields. |

### Medium

- Internal/meta labels such as `대표 노출 전 보강 중`, `새 실행모델로 전환 중`, and score badges can distract real users when shown on public pages.
- Repeated boilerplate item details and Korean particle errors (`관찰표은`, `증빙표은`, `학습표은`) make several pages feel generated.
- Mobile first screens can still stack too many artifacts, warnings, tables, and secondary checklist sections.
- Export labels sometimes say the action but not the resulting file/app shape clearly enough.
- Several source pages are narrower than the FLOW transformation; the transformation boundary must be visible.

### Low

- Single-action video flows do not need progress language that makes `0/1` feel like a productivity dashboard.
- Category labels and copied text can use stronger destination vocabulary: memo, sheet, calendar, checklist.
- Some workbook/text export formatting can better preserve headings and category grouping.

## Repeated Common Problems

1. Source transformation boundary: reviewers repeatedly flagged routes where FLOW converts a source into a useful artifact but does not clearly say which parts are source facts and which parts are FLOW's execution structure.
2. Risk travels with export: caution copy needs to survive copy/text/xlsx export, not only the web page.
3. Artifact density: the first screen often has the right components but too many competing artifacts at once on mobile.
4. Internal readiness language: honest internal status is useful for editors, but it can lower public-page trust or distract from the first action.
5. Boilerplate detail copy: repeated “this item helps you not miss X” patterns weaken content specificity.

## Small Fixes Suitable For PR-Sized Batches

- Add guarantee-boundary warning to `used-car-buying-check` and include warnings near the top of text exports.
- Add a current audit document summarizing the three external reviews and their conflicts.
- Add a source-boundary sentence for `computer-skills-d30-study`: D-30 dates are FLOW conversion, not source-provided curriculum.
- Hide or move internal readiness/score badges away from public first screens where they compete with the first action.
- Strengthen `diet-habit-2week` first sentence with “observation sheet, not prescription/result plan” and source target context.
- Add a test that copied/exported text includes the route warning for sensitive financial/health routes.

## Out Of Scope For This Batch

- External app direct integrations such as Google Calendar, Notion, Todoist, or Sheets API.
- Automatic progress-plan generation or AI rewriting of sources.
- Native long-term records, login, payment, community, or internal FLOW management features.
- Passport source replacement without a freshly verified official URL.
- MOFA contact prefill without verifying exact official contact values.
- Large mobile redesigns, column-selection builders, or condition-filter UI.

## Core Scenario Recheck

Legend: `Pass` means the current direction is acceptable for Stage 0 rehearsal; `Partial` means useful but needs cleanup; `Fail` means source/risk/export issues block user testing.

| Flow | Source-to-FLOW naturalness | Source structure preserved | User-editable | Copy/export | First-screen clarity | Mobile | Source/risk separated | Value without signup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | Partial | Partial | Pass | Pass | Partial | Partial | Partial | Pass |
| `diet-habit-2week` | Partial | Partial | Pass | Pass | Partial | Partial | Partial | Pass |
| `new-car-delivery-check` | Pass | Pass | Pass | Pass | Pass | Partial | Pass | Pass |
| `used-car-buying-check` | Pass | Partial | Pass | Pass | Partial | Partial | Partial | Pass |
| `baby-food-menu-recipe` | Pass | Partial | Pass | Pass | Partial | Partial | Partial | Pass |
| `real-thankyou-bubu-home-workout-starter` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `real-fitvely-diet-record-routine` | Partial | Partial | Partial | Pass | Partial | Partial | Pass | Pass |
| `real-mofa-overseas-travel-prep` | Pass | Partial | Pass | Pass | Partial | Pass | Partial | Pass |
| `vehicle-inspection-prep` | Pass | Partial | Pass | Pass | Partial | Partial | Pass | Pass |
| `passport-renewal-docs` | Fail | Partial | Pass | Partial | Partial | Pass | Partial | Pass |

## Priority Order After Synthesis

1. Fix Blocking source/risk boundaries that survive export: `used-car-buying-check`, `real-mofa-overseas-travel-prep`, `passport-renewal-docs`, `baby-food-menu-recipe`.
2. Then fix export-first Medium issues that make the external artifact weak: study source-derived rows, FITVELY source-rule selection, vehicle official procedure rows.
3. Then reduce mobile first-screen density and internal readiness copy for routes that otherwise have the right artifact.

## This Batch Decision

This batch takes the smallest Blocking fix: `used-car-buying-check` now needs an explicit no-guarantee boundary in both the route warning and copied text export. Larger source replacement or official-contact prefill work is deferred until exact source values are verified.
