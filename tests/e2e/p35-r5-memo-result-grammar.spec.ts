import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R5_EVIDENCE_DIR;
const fiveActionMemo = [
  '이사 견적을 비교한다.',
  '관리사무소에 연락한다.',
  '주소 변경 대상을 확인한다.',
  '포장 용품을 준비한다.',
  '인터넷 이전을 예약한다.',
].join('\n');

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string, focus?: Locator) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
  });
}

async function expectPageQuality(page: Page) {
  const quality = await page.evaluate(() => {
    const unnamedFocusable = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary',
    )).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
        return false;
      }
      return !(
        element.getAttribute('aria-label')
        || element.getAttribute('aria-labelledby')
        || element.textContent?.trim()
        || element.getAttribute('title')
        || element.closest('label')?.textContent?.trim()
      );
    });
    return {
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - window.innerWidth,
      unnamedFocusable: unnamedFocusable.map((element) => element.outerHTML.slice(0, 240)),
    };
  });
  expect(quality.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(quality.unnamedFocusable).toEqual([]);
}

async function openMemoProposal(page: Page) {
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(fiveActionMemo);
  await lookup.getByRole('button', { name: '계획 찾기' }).click();
  return page.getByTestId('flow-memo-draft-editor');
}

test.describe('P35-R5 memo result grammar', () => {
  test('mobile shows five real result rows before two quick values and saves to the focused workspace', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const editor = await openMemoProposal(page);

    await expect(editor).toHaveAttribute('data-p35-marker', 'P35-R5-MEMO-PROPOSAL-390');
    const preview = editor.getByTestId('flow-memo-draft-artifact-preview');
    await expect(preview).toBeVisible();
    await expect(preview.getByTestId('flow-memo-draft-artifact-preview-row')).toHaveCount(5);
    await expect(editor.locator('input:visible')).toHaveCount(2);
    await expect(editor.getByTestId('flow-memo-draft-structure-disclosure')).not.toHaveAttribute('open', '');
    await expect(editor.getByTestId('flow-memo-draft-preflight')).toContainText('체크리스트 · 5개');
    await expect(
      preview.getByTestId('flow-artifact-shape-choice').filter({ hasText: '체크리스트 5개' }),
    ).toBeVisible();
    await expect(
      preview.getByTestId('flow-artifact-shape-choice').filter({ hasText: '메모 5개' }),
    ).toBeVisible();
    await capture(page, 'p35-r5-memo-proposal-390.png');

    await editor.getByLabel('메모 초안 제목').fill('우리 집 이사 준비');
    await editor.getByLabel('메모 초안 첫 할 일 날짜').fill('2030-08-30');
    await preview.getByTestId('public-flow-artifact-preview-row-edit').nth(1).click();
    const itemEditor = page.getByTestId('public-flow-item-editor');
    await expect(itemEditor).toBeVisible();
    await itemEditor.getByTestId('public-flow-item-editor-title-input').fill('관리사무소 이전 일정 확인');
    await itemEditor.getByTestId('public-flow-item-editor-detail-input').fill('엘리베이터 사용 시간을 함께 확인한다.');
    await itemEditor.getByTestId('public-flow-item-editor-date-input').fill('2030-08-31');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();

    await expect(preview).toContainText('관리사무소 이전 일정 확인');
    const calendarChoice = preview
      .getByTestId('flow-artifact-shape-choice')
      .filter({ hasText: '캘린더 일정 2개' });
    await expect(calendarChoice).toBeVisible();
    await calendarChoice.click();
    await expect(preview.getByTestId('flow-memo-draft-artifact-preview-row')).toHaveCount(2);

    await editor.getByTestId('flow-memo-draft-save').click();
    await page.waitForURL(/\/my\?savedFlow=/u);
    const savedSlug = await page.evaluate(() => {
      const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
      return bundles.find((bundle: { flow?: { source_title?: string; slug?: string } }) =>
        bundle.flow?.source_title === '내 메모' && bundle.flow?.slug?.startsWith('url-draft-'),
      )?.flow?.slug ?? '';
    });
    expect(savedSlug).not.toBe('');
    await page.getByTestId('my-flow-post-save-view-flow').click();
    const workspace = await openMyFlowLibraryFlow(page, savedSlug);
    await expect(workspace).toContainText('우리 집 이사 준비');
    await expect(workspace).toContainText('관리사무소 이전 일정 확인');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('wide keeps the same result-first grammar and opens one right-side item editor', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    const editor = await openMemoProposal(page);
    const preview = editor.getByTestId('flow-memo-draft-artifact-preview');

    await expect(preview.getByTestId('flow-memo-draft-artifact-preview-row')).toHaveCount(5);
    await expect(editor.locator('input:visible')).toHaveCount(2);
    await preview.getByTestId('public-flow-artifact-preview-row-edit').first().click();
    const itemEditor = page.getByTestId('public-flow-item-editor');
    await expect(itemEditor).toBeVisible();
    const box = await itemEditor.boundingBox();
    expect(box?.x ?? 0).toBeGreaterThan(500);
    await page.keyboard.press('Escape');
    await expect(itemEditor).toHaveCount(0);
    await expect(preview.getByTestId('public-flow-artifact-preview-row-edit').first()).toBeFocused();
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
