# Artifact-Near Export Actions Implementation Plan

**Goal:** Put export controls inside the artifact workbench while preserving existing export behavior.

**Architecture:** Keep export logic in `AppClient.tsx`. Pass handlers/state into `ArtifactWorkbench` through an optional `exportActions` prop, and render a compact reusable action row near the workbench heading.

**Files:**
- Modify `components/flow/AppClient.tsx` to pass existing export handlers into `ArtifactWorkbench`.
- Modify `components/flow/ArtifactWorkbench.tsx` to render artifact-near export controls.
- Modify `tests/e2e/flow-mvp.spec.ts` to protect workbench-local export controls.
- Add audit, QA, PR history, and screenshots under `docs/`.

## Tasks

1. Add RED E2E that expects copy/xlsx/calendar controls inside `Flow artifact workbench`.
2. Verify the RED fails because export controls currently live outside the workbench.
3. Add `ArtifactExportActions` type and pass existing handlers/state into `ArtifactWorkbench`.
4. Render compact artifact-near export controls in the workbench header.
5. Verify targeted E2E passes.
6. Add docs and screenshots.
7. Run `npm test`, `npm run docs:check`, `npm run build`, `npm run test:e2e`, and browser verification.
8. Open PR, merge if checks pass, sync main, and record post-merge status.
