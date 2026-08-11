# R3B QA Matrix

## Targeted contracts

| Area | Required evidence |
| --- | --- |
| Selected Plan surface | Component DOM/test-ID parity and approved My Plan browser journeys |
| Sort and route | Fixed six-plan order, explicit query, Back, scroll, focus, storage writes `0` |
| Item detail/editor | Read/edit/cancel/discard/focus and row 1/24 return behavior |
| Calendar | Selected date and Item inspector stay on Calendar; completion and Undo |
| Transfer | TXT/VTODO/VEVENT/XLSX byte/parse parity and effect-before-receipt |
| Rollback | `savedPlanLibrary=off` storage bytes/write counts and legacy transfer |
| Responsive | 375/390/430/640/767/768/1023/1024/1279/1280/1440 |

## Commands

```powershell
npm.cmd run test:approved-plan-execution
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
npx.cmd playwright test tests/e2e/approved-plan-execution-ux.spec.ts --workers=1
npx.cmd playwright test --workers=1
git diff --check
npm.cmd run workflow:closeout
```

## Current R3B and hotfix evidence

| Check | Current state |
| --- | --- |
| Canonical source hashes | `PASS` — the seven recorded user-owned source files re-read `7/7` at their pinned SHA-256 values |
| R3B approved unit | `PASS` — pre-merge `npm.cmd run test:approved-plan-execution`, `176/176` |
| R3B aggregate verification | `PASS` — pre-merge `npm.cmd run verify` completed docs, full `npm test`, and the Next production build |
| Hotfix unit/contract | `PASS` — `182/182` |
| AppClient storage lock | `PASS` — `npm.cmd run test:p35-appclient-lock`, `59/59` |
| Documentation | `PASS` — 16 required files and 4,499 local links for this documentation-only closeout |
| Repository diff check | `PASS` — `git diff --check` exited `0` for this documentation-only closeout |
| Security | `PASS` — configured audit findings `0` |
| R3B production build | `PASS` — pre-merge Next production build generated `18/18` pages; BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Hotfix production build | `PASS` — `18/18`, BUILD_ID `wjpnPhhhMBaWzGTXuxK7U` |
| Hotfix focused browser | `PASS` — P26 `1/1` and targeted Escape regression `3/3` |
| Hotfix approved browser | `PASS` — approved plan-execution `23/23` |
| Scoped browser migrations | `PASS` — overlapping targeted evidence: Group B `33/33`, P26 `40/40`, D1 `68/68`, P28-P31 `37/37`, P35 saved library `18/18`, Q3 `12/12` plus off-lane `7/7`, 50-Item `1/1`, legacy transfer `26/26`, and Calendar `2/2`; these counts are not a repository-wide denominator |
| Hotfix full Playwright | `PASS` — `569/569`, failures `0`, skips `0`, flaky `0`, workers `2`, exact BUILD_ID `wjpnPhhhMBaWzGTXuxK7U` |
| PR #172 and initial deployment | `PASS` — [PR #172](https://github.com/knhbae/flowme2605/pull/172) merged as `a599370496ee95a52d14cddd27c94b0c8190a863`; exact-head and post-merge CI passed, and Production deployment record `5841506853` succeeded |
| Canonical initial smoke | `FAIL` — `21/23`; nested child-sheet Escape and immediate 767px fallback-editor Escape both failed and repeated in targeted checks, requiring PR #173 |
| PR #173 exact-head CI | `PASS` — [PR #173](https://github.com/knhbae/flowme2605/pull/173) final head `210b7c3ae027782fd91a003e88624b38d0243e74`; run [`31448713920`](https://github.com/knhbae/flowme2605/actions/runs/31448713920) passed [Docs job `93648377755`](https://github.com/knhbae/flowme2605/actions/runs/31448713920/job/93648377755) and [Playwright job `93648377771`](https://github.com/knhbae/flowme2605/actions/runs/31448713920/job/93648377771); Vercel Preview succeeded |
| Hotfix merge | `PASS` — PR #173 merged as `2b937ce811b518950f495341d05736ebd102887a` at `2026-08-11T01:31:11Z` |
| Post-merge main CI | `PASS` — run [`31449546812`](https://github.com/knhbae/flowme2605/actions/runs/31449546812) passed [Docs job `93650860049`](https://github.com/knhbae/flowme2605/actions/runs/31449546812/job/93650860049) and [Playwright job `93650860029`](https://github.com/knhbae/flowme2605/actions/runs/31449546812/job/93650860029) |
| Current Production deployment | `PASS` — GitHub deployment record `5842830294`, status `16645165737`, identifies exact source `2b937ce811b518950f495341d05736ebd102887a` and the [direct deployment URL](https://flowme2605-itg4dhbbt-flowme.vercel.app); anonymous direct access redirects to Vercel login. The [canonical alias](https://flowme2605.vercel.app) served the app and passed `23/23`; the [Vercel record](https://vercel.com/flowme/flowme2605/DdeVFrodzmA587Rg8NEguB667Fgf) reports success |
| Canonical production smoke | `PASS` — approved spec `23/23`, workers `1`, retries `0`, `62.9s` (displayed `1.0m`), output `r3b-production-hotfix-2b937ce` |
| Observed-user validation | `0`; automation does not change this count |

## Publication result

- PR #173 exact-head CI, merge, post-merge main CI, exact-source Production
  deployment, and the canonical `23/23` production smoke are complete.
- The earlier `21/23` result remains failure evidence that explains the bounded
  hotfix; it is not the final release state.
- Screenshots and automated checks are internal QA, not observed-user evidence;
  the observed-user count remains `0`.
