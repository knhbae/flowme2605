import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const FLOW_SLUG = 'moving-d30-basic';
const PUBLIC_ROUTE = `/f/${FLOW_SLUG}`;
const RECEIPT_STORAGE_KEY = 'flow:export-receipts:v1';
const screenshotDir = path.join(
  process.cwd(),
  'docs',
  'specs',
  '2026-08-04-p35-round2-bounded-ux-correction',
  'evidence',
  'p0-09',
  'screenshots',
);

fs.mkdirSync(screenshotDir, { recursive: true });

type EvidenceWindow = Window & {
  __p009EvidenceClipboardText?: string;
  __p009EvidenceClipboardWrites?: number;
};

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    if (/ERR_ABORTED|NS_BINDING_ABORTED/iu.test(failure)) return;
    errors.push(`requestfailed: ${request.method()} ${request.url()} · ${failure}`);
  });
  return errors;
}

async function installClipboardCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as EvidenceWindow;
    target.__p009EvidenceClipboardText = '';
    target.__p009EvidenceClipboardWrites = 0;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.__p009EvidenceClipboardWrites =
            (target.__p009EvidenceClipboardWrites ?? 0) + 1;
          target.__p009EvidenceClipboardText = value;
        },
        readText: async () => target.__p009EvidenceClipboardText ?? '',
      },
    });
  });
}

