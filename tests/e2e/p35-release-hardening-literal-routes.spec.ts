import { expect, test, type Page } from '@playwright/test';

import { savePublicFlow } from './helpers/public-flow-save';

async function saveRealMovingFlow(page: Page) {
  await page.goto('/f/moving-d30-basic');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
  await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
  const savedRecord = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem('flow:saved:moving-d30-basic') ?? 'null',
  ));
  expect(savedRecord).toMatchObject({
    slug: 'moving-d30-basic',
    anchor: '2030-09-01',
  });
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
  test('literal /my defaults a real saved Flow to cross-Flow Todo with the adjacent Flow view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await saveRealMovingFlow(page);

    await page.goto('/my');
    await expect(page).toHaveURL(/\/my$/);

    const surface = page.getByTestId('my-flow-cross-flow-todo-experiment');
    await expect(surface).toBeVisible();
    await expect(surface.getByTestId('my-flow-todo-experiment-view-todo')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      surface.locator(
        '[data-testid="my-flow-cross-flow-todo-row"][data-flow-slug="moving-d30-basic"]',
      ).first(),
    ).toBeVisible();

    const flowView = surface.getByTestId('my-flow-todo-experiment-view-flows');
    await expect(flowView).toBeVisible();
    await flowView.click();
    await expect(flowView).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await expect(
      page.locator(
        '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]',
      ),
    ).toBeVisible();
  });

  test('literal /my?experiment=off preserves flow:* bytes for a fresh one-Flow public save', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await saveRealMovingFlow(page);
    const storageBeforeRollback = await readFlowLocalStorageSnapshot(page);
    expect(storageBeforeRollback).not.toBe('[]');

    await page.goto('/my?experiment=off');
    await expect(page).toHaveURL(/\/my\?experiment=off$/);
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();

    const storageAfterRollback = await readFlowLocalStorageSnapshot(page);
    expect(storageAfterRollback).toBe(storageBeforeRollback);
  });
});
