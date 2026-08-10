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

## Current pre-PR evidence

| Check | Current state |
| --- | --- |
| Canonical source hashes | `PASS` — the seven recorded user-owned source files re-read `7/7` at their pinned SHA-256 values |
| Approved unit | `PASS` — `npm.cmd run test:approved-plan-execution`, `176/176` |
| Aggregate verification | `PASS` — `npm.cmd run verify` completed docs, full `npm test`, and the Next production build |
| Full unit/contract | `PASS` — `npm.cmd test`, including the `verify` run |
| AppClient storage lock | `PASS` — `npm.cmd run test:p35-appclient-lock`, `59/59` |
| Documentation | `PASS` — post-reconciliation check found 16 required files and 4,492 local links |
| Repository diff check | `PASS` — `git diff --check` exited `0` |
| Security | `PASS` — configured audit findings `0` |
| Production build | `PASS` — Next production build generated `18/18` pages; BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| Canonical browser gates | `PASS` — URL-first `20/20` plus approved plan-execution `23/23`, total `43/43` |
| Scoped browser migrations | `PASS` — overlapping targeted evidence: Group B `33/33`, P26 `40/40`, D1 `68/68`, P28-P31 `37/37`, P35 saved library `18/18`, Q3 `12/12` plus off-lane `7/7`, 50-Item `1/1`, legacy transfer `26/26`, and Calendar `2/2`; these counts are not a repository-wide denominator |
| Full Playwright | `PASS` — `569/569`, failures `0`, skips `0`, flaky `0`, workers `2`, exact BUILD_ID `DkOxul9Wh4wGGYuxbYwy_` |
| GitHub required CI | `FAIL` on initial PR head `5bb445132004cf7b8a1879e924a106b836d3fb84`, run [`31431479477`](https://github.com/knhbae/flowme2605/actions/runs/31431479477): Docs, Unit, Build `PASS`; Playwright reported `564` passed, `3` failed, and `2` flaky. The local test-only follow-up passes `569/569`; exact-head CI must pass before merge. |
| Merge | `NOT_RUN` |
| Vercel Production deployment | `NOT_RUN` |
| Canonical-alias smoke | `NOT_RUN` |
| Observed-user validation | `0`; automation does not change this count |

## Publication gates

- All GitHub required checks must be successful on the exact PR head.
- The merge SHA must be the source SHA of the successful Production deployment.
- The canonical alias must return HTTP 200 and complete the approved smoke flow
  without page, console, or failed-request errors.
- Screenshots and automated checks are internal QA, not observed-user evidence.
