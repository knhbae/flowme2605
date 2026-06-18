# My Flow Execution Hub QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run docs:check` | Passed | 14 required files, 314 local links. |
| `npm run build` | Passed | Next.js production build succeeded for `/my`. |
| `npm test` | Passed | 187 tests passed. |
| `npm run test:e2e` | Passed | 82 Playwright tests passed. |
| Targeted My Flow E2E | Passed | `my flow management tabs`, `my flow ux12 demo`, and `my flow filters` passed. UX12 asserts FullCalendar `.fc`, event rendering, routine dots, and selected-day date movement. |

## Review Notes

- Product constraint review: The spec keeps My Flow local and execution-focused; it does not add integrations, accounts, social proof, or validation claims.
- Source/risk review: My Flow should not merge source facts with user execution state except for route-specific caution cues that already exist. `reference_caution` remains a pending secondary pattern, not a primary tab, checklist row, or main detail field.
- Browser or screenshot review: Current 12-Flow UX fixture should be captured on mobile and desktop with grouped Flow overview, FullCalendar event rendering, routine dots, and selected-day date movement.
- Residual risk: Empty, one-Flow, production 6+ behavior, and 20+ grouped/collapsed states remain deferred.

## 2026-05-30 UX12 User Simulation

Evidence:

- Local URL: `http://localhost:3001/my?demo=ux12`
- Screenshot set: `test-results/my-flow-ux-simulation/`
- Structured capture: `test-results/my-flow-ux-simulation/report.json`
- Fresh checks run before review: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo"`

Pass signals:

- Calendar date-number click activates the date cell and updates the selected-day panel without opening item detail.
- Calendar item click opens an editable detail surface.
- Mobile item detail opens as a bottom sheet instead of inline content.
- Routine indicators are no longer dots; they render as horizontal icons with a `+N` overflow marker on dense dates.
- Flow tab now starts with priority execution cards and keeps the full 12-Flow inventory collapsed behind `전체 Flow 보기`.
- The creator/studio empty state text is not present in the execution hub.

UX findings:

- Today view still feels too metadata-heavy for completed timeline items. Rows repeat `D-180`, the phase label, the Flow title, and the action title, which makes a completed wedding D-180 block look like schedule metadata rather than a completed action.
- `D-180` is acceptable as a timing chip for long timeline Flows, but it should not read like a recurring schedule. Keep it as timing context only; avoid placing it in titles or repeat fields.
- Calendar cells are improved: item titles are short, D-day metadata is outside the event title, and routine icons stay horizontal on desktop and mobile.
- Routine repeat editing follows the right calendar-product model by defaulting to single occurrence scope and disabling weekday/end-date edits until a future/all scope is chosen.
- Routine repeat copy still feels product-internal. It should move closer to standard calendar language: `이 이벤트만`, `이 이벤트 및 이후`, `모든 이벤트`.
- The mobile repeat editor is functionally correct, but the `반복 변경 적용` button is visually strong and orange/brown compared with the rest of the My Flow action system.
- Checklist view is still too long and dense when opened from the top-level tab. It needs Flow selection/grouping or a stronger summary-first structure before a full checklist dump.
- Routine tab is useful on desktop because it gives a weekly routine board, but it should be tested on mobile for whether the board or a next-session card should come first.

## 2026-05-30 Follow-Up Cleanup

Evidence:

- Local URL: `http://localhost:3002/my?demo=ux12`
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`
- Browser spot check: Today completed row, Checklist tab, and routine repeat editor.

Changes verified:

- Today completed rows now reduce repeated metadata. The first completed row rendered as `2026-05-28 D-180 예식 날짜와 예상 하객 규모 정하기`, without the phase label `큰 일정 확정` or Flow title `결혼 준비 Flow`.
- The top-level Checklist tab no longer dumps all Flow checklist rows at once in all-Flow mode. It first shows `체크할 Flow를 먼저 선택하세요` and 12 compact Flow summary cards.
- Routine repeat scope copy now uses calendar-style event language: `이 이벤트만`, `이 이벤트 및 이후`, and `모든 이벤트`.
- The repeat editor pending state now says `저장 전`, and the repeat-save action uses the same blue primary treatment as the rest of My Flow instead of the prior amber warning treatment.

Remaining UX risks:

- The Checklist tab summary cards are denser than the previous empty/picker state but still need mobile visual review after more real Flow categories are added.
- Today completed rows are calmer, but if completed history grows beyond a handful of items, the completed section should become collapsible by default.

## 2026-05-30 Mobile Checklist/Routine Cleanup

Evidence:

- Local URL: `http://localhost:3004/my?demo=ux12`
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`
- Browser spot check at mobile side-panel width: Checklist tab and Routine tab.

Changes verified:

- Checklist all-Flow mode now keeps summary cards compact by showing Flow title, saved progress, remaining count, and `이 Flow 체크하기`; it no longer repeats the next checklist item title inside every summary card.
- Routine tab now starts mobile users with a `다음 루틴` section before the weekly routine boards.
- `다음 루틴` cards show the occurrence date, routine phase/section, Flow title, action title, and completion button, so repeated routine sessions do not look like duplicate rows.

Remaining UX risks:

- `다음 루틴` currently lists the next three generated routine occurrences and can include the same Flow more than once on different dates. That is acceptable for execution, but a later grouping pass may be needed if users prefer one card per routine Flow.
- Weekly routine boards still render below the mobile next-routine section; if the page grows, they may need collapsed cards.

## 2026-05-30 Density Follow-Up

Evidence:

- Local URL: `http://localhost:3005/my?demo=ux12`
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`
- Browser spot check: Today tab and mobile-width Routine tab.

Changes verified:

- Today completed rows are collapsed by default behind `오늘 완료 4개 보기`, so Today no longer starts as a completed-history log when there are no open items.
- Opening the completed section still exposes the completed item rows and editable detail path.
- Mobile Routine `다음 루틴` now groups by Flow and shows one next unfinished occurrence per routine Flow. In UX12 this produced Home Workout, Running, and English study cards rather than repeating Home Workout twice.

Remaining UX risks:

- The completed section currently collapses even when there are only a few completed items. This is acceptable for UX12 because the open-state priority is execution, but production may tune the threshold after behavior data.
- The Routine tab still needs a later pass for collapsing weekly boards below the next-routine section on very long routine portfolios.

## 2026-05-30 Calendar Operability Follow-Up

Evidence:

- Local URL: `http://127.0.0.1:3006/my?demo=ux12`
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo|my flow ux12 calendar collapses|my flow mobile calendar"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`
- Browser spot check: mobile-width Calendar tab at `421x861`, date selection on `2026-05-29`, and calendar grid first position.

