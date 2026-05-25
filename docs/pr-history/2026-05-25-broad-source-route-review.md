# Broad Source Route Review

Date: 2026-05-25
Branch: `docs/broad-source-route-review`
PR: #57
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/D952DwC2eWZk62LoqtSoXkmyTXGt

## Why

Exact-video execution passes improved concrete creator-content routes, but the remaining real-source broad routes still use channel pages, site home pages, broad study material, FAQ pages, or official portals. These routes need a clear editorial gate so they are not mistaken for representative-ready content.

## Changed

- Added a broad-source route audit covering all current real+broad routes.
- Separated creator channel/site sources from broad official reference portals.
- Recorded required exact-source work before any public MVP or representative framing.
- Added execution-specificity guidance for broad source replacement.
- Added a durable spec under `docs/specs/2026-05-25-broad-source-route-review/`.

## Not Done

- Did not replace source URLs.
- Did not change route exposure, lifecycle buckets, or UI.
- Did not generate missing source rows or movement/program details.
- Did not mark any route validated.

## Verification

- `npm run docs:check` passed.
- `git diff --check` passed with CRLF warnings only.
- Vercel PR check passed before merge.

## Risks

- Existing direct routes remain accessible, so this review is an editorial gate rather than a product-level hiding mechanism.
- Some broad official references may still be useful, but they should not be used as evidence of source-specific execution clarity.

## Follow-Ups

- Replace or demote broad ThankyouBUBU and FITVELY channel/site routes first.
- Attach exact study rows before using broad Sinagong source content as a study progress route.
- Re-source pet health and MOFA routes with route-specific official pages before stronger exposure.
