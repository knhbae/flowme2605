# URL Lookup Production Slice Tasks

- [x] Read current URL-first lab, lookup module, `/flows` owner component, E2E catalog tests, and service/spec documentation.
- [x] Create the production slice spec folder.
- [x] Add failing unit coverage for at least three source-backed canary URL hits.
- [x] Extend `lib/flow/url-first-lookup.ts` to register source-backed map URL hits.
- [x] Add failing `/flows` E2E coverage for URL lookup result behavior.
- [x] Render the URL lookup entry and result sheet above the existing `/flows` catalog.
- [x] Verify hit, needs-review, and miss states manually or through targeted browser checks.
- [x] Update `docs/SERVICE_STRUCTURE.md` with `/flows` URL lookup ownership.
- [x] Run `npm.cmd run docs:check`.
- [x] Run `npm test`.
- [x] Run `npm.cmd run build`.
- [x] Run 390px mobile browser QA and record evidence in `qa.md`.

## Startable Follow-up

- [x] Add failing unit coverage for a URL hit start package with selected start date, export option, My Flow save records, map snapshot, persistence record, and Markdown export.
- [x] Extend `lib/flow/url-first-lookup.ts` with `buildUrlFirstStartPackage`.
- [x] Add failing `/flows` E2E coverage for hit result start date input, export option, real Markdown download, My Flow save, and blocked needs_review start controls.
- [x] Render hit-only start controls in the `/flows` URL lookup result.
- [x] Save started hit results into the existing My Flow local persistence path.
- [x] Keep needs_review and miss results blocked from start/save controls.
- [x] Run targeted URL lookup unit and E2E checks.

## Lightweight Customization Follow-up

- [x] Add failing unit coverage for custom saved title, selected Step filtering, skipped item state, customized snapshot/persistence record, and customized Markdown export.
- [x] Extend `buildUrlFirstStartPackage` with `customTitle` and `includedStepIds` options.
- [x] Return skipped item state for excluded Steps without mutating original source-backed Flow data.
- [x] Add `그대로 시작` / `조금 고쳐 시작` controls to the `/flows` URL hit result.
- [x] Add saved title and Step include/exclude controls to the lightweight custom start mode.
- [x] Persist customized saved-map snapshot, persistence record, saved Flow record, anchor, and skipped item state into the existing My Flow local storage path.
- [x] Add E2E coverage for customized Markdown export and customized My Flow persistence.
- [x] Run targeted URL lookup unit, E2E, build, and mobile browser QA checks.

## My Flow Personal Copy Continuation

- [x] Add failing storage coverage proving saved-map normalization preserves `personalCopy` metadata.
- [x] Add source-backed map update coverage proving a personal copy keeps its saved title and selected Steps after update projection.
- [x] Preserve URL custom-start `personalCopy` metadata through `normalizeSavedFlowMapSnapshot` and My Flow saved-map indexing.
- [x] Keep excluded URL custom-start Steps out of the default My Flow execution rows and show them in a separate excluded section.
- [x] Mark the saved Flow quietly as a personal copy while preserving original map/source traceability.
- [x] Regenerate Step detail portable Markdown from the personal saved title and included Step content.
- [x] Apply source-backed map updates without overwriting the personal title, selected Step ids, excluded Step ids, item state, or persistence record.
- [x] Run targeted storage, URL lookup, source-backed map, URL lookup E2E, saved-map update E2E, and production build checks.

## My Flow Personal Copy Readjustment

- [x] Add failing source-backed domain coverage for changing a personal copy title, anchor, and included Step ids.
- [x] Add failing `/my` E2E coverage for opening personal-copy settings, changing saved title/start date, excluding an included Step, and re-including an excluded Step.
- [x] Add `buildSourceBackedFlowMapPersonalCopyAdjustment` so snapshot and persistence record are regenerated from the same personal-copy selection.
- [x] Add a quiet `설정 조정` entry only for personal copies in My Flow.
- [x] Persist readjusted personal title, start date, included Step ids, excluded Step ids, saved Flow record anchor, and per-Step excluded state into the existing local storage bridge.
- [x] Keep Step detail portable Markdown and active/excluded Step lists aligned immediately after settings save.
- [x] Verify source-backed update apply still preserves the readjusted personal state.

## My Flow Personal Copy Step Export Handoff

