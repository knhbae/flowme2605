# Real Source Channel Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first 20 real source-backed creator-channel Flows and make the app distinguish them from the existing 200+ preview-generated Flows.

**Architecture:** Keep the static seed architecture. Add source validation metadata to the shared Flow type, add a focused `real-source-channel-batch` data module, merge that module into `seedBundles`, mark generated preview Flows as preview, and update channel summaries/UI to report real vs preview counts.

**Tech Stack:** Next.js 15, TypeScript, React, Tailwind, Node test runner via `tsx --test`, Playwright E2E, Vercel.

---

## File Map

- Modify `lib/flow/types.ts`: add `SourceStatus` and optional Flow metadata fields.
- Create `lib/flow/real-source-channel-batch.ts`: define 20 real source-backed Flow bundles and helper metadata.
- Modify `lib/flow/creator-channel-preview.ts`: mark generated preview Flows as `source_status: 'preview'` and expand summary counts.
- Modify `lib/flow/seed-flows.ts`: append the real source-backed batch before or after preview bundles without breaking existing seeds.
- Modify `lib/flow/seed-flows.test.ts`: add tests for real/preview source status and per-channel 2-real-Flow coverage.
- Modify `lib/flow/content-lab.ts` and `lib/flow/content-lab.test.ts`: expose real vs preview batch metrics.
- Modify `components/flow/AppClient.tsx`: add real/preview counts, badges, and channel page filter.
- Modify `components/flow/ContentLab.tsx`: show the real batch separately from preview-generated count.
- Modify `tests/e2e/flow-mvp.spec.ts`: add UI route coverage for real source-backed filters and representative Flow execution.

## Source Batch

Use these 20 planned source-backed Flows. If one URL has moved during implementation, replace it with the nearest official/current source and keep the same channel/category.

| Channel slug | Flow slug | Source status | Candidate source |
| --- | --- | --- | --- |
| `samsung-service` | `real-samsung-aircon-seasonal-care` | real | `https://www.samsungsvc.co.kr/` |
| `samsung-service` | `real-samsung-washer-filter-care` | real | `https://www.samsungsvc.co.kr/` |
| `thankyou-bubu` | `real-thankyou-bubu-home-workout-starter` | real | `https://www.youtube.com/@ThankyouBUBU` |
| `thankyou-bubu` | `real-thankyou-bubu-20min-routine` | real | `https://www.youtube.com/@ThankyouBUBU` |
| `fitvely` | `real-fitvely-diet-record-routine` | real | `https://www.youtube.com/@FITVELY` |
| `fitvely` | `real-fitvely-weekly-body-check` | real | `https://www.fitvely.com/` |
| `sinagong` | `real-sinagong-computer-d30-study` | real | `https://www.sinagong.co.kr/` |
| `sinagong` | `real-qnet-application-examday-check` | real | `https://www.q-net.or.kr/` |
| `gov24` | `real-gov24-moving-report-check` | real | `https://www.gov.kr/` |
| `gov24` | `real-gov24-resident-register-copy` | real | `https://www.gov.kr/` |
| `childcare-portal` | `real-childcare-vaccination-visit-prep` | real | `https://www.childcare.go.kr/` |
| `childcare-portal` | `real-childcare-support-application-check` | real | `https://www.childcare.go.kr/` |
| `pet-care-note` | `real-pet-registration-check` | real | `https://www.animal.go.kr/` |
| `pet-care-note` | `real-pet-health-visit-routine` | real | `https://www.animal.go.kr/` |
| `ohouse-living` | `real-ohouse-moving-d30-prep` | real | `https://ohou.se/` |
| `ohouse-living` | `real-ohouse-movein-cleaning-check` | real | `https://ohou.se/` |
| `travelholic` | `real-mofa-overseas-travel-prep` | real | `https://www.0404.go.kr/` |
| `travelholic` | `real-kdca-travel-health-check` | real | `https://www.kdca.go.kr/` |
| `mobility-life` | `real-ts-vehicle-inspection-prep` | real | `https://www.kotsa.or.kr/` |
| `mobility-life` | `real-safe-driving-license-renewal` | real | `https://www.safedriving.or.kr/` |

## Task 1: Add Source Metadata Types And Failing Tests

**Files:**
- Modify: `lib/flow/types.ts`
- Modify: `lib/flow/seed-flows.test.ts`

- [ ] **Step 1: Extend the type plan in tests before implementation**

Append these tests to `lib/flow/seed-flows.test.ts`:

