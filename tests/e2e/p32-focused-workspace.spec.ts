import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P32_EVIDENCE_DIR;

async function capture(page: Page, filename: string, fullPage = true) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage });
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.describe('P32 focused My Flow workspace', () => {
  test('mobile separates cross-Flow library navigation from one Flow workspace', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows&mode=flow');

    await expect(page.locator('main')).toHaveAttribute('data-p35-my-flow-marker', 'P35-MY-LIBRARY-ONLY');
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    await page.getByTestId('my-flow-search').fill('이사');
    await page
      .locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]')
      .getByTestId('my-flow-mobile-structure-open')
      .click();

    const workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="moving-d30-basic"]',
    );
    await expect(workspace).toHaveAttribute(
      'data-p32-marker',
      'P32-02-FOCUSED-MY-FLOW-WORKSPACE',
    );
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    await expect(page.locator('main')).toHaveAttribute('data-p32-workspace-state', 'focused');
    await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);
    const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
    await expect(planToggle).toBeVisible();
    await planToggle.click();
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-commands')).toBeVisible();
    await expect(workspace.locator(':scope > header')).toContainText('이사 D-30 준비');
    expect(
      await workspace.locator(':scope > header').evaluate((header) => getComputedStyle(header).position),
    ).toBe('static');
    expect(
      await workspace
        .locator('[data-testid="my-flow-workspace-execute"], [data-testid="my-flow-workspace-commands"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid'))),
    ).toEqual(['my-flow-workspace-execute', 'my-flow-workspace-commands']);
    await capture(page, 'p32-02-focused-moving-default-viewport-390.png', false);

    const exportSurface = workspace.getByTestId('my-flow-export-surface');
    await exportSurface.getByTestId('my-flow-export-entry').click();
    await expect(exportSurface.getByTestId('my-flow-export-panel')).toBeVisible();
    await expect(exportSurface.getByTestId('my-flow-export-scope-flow')).toContainText('Flow 전체');
    await expect(exportSurface.getByTestId('my-flow-export-scope-summary')).toContainText('개');
    const mobileFixedOverlapLabels = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('[data-testid="platform-mobile-tabs"]');
        if (!nav) return [];
        const navRect = nav.getBoundingClientRect();
        return [...document.querySelectorAll<HTMLElement>('button, a, input, select, textarea')]
          .filter((element) => !nav.contains(element))
          .filter((element) => {
            const position = getComputedStyle(element).position;
            return position === 'fixed' || position === 'sticky';
          })
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return (
              rect.left < navRect.right &&
              rect.right > navRect.left &&
              rect.top < navRect.bottom &&
              rect.bottom > navRect.top
            );
          })
          .map((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName);
      });
    expect(mobileFixedOverlapLabels).toEqual([]);
    const lastExportAction = exportSurface.getByTestId('my-flow-export-memo');
    await lastExportAction.scrollIntoViewIfNeeded();
    expect(
      await lastExportAction.evaluate((element) => {
        const nav = document.querySelector<HTMLElement>('[data-testid="platform-mobile-tabs"]');
        if (!nav) return true;
        return element.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;
      }),
    ).toBe(true);
    await capture(page, 'p32-02-focused-moving-export-390.png');
    await capture(page, 'p32-02-focused-moving-export-viewport-390.png', false);
    await exportSurface.getByRole('button', { name: /옮기기 닫기/ }).click();

    const firstRow = workspace.getByTestId('my-flow-execution-row-shell').first();
    await firstRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail.getByTestId('my-flow-quick-item-edit')).toBeVisible();
    await expect(detail.locator('[data-my-flow-item-edit-entry="true"]')).toHaveCount(1);
    await detail.getByTestId('my-flow-quick-item-edit').click();
    await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
    await expect(detail.getByTestId('my-flow-detail-title-input')).toBeFocused();
    await detail.getByTestId('my-flow-editor-cancel').click();
    await closeOpenMyFlowItemDetail(page);

    await workspace.getByTestId('my-flow-mobile-library-back').click();
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    await expect(page.getByTestId('my-flow-search')).toHaveValue('이사');
    await expect(page.locator('main')).toHaveAttribute('data-p32-workspace-state', 'library');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('direct saved anchored Flow changes its anchor without a saved-map migration', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        title: '이사 준비',
        selectedArtifactMode: 'calendar',
        savedAt: '2026-07-24T00:00:00.000Z',
        anchor: '2026-08-20',
      }));
      window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
        mode: 'custom',
        anchor: '2026-08-20',
      }));
    });
    await page.goto('/my?view=flows');

    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    const anchorEntry = workspace.getByTestId('my-flow-direct-anchor-settings-open');
    await expect(anchorEntry).toHaveAccessibleName(/이사일 바꾸기/);

    const firstRow = workspace.getByTestId('my-flow-execution-row-shell').first();
    await firstRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await detail.getByTestId('my-flow-quick-item-edit').click();
    await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-01');
    await detail.getByTestId('my-flow-detail-memo').fill('개인 고정 일정');
    await detail.getByTestId('my-flow-detail-save-changes').click();
    await closeOpenMyFlowItemDetail(page);

    await anchorEntry.click();
    const settings = workspace.getByTestId('my-flow-direct-anchor-settings');
    await expect(settings.getByTestId('my-flow-direct-anchor-input')).toHaveValue('2026-08-20');
    await settings.getByTestId('my-flow-direct-anchor-input').fill('2026-09-10');
    await settings.getByRole('button', { name: '일정 다시 맞추기' }).click();

    const stored = await page.evaluate(() => ({
      saved: JSON.parse(window.localStorage.getItem('flow:saved:moving-d30-basic') || 'null'),
      anchor: JSON.parse(window.localStorage.getItem('flow:moving-d30-basic:anchorDate') || 'null'),
      dateOverrides: JSON.parse(window.localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
      itemDrafts: JSON.parse(window.localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
      mapSnapshot: window.localStorage.getItem('flow:map:saved:moving-d30-basic'),
    }));
    expect(stored.saved.anchor).toBe('2026-09-10');
    expect(stored.anchor.anchor).toBe('2026-09-10');
    expect(Object.values(stored.dateOverrides)).toContain('2026-08-01');
    expect(JSON.stringify(stored.itemDrafts)).toContain('개인 고정 일정');
    expect(stored.mapSnapshot).toBeNull();
    await capture(page, 'p32-04-direct-anchor-preserves-personal-values-390.png');
    await capture(page, 'p32-04-direct-anchor-preserves-personal-values-viewport-390.png', false);
    expect(errors).toEqual([]);
  });

  test('mobile uses one focused shell for six representative content shapes', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows&mode=flow');

    const cases = [
      ['moving-d30-basic', '이사'],
      ['travel-packing-list', '여행'],
      ['washer-tub-clean-monthly', '세탁기'],
      ['wedding-d180-basic', '결혼'],
      ['used-car-buying-check', '중고차'],
      ['english-study-30day-routine', '영어'],
    ] as const;

    for (const [slug, query] of cases) {
      await page.getByTestId('my-flow-search').fill(query);
      await page
        .locator(`[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${slug}"]`)
        .getByTestId('my-flow-mobile-structure-open')
        .click();
      const workspace = page.locator(
        `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${slug}"]`,
      );
      await expect(workspace).toHaveAttribute(
        'data-p32-shared-marker',
        'P32-06-SHARED-FOCUSED-WORKSPACE',
      );
      await expect(workspace).toHaveAttribute('data-p32-flow-shape', /.+/);
      await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
      await expect(workspace.locator(':scope > header')).toBeInViewport();
      expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
      if (slug === 'washer-tub-clean-monthly') {
        await capture(page, 'p32-06-routine-shared-workspace-viewport-390.png', false);
      }
      await workspace.getByTestId('my-flow-mobile-library-back').click();
      await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
      await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
  });

  test('wide shared workspace keeps six representative content shapes in one shell', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20&view=flows&mode=flow');

    const library = page.getByTestId('my-flow-library-workspace');
    const cases = [
      ['moving-d30-basic', '이사'],
      ['travel-packing-list', '여행'],
      ['washer-tub-clean-monthly', '세탁기'],
      ['wedding-d180-basic', '결혼'],
      ['used-car-buying-check', '중고차'],
      ['english-study-30day-routine', '영어'],
    ] as const;
    for (const [slug, query] of cases) {
      await library.getByTestId('my-flow-library-rail-search').fill(query);
      await library.locator(`[data-testid="my-flow-library-row"][data-flow-slug="${slug}"]`).click();
      const flow = library.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]`);
      await expect(flow).toHaveAttribute(
        'data-p32-marker',
        'P32-06-SHARED-FOCUSED-WORKSPACE',
      );
      await expect(flow.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
      await expect(flow.getByTestId('my-flow-workspace-detail-pane')).toBeVisible();
    }
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    await expect(library).toHaveAttribute('data-p32-marker', 'P32-02-FOCUSED-MY-FLOW-WORKSPACE');
    await expect(page.getByTestId('my-flow-library-back')).toBeVisible();
    await capture(page, 'p32-06-six-shape-shared-workspace-1024.png');
    await capture(page, 'p32-06-six-shape-shared-workspace-viewport-1024.png', false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(library.getByTestId('my-flow-library-detail')).toBeVisible();
    await capture(page, 'p32-07-focused-workspace-1440.png');
    await capture(page, 'p32-07-focused-workspace-viewport-1440.png', false);
    await page.getByTestId('my-flow-library-back').click();
    await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card')).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'My Flow 보기' })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
});
