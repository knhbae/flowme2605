import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

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

async function assertCanonicalReceipt(page: Page, expectedHandoff: RegExp) {
  await expect(page).toHaveURL(expectedHandoff);
  const panel = page.getByTestId('my-flow-post-save-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('저장된 전체 Flow');
  await expect(page.getByTestId('my-flow-empty-state')).toHaveCount(0);

  const counts = await panel.evaluate((element) => ({
    flow: Number(element.dataset.receiptFlowCount ?? '-1'),
    total: Number(element.dataset.receiptTotalCount ?? '-1'),
    dated: Number(element.dataset.receiptDatedCount ?? '-1'),
    undated: Number(element.dataset.receiptUndatedCount ?? '-1'),
    invalidDate: Number(element.dataset.receiptInvalidDateCount ?? '-1'),
    duplicateIdentity: Number(element.dataset.receiptDuplicateIdentityCount ?? '-1'),
  }));
  const renderedCount = await panel.getByTestId('my-flow-whole-flow-outline').evaluateAll((elements) =>
    elements.reduce((sum, element) => sum + Number((element as HTMLElement).dataset.effectiveRowCount ?? '0'), 0),
  );

  expect(counts.flow).toBeGreaterThan(0);
  expect(counts.total).toBeGreaterThan(0);
  expect(counts.total).toBe(renderedCount);
  expect(counts.dated + counts.undated).toBe(counts.total);
  expect(counts.invalidDate).toBe(0);
  expect(counts.duplicateIdentity).toBe(0);
  await expect(panel.getByTestId('my-flow-post-save-receipt-summary')).toContainText(`할 일 ${counts.total}개`);
  return counts;
}

async function assertReceiptSurvivesReload(page: Page, expectedHandoff: RegExp, before: Awaited<ReturnType<typeof assertCanonicalReceipt>>) {
  await page.reload();
  const after = await assertCanonicalReceipt(page, expectedHandoff);
  expect(after).toEqual(before);
}

test('public save lands on a reload-safe whole-Flow receipt on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const savedReceipt = await savePublicFlow(
    page,
    page.getByTestId('public-flow-save-primary-mobile'),
  );
  await expect(savedReceipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
  await expect(savedReceipt.getByTestId('public-flow-saved-receipt-status')).toContainText('10');
  await capture(page, '01-public-post-save-receipt-mobile.png');
  await page.reload();
  const reloadedReceipt = page.getByTestId('public-flow-saved-receipt');
  await expect(reloadedReceipt).toBeVisible();
  await openSavedPublicFlow(page, reloadedReceipt);
  await expect(page).toHaveURL('/my?view=flows&flow=vehicle-inspection-prep');
  const workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'plan');
  await expect(workspace.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '10');
});

test('canonical moving alias and URL-first hit keep their receipt contracts', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flow-maps/moving-d30');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page).toHaveURL('/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  const mapReceipt = await savePublicFlow(page, page.getByTestId('public-flow-save-primary'));
  await expect(mapReceipt.getByTestId('public-flow-saved-receipt-status')).toContainText('24');
  await capture(page, '02-flow-map-post-save-receipt-wide.png');
  await page.reload();
  const reloadedMapReceipt = page.getByTestId('public-flow-saved-receipt');
  await expect(reloadedMapReceipt).toBeVisible();
  await openSavedPublicFlow(page, reloadedMapReceipt);
  await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');
  const movingWorkspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
  await expect(movingWorkspace.getByTestId('my-flow-whole-flow-outline')).toHaveAttribute('data-effective-row-count', '24');

  await page.goto('/flows');
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('https://mathbang.net/13?utm_source=p26-receipt');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const result = page.getByTestId('flow-url-lookup-result');
  await result.getByTestId('flow-url-quick-start').locator('summary').click();
  await result.getByLabel('학습 시작일').fill('2030-09-01');
  await result.getByRole('button', { name: '시작하기' }).click();

  const urlFirstHandoff = /\/my\?savedMap=middle-school-math-1$/;
  const urlFirstReceipt = await assertCanonicalReceipt(page, urlFirstHandoff);
  expect(urlFirstReceipt.total).toBe(8);
  expect(urlFirstReceipt.undated).toBe(urlFirstReceipt.total);
  await capture(page, '03-url-first-hit-post-save-receipt-wide.png');
  await assertReceiptSurvivesReload(page, urlFirstHandoff, urlFirstReceipt);
});

test('memo draft receipt counts every accepted effective item and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('여권을 확인한다. 보험 서류를 챙긴다. 숙소 주소를 적는다.');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const editor = page.getByTestId('flow-memo-draft-editor');
  await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(3);
  await editor.getByLabel('메모 초안 제목').fill('여행 출발 준비');
  await editor.getByLabel('메모 초안 첫 할 일 날짜').fill('2030-10-03');
  await editor.getByTestId('flow-memo-draft-save').click();

  const handoff = /\/my\?savedFlow=url-draft-[^&]+$/;
  const receipt = await assertCanonicalReceipt(page, handoff);
  expect(receipt.total).toBe(3);
  expect(receipt.dated).toBe(1);
  expect(receipt.undated).toBe(2);
  await capture(page, '04-memo-draft-post-save-receipt-mobile.png');
  await assertReceiptSurvivesReload(page, handoff, receipt);
});
