import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = 'https://flowme2605.vercel.app';
const outputDir = path.resolve(
  'docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-codex',
);
const screenshotDir = path.join(outputDir, 'screenshots');
const ajdUrl =
  'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363';

await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function compact(value, max = 1000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function createPage(viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(25_000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon.ico')) {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { context, page, consoleErrors, pageErrors };
}

async function reset(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

async function storedKeys(page) {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .sort()
      .filter((key) =>
        /flow:saved:|flow:map:saved:|flow:map:persistence:|anchorDate/.test(key),
      )
      .map((key) => ({ key, value: localStorage.getItem(key) })),
  );
}

async function artifactInteraction(page, route, targetShape) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  const preview = page.getByTestId('flow-artifact-data-preview');
  const choice = preview.locator(
    `[data-testid="flow-artifact-shape-choice"][data-artifact-shape="${targetShape}"]`,
  );
  const before = {
    selected: await preview.getAttribute('data-selected-shape'),
    heading: compact(
      await page.getByTestId('flow-save-before-primary-result').innerText().catch(() => ''),
      500,
    ),
    cta: compact(
      await page
        .locator(
          '[data-testid="public-flow-save-primary-mobile"], [data-testid="public-flow-save-primary"]',
        )
        .first()
        .innerText(),
      160,
    ),
  };
  await choice.click();
  const after = {
    selected: await preview.getAttribute('data-selected-shape'),
    heading: compact(
      await page.getByTestId('flow-save-before-primary-result').innerText().catch(() => ''),
      500,
    ),
    cta: compact(
      await page
        .locator(
          '[data-testid="public-flow-save-primary-mobile"], [data-testid="public-flow-save-primary"]',
        )
        .first()
        .innerText(),
      160,
    ),
  };
  return { route, targetShape, before, after };
}

const result = {
  schemaVersion: 'flowme.cross-entry-hypothesis-probe.v1',
  reviewerRole: 'codex_independent',
  production: baseUrl,
  capturedAt: new Date().toISOString(),
  observedUserCount: 0,
  checks: {},
};

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/');
  const homeCards = await page
    .getByTestId('home-usage-example')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.getAttribute('href'),
        text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
    );
  await page.getByTestId('home-usage-example').first().click();
  await page.waitForURL('**/f/moving-d30-basic');
  const publicMoving = {
    route: page.url().replace(baseUrl, ''),
    title: compact(await page.locator('h1').first().innerText()),
    shapeLabels: await page
      .getByTestId('flow-artifact-shape-choice')
      .allTextContents()
      .then((values) => values.map((value) => compact(value, 120))),
    visiblePreviewRows: await page.getByTestId('flow-artifact-preview-row').count(),
    sourceHref: await page.locator('a[href^="http"]').first().getAttribute('href'),
  };
  result.checks.homePromise = {
    homeCards,
    publicMoving,
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await context.close();
}

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/flows');
  const serverEarly = await page
    .getByTestId('flow-map-catalog-card')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.querySelector('a[href^="/"]')?.getAttribute('href') ?? null,
        text: (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
      })),
    );
  await page.waitForTimeout(1800);
  const hydrated = await page
    .getByTestId('flow-map-catalog-card')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.querySelector('a[href^="/"]')?.getAttribute('href') ?? null,
        text: (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
      })),
    );
  result.checks.catalogRouting = {
    serverEarly,
    hydrated,
    firstFiveKinds: hydrated.slice(0, 5).map((entry) => entry.href),
    lastFourKinds: hydrated.slice(-4).map((entry) => entry.href),
    vehiclePublicPresent: hydrated.some(
      (entry) => entry.href === '/f/vehicle-inspection-prep',
    ),
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await context.close();
}

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/f/moving-d30-basic');
  result.checks.artifactChoice = {
    moving: await artifactInteraction(page, '/f/moving-d30-basic', 'checklist'),
    vehicle: await artifactInteraction(page, '/f/vehicle-inspection-prep', 'checklist'),
    wedding: await artifactInteraction(
      page,
      '/f/curated-wedding-naver-timeline',
      'checklist',
    ),
    workout: await artifactInteraction(
      page,
      '/f/curated-allblanc-morning-workout',
      'calendar',
    ),
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await context.close();
}

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
  await page.getByTestId('public-flow-save-primary-mobile').click();
  const receipt = page.getByTestId('public-flow-saved-receipt');
  await receipt.waitFor();
  const receiptEvidence = {
    route: page.url().replace(baseUrl, ''),
    text: compact(await receipt.innerText(), 1500),
    primaryHref: await receipt
      .getByTestId('public-flow-saved-receipt-primary')
      .getAttribute('href'),
    keys: await storedKeys(page),
  };
  await receipt.getByTestId('public-flow-saved-receipt-primary').click();
  await page.waitForURL(/\/my/);
  await page.waitForLoadState('networkidle');
  receiptEvidence.myRoute = page.url().replace(baseUrl, '');
  receiptEvidence.myText = compact(await page.locator('main').innerText(), 2500);
  receiptEvidence.myFlowSlugs = await page
    .locator('[data-flow-slug]')
    .evaluateAll((nodes) =>
      [...new Set(nodes.map((node) => node.getAttribute('data-flow-slug')).filter(Boolean))],
    );
  result.checks.publicReceipt = {
    ...receiptEvidence,
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await page.screenshot({
    path: path.join(screenshotDir, 'hypothesis-public-receipt-my-flow-mobile.png'),
    fullPage: true,
  });
  await context.close();
}

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/flow-maps/moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL(/\/my/);
  await page.waitForLoadState('networkidle');
  result.checks.mapReceipt = {
    route: page.url().replace(baseUrl, ''),
    receiptText: compact(
      await page.getByTestId('my-flow-post-save-panel').innerText(),
      1800,
    ),
    receiptStepCount: await page.getByTestId('my-flow-post-save-step').count(),
    keys: await storedKeys(page),
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await context.close();
}

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/flows');
  const entry = page.getByTestId('flow-url-lookup-entry');
  await entry.getByLabel('URL 또는 메모').fill(ajdUrl);
  await entry.getByRole('button', { name: 'Flow 찾기' }).click();
  const lookup = page.getByTestId('flow-url-lookup-result');
  await lookup.waitFor();
  const detailHref = await lookup
    .getByRole('link', { name: '전체 내용 열고 조정' })
    .getAttribute('href');
  const quick = lookup.getByTestId('flow-url-quick-start');
  await quick.locator('summary').click();
  await lookup.getByTestId('url-first-start-date-input').fill('2030-08-15');
  await lookup.getByRole('button', { name: '시작하기' }).click();
  await page.waitForURL(/\/my/);
  await page.waitForLoadState('networkidle');
  result.checks.urlLookupReceipt = {
    detailHref,
    route: page.url().replace(baseUrl, ''),
    receiptText: compact(
      await page.getByTestId('my-flow-post-save-panel').innerText(),
      1800,
    ),
    receiptStepCount: await page.getByTestId('my-flow-post-save-step').count(),
    keys: await storedKeys(page),
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await context.close();
}

