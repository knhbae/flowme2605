import fs from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';
import { parseEffectiveFlowTsv } from '../../lib/flow/effective-flow-artifact-codec';
import { PERSONAL_STRUCTURAL_SHEET_HEADERS } from '../../lib/flow/personal-structural-list-export';

import {
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const MOVING_SLUG = 'moving-d30-basic';
const ROUTINE_SLUG = 'washer-tub-clean-monthly';
const RECEIPT_STORAGE_KEY = 'flow:export-receipts:v1';
const TABLET_VIEWPORT = { width: 1024, height: 768 } as const;

type FormatTestWindow = Window & {
  __p009FormatClipboardAttempts?: number;
  __p009FormatClipboardSuccesses?: number;
  __p009FormatClipboardText?: string;
  __p009FormatDownloadAttempts?: number;
};

type StorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

type StoredReceipt = Readonly<{
  requestId: string;
  savedPlanId: string;
  scope: Readonly<{ kind: 'flow' | 'selected' | 'item'; itemId?: string }>;
  format: 'calendar' | 'checklist' | 'sheet' | 'memo';
  itemIds: readonly string[];
  itemCount: number;
  projectionOutputCount: number;
  outputCount: number;
  artifact: Readonly<{
    target: 'clipboard' | 'local_file';
    mediaType: string;
    filename?: string;
    outputCount: number;
  }>;
}>;

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function seedSavedFlow(
  page: Page,
  slug: string,
  anchor: string,
): Promise<void> {
  await page.goto('/flows');
  await page.evaluate(({ flowSlug, anchorDate }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      slug: flowSlug,
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: anchorDate,
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      `flow:${flowSlug}:anchorDate`,
      JSON.stringify({ mode: 'custom', anchor: anchorDate }),
    );
  }, { flowSlug: slug, anchorDate: anchor });
}

async function storageSnapshot(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage): Record<string, string> => {
      const entries = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort()
        .map((key) => [key, storage.getItem(key) ?? ''] as const);
      return Object.fromEntries(entries);
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

async function installClipboardCapture(
  page: Page,
  options: { denyFirst?: boolean } = {},
): Promise<void> {
  await page.evaluate(({ denyFirst }) => {
    const target = window as FormatTestWindow;
    target.__p009FormatClipboardAttempts = 0;
    target.__p009FormatClipboardSuccesses = 0;
    target.__p009FormatClipboardText = '';
    let failuresRemaining = denyFirst ? 1 : 0;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.__p009FormatClipboardAttempts =
            (target.__p009FormatClipboardAttempts ?? 0) + 1;
          if (failuresRemaining > 0) {
            failuresRemaining -= 1;
            throw new DOMException('P0-09 clipboard permission denied', 'NotAllowedError');
          }
          target.__p009FormatClipboardSuccesses =
            (target.__p009FormatClipboardSuccesses ?? 0) + 1;
          target.__p009FormatClipboardText = value;
        },
        readText: async () => target.__p009FormatClipboardText ?? '',
      },
    });
  }, options);
}

async function clipboardState(page: Page) {
  return page.evaluate(() => ({
    attempts: (window as FormatTestWindow).__p009FormatClipboardAttempts ?? 0,
    successes: (window as FormatTestWindow).__p009FormatClipboardSuccesses ?? 0,
    text: (window as FormatTestWindow).__p009FormatClipboardText ?? '',
  }));
}

async function installOneDownloadStartFailure(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as FormatTestWindow;
    target.__p009FormatDownloadAttempts = 0;
    const originalClick = HTMLAnchorElement.prototype.click;
    let failuresRemaining = 1;
    HTMLAnchorElement.prototype.click = function click() {
      if (this.download.toLowerCase().endsWith('.ics')) {
        target.__p009FormatDownloadAttempts =
          (target.__p009FormatDownloadAttempts ?? 0) + 1;
        if (failuresRemaining > 0) {
          failuresRemaining -= 1;
          throw new Error('P0-09 simulated download start failure');
        }
      }
      return originalClick.call(this);
    };
  });
}

async function openSavedTransferPanel(page: Page, slug: string) {
  await page.setViewportSize(TABLET_VIEWPORT);
  await page.goto(`/my?flow=${slug}`);
  await expect(page.locator('main[data-p35-q1-saved-transfer="on"]')).toBeVisible();
  const workspace = await openMyFlowLibraryFlow(page, slug, 'record');
  const entry = workspace.getByTestId('my-flow-export-entry');
  await expect(entry).toBeVisible();
  await entry.click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-saved-transfer-surface', 'confirmation');
  return { workspace, panel };
}