- [x] Add failing Step export helper coverage for checklist text and one-row TSV output.
- [x] Add failing `/my` E2E coverage for exporting a URL-customized personal copy Step to memo/Markdown, checklist text, dated `.ics`, and sheet-row TSV after settings readjustment.
- [x] Add checklist text and sheet-row TSV builders beside the existing Step portable text and `.ics` builders.
- [x] Expand the Step detail `원문·내 도구` area with personal-copy basis copy, memo/Markdown copy, checklist copy, sheet-row copy, and dated-only `.ics` download.
- [x] Keep mobile Step detail export collapsed by default.
- [x] Verify included Steps remain in active/export flow, excluded Steps stay out of active/export flow, and adjusted dates reach Today, Calendar, and `.ics`.

## URL-first Supply Queue Follow-up

- [x] Add failing domain coverage for creating `miss_request` and `needs_review_request` production candidate records from URL lookup results.
- [x] Add canonical URL dedupe coverage so tracking/noisy duplicate URLs do not create another candidate.
- [x] Add local storage normalization for malformed or legacy candidate queue data.
- [x] Add `/flows` E2E coverage for saving a miss URL as a production candidate, showing the existing candidate on duplicate lookup, and saving a needs-review URL as a non-executable request.
- [x] Render `제작 후보로 저장` only for `miss` and `needs_review`, without exposing AI generation, crawler, admin, account, or public request count behavior.
- [x] Render a separate `내가 요청한 후보` section in `/flows` with `아직 실행 가능한 Flow 아님` copy.
- [x] Update service structure, decisions, and QA evidence for the local URL-first supply queue.

## URL-first Candidate Revisit Follow-up

- [x] Add failing domain coverage for editing a local production candidate title/memo without changing canonical URL, original URL, request status, or saved date.
- [x] Add failing domain coverage for deleting a candidate by canonical URL.
- [x] Add domain coverage for detecting when a stored candidate's canonical URL now resolves to an executable hit.
- [x] Add `/flows` E2E coverage for revisiting, editing, deleting, and resolved-hit handoff from the requested-candidate list.
- [x] Render requested-candidate cards with `원 URL 열기`, `다시 조회`, `제목/메모 수정`, and `삭제`.
- [x] Show `제작 대기`, `원문 확인 대기`, or `이제 실행 가능` based on the current canonical URL lookup.
- [x] Route `이제 실행 가능` candidates back into the normal URL hit result/start flow without creating AI, crawler, admin, account, server, or public-demand behavior.
- [x] Update spec, plan, service structure, decision, and QA notes for candidate revisit/resolved-hit behavior.

## URL-first Candidate-to-Production Handoff Follow-up

- [x] Add failing domain coverage for recording a candidate's last canonical lookup result without changing canonical URL, original URL, request status, or saved date.
- [x] Add failing domain coverage for production handoff Markdown containing candidate URLs, user title/memo, request state, current lookup state, last lookup, AI/crawling disabled note, and manual conversion checklist.
- [x] Preserve optional `lastLookup` metadata through local candidate normalization.
- [x] Persist `lastLookup` when a user re-runs canonical lookup from a requested-candidate card.
- [x] Add `/flows` E2E coverage for `제작용 정보 보기`, production checklist visibility, `제작용 Markdown 복사`, clipboard content, and resolved-hit priority copy.
- [x] Render a collapsed `제작용 정보` panel on requested-candidate cards without making miss/needs_review candidates executable.
- [x] Keep resolved-hit candidates oriented toward `Flow 결과로 이동` while still allowing the handoff panel to explain why duplicate production is lower priority.
- [x] Keep the handoff local-only and AI-free: no crawling, admin workflow, account/server persistence, public counts, source-owner notification, or automatic seed creation.

## URL-first Manual Registration Loop Follow-up

- [x] Add failing URL lookup coverage proving a human-registered source-backed Flow can be found from its canonical source URL.
- [x] Add failing supply queue coverage proving a saved production candidate becomes executable when its canonical URL now resolves to that registered Flow.
- [x] Add failing `/flows` E2E coverage for a locally saved candidate moving from production wait into the normal hit/start/My Flow path after manual registration.
- [x] Register direct-route-enabled, non-rejected source-backed Flow maps in the URL lookup registry.
- [x] Use the existing Samsung service aircon filter cleaning source-backed Flow as the manual registration sample: official URL, single routine Step, 2-week repeat rule, low-risk source trace, and no unsafe/execution-impossible row.
- [x] Rebuild and run the targeted manual registration E2E test against the updated production bundle.
- [x] Run full unit/docs/build verification and update QA evidence.

## URL-first Manual Registration Checklist Follow-up

