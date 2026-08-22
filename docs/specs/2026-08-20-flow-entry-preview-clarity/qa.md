# Flow Entry And Preview Clarity QA

**Current state:** OWNER RELEASE DECISION COMPLETE / SOURCE-REVIEW PREREQUISITE
RESOLVED / PR #194 MERGED AND PRODUCTION VERIFIED / PR #195 RECONCILED EXACT-HEAD
CI, MERGE, AND POST-MERGE PRODUCTION VERIFICATION PENDING / OBSERVED USERS `0`.

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run docs:check` | PASS | 2026-08-23 reconciliation: skill sync passed; `16` required files and `4577` local links passed. |
| `npm.cmd run security:audit` | PASS | `npm audit --audit-level=high`: `0` vulnerabilities. |
| Focused discovery, syntax, copy, Map, and result contracts | PASS | Core focused command `82/82`; final Calendar a11y/primitives `17/17`; choose-child selector/title/section focused checks `20/20`. |
| Approved/public/lock suites | PASS | `test:approved-plan-execution` `198/198`; `test:public-plan-surface` `19/19`; `test:p35-appclient-lock` `59/59`. |
| Full `npm.cmd test` | HISTORICAL FAILURE RESOLVED / EXACT-HEAD RERUN PENDING | The 2026-08-20 review head reached pretest `176/176`, P35 P0 `455/455`, and main `624/625`; its only failure was the then-separate source-review freshness gate for `30` records. PR #196 resolved that prerequisite with `135` normal-user routes current and overdue/missing counts `0`, then merged as `8c0bfd8de9fb8877c4045b2c3f725b60ca236843`. PR #195 must still pass again on its reconciled exact head. |
| Focused Flow/copy E2E regression | PASS | Current build: `/flows`, public Flow, per-Flow Text reset, full Todo/Calendar, legacy disclosure, and single/sibling copy title `10/10`. |
| Executable Flow Map parity E2E | PASS | `2/2`: setup/selector precedes full result, selected child owns Text title/section/warnings, A-to-B resets to Text and closes detail, Map identity stays unchanged. |
| `npm.cmd run build` | PASS | Next.js `15.5.21`; type check and `18/18` static pages passed, including `/flows`, `/f/[slug]`, and `/flow-maps/[map]`. |
| Real-browser 390/1024/1440 | PASS | Exact current BUILD_ID `tJuAWDPrmaKm2NaI9C3GZ`; `/flows`, public Flow, `/my`, and `/calendar` matrix `12/12`; overflow at most `1px`, visible focus passed, console/page errors `0`. Evidence: `output/playwright/flow-entry-preview-clarity-final-exact`. |
| Independent UX/accessibility review | PASS | Final changed-diff audit: Blocker `0`, High `0`, Medium `0` after selector order, child title/section, Calendar landmark, and duplicate-date announcement corrections. |
| Independent React review | PASS | Current-source review and focused rerun `89/89`: state ownership, derived resets, Map selection, full-row rendering, keys, and legacy boundaries have Blocker `0`, High `0`, Medium `0`. |
| Prior stacked PR and Vercel Preview | HISTORICAL REVIEW EVIDENCE | [PR #195](https://github.com/knhbae/flowme2605/pull/195) initial runtime head `1d14c19c387b8f2cd3d61f04698aa097af2ddf2d` produced a successful initial Preview, while [Actions run `32309777212`](https://github.com/knhbae/flowme2605/actions/runs/32309777212) ended core `624/625` and Playwright `623/629`. Remediation head `597a6f84d593f0788e2c1f5a4fcd20d762d7bf28` passed build `18`, focused unit `13/13`, the six affected E2E cases `6/6` locally, and [Actions run `32312436980`](https://github.com/knhbae/flowme2605/actions/runs/32312436980) Playwright `629/629`; its core result remained `624/625` only because of the now-resolved source-review prerequisite. Preview deployment `dpl_2kkCE8tKVBxDfDb9gmxGNKG2UPhU` was READY/SUCCESS. These counts remain dated review evidence and do not prove the reconciled release head. |
| Release gate | OWNER AUTHORIZED / EXACT-HEAD CI AND PRODUCTION PENDING | The Owner completed FPC-11. PR #194 merged as `c8a57ba37c4087b84b526bc778c3604f68299faa` and its resulting Production deployment was verified. PR #195 must pass its reconciled exact-head CI before merge, then its own resulting Production deployment must be verified. |

## Reconciled Release Candidate — 2026-08-23

- `npm.cmd test`, `npm.cmd run build` (`18/18` pages), and
  `npm.cmd run docs:check` (`16` files, `4577` links) passed locally.
- The combined Flow discovery and preview checks passed `10/10`; the routine
  schedule presentation checks passed `7/7`.
- The four-worker full Playwright run passed `627/629`. Its two failures were
  concurrent-save URL wait timeouts; both exact scenarios then passed `2/2`
  sequentially without a runtime change.
- After the compact `9+` overflow-label correction, a fresh-build targeted run
  covering mobile overflow, mobile Calendar layout, and both concurrent-save
  scenarios passed `4/4`.
- Exact-head Actions run `32587222087` on `9c469b050ba788e536210717168c3e0004864ed0`
  passed Docs/Unit/Build and Vercel; Playwright passed `628/629`. The sole
  failure, including both retries, measured a Linux Chromium `+3` label at
  `15px` inside its `14px` mobile slot. The slot was widened to `16px` without
  changing the `12px` label, `9+` cap, exact accessible count, or assertion;
  the fresh-build exact scenario then passed `1/1`. Replacement exact-head CI
  remains the merge gate.
- The final changed-diff audit found P1 `0` and P2 `0`. GitHub's exact-head core,
  full Playwright, and Vercel checks remain the release gate; this local evidence
  is not a substitute for them or for observed-user validation.

## Required Scenarios

1. Type `이사` and observe prepared-plan filtering without submitting or changing
   localStorage.
2. Submit a registered URL and verify the existing canonical lookup result; edit
   the input and verify the stale result disappears.
3. Submit an unmatched memo and verify the existing private rule-based draft path.
4. Open one Flow, select Todo or Calendar, then open another Flow and verify Text
   is selected by default.
5. Verify Text renders the complete plan in current Flow syntax and is read-only.
6. Verify approved Todo and Calendar expose all eligible rows, preserve their
   group labels, and have no first-three disclosure.
7. Verify Calendar anchor/date setup appears before its long result list.
8. Verify a legacy/default preview still uses its prior compact disclosure.
9. Save one copy and verify no `사본 1 ·`; save a sibling copy and verify both are
   ordinally distinguishable without persisted-title mutation.
10. Open executable `save_all` and `choose_child` Maps and verify the same complete
    result contract. In `choose_child`, the selector precedes the result, the
    selected child owns the Text title/section/warnings, and changing child resets
    the destination to Text and closes any open Item detail.

## Review Notes

- Product constraint review: preserve export-first review-before-save and existing
  artifact destinations.
- Source/risk review: do not convert personal memo text into source guidance or
  imply that computed preview timing rewrites canonical source facts.
- Browser review: mobile scan order, sticky action clearance, focus visibility,
  horizontal overflow, and console/page errors passed at `390`, `1024`, and
  `1440` widths. Future very large Flows still require measured performance data.
- Residual risk: very large future Flows may need measured semantic grouping or
  rendering optimization; that is not evidence for an arbitrary three-row cap.
- Evidence boundary: tests, screenshots, and Vercel Preview are automated/internal
  implementation evidence. Observed users remain `0`.