Changes verified:

- Calendar date buttons now expose selected state with `aria-pressed=true` and stronger selected styling, so the selected date is not only represented by the cell class.
- Routine `+N` overflow now records the overflow date on the selected-day panel and shows a compact `+N 루틴 포함` note, making the overflow action feel connected to the list below.
- Routine repeat editing now starts with the scope selector, defaults to `이 이벤트 및 이후`, and keeps weekday/end-date controls enabled until the user chooses `이 이벤트만`.
- The mobile Calendar tab hides the extra context summary so the month grid appears earlier; the automated mobile check now requires the FullCalendar grid to start before `900px` from the top.

Remaining UX risks:

- The `+N` overflow note is intentionally small; if users still miss the relationship between the icon rail and selected-day list, the next pass should scroll the selected-day panel into view after overflow clicks.
- The repeat editor now optimizes for changing recurring rules. If users mostly edit one-off routine occurrence time/location, the separate single-occurrence path may need stronger prominence.

## 2026-05-31 Mobile Routine Follow-Up

Evidence:

- Local URL: `http://127.0.0.1:3007/my?demo=ux12`
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar|my flow mobile checklist and routine"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`
- Browser spot check: mobile-width Routine tab at `390x844`.

Changes verified:

- Tapping a routine `+N` overflow now selects the overflow date, keeps the `+N 루틴 포함` note, and scrolls the selected-day panel into view so the click has an immediate visible destination.
- Mobile Routine still starts with three `다음 루틴` cards.
- Weekly routine boards are collapsed by default on mobile behind `주간 루틴 보기 3개`; expanding the toggle renders the three weekly boards and changes the toggle to `주간 루틴 접기`.

Remaining UX risks:

- The weekly boards are still dense after expansion. That is acceptable for this pass because they are now secondary on mobile, but a later board redesign may be needed for users managing many routine Flows.
- Calendar overflow scroll uses an immediate jump for deterministic behavior. If the interaction feels abrupt in visual review, the next pass can test a smooth scroll with an explicit wait-safe implementation.

## 2026-05-31 Detail Memo Cleanup

Evidence:

- Local URL: `http://127.0.0.1:3008/my?demo=ux12`
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`
- Browser spot check: calendar item detail for `예식 날짜와 예상 하객 규모 정하기`.

Changes verified:

- Detail memo content no longer exposes `실행:` or `완료 기준:` labels in the editable memo field.
- The former why/how/completion guidance remains present as plain memo paragraphs, so the detail sheet reads closer to a standard calendar memo while retaining Flow context.
- Routine detail fallback memos also avoid `실행:` and `완료 기준:` labels.

Remaining UX risks:

- Plain memo paragraphs are less structured. If users need faster scanning, the next pass should consider lightweight visual grouping outside the editable memo field rather than reintroducing internal labels inside the memo text.

## 2026-05-31 Schedule Overflow Operability

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar collapses dense days"`

Changes verified:

- Dense schedule overflow markers such as `+2` now expose a date/count `aria-label` and keyboard focus target.
- Clicking a schedule overflow marker selects that date and keeps item detail closed, so it behaves like a date expansion control rather than an item opener.
- The behavior now mirrors the routine `+N` overflow mental model while preserving the selected-day list as the place where hidden rows are fully shown.

Remaining UX risks:

- Schedule overflow does not yet add a compact selected-day note like routine overflow does. This is acceptable for this pass because all hidden schedule rows are visible in the selected-day list, but user testing may show a need for a small `+N 일정 포함` note.

