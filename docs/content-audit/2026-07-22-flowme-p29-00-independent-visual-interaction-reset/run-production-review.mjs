import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const baseURL = 'https://flowme2605.vercel.app';
const root = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = path.join(root, 'screenshots');
const resultPath = path.join(root, 'production-review-results.json');
const chromeExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

fs.mkdirSync(screenshotRoot, { recursive: true });

const viewports = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'wide', width: 1024, height: 768 },
  { id: 'desktop', width: 1440, height: 900 },
];

const routes = [
  '/f/moving-d30-basic',
  '/f/curated-allblanc-morning-workout',
  '/my?demo=ux20&view=flows',
  '/calendar?demo=ux12',
  '/f/used-car-buying-check',
  '/f/source-backed-middle-school-math-1',
  '/f/overseas-safety-register',
];

const shapeCases = [
  { slug: 'curated-allblanc-morning-workout', expected: 'flow_execution' },
  { slug: 'moving-d30-basic', expected: 'calendar' },
  { slug: 'used-car-buying-check', expected: 'checklist' },
  { slug: 'source-backed-middle-school-math-1', expected: 'sheet' },
  { slug: 'overseas-safety-register', expected: 'memo' },
];

const results = {
  generatedAt: new Date().toISOString(),
  production: baseURL,
  evidenceKind: 'current_production_interaction',
  observedUserCount: 0,
  viewports,
  routeStates: [],
  journeys: [],
  shapeComparison: [],
  failures: [],
  totals: {},
};

function slugify(value) {
  return value
    .replace(/^\//, '')
    .replace(/[?&=]/g, '-')
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'home';
}

async function reset(page, route) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(450);
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    };
    const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
    const accessibleName = (element) => {
      const aria = clean(element.getAttribute('aria-label'));
      if (aria) return aria;
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const value = labelledBy
          .split(/\s+/)
          .map((id) => clean(document.getElementById(id)?.textContent))
          .filter(Boolean)
          .join(' ');
        if (value) return value;
      }
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        const labels = Array.from(element.labels ?? []).map((label) => clean(label.textContent)).filter(Boolean);
        if (labels.length) return labels.join(' ');
        if (element.placeholder) return clean(element.placeholder);
      }
      return clean(element.textContent);
    };
    const rectOf = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const interactiveSelector = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
    const interactives = Array.from(document.querySelectorAll(interactiveSelector)).filter(visible);
    const unnamedFocusables = interactives
      .filter((element) => !accessibleName(element))
      .map((element) => ({ tag: element.tagName.toLowerCase(), testId: element.getAttribute('data-testid'), ...rectOf(element) }));
    const firstViewportInteractives = interactives
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        name: accessibleName(element).slice(0, 140),
        testId: element.getAttribute('data-testid'),
        ...rectOf(element),
      }));
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
      .filter(visible)
      .map((element) => ({ level: element.tagName.toLowerCase(), text: clean(element.textContent).slice(0, 180), ...rectOf(element) }));
    const firstViewportHeadings = headings.filter((heading) => heading.top < window.innerHeight && heading.top + heading.height > 0);
    const longParagraphs = Array.from(document.querySelectorAll('p'))
      .filter(visible)
      .map((element) => ({ text: clean(element.textContent), ...rectOf(element) }))
      .filter((entry) => entry.text.length >= 70);
    const roundedBorderSurfaces = Array.from(document.querySelectorAll('main [class*="rounded"][class*="border"]'))
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 120 && rect.height >= 44;
      });
    const chipLike = Array.from(document.querySelectorAll('main span[class*="rounded"], main p[class*="rounded"]'))
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.height <= 44 && clean(element.textContent).length > 0;
      });
    const testIds = Array.from(document.querySelectorAll('[data-testid]'))
      .filter(visible)
      .map((element) => ({ testId: element.getAttribute('data-testid'), ...rectOf(element) }));
    const overflowWidth = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const overflowOffenders = Array.from(document.querySelectorAll('body *'))
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
      })
      .slice(0, 20)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        testId: element.getAttribute('data-testid'),
        className: clean(element.className).slice(0, 160),
        ...rectOf(element),
      }));
    const fixedElements = Array.from(document.querySelectorAll('body *'))
      .filter(visible)
      .filter((element) => ['fixed', 'sticky'].includes(window.getComputedStyle(element).position))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        name: accessibleName(element).slice(0, 100),
        testId: element.getAttribute('data-testid'),
        position: window.getComputedStyle(element).position,
        ...rectOf(element),
      }));
    const primaryCandidates = firstViewportInteractives.filter((entry) => {
      const element = entry.testId ? document.querySelector(`[data-testid="${CSS.escape(entry.testId)}"]`) : null;
      const className = clean(element?.className);
      return element?.getAttribute('data-action-priority') === 'primary'
        || className.includes('bg-blue-700')
        || className.includes('FLOW_UI_PRIMARY');
    });

    return {
      url: window.location.href,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeights: Number((document.documentElement.scrollHeight / window.innerHeight).toFixed(2)),
      },
      horizontalOverflowPx: overflowWidth,
      overflowOffenders,
      firstViewportHeadings,
      firstViewportInteractives,
      primaryCandidates,
      totalInteractiveCount: interactives.length,
      firstViewportInteractiveCount: firstViewportInteractives.length,
      sectionCount: Array.from(document.querySelectorAll('main section')).filter(visible).length,
      detailsCount: Array.from(document.querySelectorAll('main details')).filter(visible).length,
      openDetailsCount: Array.from(document.querySelectorAll('main details[open]')).filter(visible).length,
      roundedBorderSurfaceCount: roundedBorderSurfaces.length,
      chipLikeCount: chipLike.length,
      longParagraphCount: longParagraphs.length,
      longParagraphs: longParagraphs.slice(0, 12),
      visibleTestIds: testIds,
      unnamedFocusables,
      fixedElements,
      bodyTextSample: clean(document.body.innerText).slice(0, 2800),
    };
  });
}

