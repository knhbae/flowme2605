# P23-01A Tasks

## Contract

- [x] Define schema version and storage prefix.
- [x] Define user-created Item ownership.
- [x] Define source/user tombstones and restore semantics.
- [x] Define personal order override.
- [x] Define legacy included/excluded compatibility.
- [x] Keep personal value overlay and execution state separate.

## Resolver

- [x] Preserve source input objects.
- [x] Hide tombstoned Items from effective output.
- [x] Restore stable IDs by removing tombstones.
- [x] Preserve user-created Item IDs.
- [x] Append source v2 Items missing from personal order.
- [x] Defend against unknown and duplicate IDs.
- [x] Keep completed/skipped run state structurally neutral.
- [x] Return destination projection eligibility.

## Persistence

- [x] Add versioned localStorage adapter.
- [x] Add additive legacy migration.
- [x] Preserve malformed raw records.
- [x] Separate explicit Flow clear from run reset.
- [x] Include structural overlay in local backup/restore.

## Test

- [x] Run all 12 golden fixtures.
- [x] Verify source input is unchanged.
- [x] Verify user item delete and restore transition.
- [x] Verify completion fields are not persisted in structural overlay.
- [x] Verify malformed storage does not overwrite raw data.
- [x] Verify migration persistence failure preserves legacy state.
- [x] Verify backup/restore includes overlay.
- [x] Verify Flow clear removes overlay and run reset preserves it.

## Validation

- [x] Targeted unit tests pass.
- [x] `npm.cmd test` passes.
- [x] `npm.cmd run docs:check` passes.
- [x] `npm.cmd run build` passes.
- [x] `git diff --check` passes.
- [x] Targeted route sanity shows no UI change.
- [x] Commit only P23-01A files.
- [x] Push current branch.

## Next

- [x] P23-01B goal is defined; implementation remains a separate task.
