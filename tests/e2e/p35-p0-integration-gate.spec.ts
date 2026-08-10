import { createHash } from 'node:crypto';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
  getOpenMyFlowItemDetail,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const SOURCE_FLOW_SLUG = 'moving-d30-basic';
const SOURCE_ROUTE = `/f/${SOURCE_FLOW_SLUG}`;
const MAP_ROUTE = '/flow-maps/middle-school-math-1';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const TABLET_VIEWPORT = { width: 1024, height: 768 } as const;
const WIDE_VIEWPORT = { width: 1440, height: 1000 } as const;

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

type TransferManifest = Readonly<{
  destination: string;
  snapshotKind: string;
  snapshotVersion: string;
  snapshotHash: string;
  itemIds: string;
  outputCount: string;
}>;

type StorageMutation = Readonly<{
  storage: 'local' | 'session';
  operation: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  value?: string;
}>;

type IntegrationWindow = Window & {
  __p010ClipboardText?: string;
  __p010ClipboardWriteCount?: number;
  __p010StorageMutationLog?: StorageMutation[];
};

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure !== 'net::ERR_ABORTED') {
      errors.push(`requestfailed: ${request.url()} (${failure})`);
    }
  });
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

function rawStorageChecksum(snapshot: RawStorageSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

async function historySnapshot(page: Page) {
  return page.evaluate(() => ({
    href: window.location.href,
    length: window.history.length,
    state: JSON.stringify(window.history.state ?? null),
  }));
}

async function installStorageMutationLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as IntegrationWindow;
    target.__p010StorageMutationLog = [];
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    const originalRemoveItem = prototype.removeItem;
    const originalClear = prototype.clear;
    const storageName = (storage: Storage): 'local' | 'session' => (
      storage === window.localStorage ? 'local' : 'session'
    );

    prototype.setItem = function setItem(key: string, value: string) {
      target.__p010StorageMutationLog?.push({
        storage: storageName(this),
        operation: 'setItem',
        key,
        value,
      });
      return originalSetItem.call(this, key, value);
    };
    prototype.removeItem = function removeItem(key: string) {
      target.__p010StorageMutationLog?.push({
        storage: storageName(this),
        operation: 'removeItem',
        key,
      });
      return originalRemoveItem.call(this, key);
    };
    prototype.clear = function clear() {
      target.__p010StorageMutationLog?.push({
        storage: storageName(this),
        operation: 'clear',
      });
      return originalClear.call(this);
    };
  });
}

async function installNavigationStorageMutationLog(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as IntegrationWindow;
    target.__p010StorageMutationLog = [];
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    const originalRemoveItem = prototype.removeItem;
    const originalClear = prototype.clear;
    const storageName = (storage: Storage): 'local' | 'session' => (
      storage === window.localStorage ? 'local' : 'session'
    );

    prototype.setItem = function setItem(key: string, value: string) {
      target.__p010StorageMutationLog?.push({
        storage: storageName(this),
        operation: 'setItem',
        key,
        value,
      });
      return originalSetItem.call(this, key, value);
    };
    prototype.removeItem = function removeItem(key: string) {
      target.__p010StorageMutationLog?.push({
        storage: storageName(this),
        operation: 'removeItem',
        key,
      });
      return originalRemoveItem.call(this, key);
    };
    prototype.clear = function clear() {
      target.__p010StorageMutationLog?.push({
        storage: storageName(this),
        operation: 'clear',
      });
      return originalClear.call(this);
    };
  });
}

async function storageMutationLog(page: Page): Promise<StorageMutation[]> {
  return page.evaluate(() => (
    (window as IntegrationWindow).__p010StorageMutationLog ?? []
  ));
}

async function installClipboardCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as IntegrationWindow;
    target.__p010ClipboardText = '';
    target.__p010ClipboardWriteCount = 0;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          target.__p010ClipboardWriteCount = (target.__p010ClipboardWriteCount ?? 0) + 1;
          target.__p010ClipboardText = value;
        },
        readText: async () => target.__p010ClipboardText ?? '',
      },
    });
  });
}

async function clipboardState(page: Page) {
  return page.evaluate(() => ({
    text: (window as IntegrationWindow).__p010ClipboardText ?? '',
    writes: (window as IntegrationWindow).__p010ClipboardWriteCount ?? 0,
  }));
}

