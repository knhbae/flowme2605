import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  scanPrototypeRouteGuardrails,
  scanUserFacingOutputGuardrails,
  scanUserSurfaceGuardrails,
} from '../../lib/flow/user-surface-guardrails';

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

function expectCleanUserFacingOutput(text: string) {
  const result = scanUserFacingOutputGuardrails({
    text,
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
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
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

async function expectUrlFirstExportModesAvoidTechnicalFormatLabels(result: Locator) {
  const exportModeSelect = result.getByTestId('url-first-export-mode-select');
  await expect(exportModeSelect).toBeVisible();

  for (const mode of ['calendar', 'markdown', 'checklist']) {
    await exportModeSelect.selectOption(mode);
    await expect(result.getByTestId('url-first-memo-document-download')).toHaveText('메모 문서 받기');
    await expect(result).not.toContainText('Markdown');
    await expectCleanUrlFirstUserSurface(result);
  }
}

test('URL-first hit and custom-start states stay inside normal user-surface guardrails', async ({ page }) => {
  await openFlowFinding(page);
  await lookupUrl(page, 'https://mathbang.net/13?utm_source=share');

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result).not.toContainText('Mathbang');
  await expect(result).not.toContainText('Markdown');
  const startDateInput = result.getByTestId('url-first-start-date-input');
  await expect(startDateInput).toBeVisible();
  await expect(startDateInput).toHaveAttribute('type', 'date');
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);

  await result.getByRole('button', { name: '조금 고쳐 시작' }).click();
  const customPanel = result.getByTestId('flow-url-custom-start-panel');
  await expect(customPanel).toBeVisible();
  await expect(result).not.toContainText('Markdown');
  await expectCleanUrlFirstUserSurface(result);
  await expectUrlFirstExportModesAvoidTechnicalFormatLabels(result);
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

  await candidateCard.getByTestId('flow-url-supply-user-summary-copy').click();
  await expect(candidateCard).toContainText('요청 정리본 복사됨');
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toContain('# 요청 정리본');
  expect(copiedText).toContain('새로 보고 싶은 준비 체크리스트');
  expect(copiedText).toContain('URL에서 따라 할 순서만 남겨두고 싶음');
  expectCleanUserFacingOutput(copiedText);
});

test('URL-first lab stays prototype-gated and absent from user navigation', async ({ page }) => {
  const userRoutes = [
    '/',
    '/flows',
    '/my',
    '/calendar',
    '/f/vehicle-inspection-prep',
    '/flow-maps/moving-d30',
  ];
  const userRouteViewports = [
    { width: 390, height: 844 },
    { width: 768, height: 844 },
    { width: 1024, height: 768 },
  ];

  for (const viewport of userRouteViewports) {
    await page.setViewportSize(viewport);
    for (const route of userRoutes) {
      await page.goto(route);
      await expect(page.locator('a[href="/flow-lab/url-first-p0"], a[href^="/flow-lab/url-first-p0?"]')).toHaveCount(0);
      await expect(page.locator('a[href*="source-backed-manual-registration"]')).toHaveCount(0);
    }
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/flow-maps/moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  const studioLink = page.getByRole('link', { name: '스튜디오' });
  await expect(studioLink).toBeVisible();
  await expect(studioLink).toHaveAttribute('href', /^\/u\/[^?#]+$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-lab/url-first-p0');
  await expect(page.getByTestId('url-first-p0-lab')).toBeVisible();
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toContainText('내부 실험 콘솔');
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toContainText('정상 사용자 메뉴에 연결하지 않는');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);

  await page.goto('/restart/moving-d30');
  const restartBodyLines = await getLocatorLines(page.locator('body'));
  const restartExportEntryLabel = await page.getByTestId('moving-mobile-export-actions').getByRole('button').innerText();
  const restartGate = scanPrototypeRouteGuardrails({
    primaryLines: restartBodyLines,
    exportEntryLabels: [restartExportEntryLabel],
  });
  expect(restartGate.rawRouteSlugHits).toEqual([]);
  expect(restartGate.englishWeekdayHits).toEqual([]);
  expect(restartGate.englishUiVerbHits).toEqual([]);
  expect(restartGate.englishMonthTimeHits).toEqual([]);
  expect(restartGate.mixedExportLanguageHits).toEqual([]);
  expect(restartGate.duplicateExportEntryHits).toEqual([]);
  await expect(page.getByTestId('url-first-p0-lab-internal-console-context')).toHaveCount(0);
});
