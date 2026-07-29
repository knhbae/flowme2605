import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const BASE_URL = process.env.FLOWME_REVIEW_BASE_URL || 'https://flowme2605.vercel.app';
const OUTPUT_DIR = path.resolve(
  'docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-codex',
);
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

const SURFACES = [
  { id: 'home', route: '/' },
  { id: 'find', route: '/flows' },
  { id: 'my-flow-20', route: '/my?demo=ux20&view=flows' },
  { id: 'calendar-12', route: '/calendar?demo=ux12' },
  { id: 'moving', route: '/f/moving-d30-basic' },
  { id: 'vehicle', route: '/f/vehicle-inspection-prep' },
  { id: 'routine', route: '/f/curated-allblanc-morning-workout' },
  { id: 'wedding', route: '/f/curated-wedding-naver-timeline' },
  { id: 'mixed-travel', route: '/f/real-mofa-overseas-travel-prep' },
  { id: 'mixed-travel-replacement', route: '/f/overseas-safety-register' },
  { id: 'studio', route: '/u/my-flow-studio' },
];

const SCALE_SLUGS = [
  'moving-d30-basic',
  'fridge-cleanout-weekly-plan',
  'passport-renewal-docs',
  'english-study-30day-routine',
  'washer-tub-clean-monthly',
  'used-car-buying-check',
  'new-car-delivery-check',
  'wedding-d180-basic',
  'samsung-aircon-seasonal-check',
  'samsung-washer-filter-cleaning',
  'vehicle-inspection-prep',
  'computer-skills-d30-study',
  'real-samsung-aircon-seasonal-care',
  'real-samsung-washer-filter-care',
  'real-pet-registration-check',
  'national-scholarship-apply',
  'jeonse-guarantee-apply',
  'welfare-benefit-finder',
  'small-business-fund-check',
  'unemployment-benefit-apply',
  'job-seeker-allowance-apply',
  'pension-estimate-check',
  'infant-health-checkup-schedule',
  'adult-vaccine-schedule-check',
  'first-passport-issue',
  'overseas-safety-register',
  'customs-traveler-declare',
  'used-car-ownership-transfer',
  'ev-subsidy-apply',
  'property-local-tax-pay',
  'tax-refund-find',
  'safe-inheritance-onestop',
  'childcare-fee-support-apply',
  'military-exam-prep',
  'weekly-meal-plan',
  'closet-organize-1day',
  'kitchen-reset-organize',
  'reading-habit-30day',
  'travel-packing-list',
  'home-cafe-daily',
  'portfolio-4week',
  'blog-youtube-start',
  'pet-health-observation',
  'baby-150-start',
  'baby-160-start',
  'baby-170-start',
  'baby-180-start',
  'baby-cube',
  'wedding-vendor-board',
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function collectPageInventory(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const inFirstViewport = (element) => {
      if (!visible(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };
    const text = (element) => (element.textContent || '').replace(/\s+/g, ' ').trim();
    const name = (element) =>
      (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.getAttribute('alt') ||
        element.getAttribute('placeholder') ||
        text(element)
      ).trim();
    const focusables = Array.from(
      document.querySelectorAll(
        'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])',
      ),
    ).filter(visible);
    const fixed = Array.from(document.querySelectorAll('body *'))
      .filter((element) => {
        const position = window.getComputedStyle(element).position;
        return visible(element) && (position === 'fixed' || position === 'sticky');
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.getAttribute('data-testid'),
          text: text(element).slice(0, 100),
          position: window.getComputedStyle(element).position,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });
    const firstViewportElements = Array.from(document.querySelectorAll('main *')).filter(
      inFirstViewport,
    );
    const panelTestIds = Array.from(
      new Set(
        firstViewportElements
          .map((element) => element.getAttribute('data-testid'))
          .filter(
            (value) =>
              value &&
              /(card|panel|frame|workspace|preview|receipt|section|hub|rail|sheet)/.test(value),
          ),
      ),
    );
    const longExplanations = firstViewportElements
      .filter((element) => ['P', 'LI'].includes(element.tagName) && text(element).length >= 80)
      .map((element) => text(element).slice(0, 240))
      .slice(0, 20);
    return {
      title: document.title,
      pathname: `${location.pathname}${location.search}`,
      documentText: text(document.body).slice(0, 8000),
      firstViewportHeadings: Array.from(document.querySelectorAll('h1,h2,h3'))
        .filter(inFirstViewport)
        .map((element) => ({
          level: element.tagName.toLowerCase(),
          text: text(element).slice(0, 160),
        })),
      firstViewportCommands: focusables
        .filter(inFirstViewport)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute('role'),
          name: name(element).slice(0, 180),
          testId: element.getAttribute('data-testid'),
          disabled:
            element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true',
        })),
      visibleCommandCount: focusables.filter(inFirstViewport).length,
      unnamedFocusableCount: focusables.filter((element) => !name(element)).length,
      overflowPx: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      fullPageHeight: document.documentElement.scrollHeight,
      panelTestIds,
      longExplanations,
      fixed,
    };
  });
}

