# Source-backed Flow Map Quality PRD

**Date:** 2026-06-25
**Status:** Draft reset after homepage/content feedback
**Scope:** source-backed Flow Map source selection, Flow conversion, homepage exposure, public Flow Map UX, My Flow execution handoff
**Related:** [Productization baseline](./spec.md), [2026-06-25 candidate reassessment HTML](../../content-audit/2026-06-25-source-backed-flow-map-candidate-reassessment-ko.html), [Source-to-Flow Conversion Gate](../../flow-rules/source-to-flow-conversion-gate.md), [Flow Content Source Selection Rules](../../flow-rules/flow-content-source-selection.md), [FLOW Quality Gate](../../flow-rules/quality-gate.md), [FLOW Quality Rubric](../../flow-rules/quality-rubric.md)

## 1. Background

The recent homepage preview exposed eight source-backed Flow Map candidates as if they were comparable review targets:

- `moving-d30`
- `baby-health-schedule`
- `middle-school-math-1`
- `postal-address-transfer`
- `smishing-response`
- `year-end-tax-submit`
- `aircon-filter-cleaning`
- `picnic-food-safety`

User review showed that implementation completeness did not equal product quality. The homepage made weak candidates look representative, while several flows lacked useful source-derived action content. This is a content and product-quality failure, not only a UI polish issue.

## 2. Problem

FlowMe is trying to prove that real online content can become a lightweight executable personal Flow. The current risk is that the product starts to look like an AI checklist generator:

- weak original sources are promoted because routes and cards exist,
- generic actions are invented to fit a common UI shell,
- review/evaluation needs leak into user-facing navigation,
- sensitive or official content becomes shallow schedule text with low user value,
- UI polish hides missing source fidelity.

The product should not show a candidate as representative until the source, conversion model, and user journey all pass the quality gate.

## 3. Product Objective

Create a repeatable gate that lets FlowMe decide:

1. Which original content deserves conversion into a Flow Map.
2. What exact executable artifact the content should become.
3. What should be shown to users, creators, and internal reviewers.
4. When a candidate is strong enough to appear on homepage or public representative surfaces.

The objective is not to maximize category count. It is to prove a few strong source-to-Flow examples that feel useful enough for a user to save and revisit.

## 4. Non-Goals

- Do not keep weak candidates just to show category breadth.
- Do not turn official health, tax, security, or safety pages into advisory apps.
- Do not build a custom app surface before confirming the natural artifact.
- Do not mix PRD, review notes, scorecards, or developer language into user screens.
- Do not claim validation without observed user behavior.
- Do not use homepage as a dumping ground for every experimental route.

## 5. Core Product Rule

Every representative Flow Map must pass this chain:

```text
one primary source -> one clear user job -> one natural artifact -> minimal execution UI
```

If any link is missing, the candidate is not representative.

## 6. Candidate Status Model

Use these statuses before showing a candidate in product-facing surfaces.

| Status | Meaning | Allowed Surface |
| --- | --- | --- |
| Representative | Strong enough to compare against the current best Flow examples | Homepage, public entry, product demo |
| Candidate | Promising, but needs content or UX revision | Internal review page, direct route |
| Revise | Source/topic may work, but current conversion fails | PRD/tasks only until fixed |
| Park | Useful topic, but not a current FlowMe proof point | Backlog/research notes |
| Reject | Weak source, weak save intent, or wrong artifact | Do not build further unless source changes |

Homepage should show only `Representative` or intentionally labeled `Candidate` entries. In the current stage, avoid candidate breadth on homepage unless the page is explicitly an internal evaluation page.

## 7. Source Selection Gate

Before UI work, answer:

| Dimension | Required Question |
| --- | --- |
| Source context | Is there a real Korean source, creator page, official table, visible user demand, comments, views, downloads, or repeated usage signal? |
| User desire | Would a user save this after reading the source, not just find the topic interesting? |
| Execution structure | Does the source contain dates, offsets, rows, check targets, repeat interval, prompts, lesson list, or decision criteria? |
| Natural artifact | Does it clearly become calendar, checklist, sheet/progress table, memo, or bucket item? |
| Input simplicity | Can the user start with 0-2 fields, rarely 3? |
| Revisit value | Does the user return later to check, continue, reschedule, or reference the source? |

Reject or park the candidate when the answer depends on generic AI filler.

## 8. Flow Conversion Gate

Fill this before creating or revising UI:

```text
Primary source:
Source shape:
User job:
Natural artifact:
Top-level inputs:
Generated Step title pattern:
Generated date/repeat/deadline:
Source-derived Step rows:
Item/fallback text:
Memo/detail/URL contents:
Completion signal:
Do-not-build boundary:
```

Rules:

- Flow Map is the parent structure.
- Flow is a child artifact inside the map.
- Step is the minimum item that can become a calendar event, todo row, sheet row, memo row, or progress row.
- Item is supporting detail inside a Step. It may render as a checklist in FlowMe and plain text in external tools.
- Do not force fixed 3-item checklists.
- Do not expose top-level inputs unless they generate the artifact.
- Do not promote detail/memo/link fields into required setup.