## 2026-05-31 Mobile Calendar Density Follow-Up

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection"`

Changes verified:

- Mobile Calendar tab clicks now scroll directly to the calendar card, so the month grid starts within the first screen instead of below the workspace header.
- Mobile calendar card hides the secondary explanatory sentence, schedule/routine count chips, and routine legend; desktop keeps the fuller context and legend.
- The mobile calendar E2E now requires the FullCalendar grid top to be under `540px`, replacing the prior loose `900px` guard.

Remaining UX risks:

- Auto-scroll makes the Calendar tab feel more direct, but users lose some surrounding context on mobile. If later testing shows confusion about routine icons, add a compact legend trigger rather than restoring the full legend above the grid.

## 2026-05-31 Routine Detail Hierarchy Follow-Up

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`

Changes verified:

- Routine item detail now renders the repeat settings block above time/location fields.
- E2E verifies the repeat settings toggle is visually above both `시간` and `장소`, so recurring-rule edits are not buried below one-off occurrence metadata.
- Existing repeat editor behavior remains staged: scope defaults to future events, weekday/end-date edits stay enabled until `이 이벤트만` is selected, and calendar occurrences update only after `반복 변경 저장`.

Remaining UX risks:

- The repeat block still uses a compact accordion. If users frequently need to change recurrence, a later pass can auto-expand it for routine rows or split one-off time/location edits from recurrence edits more explicitly.

## 2026-05-31 Schedule Overflow Feedback Follow-Up

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar collapses dense days"`

Changes verified:

- Clicking a dense schedule `+N` marker now sets `data-schedule-overflow-date` on the selected-day panel.
- The selected-day panel shows a compact `+N 일정 포함` note, making it clearer why the date list expanded.
- The note is cleared when users select another date, open a concrete item, move months, or use calendar shortcuts, so stale overflow context does not follow unrelated selections.

Remaining UX risks:

- Schedule and routine overflow notes can theoretically appear together on a very dense day if both markers are activated separately. Current handlers clear the opposite overflow state, which is simpler for UX12; future multi-overflow disclosure may need a combined note.

## 2026-05-31 Detail Memo Density Follow-Up

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`

Changes verified:

- Item detail memo fields now open at a compact height so Flow guidance does not dominate the first detail view.
- Non-empty memos expose an explicit expand/collapse control: `메모 크게 보기` expands the field, and `메모 작게 보기` returns it to the compact state.
- Existing memo text remains editable and unchanged; this pass changes hierarchy, not content conversion.

Remaining UX risks:

- Compact memos make the first detail view calmer, but users may miss buried guidance if important instructions only live in memo text. A later pass should decide which Flow guidance deserves a primary field versus memo-only treatment.

## 2026-05-31 Routine Occurrence Hierarchy Follow-Up

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`

Changes verified:

- Routine detail now separates repeat-rule controls from a `이번 일정` section.
- Date, time, and place fields sit under `이번 일정`, so users can distinguish one occurrence metadata from the recurring series rule.
- E2E verifies the repeat settings block remains above the occurrence section, preserving the calendar-style hierarchy: recurring rule first, current occurrence fields second.

Remaining UX risks:

- The repeat-rule editor is still an accordion. This keeps the default detail calmer, but if users frequently adjust recurrence, a later pass can make the repeat editor open by default only for routine edit intents.

## 2026-05-31 Reference Caution Pending Boundary

Evidence:

- Fresh checks: `npm run docs:check`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`

Changes verified:

- `reference_caution` is now explicitly tracked as pending in the My Flow execution hub task list.
- The item type matrix records that caution/source details should not become a top-level tab, checkable row, or primary editable field in UX12.
- Existing My Flow E2E still verifies scheduled item detail has no standalone `주의` field, preserving the current calendar-style primary fields.

Remaining UX risks:

- Deferring caution keeps the detail sheet calmer, but sensitive routes may still need a future source-boundary cue. That future cue should be designed separately from generic completion or memo editing.

## 2026-05-31 Flow Overview Type Counts

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`

Changes verified:

- Flow overview cards now render compact item-shape count chips derived from existing UX12 row item types.
- Moving Flow exposes schedule and evidence signals, while used-car Flow exposes decision and evidence signals in the Flow card.
- `reference_caution` is excluded from the overview chip set, preserving the pending caution boundary.

Remaining UX risks:

- Counts are intentionally lightweight and do not yet link to filtered item lists. A later pass can make chips interactive after the Flow view has a stronger per-type drilldown model.

## 2026-05-31 Empty And Single-Flow States

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow workspace separates"`

Changes verified:

- Empty `/my` now renders an execution-hub empty state with `Flow 둘러보기` and `새 Flow 만들기` actions.
- Empty `/my` does not render the management workspace or scope selector.
- A single saved Flow renders a direct single-Flow summary and hides the all-Flow scope selector, matching the spec's single execution mode.

Remaining UX risks:

- The single-Flow state still exposes all artifact tabs. That keeps calendar/checklist/routine portability visible, but a later pass may choose the most relevant default tab per Flow destination.

