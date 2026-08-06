import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import {
  expandMyFlowWholePlan,
  getMyFlowVisibleExecutionRows,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P26_09_EVIDENCE_DIR;

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

async function captureViewport(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: false });
}

async function seedSavedFlow(page: Page, slug: string, anchor?: string) {
  await page.addInitScript(({ savedSlug, savedAnchor }) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${savedSlug}`, JSON.stringify({
      slug: savedSlug,
      savedAt: '2026-07-20T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      ...(savedAnchor ? { anchor: savedAnchor } : {}),
    }));
    if (savedAnchor) {
      window.localStorage.setItem(`flow:${savedSlug}:anchorDate`, JSON.stringify({
        mode: 'custom',
        anchor: savedAnchor,
      }));
    }
  }, { savedSlug: slug, savedAnchor: anchor });
}

test.describe('P26-09 adaptive whole Flow reading', () => {
  test('mobile keeps a three-item routine fully visible', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, 'washer-tub-clean-monthly', '2026-08-01');
    await page.goto('/my?view=flows');

    const flow = await openMyFlowLibraryFlow(page, 'washer-tub-clean-monthly');
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    await expect(outline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('3');
    await expect(outline.getByTestId('my-flow-whole-flow-toggle-all-groups')).toHaveCount(0);
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);

    await capture(page, '01-mobile-three-item-routine.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('mobile keeps a ten-item checklist fully visible without forced disclosure', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, 'vehicle-inspection-prep');
    await page.goto('/my?view=flows');

    const flow = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    await expect(outline.getByTestId('my-flow-whole-flow-reading-summary')).toContainText('10');
    await expect(outline.getByTestId('my-flow-whole-flow-toggle-all-groups')).toHaveCount(0);
    await expect(outline).toHaveAttribute('data-effective-row-count', '10');
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(10);

    await capture(page, '02-mobile-ten-item-checklist.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('mobile long timeline renders every logical row and opens one Item detail', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, 'moving-d30-basic', '2026-08-15');
    await page.goto('/my?view=flows');

    const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    const summary = outline.getByTestId('my-flow-whole-flow-reading-summary');
    await expect(summary).toContainText('6단계');
    await expect(summary).toContainText('0/24 완료');
    await expect(outline.getByTestId('my-flow-whole-flow-section')).toHaveCount(6);
    await expect(outline.getByTestId('my-flow-whole-flow-section-content')).toHaveCount(6);
    await expect(outline).toHaveAttribute('data-effective-row-count', '24');
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(24);
    expect(await outline.getByTestId('my-flow-whole-flow-date-group').count()).toBeGreaterThan(0);
    await expect(outline.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    await capture(page, '03-mobile-twenty-four-item-timeline-page.png');
    await outline.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top, behavior: 'instant' });
    });
    await captureViewport(page, '03-mobile-twenty-four-item-timeline.png');
    const [summaryBox, bottomNavBox] = await Promise.all([
      summary.boundingBox(),
      page.getByTestId('platform-mobile-tabs').boundingBox(),
    ]);
    expect(summaryBox).not.toBeNull();
    expect(bottomNavBox).not.toBeNull();
    expect(summaryBox!.y + summaryBox!.height).toBeLessThan(bottomNavBox!.y);

    const firstSectionToggle = outline.getByTestId('my-flow-whole-flow-section-toggle').first();
    await firstSectionToggle.focus();
    await page.keyboard.press('Space');
    await expect(firstSectionToggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Space');
    await expect(firstSectionToggle).toHaveAttribute('aria-expanded', 'true');

    await expect(outline.getByTestId('my-flow-whole-flow-section-content')).toHaveCount(6);
    await expect(outline).toHaveAttribute('data-effective-row-count', '24');
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(24);

    const firstRow = (await getMyFlowVisibleExecutionRows(flow)).first();
    await firstRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId('my-flow-detail-execution-note')).toHaveCount(0);
    await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);

    await capture(page, '03b-mobile-twenty-four-item-expanded-detail.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });

  test('wide long timeline keeps phase outline and detail pane together', async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlow(page, 'moving-d30-basic', '2026-08-15');
    await page.goto('/my?view=flows');

    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
    await expandMyFlowWholePlan(workspace);
    const outline = workspace.getByTestId('my-flow-whole-flow-outline');
    await expect(workspace).toHaveAttribute(
      'data-p35-marker',
      'P35-PERSONAL-SINGLE-FOCUS',
    );
    await expect(outline.getByTestId('my-flow-whole-flow-section')).toHaveCount(6);
    await expect(outline.getByTestId('my-flow-whole-flow-section-content')).toHaveCount(6);
    await expect(outline.getByTestId('my-flow-execution-row-shell')).toHaveCount(24);
    await expect(workspace.getByTestId('my-flow-workspace-detail-pane')).toBeVisible();
    await outline.getByTestId('my-flow-execution-row-shell').first()
      .getByRole('button', { name: /열기/ })
      .click();
    await expect(
      workspace.getByTestId('my-flow-workspace-detail-pane').getByTestId('my-flow-item-detail'),
    ).toBeVisible();

    await capture(page, '04-wide-twenty-four-item-timeline.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(browserErrors).toEqual([]);
  });
});
