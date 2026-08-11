# FlowMe Text Authoring Grammar Simulation

Date: 2026-07-31
Goal: TA-GRAMMAR-SIM-01

## Run

```powershell
npm.cmd run sync:text-authoring-demo-examples
npm.cmd run test:text-authoring
npm.cmd run build:text-authoring-html
npm.cmd run simulate:text-authoring-grammar
npm.cmd run capture:text-authoring-review
npx.cmd tsx --test lib/flow/text-authoring/grammar-simulation.test.ts
```

## Outputs

- `flowme-text-authoring-grammar-simulation-ko.html`
- `grammar-simulation-results.json`
- current v5 browser evidence in `../2026-08-11-flowme-text-authoring-exception-coverage-v5-results/`

## Claim boundary

This is automated internal simulation and QA. It is not observed-user
validation, public readiness, deployment evidence, or AI generation quality.

## Current repository snapshot

- Branch: `codex/text-authoring-v5-integration-20260811`
- Commit: `0758bb482393`
- Dirty paths at generation: 27
- Scenario result: 30/30 passed
- Demo dropdown: existing content 8, condition changes 11, compatibility 6, reviewed exceptions 5, review needed 0
- Route/standalone UI result: not captured
- Standalone bytes: 2166914
- Standalone SHA-256: `2919f47dc4edc07408216ec17360fc8ca0d87f1b6543f6bfa78114dea848f2ec`