## 2026-05-31 Item-Type Detail Slice

Evidence:

- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`

Changes verified:

- Checklist detail rows now use the same clickable execution-row pattern as Today and Calendar rows.
- Clicking a date-less used-car decision row opens the shared editable detail surface.
- Decision/evidence items show a compact `결정` or `메모` type summary before the primary title/date/time/place/memo fields.
- `reference_caution` remains excluded from the primary type summary chip list.

Remaining UX risks:

- This is only the first item-type split. `log_entry`, richer proof/status fields, and true decision state are still pending; current behavior is a guidance layer on top of the calendar-style editor.

## 2026-05-31 Decision And Routine Safety Pass

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because `my-flow-decision-fields` did not exist.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.
- Local dev recovery: restarted the stale port 3000 dev server and verified a fresh browser session can load `/my?demo=ux12` without `Loading chunk 493 failed`.

Changes verified:

- `decision_hold` item detail now exposes a compact decision field group with `decisionStatus` values `undecided`, `buy`, `hold`, and `reject`.
- Decision detail also exposes a next-review date field so hold/deferral can become a normal outcome instead of only a completed checklist row.
- Decision status and next-review date use the existing staged detail editing flow: changes show `변경 저장`, close after save, and re-open with the saved values in the current session.
- Routine repeat editing now opens on the current occurrence scope. Weekday and repeat end-date controls are disabled until the user explicitly switches to a future/all series scope, matching the safer calendar editing model.

Remaining UX risks:

- Decision fields are intentionally minimal. Used-car comparison still needs richer candidate/proof/status fields before it feels like a sheet-first decision workspace.
- Routine editing still uses a custom accordion rather than a provider-style recurrence modal. A later pass should decide whether series-scope changes need an explicit confirmation dialog.

## 2026-05-31 Mobile Date Feedback And Flow-Basis Label

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` failed because the selected-day panel stayed at `822.1875px` after tapping a mobile date number.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- Mobile date-number taps still select the date and do not open a random item detail sheet.
- After a mobile date-number tap, the selected-day panel scrolls into the first viewport, giving visible feedback that the date selection changed.
- The scheduled-item detail field for relative offsets now uses `Flow 기준` instead of `타이밍`, so `D-180` reads as a Flow-relative context rather than a recurrence or ordinary event time.

Remaining UX risks:

- The selected-day panel becomes visible but may not align to the very top when the page lacks enough content below it. This is acceptable for the current slice; a later mobile calendar design can add a compact selected-day summary directly under the month grid.
- `Flow 기준` is clearer than `타이밍`, but long-term wording should be tested against real users handling D-day timelines.

## 2026-05-31 Input Complexity Guardrail

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the `memo_evidence` summary did not explain that proof-like context should stay in memo/attachment/link surfaces.
- Fresh checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- `memo_evidence` no longer implies a future shared proof/status form by default.
- The type summary now tells users to keep photos, file names, and confirmation numbers in memo, attachment, or link context.
- The task list and item-type matrix now record that proof/status fields are deferred unless observed users need more than calendar/reminder-level inputs.

Remaining UX risks:

- Some flows may eventually need route-specific proof capture. That should be designed per flow instead of adding global proof/status fields to every My Flow detail sheet.

## 2026-05-31 Memo Evidence Wording

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because overview type counts still showed `증빙`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- `memo_evidence` remains the internal type and `data-item-type`, preserving routing and test targeting.
- Flow overview type counts now show `메모` instead of `증빙`.
- `memo_evidence` detail summaries now lead with `메모` and avoid user-facing `증빙` copy.
- Proof/status fields remain absent from the shared detail sheet.

Remaining UX risks:

- Some official or contract-heavy Flows may eventually need explicit proof language. Add that per Flow only after user evidence, not as the default shared My Flow label.

## 2026-05-31 Overview Chip Simplification

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the moving overview card still showed a `기록` chip.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`.

Changes verified:

- Flow overview cards no longer show `기록` counts.
- `log_entry` detail remains available through the compact `오늘 기록` field.
- Overview cards still show stronger operating signals such as `일정`, `메모`, and `결정`.

Remaining UX risks:

- Record-heavy Flows may later need a record-specific overview cue. Add that only when a record-first Flow becomes a validation target.

## 2026-05-31 Routine Session And Calendar Density Follow-Up

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because selected-day routine rows did not expose an item-level `항목 완료` action and routine progress count.
- GREEN checks: `npm run build`, `npm test`, `npm run docs:check`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "moves only one routine occurrence"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "drags one routine icon"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "overflow routine row"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Routine selected-day rows now use `항목 완료`/`항목 완료 취소` instead of generic or whole-session completion wording.
- Routine rows and detail show `루틴 체크 n/전체`, making the internal checklist count visible before completion.
- Routine repeat-rule edits now include `반복 변경 취소`; canceling closes the editor and leaves generated calendar occurrences unchanged.
- Generated routine occurrences now expose a `날짜` field under `이번 일정`; saving a changed date moves only that occurrence in the calendar.
- Visible routine icons can now be dragged to another date cell, using the same single-occurrence movement rule as the detail date field.
- Hidden routines opened from a `+N` overflow date can now be dragged from the selected-day row list to another date cell.
- Calendar cell/event horizontal padding is reduced so dense event text has more usable width.

Remaining UX risks:

- Dragging selected-day rows is a desktop/web affordance. Mobile users still rely on opening detail and editing `이번 일정` 날짜.

## 2026-05-31 Responsive Routine Rail Density

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile routine rail"` initially failed because the mobile routine rail overflow counter extended past the narrow month-cell event box.
- GREEN checks: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "mobile routine rail|mobile calendar keeps date"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Desktop calendar routine rails keep the previous two-icon limit before `+N`, preserving the richer desktop scan pattern.
- Mobile calendar routine rails use one 28px routine icon and collapse every additional routine into a compact `+N` counter.
- The mobile `+N` counter stays on the same horizontal rail as the icon and remains inside the routine event box at a 390px viewport.
- The existing mobile calendar tap-target test still passes for the visible routine icon and scheduled event rows.

