# Release History

No tagged releases yet.

## 2026-08-11 - R3B Approved Plan Execution UX

- Merged the approved plan-execution implementation through [PR #172](https://github.com/knhbae/flowme2605/pull/172), then merged the production Escape correction through [PR #173](https://github.com/knhbae/flowme2605/pull/173) at `2026-08-11T01:31:11Z`; the final production source is `2b937ce811b518950f495341d05736ebd102887a`.
- PR #173 final head `210b7c3ae027782fd91a003e88624b38d0243e74` passed required CI run [`31448713920`](https://github.com/knhbae/flowme2605/actions/runs/31448713920) and Vercel Preview. Post-merge `main` CI run [`31449546812`](https://github.com/knhbae/flowme2605/actions/runs/31449546812) also passed its Docs and Playwright jobs.
- Vercel Production deployment record `5842830294`, status `16645165737`, identifies the exact merge source and <https://flowme2605-itg4dhbbt-flowme.vercel.app> as its direct deployment URL; an anonymous direct-URL request redirects to Vercel login. The canonical alias <https://flowme2605.vercel.app> served the app and passed the canonical `23/23` smoke; the [Vercel deployment record](https://vercel.com/flowme/flowme2605/DdeVFrodzmA587Rg8NEguB667Fgf) reports success.
- Canonical production approved-spec smoke passed `23/23` with workers `1`, retries `0`, in `62.9s` (displayed `1.0m`), output `r3b-production-hotfix-2b937ce`. The earlier `21/23` run exposed two Escape-layer defects that PR #173 corrected. This is automated production QA, not observed-user validation; observed-user sessions remain `0`. No semantic version tag was created.

## 2026-08-09 - R3A My Flow Experience Boundary

- Merged [PR #169](https://github.com/knhbae/flowme2605/pull/169) as product-source commit `95a69257c73633077df2305232299f58cca03f73`; the exact-query, fail-closed `r3a-lab` boundary was added while `classic` remained the default My Flow experience.
- GitHub run [`31285007308`](https://github.com/knhbae/flowme2605/actions/runs/31285007308) passed Docs, Unit, Build, and Playwright `546/546`.
- Vercel deployed the exact merge source as `dpl_5jhJz4EBiHMm5HptH9nFCqfyeFek`, reported `READY` at <https://flowme2605-a0aasd9ic-flowme.vercel.app> and <https://flowme2605.vercel.app>.
- Production smoke passed for the unchanged classic default and exact-query `r3a-lab`: desktop inventory/search, 390px `8 -> 20` expansion, horizontal overflow `0`, console error messages `0`, and recorded failed requests `0`. This is automated production QA, not observed-user validation; observed-user sessions remain `0`. No semantic version tag was created.

## 2026-08-06 - P35 Round 2 B/B/B MVP Production Closeout

- Deployed P′′ production source `f97644abf379c46433847f44aa7bd4da7fadac4a` with Vercel deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk`; the deployment is `READY` at <https://flowme2605-n6jddq8i9-flowme.vercel.app> and the canonical alias is <https://flowme2605.vercel.app>.
- Froze candidate provenance as BUILD_ID `T0QkChgscSgPog-0UdvY-` and epoch `p35-r2-4fa6af1728eb5ca5`; S01~S23 are `23/23` accounted (S01~S21 captured, S22 `NOT_ASSESSED`, S23 `REVIEWER_CHOSEN_NOT_PRECAPTURED`), all `3` group manifests pass with failures `0`, and the published verifier reports `PASS` across `33` identity checks, `285` evidence files, and `556` raw URLs with failures `0`.
- Incorporated the sealed prior Codex and Claude Design review findings—Pass 1 candidate `c489117`, then Pass 2 P′ `29cb03a` ending in `REVISE`—into P′′. Fresh independent P′′ Pass 1/Pass 2 remain `NOT_RUN` and were waived by the Owner for this MVP to avoid repeating the review cycle, so this release does not claim an independent P′′ review `PASS`.
- Production smoke is `NOT_RUN`; observed-user sessions remain `0`, and actual 200% browser zoom, performance, and external Calendar/VTODO round-trip are `NOT_ASSESSED`. Text-to-flow and the P2 follow-up queue remain excluded. The manual production source branch is not merged to `main`, so a later `main` production deployment can replace it. No semantic version tag was created.

## 2026-07-29 - P35 MECE UX Reset

- Released a state-based `/` entry router with three primary destinations, result-first public Flows, one-kind-at-a-time adjustment, cross-Flow date-grouped `할 일`, an adjacent Flow library and focused workspace, a Calendar date lens, and scope-first export without migrating P34 identities or local storage.
- Merged [PR #161](https://github.com/knhbae/flowme2605/pull/161) as `4a51b08ce9c5410f4ddf492562a5e885b0fda09c`; GitHub Docs/Unit/Build and Playwright E2E succeeded, and Vercel production reached <https://flowme2605.vercel.app>.
- Verified focused unit `13 / 13`, all unit `694 / 694`, P35 Playwright `79 / 79`, full Playwright `405 / 405`, and production build `18 / 18`. The later PR #162 closeout records a bounded six-scenario production smoke at 390px and 1024px with overflow, console, and page-error counts `0`; it does not link the raw smoke artifact, and the literal-route hardening did not independently rerun it.
- Added `2 / 2` non-fixture regressions for literal `/my` and the fresh one-Flow `/my?experiment=off` rollback path without changing runtime, storage, or schema behavior.
- Published the [P35 R13 evidence](./content-audit/2026-07-29-p35-r13-final-internal-gate/README.md). No semantic version tag was created; observed-user sessions remain `0`, and external Calendar/VTODO round-trip remains unrun.

## 2026-07-25 - P34 Execution CRUD UX

- Released one Flow lifecycle surface with archive, undo, restore, backup, and archived-only permanent deletion; clarified source, personal Item, execution, occurrence, schedule, routine, and export-scope commands.
- Merged [PR #157](https://github.com/knhbae/flowme2605/pull/157) as `98ede0f848f8cd854c6a79e3a92f847012844704`; GitHub CI and Vercel production succeeded at <https://flowme2605.vercel.app>.
- Verified pretest `73 / 73`, unit `588 / 588`, P34 Playwright `6 / 6`, affected regressions `58 / 58`, full Playwright `326 / 326`, production build `18 / 18`, dependency audit `0`, and production smoke with overflow/browser errors `0`.
- Published the [P34 final review package](./content-audit/2026-07-25-p34-final-review-package/README.md). No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-25 - P33 Cross-entry Canonical Alignment

- Released one canonical 24-item AJD moving Flow across Home-era links, Flow finding, URL lookup, Flow Map aliases, receipt, My Flow, Calendar, and export while preserving legacy 5-item personal copies without automatic merge.
- Merged [PR #156](https://github.com/knhbae/flowme2605/pull/156) as `7948bc42424cfaba5370c47323badb7b485bbe48`; GitHub CI and Vercel production succeeded at <https://flowme2605.vercel.app>.
- Verified pretest `64 / 64`, unit `588 / 588`, memo reload repeat `30 / 30`, full Playwright `320 / 320` twice, production build `18 / 18`, dependency audit `0`, and canonical production smoke at 390px and 1024px.
- Published the [P33 stabilization evidence](./content-audit/2026-07-25-p33-publish-stabilization-evidence/README.md). No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-24 - P32 My Flow Focused Workspace

- Released a library-to-focused My Flow workspace that keeps the cross-Flow `지금 / Flow 목록 / 완료` views while giving one opened Flow a dedicated `다음 행동 / 전체 계획 / 기록` object workspace.
- Added direct title/date/memo quick edit, contextual anchor adjustment, consolidated whole export and lifecycle commands, mobile return-state preservation, and a shared shell for six content shapes without a persistence migration.
- Merged [PR #154](https://github.com/knhbae/flowme2605/pull/154) as `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`; post-merge GitHub CI and Vercel production succeeded at <https://flowme2605.vercel.app>.
- Verified unit `587 / 587`, P32 Playwright `4 / 4`, full Playwright `314 / 314`, production build `18 / 18`, security vulnerabilities `0`, and canonical production smoke `7 / 7` with all recorded layout/accessibility/browser-error counters `0`.
- Published the [P32 final review package](./content-audit/2026-07-24-p32-final-review-package/README.md) with `10` local and `7` production screenshots. No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-23 - P31 Mobile Journey Reconstruction

- Released effective-date precedence parity, distinct Home and Find roles, source-linked discovery cards, content-shaped wedding and workout save-before controls, a dedicated mobile My Flow workspace, Calendar Item bottom sheets, and mobile/wide archive, restore, and guarded permanent-delete parity.
- Merged [PR #150](https://github.com/knhbae/flowme2605/pull/150) as `0227cd2fa7a93ea9ff7d9776b76b0cc33401279b`; GitHub CI and Vercel production succeeded at <https://flowme2605.vercel.app>.
- Verified unit `586 / 586`, P31 Playwright `5 / 5`, full Playwright `310 / 310`, production build `18 / 18`, critical/high advisories `0`, and canonical production smoke `12 / 12` with overflow and browser-error counts `0`.
- Published the [P31 evidence package](./content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/README.md) with `18` local and `12` production screenshots. The 24-cell automated/heuristic simulation is supported `21`, partial `3`, blocked `0`; no semantic version tag was created and observed-user sessions remain `0`.

## 2026-07-22 - P30 Evidence Gap Closure

- Released collision-free mobile export states, main-before-tabs keyboard order, contextual long-Flow adjustment, next-action-first My Flow commands, Calendar 50+ scope and compact identity evidence, and summary-first routine settings.
- Merged [PR #148](https://github.com/knhbae/flowme2605/pull/148) as `b3c8500be3b6aa673e2078d02a986f7cae6fe8bf`; GitHub production deployment `5557201045` reached <https://flowme2605.vercel.app>.
- Verified unit `584 / 584`, P30 Playwright `12 / 12`, affected P28/P29 `20 / 20`, full Playwright `304 / 304`, production build `18 / 18`, post-merge CI green, and canonical production smoke `13 / 13` with all recorded failure counters `0`.
- Published the [P30 final review package](./content-audit/2026-07-22-flowme-p30-final-review-package/README.md) with `17` local and `13` production screenshots. No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-22 - P29 Coordinated Surface Reset

- Released artifact-first public save-before, a distinct saved receipt, summary-first routine setup, an action-first My Flow library/detail workspace, unified Calendar scope and undated placement, and predictable scoped export recommendations.
- Merged [PR #146](https://github.com/knhbae/flowme2605/pull/146) as `10e6e5154372ce14d69302ed7bff0b748e3ae868`; GitHub production deployment `5550925534` reached <https://flowme2605.vercel.app>.
- Verified P29 Playwright `13 / 13`, full Playwright `292 / 292`, unit `584 / 584`, production build `18 / 18`, post-merge CI green, and canonical production smoke `9 / 9` with overflow/unnamed-focusable/console-page-error counts `0`.
- Published the [P29 final review package](./content-audit/2026-07-22-p29-final-review-package/README.md) with `23` implementation and `9` production screenshots. Dependency audit is critical/high `0`, moderate `2`; no semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-22 - P28 Cross-Surface Experience Reconstruction

- Released the Hybrid save-before workspace, shared item-role and artifact projection, common routine schedule grammar, responsive My Flow rail/detail, scalable Calendar Flow picker, and five actual-data result shapes.
- Merged [PR #144](https://github.com/knhbae/flowme2605/pull/144) as `9a839d02be5b03faf917903b09b07e7c0014210e`; Vercel deployment `dpl_6wyYqhweXvJPDiFqCQLsNp18gHXQ` reached READY at <https://flowme2605.vercel.app>.
- Verified pretest `25 / 25`, unit `584 / 584`, P28 Playwright `7 / 7`, full Playwright `346 / 346`, production build `18 / 18`, and `19` responsive screenshots with overflow and browser-error counts `0`.
- Published the [P28 final review package](./content-audit/2026-07-22-p28-final-review-package/README.md). No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-21 - P27 Flow Lifecycle Workspace Production Baseline

- Released reversible Flow archive/restore, source-safe Item exclusion, truthful routine preview and resource hierarchy, one-operation save-before adjustment, adaptive My Flow library/search, Calendar scope/accessibility, and compact post-save/export.
- Merged [PR #141](https://github.com/knhbae/flowme2605/pull/141) as `2829b379ada96baa79f49dfe75049b81f8b6d1c5`; Vercel deployment and both GitHub CI jobs succeeded at <https://flowme2605.vercel.app>.
- Verified pretest `24 / 24`, unit `571 / 571`, local and CI Playwright `339 / 339`, production build `18` routes, and canonical production capture `8 / 8` with overflow/console/page/unnamed-control counts `0`.
- Published the [P27 final review package](./content-audit/2026-07-21-p27-lifecycle-workspace-final/README.md) and [production closeout](./content-audit/2026-07-21-p27-production-closeout/README.md). No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-20 - P26 Structural Correction Production Baseline

- Released one coherent Flow object across discovery, complete save-before preview, post-save receipt, My Flow execution, Calendar placement, reversible completion, explicit export scope, and run reuse.
- Merged [PR #139](https://github.com/knhbae/flowme2605/pull/139) as `0a33dd84d955b831130aaed3cd315e9526148e1e` and deployed Vercel release `dpl_E5mNsqgVsRWNPefjAg5zXoNUEXYy` to <https://flowme2605.vercel.app>.
- Verified unit `564 / 564`, GitHub CI Playwright `327 / 327`, production build `18 / 18`, high/critical audit findings `0`, and production smoke `12 / 12` with HTTP/redirect/overflow/console-page error counts all `0`.
- Published the [P26 final review package](./content-audit/2026-07-20-p26-final-review-package/README.md). No semantic version tag was created, and observed-user sessions remain `0`.

## 2026-07-20 - P25 Execution Workspace Production Baseline

- Released the whole-Flow execution workspace: responsive saved-Flow structure, date-free execution and Calendar placement, progressive and batch adjustment, reversible completion, scoped export, and a simplified public artifact.
- Merged foundation PR [#136](https://github.com/knhbae/flowme2605/pull/136) as `bd5f201c` and production hydration hotfix PR [#137](https://github.com/knhbae/flowme2605/pull/137) as `b0fb899c`.
- Verified unit `526 / 526`, full Playwright `286 / 286`, production build `18 / 18`, high/critical audit findings `0`, and final production smoke `12 / 12` with HTTP/redirect/overflow/console-page error counts all `0`.
- Published the P25 final closeout and P26 handoff. No semantic version tag was created, and observed-user sessions remain `0 / 15`.

## Timeline

```text
2026-05-20 - v0.1.0 in development; AI-agnostic harness initialized.
```

Release entries should include:

- Version and date
- User-facing changes
- Test/QA evidence
- Document updates made during release

