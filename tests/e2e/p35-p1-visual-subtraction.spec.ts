import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 1000 },
] as const;

const phase = process.env.FLOWME_P1_VISUAL_PHASE === 'before' ? 'before' : 'after';
const captureEnabled = Boolean(process.env.FLOWME_P1_VISUAL_PHASE);
const evidenceDirectory = path.resolve(
  process.cwd(),
  'docs/specs/2026-08-04-p35-round2-bounded-ux-correction/evidence/p1-01',
);

function routeForPhase(route: string): string {
  if (phase !== 'before') return route;
  return `${route}${route.includes('?') ? '&' : '?'}visualSubtraction=off`;
}

async function relativeDate(page: Page, dayOffset: number): Promise<string> {
  return page.evaluate((offset) => {
    const value = new Date();
    value.setDate(value.getDate() + offset);
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }, dayOffset);
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure !== 'net::ERR_ABORTED') {
      errors.push(`requestfailed: ${request.url()} (${failure})`);
    }
  });
  return errors;
}

async function capture(page: Page, name: string): Promise<void> {
  if (!captureEnabled) return;
  await page.screenshot({
    path: path.join(evidenceDirectory, `${phase}-${name}.png`),
    fullPage: false,
  });
}

async function expectSurfaceHealth(page: Page, surface: Locator): Promise<void> {
  await expect(surface).toBeVisible();
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  const unnamedInteractiveCount = await surface
    .locator('button,a[href],input,textarea,select')
    .evaluateAll((elements) => elements.filter((element) => {
      const input = element as HTMLInputElement;
      const name = [
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.textContent,
        input.value,
        input.placeholder,
      ].find((candidate) => candidate?.trim());
      return !name;
    }).length);
  expect(unnamedInteractiveCount).toBe(0);
}

async function collectDomEvidence(surface: Locator) {
  const ariaSnapshot = await surface.ariaSnapshot();
  return {
    headings: await surface.locator('h1,h2,h3,h4,h5,h6').count(),
    actions: await surface.locator('button,a[href],input,textarea,select').count(),
    cardSurfaces: await surface.locator(
      'article,section,aside,[data-flow-ui],[data-flow-anatomy],[data-testid$="-card"]',
    ).count(),
    ariaLines: ariaSnapshot.split('\n').length,
    ariaSnapshot,
  };
}

function logAriaSnapshot(
  surface: 'ITEM' | 'MAP' | 'DATE',
  viewport: string,
  ariaSnapshot: string,
) {
  if (!captureEnabled) return;
  console.log(`P1-01 ARIA ${surface} ${phase} ${viewport}\n${ariaSnapshot}`);
}

