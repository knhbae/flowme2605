import { expect, test, type Locator, type Page } from '@playwright/test';

import { FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY } from '../../lib/flow/export-receipt-cleanup-journal';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const SOURCE_FLOW_SLUG = 'moving-d30-basic';
const SOURCE_ROUTE = `/f/${SOURCE_FLOW_SLUG}`;
const SAVED_FLOW_KEY = `flow:saved:${SOURCE_FLOW_SLUG}`;
const ANCHOR_KEY = `flow:${SOURCE_FLOW_SLUG}:anchorDate`;
const DATE_OVERRIDES_KEY = 'flow:my-flow:date-overrides';
const MIXED_HELD_ITEM_ID = 'flow-moving-item-0';
const MIXED_HELD_ITEM_SOURCE_DATE = '2031-08-02';
const DATE_REMOVED_OVERRIDE = '__flowme_unscheduled__';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const TABLET_VIEWPORT = { width: 1024, height: 768 } as const;
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

type HistorySnapshot = Readonly<{
  href: string;
  length: number;
  state: string;
}>;

type CapabilityManifest = Readonly<{
  destination: string;
  snapshotKind: string;
  snapshotVersion: string;
  snapshotHash: string;
  itemIds: string;
  outputCount: string;
}>;

type P009Window = Window & {
  __p009ClipboardText?: string;
  __p009ClipboardWriteCount?: number;
  __p009ReleaseClipboard?: () => void;
  __p009OriginalCreateObjectURL?: typeof URL.createObjectURL;
  __p009CreateObjectURLFailureCount?: number;
  __p009ReceiptFailureCount?: number;
  __p009StorageMutationLog?: Array<{
    operation: 'setItem' | 'removeItem' | 'clear';
    key?: string;
    value?: string;
  }>;
};

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function rawStorageSnapshot(page: Page): Promise<RawStorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage): Record<string, string> => {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort();
      return Object.fromEntries(keys.map((key) => [key, storage.getItem(key) ?? '']));
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

async function historySnapshot(page: Page): Promise<HistorySnapshot> {
  return page.evaluate(() => ({
    href: window.location.href,
    length: window.history.length,
    state: JSON.stringify(window.history.state ?? null),
  }));
}

async function installStorageMutationLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as P009Window;
    target.__p009StorageMutationLog = [];
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    const originalRemoveItem = prototype.removeItem;
    const originalClear = prototype.clear;

    prototype.setItem = function setItem(key: string, value: string) {
      target.__p009StorageMutationLog?.push({ operation: 'setItem', key, value });
      return originalSetItem.call(this, key, value);
    };
    prototype.removeItem = function removeItem(key: string) {
      target.__p009StorageMutationLog?.push({ operation: 'removeItem', key });
      return originalRemoveItem.call(this, key);
    };
    prototype.clear = function clear() {
      target.__p009StorageMutationLog?.push({ operation: 'clear' });
      return originalClear.call(this);
    };
  });
}

async function storageMutationLog(page: Page) {
  return page.evaluate(() => (
    (window as P009Window).__p009StorageMutationLog ?? []
  ));
}

async function installClipboardCapture(
  page: Page,
  options: { delayed?: boolean } = {},
): Promise<void> {
  await page.evaluate(({ delayed }) => {
    const target = window as P009Window;
    target.__p009ClipboardText = '';
    target.__p009ClipboardWriteCount = 0;
    let release: (() => void) | undefined;
    const gate = delayed
      ? new Promise<void>((resolve) => {
          release = resolve;
        })
      : Promise.resolve();
    target.__p009ReleaseClipboard = release;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.__p009ClipboardWriteCount = (target.__p009ClipboardWriteCount ?? 0) + 1;
          await gate;
          target.__p009ClipboardText = value;
        },
        readText: async () => target.__p009ClipboardText ?? '',
      },
    });
  }, options);
}

async function clipboardState(page: Page) {
  return page.evaluate(() => ({
    text: (window as P009Window).__p009ClipboardText ?? '',
    writes: (window as P009Window).__p009ClipboardWriteCount ?? 0,
  }));
}

async function releaseClipboard(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as P009Window).__p009ReleaseClipboard?.();
  });
}

async function installObjectUrlFailure(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as P009Window;
    target.__p009OriginalCreateObjectURL = URL.createObjectURL;
    target.__p009CreateObjectURLFailureCount = 0;
    URL.createObjectURL = () => {
      target.__p009CreateObjectURLFailureCount = (
        target.__p009CreateObjectURLFailureCount ?? 0
      ) + 1;
      throw new DOMException('P0-09 object URL failure', 'InvalidStateError');
    };
  });
}

async function restoreObjectUrlCreation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as P009Window;
    if (!target.__p009OriginalCreateObjectURL) {
      throw new Error('P0-09 original URL.createObjectURL is unavailable.');
    }
    URL.createObjectURL = target.__p009OriginalCreateObjectURL;
  });
}

