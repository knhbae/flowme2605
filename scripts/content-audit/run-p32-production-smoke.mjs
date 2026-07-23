import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const baseUrl = process.env.FLOWME_PRODUCTION_URL || 'https://flowme2605.vercel.app';
const sourceCommit = process.env.FLOWME_SOURCE_COMMIT || null;
const deploymentUrl = process.env.FLOWME_DEPLOYMENT_URL || null;
const outputRoot = path.resolve(
  'docs/content-audit/2026-07-24-p32-final-review-package/production-smoke',
);
const screenshotRoot = path.join(outputRoot, 'screenshots');

const viewports = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

await mkdir(screenshotRoot, { recursive: true });

async function pageHealth(page) {
  return page.evaluate(() => {
    const focusables = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    const unnamedFocusableCount = focusables.filter((element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledByText = labelledBy
        ?.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ')
        .trim();
      const formLabel =
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? Array.from(element.labels ?? [])
              .map((label) => label.textContent?.trim() ?? '')
              .join(' ')
              .trim()
          : '';
      const name =
        element.getAttribute('aria-label') ||
        labelledByText ||
        formLabel ||
        element.getAttribute('title') ||
        element.textContent?.trim();
      return !name;
    }).length;

    const mobileTabs = document.querySelector('[data-testid="platform-mobile-tabs"]');
    const mobileTabsRect = mobileTabs?.getBoundingClientRect();
    const fixedOverlapCount = mobileTabsRect
      ? Array.from(document.querySelectorAll('button, a, input, select, textarea'))
          .filter((element) => !mobileTabs?.contains(element))
          .filter((element) => {
            const style = window.getComputedStyle(element);
            if (style.position !== 'fixed' && style.position !== 'sticky') return false;
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return (
              rect.left < mobileTabsRect.right &&
              rect.right > mobileTabsRect.left &&
              rect.top < mobileTabsRect.bottom &&
              rect.bottom > mobileTabsRect.top
            );
          }).length
      : 0;

    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
      ),
      unnamedFocusableCount,
      fixedOverlapCount,
    };
  });
}

async function traceMobileFocusOrder(page, maxSteps = 180) {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const trace = [];
  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate(() => {
      const active = document.activeElement;
      const owner = active?.closest?.('[data-testid]');
      return {
        testId: owner?.getAttribute('data-testid') ?? null,
        accessibleName:
          active?.getAttribute?.('aria-label') ?? active?.textContent?.trim() ?? null,
      };
    });
    trace.push(step);
    if (step.testId === 'platform-mobile-tabs') break;
  }

  const headerIndex = trace.findIndex((step) => step.testId === 'platform-nav');
  const workspaceIndex = trace.findIndex(
    (step) => step.testId === 'my-flow-mobile-library-back',
  );
  const tabsIndex = trace.findIndex((step) => step.testId === 'platform-mobile-tabs');
  return {
    trace,
    headerIndex,
    workspaceIndex,
    tabsIndex,
    ordered:
      headerIndex >= 0 && workspaceIndex > headerIndex && tabsIndex > workspaceIndex,
  };
}

async function openMobileFlow(page, flowSlug, query) {
  if (query) await page.getByTestId('my-flow-search').fill(query);
  let row = page.locator(
    `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`,
  );
  try {
    await row.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    if (query) await page.getByTestId('my-flow-search').fill(query);
    row = page.locator(
      `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`,
    );
    await row.waitFor({ state: 'visible', timeout: 45_000 });
  }
  await row.getByTestId('my-flow-mobile-structure-open').click();
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
    (process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : undefined),
});

const results = [];

async function runScenario({ name, route, viewport, screenshot, interact }) {
  const context = await browser.newContext({
    viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.locator('body').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1_500);
    const metrics = await interact(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    const health = await pageHealth(page);
    await page.screenshot({
      path: path.join(screenshotRoot, screenshot),
      fullPage: false,
    });
    results.push({
      name,
      route,
      viewport: `${viewport.width}x${viewport.height}`,
      httpStatus: response?.status() ?? null,
      finalUrl: page.url(),
      assertionsPassed: Object.values(metrics.assertions ?? {}).every(Boolean),
      ...metrics,
      ...health,
      consoleErrors,
      pageErrors,
      screenshot: `screenshots/${screenshot}`,
    });
  } catch (error) {
    results.push({
      name,
      route,
      viewport: `${viewport.width}x${viewport.height}`,
      httpStatus: null,
      finalUrl: page.url(),
      assertionsPassed: false,
      error: error instanceof Error ? error.message : String(error),
      consoleErrors,
      pageErrors,
      screenshot: `screenshots/${screenshot}`,
    });
  } finally {
    await context.close();
  }
}

await runScenario({
  name: 'mobile_my_flow_library',
  route: '/my?demo=ux20&view=flows',
  viewport: viewports.mobile,
  screenshot: 'p32-production-my-flow-library-390.png',
  interact: async (page) => {
    const mainState = await page.locator('main').getAttribute('data-p32-workspace-state');
    const searchVisible = await page.getByTestId('my-flow-search').isVisible();
    const rowCount = await page.getByTestId('my-flow-mobile-structure-row').count();
    return {
      mainState,
      searchVisible,
      rowCount,
      assertions: {
        libraryState: mainState === 'library',
        searchVisible,
        rowsAvailable: rowCount >= 6,
      },
    };
  },
});

await runScenario({
  name: 'mobile_my_flow_focused',
  route: '/my?demo=ux20&view=flows',
  viewport: viewports.mobile,
  screenshot: 'p32-production-my-flow-focused-390.png',
  interact: async (page) => {
    await openMobileFlow(page, 'moving-d30-basic', '이사');
    const workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="moving-d30-basic"]',
    );
    await workspace.waitFor({ state: 'visible' });
    const marker = await workspace.getAttribute('data-p32-marker');
    const sharedMarker = await workspace.getAttribute('data-p32-shared-marker');
    const mainState = await page.locator('main').getAttribute('data-p32-workspace-state');
    const commandHierarchyMarker = await workspace
      .getByTestId('my-flow-workspace-commands')
      .getAttribute('data-p32-marker');
    const focusOrder = await traceMobileFocusOrder(page);
    return {
      marker,
      sharedMarker,
      mainState,
      commandHierarchyMarker,
      focusOrder,
      assertions: {
        focusedState: mainState === 'focused',
        focusedMarker: marker === 'P32-02-FOCUSED-MY-FLOW-WORKSPACE',
        sharedMarker: sharedMarker === 'P32-06-SHARED-FOCUSED-WORKSPACE',
        commandHierarchy:
          commandHierarchyMarker === 'P32-05-OBJECT-COMMAND-HIERARCHY',
        focusOrder: focusOrder.ordered,
      },
    };
  },
});

