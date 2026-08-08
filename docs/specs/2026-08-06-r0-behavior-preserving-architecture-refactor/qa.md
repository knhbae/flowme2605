# R0 QA Evidence

## Environment

| Field | Value |
| --- | --- |
| Worktree | `D:\\flowme2605\\flow-r0-refactor` |
| Branch | `codex/r0-behavior-preserving-architecture-refactor-20260806` |
| Baseline HEAD | `6612c4a344a8dbd24d087d50883d480b5be45397` |
| Node | `v24.17.0` |
| npm | `11.13.0` |
| Production smoke | `NOT_RUN` — no deployment or production mutation is in R0 |
| Observed-user sessions | `0` — automated checks are not user validation |

## Baseline Evidence Before Runtime Changes

| Lane | Result |
| --- | --- |
| Docs | PASS — 16 required docs and 4,465 local links |
| AppClient lock contract | PASS — 59/59 |
| Unit/contract pretest | PASS — 114/114 |
| Main unit suite | PASS — 615/615 |
| Production build | PASS |
| Representative My Flow/Calendar E2E | PASS — 14/14 |

## Slice Evidence

| Slice | Evidence | Result |
| --- | --- | --- |
| R0-01A/B | Calendar view-model characterization and related tests | PASS — 23/23, including 12 new characterization tests |
| R0-01B | AppClient lock contract | PASS — 59/59 |
| R0-01B | Calendar browser regressions | PASS — 9/9 |
| R0-02A | Production build | PASS |
| R0-02A | Calendar browser regressions | PASS — 9/9 |
| R0-02B | Production build | PASS |
| R0-02B | My Flow/library/detail/history/flag browser regressions | PASS — 32/32 |

## Final Gate

| Check | Result |
| --- | --- |
| `npm.cmd run docs:check` | PASS — 16 required docs and 4,467 local links |
| `npm.cmd run test:p35-appclient-lock` | PASS — 59/59 |
| `npm.cmd test` | PASS — pretest 126/126 including the new Calendar cases, then 615/615 main tests |
| `npm.cmd run build` | PASS — 18/18 static pages generated and existing route exports compiled |
| `npm.cmd run test:e2e` | PASS — 533/533 |
| `git diff --check` | PASS |
| 390/1024/1440 representative browser inspection | PASS — 6/6 My Flow/Calendar captures; no document/body overflow, console error, page error, or failed HTTP response |

The first viewport-helper attempt matched both visible and intentionally hidden
My Flow `<main>` elements at desktop widths. That was a strict-selector error
in the temporary inspection harness, not a product failure. The selector was
narrowed to the visible `<main>` and the final six-case run passed. The
temporary test file was then removed; inspected screenshots remain under
`output/playwright/r0-visual-inspection/` as local evidence.

## Publish-State Ledger

| State | Result |
| --- | --- |
| Local implementation | COMPLETE — all final local gates passed |
| Commit | COMPLETE — implementation `1bc0868`; QA blockers `b03779f`; publication record follows separately |
| Push | COMPLETE — `origin/codex/r0-behavior-preserving-architecture-refactor-20260806` |
| Pull request | DRAFT — [#168](https://github.com/knhbae/flowme2605/pull/168) |
| Merge | NOT_RUN — not authorized |
| Vercel preview | PR-integrated preview check only; no production alias change |
| Production deployment | NOT_RUN — not authorized |
| Production smoke | NOT_RUN |
| Observed-user validation | NOT_RUN; sessions `0` |

## Interpretation

Passing automated and browser regression checks supports the claim that the
local refactor preserves the tested behavior. It does not constitute a
production deployment, production smoke test, external artifact round trip, or
observed-user validation.
