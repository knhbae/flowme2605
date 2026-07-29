import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P35_01_EVIDENCE_DIR;

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectThreePrimaryDestinations(page: Page, mobile: boolean) {
  const navigation = page.getByTestId(mobile ? 'platform-mobile-tabs' : 'platform-primary-tabs');
  await expect(navigation).toHaveAttribute('data-p35-marker', 'P35-ENTRY-ROUTER-3TAB');
  await expect(navigation.getByRole('link')).toHaveCount(3);
  expect(await navigation.getByRole('link').allTextContents()).toEqual([
    'Flow 찾기',
    '캘린더',
    '내 Flow',
  ]);
  await expect(navigation.getByRole('link', { name: '홈' })).toHaveCount(0);

  const findLink = navigation.getByRole('link', { name: 'Flow 찾기' });
  await findLink.focus();
  await expect(findLink).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: '캘린더' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: '내 Flow' })).toBeFocused();
}

async function getFixedNavigationOverlapCount(page: Page) {
  return page.evaluate(() => {
    const navigation = document.querySelector<HTMLElement>('[data-testid="platform-mobile-tabs"]');
    if (!navigation) return 0;
    const navigationRect = navigation.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('button, a, input, select, textarea')]
      .filter((element) => !navigation.contains(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.position === 'fixed' || style.position === 'sticky';
      })
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return (
          rect.left < navigationRect.right &&
          rect.right > navigationRect.left &&
          rect.top < navigationRect.bottom &&
          rect.bottom > navigationRect.top
        );
      })
      .length;
  });
}

test.describe('P35-01 entry router and three primary destinations', () => {
  test('empty local storage replaces the root route with Flow discovery', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());

    await page.goto('/');

    await expect(page).toHaveURL('/flows');
    await expect(page.getByTestId('entry-router')).toHaveCount(0);
    await expect(page.getByTestId('home-continuation')).toHaveCount(0);
    await expect(page.getByTestId('home-url-first-entry')).toHaveCount(0);
    await expectThreePrimaryDestinations(page, true);
    await expect(page.getByTestId('platform-mobile-tabs').getByRole('link', { name: 'Flow 찾기' }))
      .toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(await getFixedNavigationOverlapCount(page)).toBe(0);
    expect(errors).toEqual([]);
    await capture(page, 'p35-01-entry-empty-390.png');
  });

  test('a saved Flow replaces the root route with My Flow and preserves the record', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-07-26T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2026-09-01',
      }));
    });

    await page.goto('/');

    await expect(page).toHaveURL('/my');
    await expectThreePrimaryDestinations(page, true);
    await expect(page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '내 Flow' }))
      .toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => window.localStorage.getItem('flow:saved:moving-d30-basic')))
      .toBe(JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-07-26T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2026-09-01',
      }));
    expect(await getFixedNavigationOverlapCount(page)).toBe(0);
    expect(errors).toEqual([]);
    await capture(page, 'p35-01-entry-saved-390.png');
  });

  test('wide direct routes keep one current destination and no Home destination', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });

    for (const [route, label] of [
      ['/flows', 'Flow 찾기'],
      ['/calendar', '캘린더'],
      ['/my', '내 Flow'],
    ] as const) {
      await page.goto(route);
      await expectThreePrimaryDestinations(page, false);
      const current = page.getByTestId('platform-primary-tabs').locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(label);
    }

    await page.goto('/flows');
    await capture(page, 'p35-01-nav-1024.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('desktop navigation keeps the same three destinations', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/flows');

    await expectThreePrimaryDestinations(page, false);
    await capture(page, 'p35-01-nav-1440.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
});
