---
name: flow-ux-subtract
description: Use when a FLOW surface is too complex for its own maker to operate. Removes user-facing controls, labels, modes, and concepts without changing the data model. Use INSTEAD OF flow-ux-review when the problem is "too much", not "not enough".
---

# FLOW UX Subtract

Use this skill to remove user-facing surface. It never adds.

`flow-ux-review` produces findings, and findings become additions. When the
reported problem is confusion, overload, or "the maker cannot use it", do not
run a review pass. Run this instead.

## Precondition

The user has named one surface and one target number. Example:

```text
surface: /my (components/flow/AppClient.tsx, MyFlows)
target: 19 removal-concepts -> 2
```

If no target number is given, ask for one. Do not choose it yourself, and do
not start without it.

## Hard Rules

1. **Do not change the data model, storage schema, or stable identity.**
   Removal happens at the render layer only. Every removed control's
   underlying state, key, and migration path stays intact.
2. **Never add a user-facing string.** No new label, tooltip, help text,
   empty-state, confirmation, or "clearer" wording. Zero net new copy.
3. **Never add a mode, tab, panel, sheet, dialog, disclosure, or setting**,
   including as a place to move removed controls into. Removed is removed.
4. **Do not create a spec folder, evidence package, status entry, phase
   number, or closeout report.** Do not run `flow-work-closeout`.
5. **Do not consolidate by renaming.** Merging five verbs into one new verb is
   an addition. Pick one verb that already exists and delete the other four.

## Procedure

1. **Count first.** Report the current numbers for the named surface before
   editing anything:
   - `<button>` count
   - unique user-facing Korean labels
   - conditional render branches (`? (` and `&& (`)
   - distinct concepts in the named family
2. **List every candidate with its call site.** One line each:
   `label | file:line | what it does | KEEP or CUT`
   Show this list and stop. Do not edit until the user confirms the CUT set.
3. **Cut render, keep logic.** Delete the JSX and its handler wiring. Leave
   the underlying function, reducer, storage key, and tests in place unless
   they become unreferenced.
4. **Delete dead code that is now unreachable.** If nothing renders it and no
   test covers it, remove it in the same pass.
5. **Recount and report the delta.** Same four numbers, before and after.

## Success Criteria

The change is only complete when every number went **down**:

```text
buttons        151 -> ?   must decrease
unique labels  548 -> ?   must decrease
branches       310 -> ?   must decrease
net lines        0 -> ?   must be negative
```

A net-positive diff means the skill was applied wrong. Revert and redo.

## Verification

Run only what the blast radius requires:

```powershell
npm test
npm run build
```

Playwright failures on removed controls are **expected and correct**. Delete
those assertions; do not restore the control to make a test pass. Report the
count of deleted assertions as part of the delta.

Never write a document about this change. The diff is the record.

## Stop Conditions

- If a control cannot be removed without a schema migration, leave it and say
  so in one line. Do not design the migration.
- If removing a control would strand user data with no path back, keep the
  control and report it. Data loss is not simplification.
- When the target number is reached, **stop**. Do not continue to the next
  surface, do not propose a follow-up phase, and do not list what else could
  be improved.