Remaining UX risks:

- The compact mobile `+N` counter is intentionally narrower than a normal touch target because a month cell is only about 40px wide after calendar grid constraints. If users miss the counter in testing, the better fix is a mobile-specific calendar layout or an immediate selected-day summary, not adding more controls inside the cell.

## 2026-05-31 Lightweight Log Entry Detail

Evidence:

- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "log entry|my flow"`.

Changes verified:

- `log_entry` detail now shows a compact `기록` type summary and one `오늘 기록` input.
- The `오늘 기록` value is staged with the same `변경 저장`/`변경 취소` model as the rest of the detail sheet.
- Reopening the same `log_entry` row restores the saved `오늘 기록` value in the current My Flow session.
- The shared detail sheet still does not add proof/status fields for `memo_evidence`.

Remaining UX risks:

- The field is intentionally generic. If observed users need route-specific values such as score, symptom, distance, file status, or before/after state, design that as a route-level template instead of expanding every My Flow detail sheet.

## 2026-05-31 Routine Progress Pill And Compact Rows

Evidence:

- GREEN checks: `npm run build`, `npm test`, `npm run docs:check`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|moves only one routine occurrence|drags one routine icon|overflow routine row"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Routine selected-day rows now expose a compact action-side `체크 n/전체` pill in addition to the row metadata.
- Routine detail also exposes the same progress pill beside the completion action, reducing the chance that users read the button as "complete the whole Flow".
- Compact selected-day execution rows use smaller horizontal gaps, dot size, and completion-button padding so dense calendar-day data has more usable width.

Remaining UX risks:

- The extra progress pill improves clarity but consumes some horizontal space. If mobile testing shows crowding, the next step should be a two-line action area in selected-day rows rather than adding more fields.

## 2026-05-31 Routine Item Copy And Calendar Event Density

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|my flow ux12 calendar collapses dense days"` failed because routine completion still used `항목 완료` and desktop calendar events still had 2px horizontal padding.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|my flow ux12 calendar collapses dense days"`.

Changes verified:

- Routine row and detail completion buttons now say `이번 항목 완료`, making the action unit clearer than a generic routine/Flow completion.
- Desktop My Flow calendar events now use 1px horizontal padding, and mobile keeps the larger vertical target while reducing horizontal padding to 1px.

Remaining UX risks:

- The tighter calendar event padding improves scan width but does not solve every dense-day readability issue. If users still struggle, the next step should reduce in-cell metadata further or move more detail into the selected-day panel.

## 2026-05-31 Compact Routine Row Metadata Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|my flow mobile checklist and routine tabs"` failed because compact selected-day and mobile next-routine rows still rendered the metadata-level `루틴 체크 n/전체` note in addition to the action-side progress pill.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows|my flow mobile checklist and routine tabs"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Compact routine rows now keep the `이번 항목 완료` button and the `체크 n/전체` progress pill, but remove the duplicated metadata-level `루틴 체크 n/전체` note.
- Routine detail still keeps the explanatory completion note, where there is enough room and the user is already inspecting the item.

Remaining UX risks:

- If users still miss that routine completion is item-level, prefer improving the progress pill label or detail copy rather than adding another metadata line back into compact rows.

## 2026-05-31 Routine Detail Completion Progress Feedback

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because clicking `이번 항목 완료` in an open routine detail advanced the generated routine row and caused the detail surface to disappear before the user could see progress.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Completing a routine item from detail keeps the detail surface open.
- The progress pill increments immediately.
- The detail advances to the next unchecked routine checklist item, reinforcing that the completion action is one internal item, not the whole routine Flow.

Remaining UX risks:

- This makes routine execution feel like a queue. If users need an explicit undo for the previous item, add a lightweight recent-completion undo instead of reverting to a whole-Flow completion model.

## 2026-05-31 Routine Detail Completion Undo

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the routine detail had no `방금 완료 취소` action after advancing to the next routine item.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- After `이번 항목 완료`, routine detail shows a lightweight `방금 완료 취소` button.
- Clicking it decrements the `체크 n/전체` pill and returns the detail title to the item that was just completed.
- The undo is scoped to the most recent routine completion and does not add a general history or proof/status workflow.

