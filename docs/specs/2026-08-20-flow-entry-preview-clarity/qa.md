# Flow Entry And Preview Clarity QA

**Current state:** STACKED DRAFT PR AND EXACT CODE-HEAD VERCEL PREVIEW PUBLISHED /
PLAYWRIGHT CI PASS / CORE CI NON-GREEN ONLY AT THE KNOWN SOURCE-REVIEW FRESHNESS
GATE / OWNER REVIEW PENDING / MERGE AND PRODUCTION NOT AUTHORIZED / OBSERVED
USERS `0`.

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run docs:check` | PASS | 2026-08-20: skill sync passed; `16` required files and `4575` local links passed. |
| `npm.cmd run security:audit` | PASS | `npm audit --audit-level=high`: `0` vulnerabilities. |
| Focused discovery, syntax, copy, Map, and result contracts | PASS | Core focused command `82/82`; final Calendar a11y/primitives `17/17`; choose-child selector/title/section focused checks `20/20`. |
| Approved/public/lock suites | PASS | `test:approved-plan-execution` `198/198`; `test:public-plan-surface` `19/19`; `test:p35-appclient-lock` `59/59`. |
| Full `npm.cmd test` | EXPECTED NON-GREEN | Pretest `176/176`, P35 P0 `455/455`, and main `624/625`. The only failure is the separate source-review freshness gate: `30` records are past `review_due:2026-05-21`. No entry/preview regression failed. |
| Focused Flow/copy E2E regression | PASS | Current build: `/flows`, public Flow, per-Flow Text reset, full Todo/Calendar, legacy disclosure, and single/sibling copy title `10/10`. |
| Executable Flow Map parity E2E | PASS | `2/2`: setup/selector precedes full result, selected child owns Text title/section/warnings, A-to-B resets to Text and closes detail, Map identity stays unchanged. |
| `npm.cmd run build` | PASS | Next.js `15.5.21`; type check and `18/18` static pages passed, including `/flows`, `/f/[slug]`, and `/flow-maps/[map]`. |
| Real-browser 390/1024/1440 | PASS | Exact current BUILD_ID `tJuAWDPrmaKm2NaI9C3GZ`; `/flows`, public Flow, `/my`, and `/calendar` matrix `12/12`; overflow at most `1px`, visible focus passed, console/page errors `0`. Evidence: `output/playwright/flow-entry-preview-clarity-final-exact`. |
| Independent UX/accessibility review | PASS | Final changed-diff audit: Blocker `0`, High `0`, Medium `0` after selector order, child title/section, Calendar landmark, and duplicate-date announcement corrections. |
| Independent React review | PASS | Current-source review and focused rerun `89/89`: state ownership, derived resets, Map selection, full-row rendering, keys, and legacy boundaries have Blocker `0`, High `0`, Medium `0`. |
| Stacked Draft PR and Vercel Preview | EXACT CODE-HEAD PREVIEW READY / OWNER REVIEW PENDING | [Draft PR #195](https://github.com/knhbae/flowme2605/pull/195) initial runtime head `1d14c19c387b8f2cd3d61f04698aa097af2ddf2d` produced a successful initial Preview, but [Actions run `32309777212`](https://github.com/knhbae/flowme2605/actions/runs/32309777212) ended core `624/625` at the known `30`-record `review_due` freshness failure and Playwright `623/629` with `6` failures. Remediation code head `597a6f84d593f0788e2c1f5a4fcd20d762d7bf28` passed current-source build `18` pages, focused unit `13/13`, and those six E2E cases `6/6` locally. Its [Actions run `32312436980`](https://github.com/knhbae/flowme2605/actions/runs/32312436980) finished with [Playwright job `96257986506`](https://github.com/knhbae/flowme2605/actions/runs/32312436980/job/96257986506) `629/629` PASS in `14.4m` and successful report artifact `9387286188` upload. [Core job `96257986748`](https://github.com/knhbae/flowme2605/actions/runs/32312436980/job/96257986748) remains non-green only at the known freshness gate: docs `16` files / `4575` links, pretest `176/176`, and P35 `455/455` passed; main was `624/625`, with the sole failure at `lib/flow/seed-flows.test.ts:1290` for `30` records past `review_due:2026-05-21`. CI build was skipped after that test failure; the current-source local build remains PASS with `18` pages. Exact code-head Vercel deployment `dpl_2kkCE8tKVBxDfDb9gmxGNKG2UPhU`, GitHub deployment `5992733602`, status `17042464212`, is READY/SUCCESS: [stable branch Preview](https://flowme2605-git-agent-flow-entry-preview-clarity-flowme.vercel.app), [immutable Preview](https://flowme2605-5ijw2y49m-flowme.vercel.app), and [deployment dashboard](https://vercel.com/flowme/flowme2605/2kkCE8tKVBxDfDb9gmxGNKG2UPhU). This is Preview evidence only, not merge or Production evidence. |

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
