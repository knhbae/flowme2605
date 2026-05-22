# PR: Travel Proof Emergency Workbench

- Date: 2026-05-23
- Branch: `codex/travel-proof-emergency-workbench`
- PR: TBD
- Status: `Draft`
- Production deploy: TBD
- Vercel inspect: TBD

## Why

Travel Flows need a different natural artifact from moving or vehicle comparison Flows. Users preparing for travel need to record official confirmation results and keep emergency contacts in one portable card. The existing travel Flow already had a dated checklist and month calendar, but it did not preserve destination-specific entry, warning, baggage, embassy, or family-sharing notes.

## What Changed

- Added travel-specific Workbench memo fields for `overseas-travel-d14` and `real-mofa-overseas-travel-prep`.
- Added the `공식 확인·비상 카드` memo card under the travel timeline Workbench.
- Made the Workbench memo card copy metadata-driven so moving keeps `계약·결제 증빙` while travel shows travel-specific wording.
- Exported non-empty travel memo fields with Korean labels in text and XLSX `실행판 기록`.
- Extended E2E coverage so destination, entry-condition memo, and emergency contact memo persist after reload.

## Not Done

- Did not add destination-specific official API lookup.
- Did not add automatic embassy/contact lookup.
- Did not add file upload for passport, insurance, or booking PDFs.
- Did not redesign the multi-source official source card yet.
- Did not add direct Apple Notes, Google Calendar, or Google Sheets integration.

## Decisions

- Kept travel as a timeline Flow because D-14 to D-Day remains the main execution structure.
- Added the official confirmation/emergency card as a supporting artifact rather than creating a separate Flow type.
- Reused `FlowWorkbenchState.memoCards` and the existing export path to avoid a storage migration.
- Used slug-based artifact field definitions for now, matching the moving Workbench approach.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/artifact-fields.ts`
- `lib/flow/export.test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/superpowers/specs/2026-05-23-travel-proof-emergency-workbench-design.md`
- `docs/superpowers/plans/2026-05-23-travel-proof-emergency-workbench.md`

## Verification

- `npx tsx --test lib/flow/export.test.ts` first failed because travel memo fields exported as raw ids, then passed after adding travel artifact metadata.
- `npm run test:e2e -- --grep "artifact workbench saves local execution entries"` first failed because the travel card did not render, then passed after adding travel memo fields and metadata-driven card copy.
- `npm run build` passed during implementation.
- `npm run docs:check` passed: 12 required files, 50 local links.
- `npm test` passed: 89 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 38 tests.
- Mobile screenshot was attempted but the command was not approved in the tool prompt, so no screenshot artifact was captured in this pass.

## Risks

- The travel emergency card is manually entered text, so it can become stale if requirements change.
- Users may expect automatic official lookups for country, visa, embassy, and baggage rules.
- The card appears below the list/calendar; a future pass may need to make it more prominent for high-risk travel contexts.

## Follow-Ups

- Add a multi-source official source card for passport, travel alert, entry rule, and baggage/security sources.
- Add a one-click text copy for the emergency card.
- Add destination-specific helper links once source coverage is better defined.
- Apply the same memo-card artifact pattern to passport renewal, vehicle inspection, and childcare-center Flows.