async function makeDestinationVisible(
  panel: Locator,
  destination: 'calendar' | 'checklist' | 'sheet' | 'memo',
): Promise<Locator> {
  const button = panel.getByTestId(`my-flow-export-${destination}`);
  if (await button.isVisible().catch(() => false)) return button;
  const more = panel.getByTestId('my-flow-export-more-formats');
  await expect(more).toBeVisible();
  if ((await more.getAttribute('open')) === null) {
    await more.locator(':scope > summary').click();
  }
  await expect(button).toBeVisible();
  return button;
}

async function openTransferConfirmation(
  panel: Locator,
  destination: 'calendar' | 'checklist' | 'sheet' | 'memo',
): Promise<Locator> {
  await (await makeDestinationVisible(panel, destination)).click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toHaveAttribute('data-transfer-route', 'saved_transfer');
  await expect(confirmation).toHaveAttribute('data-transfer-persistence', 'persistent_receipt');
  await expect(confirmation).toHaveAttribute('data-format', destination);
  await expect(confirmation).toHaveAttribute('data-destination', destination);
  return confirmation;
}

async function storedReceipts(page: Page): Promise<StoredReceipt[]> {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { receipts?: StoredReceipt[] };
    return parsed.receipts ?? [];
  }, RECEIPT_STORAGE_KEY);
}

function expectOnlyReceiptAdded(
  before: StorageSnapshot,
  after: StorageSnapshot,
): void {
  expect(after.session).toEqual(before.session);
  Object.entries(before.local).forEach(([key, value]) => {
    expect(after.local[key], `pre-existing localStorage key changed: ${key}`).toBe(value);
  });
  expect(Object.keys(after.local).filter((key) => !(key in before.local))).toEqual([
    RECEIPT_STORAGE_KEY,
  ]);
}

test.use({ timezoneId: 'Asia/Seoul' });

