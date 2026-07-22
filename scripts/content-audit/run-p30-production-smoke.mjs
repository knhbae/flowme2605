import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const baseUrl = process.env.FLOWME_PRODUCTION_URL || 'https://flowme2605.vercel.app';
const sourceCommit = process.env.FLOWME_SOURCE_COMMIT || null;
const deploymentId = process.env.FLOWME_DEPLOYMENT_ID || null;
const deploymentUrl = process.env.FLOWME_DEPLOYMENT_URL || null;
const outputRoot = path.resolve(
  'docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke',
);
const screenshotRoot = path.join(outputRoot, 'screenshots');

const viewports = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

await mkdir(screenshotRoot, { recursive: true });

function rectIntersectionArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

async function elementRect(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected a visible element rectangle.');
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  };
}

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

    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      unnamedFocusableCount,
    };
  });
}

async function traceMobileFocusOrder(page, workspaceTestId, maxSteps = 160) {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const trace = [];
  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate(() => {
      const active = document.activeElement;
      const owner = active?.closest?.('[data-testid]');
      return {
        testId: owner?.getAttribute('data-testid') ?? null,
        tagName: active?.tagName?.toLowerCase() ?? '',
        accessibleName:
          active?.getAttribute?.('aria-label') ?? active?.textContent?.trim() ?? null,
      };
    });
    trace.push(step);
    if (step.testId === 'platform-mobile-tabs') break;
  }

  const headerIndex = trace.findIndex((step) => step.testId === 'platform-nav');
  const workspaceIndex = trace.findIndex((step) => step.testId === workspaceTestId);
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
    const health = await pageHealth(page);
    await page.screenshot({
      path: path.join(outputRoot, screenshot),
      fullPage: true,
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
      screenshot,
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
      screenshot,
    });
  } finally {
    await context.close();
  }
}

await runScenario({
  name: 'mobile_public_export_layer',
  route: '/f/moving-d30-basic',
  viewport: viewports.mobile,
  screenshot: 'screenshots/p30-production-public-export-390.png',
  interact: async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    const workspace = page.getByTestId('public-flow-detail-workspace');
    await workspace.locator('summary').first().click();
    const exportEntry = workspace.getByTestId('public-flow-export-secondary-entry');
    await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
    const panel = exportEntry.getByTestId('my-flow-export-panel');
    await panel.waitFor({ state: 'visible' });
    await page.waitForTimeout(750);
    const primary = panel.locator(
      '[data-action-priority="primary"][data-recommendation-visible="true"]',
    );
    const primaryRect = await elementRect(primary);
    const fixedSaveCtaCount = await page.getByTestId('public-flow-mobile-save-cta').count();
    const marker = await panel.locator('..').getAttribute('data-p30-marker');
    return {
      marker,
      fixedSaveCtaCount,
      primaryRect,
      assertions: {
        marker: marker === 'P30-MOBILE-EXPORT-NO-FIXED-OVERLAP',
        fixedSaveCtaSuppressed: fixedSaveCtaCount === 0,
        primaryInViewport: primaryRect.top >= 0 && primaryRect.bottom <= viewports.mobile.height,
      },
    };
  },
});

await runScenario({
  name: 'mobile_my_flow_export_layer',
  route: '/my?demo=ux20&view=flows',
  viewport: viewports.mobile,
  screenshot: 'screenshots/p30-production-my-export-390.png',
  interact: async (page) => {
    let open = page.getByTestId('my-flow-mobile-structure-open').first();
    try {
      await open.click({ timeout: 15_000 });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded' });
      open = page.getByTestId('my-flow-mobile-structure-open').first();
      await open.click({ timeout: 45_000 });
    }
    const flow = page.locator('[data-testid="my-flow-overview-card"]:visible').first();
    await flow.waitFor({ state: 'visible' });
    const surface = flow.getByTestId('my-flow-export-surface');
    await surface.getByTestId('my-flow-export-entry').click();
    const panel = surface.getByTestId('my-flow-export-panel');
    await panel.waitFor({ state: 'visible' });
    await page.waitForTimeout(750);
    const primary = panel.locator(
      '[data-action-priority="primary"][data-recommendation-visible="true"]',
    );
    const tabs = page.getByTestId('platform-mobile-tabs');
    const primaryRect = await elementRect(primary);
    const tabsRect = await elementRect(tabs);
    const overlap = rectIntersectionArea(primaryRect, tabsRect);
    const marker = await surface.getAttribute('data-p30-marker');
    return {
      marker,
      primaryRect,
      tabsRect,
      fixedLayerIntersectionArea: overlap,
      assertions: {
        marker: marker === 'P30-MOBILE-EXPORT-NO-FIXED-OVERLAP',
        noFixedLayerIntersection: overlap === 0,
        primaryBeforeTabs: primaryRect.bottom <= tabsRect.top,
      },
    };
  },
});

