# Export-First Study UX Direction PR History

**Date:** 2026-05-24
**Branch:** `codex/export-first-study-ux-direction`
**PR:** TBD
**Status:** In Progress
**Related spec:** [2026-05-24-export-first-study-ux-direction](../specs/2026-05-24-export-first-study-ux-direction/spec.md)
**Related audits:** [study gap](../content-audit/2026-05-24-study-source-curriculum-ux-gap.md), [common first-screen audit](../content-audit/2026-05-24-common-first-screen-ux-audit.md)

## Why

The product direction now needs to be durable: FLOW should compile outside content into a user's existing calendar, sheet, checklist, or memo before asking them to manage records inside FLOW. Study content made the gap concrete because a blank progress table asks the user to do the work FLOW should eventually do.

## What Changed

- Recorded export-first and study source-curriculum direction in product principles.
- Added study UX gap audit for `computer-skills-d30-study`.
- Added common first-screen UX audit for page-density issues.
- Added editable source-derived progress defaults for `computer-skills-d30-study`.
- Export now includes source-derived study progress defaults before user edits.
- Captured desktop/mobile screenshots.

## Not Done

- No automatic URL ingestion.
- No AI curriculum generator.
- No native study dashboard.
- No broad common-layout refactor.

## Verification

- RED: `npm test -- lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` failed before implementation.
- GREEN: `npm test -- lib/flow/artifact-fields.test.ts lib/flow/export.test.ts` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 160 local links.
- GREEN: `npm run build` passed.
- GREEN: `npm run test:e2e -- --grep "computer skills final QA"` passed: 1 test.
- GREEN: `npm test` passed: 129 tests.
- GREEN: `npm run docs:check` passed: 14 required files, 162 local links.
- GREEN: `git diff --check` passed with CRLF warnings only.
- GREEN: `npm run test:e2e` passed: 44 tests.

## Risks

- Source-derived defaults are only a first step; they do not replace a real ingestion/conversion system.
- Common first-screen simplification needs a later focused PR because broad layout changes can affect many routes at once.