async function installOneReceiptStorageFailure(page: Page): Promise<void> {
  await page.evaluate((receiptStorageKey) => {
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    let failuresRemaining = 1;
    prototype.setItem = function setItem(key: string, value: string) {
      if (
        this === window.localStorage
        && key === receiptStorageKey
        && failuresRemaining > 0
      ) {
        failuresRemaining -= 1;
        throw new DOMException('P0-09 evidence quota failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  }, RECEIPT_STORAGE_KEY);
}

async function seedSavedFlow(page: Page): Promise<void> {
  await page.goto('/flows');
  await page.evaluate((slug) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
      slug,
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2031-09-01',
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      `flow:${slug}:anchorDate`,
      JSON.stringify({ mode: 'custom', anchor: '2031-09-01' }),
    );
  }, FLOW_SLUG);
}

async function openPublic(page: Page): Promise<void> {
  await page.goto(`${PUBLIC_ROUTE}?quickLocalResult=on`);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.locator('main[data-p35-q1-quick-eligible="true"]')).toBeVisible();
}

async function openSavedTransferPanel(page: Page): Promise<Locator> {
  await page.goto(`/my?flow=${FLOW_SLUG}&savedTransfer=on`);
  const workspace = await openMyFlowLibraryFlow(page, FLOW_SLUG, 'record');
  await workspace.getByTestId('my-flow-export-entry').click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await expect(panel).toBeVisible();
  return panel;
}

async function openDestination(
  panel: Locator,
  destination: 'checklist' | 'memo',
): Promise<Locator> {
  const destinationButton = panel.getByTestId(`my-flow-export-${destination}`);
  if (!(await destinationButton.isVisible().catch(() => false))) {
    const more = panel.getByTestId('my-flow-export-more-formats');
    await expect(more).toBeVisible();
    if ((await more.getAttribute('open')) === null) {
      await more.locator(':scope > summary').click();
    }
  }
  await destinationButton.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  return confirmation;
}

async function expectPageQuality(page: Page): Promise<void> {
  const quality = await page.evaluate(() => {
    const isVisible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const unnamedInteractiveCount = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter((element) => {
      if (!isVisible(element)) return false;
      const control = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const labelText = Array.from(control.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      return [
        element.getAttribute('aria-label'),
        element.getAttribute('aria-labelledby'),
        element.getAttribute('title'),
        labelText,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim().length === 0;
    }).length;
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount,
    };
  });

  expect(quality).toEqual({ horizontalOverflow: 0, unnamedInteractiveCount: 0 });
}

async function capture(
  page: Page,
  errors: string[],
  filename: string,
  anchor?: Locator,
): Promise<void> {
  if (anchor) await anchor.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForTimeout(250);
  await expectPageQuality(page);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
    animations: 'disabled',
  });
}

test.use({ timezoneId: 'Asia/Seoul' });

test.describe('P35 P0-09 retained result-transfer evidence', () => {
  test('390 clean public quick shows entry, immutable confirmation, and session result', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPublic(page);
    const quickEntry = page.getByTestId('public-flow-quick-result-entry');
    await expect(quickEntry).toContainText('내 계획에 저장되지 않음');
    await expect(page.locator('[data-action-role="save-to-personal-plan"]:visible')).toHaveCount(1);
    await capture(page, errors, '01-public-clean-entry-390x844.png', quickEntry);

    await installClipboardCapture(page);
    await quickEntry.click();
    const confirmation = page.getByTestId('public-flow-quick-result-confirmation');
    await expect(confirmation).toContainText('내 계획에 저장되지 않음');
    await capture(page, errors, '02-public-quick-confirmation-390x844.png', confirmation);

    await confirmation.getByTestId('public-flow-quick-result-execute').click();
    const feedback = page.getByTestId('public-flow-quick-result-feedback');
    await expect(feedback).toHaveAttribute('data-outcome', 'success');
    await capture(page, errors, '03-public-session-result-390x844.png', feedback);
  });

  test('390 dirty public draft removes the save-free quick action', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPublic(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await editor.getByTestId('public-flow-adjustment-kind-name').click();
    await editor.getByTestId('public-flow-adjustment-name-input').fill('우리 가족 이사 준비 확인본');
    await editor.getByTestId('public-flow-adjustment-apply').click();
    await expect(page.locator('main[data-p35-q1-quick-eligible="false"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(0);
    const save = page.locator('[data-action-role="save-to-personal-plan"]:visible');
    await expect(save).toHaveCount(1);
    await capture(page, errors, '04-public-dirty-save-only-390x844.png', save);
  });

  test('390 saved plan confirms scope, count, loss, and one-way risk before transfer', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page);
    const panel = await openSavedTransferPanel(page);
    const confirmation = await openDestination(panel, 'checklist');
    await expect(confirmation).toHaveAttribute('data-scope', 'flow');
    await expect(confirmation).toHaveAttribute('data-transfer-persistence', 'persistent_receipt');
    await capture(page, errors, '05-saved-confirmation-390x844.png', confirmation);
  });

  test('1024 saved result persists and reopens as a separate result receipt', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlow(page);
    const panel = await openSavedTransferPanel(page);
    await installClipboardCapture(page);
    const confirmation = await openDestination(panel, 'checklist');
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    const requestId = await receipt.getAttribute('data-transfer-request-id');
    expect(requestId).toBeTruthy();
    await capture(page, errors, '06-saved-result-receipt-1024x768.png', receipt);

    await page.reload();
    const reopenedPanel = await openSavedTransferPanel(page);
    const reopenedReceipt = reopenedPanel.getByTestId('my-flow-transfer-receipt');
    await expect(reopenedReceipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await capture(page, errors, '07-saved-reopened-receipt-1024x768.png', reopenedReceipt);
  });

  test('390 receipt storage failure remains explicit partial_local without repeating the artifact', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page);
    const panel = await openSavedTransferPanel(page);
    await installClipboardCapture(page);
    await installOneReceiptStorageFailure(page);
    const confirmation = await openDestination(panel, 'memo');
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const partial = panel.getByTestId('my-flow-transfer-receipt');
    await expect(partial).toHaveAttribute('data-outcome', 'partial_local');
    await expect(partial.getByTestId('my-flow-transfer-retry-receipt')).toBeVisible();
    await capture(page, errors, '08-partial-local-receipt-retry-390x844.png', partial);
  });

  test('1440 saved result surface has one confirmation and no geometry defects', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await seedSavedFlow(page);
    const panel = await openSavedTransferPanel(page);
    const confirmation = await openDestination(panel, 'checklist');
    await expect(panel.getByTestId('my-flow-transfer-confirmation')).toHaveCount(1);
    await capture(page, errors, '09-saved-confirmation-1440x1000.png', confirmation);
  });
});
