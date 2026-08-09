# R3A My Flow Experience Boundary QA

## Baseline

| Field | Value |
| --- | --- |
| Worktree | `D:\\flowme2605\\flow-r3a` |
| Branch | `codex/r3a-my-flow-experience-boundary-20260809` |
| Baseline | `efa4d90a78a06134180701bed74874579ac94154` |
| Implementation commit | `eeac99213b58eeafb8f39b2cc71c723e6fa32712` |
| Publication commit | `950fd55f4176bf74d4739647040874a601faffcc` |
| Merge commit | `95a69257c73633077df2305232299f58cca03f73` |
| Pull request | [PR #169](https://github.com/knhbae/flowme2605/pull/169), merged 2026-08-09 KST |
| GitHub run | [`31285007308`](https://github.com/knhbae/flowme2605/actions/runs/31285007308) |
| Product default | `classic` |
| Storage/schema migration | None |
| Deployment | Vercel `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek`; exact merge source verified; `READY` |
| Deployment URLs | [Direct](https://flowme2605-a0aasd9ic-flowme.vercel.app) / [canonical](https://flowme2605.vercel.app) |
| Observed-user sessions | `0` |

## Required Evidence

| Lane | Required result | Current result |
| --- | --- | --- |
| Snapshot and selector units | Deterministic, JSON-safe, pure, exact fallback | PASS; focused boundary set `72/72`, including snapshot `7/7` and selector `3/3` |
| Host static render | Classic parity and exact candidate routing | PASS `4/4`; null, degraded, and ineligible states fail closed |
| AppClient lock contract | Existing write ownership unchanged | PASS `59/59` |
| Full unit/contract | No regression | PASS; pretest `164/164`, P35 P0 contract `420/420`, main unit/contract `615/615` |
| Production build | Compile and route generation pass | PASS; compile/typecheck and static generation `18/18` |
| Selected My Flow E2E | Route/Back/focus/scroll and bytes unchanged | PASS in final full suite; candidate focused journey also PASS `1/1` |
| R3A candidate E2E | Selector, intents, fallback, zero writes | PASS `4/4`; exact/invalid/ineligible selector, List -> Plan -> Item -> Back, focus, raw local/session bytes, mutation calls `0`, search/filter/archive transitions, and mobile inventory expansion |
| Responsive browser | 390/1024/1440; overflow/errors/unnamed controls zero | PASS at all three widths; automated diagnostics zero and screenshots visually inspected |
| Full Playwright | No runtime regression | PASS `545/545` with four workers in `21.8m`; the later coverage-only R3A addition passed separately as `4/4` |
| GitHub CI | PR-head checks, tree-identical to merge | PASS; head `950fd55f4176bf74d4739647040874a601faffcc` and merge `95a69257c73633077df2305232299f58cca03f73` have the same tree; Docs, Unit, Build, and Playwright `546/546` passed in run `31285007308` |
| Production deployment | Exact merge-source deployment | PASS; GitHub deployment source `95a69257c73633077df2305232299f58cca03f73`, Vercel `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek`, `READY`, canonical alias assigned |
| Production smoke | Classic default and exact-query lab | PASS; `/my?demo=ux20` rendered classic with lab absent, exact `r3a-lab` rendered the candidate with 20 rows on desktop, search narrowed to 1 row, 390px inventory expanded from 8 to 20, horizontal overflow `0`, console error messages `0`, and recorded failed requests `0` |
| Scoped diff | No storage/export/receipt implementation changes | PASS; independent audit P0/P1 `0`, incidental P35 screenshot rewrites restored |

## Run Notes

- A selected 38-test parallel run passed `37/38`; one unchanged P0-10
  integration scenario reached the 30-second test timeout after showing a
  successful transfer. Its isolated rerun passed `1/1` in `6.9s`, and the same
  scenario passed again in the final full `545/545` run.
- One full-suite attempt was stopped when an independent audit found that
  classic/Calendar still built the lab snapshot. The implementation was changed
  so only an eligible exact `r3a-lab` request constructs it, then every required
  lane was rerun.
- A later full-suite shell attempt reached its outer 15-minute command limit
  without a Playwright failure summary. The final run used a sufficient outer
  limit and completed `545/545` successfully.
- Repository protection did not require the Playwright job, so the requested
  auto-merge completed while that job was still running. Final closeout waited
  for the PR-head run to finish `546/546` successfully and verified that its
  tree matched the merge commit before the deployment and smoke were accepted.

## Evidence Boundary

Passing internal checks, GitHub CI, exact-source deployment verification, and
production smoke establishes a structurally coherent, contract-safe deployed
candidate. It does not establish external calendar/todo interoperability, user
comprehension, preference, or observed usability.