async function resetAndOpenPublic(page: Page, search = ''): Promise<void> {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(page, `${SOURCE_ROUTE}${search ? `?${search}` : ''}`);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId('public-flow-anchor-input')).toBeVisible();
}

async function readTransferManifest(
  capability: Locator,
  destination?: string,
): Promise<TransferManifest> {
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
  manifest: TransferManifest,
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

function changedStorageKeys(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>,
): string[] {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => before[key] !== after[key])
    .sort();
}

async function inspectRouteQuality(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element): boolean => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const nameOf = (element: Element): string => {
      const target = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const labelledBy = element.getAttribute('aria-labelledby')
        ?.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ');
      const labelText = Array.from(target.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      return [
        element.getAttribute('aria-label'),
        labelledBy,
        element.getAttribute('title'),
        labelText,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim();
    };
    const interactive = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter(isVisible);
    const mobileNavigation = document.querySelector<HTMLElement>(
      '[data-testid="platform-mobile-tabs"]',
    );
    const navigationRect = mobileNavigation && isVisible(mobileNavigation)
      ? mobileNavigation.getBoundingClientRect()
      : null;
    const overlapsMobileNavigation = navigationRect
      ? interactive
        .filter((element) => !mobileNavigation?.contains(element))
        .filter((element) => {
          const position = window.getComputedStyle(element).position;
          return position === 'fixed' || position === 'sticky';
        })
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < navigationRect.right
            && rect.right > navigationRect.left
            && rect.top < navigationRect.bottom
            && rect.bottom > navigationRect.top;
        }).length
      : 0;
    const active = document.activeElement;
    const activeRect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;

    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount: interactive.filter((element) => nameOf(element).length === 0).length,
      horizontallyClippedInteractiveCount: interactive.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      }).length,
      outOfViewportFixedCount: Array.from(document.querySelectorAll<HTMLElement>('*'))
        .filter(isVisible)
        .filter((element) => {
          const position = window.getComputedStyle(element).position;
          return position === 'fixed' || position === 'sticky';
        })
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        }).length,
      fixedMobileNavigationOverlapCount: overlapsMobileNavigation,
      replacementCharacterCount: (document.body.innerText.match(/\uFFFD/gu) ?? []).length,
      focusedTag: active?.tagName.toLowerCase() ?? '',
      focusedName: active ? nameOf(active) : '',
      focusedWithinViewport: Boolean(activeRect)
        && activeRect!.left >= -1
        && activeRect!.right <= window.innerWidth + 1
        && activeRect!.top >= -1
        && activeRect!.bottom <= window.innerHeight + 1,
    };
  });
}

test.use({ timezoneId: 'Asia/Seoul' });

