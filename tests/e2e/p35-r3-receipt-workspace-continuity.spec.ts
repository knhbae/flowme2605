import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

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

async function saveStudyFlow(page: Page, legacy = false) {
  await installLegacySavedPlanLibraryNavigation(page);
  await gotoLegacySavedPlanLibraryRoute(
    page,
    `/f/computer-skills-d30-study${legacy ? '?saveLifecycle=off' : ''}`,
  );
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
    await saveStudyFlow(page);

    await expect(page).toHaveURL(/\/my\?view=flows&flow=personal-copy%3A/u);
    const copySlug = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(copySlug).toMatch(/^personal-copy:/u);
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const banner = page.getByTestId('my-flow-save-banner');
    await expect(banner).toBeVisible();
    await expect(banner.getByTestId('my-flow-save-banner-summary')).toHaveText('저장됨 · 9개');
    await expect(banner.getByTestId('my-flow-save-undo')).toHaveText('방금 저장 취소');
    const workspace = await openMyFlowLibraryFlow(page, copySlug, 'execute');
    await expect(workspace).toContainText('컴퓨터활용능력 1급 D-30 학습');
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
      '전체 0/9 완료',
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
    await saveStudyFlow(page);

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
    await saveStudyFlow(page, true);
    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toHaveAttribute('data-p35-marker', 'P35-R3-SINGLE-SAVED-RECEIPT');
    await expect(receipt.getByTestId('public-flow-saved-receipt-primary')).toHaveAttribute(
      'href',
      '/my?view=flows&flow=computer-skills-d30-study',
    );
    const legacyBytes = await page.evaluate(() => Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
        .filter((key): key is string => Boolean(key))
        .sort()
        .map((key) => [key, window.localStorage.getItem(key) ?? '']),
    ));
    const savedRaw = legacyBytes['flow:saved:computer-skills-d30-study'];
    expect(savedRaw).toBeTruthy();
    const savedRecord = JSON.parse(savedRaw) as Record<string, unknown>;
    expect(savedRaw).toBe(JSON.stringify({
      slug: 'computer-skills-d30-study',
      savedAt: savedRecord.savedAt,
      personalTitle: '컴퓨터활용능력 1급 D-30 학습',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2030-09-01',
    }));
    expect(savedRecord).not.toHaveProperty('schemaVersion');
    expect(savedRecord).not.toHaveProperty('personalCopyKey');
    expect(legacyBytes['flow:computer-skills-d30-study:anchorDate']).toBe(
      '{"mode":"custom","anchor":"2030-09-01"}',
    );
    expect(legacyBytes['flow:meta:last-visit']).toBe(savedRecord.savedAt);
    expect(Object.keys(legacyBytes).some((key) => key.includes('personal-copy:'))).toBe(false);

    // This eligible source is not a registered canonical saved_slug.
    // Its legacy save must not invent AJD moving origin metadata.
    expect(legacyBytes['flow:canonical:origin:v1']).toBeUndefined();
  });

  test('legacy savedFlow handoff is reduced to one primary action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/flows');
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
    await gotoLegacySavedPlanLibraryRoute(page, '/my?savedFlow=moving-d30-basic');

    const legacyReceipt = page.getByTestId('my-flow-post-save-panel');
    await expect(legacyReceipt).toBeVisible();
    await expect(legacyReceipt.locator('[data-p35-marker="P35-R3-LEGACY-HANDOFF-SINGLE-ACTION"]')).toHaveCount(1);
    await expect(legacyReceipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-first')).toHaveCount(0);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-calendar')).toHaveCount(0);
    await expect(legacyReceipt.getByTestId('my-flow-post-save-open-export')).toHaveCount(0);
    await legacyReceipt.getByTestId('my-flow-post-save-view-flow').click();
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );
    expect(await page.evaluate(() => (
      window.localStorage.getItem('flow:canonical:origin:v1')
    ))).toBeNull();

    // Update the existing pre-review record through its real legacy writer.
    // No held public route is opened or saved, and no origin registry is seeded.
    await workspace.getByTestId('my-flow-direct-anchor-settings-open').click();
    const anchorSettings = workspace.getByTestId('my-flow-direct-anchor-settings');
    await expect(anchorSettings).toBeVisible();
    await expect(anchorSettings.getByTestId('my-flow-direct-anchor-input'))
      .toHaveValue('2030-09-01');
    await anchorSettings.getByTestId('my-flow-direct-anchor-input').fill('2030-09-02');
    await anchorSettings.getByRole('button', { name: '일정 다시 맞추기', exact: true }).click();
    await expect(anchorSettings).toHaveCount(0);

    const existingUpdate = await page.evaluate(() => ({
      savedRaw: window.localStorage.getItem('flow:saved:moving-d30-basic'),
      anchorRaw: window.localStorage.getItem('flow:moving-d30-basic:anchorDate'),
      canonicalRaw: window.localStorage.getItem('flow:canonical:origin:v1'),
      lastVisit: window.localStorage.getItem('flow:meta:last-visit'),
      personalCopies: Object.keys(window.localStorage)
        .filter((key) => key.includes('personal-copy:')),
    }));
    expect(existingUpdate.savedRaw).toBeTruthy();
    const savedRecord = JSON.parse(existingUpdate.savedRaw!) as Record<string, unknown>;
    expect(existingUpdate.savedRaw).toBe(JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: savedRecord.savedAt,
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2030-09-02',
    }));
    expect(savedRecord.savedAt).not.toBe('2030-08-01T00:00:00.000Z');
    expect(savedRecord).not.toHaveProperty('schemaVersion');
    expect(savedRecord).not.toHaveProperty('personalCopyKey');
    expect(existingUpdate.anchorRaw).toBe('{"mode":"custom","anchor":"2030-09-02"}');
    expect(existingUpdate.lastVisit).toBe(savedRecord.savedAt);
    expect(existingUpdate.personalCopies).toEqual([]);

    const canonicalRaw = existingUpdate.canonicalRaw;
    expect(canonicalRaw).toBeTruthy();
    const canonical = JSON.parse(canonicalRaw!) as {
      schemaVersion?: number;
      entries?: Record<string, {
        canonicalFlowId?: string;
        canonicalSavedSlug?: string;
        legacyOriginSlugs?: string[];
        lastCanonicalWriteAt?: string;
      }>;
    };
    const canonicalFlowId =
      'canonical:source:ajd:moving-checklist:23363|job:prepare-move-by-dday|variant:ajd-moving:comprehensive-calendar-v1';
    expect(canonical.schemaVersion).toBe(1);
    expect(canonical.entries).toEqual({
      [canonicalFlowId]: {
        canonicalFlowId,
        canonicalSavedSlug: 'moving-d30-basic',
        legacyOriginSlugs: ['source-backed-moving-d30', 'curated-ajd-moving-d30'],
        lastCanonicalWriteAt: savedRecord.savedAt,
      },
    });
  });
});
