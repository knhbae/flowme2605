# Mobile Simulation Protocol

Date: 2026-05-25

## Decision

Because real user recruiting is currently difficult, the next internal review step is a structured mobile simulation protocol for the three current candidate routes.

This is not validation. A route remains unvalidated until real user behavior is observed.

| Route | Simulation score | Status after simulation | Next evidence step |
| --- | ---: | --- | --- |
| `computer-skills-d30-study` | 82 | Representative-eligible after internal simulation, not validated | Observe whether the user understands prefilled source rows and exports calendar plus sheet |
| `diet-habit-2week` | 74 | Public MVP candidate with guardrails after internal simulation, not validated | Rehearse warning, observation table, stop/consult condition, and memo on mobile |
| `new-car-delivery-check` | 76 | Public MVP candidate with guardrails after internal simulation, not validated | Rehearse a mobile delivery-bay evidence capture before checklist completion |

Average score: 77.

Validated route count: 0.

## Protocol Fields

Each protocol record must include:

- Persona and mobile context.
- Task script that the evaluator follows without adding explanation.
- Required artifact outputs.
- Pass signals.
- Failure signals.
- Simulation score and rationale.
- Next observed-session action.
- Explicit `not validated` status.

## Route Notes

### `computer-skills-d30-study`

- Task: enter exam date, inspect source-derived rows, export D-30 calendar and study spreadsheet.
- Pass signal: user can identify the calendar output and understands that source scope rows are prefilled.
- Failure signal: user thinks they must design the progress table from scratch.
- Risk: low, but copy must not imply exam outcome guarantees.

### `diet-habit-2week`

- Task: enter start date, begin the observation sheet, find stop/consult conditions, export the sheet and memo.
- Pass signal: user starts with observation rather than prescription or outcome targets.
- Failure signal: user reads the route as diet prescription.
- Risk: health-sensitive; warning hierarchy and stop/consult wording must stay near the first artifact.

### `new-car-delivery-check`

- Task: enter vehicle/dealer context, fill defect/photo/dealer confirmation fields, export evidence sheet and hold memo.
- Pass signal: user fills the evidence table before checklist completion.
- Failure signal: user treats checklist completion as acceptance readiness.
- Risk: money-at-risk; FLOW records evidence and questions, not signing advice.

## Follow-Up Queue

1. Capture Flow Lab mobile simulation protocol screenshot.
2. Run one mobile session rehearsal per route using the protocol.
3. Record observed-session notes separately from internal simulation notes.
4. Keep the three routes out of any `validated` language until real user behavior exists.

## Screenshot

![Mobile Simulation Protocol Flow Lab panel](../screenshots/2026-05-25-mobile-simulation-protocol-flow-lab.png)
