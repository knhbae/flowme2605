# Flow UX Content Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evaluate representative public Flow routes with low-context personas, improve any UX/content issues found, re-evaluate, and deploy to Vercel after the final quality gate passes.

**Architecture:** Treat evaluation as the first implementation task. Source review and screen simulation produce a concrete findings report; only then write tests and code/content changes tied to those findings. Keep reusable process rules in `docs/harness/UX_CONTENT_EVALUATION.md`, round-specific evidence in `docs/superpowers/specs/`, and product changes in the existing Flow UI/data files.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner via `tsx --test`, Playwright, existing FLOW seed bundles, existing docs harness, Vercel CLI/deployment.

---

## File Structure

- Read: `docs/harness/UX_CONTENT_EVALUATION.md` for scoring and pass criteria.
- Read: `docs/superpowers/specs/2026-05-22-flow-ux-content-evaluation-design.md` for approved scope.
- Create: `docs/superpowers/specs/2026-05-22-flow-ux-content-evaluation-report.md` for initial and final evaluation evidence.
- Modify if evaluation finds UX issues: `components/flow/AppClient.tsx`.
- Modify if evaluation finds content issues: `lib/flow/seed-flows.ts` and/or `lib/flow/real-content-pilot-flows.ts`.
- Modify tests for any behavior changes: `tests/e2e/flow-mvp.spec.ts`, `lib/flow/seed-flows.test.ts`, or `lib/flow/export.test.ts`.
- Create screenshots under `test-results/ux-content-evaluation/`.

## Evaluation Sample

Use these five Flows first:

- `moving-d30-basic`
- `baby-food-menu-recipe`
- `running-5k-4week`
- `national-health-checkup-d7`
- `year-end-tax-docs`

Expand with `overseas-travel-d14`, `business-registration-basic`, or `diet-habit-2week` if the first five do not cover a risk, source, or structure type involved in the findings.

### Task 1: Source And Persona Evaluation

**Files:**
- Create: `docs/superpowers/specs/2026-05-22-flow-ux-content-evaluation-report.md`
- Screenshot directory: `test-results/ux-content-evaluation/`

- [ ] **Step 1: Review source URLs**

Open the source URL for each selected Flow. Record the checked date as `2026-05-22`, the source purpose, trust boundary, and any sensitive or time-dependent claims.

- [ ] **Step 2: Create personas**

For every selected Flow, write one persona with life situation, goal, constraints, comprehension lane, trust need, and success signal. Every Flow must include a low-context check.

- [ ] **Step 3: Run screen simulation**

Run the app locally and use Playwright screenshots to simulate:

```powershell
npm run dev -- -p 3000
```

For each Flow route, execute:

1. Open `/f/[slug]`.
2. Run the 10-second first-screen check.
3. Enter anchor/start date if applicable.
4. Identify next action.
5. Inspect one detail if needed.
6. Check one item.
7. Trigger one copy/export path.
8. Locate source/risk/caution.
9. Capture desktop and mobile screenshots when the finding is visual.

- [ ] **Step 4: Write the initial report**

Write scores for Understanding, Plain language, First-screen clarity, Moment-by-moment guidance, Content fit, Actionability, Anchor and timing, Source and trust, Safety, Exportability, Friction, and Recovery. List findings as `P0`, `P1`, `P2`, or `P3`.

### Task 2: Decide Whether Fixes Are Needed

**Files:**
- Modify: `docs/superpowers/specs/2026-05-22-flow-ux-content-evaluation-report.md`

- [ ] **Step 1: Apply pass criteria**

If any `P0` exists, implementation must fix it before deployment. If any first-screen `P1` exists, implementation must fix it before deployment. If only `P2/P3` findings exist, implement the highest-impact `P2` items that improve low-context comprehension without expanding product scope.

- [ ] **Step 2: Document selected fixes**

Add a `Fix Plan` section to the report with each selected fix, evidence, priority, affected files, and expected verification command.

### Task 3: Test-First UX Or Content Fixes

**Files:**
- Test: `tests/e2e/flow-mvp.spec.ts`
- Test if content metadata changes: `lib/flow/seed-flows.test.ts`
- Test if export behavior changes: `lib/flow/export.test.ts`

- [ ] **Step 1: Write failing tests**

For each selected behavior or content fix, add the smallest test that proves the user-facing requirement. Examples:

```ts
await expect(page.getByText('먼저 할 일')).toBeVisible();
await expect(page.getByText('중요한 주의')).toBeVisible();
await expect(page.getByText('공식 정보와 경험 팁을 구분해서 확인하세요')).toBeVisible();
```

For seed metadata:

```ts
assert.ok(bundle.flow.warning?.includes('공식'));
assert.ok(bundle.itemDetails?.some((detail) => detail.caution));
```

- [ ] **Step 2: Run tests to verify RED**

Run the specific test command:

```powershell
npm run test:e2e -- --grep "selected user-facing behavior"
npm test -- lib/flow/seed-flows.test.ts
```

Expected: FAIL because the selected fix has not yet been implemented.

### Task 4: Implement Selected Fixes

**Files:**
- Modify if UX: `components/flow/AppClient.tsx`
- Modify if content: `lib/flow/seed-flows.ts`
- Modify if export: `lib/flow/export.ts`

- [ ] **Step 1: Implement minimal code/content changes**

Keep changes directly tied to the report findings. Do not add login, AI scheduling, push notifications, native health integrations, or broad task-app features.

- [ ] **Step 2: Run tests to verify GREEN**

Run the tests from Task 3. Expected: PASS.

- [ ] **Step 3: Run full quality gate**

Run:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
git diff --check
```

Expected: all commands exit 0. `git diff --check` may print CRLF warnings but must not report whitespace errors.

### Task 5: Re-Evaluate

**Files:**
- Modify: `docs/superpowers/specs/2026-05-22-flow-ux-content-evaluation-report.md`
- Screenshots: `test-results/ux-content-evaluation/`

- [ ] **Step 1: Re-run affected Flow simulations**

Use the same personas and task path. Capture fresh screenshots for changed screens.

- [ ] **Step 2: Update final scores**

Add `Re-evaluation` entries to the report. If any `P0` or unresolved first-screen `P1` remains, return to Task 2 and repeat.

- [ ] **Step 3: Commit report and implementation**

Commit only the related files. Do not revert unrelated working tree changes.

### Task 6: Deploy

**Files:**
- Read: `vercel.json`
- No source file change expected unless deployment config is broken.

- [ ] **Step 1: Inspect deployment configuration**

Run:

```powershell
Get-Content -Encoding utf8 vercel.json
```

- [ ] **Step 2: Deploy to Vercel**

Run the project deployment command available in the environment. Prefer:

```powershell
npx vercel --prod
```

If Vercel requires login or project linking, record the blocker exactly and do not fake deployment success.

- [ ] **Step 3: Record deployment result**

Add deployment URL or blocker to the final response. If deployment succeeds, include the production URL.

## Self-Review

- This plan covers source review, personas, screen simulation, report, fixes, re-evaluation, tests, and deployment.
- It keeps implementation gated by concrete evaluation findings.
- It preserves the low-context first-screen standard and no added explanation rule.
- It avoids new heavyweight product scope before Stage 0 evidence.
