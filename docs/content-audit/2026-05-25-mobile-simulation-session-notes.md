# Mobile Simulation Session Notes

Date: 2026-05-25

## Scope

This is an internal evaluator rehearsal using the mobile simulation protocol. It is not user validation.

Routes:

- `computer-skills-d30-study`
- `diet-habit-2week`
- `new-car-delivery-check`

Device assumption: 375px mobile viewport, one-handed scanning, user has low patience for explanatory text, and the evaluator does not add verbal help beyond visible UI.

## Summary

| Route | Rehearsal result | Main friction | Next small fix |
| --- | --- | --- | --- |
| `computer-skills-d30-study` | Pass with watch item | Prefilled source rows are understandable in concept, but mobile table density can hide the distinction between source scope and editable execution fields | Add the observed-session prompt: ask user to point to one source field and one editable field before export |
| `diet-habit-2week` | Pass with guardrail watch | Warning, observation sheet, stop/consult condition, and weekly memo are all relevant, but they can compete for attention | In the user session script, require the user to find the stop/consult condition before export |
| `new-car-delivery-check` | Partial pass | Evidence table is correct, but checklist completion can still feel like the main progress signal in a high-pressure delivery setting | In the user session script, make one defect row mandatory before any checklist completion task |

Validated route count: 0.

## Session Notes

### `computer-skills-d30-study`

**Persona:** A learner opens the route on mobile after choosing an exam date and wants a calendar plus study spreadsheet.

**Task script used:**

1. Enter exam date.
2. Identify the first calendar artifact.
3. Identify the study sheet artifact.
4. Explain which table values came from the source and which fields are for the user.
5. Export calendar and sheet.

**Natural output simulated:**

- Calendar: D-30 milestones for setup, weak area review, mock test, final review.
- Sheet: source-derived chapter/scope row, target date, status, note, mock score, wrong-answer type, retry date.

**Pass signals:**

- The first job is still export-first: calendar and sheet.
- The route does not ask the user to design a blank progress table.
- The source-derived row concept is present enough to rehearse.

**Failure signals to watch in real session:**

- User cannot tell source scope from editable execution fields.
- User scrolls past the calendar export because the table feels like the main surface.
- User thinks the score log predicts passing.

**Next script change:** Before export, ask: "Which field here should you not rewrite because it came from the source, and which field will you edit after export?"

### `diet-habit-2week`

**Persona:** A user wants to observe food, activity, sleep, and condition for two weeks, not receive a diet prescription.

**Task script used:**

1. Enter start date.
2. Find the daily observation sheet.
3. Find the stop/consult condition.
4. Add one realistic day row.
5. Export the sheet and explain what the weekly memo is for.

**Natural output simulated:**

- Sheet row: day, meal notes, activity, sleep, optional measurement, condition, stop/consult condition.
- Memo: weekly observation pattern, not advice.

**Pass signals:**

- Observation wording is stronger than diet-result wording.
- Stop/consult conditions are a clear risk boundary.
- The exported sheet can stand outside FLOW.

**Failure signals to watch in real session:**

- User treats the route as prescription.
- User cannot find stop/consult condition before export.
- User treats weekly memo as coaching advice rather than self-observation.

**Next script change:** The session moderator must ask the user to find the stop/consult condition before the export step. If they cannot, the mobile first screen still needs hierarchy work.

### `new-car-delivery-check`

**Persona:** A buyer is at a delivery bay and needs evidence rows, photo filenames, dealer confirmation, and a personal hold memo.

**Task script used:**

1. Enter vehicle and dealer context.
2. Fill one defect evidence row.
3. Add photo filename.
4. Add dealer confirmation.
5. Export evidence sheet and hold memo.
6. Only then inspect checklist completion.

**Natural output simulated:**

- Evidence row: defect, photo filename, dealer confirmation, document status, owner, follow-up.
- Memo: personal hold/signing boundary, not advice.

**Pass signals:**

- The first useful output is now evidence, not generic inspection completion.
- Dealer confirmation and photo filenames survive export.
- FLOW stays out of the sign/refuse decision.

**Failure signals to watch in real session:**

- User checks items before creating any evidence row.
- User cannot tell whether dealer confirmation is a required field.
- User thinks completed checklist means the vehicle is safe to accept.

**Next script change:** The session must require one defect row before any checklist task. If the user naturally goes to checklist completion first, the first artifact needs stronger visual priority.

## Next UX/Content Queue

1. Observed-session script for `computer-skills-d30-study`: source row vs editable row comprehension.
2. Observed-session script for `diet-habit-2week`: stop/consult condition findability before export.
3. Observed-session script for `new-car-delivery-check`: evidence row before checklist completion.
4. After real sessions, update route copy or UI only from observed failure evidence.

