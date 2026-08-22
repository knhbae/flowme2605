import { expect, test, type Page } from '@playwright/test';

async function expectTestIdBeforeFirstRow(page: Page, testId: string) {
  const ordered = await page.evaluate((targetTestId) => {
    const preamble = document.querySelector(`[data-testid="${targetTestId}"]`);
    const firstRow = document.querySelector('[data-testid="flow-capability-artifact-preview-row"]');
    if (!preamble || !firstRow) return false;
    return Boolean(preamble.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, testId);
  expect(ordered).toBe(true);
}

test.describe('Flow Map approved preview parity', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('save-all Map uses canonical Text grammar and places one date input before every Calendar row', async ({ page }) => {
    await page.goto('/flow-maps/postal-address-transfer');

    const result = page.getByTestId('public-flow-capability-result');
    await expect(result).toHaveAttribute('data-capability-selected-destination', 'memo');
    const syntax = result.getByTestId('flow-artifact-text-syntax-preview');
    await expect(syntax).toContainText('# 주거이전 우편물 전송 확인');
    await expect(syntax).toContainText('D+1');
    await expect(syntax).toContainText('why:');
    await expect(syntax).toContainText('how:');

    await result.getByRole('button', { name: 'Calendar', exact: true }).click();
    const preamble = result.getByTestId('flow-artifact-calendar-preamble');
    await expect(preamble.getByTestId('flow-map-anchor-input')).toBeVisible();
    await expect(page.getByTestId('flow-map-anchor-input')).toHaveCount(1);
    await expect(result.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(1);
    await expect(result.getByTestId('flow-capability-artifact-preview-expand')).toHaveCount(0);
    await expectTestIdBeforeFirstRow(page, 'flow-artifact-calendar-preamble');
  });

  test('choose-child Map shows Calendar context first and resets a child switch to Text', async ({ page }) => {
    await page.goto('/flow-maps/curated-opic-mock-course');

    const result = page.getByTestId('public-flow-capability-result');
    await expect(result).toHaveAttribute('data-capability-selected-destination', 'memo');
    await expect(result.getByTestId('flow-artifact-text-syntax-preview'))
      .toContainText('# 오픽 모의고사 2주 계획표');
    await expect(result.getByTestId('flow-artifact-text-syntax-preview'))
      .toContainText('## 2주 계획표');
    await expect(result.getByTestId('flow-artifact-text-syntax-preview'))
      .not.toContainText('오픽 모의고사 2주 계획표 · 2주 계획표');
    const selector = page.getByTestId('flow-map-choose-child');
    await expect(selector).toHaveCount(1);
    await expect(selector.getByTestId('flow-map-selected-child-copy'))
      .toContainText('오픽 모의고사 2주 계획표 선택됨');
    await expect(selector).not.toContainText('고르세요');
    await expectTestIdBeforeFirstRow(page, 'flow-map-choose-child');

    await result.getByRole('button', { name: 'Calendar', exact: true }).click();
    const context = result.getByTestId('flow-map-calendar-context');
    await expect(context).toContainText('시작일');
    await expect(context).toContainText('기준 일정입니다');
    await expect(result.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(14);
    await expect(result.getByTestId('flow-capability-artifact-preview-expand')).toHaveCount(0);
    await expectTestIdBeforeFirstRow(page, 'flow-artifact-calendar-preamble');
    await expectTestIdBeforeFirstRow(page, 'flow-map-choose-child');

    await result.getByRole('button', { name: 'Todo', exact: true }).click();
    await result.getByTestId('flow-capability-artifact-preview-todo-detail-link').first().click();
    await expect(page.getByTestId('public-flow-item-preview')).toBeVisible();

    const alternate = page.locator(
      '[data-testid="flow-map-child-choice"]:not(:has(input:checked)) input[type="radio"]',
    );
    const alternateSlug = await alternate.getAttribute('value');
    expect(alternateSlug).toBeTruthy();
    const alternateChoice = page.locator(
      `[data-testid="flow-map-child-choice"][data-flow-slug="${alternateSlug!}"] input[type="radio"]`,
    );
    await alternate.evaluate((input) => (input as HTMLInputElement).click());
    await expect(alternateChoice).toBeChecked();
    await expect(page.getByTestId('public-flow-item-preview')).toHaveCount(0);
    await expect(result).toHaveAttribute('data-capability-selected-destination', 'memo');
    await expect(result.getByTestId('flow-artifact-text-syntax-preview')).toBeVisible();
    await expect(result.getByTestId('flow-artifact-text-syntax-preview'))
      .toContainText('# 오픽 모의고사 1달 반복 계획');
    await expect(result.getByTestId('flow-artifact-text-syntax-preview'))
      .toContainText('## 1달 반복 계획');
    await expect(result.getByTestId('flow-artifact-text-syntax-preview'))
      .not.toContainText('오픽 모의고사 1달 반복 계획 · 1달 반복 계획');
    await expect(result.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(5);
    await expect(result.getByTestId('flow-capability-artifact-preview-row').first()).toHaveAttribute(
      'data-item-id',
      'curated-opic-course-row-import::opic-1m-w1',
    );
    await expect(selector.getByTestId('flow-map-selected-child-copy'))
      .toContainText('오픽 모의고사 1달 반복 계획 선택됨');
    await expectTestIdBeforeFirstRow(page, 'flow-map-choose-child');
  });
});
