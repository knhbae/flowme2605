import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const baseURL = process.env.FLOWME_SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3104';
const outputDir = path.join(repoRoot, 'output', 'playwright', 'flowme-uxui-supplemental-screenshots-2026-07-04');
const screenshotsDir = path.join(outputDir, 'screenshots');
const viewport = { width: 390, height: 844 };

const manifest = [];

function getLaunchOptions() {
  const envPath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH;
  const windowsChromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const executablePath = envPath || (process.platform === 'win32' && fs.existsSync(windowsChromePath) ? windowsChromePath : undefined);
  return executablePath ? { executablePath } : {};
}

async function createPage(browser) {
  const context = await browser.newContext({ baseURL, viewport });
  const page = await context.newPage();
  return { context, page };
}

async function settle(page) {
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForTimeout(250);
}

async function capture(page, filename, title, description, options = {}) {
  await settle(page);
  const screenshotPath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: Boolean(options.fullPage) });
  const textSample = await page.locator('body').innerText().catch(() => '');
  const record = {
    file: `screenshots/${filename}`,
    title,
    description,
    url: page.url(),
    fullPage: Boolean(options.fullPage),
    textSample: textSample.replace(/\s+/g, ' ').trim().slice(0, 420),
  };
  manifest.push(record);
  console.log(`captured ${filename}`);
}

async function openFlowMap(page, slug) {
  await page.goto(`/flow-maps/${slug}`, { waitUntil: 'networkidle' });
  await settle(page);
}

async function saveMovingMap(page, options = {}) {
  const captureBeforeSave = options.captureBeforeSave ?? true;
  await openFlowMap(page, 'moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  if (captureBeforeSave) {
    await capture(
      page,
      '01-moving-map-date-filled-before-save.png',
      'Moving map before save',
      'Flow Map detail with the moving date filled before saving.',
    );
  }
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
}

async function openPostSaveFirstTask(page) {
  await page.getByTestId('my-flow-post-save-open-first').click();
  await page.getByTestId('my-flow-now-section').getByTestId('my-flow-inline-detail').waitFor({ state: 'visible' });
}

async function switchToSavedContent(page) {
  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-view-flow').waitFor({ state: 'visible' });
  await settle(page);
}

async function captureCalendarAfterSave(page, prefix) {
  await page.goto('/calendar', { waitUntil: 'networkidle' });
  await page.getByTestId('my-flow-calendar-card').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-calendar-selected-day').waitFor({ state: 'visible' });
  await capture(
    page,
    `${prefix}-calendar-agenda-top.png`,
    'Calendar after save: agenda top',
    'Calendar route after saving, with the selected-day agenda visible.',
  );

  await page.getByTestId('my-flow-calendar-card').scrollIntoViewIfNeeded();
  await capture(
    page,
    `${prefix}-calendar-month-grid.png`,
    'Calendar after save: month grid',
    'Month grid and schedule markers after saved rows are available.',
  );

  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  const firstRow = selectedDay.locator('article').first();
  if ((await firstRow.count()) > 0) {
    const firstButton = firstRow.getByRole('button').first();
    if ((await firstButton.count()) > 0) {
      await firstButton.click();
      await selectedDay.getByTestId('my-flow-item-detail').waitFor({ state: 'visible' });
      await capture(
        page,
        `${prefix}-calendar-agenda-detail-open.png`,
        'Calendar after save: selected item detail',
        'Selected agenda row opened to show task detail, memo/source/export access area.',
      );
    }
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(
    page,
    `${prefix}-calendar-bottom-spacing.png`,
    'Calendar bottom spacing',
    'Bottom of Calendar route to show content is not hidden by the fixed mobile tabs.',
  );
}

async function scenarioMoving(browser) {
  const { context, page } = await createPage(browser);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());

  await saveMovingMap(page);
  await capture(
    page,
    '02-moving-post-save-my-flow-top.png',
    'Moving post-save My Flow top',
    'Immediately after saving moving-d30, showing the saved banner and first executable task.',
  );

  await openPostSaveFirstTask(page);
  await capture(
    page,
    '03-moving-post-save-first-task-open.png',
    'Moving first task opened',
    'Post-save first task opened in My Flow, with detail and checklist content visible.',
  );

  await switchToSavedContent(page);
  await capture(
    page,
    '04-moving-my-flow-saved-content-list.png',
    'Moving saved content list',
    'My Flow saved-content view after saving moving-d30.',
  );

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(
    page,
    '05-moving-my-flow-bottom-spacing.png',
    'Moving My Flow bottom spacing',
    'Bottom of My Flow after saving, showing content clears the fixed mobile tabs.',
  );

  await captureCalendarAfterSave(page, '06-moving');
  await context.close();
}

async function scenarioMath(browser) {
  const { context, page } = await createPage(browser);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());

  await openFlowMap(page, 'middle-school-math-1');
  await capture(
    page,
    '10-math-map-before-save.png',
    'Math map before save',
    'Date-less math source-backed map before saving.',
  );
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=middle-school-math-1');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await capture(
    page,
    '11-math-post-save-my-flow-top.png',
    'Math post-save My Flow top',
    'Date-less content saved into My Flow, showing a first executable fallback instead of an empty state.',
  );

  await openPostSaveFirstTask(page);
  await capture(
    page,
    '12-math-post-save-first-task-open.png',
    'Math first task opened',
    'Date-less saved content with its first study task opened.',
  );

  await switchToSavedContent(page);
  await capture(
    page,
    '13-math-my-flow-saved-content-list.png',
    'Math saved content list',
    'My Flow saved-content view for the date-less math map.',
  );
  await context.close();
}

