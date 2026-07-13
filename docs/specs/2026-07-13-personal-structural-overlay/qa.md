# P23-01A QA

## Automated Contract Checks

| Case | Expected |
|---|---|
| unchanged source | same count, source order, ownership `source` |
| source tombstone | source object preserved, effective/projection excluded |
| source restore | same stable ID and original position restored |
| user add | ownership `user_created`, stable personal ID |
| user delete/restore | record preserved behind tombstone, same ID restored |
| mixed reorder | source/user order follows override |
| source v2 add | new source Item appended and not lost |
| source v2 remove | remaining source and user Items preserved |
| value overlay reorder | alias/memo/date remain attached by stable ID |
| completed run reorder | effective structure does not change |
| malformed/duplicate IDs | valid source preserved, warnings returned |
| legacy migration | included/excluded meaning retained additively |

## Persistence Checks

- Existing legacy keys remain unchanged.
- Stored schema v1 loads without migration.
- Missing schema v1 plus legacy selection writes an additive v1 record.
- Migration write failure does not remove legacy data.
- Malformed v1 raw text is not overwritten.
- Explicit Flow clear removes structural overlay records for that Flow.
- Run reset/reuse does not clear structural overlay.
- Local backup exports and restores the structural overlay key.

## Ownership Guards

- The structural schema has no completion, skipped, held, or occurrence fields.
- Unknown execution-like properties are removed during normalization.
- Execution states may be attached to resolver output only as read-only metadata.
- Execution state does not change item membership, order, or structural projection eligibility.

## Projection Checks

- Tombstoned and excluded Items are ineligible for every destination.
- User-created Items are eligible when included.
- Unscheduled Items are ineligible only for Calendar.
- Personal order is stable for list projections.
- Calendar eligibility depends on effective schedule, not order override.

## Regression Commands

```powershell
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
git diff --check
```

Targeted test groups:

- `lib/flow/storage.test.ts`
- `lib/flow/source-backed-my-flow.test.ts`
- `lib/flow/export.test.ts`
- `lib/flow/my-flow-step-export.test.ts`

## Route Sanity

The task must not change `app/`, `components/`, visible copy, route markup, or screenshots. A targeted browser sanity check compares representative `/my` and `/calendar` rendering against the current route behavior; no new controls should appear.

## Manual Follow-up For P23-01B

- Can a user understand that deletion is reversible?
- Is add/delete/undo reachable without turning My Flow into a full editor?
- Does a user-created Item look different only where provenance matters?
- Does the mobile row remain focused on the task and completion action?

## P23-01D1 Projection Adapter Checks

- The adapter never mutates source Items, the structural overlay, or execution
  records.
- Tombstoned and excluded rows have zero eligible destinations.
- An unscheduled user Item remains in My Flow, checklist, sheet, and memo, but
  not Calendar screen or ICS.
- An explicit personal schedule removal follows the same unscheduled policy.
- A personal date override wins over the source schedule.
- Checklist, sheet, and memo preserve personal order.
- Calendar screen and ICS sort by date, then personal order for same-date rows.
- `done` and `reopened` execution metadata survive projection without changing
  membership or order.
- A source ID collision keeps the source row and ignores the colliding user row.
- Unknown order IDs return warnings and cannot remove source rows.
- Source v2 additions remain in the projection.
- The personal-draft wrapper rejects published/source-backed bundles.
- Calendar and export consumer connection markers remain `false` in D1.
