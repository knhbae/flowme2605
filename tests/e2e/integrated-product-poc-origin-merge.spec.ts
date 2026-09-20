import { test, expect, type Page } from '@playwright/test';
import { buildPersonalWorkspacePocReadModel } from '../../lib/flow/personal-workspace-poc-read-model';
import { toPersonalWorkspacePocFlowItemRef } from '../../lib/flow/personal-workspace-poc-contract';
import { seedBundles } from '../../lib/flow/seed-flows';
import { normalizeExecutionModel } from '../../lib/flow/execution-model';
import { getSourceFitAudit } from '../../lib/flow/source-fit';
import { buildProgramCatalog } from '../../lib/flow/integrated-poc/catalog';
import type { FlowBundle } from '../../lib/flow/types';

const ROUTE = '/my?personalWorkspacePoc=v1';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const savedAt = '2026-09-20T00:00:00.000Z';
// Same synthetic saved-record shapes as personal-workspace-poc.spec.ts.
// Deliberately share Item IDs across origins: identity must include the saved copy.
const bundles: FlowBundle[] = ['map-child', 'url-draft-note', 'canonical-source', 'legacy-plan'].map((slug, index) => {
  const id = `merge-flow-${index}`;
  return { flow: { id, slug, title: `Merge origin ${index}`, category: 'Synthetic merge QA',
    structure_type: 'timeline', anchor_type: 'start_date', status: index === 1 ? 'draft' : 'published',
    created_at: savedAt, updated_at: savedAt, ...(index === 1 ? { source_title: '내 초안', tags: ['내 초안'] } : {}) },
    sections: [{ id: `${id}-section`, flow_id: id, title: '준비', order: 0 }],
    items: [{ id: 'shared-item', flow_id: id, section_id: `${id}-section`, title: `Merge task ${index}`, type: 'calendar', day_offset: 0, order: 0 }] };
});
const saved = (slug: string) => ({ slug, savedAt, selectedArtifactMode: 'calendar', dateIntent: 'custom', anchor: '2026-09-20' });
const entries: Record<string, string> = {
  flow_builder_mvp_bundles_v11: JSON.stringify(bundles),
  'flow:merge:sentinel': '  synthetic bytes\r\n보존 🙂  ',
  'flow:map:saved:map-one': JSON.stringify({ mapId: 'map-one', title: 'Merge map', version: 'v1', savedAt, anchor: '2026-09-20', flowSlugs: ['map-child'] }),
  'flow:saved:map-child': JSON.stringify(saved('map-child')),
  'flow:saved:url-draft-note': JSON.stringify(saved('url-draft-note')),
  'flow:saved:copy:one': JSON.stringify({ ...saved('copy:one'), schemaVersion: 2, personalCopyKey: 'copy:one', sourceFlowKey: 'merge-flow-2', sourceFlowSlug: 'canonical-source', sourceVersion: 'source-v1', lastSaveRequestId: 'request:copy:one', savedItemCount: 1 }),
  'flow:saved:legacy-plan': JSON.stringify(saved('legacy-plan')),
};
const fixtureStorage = { get length() { return Object.keys(entries).length; }, key: (i: number) => Object.keys(entries)[i] ?? null, getItem: (key: string) => entries[key] ?? null };

async function installAudit(page: Page) {
  const calls: { method: string; key: string | null }[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.exposeBinding('__mergeAudit', (_source, call) => calls.push(call));
  const origin = new URL(test.info().project.use.baseURL!).origin;
  await page.addInitScript(({ entries, origin }) => {
    if (location.origin !== origin) return;
    if (!sessionStorage.getItem('merge-fixture-seeded')) {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
      sessionStorage.setItem('merge-fixture-seeded', '1');
    }
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        if (this === localStorage) void (window as unknown as { __mergeAudit: (v: unknown) => Promise<void> }).__mergeAudit({ method, key: args[0] ?? null });
        return Reflect.apply(original, this, args);
      } });
    }
  }, { entries, origin });
  return async () => {
    const actual = await page.evaluate(prefix => Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith(prefix)).sort().map(key => [key, localStorage.getItem(key)])), PREFIX);
    expect(actual).toEqual(entries); // all synthetic operating key/value bytes, not only a sentinel
    expect(calls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX))).toEqual([]);
    expect(calls).toEqual([]); // boot and viewing are wholly read-only, even inside PoC
    expect(errors).toEqual([]);
  };
}

