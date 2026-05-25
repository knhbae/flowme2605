# Execution Specificity Rules

## Why This Exists

`source reviewed` only means the route has a usable source boundary. It does not prove that a user can execute the Flow without guessing.

Before a Flow is treated as a public MVP or representative candidate, the editor must check whether the route gives the user enough concrete next-action detail for the destination artifact.

## Core Rule

Every Flow must answer:

- What should the user do first?
- Which outside tool receives the artifact?
- What source-derived detail is preserved?
- What should the user record after acting?
- What stop, hold, consult, or re-check condition applies?

If those answers are missing, do not solve the problem by adding generic steps. Reshape the artifact, copy, or source choice.

## Category Standards

### Exact Follow-Along Workout Video

Use when the source is one exact workout video.

Required:

- Keep the Flow as one execution action unless the source itself is a multi-part program.
- Put the original video link in the detail panel.
- Include a short execution summary.
- Include a "detailed view" guide that tells the user how to prepare, open the source, execute, and record condition.
- If the Flow exports to a repeated calendar event, repeat the preparation, execution, source link, post-workout record cue, and stop condition in the event description so the user can act from the reminder.
- Add a post-workout condition log: done, intensity, pain/dizziness, next-session adjustment.
- Add a stop condition for pain, dizziness, breathing difficulty, or known condition worsening.

Do not:

- Invent exact movement sequences that were not extracted from the source.
- Present FLOW text as an exercise prescription.
- Hide execution detail only in page-level copy when the natural output is a calendar reminder.
- Split one follow-along video into many checklist items unless separate source sections have separate completion criteria.

Current example:

- `real-thankyou-bubu-video-full-body-no-jump` keeps one action and now separates summary, detailed execution guide, original video, post-workout log, and stop condition.

### Workout-Plan Video

Use when the source is one video about workout order, split, set/rest method, bulk-up method, or program design.

Required:

- Keep one exact-video route as one action unless the source contains a multi-week program with source-derived rows.
- Use `hybrid` destination when the user needs both a weekly workout table and calendar/check state.
- Narrow the video to one selected rule before applying it.
- Add weekly workout table guidance: workout day, session order, target area, set/rest note, load or recovery note when relevant.
- Add a record field for performed/not performed, fatigue, pain/breathing issue, and next-session adjustment.
- Add a revise-or-hold condition for pain, excessive fatigue, breathing difficulty, poor recovery, or schedule conflict.

Do not:

- Treat workout programming content as a simple follow-along workout.
- Convert a broad principle into a complete training prescription.

Current examples:

- `real-fitvely-video-bulk-up-method`, `real-fitvely-video-workout-order`, and `real-fitvely-video-workout-split-science` stay one-action and hybrid, but their details now convert one selected rule into a weekly workout-plan record.

### Diet Or Body Composition Content

Use when the source is a diet principle, body-composition explainer, nutrition tip, or measurement habit.

Required:

- Convert to one next meal, one log, one measurement review, or one stop/consult memo.
- Preserve risk wording as observation, not guarantee.
- Add a stop condition for restrictive behavior, dizziness, pain, binge trigger, or medical concern.

Do not:

- Turn a principle video into a full diet plan unless the source is an explicit program.
- Promise weight loss or body-size outcomes.

Current examples:

- `real-fitvely-video-body-fat-6kg-method`, `real-fitvely-video-carb-reason`, and `real-fitvely-video-post-workout-nutrition` stay memo-first and limit the source to one selected rule, one application, one observation record, and one stop condition.

### Study Or Exam Content

Use a progress table only when the source has rows: table of contents, curriculum, exam scope, past-exam rounds, weekly plan, lesson list, or assignment set.

Required:

- The creator pre-fills source-derived rows.
- Users edit only execution fields such as target date, status, memo, wrong-answer note, retry date, weak area, or score.
- `computer-skills-d30-study` is the current reference example.

Do not:

