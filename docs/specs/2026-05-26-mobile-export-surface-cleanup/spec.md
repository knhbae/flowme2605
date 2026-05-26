# Mobile Export Surface Cleanup Spec

Date: 2026-05-26

## Goal

Reduce reliance on the sticky mobile export sheet as the primary export pattern for representative/public-MVP candidate routes. Mobile users should see the export CTA beside the first natural artifact before needing to scroll to the sticky fallback.

## Scope

Target routes:

- `moving-d30-basic`
- `computer-skills-d30-study`
- `diet-habit-2week`
- `new-car-delivery-check`

## Behavior

- Mobile artifact cards expose one short destination CTA near the relevant artifact.
- Visible labels stay short: `시트로 받기`, `캘린더로 받기`, or `텍스트 복사`.
- Accessible names carry destination plus artifact context, such as `시트로 받기: 실행 리스트`.
- Desktop artifact-near export buttons remain unchanged.
- The sticky mobile export sheet remains available as a fallback, not the only primary path.
- No Google Calendar, Sheets, Notion, login, or direct integration is added.

## Figma

Review artifact: https://www.figma.com/design/dYp9mFToSEOPjMSwAVcnuJ

The Figma file is a review artifact for the mobile CTA pattern. The code remains the implementation source of truth.

## Screenshots

- [moving workbench](../../screenshots/2026-05-26-mobile-export-surface-moving-workbench.png)
- [study workbench](../../screenshots/2026-05-26-mobile-export-surface-study-workbench.png)
- [diet workbench](../../screenshots/2026-05-26-mobile-export-surface-diet-workbench.png)
- [new-car workbench](../../screenshots/2026-05-26-mobile-export-surface-newcar-workbench.png)

## Quality Note

- User need: take the first generated artifact into an existing calendar or sheet without hunting for the sticky sheet.
- Destination: calendar `.ics`, spreadsheet `.xlsx`, or text copy.
- Rubric low point before change: mobile portability and operability, because the artifact and export action were separated.
- Key decision: expose one mobile CTA per first artifact card and keep the sticky sheet as fallback.
- Validation boundary: this improves operability but does not validate user behavior.
