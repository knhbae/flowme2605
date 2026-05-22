# 2026-05-22 Real-Source Natural Artifact Audit

This report starts the full review of the 40 `source_status=real` Flows. It uses the new artifact-first method: open the original source, simulate realistic user input values, write the artifact a user would naturally make, then compare that artifact with the current Flow content and UX.

## Coverage

| Metric | Count |
| --- | ---: |
| Real-source Flows | 40 |
| First batch audited | 8 |
| Remaining real-source Flows | 32 |

First batch selection intentionally avoids auditing only one cluster. It covers official service pages, household routines, exam/admin deadlines, childcare/medical-sensitive content, pet registration, moving/financial-sensitive content, and travel health.

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

## Source Evidence Used

- Samsung aircon service page: maintenance/cleaning value, process, professional service guidance, and contact paths were visible at `https://www.samsungsvc.co.kr/info/maintenance`.
- Samsung washer filter page: the page states the drain filter should be cleaned weekly and warns about remaining water, reassembly, and locking at `https://www.samsungsvc.co.kr/solution/1978102`.
- Q-Net page: the page exposes accepted ID rules and exam-day ID requirements at `https://www.q-net.or.kr/rcv002.do?gSite=L&id=rcv002_identi`.
- Gov24 moving report page: the URL redirected to a maintenance notice during review, so this source remains catalog review until the actual 민원 안내 body is rechecked.
- Childcare portal page: the page covers 4-6 month health checkup, 4-month vaccination, symptoms, and outing preparation at `https://www.childcare.go.kr/?menuno=439`.
- Animal registration page: the page covers registration 대상, methods, visit requirement, and delegated application requirements at `https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66`.
- Ohouse moving guide: the page structures one-room moving around two weeks before, the day before, moving day, and within seven days after at `https://ohou.se/advices/12199`.
- KDCA travel health page: the page advises checking country risks, vaccination/preventive medication, supplies, and medical consultation before travel at `https://www.kdca.go.kr/menu.es?mid=a20102060200`.

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

### Checklist

Checklist Flows need proof or long-term reference notes when the source is administrative.

Examples:

- Gov24 moving report: proof fields should include receipt number, status, screenshot location, and follow-up tasks.
- Pet registration: registration number, agency, owner contact, and change-report conditions should be stored as a durable memo card.

### Comparison Table

Some timeline sources naturally create comparison tables.

Example:

- Ohouse moving: `후보A=용달 18만원`, `후보B=반포장 32만원` should produce a mover/vendor comparison table before the user commits.

## Next Batch

Audit the remaining 32 real-source Flows in this order:

1. Finish official/admin sources with exact pages: resident register copy, childcare support, vehicle inspection, license renewal.
2. Review exact video clusters by template: ThankyouBUBU exact videos and FITVELY exact videos can share a routine-video artifact template, but each still needs exact title/source matching.
3. Review broad-source flows last: FITVELY broad pages, ThankyouBUBU channel pages, Q-Net/Sinagong broad learning Flow, travel broad source, pet health broad source.

Do not promote any real-source Flow from derived review to manual source-fit without at least one concrete natural artifact simulation.
