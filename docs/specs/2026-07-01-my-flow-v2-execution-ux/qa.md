# My Flow v2 Execution UX QA

This file is updated during implementation and verification.

## Planned Checks

| Check | Status | Evidence |
|---|---|---|
| Planning HTML exists | Passed | `docs/content-audit/2026-07-01-my-flow-v2-execution-ux-plan-ko.html` |
| Screen design HTML exists | Passed | `docs/content-audit/2026-07-01-my-flow-v2-screen-design-ko.html` |
| Simulation report exists | Passed | `docs/content-audit/2026-07-01-my-flow-v2-simulation-report-ko.html` |
| `npm run docs:check` | Passed | Documentation check passed: 14 required files, 1189 local links. |
| `npm test` | Passed | 265 tests passed. |
| `npm run build` | Passed | Next build passed with `/`, `/flows`, `/calendar`, `/my`, `/flow-maps/[map]`, and related routes. |
| Targeted E2E | Passed | 8 post-save/source-backed/My Flow tests passed. |
| Full E2E | Passed | 132 Playwright tests passed. |
| Mobile simulation | Passed | `output/verification/my-flow-v2-mobile-simulation.log`; screenshots: `output/playwright/my-flow-v2-moving-postsave-mobile.png`, `output/playwright/my-flow-v2-moving-today-detail-mobile.png`, `output/playwright/my-flow-v2-math-flow-detail-mobile.png`. |
| Vercel preview | Passed | Latest preview: `https://flowme2605-r06upbypd-flowme.vercel.app` |
| v2.1 Figma draft | Passed | Figma file `https://www.figma.com/design/VFEFBJVBcFN4w2PgJ4Xlf3`; mobile Flow tab changed to compact structure rows. |
| v2.1 mobile Flow tab simulation | Passed | Screenshots: `output/playwright/my-flow-v21-source-backed-flow-mobile.png`, `output/playwright/my-flow-v21-source-backed-flow-detail-mobile.png`, `output/playwright/my-flow-v21-ux12-flow-mobile.png`; page errors: none. |
| v2.1 Figma adoption plan | Passed | `docs/content-audit/2026-07-01-my-flow-v21-figma-adoption-plan-ko.html` records the summary -> Flow row -> inline detail design rule. |
| v2.1 Figma adoption implementation | Passed | Mobile Today next items now use Flow-context cards instead of raw Step rows; mobile Flow tab now separates the saved-structure summary from Flow rows. |
| v2.1 Figma adoption simulation | Passed | Screenshots: `output/playwright/my-flow-v21-figma-adopt-today-mobile.png`, `output/playwright/my-flow-v21-figma-adopt-flow-mobile.png`, `output/playwright/my-flow-v21-figma-adopt-flow-detail-viewport-mobile.png`. |
| v2.1 Figma adoption regression | Passed | `npm run docs:check`, `npm test`, `npm run build`, targeted My Flow E2E 4 tests, and full Playwright E2E 132 tests passed. |
| v2.1 Today simplification plan | Passed | `docs/content-audit/2026-07-01-my-flow-today-v21-simplification-ko.html` records the Today-only rule: primary Flow row first, near-term rows next, overdue/completed as compact secondary rows. |
| v2.1 Today simplification implementation | Passed | Mobile Today hides the raw open-Step card, moves near-term Flow rows directly after `지금 이어하기`, and reduces overdue/completed cards to compact secondary rows. |
| v2.1 Today simplification simulation | Passed | 390px screenshots: `output/playwright/my-flow-today-v21-simplified-mobile-v2.png`, `output/playwright/my-flow-today-v21-simplified-detail-mobile-v2.png`; page errors: none. |
| v2.1 Today simplification regression | Passed | `npm run docs:check` passed with 14 required files and 1192 local links, `npm test` passed 265 tests, `npm run build` passed, targeted My Flow E2E 3 tests passed, and full Playwright E2E 132 tests passed. |
| v2.1 Today simplification preview | Passed | Vercel preview: `https://flowme2605-9oljyukzb-flowme.vercel.app`. |
| v2.1 Flow detail simplification plan | Passed | `docs/content-audit/2026-07-01-my-flow-flow-detail-v21-simplification-ko.html` records the Flow-tab detail rule: Step execution and Item checks first, memo/source/export collapsed behind support rows. |
| v2.1 Flow detail simplification implementation | Passed | Mobile Flow-tab inline detail removes repeated Step preview, places `확인 항목` before memo/date details, and keeps complete/edit/close actions lighter than the checklist. |
| v2.1 Flow detail simplification simulation | Passed | 390px screenshot: `output/playwright/my-flow-flow-detail-v21-simplified-mobile.png`; horizontal overflow: false; console messages: none. |
| v2.1 Flow detail simplification regression | Passed | `npm run docs:check` passed with 14 required files and 1206 local links, `npm test` passed 265 tests, `npm run build` passed, targeted Flow-detail E2E 2 tests passed, My Flow/source-backed E2E 44 tests passed, and full Playwright E2E 132 tests passed. |
| v2.1 Flow detail simplification preview | Passed | Vercel preview: `https://flowme2605-jqbhph0sl-flowme.vercel.app`. |
| v2.1 Today vs Flow role separation plan | Passed | `docs/content-audit/2026-07-01-my-flow-today-flow-role-separation-ko.html` records the tab split: Today is Step-first execution inbox, Flow is Flow-first saved-structure management. |
| v2.1 Today vs Flow role separation implementation | Passed | Mobile Today continuation rows no longer show Flow progress percent bars; they show the actionable Step first with Flow context as secondary metadata. Mobile Flow rows keep Flow title, progress, and next Step preview. |
| v2.1 Today vs Flow role separation simulation | Passed | 390px screenshots: `output/playwright/my-flow-today-flow-separated-today-mobile.png`, `output/playwright/my-flow-today-flow-separated-flow-mobile.png`; horizontal overflow: false; console messages: none. |
| v2.1 Today vs Flow role separation regression | Passed | `npm run docs:check` passed with 14 required files and 1206 local links, `npm test` passed 265 tests, `npm run build` passed, targeted Today/Flow E2E 3 tests passed, My Flow/source-backed E2E 44 tests passed, and full Playwright E2E 132 tests passed. |
| v2.1 Today overflow correction | Passed | Local 390px reproduction initially showed `scrollWidth=411` on Today and `scrollWidth=390` on Flow. Adding `min-w-0` to Today sections and flattening the Today row fixed Today to `scrollWidth=390`; targeted Today/Flow E2E now asserts no horizontal overflow. Screenshots: `output/playwright/issue-local-after-fix-today-viewport.png`, `output/playwright/issue-local-after-fix-flow-viewport.png`. |
| v2.1 Flow tab Step-list correction | Passed | Flow tab now opens a saved Flow into a Step list first. Step detail appears only after the user taps a Step row. Local 390px metrics: Flow closed `detailCount=0`, Flow opened `stepRows=8` and `detailCount=0`, Step tapped `detailCount=1`, all with `scrollWidth=390`. Screenshots: `output/playwright/issue-flow-tab-step-list-flow-closed.png`, `output/playwright/issue-flow-tab-step-list-flow-open.png`, `output/playwright/issue-flow-tab-step-list-step-detail.png`. |
| v2.1 Flow tab long Step preview correction | Passed | Mobile Flow tab now limits an opened Flow's Step list to 5 rows first and shows `전체 Step 보기` for the remainder. Single saved and multi saved states share the same Flow summary + Flow row shell. Local 390px metrics: single limited `stepRows=5`, show-all `1`, full expansion `stepRows=24`, horizontal overflow `false`; multi limited `stepRows=5`, show-all `1`, horizontal overflow `false`. Browser plugin setup failed with `failed to write kernel assets`, so screenshots were captured through Playwright fallback in `%TEMP%/flowme-myflow-qa/`. |
| v2.1 Flow tab open-state density correction | Passed | Mobile `/my?demo=ux12` now hides the repeated workspace heading, compresses the Flow summary into one slim row, and removes the collapsed next-Step preview while a Flow row is open. Local 390px metrics: Today `overflow=false`, Flow `overflow=false`, opened Flow `openButtonHasStepCount=false`, `stepRows=5`, `detailCount=0`. Browser plugin setup failed again with `failed to write kernel assets`, so rendered validation used Playwright fallback. |
| v2.1 Mobile Step detail copy correction | Passed | Mobile Step detail now hides internal `Step 실행`/`Item` wording, removes generic `수정` from the primary action row, and places `메모/일정 수정` inside the collapsed `메모·일정` support row. Targeted E2E for source-backed progress detail and Today inline editing passed after RED failure. |
| v2.1 Today future queue and no-checklist Step hint | Passed | Today now labels future-only work as `다음 할 일` and the primary card as `다음 실행 Step`. Empty-checklist Step detail uses `실행할 일` and exposes one visible `바로 할 일` hint before collapsed `메모·일정` / `원문·복사`. Targeted mobile E2E covered Today and Flow-tab Step detail after RED failure. |
| v2.1 all-tab session handoff | Passed | 390px mobile review covered Home, Flow finding, public Flow detail, Calendar, My Flow Today, Today detail, My Flow Flow, Flow open, and Step detail. No horizontal overflow or JS errors were found in the reviewed states. Handoff: `docs/content-audit/2026-07-02-my-flow-v21-session-handoff-ko.html`; next-session goal: `docs/content-audit/2026-07-02-next-session-goal-service-readiness.md`. |
| v2.1 Today vs Flow role separation preview | Passed | Vercel preview: `https://flowme2605-r06upbypd-flowme.vercel.app`. |

