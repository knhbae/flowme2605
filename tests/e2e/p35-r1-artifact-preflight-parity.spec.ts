import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openPublicDetailWorkspaceForDeepInspection } from './helpers/open-public-detail-workspace';

const evidenceRoot = process.env.FLOWME_P35_R1_EVIDENCE_DIR;

test.beforeEach(async ({ page }) => {
  await openPublicDetailWorkspaceForDeepInspection(page);
});

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
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
  });
}

async function expectPageQuality(page: Page) {
  const quality = await page.evaluate(() => {
    const interactiveSelector = 'button, a[href], input, select, textarea, summary, [role="button"]';
    const unnamedInteractiveCount = [...document.querySelectorAll<HTMLElement>(interactiveSelector)]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || rect.width === 0
          || rect.height === 0
        ) return false;
        const accessibleName = (
          element.getAttribute('aria-label')
          || element.getAttribute('title')
          || element.textContent
          || ''
        ).trim();
        return accessibleName.length === 0;
      })
      .length;

    return {
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount,
    };
  });

  expect(quality).toEqual({
    horizontalOverflow: 0,
    unnamedInteractiveCount: 0,
  });
}

async function openPreflight(page: Page) {
  const entry = page.getByTestId('public-flow-export-secondary-entry');
  await entry.scrollIntoViewIfNeeded();
  await entry.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(entry).toHaveAttribute('open', '');
  await expect(entry).toHaveAttribute('data-p35-marker', 'P35-R1-PUBLIC-ARTIFACT-PREFLIGHT');
  return entry;
}

test.describe('P35-R1 public artifact preflight parity', () => {
  test('moving Calendar preview and committed export preflight share 24 events', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');

    const preview = page.getByTestId('public-flow-artifact-preview');
    await expect(preview).toHaveAttribute('data-selected-shape', 'calendar');
    await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(24);

    const entry = await openPreflight(page);
    await expect(entry).toHaveAttribute('data-preflight-schedule-state', 'committed');
    await expect(entry).toHaveAttribute('data-scheduled-event-count', '24');
    await expect(entry).toHaveAttribute('data-primary-destination', 'calendar');

    const calendar = entry.locator(
      '[data-testid="public-flow-export-format-option"][data-export-destination="calendar"]',
    );
    await expect(calendar).toHaveAttribute('data-export-state', 'ready');
    await expect(calendar).toHaveAttribute('data-export-count', '24');
    await expect(calendar).toHaveAttribute('data-recommendation-role', 'primary');
    await expect(
      entry.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
    ).toHaveCount(0);
    await expect(
      entry.locator('[data-testid="public-flow-export-format-option"][data-recommendation-visible="true"]'),
    ).toHaveCount(2);

    await entry.scrollIntoViewIfNeeded();
    await capture(page, 'p35-r1-public-preflight-moving-390.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('checklist, sheet, and memo use the same preview and export counts', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });

    const cases = [
      {
        slug: 'vehicle-inspection-prep',
        shape: 'checklist',
        destination: 'checklist',
        count: 10,
      },
      {
        slug: 'source-backed-middle-school-math-1',
        shape: 'sheet',
        destination: 'sheet',
        count: 8,
      },
      {
        slug: 'overseas-safety-register',
        shape: 'checklist',
        destination: 'checklist',
        count: 4,
      },
    ] as const;

    for (const candidate of cases) {
      await page.goto(`/f/${candidate.slug}`);
      const preview = page.getByTestId('public-flow-artifact-preview');
      await expect(preview).toHaveAttribute('data-selected-shape', candidate.shape);
      await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(candidate.count);

      const entry = await openPreflight(page);
      await expect(entry).toHaveAttribute('data-preflight-schedule-state', 'not_applicable');
      await expect(entry).toHaveAttribute('data-primary-destination', candidate.destination);
      const primary = entry.locator(
        `[data-testid="public-flow-export-format-option"]`
        + `[data-export-destination="${candidate.destination}"]`,
      );
      await expect(primary).toHaveAttribute('data-export-state', 'ready');
      await expect(primary).toHaveAttribute('data-export-count', String(candidate.count));
      await expect(primary).toHaveAttribute('data-recommendation-role', 'primary');
      expect(
        await entry.locator(
          '[data-testid="public-flow-export-format-option"][data-recommendation-visible="true"]',
        ).count(),
      ).toBeLessThanOrEqual(3);
      await expect(
        entry.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
      ).toHaveCount(0);
      await expectPageQuality(page);
    }

    const finalEntry = page.getByTestId('public-flow-export-secondary-entry');
    await finalEntry.scrollIntoViewIfNeeded();
    await capture(page, 'p35-r1-public-preflight-shapes-1024.png');
    expect(errors).toEqual([]);
  });

  test('routine separates one source item from provisional and committed occurrences', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/f/curated-allblanc-morning-workout');

    const preview = page.getByTestId('public-flow-artifact-preview');
    await expect(preview).toHaveAttribute('data-selected-shape', 'flow_execution');
    await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(1);

    let entry = await openPreflight(page);
    await expect(entry).toHaveAttribute('data-preflight-schedule-state', 'provisional');
    const provisionalOccurrenceCount = Number(await entry.getAttribute('data-scheduled-event-count'));
    expect(provisionalOccurrenceCount).toBeGreaterThan(1);
    const provisionalCalendar = entry.locator(
      '[data-testid="public-flow-export-format-option"]'
      + '[data-export-destination="calendar"]',
    );
    await expect(provisionalCalendar).toBeHidden();
    await expect(provisionalCalendar).toBeDisabled();
    await expect(provisionalCalendar).toHaveAttribute('data-export-state', 'disabled');

    await entry.getByTestId('public-flow-export-secondary-toggle').click();
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    entry = await openPreflight(page);
    await expect(entry).toHaveAttribute('data-preflight-schedule-state', 'committed');
    const committedSeriesEventCount = Number(await entry.getAttribute('data-scheduled-event-count'));
    expect(committedSeriesEventCount).toBe(1);
    const calendar = entry.locator(
      '[data-testid="public-flow-export-format-option"][data-export-destination="calendar"]',
    );
    await expect(calendar).toHaveAttribute('data-export-state', 'ready');
    await expect(calendar).toHaveAttribute('data-export-count', String(committedSeriesEventCount));
    await expect(entry.getByTestId('my-flow-export-calendar-summary')).toContainText(
      String(provisionalOccurrenceCount),
    );
    await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(1);
    await expect(
      entry.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
    ).toHaveCount(0);

    await entry.scrollIntoViewIfNeeded();
    await capture(page, 'p35-r1-public-preflight-routine-1024.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
