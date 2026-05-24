# FLOW Validation Evidence

## Rule

Do not call a route `validated` unless there is real user behavior data.

Internal QA, screenshots, green tests, source-fit review, and natural-artifact simulation can make a route representative-eligible or a public MVP candidate. They do not validate the route.

## Minimum Evidence

A validated route needs observed behavior from target users, such as:

- Opening the route from the intended entry point.
- Setting the anchor date or other route setup value.
- Producing the natural artifact: calendar, checklist, sheet, memo, or copied text.
- Exporting or copying that artifact into an outside tool.
- Completing at least one action or using the artifact during the real task.
- Returning, repeating, correcting, or giving feedback on the Flow.

The strongest evidence is a complete loop: open -> setup -> export/copy -> use outside FLOW -> complete or update -> return or feedback.

## Status Labels

- `representative-eligible`: the route demonstrates the intended FLOW shape and has passed internal QA. It is still not validated.
- `public MVP candidate`: the route may be shown in a constrained MVP context, usually with guardrails or risk boundaries. It is still not validated.
- `validated`: reserved for routes with real behavior evidence from target users.

## Current Examples

- `computer-skills-d30-study` is representative-eligible because it demonstrates source-derived study progress rows, calendar export, and spreadsheet export.
- `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails.
- None of these routes should be called validated until user behavior data exists.
