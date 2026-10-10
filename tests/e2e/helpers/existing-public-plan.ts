import { expect, type Page } from '@playwright/test';
import { seedBundles } from '../../../lib/flow/seed-flows';
import { gotoLegacySavedPlanLibraryRoute } from './my-flow-library';

/** Synthetic pre-review personal record, not a NEW public save. Install once so
 * reload, editing, archive and reconnect exercise the persisted record rather
 * than resetting it. Source-review holds remain active in the real product. */
export async function openExistingPublicPlan(page: Page, sourceSlug = 'moving-d30-basic',
  options: { anchor?: string; personalCopyKey?: string; clear?: boolean } = {}): Promise<string> {
  const source = seedBundles.find(bundle => bundle.flow.slug === sourceSlug);
  if (!source) throw new Error(`Missing historical test source: ${sourceSlug}`);
  const personalCopyKey = options.personalCopyKey ?? `personal-copy:existing-${sourceSlug}`;
  const anchor = options.anchor ?? '2030-08-15';
  const record = {
    schemaVersion: 2, slug: personalCopyKey, personalCopyKey,
    sourceFlowKey: source.flow.id, sourceFlowSlug: sourceSlug,
    sourceVersion: source.flow.updated_at,
    lastSaveRequestId: `existing-fixture:${sourceSlug}`, savedItemCount: source.items.length,
    savedAt: '2026-07-24T00:00:00.000Z', selectedArtifactMode: 'calendar',
    dateIntent: 'custom', anchor,
  };
  await page.addInitScript(({ record, clear }) => {
    const marker = `existing-public-plan-seeded:${record.personalCopyKey}`;
    if (sessionStorage.getItem(marker) === 'true') return;
    if (clear) localStorage.clear();
    localStorage.setItem(`flow:saved:${record.personalCopyKey}`, JSON.stringify(record));
    localStorage.setItem(`flow:${record.personalCopyKey}:anchorDate`, JSON.stringify({
      mode: 'custom', anchor: record.anchor,
    }));
    sessionStorage.setItem(marker, 'true');
  }, { record, clear: options.clear ?? true });
  await gotoLegacySavedPlanLibraryRoute(page, `/my?view=flows&flow=${encodeURIComponent(personalCopyKey)}`);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), `flow:saved:${personalCopyKey}`))
    .toBe(JSON.stringify(record));
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  return personalCopyKey;
}
