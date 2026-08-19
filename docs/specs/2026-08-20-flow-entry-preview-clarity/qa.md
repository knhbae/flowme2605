# Flow Entry And Preview Clarity QA

**Current state:** LOCAL IMPLEMENTATION AND AUTOMATED QA COMPLETE / STACKED PR
AND VERCEL PREVIEW PUBLICATION PENDING / MERGE AND PRODUCTION NOT AUTHORIZED /
OBSERVED USERS `0`.

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
| Exact-head PR and Vercel Preview | Pending | Record only after publication; do not promote to merge/Production evidence. |

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
