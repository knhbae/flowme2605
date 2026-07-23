# Benchmark adjudication ledger v1

`evaluate-generalization-v1.mjs` separates structural checks from semantic review. A run's `selfReview` is diagnostic input only; it is never sufficient evidence that invention, meaning loss, or source-value re-entry is zero.

## Initialize the ledger

After all 54 run envelopes exist and pass `validate-generalization-v1.mjs`, create a pending ledger:

```powershell
node docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/evaluate-generalization-v1.mjs `
  --manifest docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/source-manifest-v1.json `
  --gold docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/gold-source-contract-v1.json `
  --run docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/runs `
  --init-adjudication docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/adjudication-ledger-v1.json
```

The command refuses to overwrite an existing ledger unless `--force` is supplied. A pending ledger cannot be evaluated.

## Review contract

Review each `caseId + role` entry independently against the gold source contract.

- `rowJudgments`: cover every gold SourceRow exactly once. Use `preserved`, `partially_preserved`, `lost`, or `not_applicable`. A row marked `requiredForMeaning` cannot be `not_applicable`.
- `itemJudgments`: cover every generated Item exactly once. `semanticSupport` checks whether the cited SourceRows actually support the Item, not merely whether the references exist. Add every invented `action`, `date`, `repeat`, `completion`, `condition`, `location`, `field`, or `other` label.
- `inputJudgments`: cover every proposed input exactly once. Mark semantically source-derived re-entry even when the model used a different field name.
- `runInventions`: record invented content outside an Item, such as a projection-level schedule or a first-class field.
- `usability`: use `directly_usable`, `usable_after_minor_edit`, `requires_major_edit`, or `not_usable` for positive cases. Use `correct_stop` only when a boundary case actually stops without canonical Items or usable projection payloads.
- `actualCost`: leave `null` unless a provider API was actually used and both token counts are measured. The accepted bases are provider billing evidence or verified current prices applied to measured tokens. The evaluator never imputes missing cost.

For every changed, unsupported, partially preserved, lost, or invented element, write a short note. Set the entry and root timestamps only after review is complete.

## Evaluate

```powershell
node docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/evaluate-generalization-v1.mjs `
  --manifest docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/source-manifest-v1.json `
  --gold docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/gold-source-contract-v1.json `
  --run docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/runs `
  --adjudication docs/specs/2026-07-21-flow-content-generalization-benchmark-v1/adjudication-ledger-v1.json `
  --out-dir docs/specs/2026-07-21-flow-content-generalization-benchmark-v1
```

This writes the five required derived artifacts. `final-holdout-results-v1.json` is the decisive generalization score; calibration remains diagnostic. All output documents state that this is internal automated and adjudicated QA, not observed-user validation.