Remaining UX risks:

- This is a one-step undo only. If users need to review several completed routine items, build that in the Routine tab rather than expanding the shared detail sheet.

## 2026-05-31 Routine Detail Undo Placement

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because `my-flow-routine-undo-notice` did not exist and the undo action still lived in the top action group.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- The routine detail top action group now keeps only progress, `이번 항목 완료`, and close actions.
- After a routine item is completed, `방금 완료 취소` appears in a separate lightweight notice below the header.
- The undo notice says `방금 완료한 항목을 되돌릴 수 있습니다.`, keeping the behavior explicit without adding another primary edit action.

Remaining UX risks:

- The notice adds one temporary row to the detail sheet after completion. If mobile height feels tight, collapse it into a single-line snackbar-style affordance rather than returning the action to the header.

## 2026-05-31 Routine Progress Item Copy

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because routine progress pills still said `체크 4/18` instead of making the internal item unit explicit.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Routine progress pills now say `항목 n/전체`, matching the `이번 항목 완료` button.
- Routine detail initially added `이 Flow의 루틴 항목 n/전체 완료`; the later density pass removed that duplicate metadata sentence and kept the progress in the action-side pill only.
- The change is copy-only and does not add new inputs, proof fields, or workflow steps.

Remaining UX risks:

- `항목 n/전체` is clearer than `체크 n/전체`, but users may still want to inspect all internal routine items in one place. That should live in the Routine tab rather than expanding the shared detail sheet.

## 2026-05-31 Memo Detail Summary Copy Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the `memo_evidence` detail summary still exposed proof-like examples such as `사진` and `접수번호`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- `memo_evidence` detail summaries keep the user-facing `메모` label.
- The summary now says `나중에 다시 볼 내용은 메모에 남깁니다. 파일과 링크는 더보기에서 확인합니다.`
- The summary no longer leads with proof-like examples such as photos or confirmation numbers, and the shared detail sheet still does not add proof/status fields.

Remaining UX risks:

- Some flows may still need explicit proof capture later, but that should be route-specific and evidence-backed rather than a default My Flow detail pattern.

## 2026-05-31 Memo Detail Summary Chip-Only Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the `memo_evidence` detail summary still rendered explanatory copy such as `메모에 남깁니다` and `파일과 링크`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- `memo_evidence` detail summaries now show only the `메모` type chip.
- Decision and record rows can still keep explanatory summary text because they add extra fields; memo rows no longer explain an already-visible memo field.
- The shared detail sheet remains title/date/time/place/memo first, with files and links behind `더보기`.

Remaining UX risks:

- Removing the memo explanation makes the sheet lighter, but users who expect attachment capture may not notice `더보기`. If that appears in testing, improve the `더보기` affordance rather than adding proof fields.

## 2026-05-31 Mobile Calendar Toolbar Density

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` failed because the FullCalendar grid started at y=168.5 on a 390px mobile viewport after switching to Calendar.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- Mobile calendar view hides the redundant `월간 캘린더` title row while keeping it on tablet/desktop.
- Mobile month navigation uses a tighter toolbar and hides secondary `오늘`/`첫 일정` shortcuts; previous/next and month picker remain.
- The actual FullCalendar grid now starts at y <= 130 on a 390px viewport, while selected-date and event tap behavior remain covered by the same E2E.

Remaining UX risks:

- Removing mobile shortcut buttons lowers visible convenience for `오늘` and `첫 일정`. If users need those frequently, add them as compact icons in the toolbar rather than reintroducing a second row.

## 2026-05-31 Mobile Selected-Day Density

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` failed because the mobile selected-day panel still started at x=20 with a 350px width, selected-day rows were too tall, and schedule events had no category color rail.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- The mobile selected-day panel now spans the viewport width like the mobile calendar card.
- Same-day compact rows hide redundant date metadata on mobile while keeping the accessible action names for `완료 체크` and `이번 항목 완료`.
- The first selected-day row is capped at 92px or less in the mobile regression, and the measured visual pass reduced it to 58px.
- Schedule events now render a category color rail beside the title so the month grid is easier to scan without adding more text.

Remaining UX risks:

- Compact visible labels such as `완료` and `항목 완료` rely on the surrounding row context. If users hesitate, restore the longer visible label only for rows with enough horizontal room.

## 2026-05-31 Calendar Active Event Feedback

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because clicking a schedule event selected the date cell but did not add an active state to the event box itself.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Schedule events whose `calendarKey` matches the open detail row now receive `my-flow-calendar-active-event`.
- Active schedule events get a stronger blue border/ring while preserving the selected date-cell state.
- Dense-day overflow markers and routine rails are not marked as active schedule events because they do not carry a schedule `calendarKey`.

Remaining UX risks:

- Routine icons still show their active state through the selected-day row/detail, not the icon itself. If users expect icon-level selection feedback, add a routine-key active class separately.