test.describe('P35 P0-09 saved transfer format effects', () => {
  test('default-on routine Calendar downloads exact ICS and persists projection/artifact counts', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectBrowserErrors(page);
    await seedSavedFlow(page, ROUTINE_SLUG, '2031-09-01');
    const { panel } = await openSavedTransferPanel(page, ROUTINE_SLUG);

    const confirmation = await openTransferConfirmation(panel, 'calendar');
    await expect(confirmation).toHaveAttribute('data-transfer-target', 'local_file');
    await expect(confirmation).toHaveAttribute('data-scope', 'flow');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const itemIds = ((await confirmation.getAttribute('data-item-ids')) ?? '')
      .split(',')
      .filter(Boolean);
    const itemCount = Number(await confirmation.getAttribute('data-transfer-item-count'));
    const projectionOutputCount = Number(
      await confirmation.getAttribute('data-projection-output-count'),
    );
    const artifactOutputCount = Number(await confirmation.getAttribute('data-output-count'));
    expect(requestId).toBeTruthy();
    expect(itemCount).toBe(itemIds.length);
    expect(itemCount).toBeGreaterThan(0);
    expect(projectionOutputCount).toBe(1);
    expect(artifactOutputCount).toBeGreaterThan(0);

    const storageBefore = await storageSnapshot(page);
    await installOneDownloadStartFailure(page);
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    let receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-transfer-state', 'failed');
    await expect(receipt).toHaveAttribute('data-outcome', 'error');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt.getByTestId('flow-transfer-error')).toContainText(
      '파일 저장을 시작하지 못했어요',
    );
    expect(await storageSnapshot(page)).toEqual(storageBefore);

    const downloadPromise = page.waitForEvent('download');
    await receipt.getByTestId('flow-transfer-retry').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.ics$/u);
    const ics = fs.readFileSync(downloadPath!, 'utf8').replaceAll('\r\n ', '');
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('RRULE:FREQ=MONTHLY');
    expect(veventCount).toBe(artifactOutputCount);

    receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt).toHaveAttribute(
      'data-transfer-projection-output-count',
      String(projectionOutputCount),
    );
    await expect(receipt).toHaveAttribute('data-transfer-output-count', String(veventCount));
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    expect(await page.evaluate(() => (
      (window as FormatTestWindow).__p009FormatDownloadAttempts ?? 0
    ))).toBe(2);

    const registry = await storedReceipts(page);
    expect(registry).toHaveLength(1);
    expect(registry[0]).toMatchObject({
      requestId,
      savedPlanId: ROUTINE_SLUG,
      scope: { kind: 'flow' },
      format: 'calendar',
      itemIds,
      itemCount,
      projectionOutputCount,
      outputCount: veventCount,
      artifact: {
        target: 'local_file',
        mediaType: 'text/calendar;charset=utf-8',
        filename: download.suggestedFilename(),
        outputCount: veventCount,
      },
    });
    expect(errors).toEqual([]);
  });

  test('default-on sheet TSV and memo transfers copy the exact advertised rows', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectBrowserErrors(page);
    await seedSavedFlow(page, MOVING_SLUG, '2031-09-01');
    const { panel } = await openSavedTransferPanel(page, MOVING_SLUG);
    await installClipboardCapture(page);

    const sheetConfirmation = await openTransferConfirmation(panel, 'sheet');
    await expect(sheetConfirmation).toHaveAttribute('data-transfer-target', 'clipboard');
    const sheetRequestId = await sheetConfirmation.getAttribute('data-transfer-request-id');
    const sheetCount = Number(await sheetConfirmation.getAttribute('data-output-count'));
    await sheetConfirmation.getByTestId('my-flow-transfer-confirm').click();
    let receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', sheetRequestId!);
    const sheetClipboard = await clipboardState(page);
    const sheetRows = parseEffectiveFlowTsv(sheetClipboard.text);
    expect(sheetClipboard.attempts).toBe(1);
    expect(sheetClipboard.successes).toBe(1);
    expect(sheetRows[0]).toEqual([...PERSONAL_STRUCTURAL_SHEET_HEADERS]);
    expect(sheetRows.slice(1)).toHaveLength(sheetCount);
    expect(sheetRows.slice(1).every((row) => row.length === PERSONAL_STRUCTURAL_SHEET_HEADERS.length)).toBe(true);
    await receipt.getByTestId('flow-transfer-success-close').click();

    const memoConfirmation = await openTransferConfirmation(panel, 'memo');
    await expect(memoConfirmation).toHaveAttribute('data-transfer-target', 'clipboard');
    const memoRequestId = await memoConfirmation.getAttribute('data-transfer-request-id');
    const memoCount = Number(await memoConfirmation.getAttribute('data-output-count'));
    await memoConfirmation.getByTestId('my-flow-transfer-confirm').click();
    receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', memoRequestId!);
    const memoClipboard = await clipboardState(page);
    expect(memoClipboard.attempts).toBe(2);
    expect(memoClipboard.successes).toBe(2);
    expect((memoClipboard.text.match(/^\d+\. /gmu) ?? [])).toHaveLength(memoCount);
    expect(memoClipboard.text).toContain(`할 일 ${memoCount}개`);
    expect(memoClipboard.text).not.toContain('\t');

    const registry = await storedReceipts(page);
    expect(registry).toHaveLength(2);
    expect(registry.map((entry) => entry.requestId)).toEqual([
      sheetRequestId,
      memoRequestId,
    ]);
    expect(registry.map((entry) => entry.format)).toEqual(['sheet', 'memo']);
    expect(registry.map((entry) => entry.artifact.mediaType)).toEqual([
      'text/tab-separated-values;charset=utf-8',
      'text/plain;charset=utf-8',
    ]);
    expect(registry.every((entry) => (
      entry.itemCount === entry.itemIds.length
      && entry.projectionOutputCount === entry.outputCount
    ))).toBe(true);
    expect(errors).toEqual([]);
  });

  test('item-scope memo stores one persistent receipt and restores it in the Flow panel', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectBrowserErrors(page);
    await seedSavedFlow(page, MOVING_SLUG, '2031-09-01');
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto(`/my?flow=${MOVING_SLUG}`);
    await expect(page.locator('main[data-p35-q1-saved-transfer="on"]')).toBeVisible();
    const workspace = await openMyFlowLibraryFlow(page, MOVING_SLUG, 'plan');
    const selectedRow = workspace.getByTestId('my-flow-execution-row-shell').first();
    const selectedRowButton = selectedRow.getByRole('button', { name: /열기/u });
    const selectedRowAttributes = await selectedRow.evaluate((element) => (
      Object.fromEntries(Array.from(element.attributes).map((attribute) => [
        attribute.name,
        attribute.value,
      ]))
    ));
    const selectedButtonAttributes = await selectedRowButton.evaluate((element) => (
      Object.fromEntries(Array.from(element.attributes).map((attribute) => [
        attribute.name,
        attribute.value,
      ]))
    ));
    await selectedRowButton.click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    const itemExport = detail.getByTestId('my-flow-detail-portable-export');
    if (await itemExport.locator(':scope > summary').count()) {
      await itemExport.locator(':scope > summary').click();
    }
    const panel = itemExport.getByTestId('my-flow-export-panel');
    await expect(panel).toHaveAttribute('data-export-scope', 'item');
    await installClipboardCapture(page);

    const memo = panel.getByTestId('my-flow-detail-copy-portable-text');
    if (!(await memo.isVisible().catch(() => false))) {
      const more = panel.getByTestId('my-flow-export-more-formats');
      if ((await more.getAttribute('open')) === null) {
        await more.locator(':scope > summary').click();
      }
    }
    await memo.click();
    const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toHaveAttribute('data-scope', 'item');
    const transferAttributes = await confirmation.evaluate((element) => (
      Object.fromEntries(Array.from(element.attributes)
        .filter((attribute) => attribute.name.startsWith('data-'))
        .map((attribute) => [attribute.name, attribute.value]))
    ));
    const itemDiagnostic = JSON.stringify({
      selectedRowAttributes,
      selectedButtonAttributes,
      itemExportScope: await itemExport.getAttribute('data-export-scope'),
      itemExportIncludedCount: await itemExport.getAttribute('data-export-included-count'),
      panelIncludedCount: await panel.getAttribute('data-export-included-count'),
      transferAttributes,
      storageKeys: Object.keys((await storageSnapshot(page)).local),
    });
    expect(
      await confirmation.getAttribute('data-transfer-item-count'),
      `item transfer identity diagnostic: ${itemDiagnostic}`,
    ).toBe('1');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const itemId = await confirmation.getAttribute('data-item-ids');
    expect(requestId).toBeTruthy();
    expect(itemId).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();

    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt).toHaveAttribute('data-scope', 'item');
    const registry = await storedReceipts(page);
    expect(registry).toHaveLength(1);
    expect(registry[0]).toMatchObject({
      requestId,
      savedPlanId: MOVING_SLUG,
      scope: { kind: 'item', itemId },
      format: 'memo',
      itemIds: [itemId],
      itemCount: 1,
      projectionOutputCount: 1,
      outputCount: 1,
    });
    await receipt.getByTestId('flow-transfer-success-close').click();

    await page.reload();
    const reopenedWorkspace = await openMyFlowLibraryFlow(page, MOVING_SLUG, 'record');
    await reopenedWorkspace.getByTestId('my-flow-export-entry').click();
    const reopenedReceipt = reopenedWorkspace.getByTestId('my-flow-transfer-receipt');
    await expect(reopenedReceipt).toBeVisible();
    await expect(reopenedReceipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(reopenedReceipt).toHaveAttribute('data-scope', 'item');
    await expect(reopenedReceipt).toHaveAttribute('data-item-ids', itemId!);
    expect(errors).toEqual([]);
  });

  test('clipboard denial retries the same effect without mutating the saved plan', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectBrowserErrors(page);
    await seedSavedFlow(page, MOVING_SLUG, '2031-09-01');
    const { panel } = await openSavedTransferPanel(page, MOVING_SLUG);
    await installClipboardCapture(page, { denyFirst: true });
    const storageBefore = await storageSnapshot(page);

    const confirmation = await openTransferConfirmation(panel, 'memo');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const snapshotHash = await confirmation.getAttribute('data-snapshot-hash');
    const itemIds = await confirmation.getAttribute('data-item-ids');
    expect(requestId).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();

    let receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-transfer-state', 'failed');
    await expect(receipt).toHaveAttribute('data-outcome', 'error');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt).toHaveAttribute('data-snapshot-hash', snapshotHash!);
    await expect(receipt).toHaveAttribute('data-item-ids', itemIds!);
    await expect(receipt.getByTestId('flow-transfer-error')).toContainText('클립보드 권한이 거부');
    expect(await clipboardState(page)).toMatchObject({ attempts: 1, successes: 0, text: '' });
    expect(await storageSnapshot(page)).toEqual(storageBefore);

    await receipt.getByTestId('flow-transfer-retry').click();
    receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-transfer-state', 'succeeded');
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt).toHaveAttribute('data-snapshot-hash', snapshotHash!);
    await expect(receipt).toHaveAttribute('data-item-ids', itemIds!);
    const clipboard = await clipboardState(page);
    expect(clipboard.attempts).toBe(2);
    expect(clipboard.successes).toBe(1);
    expect(clipboard.text.trim().length).toBeGreaterThan(0);

    const storageAfter = await storageSnapshot(page);
    expectOnlyReceiptAdded(storageBefore, storageAfter);
    const registry = await storedReceipts(page);
    expect(registry).toHaveLength(1);
    expect(registry[0]).toMatchObject({ requestId, savedPlanId: MOVING_SLUG, format: 'memo' });
    expect(registry[0]?.itemIds.join(',')).toBe(itemIds);
    expect(errors).toEqual([]);
  });
});
