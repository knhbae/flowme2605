# Post-save Execution UX QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| 2026-06-30 continuation planning HTML exists | Passed | `docs/content-audit/2026-06-30-my-flow-continuation-dashboard-plan-ko.html` |
| Planning HTML exists | Passed | `docs/content-audit/2026-06-29-post-save-execution-ux-plan-ko.html` |
| Clickable wireframe HTML exists | Passed | `docs/content-audit/2026-06-29-post-save-execution-ux-wireframe-ko.html` |
| Spec package exists | Passed | `docs/specs/2026-06-29-post-save-execution-ux/` |
| Planning-before-code order | Passed | Planning HTML, wireframe, and spec were created before the P0/P1 product-code pass. |
| `npm run docs:check` | Passed | 14 required files, 1181 local links. Log: `output/verification/post-save-docs-check.log`. |
| `npm test` | Passed | 263 tests passed. Log: `output/verification/post-save-npm-test.log`. |
| `npm run build` | Passed | Next build passed with `/calendar`, `/flows`, `/my`, and `/flow-maps/[map]` routes. Log: `output/verification/post-save-build.log`. |
| Targeted E2E | Passed | 11 post-save/source-backed/My Flow tests passed. Log: `output/verification/post-save-targeted-e2e.log`. |
| Full E2E | Passed | 132 tests passed. Log: `output/verification/post-save-full-e2e.log`. |
| Mobile implementation simulation | Passed | `/flows`, `/flow-maps/moving-d30`, post-save `/my`, and `/calendar?demo=source-backed` checked at 390px. Log: `output/verification/post-save-mobile-simulation.log`. |
| Vercel preview deploy | Passed | Preview: `https://flowme2605-6f809bggz-flowme.vercel.app`. Log: `output/verification/post-save-vercel-deploy.log`. |
| 2026-06-30 `npm run docs:check` | Passed | 14 required files, 1182 local links. |
| 2026-06-30 `npm test` | Passed | 263 tests passed. |
| 2026-06-30 `npm run build` | Passed | Next build passed with `/my`, `/calendar`, `/flows`, and `/flow-maps/[map]` routes. |
| 2026-06-30 targeted My Flow mobile E2E | Passed | 8 tests passed for `my flow mobile|my flow management tabs`. |
| 2026-06-30 full E2E | Passed | 132 tests passed after updating the UX12 summary expectation from `데모 오늘` to `데모 기준일`. |
| 2026-06-30 single saved Flow mobile simulation | Passed | `지금 이어하기` visible, empty today list hidden, `전체 Step 보기` opens Flow overview. |
| 2026-06-30 Vercel preview deploy | Passed | Preview: `https://flowme2605-5ml3afk66-flowme.vercel.app`. Vercel build passed. |

| 2026-06-30 local-tab planning HTML exists | Passed | `docs/content-audit/2026-06-30-my-flow-local-tabs-and-flow-structure-plan-ko.html` |
| 2026-06-30 local-tab `npm run docs:check` | Passed | 14 required files, 1184 local links. |
| 2026-06-30 local-tab `npm test` | Passed | 263 tests passed. |
| 2026-06-30 local-tab `npm run build` | Passed | Next build passed with `/my`, `/calendar`, `/flows`, and `/flow-maps/[map]` routes. |
| 2026-06-30 local-tab targeted My Flow/source-backed E2E | Passed | 39 tests passed for `my flow|source-backed middle-school map`. |
| 2026-06-30 local-tab full E2E | Passed | 132 tests passed after removing `/my` local calendar expectations and moving dated execution checks to `/calendar`. |
| 2026-06-30 local-tab Vercel preview deploy | Passed | Preview: `https://flowme2605-f5le6rnsk-flowme.vercel.app`. Vercel build passed. |
| 2026-06-30 unified-shell planning HTML exists | Passed | `docs/content-audit/2026-06-30-my-flow-execution-ux-redesign-plan-ko.html` |
| 2026-06-30 unified-shell `npm run docs:check` | Passed | 14 required files, 1186 local links. |
| 2026-06-30 unified-shell `npm test` | Passed | 265 tests passed. |
| 2026-06-30 unified-shell `npm run build` | Passed | Next build passed with `/`, `/flows`, `/calendar`, `/my`, `/flow-maps/[map]`, and `/f/[slug]` routes. |
| 2026-06-30 unified-shell targeted E2E | Passed | 6 tests passed for `4-tab IA`, source-backed save, inventory hide/restore, single saved Flow mobile shell, mobile status board, and promoted service routes. |
| 2026-06-30 unified-shell full E2E | Passed | 132 tests passed. |
| 2026-06-30 unified-shell mobile simulation | Passed | 390px screenshots captured for `/my?demo=source-backed` Today/Flow, `/calendar?demo=source-backed`, and `/f/jeonse-contract-precheck-docs`; console warnings/errors: 0. Log: `output/playwright/my-flow-unified-shell-mobile-simulation-260630.log`. |
| 2026-06-30 unified-shell Vercel preview deploy | Passed | Preview: `https://flowme2605-jm6gzh3xf-flowme.vercel.app`. Vercel build passed. |

