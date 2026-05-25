# Sinagong Study Source Replacement

Date: 2026-05-25
Branch: `content/sinagong-study-source-replacement`
PR: #67
Status: Open, waiting for checks

## Why

The broad-source queue still included `real-sinagong-computer-d30-study`, even though the project already has an exact Gilbut/Sinagong book page for the representative-eligible `computer-skills-d30-study` example. Study progress tables must be source-derived, so this route should not remain backed only by the broad Sinagong site.

## Changed

- Replaced the broad Sinagong site source with the exact Gilbut/Sinagong book page.
- Kept the route in `reshape_content_or_ux`.
- Updated broad-source guard count from 4 to 3.
- Added audit/spec docs and Flow Lab screenshot evidence.

## Not Done

- Did not promote the route.
- Did not mark validation.
- Did not auto-generate curriculum rows.
- Did not decide whether this route should merge into `computer-skills-d30-study`.

## Verification

- RED: targeted source replacement tests failed before implementation.
- GREEN: targeted tests passed after implementation.
- PASS: `npm run docs:check`
- PASS: `npm test`
- PASS: `npm run build`
- PASS: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"`
- PASS: `git diff --check` with existing CRLF warnings only.
- Screenshot: `docs/screenshots/2026-05-25-sinagong-study-source-replacement-flow-lab.png`
