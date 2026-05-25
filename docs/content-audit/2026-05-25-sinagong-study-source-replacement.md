# Sinagong Study Source Replacement

Date: 2026-05-25

## Decision

`real-sinagong-computer-d30-study` no longer uses the broad Sinagong site as its source. It now points to the exact Gilbut/Sinagong book page already used by the representative-eligible `computer-skills-d30-study` route:

- `https://www.gilbut.co.kr/m/book/view?bookcode=BN004603`

This only removes the route from the broad-source queue. It does not make the route representative, public-MVP, or validated.

## Why

Study progress tables are only acceptable when rows come from source structure such as table of contents, curriculum, exam scope, past-exam rounds, lessons, assignments, or weekly plans. The broad Sinagong site can justify the study category, but it does not give this route a specific row source. The exact book page gives a concrete source boundary for manual conversion.

## Natural Artifact Simulation

Simulated user:

- Goal: study for a computer-skills certification exam over the last 30 days.
- Inputs: exam date, target grade/level, available weekday and weekend study time, weak area.
- Outside artifact: D-30 calendar plus progress/score spreadsheet.

Expected output:

- Calendar rows for D-30 study blocks.
- Source-derived progress rows that the creator pre-fills from the book/curriculum scope.
- Practice score and wrong-answer rows for mock/past-exam rounds.
- User-editable fields only: target date, status, memo, score, wrong-answer note, retry date, weak area.

Remaining UX/content gap:

- The exact source is now attached, but the route still needs stronger source-derived row work before any public/representative framing.
- It should not ask learners to design a blank progress table.
- It should remain separate from `computer-skills-d30-study`, which is the current representative-eligible example.

## Broad Source Guard Impact

- Broad real-source route count drops from 4 to 3.
- Representative leak count remains 0.
- Remaining broad queue:
  - `real-fitvely-weekly-body-check`
  - `real-pet-health-visit-routine`
  - `real-mofa-overseas-travel-prep`

## Follow-Up

1. Decide whether `real-sinagong-computer-d30-study` is redundant with `computer-skills-d30-study` and should be hidden/merged instead of further polished.
2. If kept, reshape it around exact source-derived progress rows, mock/past-exam score rows, and wrong-answer retry rows.
3. Continue broad-source cleanup with pet health and MOFA, where source/risk separation matters more than source-title replacement.