- Force a progress table from reviews, tips, advice, or motivation content.

### Broad Source Replacement

Use when the current source is a channel page, creator site, broad official portal, FAQ collection, or broad study material site rather than an exact original.

Required:

- Keep the route out of representative and public MVP framing until the source is narrowed.
- Replace creator channel/site URLs with exact videos, playlists, posts, program pages, or source-defined row sets.
- Treat broad official portals as reference entry points only; add route-specific official pages before promotion.
- Preserve the source choice in the artifact so users know which video, page, row set, or checklist they are acting on.

Do not:

- Add invented movement sequences, diet rules, study rows, or administrative steps to hide missing source specificity.
- Use extra cards or explanation blocks as a substitute for exact source replacement.

Current broad-source review:

- The active broad-source replacement queue is currently empty.
- `real-fitvely-weekly-body-check` remains broad but is now a hidden/remove candidate because no matching FITVELY weekly body-check/check-in source was confirmed. Do not convert the broad site into measurement, photo, or adjustment rules.
- `real-thankyou-bubu-home-workout-starter` and `real-thankyou-bubu-20min-routine` now have exact video sources and a first exact-video reshape: each keeps one calendar-first action with summary, detailed guide, original video link, post-workout record, and stop condition. They still remain below public MVP/representative framing until observed user behavior shows users can execute and export the route.
- `real-fitvely-diet-record-routine` now has an exact diet video source and a first spreadsheet-first observation reshape: it keeps one source-rule action, one diet observation table, and a stop/consult boundary. It still remains below public MVP/representative framing until simulated or observed users can open the source, choose one rule, fill the sheet, and understand the boundary.
- `real-sinagong-computer-d30-study` now has an exact book source, but it still remains below public MVP/representative framing until source-derived progress rows and score/wrong-answer rows are reshaped or the route is merged with `computer-skills-d30-study`.
- `real-pet-health-visit-routine` now has an exact 서울시 우리동네 동물병원 source, but it still remains below public MVP/representative framing because the source is a regional support-program page with eligibility limits.
- `real-mofa-overseas-travel-prep` now has an exact 외교부 베트남 country safety source, but it still remains below public MVP/representative framing until country-check fields and emergency-card UX are reshaped.

### Moving, Admin, And Official-Service Flows

Required:

- Preserve dates, deadlines, documents, evidence fields, and official links.
- Put source facts and user notes in separate fields.
- Use memo cards or proof records when the natural artifact is a submission note or evidence bundle.

Do not:

- Hide official source checks inside generic checklist copy.

### Baby, Family, And Health Logistics

Required:

- Separate official guidance, caregiver notes, and risk warnings.
- Include what to prepare, what to observe, and when to contact a professional.
- Prefer meal calendars, reaction logs, visit memos, or prep checklists over generic "track progress" wording.

Do not:

- Treat anecdotal experience as official medical guidance.

### Vehicle, Purchase, And Comparison Flows

Required:

- Use comparison rows, evidence photos, quote fields, or buy/hold decision memos when the user is deciding.
- Add "hold" or "re-check" conditions when missing evidence changes the decision.

Do not:

- Collapse a high-stakes decision into a simple done checklist.

### Recipe And Meal Menu Flows

Required:

- Preserve meal slots, ingredients, preparation notes, and reaction/leftover notes.
- Export to calendar or sheet depending on whether timing or repeated logging is primary.

Do not:

- Convert a recipe into a long routine unless the source is actually a repeated meal plan.

## Audit Labels

Use these labels in content audits:

- `execution-specific`: source, artifact, first action, and record fields are clear enough for a simulated user.
- `source-reviewed-but-thin`: source is acceptable, but users still need to infer execution details.
- `wrong-artifact`: source is usable, but the selected calendar/sheet/memo/checklist artifact does not match the job.
- `source-too-broad`: source is a channel, site, or broad reference and needs an exact source before promotion.

