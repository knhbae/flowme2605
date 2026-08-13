# Text Authoring P1-G Bounded Linked Flow Lineage Contract

- **PR:** [#187](https://github.com/knhbae/flowme2605/pull/187)
- **Date:** 2026-08-13 KST
- **Branch:** `agent/text-authoring-p1-g-linked-lineage-20260813`
- **Status:** Draft / local QA PASS / GitHub and Preview checks pending / unpublished
- **Base branch:** `agent/text-authoring-p1-e-source-update-20260813`
- **Base commit:** `332d0b55ccc05e76bcabc056f2f9cb77ea753d8d`
- **Parent PR:** [#186](https://github.com/knhbae/flowme2605/pull/186)
- **Approval:** `TA-P1-G-LINKED-LINEAGE-20260813-01`

## Why

Some same-source work has one bounded condition that introduces a separately
completed child Flow. The relation needs a canonical, rights-safe contract
before any runtime model is considered, so a parent cannot silently own or
bulk-complete the child's state.

## What Changed

- Added a closed canonical relation schema for one conditional child, depth one,
  stable source/root/parent/child/version identities, and acyclic bounds.
- Added six rights-safe synthetic customs/vehicle cases without copied official
  source bytes, private document values, tax amounts, addresses, or contacts.
- Specified the exact `vehicleIncluded` predicate, separate completion owners,
  next action, return-to-parent pointer, source locators, and link-only evidence.
- Added executable fail-closed acceptance for missing/invalid conditions,
  locator/hash/version mismatch, self-link/cycle, duplicate child, dangling
  pointer, reused owner, unauthorized transition, and collaboration fields.
- Registered the spec-only acceptance in `test:text-authoring` without exporting
  a production module.

## Not Done

- No runtime relation model, app/component UI, parser, Item/checklist child,
  storage, schema migration, feature flag, provider, or publication path.
- No general DAG/dependency/assignee/shared completion/project workspace.
- P1-A/B/D/F, P2, P35, merge, production deploy, external side effects, and
  observed-user validation remain excluded.

## Decisions

- Vehicle absent emits child zero; vehicle present emits exactly one stable
  child. Missing or non-boolean conditions block with writes zero.
- Inspection and taxation remain branches of the parent customs Flow.
- Completion authority is per Flow execution owner, never an assignee identity.
- Rights remain `LINK_ONLY`; execution-time legal/customs recheck is required.

## Verification

| Check                               | State                                                                |
| ----------------------------------- | -------------------------------------------------------------------- |
| Documentation                       | `npm.cmd run docs:check` PASS — 16 required files, 4,633 local links |
| Targeted linked-lineage contract    | PASS 10/10                                                           |
| Cumulative Text Authoring contracts | `npm.cmd run test:text-authoring` PASS — 321/321                     |
| TypeScript                          | `npx.cmd tsc --noEmit -p tsconfig.next.json` PASS                    |
| Dependency install/audit            | `npm.cmd ci` PASS — 0 vulnerabilities                                |
| Runtime path drift                  | 0 — app/components/store/runtime schema/feature flag unchanged       |
| Parent runtime browser baseline     | P1-E exact parent passed cumulative 75/75 before this spec-only diff |
| External side effects               | 0                                                                    |
| Observed-user validation            | 0                                                                    |

## Risks And Rollback

- The fixture is synthetic and confirms contract shape, not customs-law
  correctness or observed user need.
- Runtime implementation requires a separate approval and must not reuse this
  test-local contract as an implicit production schema.
- Revert this PR to remove only spec, fixture, docs, and test registration; no
  product or external state rollback is required.

## Follow-Up

- Owner review of the four-PR stack is next. Merge and production deployment
  remain separate decisions.
- Keep all broader linked-flow/runtime work on hold until independently approved.

## Links

- [P1-G development goal](../specs/2026-08-13-flowme-text-authoring-p1-g-linked-lineage/00-development-goal-ko.md)
- [P1-G local result evidence](../content-audit/2026-08-13-flowme-text-authoring-p1-g-linked-lineage-results/README.md)
- [Parent P1-E PR history](./2026-08-13-text-authoring-p1-e-source-update.md)