{
  const { context, page, consoleErrors, pageErrors } = await createPage();
  await reset(page, '/f/curated-allblanc-morning-workout');
  const initial = {
    anchor: await page.getByTestId('public-flow-anchor-input').inputValue(),
    cta: compact(
      await page.getByTestId('public-flow-save-primary-mobile').innerText(),
      180,
    ),
  };
  await page.getByTestId('public-flow-save-primary-mobile').click();
  const receipt = page.getByTestId('public-flow-saved-receipt');
  await receipt.waitFor();
  const saved = {
    receiptText: compact(await receipt.innerText(), 1500),
    keys: await storedKeys(page),
  };
  await receipt.getByTestId('public-flow-saved-receipt-primary').click();
  await page.waitForURL(/\/my/);
  await page.waitForLoadState('networkidle');
  await page.goto(`${baseUrl}/my?view=flows`, { waitUntil: 'networkidle' });
  if (await page.getByTestId('my-flow-mobile-structure-open').count()) {
    await page.getByTestId('my-flow-mobile-structure-open').click();
    await page.waitForTimeout(250);
  }
  const myText = compact(await page.locator('main').innerText(), 10_000);
  await page.goto(`${baseUrl}/calendar`, { waitUntil: 'networkidle' });
  const calendarText = compact(await page.locator('main').innerText(), 10_000);
  result.checks.undatedWorkout = {
    initial,
    saved,
    rawRruleInMyFlow: /RRULE:|FREQ=WEEKLY/.test(myText),
    rawRruleInCalendar: /RRULE:|FREQ=WEEKLY/.test(calendarText),
    myFlowExcerpt: compact(myText, 2400),
    calendarExcerpt: compact(calendarText, 2400),
    consoleErrors,
    pageErrors,
    evidenceKind: 'current_production_interaction',
  };
  await page.screenshot({
    path: path.join(screenshotDir, 'hypothesis-undated-workout-calendar-mobile.png'),
    fullPage: true,
  });
  await context.close();
}

await browser.close();

await fs.writeFile(
  path.join(outputDir, 'cross-entry-hypothesis-probe.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

console.log(
  JSON.stringify(
    {
      checks: Object.keys(result.checks),
      consoleErrors: Object.values(result.checks).reduce(
        (count, check) => count + (check.consoleErrors?.length ?? 0),
        0,
      ),
      pageErrors: Object.values(result.checks).reduce(
        (count, check) => count + (check.pageErrors?.length ?? 0),
        0,
      ),
    },
    null,
    2,
  ),
);
