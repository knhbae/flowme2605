# QA

**Current state:** IMPLEMENTATION AND SCOPED AUTOMATED QA COMPLETE / SOURCE-REVIEW
PREREQUISITE RESOLVED BY PR #196 / EXACT-HEAD CI, SEQUENTIAL MERGE, AND
PRODUCTION VERIFICATION AUTHORIZED / OBSERVED USERS `0`.

## Fresh Local Evidence — 2026-08-20

- `npm.cmd run docs:check`: PASS, `16` required files and `4567` local links.
- Changed shared surfaces: PASS `53/53` focused component tests.
- `npm.cmd run test:p35-p0`: PASS `449/449`.
- `npm.cmd run test:approved-plan-execution`: PASS `191/191`.
- `npm.cmd run test:public-plan-surface`: PASS `14/14`.
- `npm.cmd run build`: PASS, Next.js generated `18/18` static pages.
- `tests/e2e/main-app-visual-polish.spec.ts`: PASS `12/12` with workers `1`
  across `/flows`, `/f/moving-d30-basic`, `/my`, and `/calendar` at 390, 1024,
  and 1440 pixels. Horizontal overflow stayed within `1px`; console and page
  errors were `0`; focus, cobalt primary actions, ink selected navigation, and
  approved 44/48px targets passed. Evidence screenshots are under
  `output/playwright/main-app-visual-polish/`.
- Existing discovery, public edit, saved-plan lifecycle, library, export,
  Calendar, and entry-route regression: PASS `52/52`; the final discovery and
  populated My Plan subset was rerun after the last presentation patch and
  passed `9/9`.
- Independent UX/accessibility and React diff reviews: changed-diff Blocker `0`,
  High `0`, Medium `0` after fixes.

## Historical Full-Suite Boundary And Resolution

The original 2026-08-20 run was not recorded as PASS. Its pretest passed
`175/175`, and the main suite reached `623/624`; the single failure was
`lib/flow/seed-flows.test.ts` (`normal user routes fail the standard suite when
source review is due`). A focused rerun passed `68/69` and reported `30`
source-backed entries with review date `2026-05-21`, expected `0`. No content
dates, source decisions, or runtime behavior were changed in this visual-only
scope.

[PR #196](https://github.com/knhbae/flowme2605/pull/196) resolved that prerequisite
separately: `135` normal-user routes are current, with overdue and missing counts
`0`. Its exact head `97c537ff8357b2989541facaac94711634594e4c` passed full
`npm.cmd test`, build, docs, dependency audit, and Playwright `612/612`, then
merged as `8c0bfd8de9fb8877c4045b2c3f725b60ca236843`; the resulting Vercel status
succeeded and the canonical Production URL returned HTTP `200`. The historical
`623/624` result remains evidence of the original boundary, not a current blocker.
PR #194 must still pass its own final exact-head CI before merge.

## Known Layout Exception

The existing seven-column populated Calendar keeps compact overflow controls
whose width is below 44px. Expanding them would change the established grid
layout, so this visual-only gate records the exception rather than claiming
universal 44px controls. Ordinary primary and secondary actions meet their
48/44px contracts.

## Required Evidence

- `npm.cmd run docs:check`
- Focused component and route tests for every directly changed surface.
- `npm.cmd test`
- `npm.cmd run build`
- Real-browser checks at 390, 1024, and 1440 plus responsive boundaries at
  767/768, 1023/1024, and 1279/1280 where the route layout changes.
- Representative `/flows`, `/f/moving-d30-basic`, Plan/Item editor, `/my`, export,
  management, and `/calendar` interaction checks.
- Horizontal overflow, fixed-layer overlap, focus visibility/return, target size,
  accessible names, console errors, and page errors.

## Evidence Boundary

Screenshots and automation are implementation evidence, not observed-user
validation. The Owner authorized sequential PR #194 then PR #195 merge and
Production verification after exact-head CI. Observed-user testing remains
unperformed and observed users remain `0`.
