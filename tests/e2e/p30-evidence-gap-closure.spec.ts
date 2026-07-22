import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P30_EVIDENCE_DIR;

type Rect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

async function getRect(locator: Locator): Promise<Rect> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  });
}

function intersectionArea(left: Rect, right: Rect) {
  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return width * height;
}

async function capture(page: Page, filename: string, evidence?: unknown) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: false });
  if (evidence !== undefined) {
    fs.writeFileSync(
      path.join(evidenceRoot, filename.replace(/\.png$/u, '.json')),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8',
    );
  }
}

async function clearLocalState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

test.describe('P30-01 mobile export fixed-layer correctness', () => {
  test('public export suppresses the fixed save command and keeps the primary result visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');

    const workspace = page.getByTestId('public-flow-detail-workspace');
    await workspace.locator('summary').first().click();
    const exportEntry = workspace.getByTestId('public-flow-export-secondary-entry');
    await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();

    const panel = exportEntry.getByTestId('my-flow-export-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('..')).toHaveAttribute('data-p30-marker', 'P30-MOBILE-EXPORT-NO-FIXED-OVERLAP');
    await expect(page.getByTestId('public-flow-mobile-save-cta')).toHaveCount(0);

    const primary = panel.locator('[data-action-priority="primary"][data-recommendation-visible="true"]');
    await expect(primary).toHaveCount(1);
    const primaryRect = await getRect(primary);
    expect(primaryRect.top).toBeGreaterThanOrEqual(0);
    expect(primaryRect.bottom).toBeLessThanOrEqual(844);
    await capture(page, 'p30-01-public-export-open-390.png', {
      route: '/f/moving-d30-basic',
      viewport: { width: 390, height: 844 },
      primaryRect,
      fixedSaveCtaCount: 0,
      intersectionArea: 0,
    });
  });

  test('My Flow export scrolls its primary action above the persistent tabs and restores entry focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');
    const firstRow = page.getByTestId('my-flow-mobile-structure-row').first();
    await expect(firstRow).toBeVisible();
    const flowSlug = await firstRow.getAttribute('data-flow-slug');
    expect(flowSlug).toBeTruthy();
    await firstRow.getByTestId('my-flow-mobile-structure-open').click();
    const flow = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]:visible`,
    );
    await expect(flow).toBeVisible();
    const exportSurface = flow.getByTestId('my-flow-export-surface');
    const exportEntry = exportSurface.getByTestId('my-flow-export-entry');
    await exportEntry.click();

    const panel = exportSurface.getByTestId('my-flow-export-panel');
    await expect(panel).toBeVisible();
    await expect(exportSurface).toHaveAttribute('data-p30-marker', 'P30-MOBILE-EXPORT-NO-FIXED-OVERLAP');

    const primary = panel.locator('[data-action-priority="primary"][data-recommendation-visible="true"]');
    const tabs = page.getByTestId('platform-mobile-tabs');
    await expect(primary).toHaveCount(1);
    const primaryRect = await getRect(primary);
    const tabsRect = await getRect(tabs);
    expect(intersectionArea(primaryRect, tabsRect)).toBe(0);
    expect(primaryRect.bottom).toBeLessThanOrEqual(tabsRect.top);
    await capture(page, 'p30-01-my-flow-export-open-390.png', {
      route: '/my?demo=ux20&view=flows',
      viewport: { width: 390, height: 844 },
      primaryRect,
      tabsRect,
      intersectionArea: intersectionArea(primaryRect, tabsRect),
    });

    await panel.getByRole('button', { name: /가져가기 닫기/ }).click();
    await expect(exportEntry).toBeFocused();
  });
});