## Notes

- Automated QA is not user-behavior validation.
- Preview deployment is review evidence, not proof that real users understand the flow.
- Date-bearing saved content opens the normal Today inline detail after saving.
- Date-less single progress content opens the normal Flow inline detail after saving.
- The post-save banner no longer renders a mini inventory or its own Step detail.
- v2.1 keeps the Flow tab as saved-structure management: mobile renders compact Flow rows, limits large lists before opening the inventory sheet, and keeps Step detail inline without filtering away the surrounding Flow list.
- v2.1 Figma adoption removes the raw mobile Step list from the Today continuation area and reuses the same Flow-context row language for near-term items.
- v2.1 Today simplification lowers the remaining demo-only status cards: overdue and completed items stay accessible, but they no longer compete with the primary continuation row. Remaining visual debt: the `/my` page header and demo summary still consume meaningful first-viewport height on mobile.
- v2.1 Flow detail simplification keeps expanded Flow rows closer to a todo/checklist detail: visible checklist first, memo/source/export only when the user asks for support information.
- v2.1 Today vs Flow role separation keeps the shared row/detail pattern but changes the visible hierarchy: Today says "what to execute now"; Flow says "what saved structure exists and how far it progressed."
- v2.1 Flow tab correction adds one more guardrail: opening a Flow row shows its Step list first; Step detail is a second action from a specific Step row, so Flow no longer behaves like the Today tab.
- v2.1 long Step preview correction keeps Flow as the saved-structure tab without making a 24-Step Flow dump the entire list into the first opened mobile card. Full structure remains available through an explicit `전체 Step 보기` action.
- v2.1 Flow open-state density correction removes the open-state next-Step preview because the Step list already provides that information. The Flow summary remains available, but it is a lightweight status row rather than a dashboard card.
- v2.1 Mobile Step detail copy correction keeps the primary detail surface closer to a calendar/todo item: completion and checklist first, or one source-backed `바로 할 일` hint when no checklist exists, with memo/source/export/edit behind support rows.