## 9. UX Quality Bar

User-facing screens should stay close to calendar, reminder, todo, memo, or sheet complexity.

Representative UX requirements:

- The first screen makes the saved artifact obvious within 5 seconds.
- One primary save action is visible.
- Input count is minimal and source-earned.
- The page shows enough source context to trust the conversion, but does not read like a review document.
- Step detail opens where the user expects it.
- My Flow shows execution first, with map/source hierarchy only when useful.
- Buttons describe actual outcomes.
- Internal terms such as `source fit`, `PRD`, `review`, `developer`, `PoC`, and score labels stay out of user screens.

## 10. Current Candidate Reassessment

This table reflects the 2026-06-25 feedback and supersedes the previous eight-card homepage exposure.

| Candidate | Current status | Reason | Next action |
| --- | --- | --- | --- |
| `moving-d30` | Representative | Clear D-day life event, strong save reason, natural calendar/checklist artifact | Keep as the strongest practical baseline. Continue UI simplification only. |
| `middle-school-math-1` | Candidate / near representative | Flow Map hierarchy works, but source is dry and schedule handling is still unresolved | Keep for Flow Map/product-structure testing. Improve source summary, links, and optional scheduling later. |
| `baby-health-schedule` | Revise | Official schedule can be useful, but current Step action content has low information value and feels shallow | Rebuild from official schedule/table logic plus practical prep/source detail before homepage exposure. |
| `postal-address-transfer` | Park | Useful post-move utility, but current source/save intent is too narrow and not a strong representative Flow Map | Keep as utility research only; do not show as representative. |
| `smishing-response` | Reject for representative | One-off emergency response is better as a source link or safety memo, not a Flow Map proof point | Remove from representative batch unless a reusable response checklist source proves a better job. |
| `year-end-tax-submit` | Park / revise | Potential deadline checklist, but source and user job need stronger specificity; tax-sensitive boundary required | Re-source before any public candidate use. |
| `aircon-filter-cleaning` | Backup only | Some routine value, but weak as a platform proof and overlaps maintenance patterns already tested | Keep as low-priority routine example if a stronger manufacturer/creator source is attached. |
| `picnic-food-safety` | Reject for representative | Generic safety tips do not create a strong save/revisit reason | Do not promote unless tied to a concrete creator picnic-prep checklist or event plan. |

## 11. Homepage Exposure Policy

The homepage should not be an internal evaluation matrix.

Current homepage exposure:

- Keep: `moving-d30`
- Keep: `middle-school-math-1`
- Remove from homepage until revised: `baby-health-schedule`
- Remove from homepage: the five additional weak candidates

Experimental routes may continue to exist for direct testing, but they should not be framed as representative product examples.

Implementation note:

- Candidate decisions are encoded in `sourceBackedFlowMapQualityDecisions`.
- Homepage rendering uses `getSourceBackedHomepageFlowMaps()` so `homepageEligible` is the product gate.
- Direct-route availability is tracked separately as `directRouteEnabled`; it does not imply homepage or representative exposure.

## 12. Iteration Loop

Each new candidate must follow this order:

1. Source search and source evidence capture.
2. Source selection gate score.
3. Text-only Flow model.
4. UX journey simulation from original content consumption to save, execute, revisit.
5. Low-fidelity user UI.
6. Browser/click verification.
7. Rubric score and comparison to `moving-d30`.
8. Revise weakest dimension.
9. Only then promote to homepage/public representative slot.

Do not start UI before the text-only Flow model passes.

## 13. Evaluation Scale

Use a 10-point product-readiness score for user review, derived from the rubric:

| Score | Meaning | Action |
| ---: | --- | --- |
| 0-2 | Weak or wrong for FlowMe | Reject or park |
| 3-5 | Interesting but not representative | Re-source or keep as internal research |
| 6-7 | Candidate | Revise content/UX before product exposure |
| 8-9 | Representative | Can appear in homepage/demo with caveats |
| 10 | Exceptional | Can become a reference baseline after behavior evidence |

No candidate should be called validated without real user behavior data.

## 14. Verification Requirements

Before any candidate becomes representative:

- `npm run docs:check`
- `npm run build`
- Targeted E2E for homepage/public save/My Flow handoff
- Mobile viewport check around 390px width
- Overflow check
- User-screen copy scan for internal/review terms
- Source-to-Step trace check
- At least one persona simulation covering source read, save, first execution, detail open, memo/link use, and revisit

## 15. Immediate Next Work

1. Keep homepage exposure limited to `moving-d30` and `middle-school-math-1`.
2. Rebuild `baby-health-schedule` only after a stronger official/source-derived Step model is written.
3. Park or reject the five weak additional candidates for representative use.
4. For the next expansion batch, start with source research and text-only Flow models, not UI cards.
5. Compare every new candidate against `moving-d30` for practical save/execution value before homepage exposure.
