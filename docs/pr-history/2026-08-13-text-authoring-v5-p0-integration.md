# Text Authoring V5 And Service P0 Integration

- **PR:** Draft creation pending
- **Date:** 2026-08-13 KST
- **Branch:** `agent/text-authoring-p0-refresh-20260813`
- **Status:** Draft preparation / local QA PASS / unpublished
- **Base:** `origin/main` at `a179eb8dbbdcf9ddd6ae3ce7f8fd2bf1bb04714a`
- **Approval:** `TA-TEXT-AUTHORING-STACK-INTEGRATION-20260813-01`

## Why

The Text Authoring V5 workspace and its locally completed service P0 were kept
on rollback-safe local branches while `main` continued to move. This PR reapplies
that bounded work to the latest `origin/main` so it can be reviewed as the base
of a four-PR stack instead of reopening the old conflicting PR.

## What Changed

- Replayed the four V5 commits and the approved P0 promotion commit onto the
  latest `origin/main` without changing their source worktrees.
- Preserved plain text as the default input and kept Calendar, Todo, Sheet, and
  TXT as four fixed authoring results.
- Integrated local draft storage, recovery, coherent explicit save, ready
  handoff, source/result navigation, guarded Inspector edits, bounded
  recurrence, file transfer, responsive layout, and accessibility evidence.
- Resolved the six canonical-document conflicts by retaining current `main`
  release facts and adding the Text Authoring history and unpublished state.
- Hardened two library-to-editor browser assertions to allow a 15-second client
  route transition under the full four-worker production test load. Product
  navigation behavior was not changed.

## Not Done

- P1-C long document/table handling, P1-E source candidate updates, and P1-G
  linked-lineage contracts are separate stacked PRs.
- No P1-A/B/D/F, P2, P35, merge, production deployment, external Calendar/Todo/
  Excel write, or observed-user validation is included.
- Preview deployment is review infrastructure only and is not release or
  observed-user evidence.

## Decisions

- The old PR #175 remains closed; this branch starts from current `origin/main`.
- The original local P0 commit remains a rollback anchor and was not rewritten.
- V5 and service P0 stay together as the reviewable foundation because the P0
  service changes depend on the V5 workspace and canonical model.
- Plain prose remains TXT source content and is never promoted to an inferred
  Todo.

## Files Touched

- `app/flows/authoring/` and `app/flows/new/`
- `components/flow/text-authoring/`
- `lib/flow/text-authoring/`
- Text Authoring product and QA browser tests
- Text Authoring specifications, evidence, and canonical project-control docs

## Verification

| Check                      | State                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Documentation              | `npm.cmd run docs:check` PASS — 16 required files, 4,616 local links                                    |
| Text Authoring contracts   | `npm.cmd run test:text-authoring` PASS — 259/259                                                        |
| TypeScript                 | `npx.cmd tsc --noEmit -p tsconfig.next.json` PASS                                                       |
| Dependency audit           | `npm.cmd run security:audit` PASS — 0 vulnerabilities                                                   |
| Full unit/contract suite   | `npm.cmd test` PASS, exit 0                                                                             |
| Production build           | `npm.cmd run build` PASS — Next 15.5.21, 19 routes                                                      |
| Product browser regression | PASS 58/58, workers 4, 226.2 seconds                                                                    |
| Timing diagnosis           | Initial 56/58; both 5-second route boundaries. Isolated repeat PASS 6/6; hardened full rerun PASS 58/58 |
| External side effects      | 0 product writes; local build/test artifacts only                                                       |
| Observed-user validation   | 0                                                                                                       |

## Risks And Rollback

- This is internal QA on a production build, not evidence of user comprehension
  or repeated real-world use.
- The stack is intentionally unpublished and must remain Draft until GitHub
  checks and Preview complete on the pushed head.
- Revert this branch's V5/P0 commits or disable Text Authoring with the existing
  product gate to return to the current `main` behavior. No data migration or
  external rollback is required.

## Follow-Up

- Stack P1-C on this PR, P1-E on P1-C, and P1-G on P1-E.
- Review each track independently; do not merge or deploy without a separate
  owner decision.

## Links

- [P0 development goal](../specs/2026-08-11-flowme-text-authoring-service-p0/00-development-goal-ko.md)
- [P0 promotion evidence](../content-audit/2026-08-13-flowme-text-authoring-p0-promotion-results/README.md)
- [Current status](../STATUS.md)
- [Current roadmap](../ROADMAP.md)
