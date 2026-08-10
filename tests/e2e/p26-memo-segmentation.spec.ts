import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  gotoLegacySavedPlanLibraryRoute,
  openMyFlowLibraryFlow,
  openPersonalDraftListExport,
} from './helpers/my-flow-library';

const evidenceDir = process.env.FLOWME_P26_04_EVIDENCE_DIR;

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function capture(page: Page, locator: Locator, filename: string) {
  await expectNoHorizontalOverflow(page);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  const chrome = page.locator('[data-testid="platform-nav"], [data-testid="platform-mobile-tabs"]');
  await chrome.evaluateAll((nodes) => nodes.forEach((node) => {
    (node as HTMLElement).dataset.evidenceVisibility = (node as HTMLElement).style.visibility;
    (node as HTMLElement).style.visibility = 'hidden';
  }));
  await locator.screenshot({ path: path.join(screenshots, filename) });
  await chrome.evaluateAll((nodes) => nodes.forEach((node) => {
    const element = node as HTMLElement;
    element.style.visibility = element.dataset.evidenceVisibility ?? '';
    delete element.dataset.evidenceVisibility;
  }));
}

async function completeSavedClipboardTransfer(
  page: Page,
  panel: Locator,
  action: Locator,
): Promise<string> {
  await action.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toHaveAttribute('data-transfer-route', 'saved_transfer');
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const receipt = panel.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toHaveAttribute('data-transfer-state', 'succeeded');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  await receipt.getByTestId('flow-transfer-success-close').click();
  return copied;
}