async function createContext(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
    colorScheme: 'light',
  });
  return context;
}

async function captureSurface(browser, surface, viewportName) {
  const viewport = VIEWPORTS[viewportName];
  const context = await createContext(browser, viewport);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const response = await page.goto(`${BASE_URL}${surface.route}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
  const inventory = await collectPageInventory(page);
  const screenshot = `${surface.id}-${viewportName}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, screenshot),
    fullPage: true,
  });
  await context.close();
  return {
    surfaceId: surface.id,
    route: surface.route,
    viewportName,
    viewport,
    httpStatus: response?.status(),
    screenshot,
    consoleErrors,
    pageErrors,
    ...inventory,
  };
}

async function captureScale(browser, requestedCount, viewportName) {
  const context = await createContext(browser, VIEWPORTS[viewportName]);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${BASE_URL}/my`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const seeded = await page.evaluate(({ requested, sourceSlugs }) => {
    const bundleKey = 'flow_builder_mvp_bundles_v11';
    const bundles = JSON.parse(window.localStorage.getItem(bundleKey) || '[]');
    const sourceBySlug = new Map(bundles.map((bundle) => [bundle.flow?.slug, bundle]));
    const selected = sourceSlugs
      .map((slug) => sourceBySlug.get(slug))
      .filter(Boolean)
      .slice(0, requested);
    const moving = sourceBySlug.get('moving-d30-basic') || selected[0];
    const synthetic = [];
    for (let index = selected.length; index < requested && moving; index += 1) {
      const suffix = String(index + 1).padStart(2, '0');
      const slug = `p31-review-scale-${suffix}`;
      const flowId = `${moving.flow.id}-${slug}`;
      const sectionIdBySource = new Map(
        moving.sections.map((section) => [section.id, `${section.id}-${slug}`]),
      );
      const itemIdBySource = new Map(
        moving.items.map((item) => [item.id, `${item.id}-${slug}`]),
      );
      synthetic.push({
        ...structuredClone(moving),
        flow: {
          ...structuredClone(moving.flow),
          id: flowId,
          slug,
          title: `이사 준비 비교 ${suffix}`,
          status: 'published',
          source_status: 'real',
          source_precision: 'exact',
        },
        sections: moving.sections.map((section) => ({
          ...structuredClone(section),
          id: sectionIdBySource.get(section.id),
          flow_id: flowId,
        })),
        items: moving.items.map((item) => ({
          ...structuredClone(item),
          id: itemIdBySource.get(item.id),
          flow_id: flowId,
          ...(item.section_id
            ? { section_id: sectionIdBySource.get(item.section_id) }
            : {}),
        })),
        itemDetails: (moving.itemDetails || []).map((detail) => ({
          ...structuredClone(detail),
          item_id: itemIdBySource.get(detail.item_id),
        })),
      });
    }
    const chosen = [...selected, ...synthetic].slice(0, requested);
    const syntheticIds = new Set(synthetic.map((bundle) => bundle.flow.id));
    window.localStorage.setItem(
      bundleKey,
      JSON.stringify([
        ...bundles.filter((bundle) => !syntheticIds.has(bundle.flow?.id)),
        ...synthetic,
      ]),
    );
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('flow:saved:'))
      .forEach((key) => window.localStorage.removeItem(key));
    const savedAt = '2026-07-24T00:00:00.000Z';
    chosen.forEach((bundle, index) => {
      const slug = bundle.flow.slug;
      window.localStorage.setItem(
        `flow:saved:${slug}`,
        JSON.stringify({
          slug,
          savedAt,
          selectedArtifactMode: 'calendar',
          dateIntent: 'custom',
          anchor: `2026-08-${String((index % 24) + 1).padStart(2, '0')}`,
        }),
      );
    });
    return {
      count: chosen.length,
      slugs: chosen.map((bundle) => bundle.flow.slug),
      syntheticCount: synthetic.length,
    };
  }, { requested: requestedCount, sourceSlugs: SCALE_SLUGS });
  await page.goto(`${BASE_URL}/my?view=flows`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(500);

  const viewFlow = page.getByTestId('my-flow-view-flow');
  let firstActionDepth = 0;
  if (await viewFlow.isVisible().catch(() => false)) {
    await viewFlow.click();
    firstActionDepth += 1;
  }

  const listInventory = await collectPageInventory(page);
  const listScreenshot = `scale-${requestedCount}-${viewportName}-list.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, listScreenshot),
    fullPage: true,
  });
  const mobileRows = page.getByTestId('my-flow-mobile-structure-row');
  const wideRows = page.getByTestId('my-flow-library-row');
  const renderedCountBeforeOpen = Math.max(await mobileRows.count(), await wideRows.count());
  const savedCountText = normalizeText(
    await page.getByTestId('my-flow-saved-count').textContent().catch(() => ''),
  );
  const reportedTotal = Number.parseInt(savedCountText, 10) || 0;
  const search = viewportName === 'mobile'
    ? page.getByTestId('my-flow-search')
    : page.getByTestId('my-flow-library-rail-search');
  const searchVisible = await search.isVisible().catch(() => false);

  let flowOpenDepth = firstActionDepth;
  if ((await mobileRows.count()) > 0) {
    await mobileRows.first().getByTestId('my-flow-mobile-structure-open').click();
    flowOpenDepth += 1;
  } else if ((await wideRows.count()) > 0) {
    await wideRows.first().click();
    flowOpenDepth += 1;
  }
  const workspaceVisible =
    (await page.getByTestId('my-flow-mobile-workspace').isVisible().catch(() => false)) ||
    (await page.getByTestId('my-flow-library-detail').isVisible().catch(() => false));

  const inventory = await collectPageInventory(page);
  const screenshot = `scale-${requestedCount}-${viewportName}-workspace.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, screenshot),
    fullPage: true,
  });
  await context.close();
  return {
    requestedCount,
    seededCount: seeded.count,
    syntheticCount: seeded.syntheticCount,
    reportedTotal,
    renderedCountBeforeOpen,
    viewportName,
    viewport: VIEWPORTS[viewportName],
    searchVisible,
    firstActionDepth,
    flowOpenDepth,
    workspaceVisible,
    screenshot,
    listScreenshot,
    listInventory,
    consoleErrors,
    pageErrors,
    ...inventory,
  };
}

async function run() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const startedAt = new Date().toISOString();
  const surfaceResults = [];
  const scaleResults = [];

  try {
    for (const viewportName of ['mobile', 'wide']) {
      for (const surface of SURFACES) {
        surfaceResults.push(await captureSurface(browser, surface, viewportName));
      }
    }
    for (const surface of SURFACES.filter((entry) =>
      ['my-flow-20', 'calendar-12', 'moving'].includes(entry.id),
    )) {
      surfaceResults.push(await captureSurface(browser, surface, 'desktop'));
    }
    for (const viewportName of ['mobile', 'wide']) {
      for (const count of [1, 5, 20, 60]) {
        scaleResults.push(await captureScale(browser, count, viewportName));
      }
    }
  } finally {
    await browser.close();
  }

  const result = {
    schemaVersion: 1,
    reviewerRole: 'codex_independent',
    baseUrl: BASE_URL,
    startedAt,
    completedAt: new Date().toISOString(),
    observedUserCount: 0,
    evidenceKind: 'current_browser_automation',
    surfaceResults,
    scaleResults,
  };
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'current-production-capture.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(
    `${JSON.stringify({
      surfaceCaptures: surfaceResults.length,
      scaleCaptures: scaleResults.length,
      consoleErrors: surfaceResults.reduce(
        (count, row) => count + row.consoleErrors.length + row.pageErrors.length,
        0,
      ),
      scaleConsoleErrors: scaleResults.reduce(
        (count, row) => count + row.consoleErrors.length + row.pageErrors.length,
        0,
      ),
      output: path.join(OUTPUT_DIR, 'current-production-capture.json'),
    })}\n`,
  );
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
