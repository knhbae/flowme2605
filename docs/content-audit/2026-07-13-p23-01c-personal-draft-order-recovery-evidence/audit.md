# P23-01C Audit

## Scope decision

This slice connects persistent recovery and explicit order editing only to personal draft Flow records. It does not expose source-backed editing, drag-and-drop, Calendar projection, or export projection. The visible list is still produced by the P23-01A resolver.

## Order contract

The adapter swaps IDs from the resolver's current effective list and persists the result through `setPersonalStructuralOrder`. Tombstoned and excluded slots are not treated as visible move targets. Unknown IDs from a newer or removed source version remain in their existing `orderOverride` slots rather than being discarded.

Before delete, the adapter materializes the current all-item personal order. This gives persistent restore an explicit delete-time location. Restoring removes only the matching tombstone; it does not recreate, clone, or mutate the item.

The following invariants are covered by unit fixtures:

1. Source and `user_created` items can be reordered together.
2. First-up and last-down operations are rejected without a write.
3. Reload reads the same personal order.
4. A completed item retains its completion state after reorder.
5. Source and user-created tombstones survive reload and restore the same stable IDs.
6. Title alias, personal date, and memo remain keyed to the restored item.
7. A malformed or unknown `orderOverride` ID cannot remove source items.
8. A source v2 item that was not in the old personal order is merged without destroying that order.

## UI and accessibility

- Every effective personal draft item has separate up and down buttons.
- Button labels include the visible item title and move direction.
- Enter and Space keyboard activation are exercised in the browser scenario.
- Boundary buttons are disabled.
- Removed items are grouped under a native collapsed persistent recovery entry.
- Recovery is separate from the session-only immediate undo status.
- The tested 390px and 1024px states have no horizontal overflow.
- Source-backed Flow records expose zero reorder and persistent recovery controls.

## Ownership boundary

| Owner | Data retained in this slice |
| --- | --- |
| Source/version | Canonical item identity, title, detail, schedule, source order |
| Personal structural overlay | User-created item, tombstone, restore state, `orderOverride` |
| Personal value overlay | Title alias, date override, personal memo |
| Execution run | Pending, completed, reopened and other run state |

Reorder, delete, and restore never write completion state. Completion and personal values survive because their records continue to use the stable item ID.

## Deliberate P23-01D boundary

Calendar and export projection are not connected to the effective structural list in P23-01C. A newly added, reordered, or tombstoned draft item can therefore differ between My Flow and those destinations until P23-01D. The next slice should replace those projection inputs with the same resolver output and define destination-specific treatment for unscheduled, completed, excluded, and tombstoned items.

## Residual risks

- Persistence remains browser-local and device-local.
- Up/down controls are robust and keyboard accessible but slower than drag-and-drop for very long lists.
- The source v2 merge is ID-based. A publisher changing an item's stable ID still requires version-review policy rather than automatic similarity matching.
- Persistent recovery is per Flow, not a global trash system.
- Calendar and export are intentionally not synchronized with structural changes yet.

## Evidence boundary

All findings come from unit tests, Playwright interaction, localStorage persistence checks, and screenshot inspection. They are not observed-user usability findings.
