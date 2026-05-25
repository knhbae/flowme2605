# New-Car Evidence Guardrail Copy Spec

Date: 2026-05-25

## Goal

Make `new-car-delivery-check` read as an evidence sheet for delivery-day handover, not a generic inspection checklist.

## Scope

- Rewrite comparison table title, row labels, memo card title, memo description, warning, and route description around portable evidence.
- Keep the route as public MVP with guardrails, not representative or validated.
- Keep FLOW out of the accept/refuse decision: FLOW records photo filenames, dealer confirmation, document status, and signing hold conditions.

## Non-Goals

- No legal, financial, or signing advice.
- No automated vehicle acceptance decision.
- No direct dealer/insurance integration.

## UX Decision

User need: As a buyer at vehicle delivery, I need one portable evidence sheet before signing so that photo filenames, dealer confirmation, document status, and hold conditions do not stay scattered in chat/photos.

Content shape: delivery checklist converted into a financial-sensitive evidence table.

Primary destination: spreadsheet plus memo.

Structure: checklist with evidence table first.

Risk/source handling: FLOW records the buyer's evidence and questions; it does not decide whether to accept delivery.
