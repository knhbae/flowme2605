# Tasks

Legend:

- `[x]` means the current machine-readable snapshot contains the artifact.
- Interactive UI and review checkboxes close only after the final browser pass;
  implementation presence alone is not sufficient.
- Observed-user validation and external Calendar/VTODO round-trip are not tasks
  completed by this lab.

## Inventory

- [x] Freeze input lineage and SHA-256 hashes.
- [x] Reconcile existing content IDs, URLs, jobs and duplicate relationships.
- [x] Assign Product/Structure/Boundary/Historical tiers.
- [x] Inspect 24+ new real source URLs. Current: 24.
- [x] Include 16+ distinct new source-backed normal contents. Current: 19;
  22 passed the normal gate and 3 reverified/merged an existing user job.
- [x] Reach at least 80 Product/Structure contents. Current: 110.

## Data

- [x] Build strict view-model schema.
- [x] Build corpus inventory, lineage, inclusion/exclusion and coverage.
- [x] Build complete content UI fixtures.
- [x] Generate five projection cells for every normal content. Current: 550.
- [x] Generate pacing and event interaction fixtures. Current: 16 and 14.
- [x] Generate loss, value, gap and planning handoff artifacts.
- [x] Generate direct-link manifest and corpus fingerprint.

The strict schema is exercised by the final validator and targeted tests.

## UI

- [x] Gallery search, filters, sort and card/list mode.
- [x] Next unreviewed navigation.
- [x] Full Item detail.
- [x] Calendar renderer.
- [x] Checklist renderer.
- [x] Todo renderer with capability fallback.
- [x] Sheet renderer.
- [x] Memo renderer.
- [x] Pacing playground.
- [x] Event Series/Edition/Occurrence UI.
- [x] Actual data-lineage view.
- [x] Review localStorage, export, import, merge/replace and rollback.
- [x] Coverage and disagreement views.

## Review

- [x] Independent internal review A.
- [x] Independent internal review B.
- [x] Agreement and disagreement comparison.
- [x] Manually adjudicate all 141 trace-only semantic fields.
- [x] Link all 17 `needs_modify` field keys to 11 affected contents, planning
  decisions and gap records.
- [x] Generate a provisional internal value readjudication artifact.
- [x] Generate draft planning decision handoff.
- [x] Generate Korean summary review report.

The final A2/B2 files each cover 110/110 records, use the same frozen input
fingerprints and remain internal evidence only. The phrase “UI-based” is
intentionally not used as observed-user evidence.

## QA

- [x] Schema validation.
- [x] Reference and count reconciliation.
- [x] Semantic-invention audit.
- [x] Manual semantic adjudication self-validation: 13/13.
- [x] Keep completion 412 and schedule 124 owner/derivation gaps open.
- [x] Keep full-corpus zero-invention claim at `NOT_PROVEN`.
- [x] Projection, pacing, event and review-state unit tests.
- [x] Mutation tests.
- [x] Docs check.
- [x] Integrated validator: 61/61.
- [x] Targeted tests: 14/14.
- [x] 1440×900 browser QA.
- [x] 768×1024 browser QA.
- [x] 390×844 browser QA.
- [x] Console, overflow, broken asset and empty-state checks.
- [x] Visual fidelity ledger.
- [x] Scope and publish-state closeout.

Current external evidence states:

- final browser QA: `PASS`;
- user review: `NOT_REVIEWED_BY_USER`;
- observed-user validation: `NOT_RUN`;
- external Calendar/VTODO round-trip: `NOT_RUN`.

Final route evidence covers 156 detail routes, 550 normal projection routes,
53 pacing routes, 14 event routes, 156 review routes and 156 lineage routes,
with zero failed route. This is automated/internal evidence, not a user
verdict.