## 2026-05-31 Routine Icon Active Feedback

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed when an inline routine-icon active assertion was added, because routine icon buttons did not receive an active class after click.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar marks clicked routine icons active|my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- The clicked routine icon now receives `my-flow-calendar-active-routine` when its `routine.key` matches the active row key.
- The routine detail still opens in the selected-day panel and reports `routine_session`.
- The active routine test is isolated from the longer repeat-edit scenario so it does not mutate that scenario's selected state.

Remaining UX risks:

- Hidden routine items opened from `+N` are represented as rows, not visible icons. Their active state remains on the selected-day row.

## 2026-05-31 Mobile Calendar Visual Hierarchy

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 mobile routine rail keeps overflow horizontal"` failed because inactive routine icons computed as white card-like buttons.
- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar collapses dense days"` failed because schedule overflow event containers kept a filled FullCalendar event box.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 calendar collapses dense days|my flow ux12 mobile routine rail keeps overflow horizontal|my flow ux12 calendar marks clicked routine icons active"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- Inactive routine icons retain a 28px tap target but compute as transparent with no visible shadow.
- Routine rail FullCalendar event containers are transparent, borderless, and shadowless.
- Schedule overflow FullCalendar event containers are transparent, borderless, and shadowless, leaving the inner `+N` marker as the visual affordance.
- Active routine icons still receive the explicit active class and blue emphasis.

Remaining UX risks:

- The inner `+N` markers still need to remain noticeable without becoming competing primary targets. If the screen still feels busy, the next cut should reduce overflow pill weight rather than removing overflow counts.

## 2026-05-31 Mobile Calendar Full-Width Card

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"` failed because the mobile calendar card started at x=20 on a 390px viewport instead of using the viewport width.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow mobile calendar keeps date selection separate"`.

Changes verified:

- On a 390px mobile viewport, `my-flow-calendar-card` starts at x <= 4 and is at least 386px wide.
- The FullCalendar grid itself starts at x <= 8 and is at least 374px wide.
- Date selection, event tap targets, routine icon overflow, and selected-day behavior remain covered by the same mobile calendar E2E.

Remaining UX risks:

- The calendar still sits below the My Flow heading, filter, and tab controls. A later pass should compress the mobile header/filter area further if the first viewport still feels too heavy in real-device review.

## 2026-05-31 Log Detail Summary Chip-Only Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 log entry keeps recording lightweight"` failed because `log_entry` detail summaries still rendered explanatory text such as `상태나 관찰값`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 log entry keeps recording lightweight"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- `log_entry` detail summaries now show the `기록` chip only.
- The type-summary row stays compact at or under 32px, matching decision and memo chip-only summaries.
- The `오늘 기록` input and placeholder remain, so the actual record-capture surface is still visible.

Remaining UX risks:

- Chip-only type context is lighter. If users do not understand why a record field appears for some rows, improve the field label or route-specific placeholder before adding another global explanation block.

## 2026-05-31 Log Field Helper Copy Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 log entry keeps recording lightweight"` failed because the `오늘 기록` field still rendered helper copy such as `숫자, 상태` and `긴 설명은 아래 메모`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 log entry keeps recording lightweight"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- `log_entry` detail still exposes one lightweight `오늘 기록` input.
- The field keeps a concrete placeholder (`예: 이상 없음, 누유 없음, 7점`) but no longer adds a separate explanatory helper paragraph.
- This keeps record capture closer to a calendar/reminder note field and avoids adding more instructional text to the shared detail sheet.

Remaining UX risks:

- Placeholder-only guidance is lighter, but may be less explicit for unusual log types. If a specific Flow needs stronger record guidance, add it in that Flow's content rather than as global My Flow helper copy.

## 2026-05-31 Routine Row Duplicate Progress Note Removal

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 today routine rows rely on the progress pill only"` failed because a non-compact Today routine row still rendered `my-flow-routine-completion-note` beside the same `항목 n/전체` progress pill.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 today routine rows rely on the progress pill only"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- Non-compact Today routine rows no longer repeat the metadata-level completion sentence.
- Routine rows still show the action-side `항목 n/전체` pill and `이번 항목 완료` button.
- Compact selected-day, mobile next-routine, and detail surfaces continue to assert no metadata-level routine completion note.

Remaining UX risks:

- Rows now rely on one compact progress pill. If users miss routine progress in dense rows, adjust the pill styling or placement rather than adding a second sentence.

## 2026-05-31 Flow-Basis Detail Field Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because scheduled item detail still rendered a read-only `input[aria-label="Flow 기준"]` in the primary field grid.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`, `npm run docs:check`.

Changes verified:

- Scheduled item detail no longer exposes `Flow 기준` as a read-only primary input.
- D-day context remains visible in the compact `기준 D-...` detail chip.
- The chip still carries accessible `Flow 기준 D-...` text and tooltip, so removing the input does not remove the context entirely.

Remaining UX risks:

- The D-day context is now less visually prominent in the edit form. If real users miss it, prefer a small non-field metadata row over reintroducing a disabled input.