for (const [name, viewport] of [
  ['wide_my_flow_focused', viewports.wide],
  ['desktop_my_flow_focused', viewports.desktop],
]) {
  await runScenario({
    name,
    route: '/my?demo=ux20&view=flows',
    viewport,
    screenshot: `p32-production-${name.replaceAll('_', '-')}-${viewport.width}.png`,
    interact: async (page) => {
      const library = page.getByTestId('my-flow-library-workspace');
      await library
        .locator(
          '[data-testid="my-flow-library-row"][data-flow-slug="moving-d30-basic"]',
        )
        .click();
      const flow = library.locator(
        '[data-testid="my-flow-overview-card"][data-flow-slug="moving-d30-basic"]',
      );
      await flow.waitFor({ state: 'visible' });
      const workspaceMarker = await library.getAttribute('data-p32-marker');
      const flowMarker = await flow.getAttribute('data-p32-marker');
      const detailVisible = await library.getByTestId('my-flow-library-detail').isVisible();
      const backVisible = await page.getByTestId('my-flow-library-back').isVisible();
      return {
        workspaceMarker,
        flowMarker,
        detailVisible,
        backVisible,
        assertions: {
          focusedMarker: workspaceMarker === 'P32-02-FOCUSED-MY-FLOW-WORKSPACE',
          sharedMarker: flowMarker === 'P32-06-SHARED-FOCUSED-WORKSPACE',
          detailVisible,
          backVisible,
        },
      };
    },
  });
}

await runScenario({
  name: 'mobile_public_shell',
  route: '/f/moving-d30-basic',
  viewport: viewports.mobile,
  screenshot: 'p32-production-public-moving-390.png',
  interact: async (page) => {
    const workspaceVisible = await page.getByTestId('public-flow-detail-workspace').isVisible();
    const setupVisible = await page.getByTestId('public-flow-primary-setup').first().isVisible();
    const saveVisible =
      (await page.getByTestId('public-flow-save-primary-mobile').count()) > 0;
    return {
      workspaceVisible,
      setupVisible,
      saveVisible,
      assertions: { workspaceVisible, setupVisible, saveVisible },
    };
  },
});

for (const [name, viewport] of [
  ['mobile_calendar', viewports.mobile],
  ['wide_calendar', viewports.wide],
]) {
  await runScenario({
    name,
    route: '/calendar?demo=ux20',
    viewport,
    screenshot: `p32-production-${name.replaceAll('_', '-')}-${viewport.width}.png`,
    interact: async (page) => {
      const scopeVisible = await page
        .getByTestId('calendar-flow-scope-picker-trigger')
        .isVisible();
      const calendarVisible = await page.getByTestId('my-flow-calendar-workspace').isVisible();
      return {
        scopeVisible,
        calendarVisible,
        assertions: { scopeVisible, calendarVisible },
      };
    },
  });
}

await browser.close();

const failures = results.filter(
  (result) =>
    result.httpStatus !== 200 ||
    !result.assertionsPassed ||
    result.horizontalOverflow !== 0 ||
    result.unnamedFocusableCount !== 0 ||
    result.fixedOverlapCount !== 0 ||
    result.consoleErrors?.length > 0 ||
    result.pageErrors?.length > 0 ||
    result.error,
);

const report = {
  generatedAt: new Date().toISOString(),
  evidenceKind: 'current_production_interaction',
  baseUrl,
  sourceCommit,
  deploymentUrl,
  observedUserCount: 0,
  summary: {
    scenarioCount: results.length,
    passedScenarioCount: results.length - failures.length,
    failedScenarioCount: failures.length,
    horizontalOverflowCount: results.filter(
      (result) => typeof result.horizontalOverflow === 'number' && result.horizontalOverflow !== 0,
    ).length,
    unnamedFocusableCount: results.reduce(
      (sum, result) => sum + (result.unnamedFocusableCount ?? 0),
      0,
    ),
    fixedOverlapCount: results.reduce(
      (sum, result) => sum + (result.fixedOverlapCount ?? 0),
      0,
    ),
    consoleErrorCount: results.reduce(
      (sum, result) => sum + (result.consoleErrors?.length ?? 0),
      0,
    ),
    pageErrorCount: results.reduce(
      (sum, result) => sum + (result.pageErrors?.length ?? 0),
      0,
    ),
  },
  results,
};

await writeFile(
  path.join(outputRoot, 'results.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(report.summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
