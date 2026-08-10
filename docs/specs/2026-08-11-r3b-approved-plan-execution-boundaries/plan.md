# R3B Plan

## Sequence

### R3B-00 — Approved product delta

1. Implement the hashed approved plan-execution contract from the R3A base.
2. Keep public read-only actions separate from personal mutation commands.
3. Share pure sort, date-group, raw-memo, responsive, and export-scope mappings
   across public preview, My Plan, and Calendar.
4. Characterize the approved candidate before moving architecture boundaries.

### R3B-01 — Selected Plan surface

1. Characterize the current approved selected-Plan DOM and commands.
2. Add `MyPlanExecutionSurface` with typed model, actions, and renderer slots.
3. Keep every storage, completion, edit, route, and transfer mutation in
   `AppClient` during this move.
4. Replace only the existing renderer body and run focused component and
   browser checks.

### R3B-02 — Saved transfer controller

1. Characterize preview snapshot, request identity, binary/text payload, and
   revalidation parity.
2. Move request planning and revalidation comparison into a pure controller.
3. Keep clipboard/download, receipt persistence, feedback timers, and state
   updates behind injected runtime ports.
4. Preserve artifact bytes and effect-before-receipt ordering.

### R3B-03 — Item detail/editor presentation

1. Inventory the approved read and edit branches separately from legacy paths.
2. Extract only a narrow presentational surface that can be described by a
   stable model/actions contract.
3. Leave locks, draft ownership, completion, recurrence, and storage mutation
   in the compatibility runtime.
4. Stop rather than introduce a mega prop bag or duplicate view model.

Characterization result: stop in this PR. The current renderer spans about
2,074 lines and ten runtime contexts, including focus/history, recurrence,
completion, export, and storage transactions. The next safe slice is a
separate approved read-only Item detail model/surface; the editor remains in
the compatibility runtime until that boundary is proven narrow.

### R3B-04 — CI and publication

1. Map each stale URL-first journey to the approved or explicit rollback lane.
2. Run targeted tests, full unit, build, docs, and full Playwright.
3. Before PR, update `SERVICE_STRUCTURE`, active control documents, R3B QA, and
   the draft PR history with actual local evidence; keep GitHub, merge,
   deployment, and smoke states `NOT_RUN` until observed.
4. Commit intended paths, push, open a PR, wait for all required checks, merge,
   verify Vercel Production, and smoke the canonical alias.
5. Only after the exact merge is deployed and smoked, finalize PR history,
   release history, R3B QA/tasks, and the canonical control documents with the
   observed PR, CI, merge, deployment, and smoke evidence.

## Rollback

- Each code slice can be reverted independently without a storage migration.
- `AppClient` remains the named-export compatibility facade.
- If a typed boundary increases hidden coupling or changes browser behavior,
  retain the characterized implementation and defer that slice rather than
  weakening a test.
