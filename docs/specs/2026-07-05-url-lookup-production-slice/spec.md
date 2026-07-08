# URL Lookup Production Slice Spec

**Date:** 2026-07-05
**Status:** Implemented locally
**Owner:** Codex
**Related roadmap:** [URL-first decisions](../../DECISIONS.md) and [service structure](../../SERVICE_STRUCTURE.md)

## Goal

`/flows` should let a user paste a source URL, find an existing converted Flow first, and continue into preview, export, or My Flow without making Home, AI generation, or memo planning the first public entry.

## Stage Fit

This belongs in Stage 0 because it strengthens the smallest path from outside content to action: source URL -> existing Flow lookup -> portable artifact preview -> save/export/check. It must not expand into a full crawler, AI-first generator, account integration, creator marketplace, or full editor in this slice.

## User Need

As a user who just found a useful blog, video, official guide, or checklist, I need to paste the source URL and see whether FlowMe already has an actionable version, so that I can reuse it, export it, or save it instead of copying the plan by hand.

## Scope

In:
- Add a production URL lookup entry to the top of `/flows`.
- Reuse `lib/flow/url-first-lookup.ts` for canonicalization and lookup states.
- Show `hit`, `needs_review`, and `miss` result states with user-facing copy.
- Support at least three source-backed canary URL hits.
- Let a `hit` result continue to the existing Flow detail route and show export/My Flow expectations.
- Let a `hit` result start directly from the lookup result by selecting a start date and one export option.
- Let a `hit` result choose between direct start and a lightweight customized start before saving.
- In lightweight customized start, allow only a personal saved title and Step include/exclude selection.
- Save started `hit` results into the existing My Flow local persistence path.
- Save customized starts as a personal My Flow copy by writing customized saved-map snapshot, persistence record, and excluded-Step item state without changing the original source-backed Flow.
- In My Flow, show the customized start as the user's personal saved copy, keep the personal saved title, keep excluded Steps out of the default execution list, and preserve personal selections when source-backed map updates are applied.
- In My Flow, let the user lightly readjust a personal saved copy by changing only the saved title, start date, and included/excluded Steps.
- In My Flow, let a personal-copy Step detail export the current Step as memo/Markdown text, checklist text, dated calendar `.ics`, and sheet-row TSV based on the personal copy state while retaining original source traceability.
- Let `miss` and `needs_review` URL lookup results save a local Flow production candidate request keyed by canonical URL, without AI generation or crawling.
- Show the user's requested production candidates inside `/flows` and keep them visually separate from executable Flow hits.
- Let users revisit and manage local production candidates by opening the original URL, re-running the canonical URL lookup, editing the title/memo, or deleting the local request.
- If a saved production candidate's canonical URL later resolves to an executable `hit`, show it as `이제 실행 가능` and let the user move directly into the hit result/start flow.
- Let each saved production candidate expose `제작용 정보 보기` with canonical URL, original URL, user title/memo, current status, last re-query result, and a minimal manual conversion checklist.
- Let users copy a `제작용 Markdown` handoff for a candidate so a human can later move it into Flow seed/content work without AI generation, crawling, or automatic source extraction.
- When a production candidate is already resolved to an executable hit, keep `Flow 결과로 이동` as the primary path and show that new production is lower priority than starting the existing Flow.
- Define the minimal manual operating loop from copied production Markdown to human-authored source-backed Flow seed/content, then back to URL lookup hit.
- Register direct-route-enabled, non-rejected source-backed Flow maps as URL lookup hits so a previously saved candidate becomes executable when matching source-backed content exists.
- Verify one manual registration sample with candidate URL/memo, sourceTrace/source URL, Step split, date/repeat rule, and risk/execution-blocker judgment.
- Define a repeatable manual registration checklist for human-authored source-backed Flow additions: canonical URL, original/source URL, sourceTrace, Step split, date/relative/repeat rules, risk/execution blockers, and quality decision.
- Add QA coverage that catches common manual source-backed registration mistakes before they become URL lookup hits: duplicate canonical URL, missing sourceTrace, empty Step list, and missing source URL.
- Lock URL lookup inclusion to source-backed maps that have a source URL, keep `directRouteEnabled`, and are not `reject`.
- Produce an operator-facing manual registration QA report that turns the readiness helper output into lookup-ready, registration-hold, issue summary, runbook, and sample rehearsal sections.
- Classify duplicate canonical URL groups in the manual registration QA report by likely cause and show an operator action instead of treating every duplicate as the same raw error.
- Keep one default URL lookup hit per canonical URL unless the source URL is narrowed, the maps are merged, or a secondary map is explicitly held out of lookup with `directRouteEnabled=false`.
- Provide at least one real portable export action from the lookup result before direct integrations.
- Reflect the customized saved title and included Steps in the Markdown export.
- Keep AI generation disabled in P0 and explain that miss URLs can be collected/requested later.
- Preserve the current 4-tab IA and `/flows` catalog below the lookup entry.

