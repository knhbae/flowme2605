import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R3_EVIDENCE_DIR;

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
  const result = await page.evaluate(() => ({
    horizontalOverflow: Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    ),
    receiptCount: document.querySelectorAll(
      '[data-testid="public-flow-saved-receipt"], [data-testid="my-flow-post-save-panel"]',
    ).length,
  }));
  expect(result.horizontalOverflow).toBe(0);
  expect(result.receiptCount).toBeLessThanOrEqual(1);
}

async function saveMovingFlow(page: Page, legacy = false) {
  await page.goto(`/f/moving-d30-basic${legacy ? '?saveLifecycle=off' : ''}`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
  const save = page.viewportSize()!.width < 640
    ? page.getByTestId('public-flow-save-primary-mobile')
    : page.getByTestId('public-flow-save-primary');
  await save.click();
}

test.describe('P35-R3 receipt to focused workspace continuity', () => {
  test('mobile save opens the selected personal copy directly with one transient banner', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page);

    await expect(page).toHaveURL(/\/my\?view=flows&flow=personal-copy%3A/u);
    const copySlug = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(copySlug).toMatch(/^personal-copy:/u);
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const banner = page.getByTestId('my-flow-save-banner');
    await expect(banner).toBeVisible();
    await expect(banner.getByTestId('my-flow-save-banner-summary')).toHaveText('저장됨 · 24개');
    await expect(banner.getByTestId('my-flow-save-undo')).toHaveText('방금 저장 취소');
    const workspace = await openMyFlowLibraryFlow(page, copySlug, 'execute');
    await expect(workspace).toContainText('이사');
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await expect(workspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);
    const firstEntry = workspace.getByTestId('my-flow-shape-aware-execution');
    const firstEntryRows = firstEntry.getByTestId('my-flow-execution-row-shell');
    expect(await firstEntryRows.count()).toBeGreaterThan(0);
    expect(await firstEntryRows.count()).toBeLessThanOrEqual(3);
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );
    await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);
    await capture(page, 'p35-r3-direct-focused-workspace-390.png');

    await page.reload();
    expect(new URL(page.url()).pathname).toBe('/my');
    expect(new URL(page.url()).searchParams.get('view')).toBe('flows');
    expect(new URL(page.url()).searchParams.get('flow')).toBe(copySlug);
    expect(new URL(page.url()).searchParams.has('saveReceipt')).toBe(false);
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const reloadedWorkspace = await openMyFlowLibraryFlow(page, copySlug, 'execute');
    await expect(reloadedWorkspace).toBeVisible();
    await expect(reloadedWorkspace.getByTestId('my-flow-workspace-plan')).toHaveAttribute(
      'data-plan-open',
      'false',
    );
    await expect(reloadedWorkspace.getByTestId('my-flow-workspace-plan-content')).toHaveCount(0);
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('wide save keeps the same direct selected-detail handoff', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await saveMovingFlow(page);

    await expect(page).toHaveURL(/\/my\?view=flows&flow=personal-copy%3A/u);
    const copySlug = new URL(page.url()).searchParams.get('flow') ?? '';
    await expect(page.getByTestId('my-flow-save-banner')).toBeVisible();
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const workspace = await openMyFlowLibraryFlow(page, copySlug, 'plan');
    await expect(workspace).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-commands')).toBeVisible();
    await capture(page, 'p35-r3-focused-workspace-1024.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('rollback flag preserves the legacy public receipt handoff', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await saveMovingFlow(page, true);
    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toHaveAttribute('data-p35-marker', 'P35-R3-SINGLE-SAVED-RECEIPT');
    await expect(receipt.getByTestId('public-flow-saved-receipt-primary')).toHaveAttribute(
      'href',
      '/my?view=flows&flow=moving-d30-basic',
    );
    const legacyBytes = await page.evaluate(() => Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort()
        .map((key) => [key, window.localStorage.getItem(key) ?? '']),
    ));
    const savedRaw = legacyBytes['flow:saved:moving-d30-basic'];
    expect(savedRaw).toBeTruthy();
    const savedRecord = JSON.parse(savedRaw) as Record<string, unknown>;
    expect(savedRaw).toBe(JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: savedRecord.savedAt,
      personalTitle: '이사 D-30 준비',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2030-09-01',
    }));
    expect(savedRecord).not.toHaveProperty('schemaVersion');
    expect(savedRecord).not.toHaveProperty('personalCopyKey');
    expect(legacyBytes['flow:moving-d30-basic:anchorDate']).toBe(
      '{"mode":"custom","anchor":"2030-09-01"}',
    );
    expect(legacyBytes['flow:meta:last-visit']).toBe(savedRecord.savedAt);
    expect(Object.keys(legacyBytes).some((key) => key.includes('personal-copy:'))).toBe(false);

    const canonicalRaw = legacyBytes['flow:canonical:origin:v1'];
    expect(canonicalRaw).toBeTruthy();
    const canonical = JSON.parse(canonicalRaw) as {
      schemaVersion?: number;
      entries?: Record<string, {
        canonicalFlowId?: string;
        canonicalSavedSlug?: string;
        legacyOriginSlugs?: string[];
        lastCanonicalWriteAt?: string;
      }>;
    };
    expect(canonical.schemaVersion).toBe(1);
    expect(Object.values(canonical.entries ?? {})).toEqual([
      expect.objectContaining({
        canonicalSavedSlug: 'moving-d30-basic',
        lastCanonicalWriteAt: savedRecord.savedAt,
      }),
    ]);
  });

  test('legacy savedFlow handoff is reduced to one primary action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2030-08-01T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2030-09-01',
      }));
    });
    await page.goto('/my?savedFlow=moving-d30-basic');

    const legacyReceipt = page.getByTestId('my-flow-post-save-panel');
    await expect(legacyReceipt).toBeVisible();
    await expect(legacyReceipt.locator('[data-p35-marker="P35-R3-LEGACY-HANDOFF-SINGLE-ACTION"]')).toHaveCount(1);
    await expect(legacyReceipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-calendar')).toHaveCount(0);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-export')).toHaveCount(0);
    await legacyReceipt.getByTestId('my-flow-post-save-view-flow').click();
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  });
});
