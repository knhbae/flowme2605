import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import { openPublicDetailWorkspaceForDeepInspection } from './helpers/open-public-detail-workspace';

test.beforeEach(async ({ page }) => {
  await openPublicDetailWorkspaceForDeepInspection(page);
});

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

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function capture(page: Page, filename: string) {
  await expectNoHorizontalOverflow(page);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function assertDiscoveryCard(card: Locator) {
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading')).toBeVisible();
  await expect(card.getByRole('link', { name: /^원문 · / })).toBeVisible();
  const previewItemCount = await card.getByRole('list', { name: '대표 할 일' }).getByRole('listitem').count();
  expect(previewItemCount).toBeGreaterThanOrEqual(1);
  expect(previewItemCount).toBeLessThanOrEqual(2);
  await expect(card.getByTestId('flow-card-support-meta')).toContainText(/^할 일 \d+개 · /);
  await expect(card.getByTestId('flow-card-primary-action')).toHaveText('더보기');
  await expect(card.getByTestId('flow-card-source-link')).toHaveCount(1);
  await expect(card).not.toContainText(/명 검증|인기순|별점|이사일만 넣으면/u);
}

test('entry router removes the duplicate Home surface and opens the catalog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page).toHaveURL('/flows');
  await expect(page.getByRole('heading', { name: 'URL·메모로 Flow 찾기' })).toBeVisible();
  await expect(page.locator('[data-home-recommendation-card="true"]')).toHaveCount(0);
  await expect(page.getByTestId('home-usage-example')).toHaveCount(0);
  await expect(page.getByTestId('platform-mobile-tabs')).toHaveAttribute(
    'data-p35-marker',
    'P35-ENTRY-ROUTER-3TAB',
  );
  await capture(page, '01-entry-router-catalog-mobile.png');

  const catalogCards = page.getByTestId('flow-map-catalog-card');
  await expect(catalogCards).toHaveCount(8);
  await assertDiscoveryCard(catalogCards.first());
  const canonicalMovingCard = page
    .getByTestId('single-flow-catalog-card')
    .filter({ hasText: '이사 D-30 준비' });
  await expect(canonicalMovingCard).toHaveCount(1);
  await expect(canonicalMovingCard.getByTestId('flow-card-support-meta')).toContainText(
    '할 일 24개',
  );
  await expect(page.getByText('인기순', { exact: true })).toHaveCount(0);

  for (const href of [
    '/f/curated-wedding-naver-timeline',
    '/f/curated-wedding-gongysd-atoz',
    '/f/curated-allblanc-morning-workout',
    '/f/curated-allblanc-no-jump-cardio',
  ]) {
    await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
  }
  await expect(page.locator('a[href="/flow-maps/curated-wedding-checklist-family"]')).toHaveCount(0);
  await expect(page.locator('a[href="/flow-maps/curated-allblanc-workout-park"]')).toHaveCount(0);
  await capture(page, '02-catalog-independent-flow-entry-mobile.png');
});

test('public save-before shows the whole Flow before one start decision', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/f/vehicle-inspection-prep');

  const hero = page.getByTestId('public-flow-hero');
  const preview = hero.getByTestId('public-flow-artifact-preview');
  await expect(hero).toHaveAttribute('data-visual-structure', 'artifact-first');
  await expect(hero).toHaveAttribute('data-experience-architecture', 'p35-result-first');
  await expect(hero.getByText('원문', { exact: true })).toBeVisible();
  await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(10);
  await expect(preview).not.toHaveAttribute('open', '');
  await expect(hero.getByTestId('public-flow-primary-setup')).toHaveCount(0);

  const primaryResult = page.getByTestId('flow-save-before-primary-result');
  const decision = page.getByTestId('flow-save-before-decision');
  await expect(primaryResult).toBeVisible();
  expect(await primaryResult.evaluate((result, decisionNode) => (
    Boolean(result.compareDocumentPosition(decisionNode as Node) & Node.DOCUMENT_POSITION_FOLLOWING)
  ), await decision.elementHandle())).toBe(true);

  await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveText(
    '체크리스트 10개로 시작',
  );
  await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toHaveAccessibleName('Flow 조정');
  await expect(hero).not.toContainText(/이사일 1개를 기준으로|원문 체크리스트의 실행 단서/u);
  await capture(page, '03-public-save-before-mobile.png');
});

test('source-backed map and public Flow use the same artifact-first decision grammar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  await expect(page).toHaveURL('/f/moving-d30-basic');
  const canonicalHero = page.getByTestId('public-flow-hero');
  await expect(canonicalHero).toHaveAttribute('data-visual-structure', 'artifact-first');
  await expect(canonicalHero.getByText('원문', { exact: true })).toBeVisible();
  await page.getByTestId('public-flow-artifact-preview-expand').click();
  await expect(canonicalHero.getByTestId('public-flow-artifact-preview-row')).toHaveCount(24);
  await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveAccessibleName(
    '캘린더 24개로 시작',
  );
  await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toHaveAccessibleName('Flow 조정');
  await capture(page, '04-source-backed-save-before-mobile.png');

  await page.goto('/flow-maps/curated-wedding-checklist-family');
  const choices = page.getByTestId('flow-map-choose-child');
  await expect(choices.getByRole('link')).toHaveCount(2);
  await expect(choices.locator('a[href="/f/curated-wedding-naver-timeline"]')).toBeVisible();
  await expect(choices.locator('a[href="/f/curated-wedding-gongysd-atoz"]')).toBeVisible();
  await capture(page, '05-wedding-independent-choice-fallback-mobile.png');
});

test('wide save-before keeps the result and decision parallel without a duplicate outline', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/f/vehicle-inspection-prep');

  const preview = page.getByTestId('flow-save-before-primary-result');
  const decision = page.getByTestId('flow-save-before-decision');
  const previewBox = await preview.boundingBox();
  const decisionBox = await decision.boundingBox();
  expect(previewBox).not.toBeNull();
  expect(decisionBox).not.toBeNull();
  expect(Math.abs(previewBox!.y - decisionBox!.y)).toBeLessThan(48);
  await expect(preview.getByTestId('public-flow-artifact-preview')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '전체 흐름', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Flow artifact workbench' })).toHaveCount(0);
  await capture(page, '06-public-save-before-wide.png');
});
