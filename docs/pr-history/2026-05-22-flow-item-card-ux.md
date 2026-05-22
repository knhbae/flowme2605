# PR: Flow Item Card UX

- Date: 2026-05-22
- Branch: `codex/flow-item-card-ux`
- Base: `codex/implement-flow-builder-mvp`
- PR: https://github.com/knhbae/flowme2605/pull/7
- Status: `Open`, `Deployed`
- Production deploy: https://flowme2605.vercel.app
- Deployment URL: https://flowme2605-20g5fe610-flowme.vercel.app
- Vercel inspect: https://vercel.com/flowme/flowme2605/E8vL2nQMrzoF8qjf7aow8tkTUZsb

## Why

The item card is the core repeated component on Flow detail pages. The prior card made the checkbox, memo, skip, date metadata, detail expansion, and links compete in one loose block, so users had to re-parse the same confusion across every task.

## What Changed

- Added a shared item-card renderer for timeline, routine, and checklist items.
- Moved the checkbox to a clear left-side control with an explicit `완료: ...` accessible label.
- Moved timing/date metadata to the top-right area of each card.
- Replaced always-visible memo textarea with a `메모 추가` / `메모` button and collapsed memo panel.
- Renamed skip controls to `해당 없음` and `다시 포함`.
- Replaced the old `더 자세히 보기` details summary with explicit `자세히` / `접기` buttons.
- Kept completion criteria inside the expanded detail area instead of previewing it as duplicate card body text.
- Removed duplicated inline external links from normal item cards; links live in the expanded detail area.

## Not Done

- Did not redesign section headers, sticky bottom bar, navigation, landing cards, or `/my`.
- Did not split `components/flow/AppClient.tsx` into smaller files in this PR.
- Did not add icon assets or a global button/badge design-token system.
- Did not redesign or redeploy non-item-card UX areas such as navigation, landing cards, `/my`, section headers, or the mobile bottom sheet.

## Decisions

- Built on top of PR #6 as a stacked PR because the item-card work depends on the memo/skip/localStorage changes there.
- Kept implementation local to `AppClient.tsx` to limit blast radius; a future component split should happen separately.
- Used text labels instead of new icon dependencies to keep this PR focused.

## Files Touched

- `components/flow/AppClient.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/superpowers/plans/2026-05-22-flow-item-card-ux.md`
- `docs/pr-history/2026-05-22-flow-item-card-ux.md`

## Verification

- `npm run build` passed.
- `npm run test:e2e -- --grep "wedding flow answers"` passed.
- `npm run test:e2e -- --grep "public moving flow|routine flow highlights|no-anchor checklist|representative real content"` passed.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run test:e2e` passed: 30 tests.
- Vercel production build passed.
- Production smoke tests passed:
  - `https://flowme2605.vercel.app` returned 200.
  - `https://flowme2605.vercel.app/f/wedding-d180-basic` returned 200.
  - Production item-card DOM check found 12 cards, 3 buttons, and 1 checkbox in the first card.
- Direct deployment URL required Vercel authentication, so public smoke testing used the production alias.
- Manual screenshots captured:
  - `test-results/manual/item-card-mobile-full.png`
  - `test-results/manual/item-card-desktop-full.png`
  - `test-results/manual/item-card-expanded-mobile.png`

## Risks

- `AppClient.tsx` remains large; shared item-card extraction reduced duplication but did not solve file size.
- Exact-video item rendering still uses its existing minimal card and was intentionally not folded into the shared item-card renderer.
- The new memo panel is collapsed by default, so users with saved notes need to click `메모` to view or edit them.
- Existing mobile sticky export bar can overlap the bottom of a long expanded item detail; bottom-bar redesign is tracked as follow-up.

## Follow-ups

- Redesign section headers with per-section progress.
- Remove duplicate source/metadata sections from detail pages.
- Introduce global button, badge, and card style primitives.
- Improve `/my` with localStorage-based in-progress Flow recovery.

## Links

- Parent PR: https://github.com/knhbae/flowme2605/pull/6
- UX review source: user-provided Flow component review on 2026-05-22
