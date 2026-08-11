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
| Documentation | `PASS` — 16 required files and 4,499 local links after hotfix evidence reconciliation |
| Repository diff check | `PASS` — `git diff --check` exited `0` |
| Security | `PASS` — configured audit findings `0` |
| R3B production build | `PASS` — pre-merge Next production build generated `18/18` pages; BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Hotfix production build | `PASS` — `18/18`, BUILD_ID `wjpnPhhhMBaWzGTXuxK7U` |
| Hotfix focused browser | `PASS` — P26 `1/1` and targeted Escape regression `3/3` |
| Hotfix approved browser | `PASS` — approved plan-execution `23/23` |
| Scoped browser migrations | `PASS` — overlapping targeted evidence: Group B `33/33`, P26 `40/40`, D1 `68/68`, P28-P31 `37/37`, P35 saved library `18/18`, Q3 `12/12` plus off-lane `7/7`, 50-Item `1/1`, legacy transfer `26/26`, and Calendar `2/2`; these counts are not a repository-wide denominator |
| Hotfix full Playwright | `PASS` — `569/569`, failures `0`, skips `0`, flaky `0`, workers `2`, exact BUILD_ID `wjpnPhhhMBaWzGTXuxK7U` |
| PR #172 required CI | `PASS` — final head `b1106b6a319eb2ff5671be99ab446d68d6597f0b` passed exact-head required checks; post-merge CI run [`31441290450`](https://github.com/knhbae/flowme2605/actions/runs/31441290450) also passed Docs, Unit, Build, and Playwright |
| R3B merge | `PASS` — [PR #172](https://github.com/knhbae/flowme2605/pull/172) merged as `a599370496ee95a52d14cddd27c94b0c8190a863` |
| R3B Production deployment | `PASS` — GitHub deployment record `5841506853`, source `a599370496ee95a52d14cddd27c94b0c8190a863`, [direct URL](https://flowme2605-24g7918o1-flowme.vercel.app), and [Vercel record](https://vercel.com/flowme/flowme2605/HBW56gHNcW6BSKp26SRs1KNveWa5) report success |
| Canonical initial smoke | `FAIL` — `21/23`; nested child-sheet Escape and immediate 767px fallback-editor Escape both failed and repeated in targeted checks |
| Hotfix publication | `NOT_RUN` — PR, exact-head CI, merge, Production deployment, and canonical re-smoke |
| Observed-user validation | `0`; automation does not change this count |

## Publication gates

- All GitHub required checks must be successful on the exact hotfix PR head.
- The hotfix merge SHA must be the source SHA of the successful Production
  deployment.
- The canonical alias must return HTTP 200 and pass the complete `23/23`
  production smoke without page, console, or failed-request errors.
- Screenshots and automated checks are internal QA, not observed-user evidence.
