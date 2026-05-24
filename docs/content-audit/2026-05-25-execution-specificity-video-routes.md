# Execution Specificity Audit For Video Routes

Date: 2026-05-25

## Decision

The real-source audit state is not enough by itself. A route can be source-reviewed and still be too thin for a real user.

The immediate issue is exact follow-along workout video content. The user can be willing to open the original YouTube video, but FLOW still needs to say:

- what the user does first,
- where the source video remains authoritative,
- what FLOW summary is only an execution aid,
- what the user records after the session,
- when to stop or consult a professional.

## Natural Artifact Simulation

Route: `real-thankyou-bubu-video-full-body-no-jump`

Simulated user input:

- Start date: 2026-06-01
- Repeat: Mon/Wed/Fri 20:30
- Plan: 4 weeks
- Condition note: "beginner, no jumping preferred"

Expected outside artifacts:

- Calendar: recurring workout event with the original YouTube link.
- Memo/sheet: session completion, intensity, pain/dizziness, next-session adjustment.
- FLOW check: one action is done after the user opens the video, completes or stops the session, and records condition.

Previous UX gap:

- The Flow said to register a workout and run the video, but the item detail did not separate summary, detailed view, source-video authority, post-workout log, and explicit stop condition.

Current change:

- Exact workout video details now keep the one-action route shape but include summary, detailed execution guide, original video instruction, post-workout record, and stop/consult condition.

## Category Pass

| Category | Current Risk | Required Shape |
|---|---|---|
| Exact workout video | Source can be correct but execution copy can still feel like "just exercise." | One action, source link primary, detail guide, condition log, stop condition. |
| Diet/body composition | Principle videos can become over-broad diet plans. | One next-meal/log/review action, observation language, restrictive-behavior stop condition. |
| Study/exam | Tips can be forced into fake progress tables. | Progress rows only from source curriculum, scope, lessons, assignments, or past-exam rounds. |
| Moving/admin | Generic checklist can hide deadlines, evidence, and document proof. | Calendar/list plus submission or proof memo fields. |
| Baby/health logistics | Experience and official guidance can blur. | Official source, caregiver note, observation log, professional-contact condition. |
| Vehicle/purchase | Decision risk can be flattened into "check done." | Comparison rows, evidence fields, buy/hold memo, re-check condition. |
| Recipe/menu | Recipe content can become a vague routine. | Meal slots, ingredients, prep notes, reaction/leftover log. |

## Route Status

| Route | Label | Notes |
|---|---|---|
| `real-thankyou-bubu-video-full-body-no-jump` | `execution-specific` for the first exact-workout pass | Still not validated; needs real user observation. |
| `real-thankyou-bubu-video-daily-stretch-9min` | `execution-specific` for the first exact-workout pass | Source video remains authoritative for movement details. |
| `real-thankyou-bubu-video-no-knee-cardio-strength` | `execution-specific` for the first exact-workout pass | Stop condition is important because the source premise mentions lower joint burden. |
| Other exact workout videos | Needs follow-up review | The generator improvement applies broadly, but each route still needs source-level review before promotion. |
| FITVELY diet/nutrition exact videos | Needs follow-up review | Next pass should test whether diet principles produce a concrete next-meal/log artifact without implying results. |

## Follow-Up

- Audit diet/body-composition exact videos with the same execution-specificity lens.
- Audit broad channel routes separately; broad sources should not be representative candidates until replaced with exact video, playlist, article, or program sources.
- Keep the first-user validation scripts as the source of evidence. Do not mark these routes validated from internal simulation.

