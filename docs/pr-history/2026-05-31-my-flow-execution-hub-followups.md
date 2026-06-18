# My Flow Execution Hub Follow-Ups

**Date:** 2026-05-31  
**Branch:** `design-ref-full-gap-alignment`  
**Status:** Draft / preview deployed  
**PR URL:** Not opened  
**Deploy URL:** `https://flowme2605-k6rpheuck-flowme.vercel.app`

## Why

The My Flow UX12 execution hub needed to stay close to familiar calendar and reminder app complexity while still making Flow-specific execution states understandable. Recent user review called out routine completion ambiguity, routine occurrence movement, staged edit expectations, dense calendar readability, and large saved-Flow inventory behavior.

## What Changed

- My Flow calendar keeps FullCalendar and separates date selection from item detail opening.
- Mobile calendar cards now expand to the viewport edge so the month grid has more horizontal room.
- Mobile calendar hides the redundant title row and uses a tighter month toolbar so the month grid appears higher in the first viewport.
- Mobile selected-day rows now use the viewport width, hide same-day redundant metadata, shorten visible compact completion labels, and add category color rails to schedule events.
- Calendar schedule event clicks now mark the event box itself as active in addition to selecting the date cell.
- Calendar routine icon clicks now mark the clicked icon as active while the routine detail is open.
- Mobile calendar routine indicators now render as lightweight transparent icons by default, and routine/schedule overflow event containers no longer draw FullCalendar's blue event boxes.
- My Flow P0/P1 work queue is now recorded in the execution-hub task spec.
- My Flow P0 roadmap is now deployed to preview: routine model, period-goal checklist model, gap map, and Flow tab status-board audit are recorded.
- Flow tab now starts with a `Flow 상태판` block before priority cards and secondary full-list controls.
- Mobile status-board metrics now behave as actions: `밀림` and `다음 실행` open bottom sheets with the relevant Flow items, while `진행 중` opens the filtered full Flow list.
- Mobile Flow tab inventory is no longer a default body card. The default mobile hierarchy is now `Flow 상태판`, `지금 볼 Flow`, and one `전체 Flow N개 보기` CTA that opens the full inventory bottom sheet.
- Routine calendar indicators use semantic icons with horizontal overflow instead of dots.
- Routine completion is framed as item-level completion, with routine progress visible in rows/detail.
- Routine repeat edits use explicit save/cancel, and single occurrence movement works from detail date edits, visible icon drag, and overflow row drag.
- Item detail uses calendar-style fields with memo/advanced metadata instead of why/how/completion/warning top-level fields.
- `log_entry` rows expose one lightweight `오늘 기록` field with placeholder-only guidance.
- `log_entry` detail summaries are now chip-only, removing explanatory text for the already-visible record field.
- Flow overview cards no longer show `기록` chips; record capture stays in item detail.
- `memo_evidence` stays lightweight through memo, attachment metadata, and links; proof/status forms are deferred.
- `memo_evidence` now appears as user-facing `메모` instead of `증빙` in overview chips and detail summaries.
- `memo_evidence` detail summaries now avoid proof-like examples such as photos or confirmation numbers and simply direct users to memo plus file/link more details.
- `memo_evidence` detail summaries are now chip-only, removing explanatory text for the already-visible memo field.
- `decision_hold` detail summaries are now chip-only; the `결정 상태` select carries choices like `보류`.
- Chip-only detail summaries now render as compact rows instead of padded cards, reducing vertical density in the detail sheet.
- Closed `더보기` metadata now renders as a lightweight row; attachment/link padding appears only after expansion.
- Item detail now starts directly from `제목`; the redundant visible `상세` eyebrow was removed while keeping the mobile drawer's accessible label.
- `?demo=ux20` adds a 24-Flow inventory fixture with 6+ collapsed inventory and 20+ grouped inventory behavior.
- Compact selected-day rows now use tighter horizontal spacing and an action-side routine progress pill.
- Routine completion buttons now say `이번 항목 완료` so users read the action as the current routine checklist item, and My Flow calendar events use tighter 1px horizontal padding.
- Compact routine rows now remove the duplicated metadata-level `루틴 체크 n/전체` note and rely on the action-side `체크 n/전체` pill for progress.
- Routine detail completion now keeps the detail open, increments the progress pill, and advances to the next unchecked routine checklist item.
- Routine detail now exposes a one-step `방금 완료 취소` action after completing an item, so accidental routine completion can be corrected without opening another view.
- Routine detail now shows `방금 완료 취소` in a separate lightweight notice instead of the top action group, so the header stays focused on progress, completion, and close.
- Routine progress now says `항목 n/전체` instead of `체크 n/전체`, matching `이번 항목 완료` and clarifying that users are completing one internal routine item.
- Routine detail now removes the duplicate metadata-level completion sentence and relies on the action-side `항목 n/전체` pill for progress.
- Non-compact Today routine rows now also remove the duplicate metadata-level completion sentence and rely on the action-side `항목 n/전체` pill for progress.
- D-day timeline chips now show Flow-basis wording such as `기준 D-180` instead of a bare `D-180`.
- D-day timeline chips now expose `Flow 기준 D-180` as accessible text and tooltip while keeping the compact visual label.
- Scheduled item detail no longer shows `Flow 기준` as a read-only primary input; D-day context stays in the compact chip.

