# Plan

## Implementation

1. Add a failing E2E that detects the duplicate page-level progress card.
2. Remove the setup-column progress card from the shared Flow detail page.
3. Keep the export card copy aligned with the artifact-first flow.
4. Document natural artifact simulations and the current UX gap.
5. Capture desktop and mobile browser evidence.
6. Run full verification, open PR, and merge if checks pass.

## Review Checkpoints

- Keep the change common and small; do not reshape individual route content in this PR.
- Do not remove the workbench progress indicator because users still need local execution feedback.
- Do not imply that FLOW now has account-backed records; browser-local state remains browser-local.
- Keep export-first framing: FLOW helps users move the artifact into their calendar, sheet, checklist, or memo.
