# 2026-05-22 Real-Source Flow Action Matrix

This document turns the completed 40-flow natural artifact audit into product actions. It should be read after `docs/content-audit/2026-05-22-real-source-natural-artifact-audit.md`.

## Decision Counts

| Decision | Count | Product Handling |
| --- | ---: | --- |
| Promote to manual source-fit | 4 | Keep as strong candidates for representative exposure after the listed UX/content gaps are closed. |
| Reshape content or UX | 30 | Keep directly accessible, but do not use as the main demo proof until the Flow matches the user's natural artifact. |
| Keep catalog review | 6 | Keep for catalog/context only. Replace the source or re-check the source before public promotion. |
| Replace or hide source | 0 | No current real-source Flow needs immediate route removal based on this audit alone. |

## Execution Buckets

| Bucket | What It Means | First UX Work |
| --- | --- | --- |
| `timeline_calendar` | User expects dated tasks on a list and a month calendar. | Show list first, then month calendar with real dates and grouped agenda. |
| `routine_calendar` | User expects recurrence, rest days, and repeated sessions. | Add visible monthly recurrence, rest-day display, and weekly completion summary. |
| `spreadsheet_log` | User expects rows that accumulate over time. | Add sheet-first preview and export columns before treating it as a checklist. |
| `decision_table` | User expects candidates/options to be compared. | Make comparison table a first-class artifact, then connect the chosen option to tasks/calendar. |
| `memo_card` | User expects durable reference/proof notes. | Add structured memo cards to copy/export, not only freeform item memo. |
| `source_replacement` | Source is broad, unavailable, or mismatched. | Keep catalog review and find an exact source before representative exposure. |

## Representative Implementation Targets

These five targets cover the core UX shapes without trying to rewrite every Flow at once.

| Priority | Target Flow | Why This One | Required Proof |
| ---: | --- | --- | --- |
| 1 | `moving-d30-basic` plus `real-ohouse-moving-d30-prep` | D-day timeline with real calendar and vendor comparison pressure. | First screen shows list + month calendar preview; moving-company comparison/export works. |
| 2 | `used-car-buying-check` | Checklist/decision Flow where comparison is the natural first artifact. | Candidate comparison table and field checklist are both visible and exportable. |
| 3 | `real-thankyou-bubu-video-full-body-no-jump` | Exact-video routine; validates recurring workout calendar and condition memo. | User selects weekdays and sees visible monthly sessions plus post-workout note fields. |
| 4 | `real-fitvely-video-body-fat-6kg-method` | Diet/logging Flow; validates spreadsheet-first logs and multiple recurrence rules. | Daily log sheet, weekly measurement rows, and recurring workout/measurement reminders are visible. |
| 5 | `real-sinagong-computer-d30-study` | Study timeline; validates deadline planning plus score/wrong-answer sheet. | D-30 calendar and score/wrong-answer spreadsheet preview are both generated. |

Broad-source routes such as `real-fitvely-diet-record-routine`, `real-fitvely-weekly-body-check`, `real-thankyou-bubu-home-workout-starter`, and `real-thankyou-bubu-20min-routine` should inform the UX shape but should not be promoted until exact sources are assigned.

## 40-Flow Product Action Matrix

