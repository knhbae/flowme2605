# P25 Execution Workspace Foundation

- Date: 2026-07-20
- Branch: `codex/p25-ux-foundation-plan`
- PR URL: pending
- Status: Draft
- Deploy URL: pending

## Why

P24 connected the lifecycle but still made saved results, date-free work, whole-Flow adjustment, Calendar placement, completion recovery, and export feel like separate tools. Owner, Codex, and Claude Design feedback called for a coherent execution workspace rather than another narrow polish pass.

## What Changed

- Made the complete effective Flow the shared object across post-save, My Flow, Calendar, and export.
- Added responsive whole-Flow composition: mobile drill-in and wide outline/detail workspace.
- Kept undated work executable in My Flow while Calendar provides a selection-only placement queue.
- Added progressive item editing, source-safe batch date adjustment, recoverable draft removal, and scoped export counts.
- Unified task completion, immediate undo, persistent reopen, public preview boundaries, and title-first row language.
- Reconciled routine occurrence and memo-split projection parity.
- Fixed date-free source rows to fall back to immutable source order when no personal rank exists.
- Added P25 decision, integration, final closeout, visual review, and P26 handoff artifacts.

## Not Done

- No claim of observed-user validation; observed sessions remain `0 / 15`.
- Public explanatory-copy density, 1024px Calendar density, and advanced-editor path length remain three Medium P26 hypotheses.
- Account/database sync, AI provider, OAuth, direct integrations, creator marketplace, and a fifth tab remain out of scope.

## Decisions

- Keep Option B whole-Flow workspace as the internally verified P25 baseline.
- Keep source, personal overlay, execution run, and recurrence occurrence ownership separate.
- Keep My Flow responsible for execution and Calendar responsible for dated placement.
- Treat owner authorization and automated simulation as implementation evidence, not usability validation.
- Run the large E2E suite in bounded serial groups when one monolithic local run exceeds the time budget; do not count parallel server-contention failures as product evidence.

## Files Touched

- `components/flow/AppClient.tsx`
- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/`
- `tests/e2e/`
- `docs/specs/2026-07-19-*`
- `docs/content-audit/2026-07-19-p25-*`
- `docs/content-audit/2026-07-20-p25-final-closeout/`
- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

## Verification

- Unit: `526 / 526`
- Playwright: `285 / 285` across `8` files, bounded serial groups
- Docs: `14` required files and `2527` local links
- Production build: `18 / 18` pages
- Security: high `0`, critical `0`; two moderate nested Next/PostCSS findings disclosed
- `git diff --check`: pass
- P25-08 browser evidence: representative `9 / 9`, related regression `81 / 81`, screenshots `36`, downloads `5`, overflow `0`, console/page errors `0`

## Risks

- The P25 frame is internally verified but not observed with participants.
- Two moderate transitive PostCSS advisories remain; `npm audit fix --force` was intentionally not used because it proposes a breaking Next downgrade.
- Production behavior must still be confirmed after merge and Vercel deployment.

## Follow-ups

- Merge and deploy the verified P25 branch, then run anonymous production smoke on representative routes.
- Run P26-00 as a docs/prototype-only comparison of the three deferred Medium hypotheses.

## Links

- Closeout: `docs/content-audit/2026-07-20-p25-final-closeout/README.md`
- Production: https://flowme2605.vercel.app
- PR: pending
