# next_job2

## Context
- Branch: `design-ref-full-gap-alignment`
- PR: https://github.com/knhbae/flowme2605/pull/112
- Latest Vercel preview: https://flowme2605-m08bbz5gg-flowme.vercel.app
- User asked to apply `my_tests/250526_experiment_checklist.md` broadly, without further approval, then pull/push PR and deploy to Vercel.
- Do not touch unrelated untracked `design-ref/` or `next_job.md` unless explicitly requested.

## Implemented
- Reworked experiment-checklist routes away from unsupported leading artifacts:
  - `diet-habit-2week`: reduced to one 14-day sleep check calendar.
  - `baby-food-menu-recipe`: menu calendar only; no reaction record/log UI on the primary workbench.
  - `new-car-delivery-check` and `used-car-buying-check`: checklist-first; stale comparison export is ignored.
  - `moving-d30-basic`, `vehicle-inspection-prep`, `real-mofa-overseas-travel-prep`: compact list + month calendar, with removed memo/comparison surfaces.
  - `passport-renewal-docs`: checklist-first without memo-card surface.
  - `real-thankyou-bubu-home-workout-starter`, `real-fitvely-diet-record-routine`: check-only routine/calendar treatment.
- Updated export filtering so removed memo fields do not reappear from stale local state.
- Updated artifact plan, field config, execution model, seed conversion, and UI rendering tests to lock these UX/content decisions.
- Follow-up unit alignment:
  - `computer-skills-d30-study`: removed the extra progress/log tables from the primary artifact model and ignored stale progress-table state during export.
  - `baby-food-menu-recipe`: route UI and workbook export now keep menu calendar + recipe only and do not emit the reaction-log artifact for this experiment route.
- Follow-up copy/visual polish:
  - `computer-skills-d30-study`: checklist copy now points to D-30 calendar, execution item memo, Excel export, 실기 환경, 시험장 준비; removed old `챕터 진도표`, `모의점수 로그`, `기출 점수·오답 기록` language.
  - `baby-food-menu-recipe`: visible route description, setup helper, workbench title, and byline note now say menu/recipe rather than reaction record.
  - `real-mofa-overseas-travel-prep`: visible copy and item detail now use 외교부 해외안전여행, 여행경보, 입국 조건, 영사콜센터, 보험/이동, 가족 공유 language; creator display is official-data oriented while preserving the source-batch owner mapping.
- `250526_experiment_checklist.md` gap closure pass:
  - Removed the duplicate lower execution surfaces for the experiment-feedback routes so the public page keeps one artifact-first workbench.
  - Replaced `체크리스트 복사` default workbench copy with `메모/노션에 복사`.
  - Added `자세히` disclosures inside workbench checklist rows so source reason, action, completion criteria, caution, and links are available without reopening `flow-item-card`.
  - Kept moving/vehicle/MOFA/passport/study/checklist routes on a compact calendar/list surface and removed stale `전체 할 일`/`월별 달력` tab duplication on these routes.
  - Reduced ThankyouBUBU starter, FITVELY diet record, and diet habit routes to check-only calendar surfaces.
  - Kept baby food as menu calendar + recipe details in the workbench only; fixed multi-day meal slot checkbox state so export buttons activate correctly.
  - Restored generic routine routes to `회차 그리드 · primary` / `회차 기록표 · secondary` while keeping feedback-specific routines simplified.

## my_tests Reflection Status
### Done
- `diet-habit-2week`: applied the "one rule only" direction as a 14-day sleep/check calendar.
- `new-car-delivery-check`, `used-car-buying-check`: comparison-table-first treatment removed; checklist plus hold evidence now leads.
- `moving-d30-basic`, `vehicle-inspection-prep`: memo/comparison surfaces removed; compact checklist + month calendar remains.
- `passport-renewal-docs`: date/memo duplication reduced by keeping checklist-first behavior without memo card.
- `real-thankyou-bubu-home-workout-starter`, `real-fitvely-diet-record-routine`: weekly summaries/log cards reduced to check-only routine/calendar behavior.
- `computer-skills-d30-study`: extra chapter progress/log table no longer appears in the primary artifact config or export.
- `baby-food-menu-recipe`: primary workbench, execution detail, and workbook export now avoid the reaction-log artifact for this route.
- `computer-skills-d30-study`: browser-visible copy no longer references removed study artifacts and keeps the checklist/calendar model aligned.
- `baby-food-menu-recipe`: browser-visible copy no longer references `반응 기록`; the route presents menu calendar + recipe.
- `real-mofa-overseas-travel-prep`: checklist/detail/byline copy now reflects the exact 외교부 source and no longer shows the old travel-channel copy.
- Duplicate lower execution surfaces removed for the feedback routes listed above; e2e now checks absence of `flow-item-card`, stale `전체 할 일`/`월별 달력` buttons, and generic routine session summaries on those routes.
- `baby-food-menu-recipe`: recipe details are available from the workbench calendar rows; reaction-log UI remains hidden on this route.
- `diet-habit-2week`, `real-thankyou-bubu-home-workout-starter`, `real-fitvely-diet-record-routine`: check-only calendars no longer show `4주 12회차`, `다음 회차 기록`, or generic session cards.

### Partial / Needs Recheck
- None from the `my_tests/250526_experiment_checklist.md` follow-up batch. Meal/reaction-capable metadata still exists in shared meal-plan structures for future reuse and other routes, but this route no longer exposes reaction-log language in the checked browser path.

### Remaining To Do
- No open implementation task from this pass.
- If more UX polish is requested, focus on fresh user-session validation rather than adding more artifact surfaces.

## Verification Run
- `npm run docs:check`: passed, 14 required files and 306 local links.
- `npm test`: passed, 182/182.
- `npm run build`: passed.
- Targeted Playwright for changed routes: passed, 12/12.
- Full `npm run test:e2e`: passed, 69/69.
- Follow-up full verification after copy/visual polish:
  - `npm run docs:check`: passed, 14 required files and 306 local links.
  - `npm test`: passed, 182/182.
  - `npm run build`: passed.
  - `npm run test:e2e`: passed, 69/69.
  - Browser QA against `http://127.0.0.1:3000`: `computer-skills-d30-study`, `baby-food-menu-recipe`, `real-mofa-overseas-travel-prep` had no stale visible text (`챕터 진도표`, `모의점수 로그`, `기출 점수·오답 기록`, `반응 기록`, `여행에미치다`) and no horizontal overflow offenders at 1440px.
- Browser QA against `http://localhost:3001` with Playwright:
  - Desktop routes checked: `diet-habit-2week`, `real-thankyou-bubu-home-workout-starter`, `real-fitvely-diet-record-routine`, `baby-food-menu-recipe`, `moving-d30-basic`, `used-car-buying-check`, `new-car-delivery-check`, `passport-renewal-docs`, `real-mofa-overseas-travel-prep`.
  - Mobile checked: `diet-habit-2week`.
- Current follow-up verification:
  - `npm run build`: passed.
  - `npm run test:e2e`: passed, 72/72.
  - `npm test`: passed, 182/182.
  - `npm run docs:check`: passed, 14 required files and 306 local links.
  - Playwright browser QA on `http://127.0.0.1:3104` mobile viewport passed for 10 feedback routes: no stale `체크리스트 복사`, `flow-item-card`, `운동 캘린더 · primary`, `다음 회차 기록`, `4주 12회차`, and no horizontal overflow.

## Remaining For Next Chat
- PR #112 was previously updated by pushing branch `design-ref-full-gap-alignment`; this follow-up pass has not been pushed yet in this chat.
- Local Playwright verification used the production test server on `http://127.0.0.1:3104`.
