# P26 Structural Correction Program

- Date: 2026-07-20
- Branch: `codex/p26-program`
- PR URL: https://github.com/knhbae/flowme2605/pull/139
- Status: Merged and deployed
- Merge: `0a33dd84d955b831130aaed3cd315e9526148e1e`
- Deploy ID: `dpl_E5mNsqgVsRWNPefjAg5zXoNUEXYy`
- Deploy URL: https://flowme2605.vercel.app

## Why

P25 connected the execution lifecycle but retained ambiguity around the product object, save/adjust hierarchy, whole-Flow reading, date and recurrence correctness, structural editing, Calendar placement, export scope, and responsive density. P26 corrected those contracts as one staged program rather than another route-specific polish loop.

## What Changed

- Unified Home, Find Flow, public save-before, post-save, My Flow, Calendar, and export around one user-facing Flow object.
- Corrected local/example/anchor dates, recurrence series versus occurrence projection, deterministic memo segmentation, and stable item/run/occurrence/export identity.
- Added an honest whole-Flow receipt, adaptive reading modes, progressive item editing, separate structural/batch editing, reversible completion, and explicit reuse date policy.
- Added an on-demand undated Calendar inbox, Flow scope filtering, atomic date movement with preview/undo, and scope-first export receipts.
- Consolidated execution primitives, copy budgets, responsive layers, and six representative content-shape journey gates.
- Migrated stale E2E selectors and expectations to the released P26 interaction contract without changing app/runtime source in P26-20.

## Not Done

- No observed-user validation claim; observed sessions remain `0`.
- Four Medium visual hypotheses remain for bounded comparison: mobile batch-editor density, long titles in the wide undated rail, mobile Calendar composition, and recurring-occurrence detail hierarchy.
- Account/database sync, real AI provider, direct OAuth integrations, creator marketplace, and a fifth tab remain out of scope.

## Decisions

- Keep source, personal overlay, execution run, occurrence, Calendar event, and export identities separate.
- Keep My Flow responsible for cross-Flow execution and whole-Flow reading; keep Calendar responsible for dated placement and occurrence execution.
- Keep quick value edits, advanced scheduling, structural changes, and batch movement as distinct modes.
- Use static design artifacts only for hierarchy comparison, never as current implementation evidence.
- Treat automated and simulated persona evidence as internal release evidence, not observed-user validation.

## Files Touched

- `components/flow/`
- `lib/flow/`
- `tests/e2e/`
- `scripts/content-audit/`
- `docs/specs/2026-07-20-p26-program/`
- `docs/content-audit/2026-07-20-p26-*/`
- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

## Verification

- Pretest: `13 / 13`
- Unit: `564 / 564`
- GitHub CI Playwright: `327 / 327`
- Production build: `18 / 18` pages
- Security: high `0`, critical `0`; two moderate nested Next/PostCSS findings disclosed
- P26-19 representative browser journeys: `7 / 7`; migrated P24 execution-trust scenarios: `15 / 15`
- Production smoke: `12 / 12`; HTTP failure, off-canonical redirect, horizontal overflow, console error, and page error counts `0`

## Risks

- First-use comprehension, repeated-use value, and trust remain unobserved.
- Two moderate transitive PostCSS advisories remain; no forced breaking downgrade was applied.
- Browser-local persistence is not cross-device continuity.

## Follow-ups

- Compare the four Medium visual hypotheses as bounded P27 prototypes before changing released contracts.
- Reopen observed sessions only when the owner explicitly judges the product ready.

## Links

- Final package: `docs/content-audit/2026-07-20-p26-final-review-package/README.md`
- Production smoke: `docs/content-audit/2026-07-20-p26-final-review-package/production-smoke/results.json`
- Production: https://flowme2605.vercel.app
- PR: https://github.com/knhbae/flowme2605/pull/139
