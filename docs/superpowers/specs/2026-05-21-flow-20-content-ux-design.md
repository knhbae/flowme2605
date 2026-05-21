# 20 Real-Source Flow Content and UX Design

Date: 2026-05-21
Branch: `codex/flow-20-content-ux`

## Goal

Upgrade the 20 real-source creator-channel Flow bundles so they are easier to understand, easier to start, and more useful as execution plans. The work should improve both content quality and user-facing UX, while keeping FLOW's current Stage 0 constraint: this is heuristic content and UX QA, not real user validation.

## Non-Goals

- Do not expand the 200+ generated preview Flow set in this pass.
- Do not claim the flows are validated by real users.
- Do not add login, persistence, payments, AI generation, or creator management workflows.
- Do not change deployment secrets or environment configuration.

## Current Problems

The current real-source batch covers 20 flows, but the item details are generated from a shared template. Each flow has executable items, yet the `why`, `how`, `completion_criteria`, and `caution` fields do not always reflect the specific source or the user's actual next action.

The UX also exposes internal/product labels such as `Real source`, `Preview`, and `Needs review`. Public Flow pages show source links, but they do not make the source checked date, conversion note, or source precision easy to scan.

Some sources are exact official/service pages, while others are broad channel or homepage references. The product should separate these cases without downgrading all broad-but-real sources into generic draft content.

## Recommended Approach

### 1. Content Model

Replace the current `actions: string[]` pattern in `lib/flow/real-source-channel-batch.ts` with structured action details:

```ts
type RealSourceAction = {
  title: string;
  why: string;
  how: string;
  completion_criteria: string;
  caution?: string;
  link_label?: string;
  link_url?: string;
};
```

Each of the 20 real-source Flow specs should keep 5 items, but every item must receive tailored detail text. The source URL remains the default detail link, and an item may override it with `link_url` when a more specific reference exists.

### 2. Source Precision

Add source precision metadata to distinguish exact source pages from broad source surfaces:

```ts
type SourcePrecision = 'exact' | 'broad';
```

Recommended user labels:

- `exact`: `정확한 출처 페이지`
- `broad`: `넓은 출처`

The current `source_status` values remain useful:

- `real`: source exists and was manually attached
- `preview`: generated/sample content
- `needs_review`: content requires explicit review before being treated as source-backed

For this pass, broad channel/homepage sources can remain `real` if the source exists, but they should show `source_precision: 'broad'` so users understand the confidence level.

### 3. Public UX Copy

Replace internal English labels with Korean, user-facing labels:

- `Real source` -> `출처 확인`
- `Preview` -> `샘플`
- `Needs review` -> `검수 필요`
- `Source linked` -> `출처 연결`
- `Draft source` -> `초안`

Creator directory and creator profile stats should use the same Korean labels.

### 4. Public Flow Source Panel

On public Flow pages, source information should answer four questions quickly:

- What source was used?
- When was it checked?
- How was it converted into a Flow?
- Is the source an exact page or a broad channel/homepage?

The panel should show:

- source title
- source link
- source checked date
- conversion note
- source precision label
- warning, if present

### 5. Flow Card Journey

Flow cards should expose a concrete start point before users open the detail page. Add or reuse a compact card line such as:

`첫 행동: {first active item title}`

This helps users judge whether a Flow is practical without reading the entire detail page.

### 6. Anchor UX

For `anchor_type: 'none'` checklist flows, avoid presenting date input as if it is required. The user-facing copy should communicate:

`날짜 입력 없이 바로 체크`

Timeline, phase, and routine flows should keep anchor input behavior.

## Implementation Areas

- `lib/flow/types.ts`
  - Add optional `source_precision`.
- `lib/flow/real-source-channel-batch.ts`
  - Add `RealSourceAction`.
  - Replace generic detail generation with item-specific details.
  - Assign `source_precision` to each of the 20 real-source specs.
- `components/flow/AppClient.tsx`
  - Localize source status labels.
  - Add source precision display.
  - Add first-action preview on Flow cards.
  - Improve checklist/no-anchor copy.
- `lib/flow/seed-flows.test.ts`
  - Assert all 20 real-source flows still exist.
  - Assert every real-source flow has 5 items and 5 item details.
  - Assert item details are not a shared generic template inside a flow.
  - Assert source precision is present.
- `tests/e2e/flow-mvp.spec.ts`
  - Update source status label assertions.
  - Verify source panel and first-action UX.

## Content QA Criteria

Each of the 20 flows should pass these checks:

- The title describes an execution outcome, not just a content topic.
- The 5 item titles are concrete user actions.
- Each item detail explains why the step matters.
- Each item detail tells the user how to execute the step.
- The completion criterion is observable.
- Caution text avoids medical, legal, financial, or official certainty where inappropriate.
- Official information and creator experience remain visually and structurally separate.
- Broad sources are labeled as broad.

## Verification

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

For UI changes, inspect the app in browser after starting:

```powershell
npm run dev
```

The final report should state that this is a heuristic UX/content review unless real user behavior data has been collected separately.