- [x] Add failing source-backed domain coverage for the manual registration checklist.
- [x] Add failing domain coverage that URL lookupable source-backed maps require source URL, `directRouteEnabled`, and non-`reject` quality status.
- [x] Add failing authoring QA coverage for duplicate canonical source URL, missing sourceTrace, and empty registered Step list.
- [x] Add source-backed manual registration checklist data covering canonical URL, original/source URL, sourceTrace, Step split, date/relative/repeat rules, risk/execution blockers, and `directRouteEnabled`/`reject` decision.
- [x] Add a manual registration readiness report helper that catches duplicate canonical URL, missing sourceTrace, empty Step list, and missing source URL before URL lookup exposure.
- [x] Keep rejected source-backed source URLs out of actual URL lookup hits even when source-backed seed/content exists.
- [x] Update the spec with the manual registration checklist operating rule and lookup inclusion rule.
- [x] Run targeted tests, docs check, full unit tests, build, and update QA evidence.

## URL-first Manual Registration QA Report Follow-up

- [x] Add failing report coverage for source-backed manual registration QA summary, issue counts, runbook, and sample rehearsal.
- [x] Add a report builder that converts `assessSourceBackedManualRegistrationReadiness` into operator-facing rows and metrics.
- [x] Add a standalone HTML renderer for lookup 가능, 등록 보류, duplicate canonical URL, sourceTrace 누락, Step 없음, sourceUrl 누락, runbook, and sample rehearsal.
- [x] Add a content-audit script that writes `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`.
- [x] Generate the current source-backed manual registration QA report.
- [x] Run targeted report tests, docs check, full unit tests, build, and update QA evidence.

## URL-first First Manual Registration QA Pass Follow-up

- [x] Add failing source-backed coverage proving `aircon-filter-cleaning` is no longer blocked by manual registration readiness and its public child Step carries sourceTrace evidence.
- [x] Add failing report coverage proving `aircon-filter-cleaning` appears as `QA 통과`, has no issue codes, and contributes at least one QA-pass row.
- [x] Add sourceTrace evidence to the Samsung service aircon filter cleaning Step without AI generation, crawling, automatic seed creation, or broad source-backed cleanup.
- [x] Support the operator-friendly `sourceTrace:` line format in source-backed Step metadata extraction while preserving existing `원문 근거:` support.
- [x] Regenerate the manual registration QA HTML report so the current summary shows 1 QA-pass sample, 23 registration holds, and 2 lookup-blocked maps.
- [x] Record the first QA-pass sample and remaining blocker profile in QA evidence.

## URL-first Duplicate Canonical URL Operations Follow-up

- [x] Analyze the current duplicate canonical URL set by canonical URL group instead of only by raw issue count.
- [x] Classify duplicate groups by likely cause: actual duplicate Flow Maps, broad shared source URL, normal multiple executable Flows from one source, or canonicalization that needs refinement.
- [x] Add report coverage proving duplicate groups expose a primary default-hit candidate, secondary candidates, reason label, and operator action.
- [x] Add an operator policy that one canonical URL should have one default URL lookup hit until the group is narrowed, merged, or a secondary map is held out of lookup.
- [x] Render duplicate canonical URL groups in the generated manual registration QA HTML report.
- [x] Resolve one representative duplicate group by holding `funmom-study-routine-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available.
- [x] Keep `curated-funmom-learning-park` as the stronger representative for the shared `https://funmom.tistory.com/` source group.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 18 maps / 9 groups to 16 maps / 8 groups, with 23 lookup-eligible maps, 22 registration holds, and 3 lookup-blocked maps.
- [x] Record the duplicate URL policy and first handling case in spec/QA evidence.

## URL-first Actual Duplicate Canonical URL Repair Follow-up

