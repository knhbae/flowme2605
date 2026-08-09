# FlowMe R3A My Flow Experience Boundary

**Date:** 2026-08-09

**Status:** Merged through PR #169, deployed to Vercel Production, and production smoke passed; observed users 0

**Baseline:** `efa4d90a78a06134180701bed74874579ac94154`

**Branch:** `codex/r3a-my-flow-experience-boundary-20260809`

## Goal

Allow My Flow UX and information-architecture candidates to be connected,
compared, and removed without changing the canonical saved data, execution,
artifact, or receipt contracts.

R3A does not move `MyFlowRuntime` wholesale. It inserts a JSON-safe read model
and one route-level experience host between the current effective Flow assembly
and the existing My Flow route surface.

## Why This Slice Exists

R0-R2 separated Calendar calculation, Calendar route/controller behavior, My
Flow route rendering, and saved-library navigation planning. The remaining My
Flow runtime still combines presentation assembly with private saved/runtime
objects and renderer callbacks. Repeated MVP discovery work therefore edits the
same compatibility runtime even when the intended change is only UX or
information structure.

R3A creates a stable input for replaceable experiences while retaining
`AppClient.tsx` as the compatibility runtime and mutation owner.

## Target Direction

```text
source + personal overlay + execution records
                    |
                    v
          EffectiveFlowSnapshot
                    |
                    v
       MyFlowWorkspaceSnapshotV1
          (pure, JSON-safe, not saved)
                    |
                    v
         MyFlowExperienceHost
          /                  \
   classic surface        r3a-lab surface
          \                  /
           semantic navigation intents
                    |
                    v
 existing controllers, locks, transactions, artifacts, receipts
```

## Scope

In:

- A versioned, deterministic, JSON-safe My Flow workspace snapshot built from
  existing `EffectiveFlowSnapshot` instances and narrow route/lifecycle facts.
- Explicit separation of the personal saved-route identity from source Flow
  identity.
- One route-level experience selector whose default and fallback are always
  `classic`.
- An internal `r3a-lab` candidate that consumes only the workspace snapshot and
  semantic navigation intents.
- The current My Flow route surface retained unchanged as the classic
  compatibility path.
- A temporary compatibility renderer port for the selected Plan execution
  surface; it delegates to the existing runtime and does not expose raw saved
  records to the candidate.
- Unit, contract, build, and browser regression evidence for classic parity,
  selector preservation, storage non-mutation, and responsive candidate use.

Out:

- Moving `MyFlowRuntime` or its mutation commands wholesale.
- UI or copy changes to the default production experience.
- localStorage/sessionStorage key, raw JSON, schema, migration, or dual-write
  changes.
- Flow/Item identity, source/personal/execution/receipt ownership changes.
- New edit, completion, lifecycle, result-transfer, or receipt command
  semantics.
- Changes to artifact membership, counts, order, hashes, or success-before-
  receipt ordering.
- Text-to-Flow integration or observed-user validation. Deployment and smoke
  remain publication gates rather than product implementation scope.

## Contracts

### Workspace snapshot

- `savedFlowSlug` is the personal route/storage identity.
- `sourceFlowId` and `sourceFlowSlug` are copied from
  `EffectiveFlowSnapshot.identity` and must not replace `savedFlowSlug`.
- Source, personal, and execution versions are copied without reinterpretation.
- Included and excluded Items retain stable IDs, order, completion state,
  schedule facts, capabilities, export eligibility, and result counts.
- Item route hints retain zero, one, or many occurrence targets instead of
  silently collapsing a repeated Item to its first occurrence.
- All output owns its arrays and objects; no input object is mutated or exposed.
- The snapshot imports no React, DOM, browser storage, `AppClient`, artifact
  effect, or receipt writer.
- The snapshot is derived on render and is never persisted.
- Snapshot input collection and deep cloning run only for the exact eligible
  `r3a-lab` request; classic My Flow and Calendar do not build the snapshot.

### Experience selection

- Missing, malformed, unsupported, or case-mismatched selectors resolve to
  `classic`.
- Only exact `myFlowExperience=r3a-lab` requests the candidate.
- The selector is query-only and is not written to localStorage or
  sessionStorage.
- Existing My Flow URL transforms preserve the unrelated selector.
- Existing P35 exact-off rollback flags retain their current independent
  meanings; R3A is not added to `p35-round2-flags.ts`.

### Candidate safety

- The candidate is available only on `/my` when the canonical saved-library and
  current user-copy contracts are active.
- Post-save decision panels and canonical-copy reconciliation continue through
  the classic surface.
- The candidate receives no `MySavedFlow`, `FlowBundle`, saved record, map
  persistence object, storage key, or writer.
- Candidate actions delegate to the existing R2 navigation controller.
- Existing Plan execution, editing, completion, export, and lifecycle behavior
  remains behind the compatibility runtime.

## Acceptance Criteria

- Default `/my` produces the current classic DOM, copy, routes, test IDs, focus,
  scroll, and behavior without an added wrapper or snapshot construction.
- A second My Flow experience is selected by one exact route-level selector and
  can be removed without a data migration.
- Unknown selectors and unsafe candidate states fall back to classic.
- The workspace snapshot is deterministic, JSON-safe, input-immutable, and
  independent from React/browser/persistence/effect modules.
- Saved-route and source identities remain separately inspectable.
- Snapshot Flow/Item order, inclusion, exclusion, completion, versions,
  capabilities, and result counts match the existing effective snapshots.
- List -> Plan -> Item -> Back and query/filter transitions preserve the
  experience selector.
- Read-only classic and candidate navigation changes neither local nor session
  raw storage bytes and records zero storage writes.
- Targeted tests, AppClient lock contract, full unit/contract tests, production
  build, selected browser regressions, and 390/1024/1440 checks pass.
- Internal QA is reported separately from deployment and observed-user evidence.

## Stop Conditions

- Stop if the snapshot requires a persistence read, schema migration, or
  canonical-model rewrite.
- Stop if the classic path needs a DOM, copy, route, or effect-order change.
- Stop if the candidate requires direct storage, export, or receipt imports.
- Stop and open a separate R3B scope if a new candidate needs dedicated edit,
  completion, lifecycle, or result-transfer command ports.
- Commit, push, PR, merge, and production deployment were separately
  authorized on 2026-08-09 and completed with each state independently
  verified in [qa.md](./qa.md).