test.describe('P35 P0-10 no-new-feature integration gate', () => {
  test('public edit/apply/save continues through selected saved detail, Item, transfer, receipt, and reload', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await resetAndOpenPublic(page);

    const planEditorOpener = page.getByTestId('public-flow-adjust-entry-mobile');
    await planEditorOpener.click();
    const planEditor = page.getByTestId('public-flow-personal-adjustment');
    await expect(planEditor).toBeVisible();
    await planEditor.getByTestId('public-flow-adjustment-kind-items').click();
    const publicItemRow = planEditor.getByTestId('public-flow-adjustment-item-row').first();
    const publicItemOpener = publicItemRow.getByTestId('public-flow-adjustment-item-edit');
    const itemId = await publicItemOpener.getAttribute('data-item-id');
    expect(itemId).toMatch(/\S/u);
    await publicItemOpener.click();

    const itemEditor = page.getByTestId('public-flow-item-editor');
    const editedItemTitle = '계약 서류와 하자 사진을 저장 전 다시 대조하기';
    await itemEditor.getByTestId('public-flow-item-editor-title-input').fill(editedItemTitle);
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await expect(itemEditor).toHaveCount(0);
    await expect(publicItemRow).toContainText(editedItemTitle);

    const editedPlanTitle = '우리 가족 이사 준비 통합 검증 계획';
    await planEditor.getByTestId('public-flow-adjustment-kind-name').click();
    await planEditor.getByTestId('public-flow-adjustment-name-input').fill(editedPlanTitle);
    await planEditor.getByTestId('public-flow-adjustment-apply').click();
    await expect(page.locator('[data-flow-identity-slot="title"]').first()).toHaveText(
      editedPlanTitle,
    );
    await expect(page.getByTestId('public-flow-capability-result')).toContainText(editedItemTitle);

    await page.getByTestId('public-flow-anchor-input').fill('2031-08-15');
    await page.getByTestId('public-flow-save-primary-mobile').click();
    await expect.poll(() => ({
      pathname: new URL(page.url()).pathname,
      flow: new URL(page.url()).searchParams.get('flow'),
    })).toEqual({
      pathname: '/my',
      flow: expect.stringMatching(/^personal-copy:/u),
    });
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).not.toBe('');

    let workspace = await openMyFlowLibraryFlow(page, personalCopyKey, 'plan');
    await expect(workspace.getByRole('heading', {
      name: editedPlanTitle,
      exact: true,
    }).first()).toBeVisible();
    const savedRecordKey = `flow:saved:${personalCopyKey}`;
    const savedRecordRaw = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      savedRecordKey,
    );
    expect(savedRecordRaw).toContain(editedPlanTitle);
    const savedStorage = await rawStorageSnapshot(page);
    expect(Object.values(savedStorage.local).some((raw) => raw.includes(editedItemTitle))).toBe(true);

    const savedItemRow = workspace.locator('[data-testid="my-flow-execution-row-shell"]:visible')
      .filter({ hasText: editedItemTitle })
      .first();
    await expect(savedItemRow).toBeVisible();
    await savedItemRow.getByRole('button', { name: /열기/u }).click();
    const itemDetail = getOpenMyFlowItemDetail(page);
    await expect(itemDetail).toBeVisible();
    await expect(itemDetail).toHaveAttribute('data-item-id', new RegExp(`${itemId}$`, 'u'));
    await expect(itemDetail.getByRole('checkbox', {
      name: `${editedItemTitle} 완료 체크`,
      exact: true,
    })).toBeVisible();
    await closeOpenMyFlowItemDetail(page);

    workspace = await openMyFlowLibraryFlow(page, personalCopyKey, 'record');
    const exportEntry = workspace.getByTestId('my-flow-export-entry');
    await expect(exportEntry).toBeVisible();
    await exportEntry.click();
    let transferPanel = workspace.getByTestId('my-flow-export-panel');
    const capability = transferPanel.getByTestId('my-flow-capability-result');
    const manifest = await readTransferManifest(capability, 'checklist');
    expect(manifest.itemIds.split(',').filter(Boolean)).toContain(itemId);
    expect(manifest.outputCount).toBe('24');
    const storageBeforeTransfer = await rawStorageSnapshot(page);
    await installClipboardCapture(page);

    await transferPanel.getByTestId('my-flow-export-checklist').click();
    const confirmation = transferPanel.getByTestId('my-flow-transfer-confirmation');
    await expect(confirmation).toBeVisible();
    await expectTransferMetadata(confirmation, manifest, 'flow');
    const requestId = await confirmation.getAttribute('data-transfer-request-id');
    const receiptStorageKey = await confirmation.getAttribute('data-receipt-storage-key');
    expect(requestId).toMatch(/\S/u);
    expect(receiptStorageKey).toMatch(/\S/u);
    await confirmation.getByTestId('my-flow-transfer-confirm').click();

    let receipt = transferPanel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-outcome', 'success');
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expectTransferMetadata(receipt, manifest, 'flow');
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    const clipboard = await clipboardState(page);
    expect(clipboard.writes).toBe(1);
    expect((clipboard.text.match(/^- \[[ x]\] /gmu) ?? []).length).toBe(24);
    expect(clipboard.text).toContain(editedItemTitle);

    const storageAfterTransfer = await rawStorageSnapshot(page);
    expect(storageAfterTransfer.session).toEqual(storageBeforeTransfer.session);
    expect(changedStorageKeys(storageBeforeTransfer.local, storageAfterTransfer.local)).toEqual([
      receiptStorageKey!,
    ]);
    const storedReceiptRegistry = JSON.parse(storageAfterTransfer.local[receiptStorageKey!]) as {
      receipts?: Array<{
        requestId?: string;
        artifact?: {
          payloadHash?: string;
          payloadByteLength?: number;
          payloadHashAlgorithm?: string;
          textEncoding?: string;
          newlinePolicy?: string;
        };
      }>;
    };
    const storedReceipt = storedReceiptRegistry.receipts?.find((entry) => entry.requestId === requestId);
    expect(storedReceipt).toBeTruthy();
    expect(storedReceipt?.artifact).toMatchObject({
      payloadHash: createHash('sha256').update(clipboard.text, 'utf8').digest('hex'),
      payloadByteLength: Buffer.byteLength(clipboard.text, 'utf8'),
      payloadHashAlgorithm: 'sha256',
      textEncoding: 'utf-8',
      newlinePolicy: 'preserve',
    });
    expect(storageAfterTransfer.local[receiptStorageKey!]).toContain(manifest.snapshotHash);
    expect(storageAfterTransfer.local[receiptStorageKey!]).toContain(itemId!);

    const chosenFormat = transferPanel.getByTestId('my-flow-export-checklist');
    const successClose = receipt.getByTestId('flow-transfer-success-close');
    await successClose.click();
    await expect(successClose).toHaveCount(0);
    await expect(chosenFormat).toBeFocused();

    await page.reload();
    workspace = await openMyFlowLibraryFlow(page, personalCopyKey, 'record');
    await workspace.getByTestId('my-flow-export-entry').click();
    transferPanel = workspace.getByTestId('my-flow-export-panel');
    receipt = transferPanel.getByTestId('my-flow-transfer-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toHaveAttribute('data-transfer-request-id', requestId!);
    await expectTransferMetadata(receipt, manifest, 'flow');
    expect(errors).toEqual([]);
  });

  test('clean public quick is session-only UI with zero storage or history writes', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await resetAndOpenPublic(page, 'quickLocalResult=on');
    const capability = page.getByTestId('public-flow-capability-result');
    const manifest = await readTransferManifest(capability);
    expect(manifest.destination).toBe('checklist');
    expect(manifest.outputCount).toBe('24');

    const storageBefore = await rawStorageSnapshot(page);
    const historyBefore = await historySnapshot(page);
    await installStorageMutationLog(page);
    await installClipboardCapture(page);

    const quickEntry = page.getByTestId('public-flow-quick-result-entry');
    await expect(quickEntry).toHaveAttribute('data-action-role', 'create-quick-local-result');
    await quickEntry.click();
    const confirmation = page.getByTestId('public-flow-quick-result-confirmation');
    await expect(confirmation).toBeVisible();
    await expectTransferMetadata(confirmation, manifest, 'flow');
    await confirmation.getByTestId('public-flow-quick-result-execute').click();

    const feedback = page.getByTestId('public-flow-quick-result-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute('data-outcome', 'success');
    await expectTransferMetadata(feedback, manifest, 'flow');
    expect((await clipboardState(page)).writes).toBe(1);
    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(await storageMutationLog(page)).toEqual([]);
    expect(await historySnapshot(page)).toEqual(historyBefore);

    await page.reload();
    await expect(page.getByTestId('public-flow-quick-result-feedback')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('exact Q1/Q2 rollback matrix preserves raw local/session bytes and legacy checksum with zero mutation calls', async ({ page }) => {
    test.info().annotations.push({
      type: 'scope',
      description: 'Q3-B copy is explicitly unclaimed until P1-02.',
    });
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(SOURCE_ROUTE);
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByTestId('public-flow-capability-result')).toBeVisible();
    await page.goto('/my');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();
    await page.evaluate(({ sourceFlowSlug }) => {
      window.localStorage.setItem(
        `flow:saved:${sourceFlowSlug}`,
        `{"slug":"${sourceFlowSlug}","savedAt":"2026-05-28T00:00:00.000Z","selectedArtifactMode":"calendar","anchor":"2026-06-26"}`,
      );
      window.localStorage.setItem(
        `flow:${sourceFlowSlug}:anchorDate`,
        '{"mode":"custom","anchor":"2026-06-26"}',
      );
      window.localStorage.setItem(
        `flow_builder_mvp_item_state_${sourceFlowSlug}`,
        '{"legacy-item":{"note":"keep exact legacy bytes","custom":"sentinel"}}',
      );
      window.localStorage.setItem('flow:p0-10:legacy-sentinel', '  byte-for-byte sentinel  ');
      window.sessionStorage.setItem('flow:p0-10:session-sentinel', '  session byte sentinel  ');
    }, { sourceFlowSlug: SOURCE_FLOW_SLUG });
    const before = await rawStorageSnapshot(page);
    const checksumBefore = rawStorageChecksum(before);
    await installNavigationStorageMutationLog(page);

    const rows = [
      {
        label: 'Q1 quick exact off',
        route: `${SOURCE_ROUTE}?quickLocalResult=off`,
        assertSurface: async () => {
          await expect(page.locator('main[data-p35-q1-quick-local="off"]')).toBeVisible();
          await expect(page.getByTestId('public-flow-quick-result-entry')).toHaveCount(0);
        },
      },
      {
        label: 'Q1 quick uppercase control',
        route: `${SOURCE_ROUTE}?quickLocalResult=OFF`,
        assertSurface: async () => {
          await expect(page.locator('main[data-p35-q1-quick-local="on"]')).toBeVisible();
          await expect(page.getByTestId('public-flow-capability-result')).toBeVisible();
        },
      },
      {
        label: 'Q1 saved transfer exact off',
        route: `/my?flow=${SOURCE_FLOW_SLUG}&savedTransfer=off`,
        assertSurface: async () => {
          await expect(page.locator('main[data-p35-q1-saved-transfer="off"]')).toBeVisible();
        },
      },
      {
        label: 'Q1 saved transfer uppercase control',
        route: `/my?flow=${SOURCE_FLOW_SLUG}&savedTransfer=OFF`,
        assertSurface: async () => {
          await expect(page.locator('main[data-p35-q1-saved-transfer="on"]')).toBeVisible();
        },
      },
      {
        label: 'Q2 library exact off',
        route: '/my?savedPlanLibrary=off',
        assertSurface: async () => {
          await expect(page.locator('main').first()).toHaveAttribute('data-saved-library-flag', 'off');
          await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveCount(0);
        },
      },
      {
        label: 'Q2 library uppercase control',
        route: '/my?savedPlanLibrary=OFF',
        assertSurface: async () => {
          await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
            'data-saved-library-flag',
            'on',
          );
        },
      },
    ] as const;

    for (const row of rows) {
      await test.step(row.label, async () => {
        await page.goto(row.route);
        await row.assertSurface();
        const after = await rawStorageSnapshot(page);
        expect(after, `${row.label} raw storage drift`).toEqual(before);
        expect(rawStorageChecksum(after), `${row.label} legacy checksum drift`).toBe(checksumBefore);
        expect(await storageMutationLog(page), `${row.label} mutation calls`).toEqual([]);
      });
    }
    expect(errors).toEqual([]);
  });

  const diagnosticRoutes = [
    {
      label: 'public',
      route: `${SOURCE_ROUTE}?quickLocalResult=on`,
      ready: (page: Page) => page.getByTestId('public-flow-capability-result'),
    },
    {
      label: 'my',
      route: '/my?demo=ux5',
      ready: (page: Page) => page.getByTestId('my-flow-saved-library-shell'),
    },
    {
      label: 'map',
      route: MAP_ROUTE,
      ready: (page: Page) => page.getByTestId('flow-map-public'),
    },
  ] as const;
  const diagnosticViewports = [
    { label: '390x844', viewport: MOBILE_VIEWPORT },
    { label: '1024x768', viewport: TABLET_VIEWPORT },
    { label: '1440x1000', viewport: WIDE_VIEWPORT },
  ] as const;

  for (const routeCase of diagnosticRoutes) {
    for (const viewportCase of diagnosticViewports) {
      test(`${routeCase.label} ${viewportCase.label} has clean overflow, focus, control-name, and runtime diagnostics`, async ({ page }) => {
        const errors = collectBrowserErrors(page);
        await page.setViewportSize(viewportCase.viewport);
        await page.goto(routeCase.route);
        await expect(routeCase.ready(page)).toBeVisible();
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        await page.keyboard.press('Tab');

        const diagnostics = await inspectRouteQuality(page);
        await test.info().attach(
          `${routeCase.label}-${viewportCase.label}-diagnostics.json`,
          {
            body: Buffer.from(JSON.stringify({
              route: routeCase.route,
              viewport: viewportCase.viewport,
              diagnostics,
              errors,
            }, null, 2)),
            contentType: 'application/json',
          },
        );
        expect(diagnostics).toEqual({
          horizontalOverflow: 0,
          unnamedInteractiveCount: 0,
          horizontallyClippedInteractiveCount: 0,
          outOfViewportFixedCount: 0,
          fixedMobileNavigationOverlapCount: 0,
          replacementCharacterCount: 0,
          focusedTag: expect.stringMatching(/^(a|button|input|select|textarea|summary)$/u),
          focusedName: expect.stringMatching(/\S/u),
          focusedWithinViewport: true,
        });
        expect(errors).toEqual([]);
      });
    }
  }
});