test('merged Program projects four saved origins once and opens exact identities without writes', async ({ page }) => {
  const model = buildPersonalWorkspacePocReadModel(fixtureStorage, bundles);
  expect(model.ok).toBe(true);
  if (!model.ok) throw new Error('Invalid synthetic origin fixture');
  expect(model.model.flows).toHaveLength(4);
  expect(model.model.flows.map(flow => flow.origin).sort()).toEqual(['canonical-personal-copy', 'legacy-saved-plan', 'personal-draft', 'source-backed-map']);
  const refs = model.model.flows.flatMap(flow => flow.items.map(item => {
    expect(item.ref).toBe(toPersonalWorkspacePocFlowItemRef(flow.savedCopyId, flow.flowId, item.itemId));
    return item.ref;
  }));
  expect(new Set(refs).size).toBe(4);
  const verify = await installAudit(page);
  await page.goto(ROUTE + '#flowme/legacy');
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  const region = page.getByRole('region', { name: '기존 계획과 개인 문서 연결', exact: true });
  for (const flow of model.model.flows) {
    const button = region.getByRole('button', { name: new RegExp(`^${flow.title}`) });
    await expect(button).toHaveCount(1);
    await expect(button).toContainText('미분류');
    await button.click();
    await expect.poll(() => new URL(page.url()).hash).toBe(`#flowme/legacy/${encodeURIComponent(flow.ref)}`);
    await expect(region.getByTestId('my-flow-overview-card')).toHaveAttribute('data-saved-identity', flow.ref);
    await expect(region.getByRole('heading', { name: flow.title, exact: true })).toBeVisible();
    await expect(region.locator('[data-todo-item-id]').getByText(flow.items[0].title, { exact: true })).toBeVisible();
    await expect(region.locator('[data-todo-item-id]')).toHaveAttribute('data-todo-item-id', flow.items[0].ref);
  }
  await region.getByRole('button', { name: '내 공간으로', exact: true }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#flowme/space');
  await page.reload();
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  await verify();
});

test('merged catalog does not promote held sources; EV official repair remains in seed evidence', async ({ page }) => {
  const catalog = buildProgramCatalog('creator-minji');
  for (const slug of ['dog-adoption-first-week', 'kids-printable-squishy-craft']) {
    const bundle = seedBundles.find(row => row.flow.slug === slug)!;
    expect(getSourceFitAudit(slug)?.decision).toBe('catalog_preview_only');
    expect(normalizeExecutionModel(bundle).exposureStatus).toBe('catalog_preview');
    expect(catalog.coverage.some(row => row.sourceSlug === slug)).toBe(false);
  }
  // EV is not in the current two-source Program catalog. Check the real seed
  // contract rather than inventing a new UI feature for this merge rehearsal.
  const ev = seedBundles.find(row => row.flow.slug === 'ev-subsidy-apply')!;
  expect(ev.flow.source_url).toBe('https://ev.or.kr/nportal/buySupprt/initSubsiGuideAction.do');
  expect(ev.flow.source_checked_at).toBe('2026-09-07');
  expect(ev.itemDetails?.[0]?.links?.[0]?.url).toBe('https://www.ev.or.kr/nportal/buySupprt/initSubsidyPaymentCheckAction.do');
  const verify = await installAudit(page);
  await page.goto(ROUTE + '#flowme/discover');
  const discovery = page.getByTestId('program-discovery');
  await expect(discovery).toBeVisible();
  for (const slug of ['dog-adoption-first-week', 'kids-printable-squishy-craft']) {
    const title = seedBundles.find(row => row.flow.slug === slug)!.flow.title;
    await expect(discovery.getByRole('button', { name: title, exact: true })).toHaveCount(0);
  }
  await verify();
});
