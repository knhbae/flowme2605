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

type FocusStep = {
  testId: string | null;
  tagName: string;
  href: string | null;
  accessibleName: string | null;
};

async function traceMobileFocusOrder(page: Page, maxSteps = 300): Promise<FocusStep[]> {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });

  const trace: FocusStep[] = [];
  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate<FocusStep>(() => {
      const active = document.activeElement as HTMLElement | null;
      const owner = active?.closest<HTMLElement>('[data-testid]');
      return {
        testId: owner?.dataset.testid ?? null,
        tagName: active?.tagName.toLowerCase() ?? '',
        href: active instanceof HTMLAnchorElement ? active.getAttribute('href') : null,
        accessibleName: active?.getAttribute('aria-label') ?? active?.textContent?.trim() ?? null,
      };
    });
    trace.push(step);
    if (step.testId === 'platform-mobile-tabs') break;
  }
  return trace;
}

function expectWorkspaceBeforePersistentTabs(trace: FocusStep[], workspaceTestId: string) {
  const headerIndex = trace.findIndex((step) => step.testId === 'platform-nav');
  const workspaceIndex = trace.findIndex((step) => step.testId === workspaceTestId);
  const persistentTabsIndex = trace.findIndex((step) => step.testId === 'platform-mobile-tabs');

  expect(headerIndex).toBeGreaterThanOrEqual(0);
  expect(workspaceIndex).toBeGreaterThan(headerIndex);
  expect(persistentTabsIndex).toBeGreaterThan(workspaceIndex);
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

test.describe('P30-02 mobile workspace focus order', () => {
  test('My Flow reaches workspace controls before persistent navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');
    await expect(page.getByTestId('my-flow-view-flow')).toBeVisible();

    const trace = await traceMobileFocusOrder(page);
    expectWorkspaceBeforePersistentTabs(trace, 'my-flow-view-flow');
    await expect(page.getByTestId('platform-mobile-tabs')).toHaveAttribute(
      'data-p30-marker',
      'P30-MOBILE-WORKSPACE-FOCUS-ORDER',
    );
    await capture(page, 'p30-02-my-flow-focus-order-390.png', {
      route: '/my?demo=ux20&view=flows',
      viewport: { width: 390, height: 844 },
      focusTrace: trace,
    });
  });

  test('Calendar reaches scope controls before persistent navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calendar?demo=ux20');
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toBeVisible();

    const trace = await traceMobileFocusOrder(page);
    expectWorkspaceBeforePersistentTabs(trace, 'calendar-flow-scope-picker-trigger');
    await capture(page, 'p30-02-calendar-focus-order-390.png', {
      route: '/calendar?demo=ux20',
      viewport: { width: 390, height: 844 },
      focusTrace: trace,
    });
  });
});

test.describe('P30-03 save-before decision and contextual adjustment', () => {
  test('long Flow keeps the full selection list behind an explicit disclosure', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');

    const saveBefore = page.getByTestId('public-flow-hero');
    await expect(saveBefore).toHaveAttribute('data-p30-marker', 'P30-SAVE-BEFORE-SINGLE-DECISION');
    await expect(saveBefore.locator('[data-flow-outline-row="true"] button')).toHaveCount(0);
    await expect(page.locator('[data-action-priority="primary"]:visible')).toHaveCount(1);

    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toHaveAttribute('data-p30-marker', 'P30-LONG-FLOW-CONTEXTUAL-ADJUST');
    await expect(adjustment).toHaveAttribute('data-adjustment-mode', 'include');
    await expect(adjustment.getByTestId('public-flow-adjustment-item-disclosure')).not.toHaveAttribute('open', '');
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-row"]:visible')).toHaveCount(0);

    await adjustment.getByTestId('public-flow-adjustment-mode-content').click();
    await expect(adjustment.getByTestId('public-flow-adjustment-item-picker')).toBeVisible();
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-row"]:visible')).toHaveCount(1);

    await adjustment.getByTestId('public-flow-adjustment-mode-include').click();
    await adjustment.getByTestId('public-flow-adjustment-item-disclosure').locator('summary').click();
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-row"]:visible')).toHaveCount(24);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-03-moving-item-selection-390.png', {
      route: '/f/moving-d30-basic',
      viewport: { width: 390, height: 844 },
      visibleItemRows: 24,
      horizontalOverflow: overflow,
    });
  });
});

test.describe('P30-04 My Flow command hierarchy', () => {
  test('detail keeps one next action and moves source/archive into a focus-returning menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');

    const row = page.getByTestId('my-flow-mobile-structure-row').nth(2);
    const flowSlug = await row.getAttribute('data-flow-slug');
    expect(flowSlug).toBeTruthy();
    await row.getByTestId('my-flow-mobile-structure-open').click();

    const card = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]:visible`);
    await expect(card).toHaveAttribute('data-p30-marker', 'P30-MY-FLOW-COMMAND-HIERARCHY');
    await expect(card.locator('[data-action-priority="primary"]:visible')).toHaveCount(1);
    expect(await card.locator('[data-action-priority="secondary"]:visible').count()).toBeLessThanOrEqual(2);

    const menu = card.getByTestId('my-flow-management-menu');
    const trigger = menu.getByTestId('my-flow-management-menu-trigger');
    await expect(menu.getByTestId('my-flow-management-source')).toBeHidden();
    await expect(card.getByTestId('my-flow-archive-toggle')).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.getByTestId('my-flow-management-source')).toBeVisible();
    await expect(card.getByTestId('my-flow-archive-toggle')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(trigger).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-04-my-flow-command-hierarchy-390.png', {
      route: '/my?demo=ux20&view=flows',
      viewport: { width: 390, height: 844 },
      visiblePrimaryCount: 1,
      visibleSecondaryCount: await card.locator('[data-action-priority="secondary"]:visible').count(),
      overflowMenuFocusReturned: true,
      horizontalOverflow: overflow,
    });
  });
});
