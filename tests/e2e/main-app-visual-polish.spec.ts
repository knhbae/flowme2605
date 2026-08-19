import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

type ViewportCase = Readonly<{
  label: '390' | '1024' | '1440';
  width: number;
  height: number;
}>;

type RouteCase = Readonly<{
  label: 'flows' | 'public moving plan' | 'my plans' | 'calendar';
  route: '/flows' | '/f/moving-d30-basic' | '/my' | '/calendar';
  readyTestId: string;
  selectedDestination?: '계획 찾기' | '내 계획' | '캘린더';
  forwardMinimumHeight: 44 | 48;
}>;

const VIEWPORTS: readonly ViewportCase[] = [
  { label: '390', width: 390, height: 844 },
  { label: '1024', width: 1024, height: 900 },
  { label: '1440', width: 1440, height: 1000 },
] as const;

const ROUTES: readonly RouteCase[] = [
  {
    label: 'flows',
    route: '/flows',
    readyTestId: 'flow-url-lookup-entry',
    selectedDestination: '계획 찾기',
    forwardMinimumHeight: 48,
  },
  {
    label: 'public moving plan',
    route: '/f/moving-d30-basic',
    readyTestId: 'flow-public-shell',
    forwardMinimumHeight: 48,
  },
  {
    label: 'my plans',
    route: '/my',
    readyTestId: 'my-flow-empty-state',
    selectedDestination: '내 계획',
    forwardMinimumHeight: 48,
  },
  {
    label: 'calendar',
    route: '/calendar',
    readyTestId: 'my-flow-empty-state',
    selectedDestination: '캘린더',
    forwardMinimumHeight: 48,
  },
] as const;

const EXPECTED_COLORS = {
  action: 'rgb(49, 94, 231)',
  focus: 'rgb(33, 69, 186)',
  ink: 'rgb(23, 24, 19)',
  warmBackground: 'rgb(245, 243, 236)',
} as const;

const evidenceRoot = process.env.FLOWME_VISUAL_POLISH_EVIDENCE_DIR;

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function getForwardAction(
  page: Page,
  route: RouteCase['route'],
): Promise<Locator> {
  if (route === '/flows') {
    return page
      .getByTestId('flow-url-lookup-entry')
      .getByRole('button', { name: '계획 찾기', exact: true });
  }
  if (route === '/f/moving-d30-basic') {
    return page.locator('[data-action-priority="primary"]:visible:not([disabled])').first();
  }
  if (route === '/my') return page.getByTestId('my-flow-empty-discovery');
  return page
    .getByTestId('my-flow-empty-state')
    .getByRole('link', { name: '콘텐츠 고르러 가기', exact: true });
}

async function getFocusTarget(
  page: Page,
  viewport: ViewportCase,
  route: RouteCase,
): Promise<Locator> {
  if (!route.selectedDestination) {
    return page
      .getByTestId('flow-public-shell')
      .getByRole('link', { name: /FLOW/u });
  }

  const navigation = page.getByTestId(
    viewport.width < 640 ? 'platform-mobile-tabs' : 'platform-primary-tabs',
  );
  await expect(navigation).toBeVisible();
  const current = navigation.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText(route.selectedDestination);
  await expect(current).toHaveCSS('background-color', EXPECTED_COLORS.ink);
  await expect(current).toHaveCSS('color', 'rgb(255, 255, 255)');

  const target = await current.boundingBox();
  expect(target, 'selected destination must have a measurable target').not.toBeNull();
  expect(target!.height).toBeGreaterThanOrEqual(viewport.width < 640 ? 47.5 : 43.5);
  return current;
}

async function expectSemanticVisualTokens(page: Page): Promise<void> {
  const tokens = await page.evaluate(() => {
    const root = window.getComputedStyle(document.documentElement);
    const body = window.getComputedStyle(document.body);
    return {
      action: root.getPropertyValue('--flowme-action').trim().toLowerCase(),
      background: root.getPropertyValue('--flowme-bg').trim().toLowerCase(),
      ink: root.getPropertyValue('--flowme-text').trim().toLowerCase(),
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
    };
  });

  expect(tokens).toEqual({
    action: '#315ee7',
    background: '#f5f3ec',
    ink: '#171813',
    bodyBackground: EXPECTED_COLORS.warmBackground,
    bodyColor: EXPECTED_COLORS.ink,
  });
}

async function expectVisibleFocus(page: Page, target: Locator): Promise<void> {
  await target.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(target).toBeFocused();

  const focus = await target.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      outlineColor: style.outlineColor,
      outlineOffset: Number.parseFloat(style.outlineOffset),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      withinViewport: rect.left >= -1
        && rect.right <= window.innerWidth + 1
        && rect.top >= -1
        && rect.bottom <= window.innerHeight + 1,
    };
  });

  expect(focus).toMatchObject({
    outlineColor: EXPECTED_COLORS.focus,
    outlineStyle: 'solid',
    withinViewport: true,
  });
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focus.outlineOffset).toBeGreaterThanOrEqual(2);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => Math.max(
    0,
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.body.clientWidth,
  ));
  expect(overflow).toBeLessThanOrEqual(1);
}

async function captureEvidence(
  page: Page,
  route: RouteCase,
  viewport: ViewportCase,
): Promise<void> {
  if (!evidenceRoot) return;
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const routeLabel = route.label.replaceAll(' ', '-');
  await page.screenshot({
    path: path.join(evidenceRoot, `${routeLabel}-${viewport.label}.png`),
    fullPage: false,
  });
}

test.use({
  storageState: { cookies: [], origins: [] },
  timezoneId: 'Asia/Seoul',
});

test.beforeEach(async ({ page }) => {
  // Each case runs in Playwright's isolated context. Clearing before app code
  // executes makes the route checks deterministic without touching user data.
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test.describe('main app visual-only polish contract', () => {
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route.label} at ${viewport.label}px keeps the approved visual contract`, async ({ page }) => {
        const browserErrors = collectBrowserErrors(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await page.goto(route.route);
        await expect(page.getByTestId(route.readyTestId)).toBeVisible();

        await expectSemanticVisualTokens(page);

        const forwardAction = await getForwardAction(page, route.route);
        await expect(forwardAction).toBeVisible();
        await expect(forwardAction).toHaveCSS('background-color', EXPECTED_COLORS.action);
        await expect(forwardAction).toHaveCSS('color', 'rgb(255, 255, 255)');
        const forwardTarget = await forwardAction.boundingBox();
        expect(forwardTarget, 'forward action must have a measurable target').not.toBeNull();
        expect(forwardTarget!.height).toBeGreaterThanOrEqual(route.forwardMinimumHeight - 0.5);

        const focusTarget = await getFocusTarget(page, viewport, route);
        await expectVisibleFocus(page, focusTarget);
        await expectNoHorizontalOverflow(page);
        await captureEvidence(page, route, viewport);
        expect(browserErrors, browserErrors.join('\n')).toEqual([]);
      });
    }
  }
});