Out:
- No Home redesign.
- No direct AI generation UI.
- No full Flow editor or fork/version graph.
- No editing of original source-backed Flow content.
- No Obsidian/Notion/Google OAuth integration.
- No external calendar or todo OAuth/write integration.
- No memo-to-Flow production entry.
- No fake saved counts, reviews, usage counts, or validation claims.
- No AI generation, crawling, admin approval workflow, account/server persistence, public request counts, creator notification, or source-owner comment automation for production candidate requests.
- No automatic Flow seed/content generation from production candidate rows.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Paste a source URL in `/flows`. |
| Completion signal | A result sheet appears with one primary next action: start an existing Flow, open a preview-only source check, or request/park a missing URL. |
| Artifact destination | Hit results can save to My Flow with a selected start date, optionally save a lightweight personal copy, and can download a portable Markdown export; direct account integrations remain out of scope. |
| Source/risk boundary | Source title, checked date, and needs-review gates stay separate from user-facing promise copy. |
| Natural artifact | Dated schedule, checklist, progress table, or memo-ready Markdown derived from the existing Flow map. |
| Verification | Unit tests for lookup states, E2E for `/flows` URL entry, mobile overflow QA, `npm.cmd run docs:check`, `npm test`, and `npm.cmd run build`. |

## Build Gate Note

- The standard Windows production build gate remains `npm.cmd run build`.
- The committed `build` script runs direct `next build`. The local build stability baseline is `next.config.ts` with `typescript.tsconfigPath=./tsconfig.next.json`; keep the default webpack build worker enabled for this Next 15.3.8 baseline.
- `scripts/build-next.mjs` was evaluated as a cleanup/retry wrapper for stale `.next` artifact failures, but it is not part of the committed verification gate for this slice. Keep it out of the standard build path until repeated clean/direct builds fail for a reproducible reason that the wrapper fixes.
- If a future local build fails after interrupted runs, first stop stale build processes, remove only the repo-local `.next` directory, and rerun `npm.cmd run build`. Treat any wrapper reintroduction as a separate build-stabilization change with fresh evidence.

## Acceptance Criteria

