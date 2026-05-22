# 2026-05-22 Real-Source Natural Artifact Audit

This report starts the full review of the 40 `source_status=real` Flows. It uses the new artifact-first method: open the original source, simulate realistic user input values, write the artifact a user would naturally make, then compare that artifact with the current Flow content and UX.

## Coverage

| Metric | Count |
| --- | ---: |
| Real-source Flows | 40 |
| Audited real-source Flows | 16 |
| Remaining real-source Flows | 24 |

The first two batches intentionally avoid auditing only one cluster. They cover official service pages, household routines, exact workout videos, diet/logging videos, exam/admin deadlines, childcare/medical-sensitive content, pet registration, moving/financial-sensitive content, travel safety, travel health, and vehicle administration.

## Method

For each source, record:

1. Source evidence from the original page.
2. A realistic user scenario.
3. One or more natural artifacts the user would create without knowing FLOW.
4. Concrete simulated input values.
5. Expected artifact output.
6. Current Flow content match.
7. Current UX support.
8. Remaining content and UX gaps.

## Batch Summary

| Flow | Natural Artifacts | Decision | Main Gap |
| --- | --- | --- | --- |
| `real-samsung-aircon-seasonal-care` | Monthly calendar, memo | Promote to manual source-fit | Needs service reservation/counseling memo preview. |
| `real-samsung-washer-filter-care` | Routine calendar, checklist | Promote to manual source-fit | Weekly frequency and safety warnings need to appear in the routine preview. |
| `real-qnet-application-examday-check` | Monthly calendar, spreadsheet | Reshape content or UX | Needs multiple deadlines beyond exam date. |
| `real-gov24-moving-report-check` | Checklist, memo | Keep catalog review | Source page was unavailable during check; needs re-check and proof memo fields. |
| `real-childcare-vaccination-visit-prep` | Monthly calendar, memo | Reshape content or UX | Needs structured medical visit notes and post-visit observation. |
| `real-pet-registration-check` | Checklist, memo | Promote to manual source-fit | Needs agency candidate notes and long-term registration number card. |
| `real-ohouse-moving-d30-prep` | Monthly calendar, comparison table | Reshape content or UX | Needs moving-company comparison and financial proof memo. |
| `real-kdca-travel-health-check` | Monthly calendar, memo | Reshape content or UX | Needs destination/official-check-date fields and medical consultation notes. |
| `real-thankyou-bubu-video-full-body-no-jump` | Routine calendar, memo | Reshape content or UX | Needs recurring weekday calendar and post-workout body-condition log. |
| `real-thankyou-bubu-video-daily-stretch-9min` | Routine calendar, todo list | Reshape content or UX | Needs repeat-day and rest-day settings, plus trigger-based routines before/after another workout. |
| `real-fitvely-video-body-fat-6kg-method` | Spreadsheet, routine calendar | Reshape content or UX | Needs diet/workout/measurement logs and multiple recurrence rules in one calendar. |
| `real-fitvely-video-workout-split-science` | Routine calendar, comparison table | Reshape content or UX | Needs split-routine comparison before generating the weekly/monthly workout calendar. |
| `real-sinagong-computer-d30-study` | Monthly calendar, spreadsheet | Reshape content or UX | Needs source-material links, exam round planning, scores, and wrong-answer logs. |
| `real-mofa-overseas-travel-prep` | Monthly calendar, memo | Reshape content or UX | Needs destination-specific official check fields and an emergency contact card export. |
| `real-ts-vehicle-inspection-prep` | Monthly calendar, checklist | Promote to manual source-fit | Needs reservation card, official inspection steps, and post-inspection repair follow-up. |
| `real-safe-driving-license-renewal` | Monthly calendar, comparison table | Reshape content or UX | Needs license type branching and optional deadline input instead of a flat checklist. |

## Source Evidence Used

