import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PRODUCTION = 'https://flowme2605.vercel.app';
const OUTPUT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const surfaces = [
  { id: 'home-mobile', route: '/', viewport: { width: 390, height: 844 } },
  { id: 'home-wide', route: '/', viewport: { width: 1024, height: 768 } },
  { id: 'find-mobile', route: '/flows', viewport: { width: 390, height: 844 } },
  { id: 'find-wide', route: '/flows', viewport: { width: 1024, height: 768 } },
  { id: 'moving-public-mobile', route: '/f/moving-d30-basic', viewport: { width: 390, height: 844 } },
  { id: 'moving-public-wide', route: '/f/moving-d30-basic', viewport: { width: 1024, height: 768 } },
  { id: 'moving-public-desktop', route: '/f/moving-d30-basic', viewport: { width: 1440, height: 900 } },
  { id: 'moving-map-mobile', route: '/flow-maps/moving-d30', viewport: { width: 390, height: 844 } },
  { id: 'moving-map-wide', route: '/flow-maps/moving-d30', viewport: { width: 1024, height: 768 } },
  { id: 'moving-map-desktop', route: '/flow-maps/moving-d30', viewport: { width: 1440, height: 900 } },
  { id: 'moving-curated-map-mobile', route: '/flow-maps/curated-ajd-moving-d30', viewport: { width: 390, height: 844 } },
  { id: 'moving-curated-flow-mobile', route: '/f/curated-ajd-moving-d30', viewport: { width: 390, height: 844 } },
  { id: 'moving-source-backed-flow-mobile', route: '/f/source-backed-moving-d30', viewport: { width: 390, height: 844 } },
  { id: 'vehicle-mobile', route: '/f/vehicle-inspection-prep', viewport: { width: 390, height: 844 } },
  { id: 'vehicle-wide', route: '/f/vehicle-inspection-prep', viewport: { width: 1024, height: 768 } },
  { id: 'workout-mobile', route: '/f/curated-allblanc-morning-workout', viewport: { width: 390, height: 844 } },
  { id: 'workout-wide', route: '/f/curated-allblanc-morning-workout', viewport: { width: 1024, height: 768 } },
  { id: 'wedding-mobile', route: '/f/curated-wedding-naver-timeline', viewport: { width: 390, height: 844 } },
  { id: 'wedding-wide', route: '/f/curated-wedding-naver-timeline', viewport: { width: 1024, height: 768 } },
  { id: 'my-empty-mobile', route: '/my?view=flows', viewport: { width: 390, height: 844 } },
  { id: 'calendar-empty-mobile', route: '/calendar', viewport: { width: 390, height: 844 } },
];

function sanitizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

