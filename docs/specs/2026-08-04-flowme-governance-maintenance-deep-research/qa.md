# QA Record

**Status:** Passed for the scoped strategy artifacts on 2026-08-04.

Automated browser inspection, screenshots, document checks, and internal review
below are artifact QA. They are not observed-user validation.

## Browser method

- The in-app Browser connector was not available in the active tool set.
- Fallback used: Playwright CLI with the installed Chrome channel against a
  local Python HTTP server.
- Temporary QA captures were created under `output/playwright/governance-report/`,
  inspected with the image viewer, and removed before handoff.

## Desktop — 1440 x 1000

- Page title and full document rendered.
- `scrollWidth = clientWidth = 1440`; no horizontal overflow.
- Six report images loaded with non-zero natural dimensions.
- Replacement character count: `0`.
- Console after the inline favicon fix: `0 errors, 0 warnings`.
- Full-page capture visually inspected: hero, evidence cards, current FlowMe
  screenshots, role layers, six-scene storyboard, scenario UI, stale handling,
  risk ladder, trust card, alternatives, build list, and sources were present.

## Mobile — 390 x 844

- `scrollWidth = clientWidth = 390`; no horizontal overflow.
- Text/control clipping probe returned no clipped headings, paragraphs,
  buttons, or links.
- Broken image count: `0`.
- Replacement character count: `0`.
- Console: `0 errors, 0 warnings`.
- Top, scenario-story, and stale-management viewport captures were visually
  inspected. The horizontally scrollable scenario tabs remained usable.

## Interaction checks

- Selecting `실행 사용자` highlighted only personal-edit and selected-proposal
  actions.
- Selecting `빌라` plus `평일 이사` changed the preview to `빌라·평일용`
  with three matching steps.
- Moving the last-confirmed range to `300` days changed the state to
  `참고용 보관`, current management to `관리 공백`, and guidance to
  `대체 Flow 보기`.
- Turning the proposal-pattern filter off changed the queue from the grouped
  `800건` case to `807건이 검토함에 그대로 보입니다` and
  `정상 제안도 묻힘`.
- On the 390px viewport, selecting the sixth scenario activated panel `s6`
  without creating horizontal page overflow.

## Document and source checks

- `npm.cmd run docs:check` — passed.
- Documentation checker result: 16 required files and 3,682 local links.
- Source ledger: 30 official evidence rows.
- Report: 37 external official-source links and six local images.
- No Figma file or Figma output was used. ImageGen was used only for the three
  report illustrations; all Korean UI and explanatory copy is HTML text.

## Evidence boundary

- Observed-user sessions: `0`.
- The report does not claim that the proposed governance UI is implemented in
  the current product.
- Scenario people, proposal counts, and operational thresholds are explicitly
  labelled as illustrative examples or starting hypotheses.
