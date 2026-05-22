# PR: Moving Vendor Proof Workbench

- Date: 2026-05-23
- Branch: `codex/moving-vendor-proof-workbench`
- PR: https://github.com/knhbae/flowme2605/pull/15
- Status: `Merged`, `Deployed`
- Production deploy: https://flowme2605.vercel.app
- Vercel inspect: https://vercel.com/flowme/flowme2605/4J6JHZgYSDvzFDRBruqa3BKVWy1k
- Merge commit: `aed7b4427aabc52b90f5fa85deff67256fbc8172`

## Why

The moving Flow should not stop at a dated checklist. A realistic moving workflow includes comparing moving vendors, keeping quote and contract evidence, tracking deposits and balance timing, and checking the schedule on a monthly calendar. This PR adds those natural artifacts to the moving Workbench while keeping the existing timeline checklist as the primary surface.

## What Changed

- Added artifact field definitions for Flow-specific comparison rows and memo fields.
- Added an `이사 업체 후보 비교` table to timeline Workbenches for moving Flows.
- Added a `계약·결제 증빙` memo card with fields for contract location, deposit proof, balance/transfer limit, compensation rule, and final call notes.
- Persisted proof memo fields in `FlowWorkbenchState.memoCards`.
- Included moving vendor comparison and proof memos in text and workbook exports.
- Reused the comparison table component for decision-table Flows so candidate comparison UX does not fork.
- Extended E2E coverage so moving vendor name, quote memo, and contract proof memo survive reload.

## Not Done

- Did not add file upload or image attachment for quote screenshots.
- Did not add vendor scoring, sorting, or recommendation logic.
- Did not add multi-month navigation to the mini calendar.
- Did not migrate every moving checklist item into richer proof-specific content.
- Did not change the broader public Flow page layout outside the Workbench surface.

## Decisions

- Kept moving as a timeline Flow, because dates and checklist order remain the main structure.
- Added vendor comparison as a supporting artifact rather than converting moving into a decision-table Flow.
- Stored memo cards under Workbench state instead of item notes because the proof fields are cross-cutting records, not tied to one checklist item.
- Kept the comparison rows in a small code-level registry for now. This avoids broad seed data churn while we continue validating artifact schemas per content type.

## Files Touched

- `components/flow/ArtifactWorkbench.tsx`
- `lib/flow/artifact-fields.ts`
- `lib/flow/export.ts`
- `lib/flow/storage.ts`
- `lib/flow/types.ts`
- `lib/flow/export.test.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/superpowers/specs/2026-05-23-moving-vendor-proof-workbench-design.md`
- `docs/superpowers/plans/2026-05-23-moving-vendor-proof-workbench.md`

## Verification

- `npx tsx --test lib/flow/export.test.ts` passed: 15 tests.
- `npm run build` passed.
- `npm run test:e2e -- --grep "artifact workbench saves local execution entries"` passed after aligning the test with the Workbench progress copy.
- Mobile screenshot captured: `test-results/manual/moving-vendor-proof-workbench-mobile.png`.
- `npm run docs:check` passed: 12 required files, 50 local links.
- `npm test` passed: 88 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 38 tests.
- Vercel preview passed for PR head `ee38cf1032ecf8b98147b4e4ba2fc738be64d0f0`.
- Production Vercel passed for merge commit `aed7b4427aabc52b90f5fa85deff67256fbc8172`.
- Production smoke passed on `https://flowme2605.vercel.app/f/moving-d30-basic`: vendor name, quote memo, and contract proof memo persisted after reload.

## Risks

- The moving Workbench is now longer on mobile. The vendor table is horizontally scrollable; a later mobile pass may need a stacked card layout.
- Proof memos are text-only. Users may expect screenshots or files for real contract evidence.
- The artifact field registry is code-defined. If many content types need custom fields, this should move into Flow metadata or seed data.

## Follow-Ups

- Add a stacked mobile layout for comparison rows.
- Add optional attachment references or file upload once storage/auth constraints are resolved.
- Apply the same artifact definition approach to travel, certification study, and childcare center comparison Flows.
- Add export previews showing that proof memos appear in text and XLSX outputs.