## 2026-05-31 Routine Detail Duplicate Progress Note Removal

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because routine detail still rendered `my-flow-routine-completion-note` beside the title metadata even though the progress pill already showed `항목 n/전체`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`.

Changes verified:

- Routine detail no longer repeats the metadata-level completion sentence.
- The visible progress state remains in the action-side `항목 n/전체` pill.
- Compact selected-day and mobile next-routine rows still assert no metadata-level routine completion note.

Remaining UX risks:

- The progress pill is now the only visible count in routine detail. If users miss it, improve the pill label or placement before adding another explanatory sentence.

## 2026-05-31 Decision Summary Chip-Only Reduction

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because `decision_hold` detail summaries still rendered explanatory copy such as `구매, 보류, 거절` and `완료만 누르기보다`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- `decision_hold` detail summaries now show type chips only.
- Decision choices remain discoverable in the `결정 상태` select, including `보류`.
- The detail sheet keeps the decision-specific inputs but removes the extra explanatory paragraph above them.

Remaining UX risks:

- The decision fields are still extra inputs compared with a plain calendar event. Keep them only for decision-shaped Flows; do not add more global decision guidance unless observed users misunderstand the select.

## 2026-05-31 Chip-Only Type Summary Density

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because chip-only detail summaries still rendered as a 48px-tall padded card.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Chip-only type summaries now render as a compact row instead of a padded white card.
- Decision and memo detail summaries stay at or under 32px when they have no explanatory text.
- Type summaries with explanatory text can still use the card styling, so future text-bearing summaries do not lose readability.

Remaining UX risks:

- Chip rows are less visually prominent. If users miss a decision or memo type, prefer improving the chip label or color before adding another explanation block.

## 2026-05-31 Advanced Metadata Closed-State Density

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the closed `더보기` wrapper still had 8px vertical padding and a white card background.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Closed `더보기` now renders as a lightweight row with no padded white wrapper.
- Expanded advanced content still uses a white block with padding for attachment and link readability.
- The test fixes closed-state wrapper padding at 1px or less and transparent background.

Remaining UX risks:

- A lighter closed row may make attachment/link metadata easier to miss. If observed users miss it, improve the row affordance before making attachment or link data primary fields.

## 2026-05-31 Detail Header Eyebrow Removal

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because item detail still rendered an exact `상세` eyebrow above the title field.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow"`.

Changes verified:

- Item detail now starts directly with the `제목` field.
- The mobile drawer keeps its accessible dialog label `Flow 항목 상세`; only the redundant visible eyebrow was removed.
- The title label spacing no longer reserves extra top margin for the removed eyebrow.

Remaining UX risks:

- Removing the visible eyebrow assumes the surrounding panel/drawer context is enough. If users lose orientation, prefer a stronger drawer title on mobile rather than reintroducing a redundant inline label.

## 2026-05-31 Flow-Basis Timing Chips

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the first completed wedding timeline row still showed a bare `D-180` chip.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`.

Changes verified:

- My Flow row timing chips now render D-day offsets as `기준 D-180` instead of bare `D-180`.
- My Flow detail timing chips use the same Flow-basis wording.
- Non-D-day timing strings still render unchanged, so routine repeat labels and other text are not reclassified.

Remaining UX risks:

- `기준 D-180` is clearer than a bare D-day chip, but real users may still need a tooltip or detail field label if they do not understand that the date itself is already handled by the calendar.

## 2026-05-31 Flow-Basis Timing Accessibility

Evidence:

- RED check: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"` failed because the visual `기준 D-180` timing chip had no `aria-label`.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow ux12 demo renders grouped fixture flows"`.

Changes verified:

- My Flow row timing chips keep the compact visual label but expose `Flow 기준 D-180` as accessible text and tooltip.
- My Flow detail timing chips use the same accessible label.
- The calendar-style `Flow 기준` readonly input remains a distinct input assertion in E2E so timing-chip labels do not inflate field counts.

Remaining UX risks:

- Tooltips and screen-reader labels clarify meaning only after focus/hover or assistive-tech use. If users still misread D-day chips visually, the next step is a visible helper on the detail field rather than widening every row chip.

## 2026-05-31 UX20 Large Inventory Fixture

Evidence:

- RED check: `npm run build` initially failed because the 6+ inventory threshold referenced `savedFlows` before declaration; moving the threshold calculation below `savedFlows` fixed the compile error.
- GREEN checks so far: `npm run build`, `npx playwright test tests/e2e/flow-mvp.spec.ts -g "ux20"`.

Changes verified:

- `/my?demo=ux20` creates a 24-Flow execution fixture without writing `flow:saved:*` localStorage records.
- The Flow tab still starts from priority cards rather than a full catalog.
- The full inventory starts collapsed behind `전체 Flow 보기 24개`.
- 20+ mode hides the long left-side Flow list and uses grouped inventory sections instead.
- Applying a filter or search opens the matching inventory directly, so users do not need to expand the collapsed all-Flow list first.

Remaining UX risks:

- The current 20+ fixture uses representative seed Flows rather than a user-derived portfolio. Real portfolios may need pinned Flows, custom ordering, or recently-used grouping after observed behavior.