## Screenshots

- `output/playwright/post-save-execution-wireframe-mobile.png`
- `output/playwright/post-save-implementation-flows-mobile.png`
- `output/playwright/post-save-implementation-public-detail-mobile.png`
- `output/playwright/post-save-implementation-my-flow-mobile.png`
- `output/playwright/post-save-implementation-calendar-mobile.png`
- `output/playwright/my-flow-continuation-mobile-v2.png`
- `output/playwright/my-flow-continuation-full-steps-mobile-v2.png`
- `output/playwright/my-flow-unified-shell-today-mobile-260630.png`
- `output/playwright/my-flow-unified-shell-flow-mobile-260630.png`
- `output/playwright/my-flow-unified-shell-calendar-mobile-260630.png`
- `output/playwright/jeonse-calendar-preview-dplus-mobile-260630.png`

## UX Decisions Verified

- `내 Flow` keeps the page-local visible model to `오늘` and `Flow`; the global app frame remains Home / Flow 찾기 / 캘린더 / 내 Flow.
- Step base cards stay compact. Title, date, section, source, and completion are visible; memo/date/repeat edits open through explicit detail/edit state.
- Calendar selected-date content stays near the calendar on mobile and did not create horizontal overflow in the 390px check.
- Public Flow Map detail uses a mobile sticky save CTA and collapses detailed Step items before saving.
- Flow finding avoids the older `바로 실행 Flow` label and uses lighter user-facing labels such as `하나만 저장`.
- The single saved Flow mobile screen now opens as a continuation dashboard: `지금 이어하기` shows the first actionable Step, `오늘` empty state is not rendered as the main card, and `전체 Step 보기` is the path to the full Flow/checklist structure.

- The 2026-06-30 local-tab follow-up removes `캘린더` from `/my` page-local tabs. Global `캘린더` owns date-first execution, while `/my` keeps `오늘` and `Flow` as the saved-work continuation and structure views.
- The `/my` mobile Flow view now starts with compact Flow rows showing progress and the next Step, and opens the full saved Flow list only on demand.
- The 2026-06-30 unified-shell follow-up keeps single saved Flow and many saved Flows on the same `/my` page-local `오늘 / Flow` shell. The post-save state is a light banner over the normal workspace, global `캘린더` owns date-first execution, Flow cards show the next Step before full inventory, and mobile-only list-management actions stay hidden from the default review path.
- The jeonse public route now shows the D-3 / D-Day / D+1 generated schedule as a row list below the month preview so D+1 remains visible even when it crosses into the next month.

## Review Notes

- This is browser/automated QA, not real user validation.
- Legacy internal checklist/routine detail tests were updated to the current IA instead of preserving hidden tabs as user-facing requirements.
- Remaining polish is intentionally deferred: service home identity, richer content trust signals, and creator publish-gate depth belong to later specs.
- If real users still expect full checklist first, reopen the default My Flow landing order. For now the product rule is continuation first, full checklist on demand.
