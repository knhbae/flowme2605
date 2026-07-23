# Flow Content Discovery Admission

## Status

Review package. Product code and seed data are out of scope.

## Problem

Existing Flow contracts define runtime data well, but content scouting still risks treating every useful URL as a multi-step Flow. This package adds a discovery admission layer without replacing the canonical model.

## Decision proposal

1. Classify source candidates as Link/Bucket, Quick Flow, Full Flow, or Hold/Reject.
2. Keep structural tier separate from source, freshness, rights, safety, and locale gates.
3. Default activation to zero-input undated save; request only values that change the result.
4. Use the current Item model and projection contracts. Do not create a parallel runtime taxonomy.

## Outputs

- docs/content-audit/2026-07-20-flow-content-discovery-admission-goal-ko.md
- docs/content-audit/2026-07-20-flow-content-discovery-admission-contract-v1.json
- docs/content-audit/2026-07-20-flow-content-discovery-p0-reclassification-v1.json
- docs/content-audit/2026-07-20-flow-content-discovery-candidate-ledger-v1.json
- docs/content-audit/2026-07-20-flow-content-discovery-admission-strategy-ceo-ko.html
