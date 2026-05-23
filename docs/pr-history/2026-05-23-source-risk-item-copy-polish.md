# PR History: Source Risk Item Copy Polish

**Date:** 2026-05-23
**Branch:** `codex/source-risk-item-copy-polish`
**PR:** [#26](https://github.com/knhbae/flowme2605/pull/26)
**Related audit:** [2026-05-23-source-risk-item-copy-polish.md](../content-audit/2026-05-23-source-risk-item-copy-polish.md)
**Related spec:** [2026-05-23-source-risk-item-copy-polish](../specs/2026-05-23-source-risk-item-copy-polish/spec.md)

## Intent

PR #25 added the artifact surfaces for the twelve source replacement and risk review routes. This PR makes the checklist items themselves match those surfaces by filling missing item details and replacing generic official guidance/completion text with artifact-specific copy.

## Changes

- Added route-scoped copy polish config for the twelve audited routes.
- Preserved existing source links and source/risk metadata.
- Filled missing item descriptions, `why`, `how`, `completion_criteria`, and caution boundaries from the route's artifact destination.
- Added regression coverage that rejects missing or generic item detail copy for the twelve routes.
- Recorded representative exposure decision: remain `reshape_before_featured`.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test -- lib/flow/seed-flows.test.ts` | Pass | Targeted test passed after implementation: 119 tests passed, 0 failed. |
| `npm test` | Pass | 119 tests passed, 0 failed. |
| `npm run docs:check` | Pass | Documentation check passed: 14 required files, 66 local links. |
| `git diff --check` | Pass | No whitespace errors reported. |
| `npm run build` | Pass | Next.js production build compiled, type-checked, and generated 9 static pages. |
| `npm run test:e2e` | Pass | 39 Playwright tests passed. |

## Residual Risk

- Copy is improved by route-scoped templates, not fully handcrafted item-by-item prose.
- Sensitive routes still require official confirmation and should not be promoted without real behavior evidence.
