# Broad Source Code Guard

Date: 2026-05-25
Branch: `content/broad-source-code-guard`
PR: #59
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/92T8FBZeHMd4jx5ZK2yMakZ9kHJf

## Why

The broad-source route review clarified the editorial rule, but future seed changes still need a code-level summary guard. Content Lab should be able to report broad real-source routes and flag if any broad route leaks into lifecycle `keep`.

## Changed

- Added Content Lab summary fields for broad real-source route count, slug list, and representative leak slugs.
- Added a Content Lab regression test for all seven current broad real-source routes.
- Added a broad-source code guard audit and durable spec.

## Not Done

- Did not change public route exposure.
- Did not replace source URLs.
- Did not render a new public UI.
- Did not mark any route validated.

## Verification

- RED: `npm test -- lib/flow/content-lab.test.ts` failed before implementation because `broadRealSourceSlugs` was missing.
- GREEN: `npm test -- lib/flow/content-lab.test.ts` passed after implementation.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `git diff --check` passed with CRLF warnings only.
- Vercel PR check passed before merge.

## Risks

- The guard is visible in summary data, not yet as a dedicated visual Content Lab card.
- The exact expected broad-route list must be updated when a route receives an exact source.
