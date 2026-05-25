# Project Status

**Last Updated:** 2026-05-25
**Status:** v0.1.0 IN DEVELOPMENT  
**Current Version:** v0.1.0  
**Primary Focus:** Stage 0 / First Flag validation for FLOW execution behavior.

## System Health

| Area | Command | Current Expectation |
|------|---------|---------------------|
| Documentation harness | `npm run docs:check` | Required agent docs exist and local Markdown links resolve |
| Unit tests | `npm test` | Flow date/parser/seed/export/content-lab tests pass |
| Production build | `npm run build` | Next.js build succeeds |
| E2E tests | `npm run test:e2e` | Playwright runs against `/flows` on port 3104 |
| Local dev | `npm run dev` | Next.js serves on port 3000 |

## Active Product Constraints

- Focus on copy/export/check behavior before platform expansion.
- Treat FLOW as export-first in Stage 0: convert outside content into a user's existing calendar, checklist, spreadsheet, or memo before asking them to manage records inside FLOW.
- Preserve the long-term path toward native FLOW execution records, but keep save/record features secondary until export behavior proves repeat use.
- Keep product decisions aligned with [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).
- Keep official information and creator/user experience tips visually and structurally separate.
- Do not label any route as validated until real user behavior data exists.
- Avoid login, payment, AI auto-publishing, full community, and heavy integrations before Stage 0 evidence.

## Recent Changes

- Flow MVP implementation exists in the Next.js app.
- Local unit tests and Playwright E2E tests are configured.
- AI-agnostic harness documents were added from the Claude Harness guide principles without copying Claude-specific runtime assumptions.
- Documentation harness now has a local `docs:check` command and an `AGENTS.md` auto-discovery entry point.
- Source-fit audit scoring now gates representative public exposure for the first real-source Flow batch while keeping direct routes accessible.
- Content inventory review now separates manual source-fit audits, metadata-derived real-source reviews, source-backed needs-review routes, generated preview candidates, and legacy accessible routes in Content Lab and creator channel UX.
- Source-fit audits now require concrete natural artifact simulations: sample user input values, expected checklist/calendar/sheet/memo outputs, and current Flow/UX gap comparisons.
- Real-source natural artifact audit now covers all 40 real-source Flows and is surfaced in Flow Lab with remaining audit count.
- Flow lifecycle classification now groups all 511 bundles into keep/fix/preview-only/hide/remove-candidate buckets and surfaces the counts in Content Lab.
- The source replacement and risk review `needs_review` batch is now manually audited: 31 manual audits total, 0 remaining needs-review priority routes.
- Source-backed `needs_review` routes now have no remaining Content Lab priority queue; audited `reshape_before_featured` routes still need item/content/UX reshaping before stronger exposure.
- Admin/official `reshape_before_featured` route reshaping has landed for driver license renewal, family certificate, resident register copy, and Q-Net application: route-specific tables/memo/log fields now improve direct-route execution before broader exposure.
- Real-source manual source-fit promotion has landed: the 40 natural-artifact audits are projected into source-fit decisions, moving manual source-fit coverage from 31 to 71 routes.
- Real-source official/service reshaping has landed for Q-Net, childcare vaccination visits, KDCA travel health, safe-driving license renewal, Gov24 resident-register copy, and childcare support application routes.
- Source replacement and risk review route reshaping has landed for 12 routes: study logs, diet sheets, new-car evidence rows, and official/risk memo cards now have tests and docs.
- Source replacement and risk review item copy polish has landed: the same 12 routes now reject missing/generic item detail copy and remain `reshape_before_featured` pending deeper review and user evidence.
- Source-risk representative readiness review has landed for `computer-skills-d30-study`, `new-car-delivery-check`, and `diet-habit-2week`; Flow Lab now tracks one representative candidate and two public MVP candidates without changing exposure.
- Export-first UX/content simulation batch 1 has landed for the same three routes; Flow Lab now tracks realistic user inputs, external artifacts, UX gaps, feature-diet decisions, and risk boundaries before any promotion.
- Computer-skills final promotion QA has landed: desktop/mobile screenshots and xlsx/ics downloads passed for `computer-skills-d30-study`, and the route is now representative-eligible.
- New-car and diet risk-boundary QA has landed: delivery proof memo fields, diet warning hierarchy, export tests, E2E downloads, and desktop/mobile screenshots are recorded while both routes remain in fix.
- Representative/public-MVP UX content simplification audit has landed: 7 routes were reviewed for first-screen clarity, export-first fit, cognitive load, and source/risk separation before any new feature expansion.
- Baby-food and used-car first-screen simplification has landed: `baby-food-menu-recipe` now prioritizes meal calendar plus reaction log, and `used-car-buying-check` now prioritizes candidate comparison plus buy/hold memo before checklist density.
- New-car and diet guardrail first-screen pass has landed: `new-car-delivery-check` keeps the handover warning inside the evidence workbench, and `diet-habit-2week` now frames the first sheet as observation plus stop/consult condition logging.
- Passport submission memo first-screen pass has landed: `passport-renewal-docs` now opens with a portable submission memo for travel timing, photo readiness, application proof, and pickup/storage before checklist density.
- Export-first study UX direction has landed: product principles now record first-action/natural-artifact UI direction, study content is framed as source-derived curriculum conversion, and `computer-skills-d30-study` starts with editable source-derived progress rows.
- Common first-screen reduction has landed: the shared Flow detail page no longer shows duplicate page-level progress before the artifact workbench, keeping first screens closer to first action plus natural artifact.
- Artifact-near export actions have landed: copy, xlsx, and calendar actions now appear inside the workbench area while existing export formats remain unchanged.
- Setup export card reduction has landed on main: the normal Flow setup area is now anchor-input only, while export actions remain in the workbench and mobile bottom sheet.
- Artifact subcard export placement has landed: workbench export actions now sit beside the specific list, calendar, progress table, and log cards that produce each external artifact.
- Mobile artifact export copy has landed: the sticky mobile shortcut now uses artifact-card labels so it reads as `산출물 받기`, not a separate backup feature.

