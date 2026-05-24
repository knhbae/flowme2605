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
- Add a post-workout condition log: done, intensity, pain/dizziness, next-session adjustment.
- Add a stop condition for pain, dizziness, breathing difficulty, or known condition worsening.

Do not:

- Invent exact movement sequences that were not extracted from the source.
- Present FLOW text as an exercise prescription.
- Split one follow-along video into many checklist items unless separate source sections have separate completion criteria.

Current example:

- `real-thankyou-bubu-video-full-body-no-jump` keeps one action and now separates summary, detailed execution guide, original video, post-workout log, and stop condition.

### Diet Or Body Composition Content

Use when the source is a diet principle, body-composition explainer, nutrition tip, or measurement habit.

Required:

- Convert to one next meal, one log, one measurement review, or one stop/consult memo.
- Preserve risk wording as observation, not guarantee.
- Add a stop condition for restrictive behavior, dizziness, pain, binge trigger, or medical concern.

Do not:

- Turn a principle video into a full diet plan unless the source is an explicit program.
- Promise weight loss or body-size outcomes.

### Study Or Exam Content

Use a progress table only when the source has rows: table of contents, curriculum, exam scope, past-exam rounds, weekly plan, lesson list, or assignment set.

Required:

- The creator pre-fills source-derived rows.
- Users edit only execution fields such as target date, status, memo, wrong-answer note, retry date, weak area, or score.
- `computer-skills-d30-study` is the current reference example.

Do not:

- Force a progress table from reviews, tips, advice, or motivation content.

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

