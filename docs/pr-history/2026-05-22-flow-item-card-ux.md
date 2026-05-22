# PR: Flow Item Card And Demo UX Polish

- Date: 2026-05-22
- Branch: `codex/flow-item-card-ux`
- Base: `codex/implement-flow-builder-mvp`
- Stacked PR: https://github.com/knhbae/flowme2605/pull/7
- Mainline PRs:
  - Item-card promotion: https://github.com/knhbae/flowme2605/pull/8
  - Demo UX polish: https://github.com/knhbae/flowme2605/pull/9
- Status: `Open`, `Deployed`
- Production deploy: https://flowme2605.vercel.app
- Deployment URL: https://flowme2605-20g5fe610-flowme.vercel.app
- Demo UX deployment URL: https://flowme2605-qqsm8zzac-flowme.vercel.app
- Channel-nav deployment URL: https://flowme2605-feri2di46-flowme.vercel.app
- Execution-model deployment URL: https://flowme2605-dvsk1atld-flowme.vercel.app
- Comparison-followup deployment URL: https://flowme2605-6avh7mj1a-flowme.vercel.app
- Comparison-export deployment URL: https://flowme2605-ctyehe39h-flowme.vercel.app
- Vercel inspect: https://vercel.com/flowme/flowme2605/E8vL2nQMrzoF8qjf7aow8tkTUZsb
- Demo UX Vercel inspect: https://vercel.com/flowme/flowme2605/ERjP9Gtj2GjbA7FCRQNQCYz8a1TV
- Channel-nav Vercel inspect: https://vercel.com/flowme/flowme2605/8JjefxX9MPrtkkBJ84SqzHiYxibt
- Execution-model Vercel inspect: https://vercel.com/flowme/flowme2605/BLPBytJZnTEzSUDA9NAdCyxXBRAw
- Comparison-followup Vercel inspect: https://vercel.com/flowme/flowme2605/2hMiyV5fNvJND71EkutgMf5vT3mW
- Comparison-export Vercel inspect: https://vercel.com/flowme/flowme2605/5SRdATNfKEmJcv9BZi4BreFMmfVZ

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
- Restored channel browsing in public navigation as `채널` after review clarified that channel-by-channel discovery is required for demos and product comprehension.
- Simplified the landing hero copy and moved creator entry to a lower-weight text link.
- Removed hero tag chips and representative-item text from public Flow cards.
- Kept demo-safe metadata such as `베타 운영 중`, item count, category, and duration instead of fake numeric social proof.
- Reduced public Flow status badges to source confirmation and meaningful risk signals.
- Consolidated source metadata into `SourceContentCard` and removed the duplicated `출처와 주의 정보` details block.
- Replaced separate `주별 보기` and `달력 보기` tabs with a single explicit `월별 달력` tab after a date/example anchor exists.
- Removed the duplicate `섹션 바로가기` component; the `전체 흐름` cards remain section anchors.
- Reframed `/my` as `내 Flow`, added title metadata, and added localStorage-based `진행 중인 Flow` recovery cards.
- Added an execution-model planning pass for Timeline, Checklist/Decision, Routine/Program, Meal Plan, and Mini Flow content types.
- Classified five representative demo flows for landing and QA: moving timeline, used-car decision checklist, running program routine, baby-food meal plan, and overseas-travel timeline.
- Added landing-card previews that show sample list items and expected export targets instead of only abstract badges.
- Added Flow-detail first-screen previews:
  - Timeline and meal-plan flows show `월별 달력 preview` plus an execution list preview.
  - Routine/program flows show `반복 달력 preview` plus `한 회차에 하는 일`.
  - Decision/checklist flows show `후보 비교 preview` plus `현장에서 바로 체크`.
- Changed schedule tabs from generic `일정 보기` to explicit `월별 달력`.
- Added a routine recurrence helper and monthly routine calendar that expands selected weekdays into visible `n회차` sessions.
- Added an editable decision comparison table for decision/checklist flows:
  - Candidate names are editable.
  - Candidate notes can be entered per comparison row.
  - Additional candidates can be added.
  - Comparison state persists in localStorage.
- Added comparison-table data to text copy and XLSX workbook export:
  - Text export appends a `후보 비교표` section.
  - Workbook export adds a `후보 비교` sheet with candidate columns and row-level notes.
- Added a migration-candidate banner so older flows remain usable while clearly indicating they are being moved to the new execution model.

## Not Done

- Did not split `components/flow/AppClient.tsx` into smaller files in this PR.
- Did not add icon assets or a global button/badge design-token system.
- Did not add login, DB persistence, or cross-device sync for `/my`; progress recovery remains browser-local.
- Did not rewrite all seed Flow content in this PR; content quality work remains incremental.
- Did not redesign the mobile sticky export bar into a bottom sheet.
- Did not add comparison data to `.ics` calendar export because candidate comparison is not a dated reminder surface.
- Did not migrate every legacy Flow into the new execution-model content standard; older flows remain migration candidates.
- Did not add account sync, external calendar API integration, or server-side recurrence storage.

## Decisions