async function resetAndOpenPublic(
  page: Page,
  search = 'quickLocalResult=on',
): Promise<Locator> {
  await page.setViewportSize(MOBILE_VIEWPORT);
  const legacySearch = [search, 'savedPlanLibrary=off'].filter(Boolean).join('&');
  await page.goto(`${SOURCE_ROUTE}?${legacySearch}`);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toBeVisible();
  return capability;
}

async function seedSavedMovingFlow(page: Page): Promise<void> {
  await page.goto('/flows');
  await page.evaluate(({ savedFlowKey, anchorKey, slug }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(savedFlowKey, JSON.stringify({
      slug,
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2031-09-01',
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      anchorKey,
      JSON.stringify({ mode: 'custom', anchor: '2031-09-01' }),
    );
  }, { savedFlowKey: SAVED_FLOW_KEY, anchorKey: ANCHOR_KEY, slug: SOURCE_FLOW_SLUG });
}

async function openSavedTransferPanel(
  page: Page,
  options: {
    viewport?: { width: number; height: number };
    search?: string;
  } = {},
) {
  const viewport = options.viewport ?? MOBILE_VIEWPORT;
  const search = options.search ?? 'savedTransfer=on';
  await page.setViewportSize(viewport);
  await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}&savedPlanLibrary=off${search ? `&${search}` : ''}`);
  const workspace = await openMyFlowLibraryFlow(page, SOURCE_FLOW_SLUG, 'record');
  const entry = workspace.getByTestId('my-flow-export-entry');
  await expect(entry).toBeVisible();
  await entry.click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await expect(panel).toBeVisible();
  return { workspace, entry, panel };
}

async function openArchivedInventory(page: Page): Promise<void> {
  const directEntry = page.getByTestId('my-flow-open-archived');
  if (await directEntry.isVisible().catch(() => false)) {
    await directEntry.click();
    return;
  }
  const visibleFilter = page.getByTestId('my-flow-list-filter-archived').filter({ visible: true });
  if (await visibleFilter.isVisible().catch(() => false)) {
    await visibleFilter.click();
    return;
  }
  await page.getByTestId('my-flow-mobile-inventory-open').click();
  await page
    .getByTestId('my-flow-inventory-sheet')
    .getByTestId('my-flow-list-filter-archived')
    .click();
}

async function makeDestinationVisible(panel: Locator, destination: string): Promise<Locator> {
  const button = panel.getByTestId(`my-flow-export-${destination}`);
  if (await button.isVisible().catch(() => false)) return button;
  const more = panel.getByTestId('my-flow-export-more-formats');
  await expect(more).toBeVisible();
  if ((await more.getAttribute('open')) === null) await more.locator(':scope > summary').click();
  await expect(button).toBeVisible();
  return button;
}

async function readCapabilityManifest(
  capability: Locator,
  destination?: string,
): Promise<CapabilityManifest> {
  const candidate = destination
    ? capability.locator(
        `[data-testid="flow-capability-result-choice"][data-capability-destination="${destination}"]`,
      )
    : capability.getByTestId('flow-capability-selected-preview');
  await expect(candidate).toHaveCount(1);
  return {
    destination: (await candidate.getAttribute('data-capability-destination')) ?? '',
    snapshotKind: (await capability.getAttribute('data-capability-snapshot-kind')) ?? '',
    snapshotVersion: (await capability.getAttribute('data-capability-snapshot-version')) ?? '',
    snapshotHash: (await candidate.getAttribute('data-capability-manifest-hash')) ?? '',
    itemIds: (await candidate.getAttribute('data-capability-manifest-item-ids')) ?? '',
    outputCount: (await candidate.getAttribute('data-capability-output-count')) ?? '',
  };
}

async function expectTransferMetadata(
  locator: Locator,
  manifest: CapabilityManifest,
  scope: 'flow' | 'selected' | 'item',
): Promise<void> {
  await expect(locator).toHaveAttribute('data-snapshot-kind', manifest.snapshotKind);
  await expect(locator).toHaveAttribute('data-snapshot-version', manifest.snapshotVersion);
  await expect(locator).toHaveAttribute('data-snapshot-hash', manifest.snapshotHash);
  await expect(locator).toHaveAttribute('data-scope', scope);
  await expect(locator).toHaveAttribute('data-format', manifest.destination);
  await expect(locator).toHaveAttribute('data-destination', manifest.destination);
  await expect(locator).toHaveAttribute('data-item-ids', manifest.itemIds);
  await expect(locator).toHaveAttribute('data-output-count', manifest.outputCount);
}

async function chooseTwoItems(panel: Locator): Promise<string[]> {
  await panel.getByTestId('my-flow-export-scope-selected').click();
  const choices = panel.getByTestId('my-flow-export-selectable-item');
  await expect(choices).toHaveCount(24);
  const titles: string[] = [];
  for (let index = 0; index < 2; index += 1) {
    titles.push((await choices.nth(index).getByTestId('my-flow-export-selectable-item-title').innerText()).trim());
    await choices.nth(index).getByRole('checkbox').check();
  }
  await expect(panel.getByTestId('my-flow-export-scope-summary')).toHaveText('직접 선택 · 2개');
  return titles;
}

async function openTransferConfirmation(
  panel: Locator,
  destination: 'calendar' | 'checklist' | 'sheet' | 'memo',
): Promise<Locator> {
  const destinationButton = await makeDestinationVisible(panel, destination);
  await destinationButton.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toBeVisible();
  return confirmation;
}

async function installOneReceiptStorageFailure(page: Page, receiptStorageKey: string): Promise<void> {
  await page.evaluate((targetKey) => {
    const target = window as P009Window;
    target.__p009ReceiptFailureCount = 0;
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    let remainingFailures = 1;
    prototype.setItem = function setItem(key: string, value: string) {
      if (this === window.localStorage && key === targetKey && remainingFailures > 0) {
        remainingFailures -= 1;
        target.__p009ReceiptFailureCount = (target.__p009ReceiptFailureCount ?? 0) + 1;
        throw new DOMException('P0-09 receipt storage failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  }, receiptStorageKey);
}

async function installOneReceiptRemovalFailure(page: Page, receiptStorageKey: string): Promise<void> {
  await page.evaluate((targetKey) => {
    const prototype = Storage.prototype;
    const originalRemoveItem = prototype.removeItem;
    let remainingFailures = 1;
    prototype.removeItem = function removeItem(key: string) {
      if (this === window.localStorage && key === targetKey && remainingFailures > 0) {
        remainingFailures -= 1;
        throw new DOMException('P0-09 receipt cleanup failure', 'QuotaExceededError');
      }
      return originalRemoveItem.call(this, key);
    };
  }, receiptStorageKey);
}

async function installOneCleanupJournalPromotionFailure(
  page: Page,
  journalStorageKey: string,
): Promise<void> {
  await page.evaluate((targetKey) => {
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    let remainingFailures = 1;
    prototype.setItem = function setItem(key: string, value: string) {
      let cleanupRequired = false;
      if (this === window.sessionStorage && key === targetKey) {
        try {
          cleanupRequired = JSON.parse(value).phase === 'cleanup_required';
        } catch {
          cleanupRequired = false;
        }
      }
      if (cleanupRequired && remainingFailures > 0) {
        remainingFailures -= 1;
        throw new DOMException('P0-09 cleanup journal promotion failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  }, journalStorageKey);
}

async function installOneCleanupJournalPreparationFailure(
  page: Page,
  journalStorageKey: string,
): Promise<void> {
  await page.evaluate((targetKey) => {
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    let remainingFailures = 1;
    prototype.setItem = function setItem(key: string, value: string) {
      if (
        this === window.sessionStorage
        && key === targetKey
        && remainingFailures > 0
      ) {
        remainingFailures -= 1;
        throw new DOMException('P0-09 cleanup journal preparation failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  }, journalStorageKey);
}

function expectOnlyReceiptStorageChanged(
  before: RawStorageSnapshot,
  after: RawStorageSnapshot,
  receiptStorageKey: string,
) {
  expect(after.session).toEqual(before.session);
  for (const [key, value] of Object.entries(before.local)) {
    expect(after.local[key], `pre-existing localStorage key changed: ${key}`).toBe(value);
  }
  expect(
    Object.keys(after.local).filter((key) => !(key in before.local)),
  ).toEqual([receiptStorageKey]);
}

function countReceiptRecords(value: unknown, requestId: string): number {
  if (Array.isArray(value)) {
    return value.reduce((count, entry) => count + countReceiptRecords(entry, requestId), 0);
  }
  if (!value || typeof value !== 'object') return 0;
  const record = value as Record<string, unknown>;
  return (record.requestId === requestId ? 1 : 0)
    + Object.values(record).reduce(
      (count: number, entry) => count + countReceiptRecords(entry, requestId),
      0,
    );
}

test.use({ timezoneId: 'Asia/Seoul' });

test.describe('P35 P0-09 quick local result and saved transfer', () => {
  test('390 clean public quick keeps save primary, creates one session result, and writes nothing', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const requests: string[] = [];
    const capability = await resetAndOpenPublic(page);
    await expect(page.locator('main[data-p35-q1-quick-local="on"]')).toBeVisible();
    await expect(page.locator('main[data-p35-q1-quick-eligible="true"]')).toBeVisible();
    const manifest = await readCapabilityManifest(capability);
    expect(manifest.destination).toBe('checklist');
    expect(manifest.itemIds.split(',').filter(Boolean)).toHaveLength(24);
    expect(manifest.outputCount).toBe('24');

    const quickEntry = page.getByTestId('public-flow-quick-result-entry');
    await expect(quickEntry).toBeVisible();
    await expect(quickEntry).toHaveAttribute('data-action-role', 'create-quick-local-result');
    await expect(quickEntry).toHaveAttribute('data-action-priority', 'secondary');
    await expect(quickEntry).toContainText('내 계획에 저장되지 않음');
    await expect(quickEntry).toContainText('저장 버튼');
    await expect(page.locator('[data-action-role="save-to-personal-plan"]:visible')).toHaveCount(1);

    const storageBefore = await rawStorageSnapshot(page);
    const historyBefore = await historySnapshot(page);
    await installStorageMutationLog(page);
    await installClipboardCapture(page);
    page.on('request', (request) => requests.push(`${request.method()} ${request.url()}`));

    await quickEntry.click();
    const confirmation = page.getByTestId('public-flow-quick-result-confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText('내 계획에 저장되지 않음');
    await expect(confirmation.getByTestId('public-flow-quick-result-save-recovery')).toBeVisible();
    await expectTransferMetadata(confirmation, manifest, 'flow');
    await confirmation.getByTestId('public-flow-quick-result-execute').click();

    const feedback = page.getByTestId('public-flow-quick-result-feedback');
    await expect(feedback).toBeVisible();
    await expectTransferMetadata(feedback, manifest, 'flow');
    await expect(feedback).toHaveAttribute('data-outcome', 'success');
    const clipboard = await clipboardState(page);
    expect(clipboard.writes).toBe(1);
    expect((clipboard.text.match(/^- \[[ x]\] /gmu) ?? []).length).toBe(24);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(await storageMutationLog(page)).toEqual([]);
    expect(await historySnapshot(page)).toEqual(historyBefore);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);

    await page.reload();
    await expect(page.getByTestId('public-flow-quick-result-feedback')).toHaveCount(0);
  });

  test('390 public format selection owns the exact quick artifact and session confirmation', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const capability = await resetAndOpenPublic(page);
    const moreFormats = capability.locator('details').filter({ hasText: '다른 형식' });
    if (await moreFormats.count()) {
      await moreFormats.locator(':scope > summary').click();
    }
    const memoChoice = capability.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="memo"]',
    );
    await expect(memoChoice).toBeVisible();
    await memoChoice.click();
    await expect(capability).toHaveAttribute('data-capability-selected-destination', 'memo');
    const manifest = await readCapabilityManifest(capability, 'memo');

    const quickEntry = page.getByTestId('public-flow-quick-result-entry');
    await expect(quickEntry).toContainText('메모 결과 복사');
    const storageBefore = await rawStorageSnapshot(page);
    await installClipboardCapture(page);
    await quickEntry.click();

    const confirmation = page.getByTestId('public-flow-quick-result-confirmation');
    await expectTransferMetadata(confirmation, manifest, 'flow');
    await confirmation.getByTestId('public-flow-quick-result-execute').click();

    const feedback = page.getByTestId('public-flow-quick-result-feedback');
    await expectTransferMetadata(feedback, manifest, 'flow');
    const clipboard = await clipboardState(page);
    expect(clipboard.writes).toBe(1);
    expect(clipboard.text).toContain('할 일 24개');
    expect(clipboard.text).toMatch(/\n1\. /u);
    expect(clipboard.text).not.toMatch(/^- \[[ x]\] /gmu);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(errors).toEqual([]);
  });

  test('390 dirty public draft hides quick and leaves save as the only primary', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await resetAndOpenPublic(page);
    const storageBefore = await rawStorageSnapshot(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await expect(editor).toBeVisible();
    await editor.getByTestId('public-flow-adjustment-kind-name').click();
    await editor.getByTestId('public-flow-adjustment-name-input').fill('우리 가족 이사 준비 확인본');
    await editor.getByTestId('public-flow-adjustment-apply').click();

    await expect(page.locator('main[data-p35-q1-quick-eligible="false"]')).toBeVisible();
    await expect(page.locator('main[data-p35-q1-quick-reason="public_draft_modified"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(0);
    await expect(page.locator('[data-action-role="save-to-personal-plan"]:visible')).toHaveCount(1);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(errors).toEqual([]);
  });

  test('390 custom public date is dirty and cannot use the save-free quick path', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await resetAndOpenPublic(page);
    const anchorInput = page.getByTestId('public-flow-anchor-input');
    await expect(anchorInput).toBeVisible();
    await anchorInput.fill('2031-10-01');

    await expect(page.locator('main[data-p35-q1-quick-eligible="false"]')).toBeVisible();
    await expect(page.locator('main[data-p35-q1-quick-reason="public_draft_modified"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(0);
    await expect(page.locator('[data-action-role="save-to-personal-plan"]:visible')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('390 saved confirmation cancel preserves clipboard, storage, plan, and opener focus', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { entry, panel } = await openSavedTransferPanel(page);
    const capability = panel.getByTestId('my-flow-capability-result');
    const manifest = await readCapabilityManifest(capability, 'checklist');
    const storageBefore = await rawStorageSnapshot(page);
    await installClipboardCapture(page);
    let downloads = 0;
    page.on('download', () => {
      downloads += 1;
    });

    const confirmation = await openTransferConfirmation(panel, 'checklist');
    await expectTransferMetadata(confirmation, manifest, 'flow');
    await confirmation.getByTestId('my-flow-transfer-cancel').click();
    await expect(confirmation).toHaveCount(0);
    await expect(entry).toBeFocused();
    expect(await clipboardState(page)).toEqual({ text: '', writes: 0 });
    expect(downloads).toBe(0);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(errors).toEqual([]);
  });

  test('390 saved Calendar file failure persists no receipt and retries the same request once', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { panel } = await openSavedTransferPanel(page);
    const capability = panel.getByTestId('my-flow-capability-result');
    const manifest = await readCapabilityManifest(capability, 'calendar');
    const confirmation = await openTransferConfirmation(panel, 'calendar');
    await expectTransferMetadata(confirmation, manifest, 'flow');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(requestId).toBeTruthy();
    expect(receiptStorageKey).toBeTruthy();
    const storageBefore = await rawStorageSnapshot(page);
    let downloadCount = 0;
    page.on('download', () => {
      downloadCount += 1;
    });
    await installObjectUrlFailure(page);

    await confirmation.getByTestId('my-flow-transfer-confirm').click();

    let outcome = panel.getByTestId('my-flow-transfer-receipt');
    await expect(outcome).toBeVisible();
    await expect(outcome).toHaveAttribute('data-transfer-state', 'failed');
    await expect(outcome).toHaveAttribute('data-outcome', 'error');
    await expect(outcome).toHaveAttribute('data-transfer-request-id', requestId!);
    await expectTransferMetadata(outcome, manifest, 'flow');
    await expect(outcome.getByTestId('flow-transfer-error')).toContainText(
      '브라우저에서 결과 파일을 만들지 못했어요.',
    );
    await expect(outcome.getByTestId('flow-transfer-retry')).toContainText(
      '같은 파일 다시 만들기',
    );
    expect(downloadCount).toBe(0);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(
      await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!),
    ).toBeNull();

    await restoreObjectUrlCreation(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      outcome.getByTestId('flow-transfer-retry').click(),
    ]);

    outcome = panel.getByTestId('my-flow-transfer-receipt');
    await expect(outcome).toHaveAttribute('data-transfer-state', 'succeeded');
    await expect(outcome).toHaveAttribute('data-outcome', 'success');
    await expect(outcome).toHaveAttribute('data-transfer-request-id', requestId!);
    await expectTransferMetadata(outcome, manifest, 'flow');
    expect(download.suggestedFilename()).toMatch(/\.ics$/u);
    expect(downloadCount).toBe(1);
    expect(await page.evaluate(() => (
      (window as P009Window).__p009CreateObjectURLFailureCount ?? 0
    ))).toBe(1);
    const storageAfterRetry = await rawStorageSnapshot(page);
    expectOnlyReceiptStorageChanged(storageBefore, storageAfterRetry, receiptStorageKey!);
    const rawReceipt = storageAfterRetry.local[receiptStorageKey!] ?? '';
    expect(countReceiptRecords(JSON.parse(rawReceipt), requestId!)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('1024 saved clipboard transfer persists immutable receipt and reopens after reload', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const requests: string[] = [];
    await seedSavedMovingFlow(page);
    const { panel } = await openSavedTransferPanel(page, { viewport: TABLET_VIEWPORT });
    const selectedTitles = await chooseTwoItems(panel);
    const capability = panel.getByTestId('my-flow-capability-result');
    await expect.poll(async () => {
      const candidate = capability.locator(
        '[data-testid="flow-capability-result-choice"][data-capability-destination="checklist"]',
      );
      return ((await candidate.getAttribute('data-capability-manifest-item-ids')) ?? '')
        .split(',')
        .filter(Boolean).length;
    }).toBe(2);
    const manifest = await readCapabilityManifest(capability, 'checklist');
    const storageBefore = await rawStorageSnapshot(page);
    await installClipboardCapture(page);
    page.on('request', (request) => requests.push(`${request.method()} ${request.url()}`));

    const confirmation = await openTransferConfirmation(panel, 'checklist');
    await expectTransferMetadata(confirmation, manifest, 'selected');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(requestId).toBeTruthy();
    expect(receiptStorageKey).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();

    let receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt).toHaveAttribute('data-receipt-storage-key', receiptStorageKey!);
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expectTransferMetadata(receipt, manifest, 'selected');
    const clipboard = await clipboardState(page);
    expect(clipboard.writes).toBe(1);
    expect((clipboard.text.match(/^- \[[ x]\] /gmu) ?? []).length).toBe(2);
    selectedTitles.forEach((title) => expect(clipboard.text).toContain(title));

    const storageAfter = await rawStorageSnapshot(page);
    expectOnlyReceiptStorageChanged(storageBefore, storageAfter, receiptStorageKey!);
    expect(storageAfter.local[receiptStorageKey!]).toContain(requestId!);
    expect(storageAfter.local[receiptStorageKey!]).toContain(manifest.snapshotHash);
    manifest.itemIds.split(',').filter(Boolean).forEach((itemId) => {
      expect(storageAfter.local[receiptStorageKey!]).toContain(itemId);
    });
    expect(requests).toEqual([]);

    await page.reload();
    const reopened = await openMyFlowLibraryFlow(page, SOURCE_FLOW_SLUG, 'record');
    await reopened.getByTestId('my-flow-export-entry').click();
    receipt = reopened.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expectTransferMetadata(receipt, manifest, 'selected');
    expect(errors).toEqual([]);
  });

  test('390 mixed Calendar shows the same held Item reason before transfer and after receipt reload', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    await page.evaluate((fixture) => {
      const overrideKey = `${fixture.slug}::${fixture.itemId}::${fixture.sourceDate}`;
      window.localStorage.setItem(
        fixture.dateOverridesKey,
        JSON.stringify({ [overrideKey]: fixture.removedOverride }),
      );
    }, {
      slug: SOURCE_FLOW_SLUG,
      itemId: MIXED_HELD_ITEM_ID,
      sourceDate: MIXED_HELD_ITEM_SOURCE_DATE,
      dateOverridesKey: DATE_OVERRIDES_KEY,
      removedOverride: DATE_REMOVED_OVERRIDE,
    });

    const { panel } = await openSavedTransferPanel(page);
    const calendarCandidate = panel.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]',
    );
    await expect(calendarCandidate).toHaveAttribute('data-capability-output-count', '23');

    const confirmation = await openTransferConfirmation(panel, 'calendar');
    const confirmationLoss = confirmation.getByTestId('flow-transfer-loss');
    await expect(confirmationLoss).toHaveAttribute('data-transfer-held-count', '1');
    await expect(confirmationLoss).toHaveAttribute(
      'data-transfer-omitted-item-ids',
      MIXED_HELD_ITEM_ID,
    );
    const confirmationReason = confirmationLoss.getByTestId('flow-transfer-loss-reason');
    await expect(confirmationReason).toHaveAttribute('data-item-ids', MIXED_HELD_ITEM_ID);
    await expect(confirmationReason).toContainText(/날짜/u);
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    expect(requestId).toBeTruthy();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      confirmation.getByTestId('my-flow-transfer-confirm').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.ics$/u);
    const outcome = panel.getByTestId('my-flow-transfer-receipt');
    await expect(outcome).toHaveAttribute('data-outcome', 'success');
    await outcome.getByTestId('flow-transfer-success-close').click();

    await page.reload();
    const reopened = await openMyFlowLibraryFlow(page, SOURCE_FLOW_SLUG, 'record');
    await reopened.getByTestId('my-flow-export-entry').click();
    const receipt = reopened.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    const persistedLoss = receipt.getByTestId('my-flow-transfer-persisted-loss');
    await expect(persistedLoss).toHaveAttribute('data-transfer-held-count', '1');
    await expect(persistedLoss).toHaveAttribute(
      'data-transfer-omitted-item-ids',
      MIXED_HELD_ITEM_ID,
    );
    const persistedReason = persistedLoss.getByTestId('flow-transfer-loss-reason');
    await expect(persistedReason).toHaveAttribute('data-item-ids', MIXED_HELD_ITEM_ID);
    await expect(persistedReason).toContainText(/날짜/u);
    expect(errors).toEqual([]);
  });

  test('390 receipt persistence failure is partial_local and receipt-only retry does not recreate artifact', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { panel } = await openSavedTransferPanel(page);
    const capability = panel.getByTestId('my-flow-capability-result');
    const manifest = await readCapabilityManifest(capability, 'checklist');
    await installClipboardCapture(page);
    const storageBefore = await rawStorageSnapshot(page);

    const confirmation = await openTransferConfirmation(panel, 'checklist');
    await expectTransferMetadata(confirmation, manifest, 'flow');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    expect(receiptStorageKey).toBeTruthy();
    expect(requestId).toBeTruthy();
    await installOneReceiptStorageFailure(page, receiptStorageKey!);
    await confirmation.getByTestId('my-flow-transfer-confirm').click();

    let receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-outcome', 'partial_local');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expectTransferMetadata(receipt, manifest, 'flow');
    expect((await clipboardState(page)).writes).toBe(1);
    expect((await rawStorageSnapshot(page)).local[receiptStorageKey!]).toBeUndefined();
    expect((await rawStorageSnapshot(page)).local).toEqual(storageBefore.local);

    await receipt.getByTestId('my-flow-transfer-retry-receipt').click();
    receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    expect((await clipboardState(page)).writes).toBe(1);
    const storageAfterRetry = await rawStorageSnapshot(page);
    expectOnlyReceiptStorageChanged(storageBefore, storageAfterRetry, receiptStorageKey!);
    expect(storageAfterRetry.local[receiptStorageKey!]).toContain(requestId!);
    expect(await page.evaluate(() => (
      (window as P009Window).__p009ReceiptFailureCount ?? 0
    ))).toBe(1);
    expect(errors).toEqual([]);
  });

  test('390 pending lock makes a synchronous double click produce one artifact and one receipt', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { panel } = await openSavedTransferPanel(page);
    const capability = panel.getByTestId('my-flow-capability-result');
    const manifest = await readCapabilityManifest(capability, 'checklist');
    const confirmation = await openTransferConfirmation(panel, 'checklist');
    await expectTransferMetadata(confirmation, manifest, 'flow');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(requestId).toBeTruthy();
    expect(receiptStorageKey).toBeTruthy();
    await installClipboardCapture(page, { delayed: true });

    const confirm = confirmation.getByTestId('my-flow-transfer-confirm');
    await confirm.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect.poll(async () => (await clipboardState(page)).writes).toBe(1);
    await expect(confirmation).toHaveAttribute('data-transfer-state', 'pending');
    await expect(confirm).toBeDisabled();
    await expect(confirm).toHaveAttribute('aria-busy', 'true');
    await expect(confirmation.getByTestId('my-flow-transfer-cancel')).toBeDisabled();

    await releaseClipboard(page);
    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    expect((await clipboardState(page)).writes).toBe(1);
    const rawReceipt = (await rawStorageSnapshot(page)).local[receiptStorageKey!] ?? '';
    expect(countReceiptRecords(JSON.parse(rawReceipt), requestId!)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('390 receipt survives archive and is removed only with that saved plan permanent deletion', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { workspace, panel } = await openSavedTransferPanel(page);
    await installClipboardCapture(page);
    const confirmation = await openTransferConfirmation(panel, 'checklist');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(receiptStorageKey).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const transferReceipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(transferReceipt).toHaveAttribute('data-outcome', 'success');
    await transferReceipt.getByTestId('flow-transfer-success-close').click();

    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    await management.locator('summary').click();
    await management.getByTestId('my-flow-archive-toggle').click();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeTruthy();

    await openArchivedInventory(page);
    const archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${SOURCE_FLOW_SLUG}"]`,
    );
    await expect(archivedRow).toBeVisible();
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    await archivedMenu.getByTestId('my-flow-permanent-delete-open').click();
    const dialog = page.getByTestId('my-flow-permanent-delete-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('my-flow-permanent-delete-confirm').click();

    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeNull();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVED_FLOW_KEY)).toBeNull();
    await expect(page.getByTestId('my-flow-permanent-delete-receipt-warning')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('390 cleanup journal preparation failure keeps the archived plan and receipt intact', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { workspace, panel } = await openSavedTransferPanel(page);
    await installClipboardCapture(page);
    const confirmation = await openTransferConfirmation(panel, 'checklist');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(receiptStorageKey).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const transferReceipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(transferReceipt).toHaveAttribute('data-outcome', 'success');
    await transferReceipt.getByTestId('flow-transfer-success-close').click();

    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    await management.locator('summary').click();
    await management.getByTestId('my-flow-archive-toggle').click();
    await openArchivedInventory(page);
    const archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${SOURCE_FLOW_SLUG}"]`,
    );
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    await archivedMenu.getByTestId('my-flow-permanent-delete-open').click();
    await installOneCleanupJournalPreparationFailure(
      page,
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    );
    await page.getByTestId('my-flow-permanent-delete-confirm').click();

    const dialog = page.getByTestId('my-flow-permanent-delete-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('my-flow-permanent-delete-error')).toContainText(
      '계획을 삭제하지 않았어요',
    );
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVED_FLOW_KEY)).toBeTruthy();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeTruthy();
    expect(await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    )).toBeNull();
    await expect(page.getByTestId('my-flow-permanent-delete-receipt-warning')).toHaveCount(0);
    expect((await clipboardState(page)).writes).toBe(1);
    expect(errors).toEqual([]);
  });

  test('390 permanent-delete receipt cleanup failure survives reload and retry deletes only the receipt', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { workspace, panel } = await openSavedTransferPanel(page);
    await installClipboardCapture(page);
    const confirmation = await openTransferConfirmation(panel, 'checklist');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(receiptStorageKey).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const transferReceipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(transferReceipt).toHaveAttribute('data-outcome', 'success');
    await transferReceipt.getByTestId('flow-transfer-success-close').click();

    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    await management.locator('summary').click();
    await management.getByTestId('my-flow-archive-toggle').click();
    await openArchivedInventory(page);
    const archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${SOURCE_FLOW_SLUG}"]`,
    );
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    await archivedMenu.getByTestId('my-flow-permanent-delete-open').click();
    await installOneReceiptRemovalFailure(page, receiptStorageKey!);
    await page.getByTestId('my-flow-permanent-delete-confirm').click();

    const warning = page.getByTestId('my-flow-permanent-delete-receipt-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute('data-retryable', 'true');
    await expect(warning).toHaveAttribute('data-recovery-source', 'live');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVED_FLOW_KEY)).toBeNull();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeTruthy();
    expect((await clipboardState(page)).writes).toBe(1);
    const journalBeforeReload = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    );
    expect(journalBeforeReload).toBeTruthy();
    expect(JSON.parse(journalBeforeReload!).phase).toBe('cleanup_required');

    await page.reload();
    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute('data-retryable', 'true');
    await expect(warning).toHaveAttribute('data-recovery-source', 'journal');
    await expect(warning).toHaveAttribute('data-cleanup-journal-phase', 'cleanup_required');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVED_FLOW_KEY)).toBeNull();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeTruthy();
    await installClipboardCapture(page);

    await warning.getByTestId('my-flow-permanent-delete-receipt-retry').click();
    await expect(warning).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeNull();
    expect(await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    )).toBeNull();
    expect((await clipboardState(page)).writes).toBe(0);
    await page.reload();
    await expect(warning).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeNull();
    expect(await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    )).toBeNull();
    expect(errors).toEqual([]);
  });

  test('390 interrupted cleanup journal promotion recovers after reload without regenerating artifact', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { workspace, panel } = await openSavedTransferPanel(page);
    await installClipboardCapture(page);
    const confirmation = await openTransferConfirmation(panel, 'checklist');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(receiptStorageKey).toBeTruthy();
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const transferReceipt = panel.getByTestId('my-flow-transfer-receipt');
    await expect(transferReceipt).toHaveAttribute('data-outcome', 'success');
    await transferReceipt.getByTestId('flow-transfer-success-close').click();

    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    await management.locator('summary').click();
    await management.getByTestId('my-flow-archive-toggle').click();
    await openArchivedInventory(page);
    const archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${SOURCE_FLOW_SLUG}"]`,
    );
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    await archivedMenu.getByTestId('my-flow-permanent-delete-open').click();
    await installOneCleanupJournalPromotionFailure(
      page,
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    );
    await page.getByTestId('my-flow-permanent-delete-confirm').click();

    const warning = page.getByTestId('my-flow-permanent-delete-receipt-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute('data-retryable', 'true');
    await expect(warning).toHaveAttribute('data-recovery-source', 'live');
    await expect(warning).toHaveAttribute('data-cleanup-journal-phase', 'prepared');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVED_FLOW_KEY)).toBeNull();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeTruthy();
    expect(JSON.parse((await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    ))!).phase).toBe('prepared');
    expect((await clipboardState(page)).writes).toBe(1);

    await page.reload();
    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute('data-recovery-source', 'journal');
    await expect(warning).toHaveAttribute('data-cleanup-journal-phase', 'cleanup_required');
    expect(JSON.parse((await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    ))!).phase).toBe('cleanup_required');
    await installClipboardCapture(page);
    await warning.getByTestId('my-flow-permanent-delete-receipt-retry').click();
    await expect(warning).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeNull();
    expect(await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    )).toBeNull();
    expect((await clipboardState(page)).writes).toBe(0);
    await page.reload();
    await expect(warning).toHaveCount(0);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), receiptStorageKey!)).toBeNull();
    expect(await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
    )).toBeNull();
    expect(errors).toEqual([]);
  });

  test('390/1024 independent exact flags do not disable the other result path', async ({ page }) => {
    await resetAndOpenPublic(page, 'savedTransfer=off');
    await expect(page.locator('main[data-p35-q1-quick-local="on"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-quick-result-entry')).toBeVisible();

    await resetAndOpenPublic(page, 'quickLocalResult=off&savedTransfer=OFF');
    await expect(page.locator('main[data-p35-q1-quick-local="off"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(0);

    await seedSavedMovingFlow(page);
    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}&savedPlanLibrary=off&quickLocalResult=off`);
    await expect(page.locator('main[data-p35-q1-saved-transfer="on"]')).toBeVisible();
    let workspace = await openMyFlowLibraryFlow(page, SOURCE_FLOW_SLUG, 'record');
    await expect(workspace.getByTestId('my-flow-export-entry')).toBeVisible();

    await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}&savedPlanLibrary=off&savedTransfer=off&quickLocalResult=on`);
    await expect(page.locator('main[data-p35-q1-saved-transfer="off"]')).toBeVisible();
    workspace = await openMyFlowLibraryFlow(page, SOURCE_FLOW_SLUG, 'record');
    await workspace.getByTestId('my-flow-export-entry').click();
    await expect(workspace.getByTestId('my-flow-export-panel')).toHaveAttribute(
      'data-saved-transfer-surface',
      'legacy',
    );
    await expect(workspace.getByTestId('my-flow-transfer-confirmation')).toHaveCount(0);

    await page.goto(`/my?flow=${SOURCE_FLOW_SLUG}&savedPlanLibrary=off&savedTransfer=OFF`);
    await expect(page.locator('main[data-p35-q1-saved-transfer="on"]')).toBeVisible();
  });

  test('1440 result surfaces have no horizontal overflow or unnamed interactive controls', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await seedSavedMovingFlow(page);
    const { panel } = await openSavedTransferPanel(page, { viewport: WIDE_VIEWPORT });
    await openTransferConfirmation(panel, 'checklist');
    const quality = await page.evaluate(() => {
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
          document.body.scrollWidth - document.body.clientWidth,
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
    expect(quality).toEqual({ horizontalOverflow: 0, unnamedInteractiveCount: 0 });
    expect(errors).toEqual([]);
  });
});
