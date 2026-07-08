# FlowMe full UX loop audit

Date: 2026-07-02
Scope: mobile 390px simulation before the second UX improvement loop.
Evidence: `output/playwright/ux-full-loop/before/summary.json` and screenshots in `output/playwright/ux-full-loop/before/`.

This is browser QA, not real user validation.

## User case x page evaluation

| User case | Page/path | 5-second purpose | First action | Cognitive load | Priority | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| 처음 들어온 사람 | `/` Home | Clear: content becomes schedule/tasks. | `저장 전 보기` on the representative moving map. | Medium: app frame plus representative card plus start path all appear in first viewport. | Low | Good enough for this loop. No internal terms or old copy found. |
| 급한 문제를 해결하려는 첫 사용자 | `/flows` Flow finding | Clear: saveable execution content catalog. | `저장 전 보기` / `바로 시작`. | Medium: integrated catalog works, 11 map cards + 1 single card. | Low | Keep integrated catalog. No separate curated section needed. |
| 급한 문제를 해결하려는 첫 사용자 | `/flow-maps/moving-d30` Flow Map detail | Clear: one move date becomes D-30/D-Day tasks. | Enter `이사일`, then `전체 저장`. | High: 11 interactive elements and 5 checklist detail blocks are open by default. | High | Step-level checklist content is reviewable, but all open rows make the page feel like a long document before saving. Collapse checklist rows by default and leave a short preview. |
| Flow를 처음 저장한 사람 | `/my?savedMap=moving-d30` post-save | Mostly clear: saved banner plus next dated task. | `먼저 할 일 열기`. | Medium: 13 interactive elements; save confirmation still competes with Today. | Medium | The next action is much clearer than before, but the confirmation banner should stay compact and not become an inventory. Keep as is unless later user evidence says otherwise. |
| Flow를 처음 저장한 사람 | My Flow detail open | Clear: scheduled task and checklist. | Check items or copy/export from collapsed area. | High: 20 visible controls after detail opens, but memo/export are collapsed. | Medium | Acceptable for now because detail is an intentional open state. Export labels are predictable enough. |
| 여러 Flow를 저장한 반복 사용자 | `/my?demo=source-backed` 전체 | Clear enough: saved content list and next item per content. | Open one saved content row. | Medium: compact rows work; progress/next item visible. | Low | Good enough. Keep Today/전체 split. |
| 여러 Flow를 저장한 반복 사용자 | `/calendar` | Clear but repetitive: page heading and card both say calendar. | Pick month/date. | High: 26 visible controls because calendar grid exposes many day buttons. | Medium | Calendar grid is inherently dense, but duplicate `캘린더` heading weakens scanning. Rename the inner heading to a job label such as `월간 일정`. |
| 원문/근거 확인 사용자 | Flow Map source/detail/memo | Source is available. | Open `메모 · 원문`. | Medium: source rows are collapsed, checklist rows are open. | Medium | Source/detail/memo are correctly behind details. Checklist detail should also be progressively revealed. |
| export 사용자 | `/f/moving-d30-basic` export area | Clear: calendar/sheet/checklist outputs exist. | Choose calendar/excel/text or save. | High: scrolled mobile view shows anchor controls, save, three export buttons, and sticky save at once. | High | Remove duplicate mobile save pressure. Sticky bar should route to a single export sheet on export-first routes, while the inline save/export area remains available in the artifact. |

## Prioritized fixes

1. High: In source-backed Flow Map detail, collapse per-step checklist details by default and show a one-line preview so mobile users can scan before expanding.
2. High: On export-first public Flow pages, avoid duplicate `내 Flow에 저장` in the mobile sticky bar. Use the sticky bar to open the export sheet instead.
3. Medium: Rename the calendar workspace heading from duplicate `캘린더` to `월간 일정`.
4. Medium: Fix generated setup hint grammar such as `날짜별 할 일으로` to `날짜별 할 일로`.

## What not to change in this loop

- Keep the 4-tab IA: `홈 / Flow 찾기 / 캘린더 / 내 Flow`.
- Keep 9 curated source maps integrated in `/flows`.
- Do not rework My Flow Today/전체 structure broadly.
- Do not expose internal review/audit language on user surfaces.

## After first implementation pass

Evidence: `output/playwright/ux-full-loop/after/summary.json`, `output/playwright/ux-full-loop/after/sticky-export-check.json`, and screenshots in `output/playwright/ux-full-loop/after/`.

This is still browser QA, not real user validation.

| Area | Before | After | Result |
| --- | --- | --- | --- |
| `/flow-maps/moving-d30` step checklist | 5 step checklist detail blocks were open by default. | 5 checklist detail blocks are collapsed; each step shows one `첫 체크` preview. | Scanning improved without hiding source/memo access. |
| `/flow-maps/moving-d30` setup hint | Generated copy could produce `날짜별 할 일으로`. | First viewport no longer includes that grammar issue. | User-facing setup copy is cleaner. |
| `/calendar` heading | First viewport repeated `캘린더 / 캘린더`. | First viewport reads `캘린더 / 월간 일정`. | Purpose and work area are separated. |
| `/f/moving-d30-basic` mobile sticky action | Sticky bar could duplicate `내 Flow에 저장` while inline save/export buttons were visible. | Sticky bar shows `내 도구로 가져가기`; click opens export sheet with calendar, Excel, text, and edit options. | Export-first route now has one mobile fallback action. |
| `/flows` integrated catalog | 12 content cards were integrated. | DOM check still finds 12 content cards: 11 Flow Map cards and 1 single Flow card. | The 9 curated source contents remain integrated with the existing catalog. |
