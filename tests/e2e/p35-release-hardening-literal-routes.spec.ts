import { expect, test, type Page } from '@playwright/test';

import { gotoLegacySavedPlanLibraryRoute } from './helpers/my-flow-library';

async function saveRealMovingFlow(page: Page): Promise<string> {
  await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
  await page.getByTestId('public-flow-save-primary-mobile').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toMatch(/^personal-copy:/u);
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  const savedRecord = await page.evaluate((flowSlug) => JSON.parse(
    window.localStorage.getItem(`flow:saved:${flowSlug}`) ?? 'null',
  ), personalCopyKey);
  expect(savedRecord).toMatchObject({
    slug: personalCopyKey,
    anchor: '2030-09-01',
  });
  return personalCopyKey;
}

async function readFlowLocalStorageSnapshot(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify(
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('flow:'))
      .sort()
      .map((key) => [key, window.localStorage.getItem(key)]),
  ));
}

test.describe('P35 release hardening literal routes', () => {
  test('literal /my canonicalizes a real saved Flow into the approved next-sorted library', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const personalCopyKey = await saveRealMovingFlow(page);

    await page.goto('/my');
    await expect(page).toHaveURL('/my?sort=next');

    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
      'data-library-count',
      '1',
    );
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await expect(
      page.locator(
        `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${personalCopyKey}"]`,
      ),
    ).toBeVisible();
  });

  test('literal /my?savedPlanLibrary=off preserves flow:* bytes for a fresh one-Flow public save', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await saveRealMovingFlow(page);
    const storageBeforeRollback = await readFlowLocalStorageSnapshot(page);
    expect(storageBeforeRollback).not.toBe('[]');

    await page.goto('/my?savedPlanLibrary=off');
    await expect(page).toHaveURL(/\/my\?savedPlanLibrary=off$/);
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toBeVisible();
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveCount(0);

    const storageAfterRollback = await readFlowLocalStorageSnapshot(page);
    expect(storageAfterRollback).toBe(storageBeforeRollback);
  });
});
