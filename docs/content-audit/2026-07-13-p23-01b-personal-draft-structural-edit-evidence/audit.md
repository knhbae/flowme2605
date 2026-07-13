# P23-01B Audit

## Scope decision

This slice exposes structural editing only for personal draft Flow records created by the URL-first miss or memo intake paths. It does not infer eligibility from a specific content slug. Source-backed and published Flow records continue to use their existing personal value overlays without structural controls.

## Integration

The My Flow projection passes draft source items and the persisted structural overlay through the P23-01A pure resolver. My Flow renders `effectiveItems`; the original `FlowBundle.items` array remains unchanged.

The adapter maps the two ownership classes as follows:

- Draft scaffold item: `source`
- User-added item: `user_created`

Existing title/date/memo overlays and completion state continue to resolve outside the structural overlay. A user-added item's completion ID is its stable personal item ID, so completing and reopening it does not rewrite structural data.

## State transitions verified

1. Create a URL-first miss draft and save it to My Flow.
2. Open the draft structure and add a trimmed, non-empty task title.
3. Reload and confirm the same personal item ID remains.
4. Complete and reopen the added item with the existing completion checkbox.
5. Delete the item and confirm a `user_created` tombstone exists while the user item record remains stored.
6. Use the immediate undo action and confirm the same stable ID and effective position return.
7. Reload after delete and confirm the hidden state persists and the session-only undo is gone.
8. Tombstone every effective item and confirm the Flow remains with an empty state and `할 일 추가` entry.
9. Open a source-backed demo and confirm structural add/delete controls are absent.

## Accessibility and layout

- Add is a labeled form with a required non-empty title and disabled empty submit.
- Delete's accessible name includes the task title.
- Undo is a real button inside a live status region.
- Existing task completion and detail opening retain their separate controls.
- The 390px and 1024px screenshots have no horizontal overflow in the tested state.

## Deliberate deferrals

- Reorder UI and `orderOverride` editing
- Calendar projection of added/deleted draft items
- Checklist, sheet, memo, or calendar export projection
- Date and recurrence editing for newly added items
- Persistent multi-step undo history
- Source-backed Flow structural editing

Because Calendar/export projection is excluded from this slice, a tombstoned draft scaffold item can still appear in those pre-existing projections until the projection phase is implemented. This is an explicit scope boundary, not evidence that those destinations are synchronized yet.

## Residual risks

- Eligibility currently relies on the established personal-draft metadata contract. A future additive `recordType` would be safer if additional draft producers are introduced.
- Persistence remains browser-local and device-local.
- Immediate undo is intentionally session-only; reload preserves the tombstone but not the undo notice.
- User-created item scheduling and destination projection remain incomplete until subsequent P23 work.

## Evidence boundary

All findings in this package come from automated unit tests, Playwright interaction, localStorage inspection, and screenshot inspection. No claim here represents observed-user validation.