- [x] Select the OPIC duplicate group `curated-opic-mock-course` / `opic-plan-map` as the next low-blast-radius actual duplicate.
- [x] Confirm both maps share the same Mansour OPIC source URL and the same 2-week / 1-month execution shape.
- [x] Keep `curated-opic-mock-course` as the canonical URL default hit because it has the stronger product score and current curated source-backed structure.
- [x] Hold `opic-plan-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available.
- [x] Add URL lookup coverage proving the OPIC source URL resolves to `/flow-maps/curated-opic-mock-course`.
- [x] Add source-backed coverage proving `opic-plan-map` stays publishable but is absent from URL lookupable maps.
- [x] Update report coverage so the OPIC duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 16 maps / 8 groups to 14 maps / 7 groups, with 22 lookup-eligible maps, 21 registration holds, and 4 lookup-blocked maps.
- [x] Record the second duplicate handling case in spec/QA evidence.

## URL-first Actual Duplicate Canonical URL Repair Follow-up 2

- [x] Select the Getcha new-car duplicate group `curated-new-car-purchase-guide` / `new-car-map` as the next actual duplicate.
- [x] Confirm both maps share the same Getcha source URL and the same 7-step new-car purchase execution shape.
- [x] Keep `curated-new-car-purchase-guide` as the canonical URL default hit because it has the stronger product score and current curated source-backed structure.
- [x] Hold `new-car-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available.
- [x] Add URL lookup coverage proving the Getcha source URL resolves to `/flow-maps/curated-new-car-purchase-guide`.
- [x] Add source-backed coverage proving `new-car-map` stays publishable but is absent from URL lookupable maps.
- [x] Update report coverage so the Getcha duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 14 maps / 7 groups to 12 maps / 6 groups, with 21 lookup-eligible maps, 20 registration holds, and 5 lookup-blocked maps.
- [x] Record the third duplicate handling case in spec/QA evidence.

## Duplicate Canonical URL Repair 4 - Allblanc Broad Channel Source

- [x] Select the `curated-allblanc-workout-park` / `homefit-map` duplicate group.
- [x] Classify the group as a broad source URL problem because both maps shared `https://youtube.com/@allblanctv`.
- [x] Keep `curated-allblanc-workout-park` as the canonical URL default hit because it has the stronger product score and exact-video routine structure.
- [x] Hold `homefit-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available.
- [x] Add URL lookup coverage proving `https://www.youtube.com/@allblanctv` canonicalizes to `https://youtube.com/@allblanctv` and resolves to `/flow-maps/curated-allblanc-workout-park`.
- [x] Add source-backed coverage proving `homefit-map` stays publishable but is absent from lookupable maps.
- [x] Update report coverage so the Allblanc duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 12 maps / 6 groups to 10 maps / 5 groups, with 20 lookup-eligible maps, 19 registration holds, and 6 lookup-blocked maps.
- [x] Record the fourth duplicate handling case in spec/QA evidence.

## Duplicate Canonical URL Repair 5 - AJD Moving Actual Duplicate

- [x] Select the `curated-ajd-moving-d30` / `moving-map` duplicate group.
- [x] Classify the group as an actual duplicate Flow Map because both maps share the same AJD moving checklist source URL and D-day moving checklist job.
- [x] Keep `curated-ajd-moving-d30` as the canonical URL default hit because it has the stronger product score and current curated source-backed Step structure.
- [x] Hold `moving-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available.
- [x] Add URL lookup coverage proving the AJD moving source URL resolves to `/flow-maps/curated-ajd-moving-d30`.
- [x] Add source-backed coverage proving `moving-map` stays publishable but is absent from lookupable maps.
- [x] Update report coverage so the AJD moving duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 10 maps / 5 groups to 8 maps / 4 groups, with 19 lookup-eligible maps, 18 registration holds, and 7 lookup-blocked maps.
- [x] Record the fifth duplicate handling case in spec/QA evidence.

## Duplicate Canonical URL Repair 6 - Official Child Vaccination Actual Duplicate

- [x] Select the `curated-child-vaccination-schedule` / `vaccination-map` duplicate group.
- [x] Classify the group as an actual duplicate Flow Map because both maps share the same official KHMS child vaccination source URL and baby vaccination schedule job.
- [x] Keep `curated-child-vaccination-schedule` as the canonical URL default hit because it has the stronger product score, official source-backed Step structure, birth-date setup, and medical-sensitive review-before-apply handling.
- [x] Hold `vaccination-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available.
- [x] Add URL lookup coverage proving the KHMS child vaccination source URL resolves to `/flow-maps/curated-child-vaccination-schedule`.
- [x] Add source-backed coverage proving `vaccination-map` stays publishable but is absent from lookupable maps, while the representative retains medical-sensitive rows.
- [x] Update report coverage so the KHMS child vaccination duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 8 maps / 4 groups to 6 maps / 3 groups, with 18 lookup-eligible maps, 17 registration holds, and 8 lookup-blocked maps.
- [x] Record the sixth duplicate handling case in spec/QA evidence.

## Duplicate Canonical URL Repair 7 - Baby Food Source-Traced Default Hit

