# P23-01C Personal Draft Order And Recovery Evidence

- Date: 2026-07-13
- Baseline commits: `d56d471`, `ca67727`
- Scope: URL-first miss or memo personal draft Flow in My Flow
- Viewports: 390x844, 1024x768
- Verification boundary: automated browser and unit-test evidence, not observed-user research

P23-01C extends the P23-01B personal draft controls with persistent recovery and explicit up/down ordering. Delete still writes a tombstone, but the removed item remains recoverable after reload. Reorder writes only the personal structural overlay's `orderOverride`; source item arrays and execution state remain unchanged.

## Result

| Marker | Result |
| --- | --- |
| `personalDraftPersistentRecoveryEntryVisible` | `true` after reload |
| `personalDraftRestoreAfterReloadStableId` | `true` |
| `personalDraftReorderControlCount` | `8` in the four-item fixture |
| `personalDraftOrderPersistedAfterReload` | `true` |
| `personalDraftReorderPreservesCompletion` | `true` |
| `personalDraftRestorePreservesPersonalValues` | `true` |
| `sourceBackedStructuralReorderControlCount` | `0` |
| `personalDraftHorizontalOverflowCount` | `0` at 390 and 1024 |
| `calendarStructuralProjectionConnected` | `false`, deferred to P23-01D |
| `exportStructuralProjectionConnected` | `false`, deferred to P23-01D |

## Policy

- The controls remain limited to records eligible under the existing personal-draft contract. Published and source-backed Flow records expose no structural reorder or recovery controls.
- Delete materializes the current personal order before writing the tombstone. Persistent restore therefore returns the item to its delete-time personal position.
- Source scaffold and `user_created` items can both be restored without changing their stable IDs.
- Title alias, date override, personal memo, and completion are keyed outside the structural tombstone. They remain attached after delete and restore.
- Up/down buttons are native buttons. Their accessible names include the item title and direction; unavailable boundary moves are disabled.
- Completion and reopen remain execution state. They do not enter `orderOverride` or tombstones.
- Calendar and export still read their previous projections in this slice. Their structural projection markers intentionally remain `false`.

## Screenshots

- [Mobile: mixed source and personal item reorder](./screenshots/01-personal-draft-reordered-mobile.png)
- [Mobile: persistent recovery after reload](./screenshots/02-personal-draft-persistent-recovery-mobile.png)
- [Mobile: restored personal values and completion](./screenshots/03-personal-draft-restored-mobile.png)
- [Wide: compact order controls](./screenshots/04-personal-draft-order-wide.png)

## Files

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [screenshots/](./screenshots/)
