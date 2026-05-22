# PR: Flow Item Card And Demo UX Polish

- Date: 2026-05-22
- Branch: `codex/flow-item-card-ux`
- Base: `codex/implement-flow-builder-mvp`
- Stacked PR: https://github.com/knhbae/flowme2605/pull/7
- Mainline PRs:
  - Item-card promotion: https://github.com/knhbae/flowme2605/pull/8
  - Demo UX polish: https://github.com/knhbae/flowme2605/pull/9
- Status: `Open`, `Pending redeploy`
- Production deploy: https://flowme2605.vercel.app
- Deployment URL: https://flowme2605-20g5fe610-flowme.vercel.app
- Vercel inspect: https://vercel.com/flowme/flowme2605/E8vL2nQMrzoF8qjf7aow8tkTUZsb

## Why

The item card is the core repeated component on Flow detail pages. The prior card made the checkbox, memo, skip, date metadata, detail expansion, and links compete in one loose block, so users had to re-parse the same confusion across every task.

After the first item-card deploy, the follow-up UX audit found broader demo issues: public navigation exposed internal routes, landing copy and card actions competed for attention, source metadata repeated on Flow detail pages, date schedule tabs were too granular, and `/my` still looked like a creator-only studio even though user progress is localStorage-based.

## What Changed

- Added a shared item-card renderer for timeline, routine, and checklist items.
- Moved the checkbox to a clear left-side control with an explicit `완료: ...` accessible label.
- Moved timing/date metadata to the top-right area of each card.
- Replaced always-visible memo textarea with a `메모 추가` / `메모` button and collapsed memo panel.
- Renamed skip controls to `해당 없음` and `다시 포함`.
- Replaced the old `더 자세히 보기` details summary with explicit `자세히` / `접기` buttons.
- Kept completion criteria inside the expanded detail area instead of previewing it as duplicate card body text.
- Removed duplicated inline external links from normal item cards; links live in the expanded detail area.
- Simplified public navigation to `둘러보기` and `내 Flow`; internal `/flow-lab`, `/creators`, and `/flows/new` remain directly accessible but are no longer first-level public nav.
- Simplified the landing hero copy and moved creator entry to a lower-weight text link.
- Removed hero tag chips and representative-item text from public Flow cards.
- Kept demo-safe metadata such as `베타 운영 중`, item count, category, and duration instead of fake numeric social proof.
- Reduced public Flow status badges to source confirmation and meaningful risk signals.
- Consolidated source metadata into `SourceContentCard` and removed the duplicated `출처와 주의 정보` details block.
- Replaced separate `주별 보기` and `달력 보기` tabs with a single `일정 보기` tab after a date/example anchor exists.
- Removed the duplicate `섹션 바로가기` component; the `전체 흐름` cards remain section anchors.
- Reframed `/my` as `내 Flow`, added title metadata, and added localStorage-based `진행 중인 Flow` recovery cards.

## Not Done

- Did not split `components/flow/AppClient.tsx` into smaller files in this PR.
- Did not add icon assets or a global button/badge design-token system.
- Did not add login, DB persistence, or cross-device sync for `/my`; progress recovery remains browser-local.
- Did not rewrite all seed Flow content in this PR; content quality work remains incremental.
- Did not redesign the mobile sticky export bar into a bottom sheet.

## Decisions

- Built on top of PR #6 as a stacked PR because the item-card work depends on the memo/skip/localStorage changes there.
- PR #7 merged into the parent branch after PR #6 had already merged to `main`, so PR #8 was opened to promote the same deployed work to `main`.
- Kept implementation local to `AppClient.tsx` to limit blast radius; a future component split should happen separately.
- Used text labels instead of new icon dependencies to keep this PR focused.
- Kept calendar/schedule demo value by preserving `일정 보기` instead of removing dated views entirely.
- Avoided fake production-looking numeric stats; demo trust is represented through beta/status metadata and concrete Flow scope.

## Files Touched

- `components/flow/AppClient.tsx`
- `lib/flow/storage.ts`
- `app/my/page.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/superpowers/plans/2026-05-22-flow-item-card-ux.md`
- `docs/superpowers/plans/2026-05-22-flow-demo-ux-polish.md`
- `docs/pr-history/2026-05-22-flow-item-card-ux.md`

## Verification

- `npm run build` passed.
- `npm run test:e2e -- --grep "wedding flow answers"` passed.
- `npm run test:e2e -- --grep "public moving flow|routine flow highlights|no-anchor checklist|representative real content"` passed.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed after demo UX polish.
- `npm run test:e2e -- --grep "home presents|my flow workspace|public moving flow|meal plan flow|duration calendar|real source public flow|representative real content"` passed: 7 tests.
- `npm run test:e2e` passed: 30 tests.
- Local visual smoke via Playwright passed:
  - Home: no `/flow-lab` or `/creators` nav links; headline is `따라하기 쉬운 실행 가이드, Flow`.
  - Moving schedule: no duplicated `출처와 주의 정보`; no `주별 보기`; one `일정 보기` tab.
  - `/my`: document title and H1 are `내 Flow`; no `Creator Studio` text.
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
  - `test-results/manual/demo-ux-home-mobile.png`
  - `test-results/manual/demo-ux-moving-schedule-mobile.png`
  - `test-results/manual/demo-ux-my-mobile.png`

## Risks

- `AppClient.tsx` remains large; shared item-card extraction reduced duplication but did not solve file size.
- Exact-video item rendering still uses its existing minimal card and was intentionally not folded into the shared item-card renderer.
- The new memo panel is collapsed by default, so users with saved notes need to click `메모` to view or edit them.
- Existing mobile sticky export bar can overlap the bottom of a long expanded item detail; bottom-bar redesign is tracked as follow-up.
- `/my` progress summaries intentionally count base Flow items, not expanded multi-day occurrence rows.
- `/flow-lab` and `/creators` are still routable directly and still have internal/demo-oriented copy.

## Follow-ups

- Redesign section headers with per-section progress.
- Introduce global button, badge, and card style primitives.
- Add a true export bottom sheet for mobile.
- Continue seed content improvements for older Flow categories.
- Consider a separate demo mode if fake numeric social proof is needed for investor/internal demos.

## Links

- Parent PR: https://github.com/knhbae/flowme2605/pull/6
- UX review source: user-provided Flow component review on 2026-05-22