- [x] Select the `curated-baby-food-meal-log` / `baby-food-map` duplicate group.
- [x] Classify the group as an actual duplicate Flow Map because both maps share the same Naver baby-food source URL and baby-food meal-record job.
- [x] Keep `baby-food-map` as the canonical URL default hit because it has stronger sourceTrace readiness, 5 child Flows, 21 medical-sensitive execution Steps, start-date setup, and zero missing sourceTrace Steps.
- [x] Hold `curated-baby-food-meal-log` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available for review.
- [x] Add URL lookup coverage proving the Naver baby-food source URL resolves to `/flow-maps/baby-food-map`.
- [x] Add source-backed coverage proving `curated-baby-food-meal-log` stays publishable but is absent from lookupable maps, while `baby-food-map` remains lookupable and source-traced.
- [x] Update report coverage so the Naver baby-food duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 6 maps / 3 groups to 4 maps / 2 groups, with 17 lookup-eligible maps, 2 QA-pass maps, 15 registration holds, and 9 lookup-blocked maps.
- [x] Record the seventh duplicate handling case in spec/QA evidence.

## Duplicate Canonical URL Repair 8 - Reading Monthly Routine Default Hit

- [x] Select the `curated-reading-routine-log` / `reading-routine-map` duplicate group.
- [x] Classify the group as an actual duplicate Flow Map because both maps share the same Naver reading source URL and reading-routine job.
- [x] Keep `curated-reading-routine-log` as the canonical URL default hit because it has `real` source status, stronger product score, 8-Step monthly execution structure, and save/export eligibility.
- [x] Hold `reading-routine-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available for review.
- [x] Add URL lookup coverage proving the Naver reading source URL resolves to `/flow-maps/curated-reading-routine-log`.
- [x] Add source-backed coverage proving `reading-routine-map` stays publishable but is absent from lookupable maps, while `curated-reading-routine-log` remains lookupable.
- [x] Update report coverage so the Naver reading duplicate group is no longer listed.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 4 maps / 2 groups to 2 maps / 1 group, with 16 lookup-eligible maps, 2 QA-pass maps, 14 registration holds, and 10 lookup-blocked maps.
- [x] Record the eighth duplicate handling case in spec/QA evidence, including the remaining sourceTrace completion work on the representative.

## Duplicate Canonical URL Repair 9 - Wedding Checklist Family Default Hit

- [x] Select the `curated-wedding-checklist-family` / `wedding-map` duplicate group.
- [x] Classify the group as an actual duplicate Flow Map because both maps share the same Naver wedding source URL and wedding-prep job.
- [x] Keep `curated-wedding-checklist-family` as the canonical URL default hit because it has a stronger product score, 2-child timeline/checklist structure, 10 executable Steps, and a wedding-date setup path.
- [x] Hold `wedding-map` out of URL lookup with `directRouteEnabled=false` while keeping its direct publish package available for review.
- [x] Add URL lookup coverage proving the Naver wedding source URL resolves to `/flow-maps/curated-wedding-checklist-family`.
- [x] Add source-backed coverage proving `wedding-map` stays publishable but is absent from lookupable maps, while `curated-wedding-checklist-family` remains lookupable.
- [x] Update report coverage so duplicate canonical URL count is now 0 maps / 0 groups.
- [x] Regenerate the manual registration QA HTML report so duplicate canonical URL membership drops from 2 maps / 1 group to 0 maps / 0 groups, with 15 lookup-eligible maps, 2 QA-pass maps, 13 registration holds, and 11 lookup-blocked maps.
- [x] Record the ninth duplicate handling case in spec/QA evidence, including the remaining sourceTrace completion work on the representative.

## SourceTrace Remediation Queue 1 - Reading Routine QA-pass

- [x] Add a sourceTrace remediation queue to the manual registration QA report.
- [x] Sort missing sourceTrace candidates by lookup representative status, productScore, user-start readiness, Step count, risk level, and remediation effort.
- [x] Select `curated-reading-routine-log` as the first representative repair because it is a URL lookup representative, low risk, one-source routine, 8 Steps, and easier to verify than the two-source wedding family.
- [x] Add sourceTrace evidence to all 8 `curated-reading-monthly-log` Steps using the existing Naver reading source URL and Step title context.
- [x] Verify `curated-reading-routine-log` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 2 to 3, registration holds drop from 13 to 12, and missing sourceTrace drops from 13 maps / 105 Steps to 12 maps / 97 Steps.
- [x] Record the first sourceTrace queue repair case in spec/QA evidence and keep the next queue visible for operators.

## SourceTrace Remediation Queue 2 - Moving D-30 QA-pass

- [x] Select `moving-d30` from the sourceTrace remediation queue because it is the current top priority, lookup-eligible, homepage representative, low risk, 5 Steps, and low-effort to sourceTrace from the existing AJD checklist URL.
- [x] Reconfirm the moving duplicate policy before editing: `moving-map` remains `directRouteEnabled=false`, `curated-ajd-moving-d30` remains the selected hit for the encoded AJD curated URL, and `moving-d30` does not recreate a duplicate canonical URL group.
- [x] Add sourceTrace evidence to all 5 `source-backed-moving-d30` Steps using the existing AJD moving checklist source URL and Step id context.
- [x] Verify `moving-d30` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 3 to 4, registration holds drop from 12 to 11, and missing sourceTrace drops from 12 maps / 97 Steps to 11 maps / 92 Steps.
- [x] Record the second sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-ajd-moving-d30`.

