# FlowMe Text Authoring Grammar Simulation

Date: 2026-07-31  
Goal: TA-GRAMMAR-SIM-01

## Run

```powershell
npm.cmd run sync:text-authoring-demo-examples
npm.cmd run build:text-authoring-html
npm.cmd run capture:text-authoring-grammar-ui
npm.cmd run simulate:text-authoring-grammar
npx.cmd tsx --test lib/flow/text-authoring/grammar-simulation.test.ts
```

## Outputs

- `flowme-text-authoring-grammar-simulation-ko.html`
- `grammar-simulation-results.json`
- `ui-simulation-evidence.json` and screenshots when browser evidence is present

## Claim boundary

This is automated internal simulation and QA. It is not observed-user
validation, public readiness, deployment evidence, or AI generation quality.

## Current repository snapshot

- Branch: `codex/text-authoring-ta-implementation-20260729`
- Commit: `c09f859b30b8`
- Dirty paths at generation: 35
- Scenario result: 27/27 passed
- Demo dropdown: existing content 8, condition changes 8, compatibility 6, expected-review inputs 5
- Route/standalone UI result: 12/12 passed
- Standalone bytes: 2075488
- Standalone SHA-256: `9aa298540d9bf445161a63cf32b901629ed75b90529c750297ba317d9a38a787`
