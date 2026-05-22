# FLOW Source Fit Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a source-fit audit layer that judges whether original source content deserves FLOW conversion, then expose the first representative audit batch in Flow Lab.

**Architecture:** Keep source-fit logic separate from page UX scoring. Add a small pure TypeScript module for score calculation and audit records, then wire summary counts into `ContentLab`. Public Flow exposure remains unchanged in this first slice.

**Tech Stack:** Next.js, React, TypeScript, Node test runner, Markdown docs.

---

## File Structure

- Create `lib/flow/source-fit.ts`: source-fit types, score function, decision banding, representative audit records.
- Create `lib/flow/source-fit.test.ts`: score and audit coverage tests.
- Modify `lib/flow/content-lab.ts`: include audit summary in existing lab summary.
- Modify `lib/flow/content-lab.test.ts`: assert representative audit coverage and decision counts.
- Modify `components/flow/ContentLab.tsx`: show source-fit summary and representative audit table.
- Create `docs/superpowers/specs/2026-05-22-flow-source-fit-audit-design.md`: product design and source-fit rubric.
- Create `docs/content-audit/2026-05-22-source-fit-audit.md`: first audit report.

## Task 1: Add Source-Fit Scoring Module

**Files:**

- Create: `lib/flow/source-fit.ts`
- Test: `lib/flow/source-fit.test.ts`

- [ ] **Step 1: Write the failing score test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSourceFitDecision,
  scoreSourceFit,
  sourceFitAudits,
} from './source-fit';

test('source-fit scoring clamps each dimension to its maximum and returns a 0-100 score', () => {
  assert.equal(
    scoreSourceFit({
      actionDensity: 99,
      temporalStructure: 99,
      externalManagementNeed: 99,
      completionClarity: 99,
      personalizationNeed: 99,
      returnValue: 99,
      sourceSpecificityTrust: 99,
      riskBoundaryClarity: 99,
    }),
    100,
  );
});

test('source-fit decisions follow public handling bands', () => {
  assert.equal(getSourceFitDecision(90), 'keep_representative');
  assert.equal(getSourceFitDecision(70), 'reshape_before_featured');
  assert.equal(getSourceFitDecision(50), 'catalog_preview_only');
  assert.equal(getSourceFitDecision(20), 'hide_from_public_catalog');
});

test('representative source-fit audit includes source and gap notes', () => {
  const moving = sourceFitAudits.find((audit) => audit.slug === 'moving-d30-basic');
  assert.ok(moving);
  assert.equal(moving.decision, 'keep_representative');
  assert.ok(moving.currentGap.length > 0);
  assert.ok(moving.sourceUrl.startsWith('https://'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/flow/source-fit.test.ts`

Expected: FAIL because `lib/flow/source-fit.ts` does not exist yet.

- [ ] **Step 3: Implement `source-fit.ts`**

Create the module with:

- `SourceFitDecision`
- `SourceFitScores`
- `scoreSourceFit`
- `getSourceFitDecision`
- `sourceFitAudits`
- `getSourceFitAudit`
- `getSourceFitSummary`

- [ ] **Step 4: Run source-fit tests**

Run: `npx tsx --test lib/flow/source-fit.test.ts`

Expected: PASS.

## Task 2: Integrate Source-Fit Summary Into Content Lab

**Files:**

- Modify: `lib/flow/content-lab.ts`
- Modify: `lib/flow/content-lab.test.ts`
- Modify: `components/flow/ContentLab.tsx`

- [ ] **Step 1: Add failing content-lab test**

Add assertions that:

- `getContentLabSummary(seedBundles).sourceFitAuditedCount` is `10`.
- `sourceFitDecisionCounts.keep_representative` is at least `5`.
- `sourceFitDecisionCounts.catalog_preview_only` is at least `1`.

- [ ] **Step 2: Run current tests**

Run: `npm test`

Expected: FAIL until summary integration is added.

- [ ] **Step 3: Add summary integration**

Update `getContentLabSummary` to merge `getSourceFitSummary()` into the return object.

- [ ] **Step 4: Add Flow Lab UI**

Add a "Source Fit Audit" section in `components/flow/ContentLab.tsx` with:

- audited count
- average score
- decision counts
- representative table with Flow title, score, decision, source precision, current gap, and next action

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS.

## Task 3: Verify Docs and App Build

**Files:**

- Verify all modified files.

- [ ] **Step 1: Run docs check**

Run: `npm run docs:check`

Expected: PASS.

- [ ] **Step 2: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

## Scope Notes

This plan does not remove public routes. Deletion and demotion are intentionally deferred to the next batch because the user asked to handle the rest later and because public exposure changes should be reviewed separately.

