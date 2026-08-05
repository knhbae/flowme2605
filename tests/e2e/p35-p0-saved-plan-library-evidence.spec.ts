import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const FLOW_SLUG = 'moving-d30-basic';
const SAVED_FLOW_KEY = `flow:saved:${FLOW_SLUG}`;
const ANCHOR_KEY = `flow:${FLOW_SLUG}:anchorDate`;
const screenshotDir = path.join(
  process.cwd(),
  'docs',
  'specs',
  '2026-08-04-p35-round2-bounded-ux-correction',
  'evidence',
  'p0-08',
  'screenshots',
);

fs.mkdirSync(screenshotDir, { recursive: true });

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectPageQuality(page: Page) {
  const quality = await page.evaluate(() => {
    const visible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const unnamedInteractiveCount = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter((element) => {
      if (!visible(element)) return false;
      const control = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const labelText = Array.from(control.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      return [
        element.getAttribute('aria-label'),
        element.getAttribute('aria-labelledby'),
        element.getAttribute('title'),
        labelText,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim().length === 0;
    }).length;
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount,
    };
  });

  expect(quality).toEqual({ horizontalOverflow: 0, unnamedInteractiveCount: 0 });
}

async function expectMobileNavPainted(page: Page) {
  const diagnostics = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('[data-testid="platform-mobile-tabs"]');
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (!nav) return { viewport, navRect: null, links: [] };
    const navRect = nav.getBoundingClientRect();
    return {
      viewport,
      navRect: {
        left: navRect.left,
        top: navRect.top,
        right: navRect.right,
        bottom: navRect.bottom,
      },
      links: Array.from(nav.querySelectorAll<HTMLAnchorElement>('a')).map((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return {
          text: link.textContent?.trim() ?? '',
          href: link.getAttribute('href'),
          active: link.getAttribute('aria-current') === 'page',
          rect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          },
          color: style.color,
          backgroundColor: style.backgroundColor,
          opacity: style.opacity,
          transform: style.transform,
          display: style.display,
          visibility: style.visibility,
          centerHitOwned: Boolean(hit && link.contains(hit)),
        };
      }),
    };
  });

  expect(diagnostics.navRect).not.toBeNull();
  expect(diagnostics.links).toHaveLength(3);
  expect(diagnostics.links.map((link) => link.text)).toEqual(['계획 찾기', '캘린더', '내 계획']);
  for (const link of diagnostics.links) {
    expect(link.rect.left).toBeGreaterThanOrEqual(0);
    expect(link.rect.top).toBeGreaterThanOrEqual(0);
    expect(link.rect.right).toBeLessThanOrEqual(diagnostics.viewport.width);
    expect(link.rect.bottom).toBeLessThanOrEqual(diagnostics.viewport.height);
    expect(link.rect.width).toBeGreaterThan(0);
    expect(link.rect.height).toBeGreaterThan(0);
    expect(link.opacity).toBe('1');
    expect(link.transform).toBe('none');
    expect(link.display).toBe('flex');
    expect(link.visibility).toBe('visible');
    expect(link.centerHitOwned).toBe(true);
  }
  expect(diagnostics.links[2]).toMatchObject({
    href: '/my',
    active: true,
    color: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(27, 26, 23)',
  });
}

async function stabilizeAndCapture(
  page: Page,
  errors: string[],
  filename: string,
) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(300);
  await expectPageQuality(page);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
    animations: 'disabled',
  });
}

async function expectLibraryShell(
  page: Page,
  count: number,
  sizeState: 'empty' | 'single' | 'small' | 'searchable',
) {
  const shell = page.getByTestId('my-flow-saved-library-shell');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-saved-library-flag', 'on');
  await expect(shell).toHaveAttribute('data-library-count', String(count));
  await expect(shell).toHaveAttribute('data-library-size-state', sizeState);
  return shell;
}