test.describe('P1-01 bounded visual subtraction', () => {
  test('Item detail removes the execution heading, uses neutral hierarchy, and keeps completion', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/my?demo=ux12'));
      const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
      const row = flow.locator('[data-testid="my-flow-execution-row-shell"]:visible').first();
      await expect(row).toBeVisible();
      await row.locator('button').first().click();
      const detail = getOpenMyFlowItemDetail(page);
      await expectSurfaceHealth(page, detail);
      await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);

      const executionHeading = detail.getByText('실행할 일', { exact: true });
      const editButton = detail.getByRole('button', { name: /수정$/ }).first();
      if (phase === 'before') {
        await expect(detail).toHaveAttribute('data-default-primary-action-count', '2');
        await expect(executionHeading).toHaveCount(viewport.width < 900 ? 1 : 0);
        if (await editButton.isVisible().catch(() => false)) {
          await expect(editButton).toHaveText('할 일 수정');
        }
      } else {
        await expect(detail).toHaveAttribute('data-default-primary-action-count', '1');
        await expect(executionHeading).toHaveCount(0);
        if (await editButton.isVisible().catch(() => false)) {
          await expect(editButton).toHaveText('수정');
          await expect(editButton).toHaveAttribute('data-action-priority', 'secondary');
        }
        await expect(detail).not.toHaveClass(/bg-\[var\(--flowme-action-soft\)\]/u);
      }

      const domEvidence = await collectDomEvidence(detail);
      const metrics = {
        viewport: viewport.name,
        headings: domEvidence.headings,
        actions: domEvidence.actions,
        cardSurfaces: domEvidence.cardSurfaces,
        executionHeading: await executionHeading.count(),
        ariaLines: domEvidence.ariaLines,
      };
      console.log(`P1-01 ITEM ${phase} ${JSON.stringify(metrics)}`);
      logAriaSnapshot('ITEM', viewport.name, domEvidence.ariaSnapshot);
      await capture(page, `item-${viewport.name}`);
    }
    expect(errors).toEqual([]);
  });

  test('Flow Map removes the three-cell summary and keeps selection count next to actions', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/flow-maps/middle-school-math-1'));
      const map = page.getByTestId('flow-map-public');
      await expectSurfaceHealth(page, map);
      const summaryGrid = map.locator('[data-flow-ui="schedule-intent"]');
      const selectionSummary = map.locator('[data-testid="flow-map-selection-summary"]:visible');
      if (phase === 'before') {
        await expect(summaryGrid).toHaveCount(1);
      } else {
        await expect(summaryGrid).toHaveCount(0);
        await expect(selectionSummary).toHaveText(/선택 \d+ \/ 전체 \d+/u);
      }
      const snapshot = map.getByTestId('flow-map-effective-snapshot');
      await expect(snapshot).toHaveAttribute('data-flow-map-item-count', /\d+/u);
      const domEvidence = await collectDomEvidence(map);
      const metrics = {
        viewport: viewport.name,
        headings: domEvidence.headings,
        actions: domEvidence.actions,
        cardSurfaces: domEvidence.cardSurfaces,
        summaryGrid: await summaryGrid.count(),
        selectionSummary: await selectionSummary.count(),
        ariaLines: domEvidence.ariaLines,
      };
      console.log(`P1-01 MAP ${phase} ${JSON.stringify(metrics)}`);
      logAriaSnapshot('MAP', viewport.name, domEvidence.ariaSnapshot);
      await capture(page, `map-${viewport.name}`);
    }
    expect(errors).toEqual([]);
  });

  test('custom start date removes success echo but preserves past and close warnings', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(routeForPhase('/f/moving-d30-basic'));
      const hero = page.getByTestId('public-flow-hero');
      const input = page.getByTestId('public-flow-anchor-input');
      await expectSurfaceHealth(page, hero);
      await input.fill(await relativeDate(page, 365));
      const successEcho = hero.locator('.border-emerald-200.bg-emerald-50');
      if (phase === 'before') {
        await expect(successEcho).toHaveCount(1);
      } else {
        await expect(successEcho).toHaveCount(0);
      }
      const domEvidence = await collectDomEvidence(hero);
      const metrics = {
        viewport: viewport.name,
        headings: domEvidence.headings,
        actions: domEvidence.actions,
        cardSurfaces: domEvidence.cardSurfaces,
        successEcho: await successEcho.count(),
        ariaLines: domEvidence.ariaLines,
      };
      console.log(`P1-01 DATE ${phase} ${JSON.stringify(metrics)}`);
      logAriaSnapshot('DATE', viewport.name, domEvidence.ariaSnapshot);
      await capture(page, `date-${viewport.name}`);
    }

    if (phase === 'after') {
      await page.setViewportSize(viewports[0]);
      await page.goto('/f/moving-d30-basic');
      const input = page.getByTestId('public-flow-anchor-input');
      await input.fill(await relativeDate(page, -365));
      await expect(page.getByText(/이미 지났어요/u)).toBeVisible();
      const closeDate = await relativeDate(page, 5);
      await input.fill(closeDate);
      await expect(page.getByText('가까운 일정부터 시작합니다.', { exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('mobile Flow Map keeps selection count when the required start date is empty', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[0]);
    // The released moving-d30 alias redirects to its canonical /f route, so
    // exercise the same setupInput branch on a directly accessible dated Map.
    await page.goto(routeForPhase('/flow-maps/curated-opic-mock-course'));
    await page.getByTestId('flow-map-anchor-input').fill('');
    const sticky = page.getByTestId('flow-map-mobile-sticky-save');
    await expect(sticky).toBeVisible();
    await expect(sticky.locator(
      '[data-testid="flow-map-selection-summary"], [data-testid="flow-map-mobile-selection-summary"]',
    )).toHaveText(/선택 \d+ \/ 전체 \d+/u);
    await expect(sticky).toContainText(/(?:이사일|시작일) 필요/u);
    expect(errors).toEqual([]);
  });

  test('visualSubtraction=off independently restores the three legacy presentations', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize(viewports[0]);

    await page.goto('/my?demo=ux12&visualSubtraction=off');
    const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
    const row = flow.locator('[data-testid="my-flow-execution-row-shell"]:visible').first();
    await row.locator('button').first().click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail.getByText('실행할 일', { exact: true })).toHaveCount(1);
    await expect(detail).toHaveClass(/bg-\[var\(--flowme-action-soft\)\]/u);
    await expect(detail).toHaveAttribute('data-default-primary-action-count', '2');
    await expect(detail.getByTestId('my-flow-quick-item-edit')).toHaveText('할 일 수정');

    await page.goto('/flow-maps/middle-school-math-1?visualSubtraction=off');
    const map = page.getByTestId('flow-map-public');
    await expect(map.locator('[data-flow-ui="schedule-intent"]')).toHaveCount(1);
    await expect(map.getByTestId('flow-map-selection-summary')).toHaveCount(0);

    await page.goto('/f/moving-d30-basic');
    await expect(page.getByTestId('public-flow-hero')).toBeVisible();
    const storageBeforeRollback = await page.evaluate(() => ({
      local: Object.entries(window.localStorage).sort(([left], [right]) => left.localeCompare(right)),
      session: Object.entries(window.sessionStorage).sort(([left], [right]) => left.localeCompare(right)),
    }));
    await page.goto('/f/moving-d30-basic?visualSubtraction=off');
    await page.getByTestId('public-flow-anchor-input').fill(await relativeDate(page, 365));
    await expect(page.getByTestId('public-flow-hero').locator('.border-emerald-200.bg-emerald-50')).toHaveCount(1);
    const storageAfterRollback = await page.evaluate(() => ({
      local: Object.entries(window.localStorage).sort(([left], [right]) => left.localeCompare(right)),
      session: Object.entries(window.sessionStorage).sort(([left], [right]) => left.localeCompare(right)),
    }));
    expect(storageAfterRollback).toEqual(storageBeforeRollback);
    expect(errors).toEqual([]);
  });
});
