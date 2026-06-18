# Elementary Entry D-30 Official-First Note

Date: 2026-06-08

## Decision

`elementary-school-entry-d30` remains a promotable `/content-flows` review candidate, but its primary source model is now official-first.

The official anchor is the Ministry of Education 2026 elementary school enrollment notice and orientation guidance:

- https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104634&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W

Parent checklist material is secondary and should only supply concrete execution cues such as name labels, route practice, and first-day bag checks:

- https://hahappa.tistory.com/153

## Product Boundary

The Flow should not behave like a shopping list or support-money guide. It should help parents separate:

- official notice checks: school assignment, Government24 or local notice, school orientation, school homepage
- early common items: bag, indoor shoes, shoe pouch, pencils, erasers
- deferred items: notebooks, art supplies, exact writing tools, class-specific documents
- child-facing practice: name labels, commute route, first-day bag check

## Data Safety

Do not store child resident registration numbers, school assignment document images, health or vaccination data, support payment details, teacher/class screenshots, or family documents.

## Current Implementation

Updated surfaces:

- `lib/flow/korean-flow-content-candidates.ts`
- `components/flow/KoreanFlowContentStudio.tsx`
- `lib/flow/korean-flow-content-user-review.ts`
- `lib/flow/flow-content-selection-audit.ts`
- `lib/flow/korean-flow-content-candidates.test.ts`
- `lib/flow/seed-flows.ts`
- `lib/flow/source-fit.ts`

## Public Route Promotion

`elementary-school-entry-d30` now has a public `/f/elementary-school-entry-d30` route.

Promotion status:

- Public seed route: yes
- `/content-flows` public route link: yes
- Source-fit audit: yes
- Source-fit decision: `reshape_before_featured`
- Representative/validated claim: no

The route uses `입학식 날짜` as the end-date anchor. It creates five checks: D-30 취학통지·예비소집 확인, D-21 먼저 살 물건, D-14 학교 안내 전 보류 항목, D-7 네임스티커와 이름 표시, D-1 등교 동선과 입학식 가방 점검.

## Next Step

Mobile browser QA found the first executable artifact too low on 390x844: the `Flow artifact workbench` started at 1260px because source-fit status and setup copy sat above it.

The route now follows the promoted public-service pattern:

- mobile shows the workbench before source-fit/setup support material
- desktop keeps source, warning, and fit context in the reference rail
- source-fit status is hidden on the public route because the source-review state is already tracked in docs and `/content-flows`
- duplicate lower public feedback sections are suppressed through the simplified public layout rule

Verification:

- mobile recheck: `Flow artifact workbench` top moved from 1260px to 510px on 390x844
- screenshots: `output/playwright/elementary-entry-mobile-before.png`, `output/playwright/elementary-entry-mobile-after.png`, `output/playwright/elementary-entry-desktop-after.png`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "promoted public routes bring the executable artifact into the first mobile viewport|promoted content-flow service routes preserve executable source cues|content flows studio links promoted candidates"` passed 3 tests
- `npm test` passed 224 tests
- `npm run docs:check` passed with 430 local links
- `npm run build` passed

Next roadmap slice: verify whether the first visible workbench card makes the D-30 official-notice check obvious enough, then decide whether the D-14 "school-specific items hold" card needs an even stronger compact cue.

## 2026-06-09 Consistency Audit

Followed the Phase 5 compression order and rechecked `elementary-school-entry-d30` after the dorm candidate metadata sync.

Current state:

- `/content-flows` review metadata already classifies the candidate as `clear_official`.
- The source model is still official-first: Ministry of Education guidance is the primary source, while the parent checklist only supplies name-label, commute-route, and first-day bag execution cues.
- The public seed route keeps the first item official-only: `취학통지와 예비소집 안내 확인하기` is D-30, `source_type: official`, and its detail links are official only.
- The D-14 item remains a normal hold state: `학교 안내 전 보류할 물건 표시하기` says hold is not a missing task and school/teacher notice should decide later purchase.
- Static review output already shows the same separation in [2026-06-02-flow-content-ux-candidates.html](./2026-06-02-flow-content-ux-candidates.html) and [elementary-school-entry-d30.html](./flow-content-ux-candidates-previews/elementary-school-entry-d30.html).

Change made:

- Added regression coverage in `lib/flow/korean-flow-content-user-review.test.ts` for official notice vs parent checklist separation.
- Added regression coverage in `lib/flow/seed-flows.test.ts` that the public seed route keeps the first item official-only and keeps D-14 hold as a normal state.

No route or metadata rewrite was needed in this pass.

Fresh focused verification:

- `npx tsx --test lib/flow/korean-flow-content-user-review.test.ts`: passed.
- `npx tsx --test lib/flow/seed-flows.test.ts`: passed.
