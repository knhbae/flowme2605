# URL-to-Flow P0 ten-URL benchmark

This folder is the inspectable evidence package for the 2026-07-19 ten-URL experiment. It is a bounded internal adapter decision, not a public-ready content release.

## Read first

- `report.html`: Korean PPT-style CEO decision report; actual Flow content appears before scores.
- `case-gallery.html`: all ten source snapshots, selected Flows or hold states, Items, completion criteria, projections, artifacts, raw-lane gates, reviews, and repairs.
- `benchmark-summary.json`: aggregate counts, proxy measurements, and backend decision.
- `selected-flows.json`: hard-gate-first selected package for all ten cases.
- `selected-validation.json`: deterministic validation of the selected package.

## Frozen evidence

- `source-snapshots.json`: current URL snapshots or explicit fallback state.
- `model-runs/lower-cost.json`: isolated lower-cost session-model proposal output.
- `model-runs/higher-capability.json`: isolated higher-capability session-model proposal output.
- `validation-summary.json`: raw-output validation. Its 44 hard errors are intentional evidence and must not be overwritten by repaired results.
- `review-packets/`: reversed-order blind packets and the private lane order map.
- `review-results/`: two blind model-proxy reviews. These are not human reviews.
- `editorial-repairs/lower-cost-repaired.json`: separately logged evidence-only repair proxy for three cases. Its points are not human edit distance.

## Reproduction order

Run from the repository root:

```powershell
node scripts/content-audit/capture-url-to-flow-ten-url-snapshots.mjs
node scripts/content-audit/build-url-to-flow-ten-url-review-packets.mjs
node scripts/content-audit/validate-url-to-flow-ten-url-experiment.mjs
node scripts/content-audit/assemble-url-to-flow-ten-url-benchmark.mjs
node scripts/content-audit/build-url-to-flow-ten-url-benchmark-report.mjs
node scripts/content-audit/validate-url-to-flow-ten-url-report.mjs
```

The raw validator is expected to exit non-zero while frozen raw model outputs contain exact-evidence failures. The selected assembler must pass only after invalid raw cases are excluded or repaired in a separate file.

Model generation, blind reviews, and the editorial repair are session-proxy steps driven by:

- `docs/specs/2026-07-18-url-to-flow-value-uplift-v4/phase2-generation-prompt.md`
- `docs/specs/2026-07-18-url-to-flow-value-uplift-v4/experiment-contract.json`
- `docs/specs/2026-07-18-url-to-flow-value-uplift-v4/phase2-ten-url-experiment.md`

## Decision boundary

- Minimum internal snapshot/proposal/validator adapter: `conditional_go`.
- Production URL/AI backend: `hold`.
- Automatic publication: `no_go`.

Actual provider billing, request IDs, generation latency, retries, human pairwise review, and human edit distance remain unmeasured.
