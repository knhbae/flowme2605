# 2026-06-08 Dorm Candidate Content-Flows Promotion Note

Purpose: record the first Phase 1 external-ecosystem roadmap candidate promoted into the `/content-flows` review UI.

Status: review UI candidate only. This is not a public `/f/[slug]` route and is not validated by user behavior.

## What Changed

- Updated `college-dorm-move-in-checklist` in `lib/flow/korean-flow-content-candidates.ts`.
- Reframed the source from a creator PDF checklist to an official dorm-notice pattern, using the Daegu Catholic University dormitory entry page as the primary source link.
- Kept the candidate as `hybrid` + `timeline`.
- Replaced the first visible action with `최신 기숙사 공지 다시 확인`.
- Added a D-Day row: `입사 당일 절차와 시설점검 처리`.
- Made `학교별 최신 공지가 우선` visible in the `/content-flows` execution preview.
- Added no-storage copy for health document images, payment accounts, room passwords, student IDs, resident numbers, and other private details.

## 2026-06-08 Phase 5 Follow-Up

After the external ecosystem Phase 5 compression table named dorm move-in as the strongest next review candidate, the review metadata and static HTML were re-synced with the official-first framing:

- `lib/flow/korean-flow-content-user-review.ts` now classifies `college-dorm-move-in-checklist` as `clear_official`.
- `lib/flow/flow-content-selection-audit.ts` now treats latest dorm notices and term PDFs as the selection reason, not blog PDF/password-sharing behavior.
- [2026-06-02-flow-content-ux-candidates.html](./2026-06-02-flow-content-ux-candidates.html) and [college-dorm-move-in-checklist.html](./flow-content-ux-candidates-previews/college-dorm-move-in-checklist.html) were regenerated so the dorm review sections say latest school notice and term-specific PDF are the source boundary.
- This still does not promote a public `/f/[slug]` route or claim user validation.

## Review UI Requirements Covered

| Requirement | Current Evidence |
|---|---|
| First action checks latest dorm notice | Candidate item and preview card use `최신 기숙사 공지 다시 확인`. |
| D-day artifact is visible | Preview includes D-14, D-10, D-7, D-5, and D-Day cards. |
| School-specific source boundary is visible | Preview subtitle/source note says `학교별 최신 공지가 우선`. |
| Sensitive dorm/admin data is not stored | Candidate memo and detail memo warn against storing health documents, payment data, room passwords, and IDs. |
| Public promotion is deferred | No public route was added. |

## Verification

- `npm run docs:check`: passed.
- `npx tsx --test lib/flow/korean-flow-content-candidates.test.ts`: passed.
- `npm run build`: passed.
- Mobile Playwright render check on `http://localhost:3000/content-flows`: passed.
  - Screenshot: `docs/content-audit/2026-06-08-content-flows-dorm-candidate-mobile.png`
  - Checked visible text: `최신 기숙사 공지 다시 확인`, `학교별 최신 공지가 우선`, `D-Day`, `입사 당일 절차와 시설점검 처리`, `건강서류 이미지`.

## Current Test Status

The earlier content inventory/source-review mismatch has been reconciled in the current worktree. Fresh verification on 2026-06-08: `npm test` passed 224 tests, `npm run docs:check` passed with 431 local links, and `npm run build` passed.

Fresh focused verification after the Phase 5 metadata sync:

- `npx tsx --test lib/flow/korean-flow-content-user-review.test.ts`: passed.
- `npx tsx --test lib/flow/flow-content-selection-audit.test.ts`: passed.
- `npx tsx scripts/content-audit/build-flow-content-ux-candidates-html.ts`: regenerated the static review HTML and 58 candidate previews.

## Recommended Next Step

Run the focused content-flow candidate tests and `docs:check` after this sync. After that, the second candidate to promote is `elementary-school-entry-d30`, with the UI split between school notice checks, buy-first items, and buy-after-notice items.
