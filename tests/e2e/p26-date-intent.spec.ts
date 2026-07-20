import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const evidenceDir = process.env.FLOW_EVIDENCE_DIR;
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

async function capture(page: Page, filename: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

test('example date stays preview-only and saves an undated public Flow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');

  const intent = page.getByTestId('public-flow-date-intent');
  await expect(intent.getByTestId('public-flow-date-intent-custom')).toBeVisible();
  await expect(intent.getByTestId('public-flow-date-intent-undated')).toBeVisible();
  await expect(intent.getByTestId('public-flow-date-intent-example')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/예시 날짜로 미리보기/)).toBeVisible();

  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(exportEntry.getByRole('button', { name: /캘린더 파일 받기/ })).toHaveCount(0);

  const mobileSave = page.getByTestId('public-flow-mobile-save-cta');
  await expect(mobileSave.getByRole('button', { name: '날짜 없이 저장' })).toBeVisible();
  await capture(page, '01-example-preview-mobile.png');
  await mobileSave.getByRole('button', { name: '날짜 없이 저장' }).click();

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:vehicle-inspection-prep:anchorDate') || 'null'),
  }));
  expect(state.saved.dateIntent).toBe('undated');
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
  const savedLink = mobileSave.getByRole('link', { name: '내 Flow에서 보기' });
  await expect(savedLink).toBeVisible();
  await savedLink.click();
  await expect(page.getByTestId('my-flow-post-save-artifact')).toBeVisible();
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: /자동차검사 기간과 예약 가능일 확인하기 상세 열기/ })).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toContainText('날짜 정하기');
});

test('custom public date is the only path that persists an anchor and enables ICS', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/f/vehicle-inspection-prep');

  await page.getByTestId('public-flow-anchor-input').fill('2026-07-28');
  await expect(page.getByTestId('public-flow-date-intent-custom')).toHaveAttribute('aria-pressed', 'true');
  const desktopSave = page.getByTestId('public-flow-save-actions');
  await expect(desktopSave.getByRole('button', { name: '이 날짜로 저장' })).toBeVisible();

  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
  await expect(exportEntry.getByRole('button', { name: /캘린더 파일 받기/ })).toBeVisible();
  await capture(page, '02-custom-date-wide.png');
  await desktopSave.getByRole('button', { name: '이 날짜로 저장' }).click();

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:vehicle-inspection-prep:anchorDate') || 'null'),
  }));
  expect(state.saved.dateIntent).toBe('custom');
  expect(state.saved.anchor).toBe('2026-07-28');
  expect(state.anchor).toEqual({ mode: 'custom', anchor: '2026-07-28' });
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: /자동차검사 기간과 예약 가능일 확인하기 상세 열기/ })).toBeVisible();
});

test('explicit undated intent survives reload without promoting the example date', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');

  await page.getByTestId('public-flow-date-intent-undated').click();
  await expect(page.getByTestId('public-flow-date-intent-undated')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByTestId('public-flow-date-intent-undated')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 저장' })).toBeVisible();
  await capture(page, '03-explicit-undated-mobile.png');
});

test('legacy example save migrates to undated and preserves the old preview anchor', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'flow:vehicle-inspection-prep:anchorDate',
      JSON.stringify({ mode: 'example', anchor: '' }),
    );
    window.localStorage.setItem(
      'flow:saved:vehicle-inspection-prep',
      JSON.stringify({
        slug: 'vehicle-inspection-prep',
        savedAt: '2026-07-20T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-03',
      }),
    );
  });
  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByTestId('public-flow-date-intent-undated')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null')?.dateIntent,
  )).toBe('undated');

  const state = await page.evaluate(() => ({
    saved: JSON.parse(window.localStorage.getItem('flow:saved:vehicle-inspection-prep') || 'null'),
    anchor: JSON.parse(window.localStorage.getItem('flow:vehicle-inspection-prep:anchorDate') || 'null'),
  }));
  expect(state.saved).toMatchObject({
    dateIntent: 'undated',
    legacyExampleAnchor: '2026-08-03',
  });
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
});