```ts
test('real source-backed channel batch covers every preview channel', () => {
  const real = seedBundles.filter((bundle) => bundle.flow.source_status === 'real');
  assert.ok(real.length >= 20);

  for (const channel of previewCreatorChannels) {
    const count = real.filter((bundle) => bundle.flow.owner_user_id === channel.id).length;
    assert.ok(count >= 2, `${channel.slug} expected at least 2 real source-backed flows`);
  }
});

test('real source-backed flows include attribution and executable details', () => {
  const real = seedBundles.filter((bundle) => bundle.flow.source_status === 'real');
  assert.ok(real.length >= 20);

  for (const bundle of real) {
    assert.ok(bundle.flow.source_url, `${bundle.flow.slug} missing source_url`);
    assert.ok(bundle.flow.source_title, `${bundle.flow.slug} missing source_title`);
    assert.ok(bundle.flow.source_checked_at, `${bundle.flow.slug} missing source_checked_at`);
    assert.ok(bundle.flow.conversion_note, `${bundle.flow.slug} missing conversion_note`);
    assert.ok(bundle.items.length >= 5, `${bundle.flow.slug} expected 5+ items`);
    assert.ok(
      bundle.itemDetails?.some((detail) => detail.completion_criteria),
      `${bundle.flow.slug} expected completion criteria`,
    );
  }
});

test('preview-generated creator channel flows are explicitly marked preview', () => {
  const generated = seedBundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));
  assert.ok(generated.length >= 200);
  assert.ok(generated.every((bundle) => bundle.flow.source_status === 'preview'));
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- lib/flow/seed-flows.test.ts
```

Expected: TypeScript/test failure because `source_status`, `source_checked_at`, and `conversion_note` do not exist or no real batch exists.

- [ ] **Step 3: Add Flow metadata types**

In `lib/flow/types.ts`, add:

```ts
export type SourceStatus = 'real' | 'preview' | 'needs_review';
```

Then add optional fields to `Flow`:

```ts
  source_status?: SourceStatus;
  source_checked_at?: string;
  conversion_note?: string;
```

- [ ] **Step 4: Run focused tests again**

Run:

```powershell
npm test -- lib/flow/seed-flows.test.ts
```

Expected: still FAIL because real batch data and preview status are not implemented yet.

- [ ] **Step 5: Commit**

```powershell
git add lib/flow/types.ts lib/flow/seed-flows.test.ts
git commit -m "test: define real source channel batch coverage"
```

## Task 2: Add 20 Real Source-Backed Flow Bundles

**Files:**
- Create: `lib/flow/real-source-channel-batch.ts`
- Modify: `lib/flow/seed-flows.ts`

- [ ] **Step 1: Create a focused data module**

Create `lib/flow/real-source-channel-batch.ts` with this structure:

```ts
import { FlowBundle, FlowItem, FlowItemDetail, FlowUser, RiskLevel, SourceType, StructureType, AnchorType } from './types';
import { previewCreatorChannels } from './creator-channel-preview';

const checkedAt = '2026-05-21';
const now = '2026-05-21T00:00:00.000Z';

type RealSourceSpec = {
  channelSlug: string;
  slug: string;
  title: string;
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  source_title: string;
  source_url: string;
  source_type: SourceType;
  risk_level: RiskLevel;
  conversion_note: string;
  warning?: string;
  tags: string[];
  sections: string[];
};

const channelBySlug = new Map(previewCreatorChannels.map((channel) => [channel.slug, channel]));

function requireChannel(slug: string): FlowUser {
  const channel = channelBySlug.get(slug);
  if (!channel) throw new Error(`Missing preview channel: ${slug}`);
  return channel;
}

function makeItems(flowId: string, sectionIds: string[], sourceUrl: string, sourceType: SourceType, riskLevel: RiskLevel): FlowItem[] {
  return [
    ['goal', sectionIds[0], 'Set the execution goal and reference date', 0],
    ['source', sectionIds[0], 'Open the source page and confirm the latest instructions', 1],
    ['materials', sectionIds[0], 'Prepare required materials, documents, or tools', 2],
    ['execute', sectionIds[1] ?? sectionIds[0], 'Complete the main action step by step', 3],
    ['record', sectionIds[1] ?? sectionIds[0], 'Record completion, result, and follow-up date', 4],
  ].map(([id, sectionId, title, order]) => ({
    id: `${flowId}-${id}`,
    flow_id: flowId,
    section_id: sectionId as string,
    title: title as string,
    type: 'todo',
    order: order as number,
    source_type: sourceType,
    risk_level: riskLevel,
    description: 'Source-backed execution item converted for FLOW use.',
  }));
}

function makeDetails(items: FlowItem[], sourceUrl: string): FlowItemDetail[] {
  return items.map((item) => ({
    item_id: item.id,
    why: 'Keeps the source-backed Flow actionable instead of leaving the user with passive content.',
    how: 'Use the linked source as the reference, then complete this item in your own situation.',
    completion_criteria: `${item.title} is checked, recorded, or prepared.`,
    caution: 'Re-check the linked source if the topic is administrative, health, safety, or deadline-sensitive.',
    links: [{ label: 'Source', url: sourceUrl, type: 'reference' }],
  }));
}

function buildBundle(spec: RealSourceSpec): FlowBundle {
  const channel = requireChannel(spec.channelSlug);
  const flowId = `flow-${spec.slug}`;
  const sections = spec.sections.map((title, index) => ({
    id: `${flowId}-section-${index + 1}`,
    flow_id: flowId,
    title,
    order: index + 1,
  }));
  const items = makeItems(flowId, sections.map((section) => section.id), spec.source_url, spec.source_type, spec.risk_level);

  return {
    flow: {
      id: flowId,
      slug: spec.slug,
      title: spec.title,
      category: spec.category,
      structure_type: spec.structure_type,
      anchor_type: spec.anchor_type,
      status: 'published',
      source_status: 'real',
      source_title: spec.source_title,
      source_url: spec.source_url,
      source_checked_at: checkedAt,
      conversion_note: spec.conversion_note,
      risk_level: spec.risk_level,
      warning: spec.warning,
      owner_user_id: channel.id,
      creator_name: channel.name,
      creator_role: channel.role,
      creator_note: channel.bio,
      usage_count: 0,
      copy_count: 0,
      tags: spec.tags,
      created_at: now,
      updated_at: now,
    },
    sections,
    items,
    itemDetails: makeDetails(items, spec.source_url),
  };
}
```

