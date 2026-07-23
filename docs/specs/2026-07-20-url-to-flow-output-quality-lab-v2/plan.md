# Plan

## Phase 1 — Baseline and evidence freeze

1. Audit Prompt Lab v1, Taxonomy v1.1, source expansion, representative DTOs, the five-case preview and P0 display experiments.
2. Freeze the 18-case manifest and 12-case human review shelf.
3. Verify the full source scope and write gold landmarks/row roles before generation.
4. Freeze prompt, output envelope schema, validator and blind-review versions.

## Phase 2 — Round 1 generation

1. Generate feasibility, classification, canonical draft and five projections for all 18 cases.
2. Preserve failed/partial cases without filling missing rows from general knowledge.
3. Validate source references, omissions, status pairing and projection loss.
4. Render a rough source-to-result gallery for review, without polishing away defects.

## Phase 3 — Independent review

1. Compare a rules-first judgment, an independent conversion run and an independent review run.
2. Measure source completeness, checkability, primary artifact, classification, projection retention, Item keep rate and correction time.
3. Record disagreements before adjudication; do not reveal one reviewer result to another.
4. Select one global defect class for revision.

## Phase 4 — Round 2, Round 3 and exceptional Round 4

1. Change one prompt/schema/rule/validator boundary at a time.
2. Rerun failed/revise cases and all regression controls.
3. Run Round 3 only for stability or an unresolved blocking disagreement.
4. Allow Round 4 once only when the strengthened actual-payload validator newly exposes a prior control regression.
5. Stop after Round 4 and report unsupported shapes instead of adding fixture-specific exceptions.

## Phase 5 — Human review package

1. Promote only cases that pass the hard gates to the primary review shelf.
2. Put strong and controversial real examples on the opening screen.
3. Show original scope, extracted structure, feasibility, classification, Flow, projections, omissions/loss and review state together.
4. Run schema, validator, docs, script, source-link and responsive browser checks.
5. Ask the user to judge usefulness only after two consecutive clean batches.

## Ownership and conflict boundary

- Existing dirty files and the concurrent P0 gallery remain unowned inputs.
- This goal writes only under its new spec folder, its new content-audit evidence path and purpose-built validator/test files.
- App/runtime, existing seeds and in-progress gallery assets are read-only.

## Outcome

- Phases 1-5 completed on 2026-07-20.
- A strengthened actual-payload validator exposed Round 2 control regressions, so the one allowed unchanged-rule Round 4 stability batch was used.
- Round 3 and Round 4 both satisfy the hard, agreement, retention, correction-time and regression gates.
- The package is ready for the product owner's usefulness judgment; runtime implementation and observed-user testing remain separate next goals.
