import fs from 'node:fs';
import { expect, test, type Locator } from '@playwright/test';

async function enterMyFlowDetailEditMode(detail: Locator) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  await expect(readSummary).toBeVisible();
  if ((await readSummary.getAttribute('open')) === null) {
    await readSummary.locator('summary').click();
  }
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

async function openMyFlowDetailTools(detail: Locator) {
  const tools = detail.getByTestId('my-flow-detail-portable-export');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) {
    await tools.locator('summary').click();
  }
  return tools;
}

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

  test('a personal date override is identical in Today, the full list, Calendar, and ICS', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-07-14T10:00:00+09:00') });
    await page.goto('/flows');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('flow:saved:travel-packing-list', JSON.stringify({
        slug: 'travel-packing-list',
        savedAt: '2026-07-14T01:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }));
    });
    await page.goto('/my');
    await page.getByTestId('my-flow-view-flow').click();

    let flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]');
    if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
      await flow.getByTestId('my-flow-mobile-structure-open').click();
    }
    const firstStep = flow.getByTestId('my-flow-mobile-structure-step-row').first();
    await firstStep.click();
    let detail = flow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('my-flow-detail-date-input').fill('2026-07-24');
    await detail.getByTestId('my-flow-detail-save-changes').click();

    await page.getByTestId('my-flow-view-today').click();
    const nowSection = page.getByTestId('my-flow-now-section');
    await expect(nowSection).toContainText('7월 24일');
    const evidenceDir = process.env.FLOWME_P24_F2A_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });
      fs.mkdirSync(`${evidenceDir}/downloads`, { recursive: true });
      await page.screenshot({
        path: `${evidenceDir}/screenshots/00-effective-date-today-mobile.png`,
        fullPage: true,
      });
    }

    await page.getByTestId('my-flow-view-flow').click();
    flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="travel-packing-list"]');
    if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
      await flow.getByTestId('my-flow-mobile-structure-open').click();
    }
    const movedStep = flow.getByTestId('my-flow-mobile-structure-step-row').first();
    await expect(movedStep).toContainText('7월 24일');
    await movedStep.click();
    detail = flow
      .getByTestId('my-flow-mobile-structure-inline-detail')
      .getByTestId('my-flow-item-detail');
    const tools = await openMyFlowDetailTools(detail);
    const downloadPromise = page.waitForEvent('download');
    await tools.getByTestId('my-flow-detail-download-ics').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const ics = fs.readFileSync(downloadPath!, 'utf8');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260724');
    if (evidenceDir) {
      fs.writeFileSync(`${evidenceDir}/downloads/effective-date-parity.ics`, ics, 'utf8');
    }

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-24"] .fc-event')).toHaveCount(1);
    await expect(page.locator('.fc-daygrid-day[data-date="2026-07-23"] .fc-event')).toHaveCount(0);
    if (evidenceDir) {
      await page.screenshot({
        path: `${evidenceDir}/screenshots/01-effective-date-calendar-mobile.png`,
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });
});
