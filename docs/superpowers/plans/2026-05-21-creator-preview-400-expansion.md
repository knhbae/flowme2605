# Creator Preview 400 Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand generated creator preview Flow entries from 200 to 400+ and improve creator profile browsing.

**Architecture:** Keep the current generated-preview architecture. Increase `topicTemplates`, add creator-profile search filtering, and update unit/E2E tests to make the larger library non-regressive.

**Tech Stack:** Next.js, React, TypeScript, Node test runner, Playwright.

---

### Task 1: Failing Scale Tests

- [ ] Update `lib/flow/seed-flows.test.ts` so generated preview Flow expectations require at least 400 entries and each preview channel has at least 40 flows.
- [ ] Update `tests/e2e/flow-mvp.spec.ts` so creator directory expects 400+ channel-scale content and the Samsung channel expects 40+ browsable entries.
- [ ] Run the focused tests and confirm they fail on the current 200-entry preview library.

### Task 2: Preview Library Expansion

- [ ] Add 20+ new topic templates to `lib/flow/creator-channel-preview.ts`.
- [ ] Run unit tests and confirm the preview library tests pass.

### Task 3: Creator Profile Search UX

- [ ] Add search state to `CreatorProfile` in `components/flow/AppClient.tsx`.
- [ ] Filter visible creator bundles by title, description, category, source title, and tags.
- [ ] Show result count near the library heading.
- [ ] Add E2E coverage for searching inside a creator channel.

### Task 4: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:e2e`.
- [ ] Push the branch and update the existing PR.
