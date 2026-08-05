import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const RECEIPT_STORAGE_KEY = 'flow:export-receipts:v1';
const RECEIPT_REGISTRY_RAW = JSON.stringify({
  schemaVersion: 1,
  receipts: [{
    schemaVersion: 1,
    kind: 'persistent_receipt',
    receiptId: 'p0-09-backup-receipt',
    requestId: 'p0-09-backup-receipt',
    route: 'saved_transfer',
    savedPlanId: 'moving-d30-basic',
    outcome: 'success',
    createdAt: '2026-07-11T09:00:00.000Z',
    completedAt: '2026-07-11T09:00:01.000Z',
    snapshot: {
      kind: 'effective_execution',
      version: 'p0-09-backup-v1',
      hash: 'p0-09-backup-hash',
      identity: {
        flowId: 'moving-d30-basic',
        flowSlug: 'moving-d30-basic',
        sourceVersion: 'source-v1',
        personalVersion: 'personal-v1',
        executionVersion: 'execution-v1',
      },
    },
    scope: { kind: 'flow' },
    format: 'memo',
    artifactKind: 'portable_memo',
    itemIds: ['moving-item-1'],
    itemCount: 1,
    projectionOutputCount: 1,
    outputCount: 1,
    omitted: {
      heldItemIds: [],
      unavailableItemIds: [],
      excludedItemIds: [],
      reasonsByItemId: {},
    },
    oneWay: true,
    duplicateRisk: true,
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain;charset=utf-8',
      payloadHash: 'p0-09-payload-hash',
      payloadByteLength: 10,
      outputCount: 1,
    },
  }],
});

async function openDataManager(page: Page) {
  const auxiliaryMenu = page.getByTestId('my-flow-auxiliary-menu');
  await expect(auxiliaryMenu).toBeVisible();
  if ((await auxiliaryMenu.getAttribute('open')) === null) {
    await auxiliaryMenu.locator(':scope > summary').click();
  }
  await page.getByTestId('my-flow-data-manager-open').click();
}

test('My Flow downloads a versioned backup without internal browser state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ receiptStorageKey, receiptRegistryRaw }) => {
    window.localStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-07-11T09:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-08-15',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({ mode: 'custom', anchor: '2026-08-15' }));
    window.localStorage.setItem('flow_builder_mvp_checks_moving-d30-basic', JSON.stringify({ 'moving-estimate': true }));
    window.localStorage.setItem('flow:auth:demo-user', 'true');
    window.localStorage.setItem('flow:map:update:dismissed', JSON.stringify({ moving: true }));
    window.localStorage.setItem(receiptStorageKey, receiptRegistryRaw);
  }, {
    receiptStorageKey: RECEIPT_STORAGE_KEY,
    receiptRegistryRaw: RECEIPT_REGISTRY_RAW,
  });

  await page.goto('/my');
  await openDataManager(page);
  const dialog = page.getByTestId('my-flow-data-manager-dialog');
  await expect(dialog).toContainText('현재 브라우저에만 보관됩니다');
  await expect(dialog).toContainText('자동으로 맞춰지지는 않습니다');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('my-flow-backup-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^flowme-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const backup = JSON.parse(await readFile(downloadPath!, 'utf8')) as {
    format: string;
    schemaVersion: number;
    entries: Record<string, string>;
    summary: { savedFlowRecordCount: number };
  };

  expect(backup.format).toBe('flowme-local-backup');
  expect(backup.schemaVersion).toBe(1);
  expect(backup.summary.savedFlowRecordCount).toBe(1);
  expect(backup.entries['flow:saved:moving-d30-basic']).toBeTruthy();
  expect(backup.entries['flow:moving-d30-basic:anchorDate']).toBeTruthy();
  expect(backup.entries[RECEIPT_STORAGE_KEY]).toBe(RECEIPT_REGISTRY_RAW);
  expect(backup.entries['flow:auth:demo-user']).toBeUndefined();
  expect(backup.entries['flow:map:update:dismissed']).toBeUndefined();
});

test('an empty My Flow can restore a backup while preserving unrelated browser state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('flowme-backup-e2e-seeded') === 'true') return;
    window.localStorage.clear();
    window.localStorage.setItem('flow:auth:demo-user', 'true');
    window.sessionStorage.setItem('flowme-backup-e2e-seeded', 'true');
  });

  await page.goto('/my');
  await expect(page.getByTestId('my-flow-empty-state')).toBeVisible();
  await openDataManager(page);

  const backup = {
    format: 'flowme-local-backup',
    schemaVersion: 1,
    exportedAt: '2026-07-11T09:00:00.000Z',
    entries: {
      'flow:saved:moving-d30-basic': JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-07-11T09:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-15',
      }),
      'flow:moving-d30-basic:anchorDate': JSON.stringify({ mode: 'custom', anchor: '2026-08-15' }),
      'flow_builder_mvp_checks_moving-d30-basic': JSON.stringify({ 'moving-estimate': true }),
      [RECEIPT_STORAGE_KEY]: RECEIPT_REGISTRY_RAW,
    },
  };
  await page.getByTestId('my-flow-backup-file-input').setInputFiles({
    name: 'flowme-backup-2026-07-11.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup), 'utf8'),
  });

  const preview = page.getByTestId('my-flow-backup-import-preview');
  await expect(preview).toContainText('저장 기록');
  await expect(preview).toContainText('1개');
  await expect(preview).toContainText('현재 브라우저의 FlowMe 기록을 이 백업 시점으로 바꿉니다');

  await page.getByTestId('my-flow-backup-restore').click();
  await expect(page.getByTestId('my-flow-data-manager-feedback')).toContainText('백업 기록을 불러왔습니다');
  await expect(page.getByTestId('my-flow-empty-state')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('flow:auth:demo-user'))).toBe('true');
  expect(await page.evaluate(() => window.localStorage.getItem('flow:saved:moving-d30-basic'))).toBeTruthy();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), RECEIPT_STORAGE_KEY))
    .toBe(RECEIPT_REGISTRY_RAW);
});

test('My Flow data management remains reachable without overflow on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/my');
  await openDataManager(page);
  await expect(page.getByTestId('my-flow-data-manager-dialog')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});
