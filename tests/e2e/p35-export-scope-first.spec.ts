import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_07_EVIDENCE_DIR;

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
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
}

async function inspectPageQuality(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      unnamedInteractiveCount: Array.from(
        document.querySelectorAll('button, a[href], input, select, textarea, summary'),
      ).filter((element) => {
        if (!visible(element)) return false;
        const target = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
        const labelText = Array.from(target.labels ?? [])
          .map((label) => label.textContent?.trim() ?? '')
          .join(' ');
        return [
          element.getAttribute('aria-label'),
          element.getAttribute('aria-labelledby'),
          element.getAttribute('title'),
          labelText,
          element.textContent?.trim(),
        ].filter(Boolean).join(' ').trim().length === 0;
      }).length,
    };
  });
}

async function makeVisible(panel: Locator, destination: Locator) {
  if (await destination.isVisible().catch(() => false)) return;
  const more = panel.getByTestId('my-flow-export-more-formats');
  await expect(more).toBeVisible();
  if ((await more.getAttribute('open')) === null) await more.locator('summary').click();
  await expect(destination).toBeVisible();
}

test.describe('P35-07 export scope first and count parity', () => {
  test('mobile whole and selected scopes predict actual ICS, checklist, and sheet counts', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectBrowserErrors(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=source-backed&view=flows');

    const flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'record');
    const surface = flow.getByTestId('my-flow-export-surface');
    await surface.getByTestId('my-flow-export-entry').click();
    const panel = surface.getByTestId('my-flow-export-panel');
    await expect(panel).toHaveAttribute('data-p35-marker', 'P35-EXPORT-SCOPE-FIRST');
    await expect(panel).toHaveAttribute('data-p35-count-marker', 'P35-EXPORT-COUNT-PARITY');
    await expect(panel.getByTestId('my-flow-export-scope-step')).toContainText('1 · 범위');
    await expect(panel.getByTestId('my-flow-export-recommendations')).toBeVisible();
    await expect(
      panel.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
    ).toHaveCount(0);

    const wholeCount = Number(await panel.getAttribute('data-export-included-count'));
    expect(wholeCount).toBeGreaterThan(1);
    await panel.scrollIntoViewIfNeeded();
    await capture(page, 'p35-07-export-whole-390.png');

    const calendar = panel.getByTestId('my-flow-export-calendar');
    await makeVisible(panel, calendar);
    const calendarCount = Number(await calendar.getAttribute('data-export-count'));
    const downloadPromise = page.waitForEvent('download');
    await calendar.click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const ics = fs.readFileSync(downloadPath!, 'utf8');
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(calendarCount);
    let receipt = panel.getByTestId('flow-export-result-receipt');
    await expect(receipt).toHaveAttribute('data-export-output-count', String(calendarCount));
    await expect(receipt).toHaveAttribute('data-export-scope', 'flow');
    await expect(receipt).toHaveAttribute(
      'data-export-stable-identity',
      'saved-flow::source-backed-moving-d30',
    );

    await panel.getByTestId('my-flow-export-scope-selected').click();
    const choices = panel.getByTestId('my-flow-export-selectable-item');
    await choices.nth(0).getByRole('checkbox').check();
    await choices.nth(1).getByRole('checkbox').check();
    await expect(panel.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
    await panel.scrollIntoViewIfNeeded();
    await capture(page, 'p35-07-export-selected-390.png');

    const checklist = panel.getByTestId('my-flow-export-checklist');
    await makeVisible(panel, checklist);
    expect(Number(await checklist.getAttribute('data-export-count'))).toBe(2);
    await checklist.click();
    const checklistText = await page.evaluate(() => navigator.clipboard.readText());
    expect((checklistText.match(/^- \[[ x]\] /gmu) ?? []).length).toBe(2);
    receipt = panel.getByTestId('flow-export-result-receipt');
    await expect(receipt).toHaveAttribute('data-export-output-count', '2');
    await expect(receipt).toHaveAttribute('data-export-scope', 'selected');

    const sheet = panel.getByTestId('my-flow-export-sheet');
    await makeVisible(panel, sheet);
    expect(Number(await sheet.getAttribute('data-export-count'))).toBe(2);
    await sheet.click();
    const sheetText = await page.evaluate(() => navigator.clipboard.readText());
    const sheetLines = sheetText.split(/\r?\n/u).filter(Boolean);
    expect(sheetLines.length - 1).toBe(2);
    await expect(receipt).toHaveAttribute('data-export-output-count', '2');

    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });

  test('current undated item uses the same scope contract and explains Calendar recovery', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectBrowserErrors(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=source-backed&view=flows');

    const flow = await openMyFlowLibraryFlow(
      page,
      'source-backed-middle-school-math-1',
      'execute',
    );
    await flow
      .getByTestId('my-flow-shape-aware-row')
      .first()
      .getByTestId('my-flow-row-open-label')
      .click();
    const detail = flow
      .getByTestId('my-flow-workspace-detail-pane')
      .getByTestId('my-flow-item-detail');
    const currentExport = detail.getByTestId('my-flow-detail-portable-export');
    if (await currentExport.locator(':scope > summary').count()) {
      await currentExport.locator(':scope > summary').click();
    }
    const panel = currentExport.getByTestId('my-flow-export-panel');
    await expect(panel).toHaveAttribute('data-export-scope', 'item');
    await expect(panel.getByTestId('my-flow-export-scope-control')).toContainText('현재 항목');
    await expect(panel.getByTestId('my-flow-export-scope-control')).toContainText('1개');
    await expect(panel.getByTestId('my-flow-export-calendar-recovery')).toContainText(
      'Flow로 돌아가 날짜를 정해 주세요',
    );
    await expect(
      panel.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
    ).toHaveCount(0);
    await currentExport.scrollIntoViewIfNeeded();
    await capture(page, 'p35-07-export-current-1024.png');

    const memo = panel.getByTestId('my-flow-detail-copy-portable-text');
    await makeVisible(panel, memo);
    await memo.click();
    const memoText = await page.evaluate(() => navigator.clipboard.readText());
    expect(memoText.trim().length).toBeGreaterThan(0);
    const receipt = panel.getByTestId('flow-export-result-receipt');
    await expect(receipt).toHaveAttribute('data-export-scope', 'item');
    await expect(receipt).toHaveAttribute('data-export-output-count', '1');
    await expect(receipt).toHaveAttribute('data-export-stable-identity', /.+::.+/);
    await expect(receipt.getByTestId('flow-export-result-next-action')).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await receipt.scrollIntoViewIfNeeded();
    await capture(page, 'p35-07-export-receipt-1440.png');
    expect(await inspectPageQuality(page)).toEqual({
      horizontalOverflow: 0,
      unnamedInteractiveCount: 0,
    });
    expect(errors).toEqual([]);
  });
});
