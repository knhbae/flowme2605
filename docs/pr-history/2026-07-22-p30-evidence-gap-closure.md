# P30 Evidence Gap Closure

- Date: 2026-07-22
- Branch: `codex/p30-evidence-gap-closure`
- PR: [#148](https://github.com/knhbae/flowme2605/pull/148)
- Status: `Merged`, `Deployed`
- Implementation head: `ad159f1e04921e0c434170e2ff348e804e93569c`
- Merge commit: `b3c8500be3b6aa673e2078d02a986f7cae6fe8bf`
- Production: <https://flowme2605.vercel.app>
- Deployment: `5557201045` (`success`)

## Why

P29 established the correct product and data architecture, but independent production review found mobile export/fixed-layer collisions, incorrect keyboard order, and bounded density/evidence gaps in long Flow adjustment, My Flow commands, Calendar scale, and routine settings. P30 closes those gaps without reopening the P29 contracts.

## What Changed

- Suppressed the public fixed save command while export is open and kept My Flow export primary above persistent tabs.
- Placed mobile persistent tabs after workspace controls in DOM focus order.
- Kept 24-item adjustment behind explicit purpose and full-list disclosures.
- Reduced My Flow detail to one visible primary and moved source/archive to a focus-returning menu.
- Added deterministic undated, 50+ Flow scope, and same-date compact identity evidence.
- Grouped routine advanced settings by schedule and ending rule.
- Removed the dead public composition conditional and marked the live `/flow-maps` legacy consumer explicitly.

## Not Done

- observed-user validation, accounts/cloud sync, AI/crawler, direct Calendar/Todo OAuth
- forced removal of the active `/flow-maps/[map]` legacy consumer
- persistence migration, new export format, recurrence engine change, or 4-tab IA change

## Decisions

- P29 source, personal overlay, execution run, occurrence, export identity, and persistence contracts stay frozen.
- Query-only 50+ and undated fixtures are automated scale evidence, not account/server scale evidence.
- The next program is not inferred from automated success; owner/independent review must identify a bounded evidence gap first.

## Important Files

- `components/flow/AppClient.tsx`
- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/PlatformNav.tsx`
- `tests/e2e/p30-evidence-gap-closure.spec.ts`
- `docs/content-audit/2026-07-22-flowme-p30-final-review-package/`

## Verification

- unit: `584 / 584`
- P30 Playwright: `12 / 12`
- affected P28/P29 Playwright: `20 / 20`
- full Playwright: `304 / 304`
- production build: `18 / 18`
- post-merge GitHub CI and Vercel production: `success`
- canonical production smoke: `13 / 13`
- production HTTP/navigation/assertion/overflow/unnamed-focusable/console-page-error failures: `0`
- local screenshots: `17`; production screenshots: `13`

## Risks And Follow-ups

- Automated and heuristic evidence does not establish user comprehension or retention; observed-user count remains `0`.
- `/flow-maps/[map]` remains a real legacy composition consumer and needs a separate migration proof before removal.
- Calendar 50+ evidence is deterministic browser fixture evidence, not account-backed scale evidence.

## Links

- [P30 final package](../content-audit/2026-07-22-flowme-p30-final-review-package/README.md)
- [P30 review board](../content-audit/2026-07-22-flowme-p30-final-review-package/review.html)
- [Production smoke](../content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/results.json)
- [Production](https://flowme2605.vercel.app)