async function collectFocusSequence(page, limit = 14) {
  await page.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {});
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const sequence = [];
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        name: clean(element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder')).slice(0, 120),
        testId: element.getAttribute('data-testid'),
        top: Math.round(rect.top),
        visible: rect.width > 0 && rect.height > 0,
      };
    });
    sequence.push(active);
  }
  return sequence;
}

async function captureState(page, stateId, viewport, metadata = {}) {
  await page.waitForTimeout(250);
  const screenshot = `${viewport.id}-${stateId}.png`;
  const metrics = await collectMetrics(page);
  await page.screenshot({ path: path.join(screenshotRoot, screenshot), fullPage: true });
  return {
    id: stateId,
    viewport: viewport.id,
    screenshot,
    metrics,
    ...metadata,
  };
}

async function withContext(browser, viewport, callback) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    return await callback({ page, consoleErrors, pageErrors });
  } finally {
    await context.close();
  }
}

async function initialRouteMatrix(browser) {
  for (const viewport of viewports) {
    for (const route of routes) {
      const id = `${slugify(route)}-initial`;
      try {
        const state = await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
          await reset(page, route);
          const captured = await captureState(page, id, viewport, { route });
          captured.focusSequence = await collectFocusSequence(page, viewport.id === 'mobile' ? 12 : 16);
          captured.consoleErrors = consoleErrors;
          captured.pageErrors = pageErrors;
          return captured;
        });
        results.routeStates.push(state);
      } catch (error) {
        results.failures.push({ phase: 'initial-route-matrix', route, viewport: viewport.id, error: String(error?.stack ?? error) });
      }
    }
  }
}