for (const [name, route, workspaceTestId] of [
  ['mobile_my_flow_focus_order', '/my?demo=ux20&view=flows', 'my-flow-view-flow'],
  ['mobile_calendar_focus_order', '/calendar?demo=ux20', 'calendar-flow-scope-picker-trigger'],
]) {
  await runScenario({
    name,
    route,
    viewport: viewports.mobile,
    screenshot: `screenshots/p30-production-${name.replaceAll('_', '-')}-390.png`,
    interact: async (page) => {
      const focus = await traceMobileFocusOrder(page, workspaceTestId);
      const tabsMarker = await page
        .getByTestId('platform-mobile-tabs')
        .getAttribute('data-p30-marker');
      return {
        focusOrder: focus,
        tabsMarker,
        assertions: {
          ordered: focus.ordered,
          marker: tabsMarker === 'P30-MOBILE-WORKSPACE-FOCUS-ORDER',
        },
      };
    },
  });
}

await runScenario({
  name: 'mobile_long_flow_adjustment',
  route: '/f/moving-d30-basic',
  viewport: viewports.mobile,
  screenshot: 'screenshots/p30-production-long-flow-adjustment-390.png',
  interact: async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    const hero = page.getByTestId('public-flow-hero');
    const initialRowEditCount = await hero.locator('[data-flow-outline-row="true"] button').count();
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    const marker = await adjustment.getAttribute('data-p30-marker');
    const initialVisibleRows = await adjustment
      .locator('[data-testid="public-flow-adjustment-row"]:visible')
      .count();
    await adjustment
      .getByTestId('public-flow-adjustment-item-disclosure')
      .locator('summary')
      .click();
    const expandedRows = await adjustment
      .locator('[data-testid="public-flow-adjustment-row"]:visible')
      .count();
    return {
      marker,
      initialRowEditCount,
      initialVisibleRows,
      expandedRows,
      assertions: {
        marker: marker === 'P30-LONG-FLOW-CONTEXTUAL-ADJUST',
        noInitialRowCommands: initialRowEditCount === 0 && initialVisibleRows === 0,
        fullListExplicit: expandedRows === 24,
      },
    };
  },
});