- [ ] **Step 2: Add the 20 specs**

In the same file, add `realSourceSpecs` using the Source Batch table above. Use original, execution-oriented Korean titles if the file encoding is healthy; otherwise use ASCII-safe English titles and keep the channel/category metadata intact.

The export must be:

```ts
export const realSourceChannelBundles: FlowBundle[] = realSourceSpecs.map(buildBundle);
```

- [ ] **Step 3: Integrate into seed bundles**

In `lib/flow/seed-flows.ts`, import:

```ts
import { realSourceChannelBundles } from './real-source-channel-batch';
```

Then include it before generated preview bundles:

```ts
  ...realContentPilotBundles,
  ...realSourceChannelBundles,
  ...previewFlowBundles,
];
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
npm test -- lib/flow/seed-flows.test.ts
```

Expected: tests still fail only for preview status until Task 3 is complete.

- [ ] **Step 5: Commit**

```powershell
git add lib/flow/real-source-channel-batch.ts lib/flow/seed-flows.ts
git commit -m "feat: add real source channel flow batch"
```

## Task 3: Mark Preview Flows And Expand Summary Metrics

**Files:**
- Modify: `lib/flow/creator-channel-preview.ts`
- Modify: `lib/flow/seed-flows.test.ts`

- [ ] **Step 1: Mark generated preview Flows**

Inside the preview bundle builder in `lib/flow/creator-channel-preview.ts`, add this field to each generated Flow:

```ts
source_status: 'preview',
```

- [ ] **Step 2: Extend channel summary type**

Update the summary returned by `getCreatorChannelSummaries` so each summary includes:

```ts
realFlowCount: channelBundles.filter((bundle) => bundle.flow.source_status === 'real').length,
previewFlowCount: channelBundles.filter((bundle) => bundle.flow.source_status === 'preview').length,
needsReviewFlowCount: channelBundles.filter((bundle) => bundle.flow.source_status === 'needs_review').length,
```

Keep existing `flowCount`, `sourceCoverage`, and `executionScore` behavior intact.

- [ ] **Step 3: Run focused tests**

Run:

```powershell
npm test -- lib/flow/seed-flows.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add lib/flow/creator-channel-preview.ts lib/flow/seed-flows.test.ts
git commit -m "feat: track real and preview channel flow counts"
```

## Task 4: Add Content Lab Metrics

**Files:**
- Modify: `lib/flow/content-lab.ts`
- Modify: `lib/flow/content-lab.test.ts`
- Modify: `components/flow/ContentLab.tsx`

- [ ] **Step 1: Add tests for real source metrics**

In `lib/flow/content-lab.test.ts`, add:

```ts
test('content lab separates real source batch from preview generated flows', () => {
  const summary = getContentLabSummary(seedBundles);
  assert.ok(summary.realSourceFlowCount >= 20);
  assert.ok(summary.previewGeneratedFlowCount >= 200);
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
npm test -- lib/flow/content-lab.test.ts
```

