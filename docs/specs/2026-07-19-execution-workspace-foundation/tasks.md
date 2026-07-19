# P25 Execution Workspace Foundation Tasks

Only the active slice belongs in an implementation PR. Later checkboxes are sequencing memory, not permission to implement everything at once.

## P25-00A - Planning package

- [x] Separate owner, Codex, and Claude evidence types.
- [x] Identify convergent product problems and conflicting priorities.
- [x] Review current P24 screenshots and runtime structure.
- [x] Refresh official reference patterns.
- [x] Define the P25 product model, sequence, gates, and non-goals.
- [x] Update canonical status, roadmap, decisions, ideas, and reference docs.
- [x] Run docs and workboard visual verification.

## P25-00B - Prototype decision

- [x] Capture the current six core surfaces at 390px and 1024px.
- [x] Draw at least two alternative frames for save, whole Flow, My Flow, Calendar, adjustment, and export.
- [x] Simulate moving, vehicle checklist, routine, trip plan, record flow, and memo draft.
- [ ] Record owner keep/change/reject decisions per surface.
- [ ] Freeze labels, local tabs, drawer depth, and dated/undated behavior.
- [x] Publish the implementation-ready screen contract without changing app runtime.

## P25-01 - Correctness

- [ ] Connect a canonical effective item/occurrence projection to all consumers.
- [ ] Remove invented recurrence fallbacks.
- [ ] Add recurrence/count parity fixtures and E2E.
- [x] Add memo split preview and remove count-filling generic items.
- [x] Verify representative routine and personal-draft counts/dates across their eligible destinations.

### P25-01A - Canonical routine projection

- [x] Share source cadence across public preview, workbench, My Flow Calendar, and ICS.
- [x] Preserve daily, weekly, and monthly cadence without a generic weekly fallback.
- [x] Refuse ambiguous natural cadence instead of inventing future dates.
- [x] Preserve source data, occurrence execution state, and stable portable identity.
- [x] Add monthly/weekly fixtures, browser journeys, screenshots, and ICS evidence.

### P25-01B - Memo split and count integrity

- [x] Inventory memo draft preview, saved bundle, whole Flow, My Flow, and export counts.
- [x] Remove generic count-filling items and error/status sentences from executable titles.
- [x] Add an explicit split preview and acceptance boundary before save.
- [x] Make accepted item identities and counts survive save, reload, and every list export.
- [x] Verify representative memo, URL miss, source-backed, and routine counts without starting P25-02 UI restructuring.

## P25-02 - Whole Flow workspace

- [x] Build shared responsive workspace primitives.
- [x] Implement post-save whole-Flow confirmation with full structure.
- [x] Implement returning whole-Flow view and local `지금 / 내 Flow / 완료` model approved in P25-00B.
- [x] Keep personal identity primary and source context secondary.
- [x] Verify mobile drill-in and wide pane behavior.

## P25-03 - Personal adjustment

- [x] Implement compact default item drawer.
- [x] Move time/duration/recurrence to advanced schedule.
- [x] Add selected-item batch mode.
- [x] Implement selected date set/clear scope and impact preview.
- [x] Connect source-backed personal adjustments through overlays only.

## P25-04 - Anytime and Calendar

- [x] Implement the approved Anytime/undated terminology and state cues.
- [x] Keep undated tasks executable in My Flow.
- [x] Add Calendar scheduling queue on mobile and wide.
- [x] Connect today/date/keep-undated and batch placement actions.
- [x] Verify no duplicate completion controls or missing tasks.

## P25-05 - Execution and export

- [x] Normalize completion/undo/persistent reopen.
- [x] Separate series, occurrence, and internal checklist UI.
- [x] Put export scope before format.
- [x] Show exact counts and verify projection parity.

## P25-06/P25-07 - Public and visual integration

- [ ] Reduce public save-before to one artifact representation.
- [ ] Replace preview completion-like controls with inclusion semantics.
- [ ] Remove repeated explanation bands.
- [ ] Apply shared components, responsive tokens, and action vocabulary.
- [ ] Recheck held/review visual language.

## P25-08 - Internal gate

- [ ] Run six end-to-end simulated journeys.
- [ ] Capture mobile and wide screenshots.
- [ ] Record parity, tap depth, accessibility, overflow, and console evidence.
- [ ] Run unit, docs, build, and relevant full E2E.
- [ ] Produce owner readiness decision package.
- [ ] Keep real-user observation at `0 / 15` unless explicitly reopened later.
