# Diet Observation Guardrail Copy Spec

Date: 2026-05-25

## Goal

Make `diet-habit-2week` read as a two-week observation sheet, not diet coaching.

## Scope

- Rewrite the route title, description, warning, section titles, and item copy around observation.
- Keep the primary destination as `sheet`.
- Keep the first artifact as the observation table with stop/consult conditions.
- Update Flow Lab review notes so the route still requires mobile re-check and observed user evidence.

## Non-Goals

- No weight-loss prescription, targets, calorie plan, or exercise program.
- No automatic diet/progress generation.
- No direct app integration or native long-term health records.
- No validation claim without real user behavior.

## UX Decision

User need: As a user checking whether recent meals, sleep, activity, and condition have a pattern, I need a simple two-week observation sheet so that I can discuss repeated warning signs or adjust habits without receiving a diet prescription.

Content shape: official health guidance converted into a health-sensitive observation log.

Primary destination: spreadsheet.

Structure: light routine feeding a daily observation sheet and weekly memo.

Risk/source handling: official KDCA source remains separate from FLOW guidance; the warning explains that this is not a prescription and gives stop/consult conditions.