async function movingJourney(browser) {
  const viewport = viewports[0];
  const states = [];
  let clickDepth = 0;
  await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
    await reset(page, '/f/moving-d30-basic');
    states.push(await captureState(page, 'journey-moving-01-save-before', viewport));

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    clickDepth += 1;
    states.push(await captureState(page, 'journey-moving-02-anchor', viewport));

    await page.getByTestId('public-flow-artifact-preview-row').first().getByRole('button').click();
    clickDepth += 1;
    states.push(await captureState(page, 'journey-moving-03-adjust-content', viewport));

    const flowTitle = page.getByTestId('public-flow-adjustment-flow-title');
    if (await flowTitle.count()) await flowTitle.fill('2030년 우리 집 이사');
    const itemTitle = page.getByTestId('public-flow-adjustment-title');
    if (await itemTitle.count()) await itemTitle.fill('이사 방식과 견적 후보 확정');
    await page.getByTestId('public-flow-adjustment-mode-schedule').click();
    clickDepth += 1;
    const dateInput = page.getByTestId('public-flow-adjustment-date');
    if (await dateInput.count()) await dateInput.fill('2030-08-01');
    states.push(await captureState(page, 'journey-moving-04-adjust-schedule', viewport));

    await page.getByTestId('public-flow-adjustment-save').click();
    clickDepth += 1;
    states.push(await captureState(page, 'journey-moving-05-saved-receipt', viewport));

    await page.goto(`${baseURL}/my`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    states.push(await captureState(page, 'journey-moving-06-my-flow', viewport));

    await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    states.push(await captureState(page, 'journey-moving-07-calendar', viewport));

    results.journeys.push({
      id: 'moving-cross-surface',
      viewport: viewport.id,
      clickDepth,
      states,
      consoleErrors,
      pageErrors,
    });
  });
}

async function routineJourney(browser) {
  const viewport = viewports[0];
  const states = [];
  let clickDepth = 0;
  await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
    await reset(page, '/f/curated-allblanc-morning-workout');
    states.push(await captureState(page, 'journey-routine-01-initial', viewport));
    await page.getByTestId('public-flow-anchor-input').fill('2026-07-22');
    clickDepth += 1;
    const editor = page.getByTestId('public-routine-schedule-editor');
    await editor.getByTestId('public-routine-schedule-editor-time-mode').selectOption('timed');
    await editor.getByTestId('public-routine-schedule-editor-time').fill('07:30');
    await editor.getByTestId('public-routine-schedule-editor-duration').selectOption('45');
    await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
    await editor.getByTestId('public-routine-schedule-editor-occurrence-count').fill('8');
    clickDepth += 5;
    states.push(await captureState(page, 'journey-routine-02-configured', viewport));
    const detail = page.getByTestId('public-flow-detail-workspace');
    await detail.locator(':scope > summary').click();
    clickDepth += 1;
    states.push(await captureState(page, 'journey-routine-03-resource-and-export', viewport));
    const saveButton = page.getByTestId('public-flow-mobile-save-cta').locator('button[data-action-priority="primary"]');
    if (await saveButton.count()) {
      await saveButton.click();
      clickDepth += 1;
      states.push(await captureState(page, 'journey-routine-04-saved-receipt', viewport));
    }
    await page.goto(`${baseURL}/my`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    states.push(await captureState(page, 'journey-routine-05-my-flow-occurrence', viewport));
    const complete = page.getByRole('checkbox', { name: /완료 체크/u }).first();
    if (await complete.count() && await complete.isVisible()) {
      await complete.click();
      clickDepth += 1;
      states.push(await captureState(page, 'journey-routine-06-completed', viewport));
      const reopen = page.getByRole('checkbox', { name: /다시 열기/u }).first();
      if (await reopen.count() && await reopen.isVisible()) {
        await reopen.click();
        clickDepth += 1;
        states.push(await captureState(page, 'journey-routine-07-reopened', viewport));
      }
    }
    await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    states.push(await captureState(page, 'journey-routine-08-calendar-occurrence', viewport));
    results.journeys.push({
      id: 'routine-progressive-disclosure',
      viewport: viewport.id,
      clickDepth,
      states,
      consoleErrors,
      pageErrors,
    });
  });
}

