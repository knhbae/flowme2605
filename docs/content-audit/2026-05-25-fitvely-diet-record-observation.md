# FITVELY Diet Record Observation Reshape

Date: 2026-05-25

## Decision

`real-fitvely-diet-record-routine` is now a spreadsheet-first observation Flow, not a five-step diet habit routine.

The route uses one exact FITVELY nutrition video source and converts it into one user action: choose one source rule, record one meal and condition row, and stop or consult if restrictive or unsafe signals appear.

No representative, public-MVP, or validation status changes in this batch.

## Conversion Decision

- User need: As a diet-record user, I need to move one source rule into a sheet row, so that I can observe one meal and condition without treating FLOW as a diet prescription.
- Content shape: exact creator nutrition video.
- Primary destination: sheet.
- Structure: one action plus one observation table.
- Action count: 1.
- Playbook: diet/body-composition observation; one selected rule, one application, one record, one stop condition.
- Exception: no automatic diet plan generation, no weight-loss promise, no invented gram targets beyond what the source video says.
- Risk/source handling: creator source link remains visible; caution text covers restriction, binge trigger, dizziness, pain, existing condition concern, and professional consultation.

## Natural Artifact Simulation

Route: `real-fitvely-diet-record-routine`

Simulated user:

- Goal: use a FITVELY video as a lightweight diet log reference.
- Inputs: `2026-06-01`, lunch memo, selected source rule, hunger/dizziness condition, next adjustment.
- Outside artifact: spreadsheet row, not a FLOW-native long-term diet record.

Expected output:

- Sheet columns: date, meal memo, selected rule, condition, next adjustment.
- Rows: one meal record, exercise/sleep/condition memo, weekly adjustment memo.
- Source link preserved so the user can reopen the original video before applying a rule.
- Stop/consult condition visible before the user interprets the sheet as advice.

## Current UX Gap

The route is now smaller and more concrete than the earlier broad daily routine, but actual users have not been observed choosing a rule from the video and filling the sheet.

The next check should focus on whether users understand:

- They are choosing one source rule, not receiving a full diet prescription.
- They can leave fields blank when not relevant.
- They should stop and consult when restriction, binge trigger, dizziness, pain, or medical concern appears.

## Follow-Up

1. Run a simulated or observed session where a user opens the video, chooses one rule, and fills one row.
2. Decide later whether weekly review or reminder rules are needed from observed friction, not by adding features preemptively.
3. Apply the same observation guardrail to the remaining FITVELY nutrition routes only after checking each source shape.

## Screenshots

- `docs/screenshots/2026-05-25-fitvely-diet-record-observation-desktop.png`
- `docs/screenshots/2026-05-25-fitvely-diet-record-observation-mobile.png`
