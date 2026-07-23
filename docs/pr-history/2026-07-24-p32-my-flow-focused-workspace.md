# P32 My Flow Focused Workspace

- Date: 2026-07-24
- Branch: `codex/p32-program`
- PR: [#154](https://github.com/knhbae/flowme2605/pull/154)
- Status: `Merged`, `Deployed`
- Implementation commits: `6c4db3aa4f7a2fabc49f6ce3c63d5f0567aecbdd`, `56730ae363a3a9792c240fb2fbed70b72100e4a3`
- Squash merge: `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`
- Production: <https://flowme2605.vercel.app>
- GitHub CI run: [30044057520](https://github.com/knhbae/flowme2605/actions/runs/30044057520) (`success`)

## Why

P31 made Flow discovery and mobile lifecycle usable, but one selected My Flow still scattered Item edit, anchor adjustment, whole export, archive, and restore across deep or unrelated surfaces. Independent Claude Design and Codex reviews both selected a bounded `library -> focused workspace` reopen while preserving the released global IA and data contracts.

## What Changed

- Kept `지금 / Flow 목록 / 완료` as cross-Flow library questions.
- Hid those global local tabs while one Flow is open.
- Added one object workspace with `다음 행동 / 전체 계획 / 기록`.
- Shortened title/date/memo edit, whole export, and archive entry depth.
- Restored contextual Flow-level anchor adjustment while preserving personal fixed dates and memo.
- Reused one shell across six content shapes without forking identity or persistence.
- Unified Next's nested PostCSS dependency on the existing project PostCSS 8.5.16 and closed the audit gate without a forced downgrade.

## Not Done

- observed-user validation
- account/cloud sync, AI/crawler, OAuth, creator marketplace, or social proof
- 4-tab IA, public `/f`, Calendar architecture, export format, or stable identity redesign
- component extraction from the still-large `AppClient.tsx`
- reopening the intentionally closed mixed travel public route

## Decisions

- Selected B1 `library_to_focused_workspace_with_cross_flow_queue`.
- Rejected B2 because removing the cross-Flow queue would erase a currently useful projection without production evidence.
- Kept the mixed date/check/resource journey fixture-only and explicitly blocked its public route cell.
- Used a composition rollback boundary; no data or reverse migration is required.

## Verification

- docs check: `14` required files, `3120` local links
- unit: `587 / 587`
- P32 targeted Playwright: `4 / 4`
- full Playwright: `314 / 314`
- production build: `18 / 18`
- security audit: vulnerabilities `0`
- post-merge GitHub CI: `success`
- canonical production smoke: `7 / 7`
- production overflow, fixed overlap, unnamed focusable, console/page error: all `0`
- screenshots: local `10`, production `7`

## Risks

- `AppClient.tsx` remains large and should only be extracted behind a no-visual-diff gate.
- The mixed public content shape remains unavailable by product policy.
- Automated and browser evidence does not establish user understanding or repeated-use value; observed-user count is `0`.

## Links

- [P32 final review package](../content-audit/2026-07-24-p32-final-review-package/README.md)
- [Production smoke](../content-audit/2026-07-24-p32-final-review-package/production-smoke/README.md)
- [Production](https://flowme2605.vercel.app)
