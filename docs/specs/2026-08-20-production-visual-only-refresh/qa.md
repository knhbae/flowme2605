# QA

**Current state:** RELEASED / SOURCE-REVIEW PREREQUISITE RESOLVED BY PR #196 /
PR #194 EXACT-HEAD CI PASSED / MERGED AS
`c8a57ba37c4087b84b526bc778c3604f68299faa` / PRODUCTION VERIFIED / OBSERVED
USERS `0`.

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

## Release Evidence — 2026-08-23

- PR #194 final head `9dd05c3ffe9df495d6d5f59a7942bc7cd72cfaf7`
  passed Docs, Unit, Build and full Playwright `624/624` in GitHub Actions run
  [`32583981208`](https://github.com/knhbae/flowme2605/actions/runs/32583981208);
  Vercel Preview also passed.
- PR #194 merged as `c8a57ba37c4087b84b526bc778c3604f68299faa`.
- The resulting Vercel status succeeded and the
  [canonical Production URL](https://flowme2605.vercel.app) returned HTTP `200`.

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
validation. PR #194 and PR #195 completed their authorized sequence. PR #195
exact-head and post-merge CI passed, and its exact-source Production deployment
succeeded; a separate canonical Production smoke suite is `NOT_RUN`. Observed-
user testing remains unperformed and observed users remain `0`.
