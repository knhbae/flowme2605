# MOFA Travel Source Replacement

Date: 2026-05-25
Route: `real-mofa-overseas-travel-prep`
Source: [외교부 해외안전여행 베트남 국가/지역별 정보](https://www.0404.go.kr/ntnSafetyInfo/86/detail)

## Decision

`real-mofa-overseas-travel-prep` no longer uses only the broad MOFA overseas safety portal. It now points to the exact Vietnam country page, matching the existing natural-artifact audit scenario for a Vietnam trip.

This does not promote the route. The source is now exact, but the Flow still needs UX reshaping around country confirmation date, safety notice check, embassy/emergency contacts, local emergency numbers, and family-share memo.

## Why

The broad portal was a useful official entry point, but it forced the editor or user to choose a country page later. The Vietnam page directly supports the Flow's simulated user artifacts:

- travel safety calendar: D-14 warning/safety notice check, D-7 embassy contact save
- emergency memo: embassy, consulate, local emergency numbers, family-share fields
- risk boundary: official source facts separate from user itinerary and insurance notes

## Broad Guard Result

- Broad real-source routes before this batch: 2
- Broad real-source routes after this batch: 1
- Remaining broad queue:
  - `real-fitvely-weekly-body-check`

## Not Done

- Did not promote to representative or public MVP.
- Did not mark validation.
- Did not add destination auto-detection.
- Did not create external integration with MOFA or travel apps.
