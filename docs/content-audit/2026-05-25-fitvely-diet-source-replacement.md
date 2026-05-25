# FITVELY Diet Source Replacement

Date: 2026-05-25

## Decision

`real-fitvely-diet-record-routine` no longer uses the broad FITVELY site as its source. It now points to the exact FITVELY nutrition video `https://www.youtube.com/watch?v=qcTxaFMWzKs`.

`real-fitvely-weekly-body-check` stays in the broad-source queue. Search found FITVELY diet and body-fat videos, but not a clearly matching original source for weekly measurement, photo, or check-in behavior. FLOW should not invent that measurement method.

No route is marked representative, public-MVP, or validated.

## Source Evidence

- YouTube oEmbed confirmed `qcTxaFMWzKs` as a FITVELY video titled `【영양학】 다이어트 식단, 이 영상으로 g단위 완벽정리 해드림 (단백질/탄수화물/식이섬유/지방)`.
- YouTube search also returned a nearby FITVELY diet-feedback video, but `qcTxaFMWzKs` is the stronger match for a diet-record source because it names diet composition by gram units.
- Search queries for weekly body check, body measurement, and InBody-style check-ins did not produce a specific FITVELY source that matched the route title closely enough.

## Natural Artifact Simulation

Route: `real-fitvely-diet-record-routine`

Simulated user:

- Goal: make a lightweight diet log based on one FITVELY nutrition rule.
- Inputs: target period, selected meal rule, daily meals, workout day, sleep, condition.
- Outside artifact: spreadsheet-first diet log plus weekly adjustment memo.

Expected output:

- Sheet rows for date, meal memo, selected source rule, workout, sleep/condition, and next adjustment.
- Original video link preserved as the source for the selected rule.
- Stop/consult condition when restrictive behavior, dizziness, binge trigger, or medical concern appears.

Current UX gap:

- 2026-05-25 observation update: the route now has the smaller first action. It asks the user to pick one rule from the source, apply it to one meal/day, and log observation and adjustment.
- Remaining gap: no user has been observed opening the video, choosing a rule, and filling the row.

## Broad Source Guard Impact

- Broad real-source route count dropped from 5 to 4 in this batch, then to 3 after the Sinagong study source replacement.
- Representative leak count remains 0.
- Remaining broad queue:
  - `real-fitvely-weekly-body-check`

## Follow-Up

1. Done later on 2026-05-25: `real-fitvely-diet-record-routine` was reshaped into a compact observation-sheet record with one selected rule, one meal/condition row, and one stop/consult condition.
2. Keep `real-fitvely-weekly-body-check` in broad-source review until a matching measurement/check-in source is found, or demote/remove the route.
3. `real-pet-health-visit-routine` later received an exact 서울시 우리동네 동물병원 source and dropped out of the broad queue, but remains catalog review because the source has region and eligibility limits.
4. `real-mofa-overseas-travel-prep` later received an exact 외교부 베트남 국가/지역별 정보 source and dropped out of the broad queue, but remains reshape because country-check and emergency-card UX still need work.
