# Flow Demo UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the public demo UX across landing, public Flow pages, and `/my` while preserving demo value such as schedule/calendar preview.

**Architecture:** Keep the Stage 0 static/client-only model. All progress recovery reads existing localStorage keys, and all navigation and Flow rendering changes stay in `components/flow/AppClient.tsx` without adding login, DB, or external integrations.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage, Playwright E2E.

---

### Task 1: Write Failing E2E Coverage

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] Update the home test so the expected public nav is `둘러보기`, `내 Flow`, the hero headline is `따라하기 쉬운 실행 가이드, Flow`, hero tags are absent, and the secondary creator action is a text link.
- [ ] Update `/my` expectations from creator studio language to `내 Flow` language and add a localStorage progress recovery check.
- [ ] Update public Flow expectations so duplicated source/details and section shortcut links are absent.
- [ ] Update dated Flow expectations so the tab bar shows `전체 할 일` and `일정 보기`, keeps calendar demo value after anchor entry, and hides date-dependent schedule tabs before an anchor.
- [ ] Run focused Playwright tests and verify they fail against the current implementation.

### Task 2: Implement Navigation And Landing Polish

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] Change `PlatformNav` to expose only `둘러보기` and `내 Flow` for public users while keeping direct routes available.
- [ ] Simplify `HomeLanding` hero copy and remove the hero tag chip row.
- [ ] Keep creator entry as a lower-weight text link instead of a second primary-sized button.
- [ ] Remove `대표 항목:` from `FlowCard`.
- [ ] Keep demo-safe metadata (`베타 운영 중`, item count, duration/category) rather than fake numeric stats.

### Task 3: Implement Public Flow Detail Polish

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] Replace Step 2/3 card grid with an anchor setup card plus compact progress/export panels.
- [ ] Disable copy/excel/calendar exports while progress is 0, with explicit helper text.
- [ ] Remove duplicated `출처와 주의 정보` details block; source card remains the source of truth.
- [ ] Simplify tabs to `전체 할 일` and `일정 보기` for dated Flow pages; date-dependent schedule view stays locked until an anchor/example date exists.
- [ ] Remove `섹션 바로가기`, since `전체 흐름` cards already link to sections.

### Task 4: Implement `/my` Progress Recovery

**Files:**
- Modify: `lib/flow/storage.ts`
- Modify: `components/flow/AppClient.tsx`

- [ ] Add a client-only helper that reads existing check, anchor, and item-state localStorage keys and returns active progress summaries for seed/public flows.
- [ ] Change `/my` title and empty state to user-facing `내 Flow`.
- [ ] Render `진행 중인 Flow` cards when local progress exists, including progress count and continue link.
- [ ] Keep copied/drafted Flow management visible below active progress, without presenting `/my` as a creator-only studio.

### Task 5: Verify, Document, And Update PR

**Files:**
- Modify: `docs/pr-history/2026-05-22-flow-item-card-ux.md`

- [ ] Run `npm run docs:check`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run focused Playwright tests, then full `npm run test:e2e`.
- [ ] Update PR history with the broader UX polish scope, not-done items, and verification evidence.
- [ ] Update PR #8 title/body after pushing.