## SourceTrace Remediation Queue 3 - Curated AJD Moving QA-pass

- [x] Select `curated-ajd-moving-d30` from the sourceTrace remediation queue because it is the current top URL lookup representative for the encoded AJD moving URL, medium risk, 5 Steps, and low-effort to sourceTrace from the existing AJD checklist URL.
- [x] Reconfirm the moving URL policy before editing: `curated-ajd-moving-d30` remains the AJD moving URL lookup hit, `moving-d30` remains QA-pass for its own registered route, `moving-map` remains `directRouteEnabled=false`, and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 5 `curated-ajd-moving-d30` Steps using the existing encoded AJD moving checklist source URL and Step id context.
- [x] Verify `curated-ajd-moving-d30` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 4 to 5, registration holds drop from 11 to 10, and missing sourceTrace drops from 11 maps / 92 Steps to 10 maps / 87 Steps.
- [x] Record the third sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-new-car-purchase-guide`.

## SourceTrace Remediation Queue 4 - Curated New Car QA-pass

- [x] Select `curated-new-car-purchase-guide` from the sourceTrace remediation queue because it is the current top URL lookup representative for the Getcha new-car purchase URL, financial-sensitive, 7 Steps, and requires sourceTrace completion before manual registration pass.
- [x] Reconfirm the new-car URL policy before editing: `curated-new-car-purchase-guide` remains the Getcha source URL lookup hit, `new-car-map` remains `directRouteEnabled=false`, and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 7 `curated-new-car-basic` Steps using the existing Getcha source URL and Step id context.
- [x] Verify `curated-new-car-purchase-guide` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 5 to 6, registration holds drop from 10 to 9, and missing sourceTrace drops from 10 maps / 87 Steps to 9 maps / 80 Steps.
- [x] Record the fourth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `middle-school-math-1`.

## SourceTrace Remediation Queue 5 - Middle-school Math QA-pass

- [x] Select `middle-school-math-1` from the sourceTrace remediation queue because it is the current top URL lookup representative for the Mathbang middle-school math URL, low risk, 8 Steps, and requires only sourceTrace completion from the existing Mathbang table-of-contents source.
- [x] Reconfirm the Mathbang URL policy before editing: `middle-school-math-1` remains the source URL lookup hit and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 8 `source-backed-middle-school-math-1` Steps using the existing Mathbang source URL plus Step order/id context.
- [x] Verify `middle-school-math-1` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 6 to 7, registration holds drop from 9 to 8, and missing sourceTrace drops from 9 maps / 80 Steps to 8 maps / 72 Steps.
- [x] Record the fifth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-opic-mock-course`.

## SourceTrace Remediation Queue 6 - Curated OPIC QA-pass