- Samsung aircon service page: maintenance/cleaning value, process, professional service guidance, and contact paths were visible at `https://www.samsungsvc.co.kr/info/maintenance`.
- Samsung washer filter page: the page states the drain filter should be cleaned weekly and warns about remaining water, reassembly, and locking at `https://www.samsungsvc.co.kr/solution/1978102`.
- Q-Net page: the page exposes accepted ID rules and exam-day ID requirements at `https://www.q-net.or.kr/rcv002.do?gSite=L&id=rcv002_identi`.
- Gov24 moving report page: the URL redirected to a maintenance notice during review, so this source remains catalog review until the actual 민원 안내 body is rechecked.
- Childcare portal page: the page covers 4-6 month health checkup, 4-month vaccination, symptoms, and outing preparation at `https://www.childcare.go.kr/?menuno=439`.
- Animal registration page: the page covers registration 대상, methods, visit requirement, and delegated application requirements at `https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66`.
- Ohouse moving guide: the page structures one-room moving around two weeks before, the day before, moving day, and within seven days after at `https://ohou.se/advices/12199`.
- KDCA travel health page: the page advises checking country risks, vaccination/preventive medication, supplies, and medical consultation before travel at `https://www.kdca.go.kr/menu.es?mid=a20102060200`.
- ThankyouBUBU exact video pages: the selected titles frame the source as low-impact full-body exercise and 9-minute full-body stretching routines at `https://www.youtube.com/watch?v=pcyrlkHXAdE` and `https://www.youtube.com/watch?v=aob4Lh1Vebk`.
- FITVELY exact video pages: the selected titles frame one source as diet/body-fat reduction and another as workout routine design with split, sets, weight, rest, and exercise selection at `https://www.youtube.com/watch?v=EQcoKqDO8Ds` and `https://www.youtube.com/watch?v=-GJMwcES45A`.
- Sinagong page: the site exposes exam categories, 자료실, 기출문제, 시험대비자료, 핵심요약집, CBT, and online scoring for certification study planning at `https://www.sinagong.co.kr/`.
- MOFA overseas safety page: the service exposes country/region travel alerts, travel pre-checks, crisis manuals, consular safety call center, and itinerary registration at `https://www.0404.go.kr/`.
- TS vehicle inspection page: the page describes inspection procedure groups including 관능검사, ABS, 하체, 전조등, 배출가스, and result explanation at `https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104`.
- SafeDriving license guide: the page separates license/aptitude/renewal cases with fees, photo requirements, online/delegated application availability, and receipt restrictions at `https://www.safedriving.or.kr/guide/larGuide10.do?menuCode=MN-PO-12111o`.

## Output-Type Findings

### Timeline

Timeline Flows are not only date input. The audit must test whether the resulting month calendar shows the actual date clusters a user expects.

Examples:

- Aircon: `사용시작일=2026-06-15` should generate late-May model/condition checks and early-June reservation/after-service checks.
- Q-Net: `시험일=2026-07-12` is insufficient alone; the user also needs `접수마감=2026-06-10 18:00`.
- KDCA: `출국일=2026-07-20`, `국가=베트남` should generate a much earlier vaccine/consultation window.

### Routine

Routine Flows must show recurrence and safety checks in the calendar preview, not only a start date.

Example:

- Washer filter: `시작일=2026-06-06`, `반복=매주 토요일 오전` should produce a weekly drain-filter event with remaining-water/reassembly warnings.
- ThankyouBUBU full-body: `시작일=2026-06-01`, `반복=월/수/금 20:30`, `기간=4주` should produce visible workout instances across the month plus post-workout condition notes.
- ThankyouBUBU stretch: `반복=평일 07:40`, `휴식=토/일` should produce only weekday events and show rest days explicitly.
- FITVELY split routine: `분할=상체/하체`, `운동일=월/화/목/금` should first compare routine candidates, then generate the selected split calendar.

### Checklist

Checklist Flows need proof or long-term reference notes when the source is administrative.

Examples:

- Gov24 moving report: proof fields should include receipt number, status, screenshot location, and follow-up tasks.
- Pet registration: registration number, agency, owner contact, and change-report conditions should be stored as a durable memo card.
- SafeDriving license renewal: the user must first choose a case such as 2종 갱신, 1종 적성검사, or 재발급; the checklist should then filter preparation items by that case.

### Comparison Table

Some timeline sources naturally create comparison tables.

Example:

- Ohouse moving: `후보A=용달 18만원`, `후보B=반포장 32만원` should produce a mover/vendor comparison table before the user commits.
- FITVELY workout design: `후보A=무분할 주3회`, `후보B=상하체 주4회`, `후보C=3분할 주5회` should produce a split-routine comparison table before calendar generation.
- SafeDriving license guide: case comparison should include preparation items, photo count, fees, online availability, delegated application, and receipt restrictions.

### Spreadsheet / Log

Diet and study sources often require logs, not only checklists.

Examples:

- FITVELY body-fat: `목표=체지방 -2kg`, `측정=월요일 아침` should produce a daily diet/workout log plus weekly measurement summary.
- Sinagong study: `시험일=2026-07-05`, `평일공부=90분` should produce both a D-30 study calendar and a score/wrong-answer spreadsheet.

### Emergency / Proof Memo

Official travel and administrative sources often create durable reference notes.

Examples:

- MOFA travel safety: emergency memo should include consular call center, local embassy, insurance, accommodation, family contact, and passport-copy location.
- TS vehicle inspection: inspection result memo should include result sheet, recommended repairs, deadline, estimated cost, and next inspection reminder.

## Next Batch

Audit the remaining 24 real-source Flows in this order:

1. Finish remaining official/admin sources with exact pages: resident register copy, childcare support, pet health visit, move-in cleaning.
2. Finish the exact video clusters with a reusable but still source-specific routine/log template: remaining ThankyouBUBU exact videos and FITVELY exact videos.
3. Review broad-source flows last: FITVELY broad pages, ThankyouBUBU channel pages, pet health broad source, and any source that needs replacement before public promotion.

Do not promote any real-source Flow from derived review to manual source-fit without at least one concrete natural artifact simulation.
