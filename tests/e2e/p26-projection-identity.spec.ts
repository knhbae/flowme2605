import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  openMyFlowLibraryFlow,
  openPersonalDraftListExport,
} from './helpers/my-flow-library';

const evidenceDir = process.env.FLOWME_P26_05_EVIDENCE_DIR;

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

async function capture(page: Page, locator: Locator, filename: string) {
  await expectNoHorizontalOverflow(page);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.locator('nextjs-portal').evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  const chrome = page.locator('[data-testid="platform-nav"], [data-testid="platform-mobile-tabs"]');
  await chrome.evaluateAll((nodes) => nodes.forEach((node) => {
    (node as HTMLElement).style.visibility = 'hidden';
  }));
  await locator.screenshot({ path: path.join(screenshots, filename) });
  await chrome.evaluateAll((nodes) => nodes.forEach((node) => {
    (node as HTMLElement).style.visibility = '';
  }));
}

test('legacy personal draft values migrate to one stable identity across My Flow Calendar and export', async ({ page }) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill('여권을 확인한다. 숙소 주소를 적는다.');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const editor = page.getByTestId('flow-memo-draft-editor');
  await editor.getByLabel('메모 초안 제목').fill('여행 준비 identity 확인');
  await editor.getByTestId('flow-memo-draft-save').click();
  await expect(page).toHaveURL(/\/my\?savedFlow=url-draft-/);

  const legacy = await page.evaluate(() => {
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{
      flow?: { slug?: string; title?: string };
      items?: Array<{ id?: string; title?: string }>;
    }>;
    const bundle = bundles.find((entry) => entry.flow?.title === '여행 준비 identity 확인');
    const flowSlug = bundle?.flow?.slug ?? '';
    const itemId = bundle?.items?.[0]?.id ?? '';
    const legacyKey = `${flowSlug}::${itemId}::none`;
    const canonicalKey = `${flowSlug}::${itemId}::draft-overlay`;
    const drafts = JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}');
    const dates = JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}');
    delete drafts[canonicalKey];
    delete dates[canonicalKey];
    drafts[legacyKey] = {
      title: '여권 유효기간 다시 확인하기',
      memo: '만료일과 영문 이름을 확인',
    };
    dates[legacyKey] = '2030-08-03';
    localStorage.setItem('flow:my-flow:item-drafts', JSON.stringify(drafts));
    localStorage.setItem('flow:my-flow:date-overrides', JSON.stringify(dates));
    localStorage.removeItem(`flow:projection-identity-migration:${encodeURIComponent(flowSlug)}`);
    return { flowSlug, itemId, legacyKey, canonicalKey };
  });
  expect(legacy.flowSlug).toMatch(/^url-draft-/);
  expect(legacy.itemId).not.toBe('');

  await page.reload();
  const migrated = await page.evaluate(({ flowSlug, legacyKey, canonicalKey }) => {
    const drafts = JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}');
    const dates = JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}');
    const manifest = JSON.parse(
      localStorage.getItem(`flow:projection-identity-migration:${encodeURIComponent(flowSlug)}`) || 'null',
    );
    return {
      canonicalDraft: drafts[canonicalKey],
      canonicalDate: dates[canonicalKey],
      legacyDraftActive: drafts[legacyKey],
      legacyDateActive: dates[legacyKey],
      manifestSchemaVersion: manifest?.schemaVersion,
      manifestLegacyDraft: manifest?.legacyItemDraftValues?.[legacyKey],
      manifestLegacyDate: manifest?.legacyDateOverrideValues?.[legacyKey],
    };
  }, legacy);
  expect(migrated).toEqual({
    canonicalDraft: {
      title: '여권 유효기간 다시 확인하기',
      memo: '만료일과 영문 이름을 확인',
    },
    canonicalDate: '2030-08-03',
    legacyDraftActive: undefined,
    legacyDateActive: undefined,
    manifestSchemaVersion: 1,
    manifestLegacyDraft: {
      title: '여권 유효기간 다시 확인하기',
      memo: '만료일과 영문 이름을 확인',
    },
    manifestLegacyDate: '2030-08-03',
  });

  await page.getByTestId('my-flow-post-save-view-flow').click();
  let flowShell = await openMyFlowLibraryFlow(page, legacy.flowSlug, 'plan');
  const item = flowShell
    .locator(`[data-item-id="${legacy.itemId}"]:visible`)
    .filter({ hasText: '여권 유효기간 다시 확인하기' })
    .first();
  await expect(item).toHaveAttribute('data-item-id', legacy.itemId);
  await expect(item).toContainText('8월 3일');
  const complete = item.getByRole('checkbox', { name: '여권 유효기간 다시 확인하기 완료 체크' });
  await complete.click();
  const reopen = item.getByRole('checkbox', { name: '여권 유효기간 다시 확인하기 다시 열기' });
  await expect(reopen).toBeChecked();
  await reopen.click();
  await expect(complete).not.toBeChecked();
  await capture(page, flowShell, '01-migrated-personal-draft-mobile.png');

  flowShell = await openMyFlowLibraryFlow(page, legacy.flowSlug, 'record');
  const exportSurface = await openPersonalDraftListExport(flowShell);
  const memoAction = exportSurface.getByTestId('personal-draft-copy-memo');
  if (!(await memoAction.isVisible().catch(() => false))) {
    await exportSurface
      .getByTestId('my-flow-export-more-formats')
      .locator(':scope > summary')
      .click();
  }
  await memoAction.click();
  const memo = await page.evaluate(() => navigator.clipboard.readText());
  expect(memo).toContain('여권 유효기간 다시 확인하기');
  expect(memo).toContain('만료일과 영문 이름을 확인');
  expect(memo).toContain('2030-08-03');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2030-08');
  await page
    .locator('.fc-daygrid-day[data-date="2030-08-03"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  const calendarItem = selectedDay
    .locator(`[data-testid="my-flow-execution-row-shell"][data-item-id="${legacy.itemId}"]`)
    .filter({ hasText: '여권 유효기간 다시 확인하기' });
  await expect(calendarItem).toBeVisible();
  await capture(page, page.locator('main'), '02-migrated-calendar-wide.png');

  expect(browserErrors).toEqual([]);
});
