# P23-01B Personal Draft Structural Edit Evidence

- Date: 2026-07-13
- Baseline commit: `05965af`
- Scope: URL-first miss or memo personal draft Flow in My Flow
- Viewports: 390x844, 1024x768
- Verification boundary: automated browser and unit-test evidence, not observed-user research

P23-01A's structural overlay is now connected to the My Flow detail surface for eligible personal drafts. A user can add an unscheduled task, complete and reopen it through the existing execution control, remove it through a tombstone, and immediately undo that removal. The source Flow bundle is not mutated.

## Result

| Marker | Result |
| --- | --- |
| `personalDraftStructuralEditEligible` | `true` |
| `personalDraftAddEntryVisible` | `true` at 390 and 1024 |
| `personalDraftUserItemPersistedAfterReload` | `true` |
| `personalDraftDeleteUsesTombstone` | `true` |
| `personalDraftUndoVisible` | `true` immediately after delete |
| `personalDraftUndoRestoresStableId` | `true` |
| `personalDraftAddedItemCompletionReversible` | `true` |
| `personalDraftKeyboardInteractionVerified` | `true` |
| `sourceBackedStructuralEditControlCount` | `0` |

## Policy

- Eligibility is derived from the draft creation contract, not a content slug: draft status, the personal-draft ID namespace, the `내 초안` tag, and the memo/URL draft source classification.
- Added items are stored as `user_created` records in the P23-01A overlay and start without a date.
- Delete writes a tombstone. Undo removes that tombstone and restores the same stable item ID and effective position.
- Completion remains execution state. It is not stored in the structural overlay.
- Source-backed and published Flow structure controls remain hidden.
- Calendar, export, and reorder projection are intentionally deferred to later P23 slices.

## Screenshots

- [Mobile: added personal item](./screenshots/01-personal-draft-item-added-mobile.png)
- [Mobile: tombstone and immediate undo](./screenshots/02-personal-draft-delete-undo-mobile.png)
- [Wide: structural edit entry](./screenshots/03-personal-draft-structural-edit-wide.png)

## Files

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [screenshots/](./screenshots/)