test('memo intake preserves source fragments through review, save, reload, and whole-Flow export', async ({ page }) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const memo = '8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인';
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(memo);
  await lookup.getByRole('button', { name: '계획 찾기' }).click();

  const editor = page.getByTestId('flow-memo-draft-editor');
  const rows = editor.getByTestId('flow-memo-draft-item');
  await expect(rows).toHaveCount(5);
  await expect(editor).toContainText('5/5개 선택');
  const sourceGroup = editor.getByTestId('draft-source-group');
  await expect(sourceGroup).toHaveCount(1);
  await expect(sourceGroup.getByTestId('draft-item-source-disclosure')).toBeHidden();
  await expect(sourceGroup).toContainText('항공권 확인, 숙소 예약번호 정리');
  const sourceFragmentIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-source-fragment-ids')),
  );
  expect(new Set(sourceFragmentIds).size).toBe(1);
  await capture(page, editor, '01-memo-five-actions-review-mobile.png');

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(sourceGroup.getByTestId('draft-item-source-fragment')).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await capture(page, editor, '02-memo-source-result-review-wide.png');

  await editor
    .getByTestId('flow-memo-draft-structure-disclosure')
    .locator(':scope > summary')
    .click();
  await expect(editor.getByTestId('draft-structure-edit-controls')).toHaveCount(0);
  await editor.getByTestId('draft-structure-edit-toggle').click();
  await expect(editor.getByTestId('draft-structure-edit-controls')).toHaveCount(5);
  const secondRow = rows.nth(1);
  await secondRow.getByRole('button', { name: /합치기$/ }).click();
  await expect(rows).toHaveCount(4);
  const mergedRow = rows.first();
  await mergedRow.getByRole('button', { name: /직접 나누기$/ }).click();
  const splitEditor = mergedRow.getByTestId('draft-item-split-editor');
  await splitEditor.getByRole('textbox', { name: /나눌 할 일$/ }).fill('항공권 확인\n숙소 예약번호 정리');
  await splitEditor.getByRole('button', { name: '나누어 적용' }).click();
  await expect(rows).toHaveCount(5);

  const lastRow = rows.last();
  const lastTitle = await lastRow.getByRole('textbox').inputValue();
  const moveUp = lastRow.getByRole('button', { name: `${lastTitle} 위로 이동` });
  await moveUp.focus();
  await page.keyboard.press('Enter');
  await expect(rows.nth(3).getByRole('textbox')).toHaveValue(lastTitle);

  await rows.first().getByRole('textbox').fill('항공권 최종 확인하기');
  await rows.nth(1).getByRole('checkbox', { name: /저장에 포함$/ }).uncheck();
  await expect(editor).toContainText('4/5개 선택');
  await editor.getByLabel('메모 초안 제목').fill('제주 출발 준비');

  const acceptedDraftIds = await rows.evaluateAll((elements) => elements
    .filter((element) => element.getAttribute('data-draft-included') === 'true')
    .map((element) => element.getAttribute('data-draft-item-id')));
  expect(new Set(acceptedDraftIds).size).toBe(4);

  await editor.getByTestId('flow-memo-draft-save').click();
  await expect(page).toHaveURL(/\/my\?savedFlow=url-draft-/);
  const receipt = page.getByTestId('my-flow-post-save-panel');
  await expect(receipt).toHaveAttribute('data-receipt-total-count', '4');
  await expect(receipt).toContainText('할 일 4개');

  const stored = await page.evaluate(() => {
    const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as Array<{
      flow?: { slug?: string; title?: string; raw_text?: string };
      items?: Array<{ id?: string; title?: string; order?: number }>;
      itemDetails?: Array<{ item_id?: string; source_fragment_ids?: string[]; source_fragment_text?: string }>;
    }>;
    return bundles.find((bundle) => bundle.flow?.slug?.startsWith('url-draft-') && bundle.flow?.title === '제주 출발 준비');
  });
  expect(stored?.items).toHaveLength(4);
  expect(stored?.items?.map((item) => item.title)).toEqual([
    '항공권 최종 확인하기',
    '렌터카 예약하기',
    '출발 전날 온라인 체크인하기',
    '준비물 체크하기',
  ]);
  expect(stored?.items?.map((item) => item.order)).toEqual([0, 1, 2, 3]);
  expect(new Set(stored?.items?.map((item) => item.id)).size).toBe(4);
  expect(stored?.itemDetails).toHaveLength(4);
  expect(stored?.itemDetails?.every((detail) => detail.source_fragment_ids?.length === 1)).toBe(true);
  expect(stored?.itemDetails?.every((detail) => detail.source_fragment_text?.includes('항공권 확인'))).toBe(true);
  expect(stored?.flow?.raw_text).not.toMatch(/범위 정하기|첫 행동|자동 생성/u);
  const savedSlug = stored?.flow?.slug;
  expect(savedSlug).toBeTruthy();

  await page.reload();
  await expect(page.getByTestId('my-flow-post-save-panel')).toHaveAttribute('data-receipt-total-count', '4');
  await page.getByTestId('my-flow-post-save-view-flow').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
  const savedFlow = await openMyFlowLibraryFlow(page, savedSlug!, 'record');
  await expect(savedFlow).toContainText('제주 출발 준비');
  const exportSurface = await openPersonalDraftListExport(savedFlow);
  const exportPanel = exportSurface.getByTestId('my-flow-export-panel');
  await expect(exportPanel).toHaveAttribute('data-export-included-count', '4');
  const memoExport = exportPanel.getByTestId('personal-draft-copy-memo');
  if (!(await memoExport.isVisible().catch(() => false))) {
    await exportPanel
      .getByTestId('my-flow-export-more-formats')
      .locator(':scope > summary')
      .click();
  }
  await expect(memoExport).toHaveAttribute('data-export-count', '4');
  const exportedMemo = await completeSavedClipboardTransfer(page, exportPanel, memoExport);
  const exportedIndexes = [
    exportedMemo.indexOf('항공권 최종 확인하기'),
    exportedMemo.indexOf('렌터카 예약하기'),
    exportedMemo.indexOf('출발 전날 온라인 체크인하기'),
    exportedMemo.indexOf('준비물 체크하기'),
  ];
  expect(exportedIndexes.every((index) => index >= 0)).toBe(true);
  expect(exportedIndexes).toEqual([...exportedIndexes].sort((left, right) => left - right));
  expect(exportedMemo).not.toMatch(/source_fragment|sourceTrace|Step|Item|Markdown/iu);

  await capture(page, exportPanel, '03-memo-saved-export-mobile.png');
  expect(browserErrors).toEqual([]);
});
