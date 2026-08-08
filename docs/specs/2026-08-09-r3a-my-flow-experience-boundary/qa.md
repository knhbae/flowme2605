# R3A My Flow Experience Boundary QA

## Baseline

| Field | Value |
| --- | --- |
| Worktree | `D:\\flowme2605\\flow-r3a` |
| Branch | `codex/r3a-my-flow-experience-boundary-20260809` |
| Baseline | `efa4d90a78a06134180701bed74874579ac94154` |
| Commit | `eeac99213b58eeafb8f39b2cc71c723e6fa32712` |
| Pull request | [Draft PR #169](https://github.com/knhbae/flowme2605/pull/169) |
| Product default | `classic` |
| Storage/schema migration | None |
| Deployment | Vercel production deployment authorized 2026-08-09; pending |
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

## Evidence Boundary

Passing internal checks can establish a structurally coherent, contract-safe
internal candidate. It does not establish production deployment, external
calendar/todo interoperability, user comprehension, preference, or observed
usability.