await runScenario({
  name: 'mobile_my_flow_command_hierarchy',
  route: '/my?demo=ux20&view=flows',
  viewport: viewports.mobile,
  screenshot: 'screenshots/p30-production-my-command-hierarchy-390.png',
  interact: async (page) => {
    const row = page.getByTestId('my-flow-mobile-structure-row').nth(2);
    const slug = await row.getAttribute('data-flow-slug');
    await row.getByTestId('my-flow-mobile-structure-open').click();
    const card = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]:visible`,
    );
    const marker = await card.getAttribute('data-p30-marker');
    const visiblePrimaryCount = await card.locator('[data-action-priority="primary"]:visible').count();
    const visibleSecondaryCount = await card
      .locator('[data-action-priority="secondary"]:visible')
      .count();
    const menu = card.getByTestId('my-flow-management-menu');
    const trigger = menu.getByTestId('my-flow-management-menu-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    const focusReturned = await trigger.evaluate((element) => element === document.activeElement);
    return {
      marker,
      visiblePrimaryCount,
      visibleSecondaryCount,
      managementMenuFocusReturned: focusReturned,
      assertions: {
        marker: marker === 'P30-MY-FLOW-COMMAND-HIERARCHY',
        onePrimary: visiblePrimaryCount === 1,
        boundedSecondary: visibleSecondaryCount <= 2,
        focusReturned,
      },
    };
  },
});

await runScenario({
  name: 'mobile_calendar_scope_scale',
  route: '/calendar?demo=ux50',
  viewport: viewports.mobile,
  screenshot: 'screenshots/p30-production-calendar-scope-50-390.png',
  interact: async (page) => {
    const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    const marker = await trigger.getAttribute('data-p30-marker');
    await trigger.click();
    const picker = page.getByTestId('calendar-flow-scope-picker');
    const optionCount = await picker.getByTestId('calendar-flow-scope-picker-option').count();
    const other = picker.getByTestId('calendar-flow-scope-picker-other-disclosure');
    const otherCollapsed = !(await other.getAttribute('open'));
    return {
      marker,
      optionCount,
      inactiveGroupCollapsedInitially: otherCollapsed,
      assertions: {
        marker: marker === 'P30-CALENDAR-SCOPE-SCALE',
        scaleFixture: optionCount >= 50,
        inactiveCollapsed: otherCollapsed,
      },
    };
  },
});

await runScenario({
  name: 'mobile_routine_summary',
  route: '/f/curated-allblanc-morning-workout',
  viewport: viewports.mobile,
  screenshot: 'screenshots/p30-production-routine-summary-390.png',
  interact: async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2026-07-27');
    const summary = page.getByTestId('public-routine-schedule-summary');
    const marker = await summary.getAttribute('data-p30-marker');
    const initialAdvancedFieldCount = await summary
      .getByTestId('public-routine-schedule-editor')
      .count();
    const nextOccurrenceCount = await summary
      .getByTestId('public-routine-schedule-summary-next-occurrences')
      .getByRole('listitem')
      .count();
    return {
      marker,
      initialAdvancedFieldCount,
      nextOccurrenceCount,
      assertions: {
        marker: marker === 'P30-ROUTINE-ADVANCED-DENSITY',
        advancedCollapsed: initialAdvancedFieldCount === 0,
        nextOccurrences: nextOccurrenceCount === 3,
      },
    };
  },
});

await runScenario({
  name: 'wide_calendar_compact_identity',
  route: '/calendar?demo=ux50',
  viewport: viewports.wide,
  screenshot: 'screenshots/p30-production-calendar-compact-identity-1024.png',
  interact: async (page) => {
    await page.getByTestId('my-flow-month-picker').fill('2026-06');
    const rows = page.getByTestId('my-flow-calendar-schedule-content');
    const marker = await rows.first().getAttribute('data-p30-marker');
    const overflowSummary = page.getByTestId('my-flow-calendar-grid-overflow-summary').first();
    await overflowSummary.press('Enter');
    const sameDateFlowCount = await page
      .getByTestId('my-flow-calendar-selected-day')
      .getByTestId('my-flow-selected-date-group')
      .count();
    const fullIdentityCount = await page
      .getByTestId('my-flow-calendar-selected-day')
      .getByTestId('my-flow-selected-date-flow-marker')
      .count();
    return {
      marker,
      sameDateFlowCount,
      fullIdentityCount,
      assertions: {
        marker: marker === 'P30-CALENDAR-COMPACT-IDENTITY',
        allFlowsReachable: sameDateFlowCount >= 5 && fullIdentityCount >= 5,
      },
    };
  },
});

await runScenario({
  name: 'wide_live_legacy_consumer',
  route: '/flow-maps/moving-d30',
  viewport: viewports.wide,
  screenshot: 'screenshots/p30-production-flow-map-legacy-1024.png',
  interact: async (page) => {
    const root = page.getByTestId('flow-map-hero');
    const marker = await root.getAttribute('data-p30-marker');
    const architecture = await root.getAttribute('data-experience-architecture');
    return {
      marker,
      architecture,
      assertions: {
        marker: marker === 'P30-LEGACY-COMPOSITION-ACTIVE',
        explicitLegacy: architecture === 'hybrid',
      },
    };
  },
});

for (const [name, route, markerTestId, markerValue] of [
  [
    'desktop_public_save_before',
    '/f/moving-d30-basic',
    'public-flow-hero',
    'P30-SAVE-BEFORE-SINGLE-DECISION',
  ],
  [
    'desktop_my_flow_workspace',
    '/my?demo=ux20&view=flows',
    'my-flow-library-workspace',
    null,
  ],
  [
    'desktop_calendar_workspace',
    '/calendar?demo=ux50',
    'calendar-flow-scope-picker-trigger',
    'P30-CALENDAR-SCOPE-SCALE',
  ],
]) {
  await runScenario({
    name,
    route,
    viewport: viewports.desktop,
    screenshot: `screenshots/p30-production-${name.replaceAll('_', '-')}-1440.png`,
    interact: async (page) => {
      const element = page.getByTestId(markerTestId).first();
      await element.waitFor({ state: 'visible' });
      const marker = markerValue ? await element.getAttribute('data-p30-marker') : null;
      return {
        marker,
        assertions: {
          surfaceVisible: true,
          marker: markerValue ? marker === markerValue : true,
        },
      };
    },
  });
}

await browser.close();

const summary = {
  schemaVersion: 1,
  status: 'pass',
  checkedAt: new Date().toISOString(),
  canonicalUrl: baseUrl,
  sourceCommit,
  deploymentId: deploymentId ? Number(deploymentId) : null,
  deploymentUrl,
  routes: [...new Set(results.map((entry) => entry.route))],
  viewports: [...new Set(results.map((entry) => entry.viewport))],
  results,
  summary: {
    routeViewportChecks: results.length,
    httpOrNavigationFailureCount: results.filter(
      (entry) => !entry.httpStatus || entry.httpStatus >= 400 || entry.error,
    ).length,
    redirectedOffProductionCount: results.filter((entry) => {
      try {
        return new URL(entry.finalUrl).hostname !== new URL(baseUrl).hostname;
      } catch {
        return true;
      }
    }).length,
    assertionFailureCount: results.filter((entry) => !entry.assertionsPassed).length,
    horizontalOverflowCount: results.filter((entry) => (entry.horizontalOverflow ?? 0) > 1)
      .length,
    unnamedFocusableCount: results.reduce(
      (count, entry) => count + (entry.unnamedFocusableCount ?? 0),
      0,
    ),
    consoleErrorCount: results.reduce(
      (count, entry) => count + entry.consoleErrors.length,
      0,
    ),
    pageErrorCount: results.reduce((count, entry) => count + entry.pageErrors.length, 0),
  },
  evidenceKind: 'current_production_interaction',
  observedUserCount: 0,
};

const hasFailure = Object.entries(summary.summary).some(
  ([key, value]) => key !== 'routeViewportChecks' && value > 0,
);
summary.status = hasFailure ? 'fail' : 'pass';

await writeFile(path.join(outputRoot, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (hasFailure) process.exitCode = 1;
