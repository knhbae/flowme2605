# Source Risk Item Copy Polish Spec

**Date:** 2026-05-23
**Status:** In Progress
**Owner:** Codex
**Related roadmap:** `docs/ROADMAP.md` Stage 0 content/UX hardening

## Goal

After PR #25 added artifact surfaces for twelve source replacement and risk review routes, make each checklist item point to the artifact, official question, proof record, or stop condition that the user must keep. The route should no longer rely on blank details, repeated generic official guidance, or generic completion text.

## Stage Fit

This is still Stage 0 execution hardening. It improves copy specificity and export usefulness, but it does not promote these routes to validated or representative status and does not claim medical, tax, labor, business, or benefit eligibility.

## User Need

As a user opening one of the reshaped routes, I need every item to explain what record I should add to the sheet, memo, log, table, or calendar, so that completing the checklist creates a portable artifact instead of a private checkmark.

## Scope

In:
- Add route-scoped item copy polish for the twelve source replacement/risk review routes.
- Preserve existing links and source/risk metadata while filling missing `why`, `how`, and `completion_criteria`.
- Add regression coverage that all twelve routes have complete, artifact-specific item details.
- Record FLOW quality notes and representative exposure decision.

Out:
- Representative promotion.
- Live official-source validation.
- Item-by-item legal, medical, tax, or labor advice.
- New UI components.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Read the first item and know which artifact field or official question it updates. |
| Completion signal | Every item has a concrete `completion_criteria` tied to a record, proof, question, status, or stop condition. |
| Artifact destination | Existing PR #25 surfaces: study logs, diet sheets, car evidence table, official/risk memo cards. |
| Source/risk boundary | Sensitive conclusions are recorded as official questions, not generated answers. |
| Natural artifact | The item copy points back to the route's simulated artifact from the PR #25 audit. |
| Verification | RED/GREEN seed test plus full test/build/e2e before PR. |

## Acceptance Criteria

- All twelve routes have item detail coverage equal to item count.
- No target route item uses the previous generic official why/how text or generic `이 항목을 완료했어요.` completion.
- Each target route item detail references an artifact, official question, proof/status record, or stop condition.
- Docs record the representative exposure decision: remain `reshape_before_featured` until user behavior evidence and deeper source-specific rewrites exist.
