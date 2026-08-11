# R3B Release Documentation Closeout

- **Date:** 2026-08-11
- **Branch:** `codex/r3b-release-closeout-20260811`
- **Base:** `2b937ce811b518950f495341d05736ebd102887a`
- **PR:** Pending at authoring; the linked GitHub PR will be the authoritative final state.
- **Status:** Draft at authoring

## Why

PR #172 delivered the approved plan-execution UX, and PR #173 corrected the two
Escape-layer regressions exposed by canonical production smoke. This
documentation-only closeout publishes the exact merge, CI, Production deployment,
and successful canonical re-smoke facts after the runtime release completed.

## What Changed

- Promoted R3B to the current production baseline in status, roadmap, history,
  architecture, and spec indexes.
- Finalized the R3B and Escape-hotfix PR histories with exact source, CI,
  deployment, and `23/23` canonical smoke evidence.
- Preserved the initial `21/23` smoke as failure evidence and kept automated QA
  separate from observed-user validation, which remains `0`.
- Clarified that the Production record identifies an authentication-protected
  direct URL while the public canonical alias served the app and passed smoke.

## Not Done

- No runtime, UI, copy, route, storage, schema, migration, export, receipt,
  dependency, or test change.
- No new product gate or follow-up implementation was promoted.
- Ignored Playwright output and untracked `test-results-*` directories are not
  publication artifacts.

## Decisions

- R3B merge `2b937ce811b518950f495341d05736ebd102887a` is the current production
  baseline; R3A remains an exact-query rollback comparison boundary.
- Only the canonical alias is claimed as anonymously app-accessible. The direct
  deployment URL redirects anonymous requests to Vercel login.
- There is no active product gate. Any next initiative requires explicit Owner
  promotion.

## Important Files

- `docs/HISTORY.md`
- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/PROJECT_CONTROL.md`
- `docs/SERVICE_STRUCTURE.md`
- `docs/specs/README.md`
- `docs/specs/2026-08-11-r3b-approved-plan-execution-boundaries/qa.md`
- `docs/specs/2026-08-11-r3b-approved-plan-execution-boundaries/tasks.md`
- `docs/pr-history/2026-08-11-r3b-approved-plan-execution-boundaries.md`
- `docs/pr-history/2026-08-11-r3b-production-escape-hotfix.md`

## Verification

- `npm.cmd run docs:check` — PASS, `16` required files and `4,499` local links.
- `npm.cmd run verify` — PASS, including unit tests and `18/18` production build
  routes.
- `git diff --check` — PASS.
- Runtime release evidence: PR #173 exact-head CI PASS, post-merge main CI PASS,
  exact-source Vercel Production PASS, canonical approved-spec smoke `23/23`.

## Risks And Rollback

- Risk is limited to stale or inaccurate documentation; no runtime rollback or
  data migration exists.
- Roll back by reverting this documentation commit.
- The local production-smoke JSON remains ignored output; durable evidence is the
  recorded command result and linked GitHub/Vercel publication state.

## Follow-Ups

- None are active. Await explicit Owner promotion of the next product gate.

## Links

- [Approved UX PR #172](https://github.com/knhbae/flowme2605/pull/172)
- [Escape hotfix PR #173](https://github.com/knhbae/flowme2605/pull/173)
- [Hotfix post-merge CI](https://github.com/knhbae/flowme2605/actions/runs/31449546812)
- [Production deployment record](https://vercel.com/flowme/flowme2605/DdeVFrodzmA587Rg8NEguB667Fgf)
- [Canonical production](https://flowme2605.vercel.app)
