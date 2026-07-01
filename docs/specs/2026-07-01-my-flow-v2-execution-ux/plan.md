# My Flow v2 Execution UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/my` a clearer saved-work execution inbox by separating post-save confirmation from normal Today/Flow execution.

**Architecture:** The existing `MyFlows` component remains the implementation surface. The change is scoped to post-save routing, Today/Flow hierarchy, documentation, and E2E expectations. No new persistence model is introduced.

**Tech Stack:** Next.js App Router, React, TypeScript, Playwright, local storage backed saved Flow snapshots.

---

## Files

- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`
- Modify: `docs/specs/README.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/SERVICE_STRUCTURE.md`
- Create: `docs/specs/2026-07-01-my-flow-v2-execution-ux/spec.md`
- Create: `docs/specs/2026-07-01-my-flow-v2-execution-ux/plan.md`
- Create: `docs/specs/2026-07-01-my-flow-v2-execution-ux/tasks.md`
- Create: `docs/specs/2026-07-01-my-flow-v2-execution-ux/qa.md`
- Create: `docs/content-audit/2026-07-01-my-flow-v2-execution-ux-plan-ko.html`
- Create: `docs/content-audit/2026-07-01-my-flow-v2-screen-design-ko.html`
- Create: `docs/content-audit/2026-07-01-my-flow-v2-simulation-report-ko.html`

## Tasks

### Task 1: Document the v2 UX model

- [ ] Add the spec and planning HTML.
- [ ] Define post-save, Today, Flow, Step detail, and Calendar roles.
- [ ] Record deferred features separately from implementation scope.

### Task 2: Simplify post-save handoff

- [ ] Replace the post-save mini inventory with a compact confirmation.
- [ ] Rename primary action to `지금 할 일 열기`.
- [ ] Rename secondary action to `전체 Flow 보기`.
- [ ] Route the primary action to the normal Today detail surface.
- [ ] Keep existing test IDs where possible for a smaller test diff.

### Task 3: Update tests

- [ ] Update tests that expected `my-flow-post-save-flow-list` and post-save inline detail.
- [ ] Assert that the post-save mini inventory is absent.
- [ ] Assert that primary action opens `my-flow-now-section` detail.
- [ ] Assert that Flow view still exposes saved structure.

### Task 4: Update status and service structure docs

- [ ] Add the v2 decision to `docs/SERVICE_STRUCTURE.md`.
- [ ] Add a concise status note to `docs/STATUS.md`.
- [ ] Register the spec in `docs/specs/README.md`.

### Task 5: Verify and deploy

- [ ] Run `npm run docs:check`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run targeted Playwright for post-save, `/my`, and `/calendar`.
- [ ] Run a mobile click simulation.
- [ ] Deploy a Vercel preview.