- Study progress-table criteria and six-route export-first audit are now documented: study tables require source rows such as curriculum, exam scope, past-exam rounds, weekly plans, lessons, or assignments; `computer-skills-d30-study` remains the current example, while `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails and no route is called validated.

- Mobile artifact-card export buttons are now hidden below `sm`: desktop keeps artifact-near export buttons, while mobile uses the sticky `산출물 받기` sheet to lower repeated button density on study and other multi-artifact flows.

- Post-mobile-density route re-evaluation is documented: `computer-skills-d30-study` remains representative-eligible but not validated, while `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails and no exposure change.
- Mobile bottom-sheet screenshots are documented for `diet-habit-2week` and `new-car-delivery-check`: the sheet itself is acceptable after the mobile artifact-button reduction, while the next density risk is page-level artifact and caution stacking.
- Mobile page density is reduced for `diet-habit-2week` and `new-car-delivery-check`: secondary execution sections now start collapsed on mobile, while first actions, artifacts, risk context, and desktop expanded sections remain unchanged.
- Study source-derived guard has landed: `computer-skills-d30-study` now keeps source scope values separate from user-editable target date/status/note values during export, and validation evidence rules clarify that representative-eligible is not validated without user behavior data.
- Study read-only progress cells have landed: the `computer-skills-d30-study` source scope column now renders as source-derived text while target date/status/note remain editable, with desktop/mobile screenshots recorded.
- First-user validation script has landed: the next evidence step for `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check` is an observed export-first loop, not more internal validation language.
- Validation session templates have landed: observed user sessions now have a reusable note format, and the first internal study baseline is explicitly marked `no signal` rather than validation.
- Execution-specificity video route pass has landed: `source reviewed` is now treated as a source boundary only, exact workout video details must separate summary, detailed guide, original video, post-workout record, and stop condition, and the first ThankyouBUBU exact-workout routes keep one action without being called validated.
- Diet exact-video execution-specificity pass has landed: FITVELY diet/body-composition videos stay one-action and memo-first, with details narrowed to one selected rule, one application, one observation record, and one stop condition without outcome claims.
- Workout-plan exact-video execution-specificity pass has landed: FITVELY workout programming videos stay one-action and hybrid, with details narrowed to one selected rule, weekly workout table application, record fields, and revise-or-hold conditions.
- Broad-source route review has landed: current real-source routes backed only by channel pages, broad sites, broad study material, FAQ pages, or official portals stay out of public MVP/representative framing until exact route-level sources or route-specific official references are attached.
- Broad-source code guard has landed: Content Lab summary data now tracks the current real+broad routes and reports any lifecycle `keep` leak before representative/public MVP framing changes.
- Broad-source Flow Lab panel has landed: editors can now see the broad real-source count, representative leak count, and exact source replacement queue in the internal Flow Lab surface.
- ThankyouBUBU broad-source replacement has landed: the two former channel-level workout routes now point to exact YouTube video sources, the broad real-source guard initially dropped from 7 to 5, and both routes remain `reshape_content_or_ux` rather than representative, public-MVP, or validated.
- FITVELY diet broad-source replacement has landed: `real-fitvely-diet-record-routine` now points to an exact FITVELY nutrition video, while `real-fitvely-weekly-body-check` stays broad because no matching measurement/check-in source has been confirmed.
- Sinagong study broad-source replacement has landed: `real-sinagong-computer-d30-study` now points to the exact Gilbut/Sinagong book page, drops out of the broad-source guard, and remains a reshape route rather than representative, public-MVP, or validated.
- Pet-health visit broad-source replacement has landed: `real-pet-health-visit-routine` now points to the exact 서울시 우리동네 동물병원 official page, drops out of the broad-source guard, and remains catalog review because the source has region and eligibility limits.
- MOFA travel broad-source replacement has landed: `real-mofa-overseas-travel-prep` now points to the exact 외교부 베트남 국가/지역별 정보 page, drops out of the broad-source guard, and remains reshape because the route still needs country-check and emergency-card UX work.
- FITVELY weekly body-check broad-source decision has landed: no matching exact FITVELY weekly check-in source has been confirmed, so the route moved to hidden/remove candidate and the active broad-source replacement queue is now 0.
- Representative UX/content review has landed: `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check` now have a current simulated user-run review queue that records first action, natural output, UX gap, mobile density risk, source/risk boundary, and next small fix without calling any route validated.
- Diet observation guardrail copy has landed: `diet-habit-2week` is reframed from diet habit coaching to a two-week food/sleep/activity/condition observation sheet with explicit stop/consult conditions and no validation claim.
- New-car evidence guardrail copy has landed: `new-car-delivery-check` is tightened around photo filenames, dealer confirmation, document status, and signing hold conditions rather than generic checklist completion.
- Mobile simulation protocol has landed: `computer-skills-d30-study`, `diet-habit-2week`, and `new-car-delivery-check` now have scripted mobile rehearsal records with pass/failure signals, average score, and an explicit 0 validated route count.
- Mobile simulation session notes have landed: the same three routes now have internal rehearsal findings and next observed-session script changes without changing validation status.
- UX cleanup backlog has landed: unresolved content/UX areas are now separated from source-review status, with first rewrite batches focused on exact workout video detail, health observation guardrails, and vehicle evidence-first UX.
- ThankyouBUBU exact-source reshape has landed: `real-thankyou-bubu-home-workout-starter` and `real-thankyou-bubu-20min-routine` now use one calendar-first exact-video action with summary, detailed guide, original video link, post-workout record, and stop condition, but they are still not representative, public-MVP, or validated.
- FITVELY diet record observation reshape has landed: `real-fitvely-diet-record-routine` now uses one sheet-first action, source-rule observation rows, and stop/consult copy after exact source replacement, but it is still not representative, public-MVP, or validated.
- Vehicle inspection evidence-first pass has landed: `vehicle-inspection-prep` now separates reservation information, documents, precheck evidence, result sheet, and repair/reinspection follow-up into a memo card, but it is still not representative, public-MVP, or validated.
- Used-car mobile density pass has landed: `used-car-buying-check` now keeps secondary checklist sections collapsed on mobile so candidate comparison and buy/hold memo stay first, but it is still not newly validated.
- MOFA travel emergency-card pass has landed: `real-mofa-overseas-travel-prep` now opens with an official-check and emergency-contact memo card before generic travel checklist density, but it is still not representative, public-MVP, or validated.
- Baby-food mobile density pass has landed: `baby-food-menu-recipe` now keeps secondary meal-plan sections collapsed on mobile so meal calendar and reaction logging stay first, but it is still not newly validated.
- External AI UX/content review synthesis has landed: the three `my_tests/` evaluations are summarized in a dated audit, with conflicts resolved toward source fidelity, export-first usefulness, and no validation claims. The first small fix adds a no-guarantee boundary to `used-car-buying-check` and carries route warnings into text exports.
- Video Flow action-specificity pass has landed: repeated single-video workout routes now carry calendar-notification-ready preparation, execution, source-video, record, and stop/consult guidance in item/export copy, while docs split repeated single-video Flows from multi-video sequence Flows. Figma is the UX/UI companion path for future layout and density batches; this batch changed content/export behavior only and does not call any route validated.
- Study Flow action-specificity pass has landed: `computer-skills-d30-study` now treats each dated study item as a concrete sequence action with `실행:` and `기록:` cues, keeps D-30 as FLOW's exam-date conversion rather than a source-authored curriculum, and carries item guidance into dated calendar exports without changing validation status.
- Sinagong study merge-decision pass has landed: the `my_tests/` source-boundary finding is now carried into audit/backlog data so `real-sinagong-computer-d30-study` stays a direct-QA merge/rewrite candidate unless it gains distinct source-derived rows beyond the canonical `computer-skills-d30-study` route.
- FITVELY diet exact-video observation-sheet pass has landed: remaining nutrition exact-video routes now move from memo-first to sheet-first, expose `기준 후보` and `관찰표` copy, and keep one source rule plus one observation row without diet outcome claims.
- FITVELY workout-programming decision-first pass has landed: `real-fitvely-video-bulk-up-method`, `real-fitvely-video-workout-order`, and `real-fitvely-video-workout-split-science` now start from an 운동 기준 decision table before the weekly workout preview, with source-rule, user-condition, weekly-plan, and revise-or-hold rows. They are still not validated.

## Next Up

v0.1.0 should stabilize the first public FLOW loop: open, anchor input, copy/export, check, and feedback.
