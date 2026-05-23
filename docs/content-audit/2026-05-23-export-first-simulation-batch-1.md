# 2026-05-23 Export-First UX + Content Simulation Batch 1

This pass reviews three route candidates by simulating real user execution: anchor input, natural artifact creation, copy/export destination, local check/record behavior, and current UX/content gaps.

## Simulation Decisions

| Flow | Decision | External artifact | Reason | Hold |
| --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | Final promotion QA candidate | Calendar + sheet | Low risk, clear exam-date anchor, and realistic D-30 calendar plus mock-score log. | Needs desktop/mobile screenshot QA and export preview check before actual representative promotion. |
| `new-car-delivery-check` | Public MVP after UX fix | Sheet + memo | Defect evidence table is useful at delivery day. | Money-at-risk handover decision must stay as documentation, not advice. |
| `diet-habit-2week` | Public MVP after UX fix | Sheet | Observation sheet fits two-week meal/activity/condition logging. | Medical-sensitive framing requires warning hierarchy QA. |

## Natural Artifact Simulation

### `computer-skills-d30-study`

- Scenario: user has an exam on `2026-06-22`.
- Inputs: `examDate=2026-06-22`, weekday study 60 minutes, weekend study 120 minutes, weak area `spreadsheet functions and pivot tables`.
- Artifact rows:
  - `calendarRow=D-30 2026-05-23 install CBT tool and split written/practical scope`
  - `chapterRow=week1 scope=spreadsheet functions targetDate=2026-05-29 status=in progress`
  - `mockRow=mockScore=68 wrongAnswers=function formulas, pivot table retryDate=2026-06-02`
- Current gap: export preview should show the score-log row before representative promotion.
- UX/content fix: keep the first action tied to exam date and score/wrong-answer logging.

### `new-car-delivery-check`

- Scenario: user is inspecting a white Avante CN7 at a dealer delivery bay on `2026-06-03`.
- Inputs: vehicle, VIN suffix, dealer, delivery place, defect photo filenames.
- Artifact rows:
  - `defectRow=driver door lower scratch photo=door-scratch-4821.jpg dealerConfirmed=hold delivery until written confirmation`
  - `optionRow=ADAS camera calibration pending dealerMemo=confirm before plate registration`
  - `documentRow=insurance active registration pending signatureStatus=do not sign until defect memo is attached`
- Current gap: photo filename and dealer confirmation fields need top-screen emphasis.
- UX/content fix: keep defect proof, document status, and personal decision memo separate.

### `diet-habit-2week`

- Scenario: user starts a two-week observation log on `2026-06-01`.
- Inputs: start date, observation goal, no calorie prescription, no medical advice.
- Artifact rows:
  - `day1 meal=breakfast oatmeal, lunch kimbap, dinner tofu activity=30m walk condition=normal`
  - `day3 meal=late dinner activity=none condition=tired stopCondition=consult professional if dizziness repeats`
  - `weeklyReview=late dinner and low sleep correlate with snack cravings`
- Current gap: warning hierarchy should be reviewed before broader public framing.
- UX/content fix: keep meals, activity, sleep, condition, and stop condition as sheet columns.

## UX Review

Findings:
1. **High / Export-first clarity:** all three routes need exported artifact examples to remain visible in operator review before any exposure change.
2. **Medium / Feature diet:** native record keeping should remain secondary; adding a full tracker would make Stage 0 screens heavier.
3. **Medium / Risk boundary:** new-car and diet routes are strong public MVP candidates, but representative framing would overstate readiness.
4. **Low / Operability:** computer-skills has the cleanest export-first path and should be the first final QA candidate.

Rubric:
- User Need Fit: computer 4, new-car 4, diet 4
- Execution Clarity: computer 4, new-car 4, diet 4
- Content Fidelity: computer 4, new-car 4, diet 4
- Portability: computer 4, new-car 4, diet 4
- Cognitive Load: computer 3, new-car 3, diet 3
- Copy Specificity: computer 4, new-car 4, diet 4
- Source/Safety: computer 4, new-car 3, diet 3
- Accessibility/Operability: computer 3, new-car 3, diet 3

Recommended fixes:
1. Surface this simulation queue in Flow Lab.
2. Keep all three routes in lifecycle `fix` until final browser/export QA.
3. Promote only `computer-skills-d30-study` after screenshot and export download QA.
4. Keep `new-car-delivery-check` and `diet-habit-2week` as public MVP candidates after focused UX/risk fixes.