- [x] Select `curated-opic-mock-course` from the sourceTrace remediation queue because it is the current top URL lookup representative for the Mansour OPIC URL, low risk, 19 Steps, and requires sourceTrace completion from the existing Mansour workbook/article row structure.
- [x] Reconfirm the Mansour OPIC URL policy before editing: `curated-opic-mock-course` remains the source URL lookup hit, `opic-plan-map` remains `directRouteEnabled=false`, and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 19 OPIC Steps using the existing Mansour source URL plus workbook row group/id context: 14 `curated-opic-single-mock-review` Steps and 5 `curated-opic-course-row-import` Steps.
- [x] Verify `curated-opic-mock-course` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 7 to 8, registration holds drop from 8 to 7, and missing sourceTrace drops from 8 maps / 72 Steps to 7 maps / 53 Steps.
- [x] Record the sixth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-wedding-checklist-family`.

## SourceTrace Remediation Queue 7 - Curated Wedding QA-pass

- [x] Select `curated-wedding-checklist-family` from the sourceTrace remediation queue because it is the current top URL lookup representative for the Naver wedding URL, medium risk, 10 Steps, and requires sourceTrace completion across two existing source versions.
- [x] Reconfirm the wedding URL policy before editing: `curated-wedding-checklist-family` remains the Naver wedding URL lookup hit, `wedding-map` remains `directRouteEnabled=false`, and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 10 wedding Steps using only the existing child Flow source URL context: 6 `curated-wedding-naver-timeline` Steps cite the Naver timeline source and 4 `curated-wedding-gongysd-atoz` Steps cite the Gongysd A-to-Z source.
- [x] Verify `curated-wedding-checklist-family` moves from registration hold to QA-pass and leaves the remediation queue.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 8 to 9, registration holds drop from 7 to 6, and missing sourceTrace drops from 7 maps / 53 Steps to 6 maps / 43 Steps.
- [x] Record the seventh sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-allblanc-workout-park`.

## SourceTrace Remediation Queue 8 - Curated Allblanc QA-pass