- Built on top of PR #6 as a stacked PR because the item-card work depends on the memo/skip/localStorage changes there.
- PR #7 merged into the parent branch after PR #6 had already merged to `main`, so PR #8 was opened to promote the same deployed work to `main`.
- Kept implementation local to `AppClient.tsx` to limit blast radius; a future component split should happen separately.
- Used text labels instead of new icon dependencies to keep this PR focused.
- Kept calendar/schedule demo value by preserving an explicit `월별 달력` view instead of removing dated views entirely.
- Avoided fake production-looking numeric stats; demo trust is represented through beta/status metadata and concrete Flow scope.
- Kept `Flow Lab` hidden from public nav, but kept channel discovery visible because it represents actual content organization rather than an internal validation tool.
- Kept calendar views as a core demo affordance after review clarified that timeline and routine content must visibly become a calendar, not only a list.
- Chose a representative-set landing strategy over showing many half-migrated flows first; broader catalog items remain discoverable elsewhere.
- Kept the current client-side data model and derived recurrence in UI because Stage 0 has no auth, DB, or server persistence.
- Kept decision flow execution as checklist-first, with the comparison table as a top-level decision aid rather than replacing the checklist.

## Files Touched

- `components/flow/AppClient.tsx`
- `lib/flow/execution-model.ts`
- `lib/flow/execution-model.test.ts`
- `lib/flow/recurrence.ts`
- `lib/flow/recurrence.test.ts`
- `lib/flow/storage.ts`
- `app/my/page.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/superpowers/plans/2026-05-22-flow-item-card-ux.md`
- `docs/superpowers/plans/2026-05-22-flow-demo-ux-polish.md`
- `docs/superpowers/plans/2026-05-22-flow-execution-model-p0.md`
- `docs/superpowers/plans/2026-05-22-flow-execution-model-followups.md`
- `docs/superpowers/specs/2026-05-22-flow-execution-model-redesign.md`
- `docs/superpowers/specs/2026-05-22-flow-execution-model-wireframes.md`
- `docs/superpowers/specs/2026-05-22-existing-flow-content-migration.md`
- `docs/pr-history/2026-05-22-flow-item-card-ux.md`

## Verification

- `npm run build` passed.
- `npm run test:e2e -- --grep "wedding flow answers"` passed.
- `npm run test:e2e -- --grep "public moving flow|routine flow highlights|no-anchor checklist|representative real content"` passed.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed after demo UX polish.
- `npm run test:e2e -- --grep "home presents|my flow workspace|public moving flow|meal plan flow|duration calendar|real source public flow|representative real content"` passed: 7 tests.
- `npm run test:e2e -- --grep "home presents|creator directory exposes"` passed after restoring the `채널` nav link: 3 tests.
- `npm run test:e2e` passed: 30 tests.
- `npm test` passed after execution-model and recurrence tests were added: 46 tests.
- `npm run build` passed after adding landing previews and routine monthly calendar.
- `npm run test:e2e -- --grep "home presents|public moving flow|routine flow highlights|no-anchor checklist|used-car checklist"` passed: 5 tests.
- `npm run test:e2e` passed after execution-model P0 UI: 31 tests.
- `npm run test:e2e -- --grep "migration candidate|decision flow comparison"` passed: 2 tests.
- `npm run test:e2e` passed after comparison-table follow-up: 33 tests.
- `npx tsx --test lib/flow/export.test.ts` passed after comparison export integration: 11 tests.
- `npm test` passed after comparison export integration: 47 tests.
- `npm run build` passed after comparison export integration.
- `npm run test:e2e` passed after comparison export integration: 33 tests.
- Execution-model production deploy passed and aliased to `https://flowme2605.vercel.app`.
- Production smoke passed for:
  - Home representative flow card and output target preview.
  - Running Flow `반복 달력 preview` and `월별 달력`.
  - Used-car Flow `후보 비교 preview` and `현장에서 바로 체크`.
- Comparison-followup production deploy passed and aliased to `https://flowme2605.vercel.app`.
- Comparison-followup production smoke passed:
  - Used-car Flow candidate name and row memo persisted after reload.
  - Wedding Flow rendered the `새 실행모델로 전환 중` migration banner.
- Comparison-export production deploy passed and aliased to `https://flowme2605.vercel.app`.
- Comparison-export production smoke passed: Used-car Flow copied text included `후보 비교표`, candidate name, and row memo after user input.
- Local visual smoke via Playwright passed:
  - Home: no `/flow-lab` nav link; channel discovery remains as `/creators` labeled `채널`; headline is `따라하기 쉬운 실행 가이드, Flow`.
  - Moving schedule: no duplicated `출처와 주의 정보`; no `주별 보기`; one `월별 달력` tab.
  - `/my`: document title and H1 are `내 Flow`; no `Creator Studio` text.
- Vercel production build passed for both item-card and demo UX deployments.
- Production smoke tests passed:
  - `https://flowme2605.vercel.app` returned 200.
  - `https://flowme2605.vercel.app/f/wedding-d180-basic` returned 200.
  - Production item-card DOM check found 12 cards, 3 buttons, and 1 checkbox in the first card.
- Demo UX production smoke tests passed:
  - `/`, `/f/moving-d30-basic`, and `/my` returned 200 on the production alias.
  - Home had 0 `/flow-lab` links, 0 `/creators` links, and the updated headline.
  - Moving Flow had no duplicate source details, no `주별 보기`, and 1 `일정 보기` tab.
  - `/my` had title/H1 `내 Flow` and no `Creator Studio` text.
- Channel-nav production smoke tests passed:
  - `/` and `/creators` returned 200 on the production alias.
  - Home nav had 0 `/flow-lab` links and 1 `/creators` link labeled `채널`.
  - `/creators` rendered the `제작자 채널` heading.
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
