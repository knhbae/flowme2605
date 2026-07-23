# P31 Mobile Journey Reconstruction

- Date: 2026-07-23
- Branch: `codex/p31-mobile-journey-reconstruction`
- PR: [#150](https://github.com/knhbae/flowme2605/pull/150)
- Status: `Merged`, `Deployed`
- Implementation head: `06841a274151edef39da3838f39388f42dc7126f`
- Merge commit: `0227cd2fa7a93ea9ff7d9776b76b0cc33401279b`
- Production: <https://flowme2605.vercel.app>
- GitHub CI run: [30006649714](https://github.com/knhbae/flowme2605/actions/runs/30006649714) (`success`)

## Why

P30 had stable source, personal overlay, execution run, recurrence occurrence, and export contracts, but mobile users still encountered incorrect date precedence, overlapping Home and Find roles, content-specific save-before complexity, an overlong My Flow composition, inline Calendar detail, and lifecycle controls that differed by viewport.

## What Changed

- Made execution date overrides win consistently in My Flow, Calendar, ICS, and list exports.
- Separated Home usage examples from the Find catalog and added real source links and representative work without invented social proof.
- Made wedding artifact choice and workout recurrence setup progressive and result-first.
- Added a compact mobile My Flow library and dedicated `실행 / 전체 계획 / 기록` workspace.
- Replaced mobile Calendar inline detail with a focus-returning bottom sheet.
- Unified `보관 / 복구 / 이 기기에서 영구 삭제`, including a tested permanent-delete boundary.
- Patched Next from `15.5.20` to `15.5.21` to remove the high advisory.

## Not Done

- observed-user validation, real social proof/reviews, account/cloud sync, AI/crawler, direct Calendar/Todo OAuth
- persistence migration, new export format, recurrence-engine rewrite, source mutation, or 4-tab IA change

## Verification

- unit: `586 / 586`
- P31 Playwright: `5 / 5`
- full Playwright: `310 / 310`
- production build: `18 / 18`
- GitHub CI: `success`
- canonical production smoke: `12 / 12`
- production overflow and browser-error counts: `0`
- local screenshots: `18`; production screenshots: `12`
- security: critical/high `0`, moderate `2` documented exception

## Evidence Boundary

The 24-cell automated/heuristic simulation is supported `21`, partial `3`, blocked `0`, with explanation-free completion `21 / 24`. It is not observed-user validation; observed-user count remains `0`.

## Links

- [P31 evidence](../content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/README.md)
- [Production smoke](../content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence/production-smoke/results.json)
- [Production](https://flowme2605.vercel.app)
