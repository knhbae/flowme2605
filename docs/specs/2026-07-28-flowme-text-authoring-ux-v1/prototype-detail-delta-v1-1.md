# Prototype Detail Delta v1.1

## Decision

Keep the v1 `text + preview` structure. Add enough real content and state continuity for an owner
to judge source fidelity, editing, projection, save, and export without mentally filling gaps.

## Interaction Contract

### Input

- Show the source title or personal-draft state.
- Show captured source scope, version, and preservation policy.
- Preserve the complete input while interpretation changes.

### Structure

- Select one interpreted Item at a time.
- Show its source fragment before the full outline.
- Show role, Step, effective date, detail, completion criterion, resource/place, and personal
  changes.
- Keep split, merge, reorder, role, include/exclude, and undo as correction tools, not a general
  block editor.

### Contextual Item Edit

- Show the source fragment and stable Item identity.
- Compare source interpretation with the personal result.
- Allow title, detail, completion criterion, date, time, place, repeat, and duration.
- Write changes only to the selected ownership lane.

### Result

- Recommend one primary artifact and at most two useful secondary artifacts.
- Render actual data, not a label-only tab.
- Show interpreted, included, excluded, dated/undated counts, date range, personal context, and
  expected information loss.
- Use the same effective title, date, time, detail, and completion criterion in every projection.

### Export

- Choose scope first: whole, selected, or current.
- Choose only formats eligible for the active artifact.
- Show exact count, date range, loss, and generated sample before confirmation.
- The receipt must repeat the same scope, format, count, first Items, and sample.

### Recovery

- Preserve raw input, Item structure, personal edits, active artifact, anchor, title, and contextual
  personal values in the browser fixture.
- Reload must not replace recovered values with case defaults.

## Ownership Boundary

- Source fragment and source interpretation remain evidence.
- Personal edits do not rewrite the source.
- Creator draft, personal draft, and correction suggestion remain separate write paths.
- Completion history and recurrence occurrence state are outside this authoring prototype.

## Acceptance Markers

- Eight cases expose source -> Item -> artifact detail.
- Moving: 24 Calendar rows and computed date range.
- K-MOOC: 14 Sheet rows.
- LibriVox: 38 ordered chapter rows without invented dates.
- Workout: edited time appears in Calendar and ICS and survives reload.
- A selected Item edit changes result and export.
- Whole, selected, and current preflight counts are visible.
- 390, 1024, and 1440 have no document-level horizontal overflow.
- Edit and export dialogs have keyboard focus return.
- Browser console reports zero errors and warnings.
- Observed-user count remains 0.
