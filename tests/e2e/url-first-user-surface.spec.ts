import { expect, type Locator, type Page, test } from '@playwright/test';
import { scanUserSurfaceGuardrails } from '../../lib/flow/user-surface-guardrails';

const urlFirstSourceSlugSignals = ['AJD', 'DeskLab', 'Mathbang'];

async function getLocatorLines(locator: Locator): Promise<string[]> {
  return (await locator.innerText())
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

async function expectCleanUrlFirstUserSurface(locator: Locator) {
  const result = scanUserSurfaceGuardrails({
    primaryLines: await getLocatorLines(locator),
    sourceSlugSignals: urlFirstSourceSlugSignals,
  });

  expect(result.internalCopyHits).toEqual([]);
  expect(result.sourceSlugHits).toEqual([]);
  expect(result.structuralDisplayHits).toEqual([]);
  expect(result.trailingFlowSuffixHits).toEqual([]);
  expect(result.rawIsoDateHits).toEqual([]);
}

async function openFlowFinding(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('flow-url-lookup-entry')).toBeVisible({ timeout: 15_000 });
}

async function lookupUrl(page: Page, url: string) {
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('원문 URL').fill(url);
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await expect(page.getByTestId('flow-url-lookup-result')).toBeVisible();
}

test('URL-first hit and custom-start states stay inside normal user-surface guardrails', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://mathbang.net/13?utm_source=share');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result).not.toContainText('Mathbang');
  await expectCleanUrlFirstUserSurface(result);

  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();
  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await expectCleanUrlFirstUserSurface(result);
});

test('URL-first miss and saved-candidate states hide production-only wording from user surface', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://example.com/source-to-convert?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('아직 Flow화되지 않은 URL입니다');
  await expectCleanUrlFirstUserSurface(result);

  await result.getByLabel('요청 제목').fill('새로 보고 싶은 준비 체크리스트');
  await result.getByLabel('요청 메모').fill('URL에서 따라 할 순서만 남겨두고 싶음');
  await result.getByRole('button', { name: '요청으로 저장' }).click();

  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await expect(candidateList).toBeVisible();
  const candidateCard = candidateList.locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' });
  await expect(candidateCard).toBeVisible();
  await expectCleanUrlFirstUserSurface(candidateCard);

  await candidateCard.getByRole('button', { name: '요청 내용 보기' }).click();
  await expect(candidateCard.getByTestId('flow-url-supply-production-handoff')).toBeVisible();
  await expectCleanUrlFirstUserSurface(candidateCard);
});
