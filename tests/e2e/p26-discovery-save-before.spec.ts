import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

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
  await expect(card.getByText('원문', { exact: true })).toBeVisible();
  const previewItemCount = await card.getByRole('list', { name: '대표 할 일' }).getByRole('listitem').count();
  expect(previewItemCount).toBeGreaterThanOrEqual(1);
  expect(previewItemCount).toBeLessThanOrEqual(3);
  await expect(card.getByTestId('flow-card-support-meta')).toContainText(/^할 일 \d+개$/);
  await expect(card.getByTestId('flow-card-primary-action')).toHaveText('Flow 열기');
  await expect(card).not.toContainText(/명 검증|인기순|별점|이사일만 넣으면/u);
}

test('home and catalog share one evidence-first Flow card pattern', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '무엇을 준비하고 있나요?' })).toBeVisible();
  await expect(page.getByText('링크나 메모를 넣거나, 준비된 Flow를 바로 열어보세요.')).toBeVisible();
  const homeCards = page.locator('[data-home-recommendation-card="true"]');
  await expect(homeCards).toHaveCount(2);
  await assertDiscoveryCard(homeCards.first());
  await assertDiscoveryCard(homeCards.nth(1));
  await capture(page, '01-home-unified-flow-card-mobile.png');

  await page.goto('/flows');
  const catalogCards = page.getByTestId('flow-map-catalog-card');
  await expect(catalogCards).toHaveCount(9);
  await assertDiscoveryCard(catalogCards.first());
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
  const setup = hero.getByTestId('public-flow-primary-setup');
  await expect(hero).toHaveAttribute('data-visual-structure', 'artifact-first');
  await expect(hero.getByText('원문', { exact: true })).toBeVisible();
  await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(5);
  await expect(preview).toContainText('외 5개');
  await expect(setup).toBeVisible();

  const previewBox = await preview.boundingBox();
  const setupBox = await setup.boundingBox();
  expect(previewBox).not.toBeNull();
  expect(setupBox).not.toBeNull();
  expect(setupBox!.y).toBeGreaterThan(previewBox!.y);

  const mobileAction = page.getByTestId('public-flow-mobile-save-cta');
  await expect(mobileAction.getByRole('button', { name: '날짜 없이 시작' })).toBeVisible();
  await expect(page.getByTestId('public-flow-adjust-entry-mobile')).toHaveAccessibleName('조정');
  await expect(hero).not.toContainText(/이사일 1개를 기준으로|원문 체크리스트의 실행 단서/u);
  await capture(page, '03-public-save-before-mobile.png');
});

test('source-backed map and public Flow use the same artifact-first decision grammar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flow-maps/moving-d30');

  const mapHero = page.getByTestId('flow-map-hero');
  await expect(mapHero).toHaveAttribute('data-visual-structure', 'artifact-first');
  await expect(mapHero.getByText('원문', { exact: true })).toBeVisible();
  await expect(mapHero.getByTestId('flow-map-artifact-preview-row')).toHaveCount(5);
  await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveAccessibleName('그대로 시작');
  await expect(page.getByTestId('flow-map-adjust-save-mobile')).toHaveAccessibleName('조정');
  await capture(page, '04-source-backed-save-before-mobile.png');

  await page.goto('/flow-maps/curated-wedding-checklist-family');
  const choices = page.getByTestId('flow-map-choose-child');
  await expect(choices.getByRole('link')).toHaveCount(2);
  await expect(choices.locator('a[href="/f/curated-wedding-naver-timeline"]')).toBeVisible();
  await expect(choices.locator('a[href="/f/curated-wedding-gongysd-atoz"]')).toBeVisible();
  await capture(page, '05-wedding-independent-choice-fallback-mobile.png');
});

test('wide save-before keeps artifact and setup parallel, then reveals detail below', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/f/vehicle-inspection-prep');

  const preview = page.getByTestId('public-flow-artifact-preview');
  const decision = page.getByTestId('flow-save-before-decision');
  const workbench = page.getByRole('region', { name: 'Flow artifact workbench' });
  const previewBox = await preview.boundingBox();
  const decisionBox = await decision.boundingBox();
  const workbenchBox = await workbench.boundingBox();
  expect(previewBox).not.toBeNull();
  expect(decisionBox).not.toBeNull();
  expect(workbenchBox).not.toBeNull();
  expect(Math.abs(previewBox!.y - decisionBox!.y)).toBeLessThan(48);
  expect(workbenchBox!.y).toBeGreaterThan(previewBox!.y + previewBox!.height);
  await capture(page, '06-public-save-before-wide.png');
});