async function scenarioMultiple(browser) {
  const { context, page } = await createPage(browser);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());

  await saveMovingMap(page, { captureBeforeSave: false });
  await openFlowMap(page, 'middle-school-math-1');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=middle-school-math-1');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });

  await page.goto('/my', { waitUntil: 'networkidle' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  await capture(
    page,
    '14-multiple-saved-my-flow-top.png',
    'Multiple saved: My Flow top',
    'My Flow normal entry with moving and math content both saved.',
  );

  await switchToSavedContent(page);
  await capture(
    page,
    '15-multiple-saved-content-list.png',
    'Multiple saved: content list',
    'Saved-content list showing more than one saved content card.',
  );

  await captureCalendarAfterSave(page, '16-multiple');
  await context.close();
}

async function scenarioPublicFlow(browser) {
  const { context, page } = await createPage(browser);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/f/vehicle-inspection-prep', { waitUntil: 'networkidle' });
  await capture(
    page,
    '20-public-flow-before-save.png',
    'Public Flow before save',
    'Public Flow detail with app shell and save action visible.',
  );

  const publicSaveActions = page.getByTestId('public-flow-save-actions');
  const button = publicSaveActions.locator('button').first();
  if ((await button.count()) > 0) {
    await button.click({ timeout: 5000 });
    const myFlowLink = publicSaveActions.locator('a[href="/my"]').first();
    if ((await myFlowLink.count()) > 0) {
      await myFlowLink.click({ timeout: 5000 });
      await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
      await capture(
        page,
        '21-public-flow-after-save-my-flow.png',
        'Public Flow after save',
        'My Flow after saving a public Flow, included for shell and post-save comparison.',
      );
    }
  }
  await context.close();
}

function writeArtifacts() {
  const manifestPayload = {
    generatedAt: new Date().toISOString(),
    baseURL,
    viewport,
    purpose: 'Supplemental screenshots for Claude Design review. Focus: post-save My Flow, Calendar after saved state, date-less saved fallback, multiple saved content states, and mobile bottom spacing.',
    screenshots: manifest,
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifestPayload, null, 2)}\n`, 'utf8');

  const readme = [
    '# FlowMe UX/UI Supplemental Screenshots',
    '',
    'This package supplements the previous Claude Design review zip. The earlier set did not show enough saved-state evidence for My Flow and Calendar.',
    '',
    `- Captured at: ${manifestPayload.generatedAt}`,
    `- Base URL: ${baseURL}`,
    `- Viewport: ${viewport.width} x ${viewport.height}`,
    '- Focus: moving map save, date-less math save, multiple saved content, calendar agenda/detail, bottom spacing.',
    '',
    '## Screenshot Index',
    '',
    ...manifest.map((item, index) => `${index + 1}. \`${item.file}\` - ${item.title}: ${item.description}`),
    '',
    '## How To Review',
    '',
    'Open `index.html` first. It shows every screenshot with the route URL and the reason the frame was captured.',
    'Use `manifest.json` if you need route, title, and text sample metadata.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf8');

  const cards = manifest
    .map((item, index) => {
      const alt = `${index + 1}. ${item.title}`.replace(/"/g, '&quot;');
      return `<article><h2>${String(index + 1).padStart(2, '0')}. ${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p><p class="url">${escapeHtml(item.url)}</p><img src="${item.file.replaceAll('\\', '/')}" alt="${alt}"></article>`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe UX/UI Supplemental Screenshots</title>
  <style>
    body { margin: 0; background: #fafaf8; color: #1b1a17; font-family: Arial, sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .lead { margin: 0 0 24px; color: #5f5b53; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
    article { border: 1px solid #e7e4dd; border-radius: 16px; background: #fff; padding: 14px; box-shadow: 0 8px 28px rgba(27, 26, 23, 0.06); }
    h2 { margin: 0 0 6px; font-size: 15px; }
    p { margin: 0 0 8px; font-size: 13px; line-height: 1.45; color: #5f5b53; }
    .url { overflow-wrap: anywhere; font-size: 11px; color: #7a756c; }
    img { width: 100%; height: auto; border: 1px solid #ece8df; border-radius: 14px; background: #fafaf8; }
  </style>
</head>
<body>
  <main>
    <h1>FlowMe UX/UI Supplemental Screenshots</h1>
    <p class="lead">Additional mobile 390px evidence for post-save My Flow, Calendar after saved state, date-less saved fallback, multiple saved content states, and bottom spacing.</p>
    <section class="grid">
${cards}
    </section>
  </main>
</body>
</html>
`;
  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

fs.rmSync(screenshotsDir, { recursive: true, force: true });
for (const filename of ['manifest.json', 'README.md', 'index.html']) {
  fs.rmSync(path.join(outputDir, filename), { force: true });
}
fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true, ...getLaunchOptions() });
try {
  await scenarioMoving(browser);
  await scenarioMath(browser);
  await scenarioMultiple(browser);
  await scenarioPublicFlow(browser);
} finally {
  await browser.close();
}

writeArtifacts();
console.log(`wrote ${manifest.length} screenshots to ${outputDir}`);
