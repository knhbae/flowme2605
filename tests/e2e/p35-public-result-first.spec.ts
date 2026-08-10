import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_02_EVIDENCE_DIR;

type Scenario = {
  route: string;
  viewport: { width: number; height: number };
  shape: 'calendar' | 'checklist' | 'sheet' | 'memo';
  resultLabel: string;
  itemCount: number;
  summaryPattern: RegExp;
  setupVisible: boolean;
  screenshot: string;
};

const scenarios: Scenario[] = [
  {
    route: '/f/moving-d30-basic',
    viewport: { width: 390, height: 844 },
    shape: 'checklist',
    resultLabel: '체크리스트',
    itemCount: 24,
    summaryPattern: /^날짜 없음$/u,
    setupVisible: true,
    screenshot: 'p35-02-moving-save-before-390.png',
  },
  {
    route: '/f/vehicle-inspection-prep',
    viewport: { width: 390, height: 844 },
    shape: 'checklist',
    resultLabel: '체크리스트',
    itemCount: 10,
    summaryPattern: /^날짜 없음$/u,
    setupVisible: false,
    screenshot: 'p35-02-undated-save-before-390.png',
  },
  {
    route: '/f/curated-allblanc-morning-workout',
    viewport: { width: 1024, height: 768 },
    shape: 'checklist',
    resultLabel: '체크리스트',
    itemCount: 1,
    summaryPattern: /^날짜 없음$/u,
    setupVisible: true,
    screenshot: 'p35-02-routine-save-before-1024.png',
  },
  {
    route: '/f/source-backed-middle-school-math-1',
    viewport: { width: 1440, height: 900 },
    shape: 'sheet',
    resultLabel: '실행표',
    itemCount: 8,
    summaryPattern: /^날짜 없음$/u,
    setupVisible: false,
    screenshot: 'p35-02-learning-save-before-1440.png',
  },
];

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
}

async function visibleCount(locator: Locator): Promise<number> {
  return locator.evaluateAll((elements) => elements.filter((element) => {
    const node = element as HTMLElement;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).length);
}

async function getFixedOverlapCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const fixedLayer = document.querySelector<HTMLElement>('[data-testid="public-flow-mobile-save-cta"]');
    if (!fixedLayer || getComputedStyle(fixedLayer).display === 'none') return 0;
    const fixedRect = fixedLayer.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, summary')]
      .filter((element) => !fixedLayer.contains(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          rect.width === 0 ||
          rect.height === 0
        ) return false;
        if (style.position !== 'fixed' && style.position !== 'sticky') return false;
        return (
          rect.left < fixedRect.right &&
          rect.right > fixedRect.left &&
          rect.top < fixedRect.bottom &&
          rect.bottom > fixedRect.top
        );
      })
      .length;
  });
}