- [x] Select `curated-allblanc-workout-park` from the sourceTrace remediation queue because it is the current top URL lookup representative for the Allblanc channel URL, medical-sensitive, 3 exact-video Steps, and requires sourceTrace completion before manual registration pass.
- [x] Reconfirm the Allblanc URL policy before editing: `curated-allblanc-workout-park` remains the Allblanc channel URL lookup hit, `homefit-map` remains `directRouteEnabled=false`, and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 3 Allblanc exact-video Steps using only the existing video URLs plus Step row ids: `curated-allblanc-morning-workout`, `curated-allblanc-no-jump-cardio`, and `curated-allblanc-lower-body`.
- [x] Verify `curated-allblanc-workout-park` moves from registration hold to QA-pass and leaves the remediation queue without adding exercise posture, health advice, movement sequences, or Step rewrites.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 9 to 10, registration holds drop from 6 to 5, and missing sourceTrace drops from 6 maps / 43 Steps to 5 maps / 40 Steps.
- [x] Record the eighth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-child-vaccination-schedule`.

## SourceTrace Remediation Queue 9 - Curated Child Vaccination QA-pass

- [x] Select `curated-child-vaccination-schedule` from the sourceTrace remediation queue because it is the current top KHMS URL lookup representative, medical-sensitive, review-before-apply, 10 Steps, and requires official sourceTrace completion before manual registration pass.
- [x] Reconfirm the KHMS vaccination URL policy before editing: `curated-child-vaccination-schedule` remains the KHMS child vaccination URL lookup hit, `vaccination-map` remains `directRouteEnabled=false`, duplicate canonical URL groups remain at 0, and `review_before_apply` stays in place.
- [x] Add sourceTrace evidence to all 10 official KHMS child vaccination Steps using only the existing KHMS source URL plus Step row ids: 6 `curated-child-vaccination-first-year` Steps and 4 `curated-child-vaccination-booster-school-age` Steps.
- [x] Verify `curated-child-vaccination-schedule` moves from registration hold to QA-pass and leaves the remediation queue without adding vaccination/medical advice, reinterpreting the official schedule, rewriting Steps, or merging/deleting vaccination maps.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 10 to 11, registration holds drop from 5 to 4, and missing sourceTrace drops from 5 maps / 40 Steps to 4 maps / 30 Steps.
- [x] Record the ninth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `baby-health-schedule`.

## SourceTrace Remediation Queue 10 - Baby Health QA-pass

- [x] Select `baby-health-schedule` from the sourceTrace remediation queue because it is the current top official baby-health URL lookup representative, medical-sensitive, review-before-apply, 18 Steps, and requires official sourceTrace completion before manual registration pass.
- [x] Reconfirm the baby-health URL policy before editing: `baby-health-schedule` remains the EasyLaw baby-health URL lookup hit, duplicate canonical URL groups remain at 0, and `review_before_apply` stays in place.
- [x] Add sourceTrace evidence to all 18 official baby-health Steps using only the existing official source URLs plus Step row ids: 12 `source-backed-baby-health-checkups` Steps cite the EasyLaw health-checkup schedule source and 6 `source-backed-baby-vaccination-schedule` Steps cite the KDCA vaccination schedule source.
- [x] Verify `baby-health-schedule` moves from registration hold to QA-pass and leaves the remediation queue without adding medical/parenting advice, reinterpreting official schedules, rewriting Steps, or merging/deleting baby-health maps.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 11 to 12, registration holds drop from 4 to 3, and missing sourceTrace drops from 4 maps / 30 Steps to 3 maps / 12 Steps.
- [x] Record the tenth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `curated-funmom-learning-park`.

## SourceTrace Remediation Queue 11 - Curated Funmom QA-pass

- [x] Select `curated-funmom-learning-park` from the sourceTrace remediation queue because it is the current top Funmom URL lookup representative, low risk, review-before-apply, 6 Steps, and requires sourceTrace completion before manual registration pass.
- [x] Reconfirm the Funmom URL policy before editing: `curated-funmom-learning-park` remains the Funmom URL lookup hit, `funmom-study-routine-map` remains `directRouteEnabled=false`, and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 6 Funmom weekly print-picker Steps using only the existing Funmom source URL plus Step row ids.
- [x] Verify `curated-funmom-learning-park` moves from registration hold to QA-pass and leaves the remediation queue without adding study advice, curriculum interpretation, Step rewrites, or merging/deleting Funmom maps.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 12 to 13, registration holds drop from 3 to 2, and missing sourceTrace drops from 3 maps / 12 Steps to 2 maps / 6 Steps.
- [x] Record the eleventh sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `postal-address-transfer`.

## SourceTrace Remediation Queue 12 - Postal Address Transfer QA-pass

- [x] Select `postal-address-transfer` from the sourceTrace remediation queue because it is the current top ePost postal/address-transfer URL lookup representative, low risk, 3 Steps, and requires sourceTrace completion before manual registration pass.
- [x] Reconfirm the postal URL policy before editing: `postal-address-transfer` remains the ePost URL lookup hit and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 3 postal address-transfer Steps using only the existing ePost source URL plus Step row ids: `postal-next-day-check`, `postal-payment-deadline`, and `postal-service-start`.
- [x] Verify `postal-address-transfer` moves from registration hold to QA-pass and leaves the remediation queue without adding administrative advice, postal-service usage advice, legal interpretation, Step rewrites, or merging/deleting postal maps.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 13 to 14, registration holds drop from 2 to 1, and missing sourceTrace drops from 2 maps / 6 Steps to 1 map / 3 Steps.
- [x] Record the twelfth sourceTrace queue repair case in spec/QA evidence and confirm the next queue item is `year-end-tax-submit`.

## SourceTrace Remediation Queue 13 - Year-end Tax Submit QA-pass

- [x] Select `year-end-tax-submit` from the sourceTrace remediation queue because it is the final NTS year-end-tax URL lookup representative, financial-sensitive, 3 Steps, and requires official sourceTrace completion before manual registration pass.
- [x] Reconfirm the NTS URL policy before editing: `year-end-tax-submit` remains the NTS URL lookup hit and duplicate canonical URL groups remain at 0.
- [x] Add sourceTrace evidence to all 3 year-end tax submission Steps using only the existing official NTS source URL plus Step row ids: `tax-login-months`, `tax-submit-employer`, and `tax-submit-confirm`.
- [x] Verify `year-end-tax-submit` moves from registration hold to QA-pass and leaves the remediation queue without adding tax advice, deduction advice, financial advice, legal interpretation, Step rewrites, or merging/deleting year-end-tax maps.
- [x] Regenerate the manual registration QA HTML report so QA-pass increases from 14 to 15, registration holds drop from 1 to 0, and missing sourceTrace drops from 1 map / 3 Steps to 0 maps / 0 Steps.
- [x] Record the thirteenth sourceTrace queue repair case in spec/QA evidence and confirm the sourceTrace remediation queue is empty.

## Production Build Gate Stabilization Follow-up

- [x] Reproduce the earlier `npm.cmd run build` instability as transient `.next` ENOENT states after failed/interrupted local build attempts.
- [x] Confirm the failures happen after compile/typecheck around Next export/trace artifact reads, not in TypeScript or application code.
- [x] Verify `cmd /c ".\node_modules\.bin\next.cmd build"` passes from a clean `.next` directory as a diagnostic comparison.
- [x] Verify `npm.cmd run build` passes from a clean `.next` directory.
- [x] Keep the standard production build command as `npm.cmd run build` while leaving the committed package script on direct `next build` and the default webpack build worker enabled.
- [x] Record that the cleanup/retry wrapper was evaluated but held out of the committed verification gate; stale `.next` recovery remains a manual clean/retry procedure unless future evidence justifies a separate wrapper change.