## Not Done

- No PR has been opened or merged.
- No first-class `reference_caution` detail UI was added.
- No global proof/status form was added for evidence rows.
- No observed-user validation claim is made.

## Decisions

- Keep shared My Flow input complexity at calendar/reminder level.
- Treat routine completion as one internal routine checklist item, not the whole Flow.
- Move only one routine occurrence when the user edits a date or drags one routine instance.
- Use saved-Flow count thresholds: 6+ collapses the full inventory, 20+ hides the long side list and groups inventory.

## Files Touched

- `components/flow/AppClient.tsx`
- `app/globals.css`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/STATUS.md`
- `docs/DECISIONS.md`
- `docs/specs/2026-05-28-my-flow-execution-hub/*`

## Verification

- `npm run build`
- `npm test` pass: 187 tests
- `npm run docs:check`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass: 19 tests
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after the Flow-basis timing chip update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after the Flow-basis timing accessibility update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after the memo-evidence wording update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after the overview chip simplification
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|my flow ux12 calendar collapses dense days"` pass after the routine item copy and calendar event density update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after the routine item copy and calendar event density update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|my flow mobile checklist and routine tabs"` pass after compact routine row metadata reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after compact routine row metadata reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after routine detail completion progress feedback
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine detail completion progress feedback
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after routine detail completion undo
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine detail completion undo
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after routine detail undo placement
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine detail undo placement
- `npm run docs:check` pass after routine detail undo placement docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after routine progress item-copy update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine progress item-copy update
- `npm run docs:check` pass after routine progress item-copy docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after memo detail summary copy reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after memo detail summary copy reduction
- `npm run docs:check` pass after memo detail summary copy reduction docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after memo detail summary chip-only reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after memo detail summary chip-only reduction
- `npm run docs:check` pass after memo detail summary chip-only docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 log entry keeps recording lightweight"` pass after log field helper copy reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after log field helper copy reduction
- `npm run docs:check` pass after log field helper copy reduction docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after decision summary chip-only reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after decision summary chip-only reduction
- `npm run docs:check` pass after decision summary chip-only docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after chip-only type summary density update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after chip-only type summary density update
- `npm run docs:check` pass after chip-only type summary density docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after closed advanced metadata density update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after closed advanced metadata density update
- `npm run docs:check` pass after closed advanced metadata density docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after detail eyebrow removal
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after detail eyebrow removal
- `npm run docs:check` pass after detail eyebrow removal docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after routine detail duplicate progress note removal
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine detail duplicate progress note removal
- `npm run docs:check` pass after routine detail duplicate progress note removal docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after Flow-basis detail field reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after Flow-basis detail field reduction
- `npm run docs:check` pass after Flow-basis detail field reduction docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 today routine rows rely on the progress pill only"` pass after routine row duplicate progress note removal
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine row duplicate progress note removal
- `npm run docs:check` pass after routine row duplicate progress note removal docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 log entry keeps recording lightweight"` pass after log detail summary chip-only reduction
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after log detail summary chip-only reduction
- `npm run docs:check` pass after log detail summary chip-only docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` pass after mobile calendar full-width update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after mobile calendar full-width update
- `npm run docs:check` pass after mobile calendar full-width docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` pass after mobile calendar toolbar density update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after mobile calendar toolbar density update
- `npm run docs:check` pass after mobile calendar toolbar density docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` pass after mobile selected-day density update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after mobile selected-day density update
- `npm run docs:check` pass after mobile selected-day density docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after calendar active-event feedback update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after calendar active-event feedback update
- `npm run docs:check` pass after calendar active-event feedback docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar marks clicked routine icons active|my flow ux12 demo renders grouped fixture flows"` pass after routine icon active feedback update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after routine icon active feedback update
- `npm run docs:check` pass after routine icon active feedback docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar collapses dense days|my flow ux12 mobile routine rail keeps overflow horizontal|my flow ux12 calendar marks clicked routine icons active"` pass after mobile calendar visual hierarchy update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass after mobile calendar visual hierarchy update
- `npm run docs:check` pass after mobile calendar visual hierarchy docs update
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` pass after Flow tab status-board update
- Mobile visual smoke captured `output/playwright/my-flow-p0-flow-status-board-mobile.png`: Flow tab renders `Flow 상태판`, priority cards, and full inventory controls in that order.
- `npx vercel deploy . -y` deployed preview `https://flowme2605-j5kxppsrj-flowme.vercel.app` after the P0 roadmap/status-board update.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile status board opens actionable flow lists"` pass after the status-board interaction update.
- Mobile visual smoke captured `output/playwright/my-flow-status-overdue-sheet-mobile.png`: tapping `밀림` opens a bottom sheet with the two overdue execution items.
- `npx vercel deploy . -y` deployed preview `https://flowme2605-82q2999am-flowme.vercel.app` after the mobile status-board interaction update.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile status board opens actionable flow lists"` pass after the mobile inventory-sheet optimization.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"` pass: 19 tests after the mobile inventory-sheet optimization.
- Mobile visual smokes captured `output/playwright/my-flow-tab-mobile-optimized.png` and `output/playwright/my-flow-inventory-sheet-mobile.png`: the default body no longer renders the full inventory card, and the inventory opens as a bottom sheet.
- `npx vercel deploy . -y` deployed preview `https://flowme2605-k6rpheuck-flowme.vercel.app` after the mobile Flow-tab optimization.
- `npx vercel deploy . -y` deployed preview `https://flowme2605-ie9xo2dpw-flowme.vercel.app`
- `npx vercel deploy . -y` deployed preview `https://flowme2605-h6y8mtr1h-flowme.vercel.app` after the Flow-basis timing chip update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-739a97ab6-flowme.vercel.app` after the Flow-basis timing accessibility update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-r3olma9ff-flowme.vercel.app` after the memo-evidence wording update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-6tpb2snnr-flowme.vercel.app` after the overview chip simplification
- `npx vercel deploy . -y` deployed preview `https://flowme2605-qqxm2y92e-flowme.vercel.app` after the routine item copy and calendar event density update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-ftx34z6m5-flowme.vercel.app` after compact routine row metadata reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-i7wgk40dv-flowme.vercel.app` after routine detail completion progress feedback
- `npx vercel deploy . -y` deployed preview `https://flowme2605-fx1ayqnwm-flowme.vercel.app` after routine detail completion undo
- `npx vercel deploy . -y` deployed preview `https://flowme2605-p2f3nyn0q-flowme.vercel.app` after routine detail undo placement
- `npx vercel deploy . -y` deployed preview `https://flowme2605-qg5zbhinp-flowme.vercel.app` after routine progress item-copy update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-k6zg5qjaj-flowme.vercel.app` after memo detail summary copy reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-pj12vgn8p-flowme.vercel.app` after memo detail summary chip-only reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-l6df9yzdy-flowme.vercel.app` after log field helper copy reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-4ah4owsje-flowme.vercel.app` after decision summary chip-only reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-r0bfi0gcp-flowme.vercel.app` after chip-only type summary density update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-a98qp8ttk-flowme.vercel.app` after closed advanced metadata density update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-qjb8tp5ti-flowme.vercel.app` after detail eyebrow removal
- `npx vercel deploy . -y` deployed preview `https://flowme2605-5bfvuu4s2-flowme.vercel.app` after routine detail duplicate progress note removal
- `npx vercel deploy . -y` deployed preview `https://flowme2605-jss29glv9-flowme.vercel.app` after Flow-basis detail field reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-cixk0o53v-flowme.vercel.app` after routine row duplicate progress note removal
- `npx vercel deploy . -y` deployed preview `https://flowme2605-iotrl4nai-flowme.vercel.app` after log detail summary chip-only reduction
- `npx vercel deploy . -y` deployed preview `https://flowme2605-adgyjk3d6-flowme.vercel.app` after mobile calendar full-width update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-kxzs2geiy-flowme.vercel.app` after mobile calendar toolbar density update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-p506grg4i-flowme.vercel.app` after mobile selected-day density update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-mn37n1t5q-flowme.vercel.app` after calendar active-event feedback update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-dqrzqt7rk-flowme.vercel.app` after routine icon active feedback update
- `npx vercel deploy . -y` deployed preview `https://flowme2605-3nu1y4jq9-flowme.vercel.app` after mobile calendar visual hierarchy update
- Targeted routine movement checks passed:
  - `moves only one routine occurrence`
  - `drags one routine icon`
  - `overflow routine row`
- Local dev smoke: `http://localhost:3000/my?demo=ux12` returned 200
- In-app browser smoke: `/my?demo=ux12` hydrated from empty state to UX12 demo state after client load

## Risks

- The routine progress pill adds clarity but also consumes horizontal row space. If mobile testing shows crowding, use a two-line action area instead of adding more fields.
- Dragging is a desktop/web affordance; mobile users still need to move occurrences through the detail date field.
- UX20 uses curated demo fixtures, not a real user portfolio. Real users may need pinned or recently-used groups.

## Follow-Ups

- Use `https://flowme2605-k6rpheuck-flowme.vercel.app/my?demo=ux12` as the current P0 preview.
- Review the actual browser rendering of compact selected-day rows on small mobile widths after the next visual pass.
- Revisit caution UI only after a sensitive representative Flow proves that caution visibility is required for safe execution.

## Links

- [My Flow Execution Hub QA](../specs/2026-05-28-my-flow-execution-hub/qa.md)
- [My Flow Execution Hub Tasks](../specs/2026-05-28-my-flow-execution-hub/tasks.md)
- [Decision Log](../DECISIONS.md)
- [Vercel Preview](https://flowme2605-k6rpheuck-flowme.vercel.app/my?demo=ux12)