async function expectResultFirstFrame(page: Page, scenario: Scenario) {
  const hero = page.getByTestId('public-flow-hero');
  const preview = page.getByTestId('public-flow-capability-result');
  const selectedPreview = preview.getByTestId('flow-capability-selected-preview');
  const artifactPreview = selectedPreview.getByTestId('flow-capability-artifact-preview');
  const setup = page.getByTestId('public-flow-primary-setup');

  await expect(hero).toHaveAttribute('data-p35-marker', 'P35-PUBLIC-RESULT-FIRST');
  await expect(hero).toHaveAttribute('data-experience-architecture', 'p35-result-first');
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveAttribute('data-capability-lifecycle', 'public_preview');
  await expect(preview).toHaveAttribute('data-capability-primary-destination', scenario.shape);
  await expect(preview).toHaveAttribute('data-capability-selected-destination', scenario.shape);
  await expect(artifactPreview).toHaveAttribute('data-primary-shape', scenario.shape);
  await expect(artifactPreview).toHaveAttribute('data-selected-shape', scenario.shape);
  await expect(artifactPreview.getByRole('heading', { level: 2 })).toHaveText(
    `${scenario.resultLabel} · ${scenario.itemCount}개`,
  );
  await expect(artifactPreview.getByTestId('flow-artifact-result-summary')).toHaveText(scenario.summaryPattern);
  await expect(preview.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(scenario.itemCount);
  await expect(preview.getByTestId('flow-capability-result-choice')).toHaveCount(3);
  await expect(preview.locator('[data-capability-candidate-role="primary"]')).toHaveCount(1);
  await expect(preview.locator('[data-capability-candidate-role="available"][data-capability-immediate="true"]')).toHaveCount(2);
  await expect(hero.locator('[data-flow-ui="schedule-intent"]')).toHaveCount(0);
  await expect(page.getByTestId('flow-save-before-primary-result')).toContainText(scenario.resultLabel);
  await expect(page.getByRole('heading', { name: '전체 흐름', exact: true })).toHaveCount(0);
  await expect(page.getByText('한눈에 보는 전체 루트', { exact: true })).toHaveCount(0);

  if (scenario.itemCount > 3) {
    await expect(preview.getByTestId('flow-capability-artifact-preview-expand')).toHaveAccessibleName(
      `나머지 ${scenario.itemCount - 3}개 보기`,
    );
    await expect(preview.locator('[data-testid="flow-capability-artifact-preview-row"]:visible')).toHaveCount(3);
  }

  if (scenario.setupVisible) {
    await expect(setup).toBeVisible();
    await expect(setup.getByTestId('public-flow-anchor-input')).toBeVisible();
    await expect(setup.getByTestId('public-flow-date-intent')).toHaveCount(0);
  } else {
    await expect(setup).toHaveCount(0);
  }

  const source = hero.locator('[data-flow-identity-slot="source"] a');
  await expect(source).toHaveCount(1);
  await expect(source).toHaveAttribute('target', '_blank');

  const resultSelectionSurfaces = hero.locator(
    '[role="group"][aria-label="결과 형태"], [role="tablist"][aria-label*="결과"]',
  );
  expect(await visibleCount(resultSelectionSurfaces)).toBeLessThanOrEqual(2);

  const visiblePrimaryActions = hero.locator('[data-action-priority="primary"]')
    .or(page.getByTestId('public-flow-save-primary-mobile'));
  expect(await visibleCount(visiblePrimaryActions)).toBe(1);
  const visiblePrimaryAction = scenario.viewport.width < 640
    ? page.getByTestId('public-flow-save-primary-mobile')
    : page.getByTestId('public-flow-save-primary');
  const primaryActionRect = await visiblePrimaryAction.boundingBox();
  expect(primaryActionRect).not.toBeNull();
  if (scenario.viewport.width < 1024) {
    expect(primaryActionRect!.y + primaryActionRect!.height).toBeLessThanOrEqual(
      scenario.viewport.height,
    );
  }

  const firstPreviewRect = await preview.boundingBox();
  const headingRect = await hero.locator('[data-flow-identity-slot="title"]').boundingBox();
  const sourceRect = await source.boundingBox();
  expect(headingRect).not.toBeNull();
  expect(sourceRect).not.toBeNull();
  expect(firstPreviewRect).not.toBeNull();
  expect(headingRect!.y).toBeLessThan(sourceRect!.y);
  expect(sourceRect!.y).toBeLessThan(firstPreviewRect!.y);
  if (scenario.setupVisible) {
    const setupRect = await setup.boundingBox();
    expect(await page.evaluate(() => {
      const previewNode = document.querySelector('[data-testid="public-flow-capability-result"]');
      const setupNode = document.querySelector('[data-testid="public-flow-primary-setup"]');
      return Boolean(
        previewNode &&
        setupNode &&
        (previewNode.compareDocumentPosition(setupNode) & Node.DOCUMENT_POSITION_FOLLOWING),
      );
    })).toBe(true);
    if (scenario.viewport.width < 1024) {
      expect(firstPreviewRect!.y).toBeLessThan(setupRect?.y ?? Number.POSITIVE_INFINITY);
    }
  }

  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  expect(await getFixedOverlapCount(page)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

test.describe('P35-02 public result-first frame', () => {
  for (const scenario of scenarios) {
    test(`${scenario.route} uses its natural primary result before setup`, async ({ page }) => {
      const errors = collectBrowserErrors(page);
      await page.setViewportSize(scenario.viewport);
      await page.addInitScript(() => window.localStorage.clear());
      await gotoLegacySavedPlanLibraryRoute(page, scenario.route);
      await expectResultFirstFrame(page, scenario);
      expect(errors).toEqual([]);
      await capture(page, scenario.screenshot);
    });
  }

  test('save-before controls hand off directly to the selected saved detail', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();

    await page.getByTestId('public-flow-anchor-input').fill('2030-09-01');
    const save = page.getByTestId('public-flow-save-primary-mobile');
    await expect(save).toHaveText('내 계획에 저장');
    await expect(save).toBeEnabled();
    await save.click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        view: url.searchParams.get('view'),
        flow: url.searchParams.get('flow'),
      };
    }).toEqual({
      pathname: '/my',
      view: 'flows',
      flow: expect.stringMatching(/^personal-copy:/u),
    });
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    await expect(page.getByTestId('my-flow-save-banner')).toHaveAttribute(
      'data-personal-copy-key',
      personalCopyKey,
    );
    await expect(page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]`,
    )).toBeVisible();
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-hero')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-capability-result')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-anchor-input')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-mobile-save-cta')).toHaveCount(0);
    expect(await getFixedOverlapCount(page)).toBe(0);
    expect(errors).toEqual([]);

    await capture(page, 'p35-02-moving-selected-detail-390.png');
  });

  test('review-held source content stays honest and cannot enter the save frame', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/flow-maps/curated-funmom-learning-park');

    await expect(page.getByTestId('flow-map-review-hold')).toBeVisible();
    await expect(page.getByTestId('public-flow-hero')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '원문 자료 둘러보기' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/AI가.*만들|자동 생성 중/u);
    expect(errors).toEqual([]);
  });
});
