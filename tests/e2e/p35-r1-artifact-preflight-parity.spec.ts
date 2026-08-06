import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceRoot = process.env.FLOWME_P35_R1_EVIDENCE_DIR;

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

async function openCapabilityResult(page: Page) {
  const result = page.getByTestId('public-flow-capability-result');
  await result.scrollIntoViewIfNeeded();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-capability-lifecycle', 'public_preview');
  await expect(result).toHaveAttribute('data-capability-snapshot-kind', 'effective_authoring');
  await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
  return result;
}

test.describe('P35-R1 public capability-result parity', () => {
  test('moving Calendar preview keeps one 24-item manifest before save', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');

    const result = await openCapabilityResult(page);
    await expect(result).toHaveAttribute('data-capability-primary-destination', 'calendar');

    const calendar = result.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]',
    );
    await expect(calendar).toHaveAttribute('data-capability-candidate-role', 'primary');
    await expect(calendar).toHaveAttribute('data-capability-candidate-state', 'available');
    await expect(calendar).toHaveAttribute('data-capability-output-count', '24');
    await calendar.click();

    const selected = result.getByTestId('flow-capability-selected-preview');
    await expect(selected).toHaveAttribute('data-capability-destination', 'calendar');
    await expect(selected).toHaveAttribute('data-capability-output-count', '24');
    const rows = selected.getByTestId('flow-capability-artifact-preview-row');
    await expect(rows).toHaveCount(24);
    await expect(selected.locator('[data-testid="flow-capability-artifact-preview-row"]:visible'))
      .toHaveCount(3);
    await selected.getByTestId('flow-capability-artifact-preview-expand').click();
    await expect(selected.locator('[data-testid="flow-capability-artifact-preview-row"]:visible'))
      .toHaveCount(24);
    expect((await selected.getAttribute('data-capability-manifest-item-ids'))?.split(',')).toHaveLength(24);
    await expect(result.locator('[data-capability-candidate-state="disabled"]')).toHaveCount(0);

    await result.scrollIntoViewIfNeeded();
    await capture(page, 'p35-r1-public-preflight-moving-390.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('checklist, sheet, and memo keep preview count and manifest parity', async ({ page }) => {
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
      const result = await openCapabilityResult(page);
      await expect(result).toHaveAttribute('data-capability-primary-destination', candidate.destination);
      const primary = result.locator(
        `[data-testid="flow-capability-result-choice"]`
        + `[data-capability-destination="${candidate.destination}"]`,
      );
      await expect(primary).toHaveAttribute('data-capability-candidate-state', 'available');
      await expect(primary).toHaveAttribute('data-capability-output-count', String(candidate.count));
      await expect(primary).toHaveAttribute('data-capability-candidate-role', 'primary');
      await primary.click();

      const selected = result.getByTestId('flow-capability-selected-preview');
      await expect(selected).toHaveAttribute('data-capability-destination', candidate.destination);
      await expect(selected).toHaveAttribute('data-capability-output-count', String(candidate.count));
      const rows = selected.getByTestId('flow-capability-artifact-preview-row');
      await expect(rows).toHaveCount(candidate.count);
      if (candidate.count > 3) {
        await expect(selected.locator('[data-testid="flow-capability-artifact-preview-row"]:visible'))
          .toHaveCount(3);
        await selected.getByTestId('flow-capability-artifact-preview-expand').click();
      }
      await expect(selected.locator('[data-testid="flow-capability-artifact-preview-row"]:visible'))
        .toHaveCount(candidate.count);
      expect((await selected.getAttribute('data-capability-manifest-item-ids'))?.split(','))
        .toHaveLength(candidate.count);
      expect(
        await result.locator('[data-testid="flow-capability-result-choice"]').count(),
      ).toBeLessThanOrEqual(3);
      await expect(result.locator('[data-capability-candidate-state="disabled"]')).toHaveCount(0);
      await expectPageQuality(page);
    }

    const finalEntry = page.getByTestId('public-flow-capability-result');
    await finalEntry.scrollIntoViewIfNeeded();
    await capture(page, 'p35-r1-public-preflight-shapes-1024.png');
    expect(errors).toEqual([]);
  });

  test('routine separates one source item from provisional and committed occurrences', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/f/curated-allblanc-morning-workout');

    let result = await openCapabilityResult(page);
    await expect(result).toHaveAttribute('data-capability-primary-destination', 'checklist');
    const sourcePrimary = result.locator(
      '[data-testid="flow-capability-result-choice"]'
      + '[data-capability-destination="checklist"]',
    );
    await expect(sourcePrimary).toHaveAttribute('data-capability-candidate-role', 'primary');
    await expect(sourcePrimary).toHaveAttribute('data-capability-output-count', '1');
    const sourceResult = result.getByTestId('flow-capability-selected-preview');
    await expect(sourceResult).toHaveAttribute('data-capability-destination', 'checklist');
    await expect(sourceResult).toHaveAttribute('data-capability-output-count', '1');
    await expect(sourceResult.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(1);

    const provisionalCalendar = result.locator(
      '[data-testid="flow-capability-conditional-result"]'
      + '[data-capability-destination="calendar"]',
    );
    await expect(provisionalCalendar).toBeVisible();
    await expect(provisionalCalendar).toHaveAttribute('data-capability-candidate-state', 'conditional');
    await expect(provisionalCalendar).toHaveAttribute('data-capability-output-count', '0');
    await expect(provisionalCalendar).toHaveAttribute('data-capability-expected-output-count', '1');
    const expectedOccurrenceCount = Number(
      await provisionalCalendar.getAttribute('data-capability-expected-output-count'),
    );
    expect(expectedOccurrenceCount).toBeGreaterThan(0);

    await provisionalCalendar.getByTestId('flow-capability-conditional-edit').click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
    await expect(editor).toHaveAttribute('data-editor-context', 'public-draft');
    await expect(editor).toHaveAttribute('data-editor-level', 'plan');
    await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic');
    await expect(editor).toHaveAttribute('data-adjustment-kind', 'anchor');
    await editor.getByTestId('public-flow-adjustment-anchor-input').fill('2030-08-15');
    await editor.getByTestId('public-flow-adjustment-apply').click();
    await expect(editor).toHaveCount(0);

    result = await openCapabilityResult(page);
    await expect(result).toHaveAttribute('data-capability-primary-destination', 'checklist');
    const calendar = result.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]',
    );
    await expect(calendar).toHaveAttribute('data-capability-candidate-state', 'available');
    await expect(calendar).toHaveAttribute('data-capability-candidate-role', 'available');
    const committedSeriesEventCount = Number(
      await calendar.getAttribute('data-capability-output-count'),
    );
    expect(committedSeriesEventCount).toBeGreaterThan(0);
    await calendar.click();
    const committedPreview = result.getByTestId('flow-capability-selected-preview');
    await expect(committedPreview).toHaveAttribute('data-capability-destination', 'calendar');
    await expect(committedPreview).toHaveAttribute(
      'data-capability-output-count',
      String(committedSeriesEventCount),
    );
    await expect(committedPreview.getByTestId('flow-capability-artifact-preview-row'))
      .toHaveCount(committedSeriesEventCount);
    await expect(result.locator('[data-capability-candidate-state="disabled"]')).toHaveCount(0);

    await result.scrollIntoViewIfNeeded();
    await capture(page, 'p35-r1-public-preflight-routine-1024.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
