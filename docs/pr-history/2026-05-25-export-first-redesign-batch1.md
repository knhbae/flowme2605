# Export-First Redesign Batch 1

Date: 2026-05-25
Branch: `export-first-redesign-batch1`
PR: #106
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/6zSXCk47kND5PN77iGAiMSYpVHv9

## Why

The redesign mockup in `my_tests/flow_redesign_mockups.html` showed that FLOW detail pages still asked users to inspect dense item lists before understanding the external artifact they would receive. This batch implemented the smallest high-impact correction on `moving-d30-basic`: show the calendar result preview first, make mobile exports destination-first, and reduce item-card control ambiguity.

## Changed

- Added an export-first hero for `moving-d30-basic` with milestone calendar rows before the full item list.
- Moved the moving date input into the hero for that route while preserving existing anchor behavior.
- Updated the mobile export sheet to prioritize calendar, Excel, and text, with editing as a secondary action.
- Changed the sticky mobile CTA to `내 도구로 가져가기`.
- Clarified item-card memo, skip, detail, and skipped-progress states.
- Added audit/spec/QA docs and desktop/mobile screenshot evidence.

## Not Done

- Did not generalize the hero to every route family.
- Did not implement routine-video start-date/weekday session generation.
- Did not add direct integrations, native long-term records, login, payment, community, or AI publishing.
- Did not call the redesign validated.

## Verification

- `npm run build` passed.
- `npm test` passed with 173 tests.
- `npm run docs:check` passed with 14 required files and 276 local links.
- Related Playwright passed with 4 tests.
- `npm run test:e2e` passed with 56 tests.
- Vercel PR check passed before merge.

## Risks

- Only `moving-d30-basic` has the new export-first hero, so other route families still need separate layout passes.
- The item-card hierarchy is clearer, but dense workbench sections still appear quickly below the hero on mobile.
- Figma was considered but not used for this code batch because the user-provided HTML mockup was the design source.

## Follow-Ups

- Generalize Screen 2 only after route families are grouped by natural artifact type.
- Use Figma for the next larger layout pass where multiple route families need a shared design artifact.
- Tackle routine-video Screen 4 separately for exact workout videos.
