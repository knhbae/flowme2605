# MOFA Travel Emergency Card

Date: 2026-05-25

## Decision

`real-mofa-overseas-travel-prep` already has an exact MOFA Vietnam country page, but the UX still behaved like a generic travel checklist. This pass makes the first natural artifact a portable memo card for country confirmation, travel alert status, embassy contact, local emergency numbers, insurance/shelter notes, and family sharing.

No representative, public-MVP, or validation status changes in this batch.

## Natural Artifact Simulation

Route: `real-mofa-overseas-travel-prep`

Simulated user:

- Destination: `Vietnam / Da Nang`
- Official check date: `2026-07-16`
- Travel alert: `MOFA country page checked; night movement caution`
- Emergency card: `Consular call center, local embassy/consulate, local emergency number, insurance contact, hotel address`
- Family share: `Flight, accommodation, companion, emergency contact path shared to family chat`

Expected output:

- One memo card that can be copied to a notes app or printed.
- Checklist and calendar remain available, but they no longer define the first useful output.
- Source/risk boundary stays clear: FLOW records official-check evidence and contacts; it does not decide whether travel is safe.

## UX Boundary

FLOW does not certify destination safety, immigration eligibility, or insurance coverage. The user still checks official MOFA and destination rules directly.

## Screenshots

- `docs/screenshots/2026-05-25-mofa-travel-emergency-card-mobile.png`
- `docs/screenshots/2026-05-25-mofa-travel-emergency-card-desktop.png`