async function inspectSurface(browser, surface) {
  const context = await browser.newContext({ viewport: surface.viewport, timezoneId: 'Asia/Seoul' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const responseFailures = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.request().resourceType() === 'document') {
      responseFailures.push({ url: response.url(), status: response.status() });
    }
  });

  const response = await page.goto(`${PRODUCTION}${surface.route}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.waitForTimeout(350);

  const screenshotPath = path.join(SCREENSHOT_DIR, `${surface.id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const evidence = await page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const text = (selector) =>
      [...document.querySelectorAll(selector)]
        .filter(visible)
        .map((element) => (element.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const focusables = [
      ...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]'),
    ].filter((element) => visible(element) && element.getAttribute('tabindex') !== '-1' && !element.hasAttribute('disabled'));
    const accessibleName = (element) =>
      (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        element.getAttribute('value') ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();

    return {
      url: location.href,
      title: document.title,
      headings: text('h1,h2,h3').slice(0, 30),
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000),
      primaryActions: [
        ...document.querySelectorAll('[data-action-priority="primary"], [data-testid*="save-primary"], [data-testid*="save-all"]'),
      ]
        .filter(visible)
        .map((element) => ({
          testId: element.getAttribute('data-testid'),
          text: accessibleName(element),
          tag: element.tagName,
        })),
      artifactChoices: [...document.querySelectorAll('[data-testid="flow-artifact-shape-choice"]')]
        .filter(visible)
        .map((element) => ({
          shape: element.getAttribute('data-artifact-shape'),
          pressed: element.getAttribute('aria-pressed'),
          text: accessibleName(element),
        })),
      selectedArtifactShapes: [...document.querySelectorAll('[data-selected-shape]')]
        .filter(visible)
        .map((element) => element.getAttribute('data-selected-shape')),
      publicPreviewRowCount: document.querySelectorAll('[data-testid="public-flow-artifact-preview-row"]').length,
      mapPreviewRowCount: document.querySelectorAll('[data-testid="flow-map-artifact-preview-row"]').length,
      catalogCardCount: document.querySelectorAll('[data-testid="flow-map-catalog-card"]').length,
      homeUsageExampleCount: document.querySelectorAll('[data-testid="home-usage-example"]').length,
      sourceLinks: [...document.querySelectorAll('a[href]')]
        .filter(visible)
        .map((element) => ({
          href: element.getAttribute('href'),
          text: accessibleName(element),
        }))
        .filter((entry) => /원문|출처|AJD|Allblanc|네이버/u.test(`${entry.text} ${entry.href}`))
        .slice(0, 20),
      focusedTestIds: [...document.querySelectorAll('[data-testid]')]
        .filter(visible)
        .map((element) => element.getAttribute('data-testid'))
        .filter(Boolean)
        .filter((id) => /flow|artifact|receipt|calendar|workspace|catalog|source/u.test(id))
        .slice(0, 160),
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      fixedOverlaps: [...document.querySelectorAll('*')]
        .filter((element) => {
          const style = window.getComputedStyle(element);
          if (!['fixed', 'sticky'].includes(style.position) || !visible(element)) return false;
          const rect = element.getBoundingClientRect();
          return rect.bottom > window.innerHeight + 1 || rect.top < -1;
        })
        .map((element) => ({
          tag: element.tagName,
          testId: element.getAttribute('data-testid'),
          text: accessibleName(element).slice(0, 100),
        })),
      focusableCount: focusables.length,
      unnamedFocusables: focusables
        .filter((element) => !accessibleName(element))
        .map((element) => element.outerHTML.slice(0, 200)),
    };
  });

  await context.close();
  return {
    id: surface.id,
    route: surface.route,
    viewport: surface.viewport,
    httpStatus: response?.status(),
    finalUrl: evidence.url,
    title: evidence.title,
    headings: evidence.headings,
    bodyText: sanitizeText(evidence.bodyText),
    primaryActions: evidence.primaryActions,
    artifactChoices: evidence.artifactChoices,
    selectedArtifactShapes: evidence.selectedArtifactShapes,
    publicPreviewRowCount: evidence.publicPreviewRowCount,
    mapPreviewRowCount: evidence.mapPreviewRowCount,
    catalogCardCount: evidence.catalogCardCount,
    homeUsageExampleCount: evidence.homeUsageExampleCount,
    sourceLinks: evidence.sourceLinks,
    focusedTestIds: evidence.focusedTestIds,
    horizontalOverflow: evidence.horizontalOverflow,
    scrollWidth: evidence.scrollWidth,
    clientWidth: evidence.clientWidth,
    fixedOverlaps: evidence.fixedOverlaps,
    focusableCount: evidence.focusableCount,
    unnamedFocusables: evidence.unnamedFocusables,
    consoleErrors,
    pageErrors,
    responseFailures,
    screenshot: `screenshots/${surface.id}.png`,
    evidenceKind: 'current_browser_automation',
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const surface of surfaces) {
  try {
    results.push(await inspectSurface(browser, surface));
    process.stdout.write(`captured ${surface.id}\n`);
  } catch (error) {
    results.push({
      id: surface.id,
      route: surface.route,
      viewport: surface.viewport,
      error: error instanceof Error ? error.message : String(error),
      evidenceKind: 'current_browser_automation',
    });
    process.stderr.write(`failed ${surface.id}: ${error}\n`);
  }
}

await browser.close();

const output = {
  schemaVersion: 1,
  reviewerRole: 'codex_independent',
  production: PRODUCTION,
  capturedAt: new Date().toISOString(),
  observedUserCount: 0,
  surfaces: results,
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'current-production-capture.json'),
  `${JSON.stringify(output, null, 2)}\n`,
  'utf8',
);

process.stdout.write(`${JSON.stringify({
  surfaceCount: results.length,
  failedCount: results.filter((result) => result.error).length,
  overflowCount: results.filter((result) => result.horizontalOverflow).length,
  consoleErrorCount: results.reduce((total, result) => total + (result.consoleErrors?.length ?? 0), 0),
  pageErrorCount: results.reduce((total, result) => total + (result.pageErrors?.length ?? 0), 0),
}, null, 2)}\n`);
