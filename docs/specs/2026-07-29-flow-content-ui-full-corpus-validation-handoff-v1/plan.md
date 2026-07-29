# Plan

## Current progress snapshot

| Phase | Status | Current evidence |
| --- | --- | --- |
| 1. Freeze and inventory | `COMPLETE_FOR_CURRENT_SNAPSHOT` | 167 raw, 123 source-backed raw, 156 Gallery and 110 normal records; 24 new URLs yielded 19 distinct additions plus 3 existing-job reverifications |
| 2. Derived data and engines | `COMPLETE_FOR_CURRENT_SNAPSHOT` | 893 Item, 1,172 SourceRow, 550 projection cells, 16 pacing and 14 event fixtures |
| 3. Interactive Gallery | `COMPLETE_BROWSER_QA_PASS` | 156 detail, 550 normal projection, 53 pacing, 14 event, 156 review and 156 lineage routes passed on final Gallery SHA `021667d1…af56` |
| 4. Independent review and planning handoff | `COMPLETE_INTERNAL_EVIDENCE_USER_REVIEW_PENDING` | Final A2/B2 runs cover 110/110 records; manual SourceRow adjudication covers 141/141 fields with 17 Modify keys across 11 contents; synthesis now links 10 gaps and 16 draft decisions |
| 5. Validation and handoff | `COMPLETE_INTERNAL_QA` | Validator 61/61 and targeted tests 14/14 pass; 1440×900, 768×1024 and 390×844 browser QA has zero route failure, overflow, broken asset or console error |

Observed-user validation and external Calendar/VTODO round-trip both remain
`NOT_RUN`. Completing this plan must not change those states without the
corresponding external evidence.

## Phase 1 — Freeze and inventory

1. Hash all source artifacts.
2. Reconcile canonical, event, creator, qualified, benchmark and historical UX
   records by canonical URL plus user job.
3. Record tier, readiness, duplication, inclusion and exclusion.
4. Directly inspect at least 24 additional real sources.

Exit:

- existing eligible omission reasons are complete;
- at least 80 Product/Structure records are source-backed;
- at least 16 newly inspected normal records are included;
- boundary records are counted separately.

## Phase 2 — Derived data and engines

1. Normalize content modes without rewriting frozen source artifacts.
2. Generate five projection cells for every normal record.
3. Generate pacing fixtures for representative undated content.
4. Normalize event Series/Edition/Occurrence and user-intent previews.
5. Generate lineage graph, coverage, loss, direct-link and review contracts.

Exit:

- every normal content has five explained cells;
- every Item and generated record has provenance;
- all counts reconcile from machine-readable data.

## Phase 3 — Interactive Gallery

1. Implement hash routing and Gallery search/filter/sort/view mode.
2. Render full Flow detail and every Item.
3. Render Calendar, Checklist, Todo, Sheet and Memo differently.
4. Implement pacing, event and data-lineage modes.
5. Implement local review, JSON export/import, merge/replace and rollback.
6. Implement coverage and discrepancy views.

Exit:

- every included content has a working direct link;
- no empty detail or unexplained projection state;
- user review is isolated from internal-agent review.

## Phase 4 — Independent review and planning handoff

1. Freeze one input manifest hash.
2. Run two reviews without peer output, existing final adjudication or user
   review.
3. Show all disagreements.
4. Rejudge content value from the actual UI.
5. Produce repeated gap counts and planning decision candidates.

Exit:

- all targets have two internal review records;
- disagreements and Modify/Hold records remain visible;
- no decision is labeled user-approved.

## Phase 5 — Validation and handoff

1. Validate strict schema, references, schedules, projections, events and
   reviews.
2. Run unit and mutation tests.
3. Run docs checks.
4. Browser-test direct links, filters, review round-trip and all interactive
   states at 1440×900, 768×1024 and 390×844.
5. Capture screenshots, console, overflow and broken-asset evidence.
6. Compare the final UI to the accepted design concepts and record a fidelity
   ledger.

Exit:

- automated QA passes;
- 141/141 manual semantic decisions and all 17 Modify field keys remain linked
  to their content, planning decisions and open gaps;
- completion 412 and schedule 124 provenance gaps remain explicitly open and
  zero invention remains `NOT_PROVEN`;
- observed-user and external Calendar status remain accurately `NOT_RUN`;
- production code and existing dirty files remain untouched.

## Final handoff order

1. Rebuild all generated data and HTML from the final frozen inputs.
2. Run schema, validator, targeted tests and docs checks.
3. Complete browser QA at 1440×900, 768×1024 and 390×844.
4. Record console, overflow, broken-asset, direct-link and interaction evidence.
5. Leave the Gallery open for direct user review.
6. Keep every planning recommendation at `DRAFT_PENDING_USER_REVIEW` until the
   user submits review data.

The final machine and browser evidence is recorded in
`validation-results-v1.json`, `browser-qa-v1.json` and
`design-fidelity-ledger-v1.md`. Independent A2/B2 judgments remain tied to
their frozen pre-normalization hashes; final source-field, tier and display
normalizations were not relabeled as an additional independent review.
