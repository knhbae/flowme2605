# First User Validation Script

## Purpose

Use this script before calling any route validated. The goal is to observe whether a target user can turn the Flow into a useful outside artifact, not whether they like the UI in a demo.

Record each session with [validation-sessions/TEMPLATE.md](../validation-sessions/TEMPLATE.md).

## Session Rules

- Do not explain the intended path before the user starts.
- Ask the user to think aloud, but do not lead them to the export button.
- Record screen, route, device class, and whether the user is on a real task or a simulated task.
- Stop the session if health, legal, financial, or official-document risk appears to be misunderstood.
- Mark a route validated only after behavior evidence is reviewed against [validation evidence](./validation-evidence.md).

## Common Observations

For every route, capture:

- Entry: where the user started and whether the route title matched their task.
- Setup: whether they set the date or other setup value without help.
- First action: what they tried first after opening the route.
- Artifact: whether they understood the natural artifact as calendar, checklist, sheet, or memo.
- Export: whether they copied/downloaded the artifact and where they planned to put it.
- Completion: whether they checked or edited at least one concrete action.
- Friction: any point where they hesitated, ignored the artifact, or treated FLOW as a blank editor.
- Return intent: whether they would reopen FLOW or only use the exported artifact.

## Route Scripts

### `computer-skills-d30-study`

User scenario: the user has a computer-skills test date and wants to move the D-30 study structure into a calendar or sheet.

Tasks:

- Open the route from the representative candidate entry point.
- Set a realistic test date.
- Inspect the source-derived progress table.
- Edit one target date and one status.
- Export the calendar or sheet.
- Explain where they would continue using the exported artifact.

Evidence needed:

- User recognizes the scope rows as prefilled from source/curriculum, not as rows they must design.
- User edits target date/status without trying to rewrite the source scope.
- User exports to calendar or sheet and can name the next study action.

Fail signals:

- User asks why they must invent the table rows.
- User tries to replace source scope rows before understanding the structure.
- User cannot tell whether the calendar or sheet is the main output.

### `diet-habit-2week`

User scenario: the user wants a low-risk observation sheet for diet habits, not medical advice.

Tasks:

- Open the route on mobile.
- Identify the first record field.
- Add one meal/condition observation.
- Find the stop/consult condition.
- Export or copy the sheet/memo.

Evidence needed:

- User treats the Flow as observation and guardrail logging.
- User does not interpret the route as a guaranteed weight-loss or treatment plan.
- User can move the artifact to a personal sheet or memo.

Fail signals:

- User follows it as medical instruction.
- User misses the stop/consult boundary.
- User finds the mobile first screen too dense to start logging.

### `new-car-delivery-check`

User scenario: the user is preparing for vehicle handover and wants a proof/evidence checklist.

Tasks:

- Open the route on mobile.
- Identify the handover risk warning.
- Add one evidence note or photo filename.
- Mark one handover action complete.
- Export or copy the evidence memo/checklist.

Evidence needed:

- User understands the artifact as a handover evidence record.
- User keeps proof notes separate from general advice.
- User can use the exported memo/checklist at the dealership.

Fail signals:

- User treats the route as replacing official contract or dealer confirmation.
- User misses the proof memo.
- User cannot find the first action before scrolling through secondary sections.

## Decision Rule

After a session, classify the route as:

- `no signal`: user did not reach setup or artifact output.
- `friction`: user reached part of the loop, but hesitation, missed source/risk boundary, mobile density, or export confusion blocks confidence.
- `candidate signal`: user set up, edited, and exported/copied the artifact with credible outside-use intent or real use.

`candidate signal` is not validation. Do not use `validated` until repeated observed behavior supports the complete loop and the evidence has been reviewed against [validation evidence](./validation-evidence.md).
