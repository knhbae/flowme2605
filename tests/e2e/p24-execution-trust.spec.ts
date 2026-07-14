import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test.describe('P24 execution trust regressions', () => {
  test('KST morning uses the local calendar day for a new schedule default', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-07-14T07:05:00+09:00') });
    await page.goto('/flows');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill('https://example.com/p24-local-date');
    await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
    const result = page.getByTestId('flow-url-lookup-result');
    await result.getByLabel('Flow 이름').fill('아침 준비 초안');
    await result.getByLabel('원하는 결과').fill('오늘 할 일을 정리해서 시작하기');
    await result.getByRole('button', { name: '초안 준비하기' }).click();

    const candidate = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    await candidate.getByTestId('flow-url-miss-draft-open').click();
    await candidate.getByTestId('flow-url-miss-draft-flow-title').fill('아침 준비');
    await candidate.getByTestId('flow-url-miss-draft-save').click();

    await expect(page).toHaveURL(/\/my/);
    await page.getByTestId('my-flow-view-flow').click();
    const draftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]');
    await draftFlow.getByTestId('my-flow-mobile-structure-open').click();
    await draftFlow.getByTestId('personal-draft-add-entry').click();
    await draftFlow.getByTestId('personal-draft-add-title').fill('오늘 확인할 일');
    await draftFlow.getByTestId('personal-draft-add-title').press('Enter');

    const item = draftFlow.getByTestId('personal-draft-effective-item').filter({ hasText: '오늘 확인할 일' });
    await item.getByTestId('my-flow-mobile-structure-step-row').click();
    const detail = draftFlow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    const readSummary = detail.getByTestId('my-flow-detail-read-summary');
    await readSummary.locator('summary').click();
    await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
    await detail.getByTestId('personal-draft-date-mode-fixed').click();

    await expect(detail.getByTestId('my-flow-detail-date-input')).toHaveValue('2026-07-14');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
    expect(consoleErrors).toEqual([]);
    const evidenceDir = process.env.FLOWME_P24_F1_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      await detail.screenshot({ path: `${evidenceDir}/screenshots/00-kst-local-date-mobile.png` });
    }
  });
});
