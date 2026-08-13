# Text Authoring P1-C Long Document And Table Preservation

- **PR:** [#185](https://github.com/knhbae/flowme2605/pull/185)
- **Date:** 2026-08-13 KST
- **Branch:** `agent/text-authoring-p1-c-longform-20260813`
- **Status:** Draft / local QA PASS / GitHub and Preview checks pending / unpublished
- **Base branch:** `agent/text-authoring-p0-refresh-20260813`
- **Base commit:** `45780135858a9d4afbd8067139f95cce20e5038e`
- **Parent PR:** [#184](https://github.com/knhbae/flowme2605/pull/184)
- **Approval:** `TA-P1-C-LONGFORM-20260813-01`

## Why

Long source documents and source tables must remain recoverable even when they
cannot be safely converted into structured authoring results. This stacked PR
adds the approved P1-C boundary without broadening the P0 runtime into a
spreadsheet editor or inventing actions from factual rows.

## What Changed

- Preserved blockquotes, fenced code, HTML, comments, blank lines, indentation,
  and ordinary prose as exact raw source blocks.
- Added bounded CSV, TSV, and Markdown table analysis with quoted, multiline,
  escaped, empty-cell, and logical-cell budget handling.
- Kept safe source tables non-executable and exposed them only through Sheet and
  exact TXT projections; unsafe or oversized tables fail closed per result.
- Added source block/row/cell locators, a compact document navigator, focus and
  breakpoint re-entry, raw TXT fallback, and exact download/copy paths.
- Registered every new P1-C unit/component test in `test:text-authoring` and
  enabled the P1-C gate for the CI production E2E build.
- Waited for the saved draft route and receipt dismissal before two reload
  assertions. This removes a parallel handoff race without changing product
  persistence or navigation.

## Not Done

- No spreadsheet/WYSIWYG editor, factual-row Todo promotion, source
  normalization write, public Sheet tab, or PersonalPlan XLSX editor.
- P1-E source candidate updates and P1-G linked lineage are separate stacked
  PRs. P1-A/B/D/F, P2, P35, merge, and production deploy remain excluded.
- No external service write or observed-user validation was performed.

## Decisions

- TXT/raw source remains available even when a structured result is blocked.
- Only the affected result is blocked; unrelated explicit Items and projections
  remain usable.
- Gate off derives a non-destructive TXT-only runtime view and does not mutate a
  saved P1-C document.
- Source locators are verified before selection and fail closed to a nearby
  preserved block without a source write.

## Files Touched

- P1-C analysis, types, parser, validation, projection, export, and operations
- Input, Result, Workspace, document navigator, and view-model components
- Focused unit/component and production browser acceptance tests
- P1-C goal/results evidence, spec index, package test registration, and CI gate

## Verification

| Check                                   | State                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Documentation                           | `npm.cmd run docs:check` PASS — 16 required files, 4,621 local links                       |
| Focused P1-C contracts                  | PASS 74/74                                                                                 |
| Cumulative Text Authoring contracts     | `npm.cmd run test:text-authoring` PASS — 294/294                                           |
| TypeScript                              | `npx.cmd tsc --noEmit -p tsconfig.next.json` PASS                                          |
| Dependency audit                        | `npm.cmd run security:audit` PASS — 0 vulnerabilities                                      |
| Full unit/contract suite                | `npm.cmd test` PASS, exit 0                                                                |
| Gate-on production build                | `npm.cmd run build` PASS — Next 15.5.21, 19 routes                                         |
| Dedicated P1-C browser acceptance       | PASS 8/8                                                                                   |
| Saved re-entry repetition               | H01 PASS 3/3 and 1 MiB F02 PASS 3/3                                                        |
| Cumulative P0 + P1-C browser regression | PASS 66/66, workers 4, 271.2 seconds                                                       |
| Initial cumulative diagnosis            | 65/66; one immediate reload handoff race, no source/storage defect; final rerun PASS 66/66 |
| External side effects                   | 0 product writes; local build/test artifacts only                                          |
| Observed-user validation                | 0                                                                                          |

## Risks And Rollback

- The table boundary is intentionally conservative. Unsupported, ambiguous, or
  oversized structures stay raw instead of being silently normalized.
- Automated QA proves the bounded implementation contract, not whether users
  understand the navigator or table-loss copy.
- Turn off `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_LONG_DOCUMENT_TABLE` or revert
  the commits in this PR to return to the P0 behavior. Saved source bytes remain
  intact and no external rollback is required.

## Follow-Up

- Stack P1-E on this PR and P1-G on P1-E.
- Keep P1-A/B/D/F and P2 outside the stack until separately approved.

## Links

- [P1-C development goal](../specs/2026-08-13-flowme-text-authoring-p1-c-longform/00-development-goal-ko.md)
- [P1-C local result evidence](../content-audit/2026-08-13-flowme-text-authoring-p1-c-longform-results/README.md)
- [Parent V5/P0 PR history](./2026-08-13-text-authoring-v5-p0-integration.md)