async function myFlowJourney(browser, viewport) {
  const states = [];
  let clickDepth = 0;
  await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
    await reset(page, '/my?demo=ux20&view=flows');
    states.push(await captureState(page, `journey-my-flow-${viewport.id}-01-library`, viewport));
    if (viewport.id === 'mobile') {
      const open = page.getByTestId('my-flow-mobile-structure-open').first();
      if (await open.count()) {
        await open.click();
        clickDepth += 1;
        states.push(await captureState(page, 'journey-my-flow-mobile-02-detail', viewport));
      }
      const next = page.getByTestId('my-flow-workspace-next-open').first();
      if (await next.count() && await next.isVisible()) {
        await next.click();
        clickDepth += 1;
        states.push(await captureState(page, 'journey-my-flow-mobile-03-item', viewport));
      }
    } else {
      const rows = page.getByTestId('my-flow-library-row');
      if (await rows.count() > 1) {
        await rows.nth(1).click();
        clickDepth += 1;
        states.push(await captureState(page, `journey-my-flow-${viewport.id}-02-selected`, viewport));
      }
      const next = page.getByTestId('my-flow-workspace-next-open').first();
      if (await next.count() && await next.isVisible()) {
        await next.click();
        clickDepth += 1;
        states.push(await captureState(page, `journey-my-flow-${viewport.id}-03-item`, viewport));
      }
    }
    const complete = page.getByRole('checkbox', { name: /완료 체크/u }).first();
    if (await complete.count() && await complete.isVisible()) {
      await complete.click();
      clickDepth += 1;
      states.push(await captureState(page, `journey-my-flow-${viewport.id}-04-completed`, viewport));
      const reopen = page.getByRole('checkbox', { name: /다시 열기/u }).first();
      if (await reopen.count() && await reopen.isVisible()) {
        await reopen.click();
        clickDepth += 1;
        states.push(await captureState(page, `journey-my-flow-${viewport.id}-05-reopened`, viewport));
      }
    }
    results.journeys.push({
      id: `my-flow-returning-${viewport.id}`,
      viewport: viewport.id,
      clickDepth,
      states,
      consoleErrors,
      pageErrors,
    });
  });
}

async function calendarJourney(browser, viewport) {
  const states = [];
  let clickDepth = 0;
  await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
    await reset(page, '/calendar?demo=ux12');
    states.push(await captureState(page, `journey-calendar-${viewport.id}-01-initial`, viewport));
    const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    if (await trigger.count()) {
      await trigger.click();
      clickDepth += 1;
      states.push(await captureState(page, `journey-calendar-${viewport.id}-02-picker`, viewport));
      const options = page.getByTestId('calendar-flow-scope-picker-option');
      const count = await options.count();
      if (count >= 2) {
        await options.nth(0).getByRole('checkbox').check();
        await options.nth(1).getByRole('checkbox').check();
        clickDepth += 2;
      }
      await page.getByTestId('calendar-flow-scope-picker-apply').click();
      clickDepth += 1;
      states.push(await captureState(page, `journey-calendar-${viewport.id}-03-selected`, viewport));
    }
    const dateMove = page.getByTestId('my-flow-calendar-date-move-entry');
    if (await dateMove.count() && await dateMove.isVisible()) {
      await dateMove.click();
      clickDepth += 1;
      states.push(await captureState(page, `journey-calendar-${viewport.id}-04-batch-date-move`, viewport));
    }
    results.journeys.push({
      id: `calendar-large-library-${viewport.id}`,
      viewport: viewport.id,
      clickDepth,
      states,
      consoleErrors,
      pageErrors,
    });
  });
}

async function undatedPlacementJourney(browser) {
  const viewport = viewports[0];
  const states = [];
  let clickDepth = 0;
  await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
    await reset(page, '/f/used-car-buying-check');
    const saveButton = page.getByTestId('public-flow-mobile-save-cta').locator('button[data-action-priority="primary"]');
    if (await saveButton.count()) {
      await saveButton.click();
      clickDepth += 1;
    }
    await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    states.push(await captureState(page, 'journey-undated-01-calendar-drawer', viewport));
    const toggle = page.getByTestId('my-flow-calendar-unscheduled-toggle');
    if (await toggle.count()) {
      await toggle.click();
      clickDepth += 1;
      states.push(await captureState(page, 'journey-undated-02-expanded', viewport));
      const item = page.getByTestId('my-flow-calendar-unscheduled-item').first();
      if (await item.count()) {
        await item.getByRole('checkbox').check();
        clickDepth += 1;
        await page.getByTestId('my-flow-calendar-unscheduled-date').fill('2030-08-20');
        clickDepth += 1;
        states.push(await captureState(page, 'journey-undated-03-placement-preview', viewport));
      }
    }
    results.journeys.push({
      id: 'undated-calendar-placement',
      viewport: viewport.id,
      clickDepth,
      states,
      consoleErrors,
      pageErrors,
    });
  });
}

