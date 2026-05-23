# Flow Lifecycle Classification

**Date:** 2026-05-23  
**Branch:** `codex/flow-lifecycle-classification`  
**Status:** Open  
**PR URL:** https://github.com/knhbae/flowme2605/pull/18  
**Deploy URL:** https://vercel.com/flowme/flowme2605/GnGGQWVK6YG2f8HBp42CA6wkJgNi

## Why

The product now has source-fit audit, content inventory, and natural artifact audit data, but no single operational answer to "which Flows do we keep, fix, preview, hide, or remove?" This PR adds that classification layer without prematurely deleting public routes.

## What Changed

- Added `content-lifecycle` classification for all seed Flow bundles.
- Added tests that enforce one lifecycle bucket per Flow.
- Wired lifecycle counts into Content Lab.
- Documented the current bucket counts and deletion policy.
- Normalized 21 source-backed legacy routes into `source_status=needs_review` with source precision, checked date, conversion note, and primary destination metadata.

Current lifecycle counts:

- 대표 유지: 5
- 보강 필요: 66
- 미리보기 전용: 440
- 공개 숨김: 0
- 삭제 후보: 0

## Not Done

- No public route deletion.
- No generated preview promotion.
- No manual source-fit audit promotion for the 21 `needs_review` routes yet.
- No visual redesign beyond the internal Content Lab summary section.

## Decisions

- Source-backed needs-review entries are `fix`, not `remove_candidate`.
- Delete candidates require no source URL or an explicit hide/replace audit.
- Derived real-source Flows stay in `fix` until their UX/content gap is closed and manual source-fit is updated.

## Files Touched

- `lib/flow/content-lifecycle.ts`
- `lib/flow/content-lifecycle.test.ts`
- `lib/flow/content-lab.ts`
- `lib/flow/content-lab.test.ts`
- `components/flow/ContentLab.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- `docs/content-audit/2026-05-23-flow-lifecycle-classification.md`
- `docs/superpowers/specs/2026-05-23-flow-lifecycle-classification-design.md`
- `docs/superpowers/plans/2026-05-23-flow-lifecycle-classification.md`

## Verification

- `npm test` passed locally. Latest run: 99/99 pass.
- `npm run docs:check` passed locally.
- `npm run build` passed locally.
- `npm run test:e2e -- --grep "flow lab"` passed locally.
- Vercel PR preview check passed for latest head.

## Risks

- The lifecycle layer is derived from seed data, so future seed additions need tests to keep the bucket logic honest.
- The Content Lab count helps internal QA, but public catalog gating still relies on existing execution/source-fit logic.

## Follow-Ups

- Audit source-backed `needs_review` routes and promote the ones that pass into real-source inventory.
- Add lifecycle bucket filters to internal Flow Lab if the list grows.
- Use lifecycle `fix` bucket to drive the next content/UX cleanup batch.
