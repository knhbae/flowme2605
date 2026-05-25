# Vehicle Inspection Evidence-First Pass

Date: 2026-05-25

## Decision

`vehicle-inspection-prep` already has an exact TS 자동차검사 source and a useful D-14 timeline. The remaining UX gap was that reservation data and inspection-result follow-up lived in generic notes.

This pass adds a route-specific memo card for reservation, documents, precheck evidence, result sheet, and repair/reinspection follow-up.

No representative, public-MVP, or validation status changes in this batch.

## Natural Artifact Simulation

Route: `vehicle-inspection-prep`

Simulated user:

- Inspection date: `2026-06-18`
- Vehicle: `아반떼 2021`
- Inspection center: `성산검사소`
- Reservation: `10:30`

Expected output:

- Calendar/checklist: D-14 validity and reservation check, D-3 documents and vehicle condition, D-Day inspection visit.
- Memo: reservation info, required documents, precheck photos/videos, result sheet location, repair or reinspection follow-up.
- Official source remains visible; FLOW does not decide legal inspection status for the user.

## UX Gap Closed

Before:

- The timeline existed, but the useful external artifact after inspection was not explicit.
- Result sheet, repair memo, and reinspection deadline could be buried in item notes.

After:

- Workbench shows `검사 예약·결과 후속 메모` beside the timeline.
- The user can export reservation/result evidence without treating checklist completion as inspection success.

## Screenshots

- `docs/screenshots/2026-05-25-vehicle-inspection-evidence-first-desktop.png`
- `docs/screenshots/2026-05-25-vehicle-inspection-evidence-first-mobile.png`
