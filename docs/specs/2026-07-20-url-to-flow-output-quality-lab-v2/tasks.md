# Tasks

## Baseline

- [x] Register the goal and establish the dirty-worktree baseline.
- [x] Audit Prompt Lab v1 criteria and the K-MOOC sparse-fixture failure.
- [x] Audit the current usage preview and P0 display assets as presentation references.
- [x] Freeze 18 case IDs: 8 core positive, 4 core boundary, 4 positive controls and 2 negative controls.
- [x] Confirm full source scope, expected row count and landmark list for every case.
- [x] Label every gold row as Item, Field, Memo, Reference, Conditional response or Omission.

## Contracts and validators

- [x] Write `case-manifest-v2.json`.
- [x] Write `gold-source-contract-v2.json`.
- [x] Write `output-envelope-v2.schema.json`.
- [x] Extend the review rubric with extraction completeness, checkability and projection retention.
- [x] Add validators for full-source scope, status pairing, role assignment, primary artifact and projection loss.
- [x] Add negative fixtures for sparse source, invented schedule, forced checklist, unsupported conditional shape, rights hold and no executable job.

## Round 1

- [x] Generate all 18 blind outputs with one frozen contract.
- [x] Validate every output and preserve raw results.
- [x] Preserve the uncorrected baseline in Round 1 and show its before/after defects in the integrated gallery and comparison.
- [x] Run three independent classification/conversion judgments.
- [x] Record corrections, keep rate, correction time and disagreements.

## Round 2 / Round 3 / stability Round 4

- [x] Select the highest-risk global defect and revise one contract element.
- [x] Rerun all failed/revise cases and six controls.
- [x] Reject fixture-specific exceptions and control regressions.
- [x] Run a third round only if two consecutive clean batches are not established.
- [x] If a strengthened validator newly exposes a prior control regression, run one final unchanged-rule stability batch.
- [x] Stop at Round 4; no unresolved blocking boundary remained.

## Human review package

- [x] Build `review-results-v2.json` and `comparison-v2.json`.
- [x] Build the Korean HTML review gallery with core 12 first and controls in an appendix.
- [x] Put at least four strong and two controversial examples on the opening screen.
- [x] Show source, possible/partial/hold reason, classification, canonical result, projection and loss for every core case.
- [x] Verify JSON/schema/validators, docs, inline scripts, local links and responsive layout.
- [x] Request user review only after the human review request gate passes.

## Explicit non-tasks

- [x] Do not modify app runtime, DB, current seeds, real LLM API or crawler.
- [x] Do not claim model price-tier comparison without measured provider evidence.
- [x] Do not call agent or browser QA observed-user validation.
- [x] Do not commit, push, open a PR, merge or deploy.