| Flow | Public Action | Primary Artifacts | Implementation Bucket | Next Content Action | Next UX Action |
| --- | --- | --- | --- | --- | --- |
| `real-samsung-aircon-seasonal-care` | Representative candidate | Monthly calendar, memo | `timeline_calendar`, `memo_card` | Add service counseling/reservation memo criteria. | Add reservation candidate and counseling memo export preview. |
| `real-samsung-washer-filter-care` | Representative candidate | Routine calendar, checklist | `routine_calendar`, `memo_card` | Promote official weekly frequency and safety warnings into item meta. | Show weekly recurrence and safety warning badges in month preview. |
| `real-qnet-application-examday-check` | Reshape before featured | Monthly calendar, spreadsheet | `timeline_calendar`, `spreadsheet_log` | Add exam date plus application deadline as multiple official deadlines. | Add secondary deadline inputs and official requirement comparison export. |
| `real-gov24-moving-report-check` | Catalog review | Checklist, memo | `source_replacement`, `memo_card` | Re-check the unavailable Gov24 body before promotion. | Add proof memo fields for receipt/status/screenshot/follow-up. |
| `real-childcare-vaccination-visit-prep` | Reshape before featured | Monthly calendar, memo | `timeline_calendar`, `memo_card` | Add post-visit observation and caregiver question fields. | Add medical/childcare visit memo template and caution banner. |
| `real-pet-registration-check` | Representative candidate | Checklist, memo | `memo_card` | Add agency candidates and registration-number storage criteria. | Add durable registration-card preview/export. |
| `real-ohouse-moving-d30-prep` | Reshape before featured | Monthly calendar, comparison table | `timeline_calendar`, `decision_table`, `memo_card` | Add mover comparison and payment/proof memo items. | Connect comparison table and proof memo export to timeline Flow. |
| `real-kdca-travel-health-check` | Reshape before featured | Monthly calendar, memo | `timeline_calendar`, `memo_card` | Add country-specific official-check date and consultation fields. | Add official confirmation memo and re-check date input. |
| `real-thankyou-bubu-video-full-body-no-jump` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Rebuild as session-level routine plus condition log. | Add weekday selection, monthly recurrence, and per-session condition notes. |
| `real-thankyou-bubu-video-daily-stretch-9min` | Reshape before featured | Routine calendar, todo list | `routine_calendar` | Split daily stretch and workout-trigger stretch scenarios. | Add repeat days, excluded days, and trigger-based routine setup. |
| `real-thankyou-bubu-video-belly-side-all-in-one` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Add duration, measurement criteria, and pain-stop criteria. | Add condition memo and measurement values to routine occurrences. |
| `real-thankyou-bubu-video-no-knee-cardio-strength` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Add knee condition, half-intensity start, and pain-stop criteria. | Add safety score and next-session intensity adjustment. |
| `real-thankyou-bubu-video-arm-back-shoulder` | Reshape before featured | Routine calendar, spreadsheet | `routine_calendar`, `spreadsheet_log` | Add weekly measurement and shoulder-pain stop criteria. | Link weekly measurement occurrence to spreadsheet log. |
| `real-thankyou-bubu-video-waist-8cm` | Reshape before featured | Routine calendar, spreadsheet | `routine_calendar`, `spreadsheet_log` | Add safe expectation copy, 6-week plan, and measurement frequency. | Export routine calendar plus weekly waist measurement sheet. |
| `real-thankyou-bubu-video-8min-cardio` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Add frequency, fatigue criteria, and repeat adjustment criteria. | Add intensity memo and next-week adjustment action. |
| `real-thankyou-bubu-video-3min-arm` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Rebuild as trigger-based micro-routine. | Add micro-routine trigger and weekly completion summary. |
| `real-thankyou-bubu-video-3min-abs` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Add alternate-day/rest-day defaults and lower-back caution. | Show recovery days and weekly condition summary. |
| `real-thankyou-bubu-video-lower-belly-8min` | Reshape before featured | Routine calendar, spreadsheet | `routine_calendar`, `spreadsheet_log` | Add 5-week repeat plan and optional target-area measurement log. | Generate target-area measurement sheet in export. |
| `real-fitvely-video-body-fat-6kg-method` | Reshape before featured | Spreadsheet, routine calendar | `spreadsheet_log`, `routine_calendar` | Rebuild as diet/workout/measurement log plus routine calendar. | Add multi-rule recurrence and weekly log preview. |
| `real-fitvely-video-carb-reason` | Reshape before featured | Spreadsheet, memo | `spreadsheet_log`, `memo_card` | Rebuild as carb guideline card plus 2-week meal log. | Add meal spreadsheet preview and weekly adjustment memo. |
| `real-fitvely-video-three-week-check` | Reshape before featured | Spreadsheet, memo | `spreadsheet_log`, `memo_card` | Reframe as safe 3-week review, not result promise. | Add 3-week measurement table and health-sensitive self-check memo. |
| `real-fitvely-video-post-workout-nutrition` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Rebuild as workout-linked follow-up nutrition reminders. | Add parent-event plus N-minute reminder support. |
| `real-fitvely-video-carb-amount-shorts` | Reshape before featured | Spreadsheet, memo | `spreadsheet_log`, `memo_card` | Rebuild as daily carb quick-log and next-meal adjustment card. | Add daily quick-log and next-meal memo. |
| `real-fitvely-video-after-work-nutrition` | Reshape before featured | Routine calendar, memo | `routine_calendar`, `memo_card` | Add commute/workout/meal timing inputs. | Add event-relative reminders and nutrition memo export. |
| `real-fitvely-video-weight-class-method` | Reshape before featured | Comparison table, spreadsheet | `decision_table`, `spreadsheet_log` | Rebuild as weight/goal/activity condition selector. | Add condition-based comparison and generated tracking table. |
| `real-fitvely-video-bulk-up-method` | Reshape before featured | Routine calendar, spreadsheet | `routine_calendar`, `spreadsheet_log` | Rebuild as 8-week workout calendar plus weekly tracking. | Add split routine, weekly measurement, and load-log export. |
| `real-fitvely-video-workout-order` | Reshape before featured | Comparison table, routine calendar | `decision_table`, `routine_calendar` | Rebuild as goal-based order selector plus weekly application calendar. | Add comparison-to-calendar transition and session order blocks. |
| `real-fitvely-video-workout-split-science` | Reshape before featured | Routine calendar, comparison table | `decision_table`, `routine_calendar` | Rebuild as candidate comparison, chosen split, monthly recurrence. | Convert selected comparison candidate into calendar recurrence. |
| `real-sinagong-computer-d30-study` | Reshape before featured | Monthly calendar, spreadsheet | `timeline_calendar`, `spreadsheet_log` | Add source material links, score rows, and wrong-answer log. | Combine study timeline with score/wrong-answer spreadsheet preview. |
| `real-mofa-overseas-travel-prep` | Reshape before featured | Monthly calendar, memo | `timeline_calendar`, `memo_card` | Add country-specific safety checks and emergency contact card. | Add destination input, confirmation date, and emergency card copy preview. |
| `real-ts-vehicle-inspection-prep` | Representative candidate | Monthly calendar, checklist | `timeline_calendar`, `memo_card` | Rebuild as pre-inspection, visit, and post-result follow-up. | Add reservation card and inspection-result follow-up memo. |
| `real-safe-driving-license-renewal` | Reshape before featured | Monthly calendar, comparison table | `timeline_calendar`, `decision_table` | Rebuild as license-type branching checklist plus deadline Flow. | Add optional deadline and condition-filtered checklist. |
| `real-gov24-resident-register-copy` | Reshape before featured | Checklist, memo | `memo_card` | Rebuild around submitter requirements, visibility options, issue, and proof. | Add admin proof fields for submitter, visibility, and file location. |
| `real-childcare-support-application-check` | Reshape before featured | Checklist, comparison table | `decision_table`, `memo_card` | Rebuild as eligibility, center comparison, reservation, first visit prep. | Add condition input and optional childcare-center comparison table. |
| `real-pet-health-visit-routine` | Catalog review | Checklist, routine calendar | `source_replacement`, `routine_calendar`, `memo_card` | Find a direct vet visit/vaccination source and re-audit. | Add multiple reminder types and visit-question memo export. |
| `real-ohouse-movein-cleaning-check` | Reshape before featured | Comparison table, checklist | `decision_table`, `memo_card` | Rebuild as cost comparison, contract scope check, and post-cleaning inspection. | Combine comparison table with proof/reclean request memo. |
| `real-thankyou-bubu-home-workout-starter` | Catalog review | Comparison table, routine calendar | `source_replacement`, `decision_table`, `routine_calendar` | Replace broad channel source with exact starter video or playlist. | Add video candidate comparison into routine calendar generation. |
| `real-thankyou-bubu-20min-routine` | Catalog review | Routine calendar, memo | `source_replacement`, `routine_calendar`, `memo_card` | Replace broad channel source with exact 20-minute video or playlist. | Add rest days, weekly completion summary, and shared adjustment memo. |
| `real-fitvely-diet-record-routine` | Catalog review | Spreadsheet, routine calendar | `source_replacement`, `spreadsheet_log`, `routine_calendar` | Replace broad site source with exact diet-log source and fixed columns. | Add spreadsheet-first preview and multiple reminder rules. |
| `real-fitvely-weekly-body-check` | Catalog review | Spreadsheet, memo | `source_replacement`, `spreadsheet_log`, `memo_card` | Replace broad site source with exact weekly check-in source. | Add weekly measurement sheet and review memo export. |

## Immediate Next Steps

1. Build the representative implementation targets in priority order, starting with the moving and decision surfaces because they are already public-demo-critical.
2. Keep broad-source routes visible only as catalog review until exact URLs are assigned.
3. Add source replacement tickets before any broad-source Flow is promoted.
4. Treat spreadsheet/log UX as a first-class output type; do not force diet, study, or body-check Flows into checklist-only UI.