Expected: FAIL because `realSourceFlowCount` is missing.

- [ ] **Step 3: Implement the metric**

In `lib/flow/content-lab.ts`, add:

```ts
realSourceFlowCount: bundles.filter((bundle) => bundle.flow.source_status === 'real').length,
```

to the summary object.

- [ ] **Step 4: Update ContentLab copy**

In `components/flow/ContentLab.tsx`, update the Phase 2 metric block so it displays:

```tsx
<p className="text-sm text-gray-600">Actual source-backed batch</p>
<p className="text-2xl font-semibold text-gray-950">{summary.realSourceFlowCount}</p>
<p className="text-sm text-gray-600">Preview-generated library</p>
<p className="text-2xl font-semibold text-gray-950">{summary.previewGeneratedFlowCount}</p>
```

Use existing styling patterns from the component.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm test -- lib/flow/content-lab.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/flow/content-lab.ts lib/flow/content-lab.test.ts components/flow/ContentLab.tsx
git commit -m "feat: separate real source batch metrics"
```

## Task 5: Add Creator UX Real/Preview Separation

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add E2E coverage first**

In `tests/e2e/flow-mvp.spec.ts`, add:

```ts
test('creator channel can filter real source-backed flows', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByText(/real source/i)).toBeVisible();
  await page.getByRole('button', { name: /real source/i }).click();
  await expect(page.getByRole('link', { name: /Samsung|aircon|washer/i }).first()).toBeVisible();
  await expect(page.getByText(/preview/i).first()).not.toBeVisible();
});
```

If the UI labels are Korean, use the final Korean strings consistently in both UI and test.

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
npm run test:e2e -- --grep "creator channel can filter real"
```

Expected: FAIL because the filter and badges do not exist.

- [ ] **Step 3: Add filter state**

In `CreatorProfile` in `components/flow/AppClient.tsx`, add:

```ts
const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'preview'>('all');
```

Then apply it to `visibleCreatorBundles`:

```ts
.filter((bundle) => {
  if (sourceFilter === 'real') return bundle.flow.source_status === 'real';
  if (sourceFilter === 'preview') return bundle.flow.source_status === 'preview';
  return true;
})
```

- [ ] **Step 4: Add source filter controls**

Near existing category filters, add three buttons:

```tsx
{[
  ['all', 'All'],
  ['real', 'Real source'],
  ['preview', 'Preview'],
].map(([key, label]) => (
  <button
    key={key}
    className={`rounded-md border px-3 py-2 text-sm font-semibold ${
      sourceFilter === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
    }`}
    onClick={() => setSourceFilter(key as 'all' | 'real' | 'preview')}
  >
    {label}
  </button>
))}
```

- [ ] **Step 5: Add Flow card badges**

In the creator Flow card render, show:

```tsx
<span className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
  {bundle.flow.source_status === 'real' ? 'Real source' : bundle.flow.source_status === 'preview' ? 'Preview' : 'Needs review'}
</span>
```

- [ ] **Step 6: Run focused E2E**

Run:

```powershell
npm run test:e2e -- --grep "creator channel can filter real"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: separate real and preview creator flows"
```

## Task 6: Full Verification And Vercel Preview

**Files:**
- No planned source edits unless verification exposes defects.

- [ ] **Step 1: Run unit tests**

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

```powershell
npm run build
```

Expected: Next.js build succeeds and lists `/creators`, `/u/[creator]`, and `/f/[slug]`.

- [ ] **Step 3: Run full E2E**

```powershell
npm run test:e2e
```

Expected: all Playwright tests pass.

- [ ] **Step 4: Deploy preview**

```powershell
npx vercel deploy --yes
```

Expected: Vercel returns a `READY` preview URL.

- [ ] **Step 5: Spot-check deployment with Vercel curl**

Use the returned URL as `$base`:

```powershell
$base = 'https://returned-preview-url.vercel.app'
npx vercel curl /creators --deployment $base -- --silent
npx vercel curl /u/samsung-service --deployment $base -- --silent
npx vercel curl /f/real-samsung-aircon-seasonal-care --deployment $base -- --silent
```

Expected:

- `/creators` includes real and preview counts.
- `/u/samsung-service` includes real source-backed entries.
- `/f/real-samsung-aircon-seasonal-care` opens without the not-found fallback.

- [ ] **Step 6: Push branch**

```powershell
git push
```

Expected: `origin/codex/creator-channel-200-preview` is updated.
