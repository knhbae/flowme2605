# FITVELY Diet Source Replacement

Date: 2026-05-25
Branch: `content/fitvely-broad-source-review`
PR: #65
Status: Merged and Vercel check passed
Vercel: https://vercel.com/flowme/flowme2605/Awt52GYuxrQsmhTXJWsdt1Tiao6o

## Why

The broad-source queue still included two FITVELY routes that pointed at the general FITVELY site. The diet-record route has an exact FITVELY nutrition video that can support a sheet/memo conversion. The weekly body-check route does not yet have a matching measurement/check-in source, so it should stay broad rather than receiving invented source detail.

## Changed

- Replaced `real-fitvely-diet-record-routine` broad site source with an exact FITVELY YouTube video.
- Kept `real-fitvely-weekly-body-check` in the broad-source queue.
- Updated source-fit and broad-source guard counts from 5 to 4.
- Updated artifact-plan tests so the remaining broad FITVELY route carries the catalog-review guard.
- Added audit/spec docs.

## Not Done

- Did not promote either FITVELY route.
- Did not claim validation.
- Did not invent weekly body-check measurement rules.
- Did not build a nutrition calculator or native long-term diet record.

## Verification

- RED: targeted source replacement tests failed before implementation.
- GREEN: targeted tests passed after implementation.
- `npm run docs:check` passed.
- `npm test` passed.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"` passed.
- `git diff --check` passed with CRLF warnings only.
- Vercel PR check passed before merge.

## Screenshot

- `docs/screenshots/2026-05-25-fitvely-diet-source-replacement-flow-lab.png`
