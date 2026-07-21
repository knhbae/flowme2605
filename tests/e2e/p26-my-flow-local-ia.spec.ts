import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P26_08_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function seedSavedFlows(page: Page, flows: Array<{ slug: string; anchor?: string }>) {
  await page.addInitScript((savedFlows) => {
    window.localStorage.clear();
    const savedAt = '2026-05-28T00:00:00.000Z';
    savedFlows.forEach(({ slug, anchor }) => {
      window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        ...(anchor ? { anchor } : {}),
      }));
      if (anchor) {
        window.localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor }));
      }
    });
  }, flows);
}

test.describe('P26-08 My Flow local IA', () => {
  test('mobile empty state separates global navigation from local tabs and preserves URL history', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/my');

    await expect(page.getByRole('heading', { level: 1, name: 'My Flow' })).toBeVisible();
    const tablist = page.getByRole('tablist', { name: 'My Flow 보기' });
    await expect(tablist.getByRole('tab')).toHaveCount(3);
    await expect(page.getByRole('tab', { name: '지금' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2, name: '지금 이어갈 할 일이 없습니다' })).toBeVisible();

    const globalMyFlow = page.getByTestId('platform-mobile-tabs').getByRole('link', { name: '내 Flow' });
    await expect(globalMyFlow).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Flow 목록' })).toBeVisible();

    await page.getByRole('tab', { name: '지금' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/view=flows/);
    await expect(page.getByRole('tab', { name: 'Flow 목록' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2, name: '저장한 Flow가 없습니다' })).toBeVisible();

    await page.getByRole('tab', { name: '완료' }).click();
    await expect(page).toHaveURL(/view=completed/);
    await page.reload();
    await expect(page.getByRole('tab', { name: '완료' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2, name: '완료 기록이 없습니다' })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('tab', { name: 'Flow 목록' })).toHaveAttribute('aria-selected', 'true');
    await page.goBack();
    await expect(page).toHaveURL(/\/my$/);
    await expect(page.getByRole('tab', { name: '지금' })).toHaveAttribute('aria-selected', 'true');

    await capture(page, '01-mobile-empty-local-tabs.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('mobile one-Flow state keeps execution, inventory, completion, and focus roles distinct', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
    await seedSavedFlows(page, [{ slug: 'moving-d30-basic', anchor: '2026-06-26' }]);
    await page.goto('/my?view=now');

    await expect(page.getByRole('heading', { level: 2, name: '지금 이어갈 할 일' })).toBeVisible();
    await expect(page.getByTestId('my-flow-now-count')).not.toHaveText('0개');
    const continuation = page.getByTestId('my-flow-mobile-continuation-card').first();
    const openButton = continuation.getByRole('button', { name: /열기/ });
    await openButton.click();
    const detail = continuation.getByTestId('my-flow-inline-detail');
    await expect(detail).toBeVisible();
    await detail.getByRole('button', { name: '닫기' }).click();
    await expect(openButton).toBeFocused();

    const completion = continuation.getByTestId('my-flow-task-complete-control');
    await completion.click();
    await page.getByRole('tab', { name: '완료' }).click();
    await expect(page.getByRole('heading', { level: 2, name: '완료한 일' })).toBeVisible();
    await expect(page.getByTestId('my-flow-completed-count')).toHaveText('1개');
    await page.getByTestId('my-flow-completed-view').getByTestId('my-flow-task-complete-control').click();
    await expect(page.getByTestId('my-flow-completed-count')).toHaveText('0개');

    await page.getByRole('tab', { name: 'Flow 목록' }).click();
    await expect(page.getByRole('heading', { level: 2, name: '저장한 Flow' })).toBeVisible();
    await expect(page.getByTestId('my-flow-saved-count')).toHaveText('1개');
    await capture(page, '02-mobile-one-flow-roles.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('wide three-Flow state exposes one library rail and one focused workspace', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlows(page, [
      { slug: 'moving-d30-basic', anchor: '2026-06-26' },
      { slug: 'computer-skills-d30-study', anchor: '2026-06-27' },
      { slug: 'used-car-buying-check' },
    ]);
    await page.goto('/my?view=flows');

    await expect(page.getByTestId('my-flow-saved-count')).toHaveText('3개');
    const workspace = page.getByTestId('my-flow-library-workspace');
    await expect(workspace).toHaveAttribute('data-library-layout', 'rail-detail');
    const rail = workspace.getByTestId('my-flow-library-rail');
    await expect(rail.getByTestId('my-flow-library-row')).toHaveCount(3);
    const target = rail.locator('[data-testid="my-flow-library-row"][data-flow-slug="computer-skills-d30-study"]');
    await target.click();
    await expect(workspace.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card')).toHaveAttribute(
      'data-flow-slug',
      'computer-skills-d30-study',
    );
    await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
    await capture(page, '03-wide-three-flow-rail.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('wide twenty-plus state keeps a searchable bounded library rail and one detail', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20&view=flows');

    const countText = await page.getByTestId('my-flow-saved-count').innerText();
    expect(Number.parseInt(countText, 10)).toBeGreaterThanOrEqual(20);
    const workspace = page.getByTestId('my-flow-library-workspace');
    await expect(workspace).toBeVisible();
    expect(await workspace.getByTestId('my-flow-library-row').count()).toBeGreaterThanOrEqual(20);
    await expect(workspace.getByTestId('my-flow-library-rail-search')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-demo-group')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: '저장한 Flow' })).toBeVisible();
    await capture(page, '04-wide-twenty-plus-grouped.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });
});