async function compareShapes(browser) {
  const viewport = viewports[0];
  for (const candidate of shapeCases) {
    try {
      const comparison = await withContext(browser, viewport, async ({ page, consoleErrors, pageErrors }) => {
        await reset(page, `/f/${candidate.slug}`);
        const preview = page.getByTestId('flow-artifact-data-preview');
        const primaryShape = await preview.getAttribute('data-primary-shape');
        const buttons = await preview.getByRole('group', { name: '결과 형태' }).getByRole('button').allTextContents().catch(() => []);
        const selectedShape = await preview.getAttribute('data-selected-shape');
        const actualRowCount = await preview.locator('[data-testid="flow-artifact-preview-row"]').count();
        const initial = await captureState(page, `shape-${candidate.slug}-primary`, viewport);
        let alternate = null;
        if (buttons.length > 1) {
          await preview.getByRole('group', { name: '결과 형태' }).getByRole('button').nth(1).click();
          alternate = await captureState(page, `shape-${candidate.slug}-secondary`, viewport);
        }
        return {
          slug: candidate.slug,
          expected: candidate.expected,
          primaryShape,
          selectedShape,
          buttons,
          actualRowCount,
          recommendationReasonVisible: (await preview.getByText(/추천|이유|적합/u).count()) > 0,
          lossDisclosureVisible: (await preview.getByText(/손실|제외|빠짐|포함되지/u).count()) > 0,
          initial,
          alternate,
          consoleErrors,
          pageErrors,
        };
      });
      results.shapeComparison.push(comparison);
    } catch (error) {
      results.failures.push({ phase: 'shape-comparison', slug: candidate.slug, error: String(error?.stack ?? error) });
    }
  }
}

const browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
try {
  await initialRouteMatrix(browser);
  await movingJourney(browser).catch((error) => results.failures.push({ phase: 'moving-journey', error: String(error?.stack ?? error) }));
  await routineJourney(browser).catch((error) => results.failures.push({ phase: 'routine-journey', error: String(error?.stack ?? error) }));
  await myFlowJourney(browser, viewports[0]).catch((error) => results.failures.push({ phase: 'my-flow-mobile', error: String(error?.stack ?? error) }));
  await myFlowJourney(browser, viewports[1]).catch((error) => results.failures.push({ phase: 'my-flow-wide', error: String(error?.stack ?? error) }));
  await calendarJourney(browser, viewports[0]).catch((error) => results.failures.push({ phase: 'calendar-mobile', error: String(error?.stack ?? error) }));
  await calendarJourney(browser, viewports[1]).catch((error) => results.failures.push({ phase: 'calendar-wide', error: String(error?.stack ?? error) }));
  await undatedPlacementJourney(browser).catch((error) => results.failures.push({ phase: 'undated-placement', error: String(error?.stack ?? error) }));
  await compareShapes(browser);
} finally {
  await browser.close();
}

const allStates = [
  ...results.routeStates,
  ...results.journeys.flatMap((journey) => journey.states),
  ...results.shapeComparison.flatMap((shape) => [shape.initial, shape.alternate].filter(Boolean)),
];
results.totals = {
  capturedStateCount: allStates.length,
  screenshotCount: allStates.length,
  failureCount: results.failures.length,
  horizontalOverflowStateCount: allStates.filter((state) => state.metrics.horizontalOverflowPx > 1).length,
  unnamedFocusableCount: allStates.reduce((sum, state) => sum + state.metrics.unnamedFocusables.length, 0),
  consoleErrorCount: [
    ...results.routeStates,
    ...results.journeys,
    ...results.shapeComparison,
  ].reduce((sum, entry) => sum + (entry.consoleErrors?.length ?? 0), 0),
  pageErrorCount: [
    ...results.routeStates,
    ...results.journeys,
    ...results.shapeComparison,
  ].reduce((sum, entry) => sum + (entry.pageErrors?.length ?? 0), 0),
};

fs.writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(results.totals, null, 2)}\n`);