- `/flows` renders a URL lookup entry above the catalog and keeps the catalog visible below it.
- Entering the AJD moving checklist URL returns a `hit` result linked to `/flow-maps/curated-ajd-moving-d30`.
- Entering the Mathbang middle-school math URL returns a `hit` result linked to `/flow-maps/middle-school-math-1`.
- Entering the Naver wedding timeline canary URL returns a `hit` result linked to `/flow-maps/curated-wedding-checklist-family`.
- Entering `https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share` returns `needs_review`, blocks save/export, and links to preview-only detail.
- Entering an unknown URL returns `miss`, keeps AI generation disabled, and does not claim an existing Flow.
- `miss` results expose a `제작 후보로 저장` action that saves only canonical URL, original URL, title, memo, request status, and saved date.
- `needs_review` results expose the same production-candidate save path with `needs_review_request` status while still blocking My Flow start/export.
- Saving the same canonical URL twice does not create another candidate; `/flows` shows the existing requested candidate instead.
- `/flows` shows the user's requested candidates separately from executable Flow hits, with copy that says they are not yet executable Flows.
- Requested candidate cards show meaningful local states: `제작 대기`, `원문 확인 대기`, or `이제 실행 가능`.
- Requested candidate cards provide `원 URL 열기`, `다시 조회`, `제목/메모 수정`, and `삭제` actions.
- Editing a requested candidate changes only title and memo while preserving canonical URL, original URL, request status, and saved date.
- Deleting a requested candidate removes only the local request row and does not affect any Flow catalog, source-backed data, or My Flow record.
- If a requested candidate's canonical URL now resolves to an executable `hit`, the card shows `이제 실행 가능` and `Flow 결과로 이동` populates the URL lookup hit result with normal start/export controls.
- Requested candidate cards provide `제작용 정보 보기` without making the candidate executable.
- The production handoff panel shows canonical URL, original URL, user title/memo, current status, last re-query result, and saved request status.
- The production handoff panel includes a manual checklist for plan/procedure fit, date/repeat cues, Step split, sourceTrace/source evidence, and execution/risk blockers.
- `제작용 Markdown 복사` writes a Markdown handoff containing only stored request information, lookup status, and the manual checklist; it does not call AI, crawl the source, or create seed data.
- Resolved-hit candidates still prioritize `Flow 결과로 이동`; the production handoff says the existing hit start flow should be used before making a duplicate Flow.
- A human Flow maker can use the production Markdown as an operating brief, inspect the source manually, add source-backed seed/content with source traceability, and keep any unsafe or execution-impossible rows out of the registered Flow.
- A source-backed Flow map is URL-lookupable when it has a source URL, its quality decision keeps `directRouteEnabled`, and its quality status is not `reject`.
- The Samsung service aircon filter cleaning sample URL `https://www.samsungsvc.co.kr/solution/28524` resolves to `/flow-maps/aircon-filter-cleaning` after manual source-backed registration.
- A local candidate saved for the same canonical Samsung service URL changes from production wait to executable on current lookup and can move through `Flow 결과로 이동` into start/export/My Flow save.
- The sample preserves a single routine Step with a 2-week repeat rule and source traceability; no AI generation, crawling, or automatic seed creation is involved.
- A human Flow maker can run the manual registration checklist before adding a new source-backed Flow and see the required fields/decisions in one place.
- Registration QA fails if two lookupable source-backed maps share the same canonical source URL.
- Registration QA fails if a lookupable source-backed map has no executable Step, no source URL, or Step details without sourceTrace evidence.
- A `reject` source-backed map remains absent from URL lookup hit results even when source-backed seed/content and source URL exist.
- The manual registration QA report shows current source-backed Flow totals, lookup eligibility, registration holds, duplicate URL/sourceTrace/empty Step/sourceUrl issue counts, and a candidate Markdown -> source-backed registration -> QA -> URL hit runbook.
- The report rehearses one real sample candidate and clearly states whether the sample is QA-passing or still needs sourceTrace/duplicate URL repair before repeatable registration.
- `aircon-filter-cleaning` is the first repaired QA-pass sample: its Samsung service source URL still resolves as a URL hit, its single 2-week routine Step has sourceTrace evidence, and the generated report shows it with no manual registration issue codes.
- Duplicate canonical URL issues are shown by canonical URL group with likely cause, primary default-hit candidate, secondary map candidates, and an operator action.
- Duplicate group causes include actual duplicate Flow Maps, broad shared source URL, normal multi-Flow-from-one-source cases, and canonicalization that is too broad or too narrow.
- URL lookup policy allows only one default hit Flow Map per canonical URL until the group has an explicit product choice; secondary maps should be merged, moved to a more specific source URL, or held with `directRouteEnabled=false`.
- The first duplicate repair holds `funmom-study-routine-map` out of URL lookup while keeping it directly publishable, because it shares a broad `funmom.tistory.com` canonical URL with the stronger `curated-funmom-learning-park` candidate.
- The second duplicate repair holds `opic-plan-map` out of URL lookup while keeping it directly publishable, because it shares the same source URL and 2-week/1-month execution shape with the stronger `curated-opic-mock-course` candidate.
- The third duplicate repair holds `new-car-map` out of URL lookup while keeping it directly publishable, because it shares the same Getcha source URL and 7-step purchase shape with the stronger `curated-new-car-purchase-guide` candidate.
- The fourth duplicate repair holds `homefit-map` out of URL lookup while keeping it directly publishable, because it shares the broad Allblanc YouTube channel URL with the stronger `curated-allblanc-workout-park` exact-video candidate.
- Allblanc channel lookup canonicalizes `www.youtube.com/@allblanctv` to `youtube.com/@allblanctv` and resolves the broad source URL to `/flow-maps/curated-allblanc-workout-park`.
- The fifth duplicate repair holds `moving-map` out of URL lookup while keeping it directly publishable, because it shares the same AJD moving source URL and D-day checklist job with the stronger `curated-ajd-moving-d30` candidate.
- AJD moving checklist lookup resolves to `/flow-maps/curated-ajd-moving-d30`; existing direct routes such as `/flow-maps/moving-map`, `/flow-maps/moving-d30`, and `/restart/moving-d30` remain available when opened directly.
- After the fifth duplicate repair, the generated report shows 19 lookup-eligible maps, 18 registration holds, 7 lookup-blocked maps, and 4 duplicate canonical URL groups covering 8 lookupable maps.
- The sixth duplicate repair holds `vaccination-map` out of URL lookup while keeping it directly publishable, because it shares the same official KHMS child-vaccination source URL and medical-sensitive schedule job with the stronger `curated-child-vaccination-schedule` candidate.
- KHMS child vaccination lookup resolves to `/flow-maps/curated-child-vaccination-schedule`; the representative keeps the official KHMS source URL, birth-date setup, `review_before_apply` update handling, and medical-sensitive execution rows, while `/flow-maps/vaccination-map` remains available only by direct access. This duplicate repair does not claim full registration QA pass yet because the representative still has separate sourceTrace completion work.
- After the sixth duplicate repair, the generated report shows 18 lookup-eligible maps, 17 registration holds, 8 lookup-blocked maps, and 3 duplicate canonical URL groups covering 6 lookupable maps.
- The seventh duplicate repair holds `curated-baby-food-meal-log` out of URL lookup while keeping it directly publishable, because it shares the same Naver baby-food source URL with `baby-food-map` but still has separate sourceTrace completion work.
- Naver baby-food lookup resolves to `/flow-maps/baby-food-map`; this representative keeps the source-traced app-seed structure with 5 child Flows, 21 medical-sensitive execution Steps, start-date setup, and zero missing sourceTrace Steps. `/flow-maps/curated-baby-food-meal-log` remains available only by direct access/review until its sourceTrace rows are completed or merged.
- After the seventh duplicate repair, the generated report shows 17 lookup-eligible maps, 2 QA-pass maps, 15 registration holds, 9 lookup-blocked maps, and 2 duplicate canonical URL groups covering 4 lookupable maps.
- The eighth duplicate repair holds `reading-routine-map` out of URL lookup while keeping it directly publishable, because it shares the same Naver reading source URL with the stronger `curated-reading-routine-log` monthly execution candidate.
- Naver reading lookup resolves to `/flow-maps/curated-reading-routine-log`; the representative keeps `real` source status, a higher product score, an 8-Step monthly reading routine, and save/export eligibility. `/flow-maps/reading-routine-map` remains available only by direct access/review. This duplicate repair does not claim full registration QA pass yet because the representative still has separate sourceTrace completion work.
- After the eighth duplicate repair, the generated report shows 16 lookup-eligible maps, 2 QA-pass maps, 14 registration holds, 10 lookup-blocked maps, and 1 duplicate canonical URL group covering 2 lookupable maps.
- The ninth duplicate repair holds `wedding-map` out of URL lookup while keeping it directly publishable, because it shares the same Naver wedding source URL with the stronger `curated-wedding-checklist-family` family map.
- Naver wedding lookup resolves to `/flow-maps/curated-wedding-checklist-family`; the representative keeps the two-child timeline/checklist structure, a higher product score, 10 executable wedding Steps, and a wedding-date setup path. `/flow-maps/wedding-map` remains available only by direct access/review. This duplicate repair does not claim full registration QA pass yet because the representative still has separate sourceTrace completion work.
- After the ninth duplicate repair, the generated report shows 15 lookup-eligible maps, 2 QA-pass maps, 13 registration holds, 11 lookup-blocked maps, and 0 duplicate canonical URL groups covering 0 lookupable maps.
- The manual registration QA report now includes a `sourceTrace remediation queue` sorted by lookup representative status, productScore, user-start quality status, Step count, risk level, and sourceTrace remediation effort so operators can choose the next manual proofing target without re-reading every row.
- The first sourceTrace queue repair promotes `curated-reading-routine-log` to QA-pass by adding sourceTrace evidence to all 8 executable reading Steps from the existing Naver reading source URL. This repair uses the existing source-backed seed and does not crawl, AI-generate, or broaden the content.
- After the first sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 3 QA-pass maps, 12 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 12 remaining sourceTrace issue maps covering 97 Steps.
- The second sourceTrace queue repair promotes `moving-d30` to QA-pass by adding sourceTrace evidence to all 5 executable D-day moving Steps from its existing AJD moving checklist source URL. This does not change the earlier duplicate policy: `moving-map` stays out of URL lookup, the AJD curated URL still resolves to `/flow-maps/curated-ajd-moving-d30`, and `moving-d30` remains the homepage/source-backed representative for its own registered source URL.
- After the second sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 4 QA-pass maps, 11 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 11 remaining sourceTrace issue maps covering 92 Steps. The next sourceTrace queue item is `curated-ajd-moving-d30`.
- The third sourceTrace queue repair promotes `curated-ajd-moving-d30` to QA-pass by adding sourceTrace evidence to all 5 executable curated AJD moving Steps from the existing encoded AJD moving checklist source URL. URL representative policy stays unchanged: the encoded AJD source resolves to `/flow-maps/curated-ajd-moving-d30`, `moving-d30` stays QA-pass for its own registered source-backed route, and `moving-map` stays `directRouteEnabled=false`.
- After the third sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 5 QA-pass maps, 10 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 10 remaining sourceTrace issue maps covering 87 Steps. The next sourceTrace queue item is `curated-new-car-purchase-guide`.
- The fourth sourceTrace queue repair promotes `curated-new-car-purchase-guide` to QA-pass by adding sourceTrace evidence to all 7 executable Getcha new-car purchase Steps from the existing Getcha source URL. URL representative policy stays unchanged: the Getcha new-car source resolves to `/flow-maps/curated-new-car-purchase-guide`, `new-car-map` stays `directRouteEnabled=false`, and no financial advice or recommendation content is added.
- After the fourth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 6 QA-pass maps, 9 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 9 remaining sourceTrace issue maps covering 80 Steps. The next sourceTrace queue item is `middle-school-math-1`.
- The fifth sourceTrace queue repair promotes `middle-school-math-1` to QA-pass by adding sourceTrace evidence to all 8 executable Mathbang middle-school math table-of-contents Steps from the existing Mathbang source URL. URL representative policy stays unchanged: the Mathbang middle-school math URL resolves to `/flow-maps/middle-school-math-1`, duplicate canonical URL groups stay at 0, and no math explanation, study advice, or Step content rewrite is added.
- After the fifth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 7 QA-pass maps, 8 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 8 remaining sourceTrace issue maps covering 72 Steps. The next sourceTrace queue item is `curated-opic-mock-course`.
- The sixth sourceTrace queue repair promotes `curated-opic-mock-course` to QA-pass by adding sourceTrace evidence to all 19 executable Mansour OPIC workbook rows from the existing Mansour source URL: 14 `curated-opic-single-mock-review` Steps and 5 `curated-opic-course-row-import` Steps. URL representative policy stays unchanged: the Mansour OPIC source resolves to `/flow-maps/curated-opic-mock-course`, `opic-plan-map` stays `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and no OPIC study advice, explanation, Step rewrite, merge, or deletion is added.
- After the sixth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 8 QA-pass maps, 7 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 7 remaining sourceTrace issue maps covering 53 Steps. The next sourceTrace queue item is `curated-wedding-checklist-family`.
- The seventh sourceTrace queue repair promotes `curated-wedding-checklist-family` to QA-pass by adding sourceTrace evidence to all 10 executable wedding Steps from the existing Naver and Gongysd source URLs: 6 `curated-wedding-naver-timeline` Steps and 4 `curated-wedding-gongysd-atoz` Steps. Each child Flow keeps its own source URL context, so Naver timeline rows do not cite the Gongysd A-to-Z source and Gongysd rows do not cite the Naver timeline source.
- After the seventh sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 9 QA-pass maps, 6 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 6 remaining sourceTrace issue maps covering 43 Steps. URL representative policy stays unchanged: the Naver wedding source resolves to `/flow-maps/curated-wedding-checklist-family`, `wedding-map` stays `directRouteEnabled=false`, and the next sourceTrace queue item is `curated-allblanc-workout-park`.
- The eighth sourceTrace queue repair promotes `curated-allblanc-workout-park` to QA-pass by adding sourceTrace evidence to all 3 executable Allblanc exact-video Steps: 1 `curated-allblanc-morning-workout` Step, 1 `curated-allblanc-no-jump-cardio` Step, and 1 `curated-allblanc-lower-body` Step. This repair only ties each Step to its existing exact video URL and row id; it does not add exercise posture, health advice, movement sequences, Step rewrites, or Allblanc map merge/delete work.
- After the eighth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 10 QA-pass maps, 5 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 5 remaining sourceTrace issue maps covering 40 Steps. URL representative policy stays unchanged: the Allblanc channel source resolves to `/flow-maps/curated-allblanc-workout-park`, `homefit-map` stays `directRouteEnabled=false`, and the next sourceTrace queue item is `curated-child-vaccination-schedule`.
- The ninth sourceTrace queue repair promotes `curated-child-vaccination-schedule` to QA-pass by adding sourceTrace evidence to all 10 executable official KHMS child vaccination Steps: 6 `curated-child-vaccination-first-year` Steps and 4 `curated-child-vaccination-booster-school-age` Steps. This repair only ties each Step to the existing KHMS official source URL and row id; it does not add vaccination or medical advice, reinterpret official schedules, rewrite Steps, or merge/delete vaccination maps.
- After the ninth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 11 QA-pass maps, 4 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 4 remaining sourceTrace issue maps covering 30 Steps. URL representative policy stays unchanged: the KHMS child vaccination source resolves to `/flow-maps/curated-child-vaccination-schedule`, `vaccination-map` stays `directRouteEnabled=false`, the representative keeps `review_before_apply`, and the next sourceTrace queue item is `baby-health-schedule`.
- The tenth sourceTrace queue repair promotes `baby-health-schedule` to QA-pass by adding sourceTrace evidence to all 18 executable official baby health Steps: 12 `source-backed-baby-health-checkups` Steps from the existing EasyLaw infant health checkup schedule source and 6 `source-backed-baby-vaccination-schedule` Steps from the existing KDCA vaccination schedule source. This repair only ties each Step to the existing official source URL and row id; it does not add medical/parenting advice, reinterpret official schedules, rewrite Steps, merge/delete baby-health maps, or change URL lookup representative policy.
- After the tenth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 12 QA-pass maps, 3 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 3 remaining sourceTrace issue maps covering 12 Steps. URL representative policy stays unchanged: the EasyLaw baby-health source resolves to `/flow-maps/baby-health-schedule`, the representative keeps `review_before_apply`, and the next sourceTrace queue item is `curated-funmom-learning-park`.
- The eleventh sourceTrace queue repair promotes `curated-funmom-learning-park` to QA-pass by adding sourceTrace evidence to all 6 executable weekly Funmom category-picker Steps from the existing Funmom source URL. This repair only ties each Step to the existing broad category park URL and row id; it does not add study advice, curriculum interpretation, Step rewrites, Funmom map merge/delete work, or change URL lookup representative policy.
- After the eleventh sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 13 QA-pass maps, 2 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 2 remaining sourceTrace issue maps covering 6 Steps. URL representative policy stays unchanged: the Funmom source resolves to `/flow-maps/curated-funmom-learning-park`, `funmom-study-routine-map` stays `directRouteEnabled=false`, and the next sourceTrace queue item is `postal-address-transfer`.
- The twelfth sourceTrace queue repair promotes `postal-address-transfer` to QA-pass by adding sourceTrace evidence to all 3 executable Korea Post address-transfer Steps from the existing ePost source URL: `postal-next-day-check`, `postal-payment-deadline`, and `postal-service-start`. This repair only ties each Step to the existing source URL and row id; it does not add administrative advice, postal-service usage advice, legal interpretation, Step rewrites, or postal map merge/delete work.
- After the twelfth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 14 QA-pass maps, 1 registration hold, 11 lookup-blocked maps, 0 duplicate canonical URL groups, and 1 remaining sourceTrace issue map covering 3 Steps. URL representative policy stays unchanged: the ePost postal address-transfer source resolves to `/flow-maps/postal-address-transfer`, duplicate canonical URL groups stay at 0, and the next sourceTrace queue item is `year-end-tax-submit`.
- The thirteenth sourceTrace queue repair promotes `year-end-tax-submit` to QA-pass by adding sourceTrace evidence to all 3 executable official NTS year-end tax submission Steps from the existing NTS source URL: `tax-login-months`, `tax-submit-employer`, and `tax-submit-confirm`. This repair only ties each Step to the existing official source URL and row id; it does not add tax advice, deduction advice, financial advice, legal interpretation, Step rewrites, or year-end-tax map merge/delete work.
- After the thirteenth sourceTrace queue repair, the generated report shows 15 lookup-eligible maps, 15 QA-pass maps, 0 registration holds, 11 lookup-blocked maps, 0 duplicate canonical URL groups, 0 sourceTrace issue maps, and an empty sourceTrace remediation queue. URL representative policy stays unchanged: the NTS year-end tax source resolves to `/flow-maps/year-end-tax-submit`, duplicate canonical URL groups stay at 0, and no remaining source-backed lookup representative is blocked by missing sourceTrace.
- The result sheet exposes export expectations for hit results without adding direct account integrations.
- Hit results expose a start date field, one export option selector, a real Markdown download action, and a `시작하기` action.
- `시작하기` writes existing Flow records and the source-backed map snapshot into the current My Flow local persistence path.
- Hit results distinguish `그대로 시작` and `조금 고쳐 시작`.
- `조금 고쳐 시작` exposes only saved title and Step include/exclude controls before save.
- Customized starts write the personal saved title and selected Step count into the source-backed saved-map snapshot and persistence record.
- Customized starts write excluded Step ids into the existing per-Flow item state as `skipped` so the original Flow remains unchanged.
- Customized Markdown export includes the personal saved title and selected Steps, and omits excluded Steps.
- My Flow shows customized starts with the personal saved title and a quiet personal-copy marker while keeping original map/source information traceable.
- My Flow's default execution list uses only included Steps for the personal copy; excluded Steps are either hidden from the active list or shown in a separate excluded section.
- My Flow Step detail portable text regeneration uses the personal saved title and included Step content, not the original map title or excluded Steps.
- My Flow personal-copy Step detail quietly explains that original source information is retained but copy/file output is generated from the user's personal copy.
- My Flow personal-copy Step detail can copy the current Step as memo/Markdown text, checklist text, and sheet-row TSV.
- My Flow personal-copy Step detail can download a calendar `.ics` file only when the current Step has a date.
- My Flow personal-copy Step detail `.ics`, Today, and Calendar use the date produced by the current personal-copy start date/settings.
- Applying a source-backed map update to a personal copy keeps the personal title, selected Step count, included Step ids, excluded Step ids, item state, and persistence record intact.
- Personal copies expose a quiet settings adjustment entry only in My Flow, not on original non-personal saved Flows.
- My Flow personal-copy settings can update the personal saved title, start date, and included/excluded Step selection without exposing a full editor.
- Re-including an excluded Step removes the `excluded_on_start` skipped state and returns the Step to the active execution list.
- Excluding an included Step writes `excluded_on_start`, moves the Step to the excluded section, and removes it from active execution and regenerated Markdown.
- `needs_review` and `miss` results do not expose start/save controls.
- The result sheet does not display fake usage counts, internal status words such as `source-backed`, or raw route slugs as primary user copy.
- Mobile `/flows` at 390px has no horizontal overflow after the lookup entry is visible.