async function seedOneDatedPlan(page: Page) {
  await page.addInitScript(({ savedFlowKey, anchorKey, flowSlug }) => {
    window.localStorage.clear();
    window.localStorage.setItem(savedFlowKey, JSON.stringify({
      slug: flowSlug,
      savedAt: '2026-05-28T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2026-06-26',
    }));
    window.localStorage.setItem(
      anchorKey,
      JSON.stringify({ mode: 'custom', anchor: '2026-06-26' }),
    );
  }, { savedFlowKey: SAVED_FLOW_KEY, anchorKey: ANCHOR_KEY, flowSlug: FLOW_SLUG });
}

test.describe('P35 P0-08 saved-plan library visual evidence', () => {
  test('empty library at 390x844', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/my');

    const shell = await expectLibraryShell(page, 0, 'empty');
    await expect(shell.getByTestId('my-flow-empty-state')).toBeVisible();
    await expect(shell.getByTestId('my-flow-today-summary')).toHaveCount(0);
    await stabilizeAndCapture(page, errors, '01-empty-library-390x844.png');
  });

  test('one saved plan with compact Today at 390x844', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
    await seedOneDatedPlan(page);
    await page.goto('/my');

    const shell = await expectLibraryShell(page, 1, 'single');
    const today = shell.getByTestId('my-flow-today-summary');
    await expect(today).toBeVisible();
    await expect(today.getByTestId('my-flow-today-item').first()).toHaveAttribute(
      'data-saved-identity',
      FLOW_SLUG,
    );
    await stabilizeAndCapture(page, errors, '02-compact-today-one-plan-390x844.png');
  });

  test('five-plan compact library at 1024x768', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5');

    const shell = await expectLibraryShell(page, 5, 'small');
    await expect(shell.getByTestId('my-flow-library-row')).toHaveCount(5);
    await expect(shell.getByTestId('my-flow-library-rail-search')).toHaveCount(0);
    await stabilizeAndCapture(page, errors, '03-five-plan-library-1024x768.png');
  });

  test('twenty-plan searchable library at 1440x1000', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/my?demo=ux20');

    const shell = await expectLibraryShell(page, 20, 'searchable');
    const rail = shell.getByTestId('my-flow-library-rail');
    await expect(rail.getByTestId('my-flow-library-row')).toHaveCount(20);
    await expect(rail.getByTestId('my-flow-library-rail-search')).toBeVisible();
    await expect(rail.getByTestId('my-flow-library-rail-filter')).toBeVisible();
    await stabilizeAndCapture(page, errors, '04-searchable-twenty-plan-library-1440x1000.png');
  });

  test('selected plan detail at 1024x768', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5');

    const shell = await expectLibraryShell(page, 5, 'small');
    const firstPlan = shell.getByTestId('my-flow-library-row').first();
    const selectedSlug = await firstPlan.getAttribute('data-flow-slug');
    expect(selectedSlug).toBeTruthy();
    await firstPlan.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(selectedSlug);
    await expect(shell.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${selectedSlug}"]`,
    )).toBeVisible();
    await stabilizeAndCapture(page, errors, '05-selected-plan-detail-1024x768.png');
  });

  test('exact flag-off legacy surface at 390x844', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedOneDatedPlan(page);
    await page.goto('/my?savedPlanLibrary=off');

    await expect(page.locator('main').first()).toHaveAttribute('data-saved-library-flag', 'off');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toBeVisible();
    await stabilizeAndCapture(page, errors, '06-exact-flag-off-legacy-390x844.png');
  });

  test('real public save opens detail and count banner at 390x844', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/f/${FLOW_SLUG}`);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill('2031-01-10');
    await page.getByTestId('public-flow-save-primary-mobile').click();

    await expect.poll(() => new URL(page.url()).pathname).toBe('/my');
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);
    const shell = page.getByTestId('my-flow-saved-library-shell');
    const banner = shell.getByTestId('my-flow-save-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-personal-copy-key', personalCopyKey);
    await expect(banner).toHaveAttribute('data-item-count', '24');
    await expect(shell.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]`,
    )).toBeVisible();
    await expectMobileNavPainted(page);
    await stabilizeAndCapture(page, errors, '07-real-save-detail-banner-390x844.png');
  });
});
