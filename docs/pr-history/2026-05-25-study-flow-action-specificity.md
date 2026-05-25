# Study Flow Action Specificity

Date: 2026-05-25

## Summary

PR #101 tightened `computer-skills-d30-study` so each dated study item explains what the user should do and which external artifact receives the result. The route remains representative-eligible, not validated.

## Scope

- Rewrote all nine study item details with `실행:` and `기록:` cues.
- Added a source-boundary sentence: the D-30 plan is FLOW's exam-date conversion, not a source-authored 30-day curriculum.
- Included item `how` guidance in dated ICS event descriptions so calendar reminders carry action detail.
- Recorded the study sequence rule and Figma follow-up boundary in dated audit/spec docs.

## Verification

- RED: `npm test -- lib/flow/seed-flows.test.ts lib/flow/export.test.ts` failed before implementation because the D-30 conversion boundary and dated ICS action guidance were missing.
- GREEN: `npm run build` passed.
- GREEN: `npm test` passed with 169 tests.
- GREEN: `npm run docs:check` passed with 14 required files and 256 local links.
- GREEN: `npm run test:e2e -- -g "computer skills final QA exports study calendar and score sheet records|study progress table exposes source-derived guard metadata"` passed.
- GREEN: `npm run test:e2e` passed with 53 tests.
- Vercel check passed on PR #101 before merge.

## Merge

- PR: #101
- Squash merge commit: `495c9cf8302760f189bb0bc3a0b77573943ff69a`
- Post-merge main sync completed locally.
