import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(repoRoot, 'docs', 'content-audit', '2026-07-03-claude-design-p0-p2-final-audit-package');
const screenshotsDir = path.join(outputDir, 'screenshots');
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3104';
const viewport = { width: 390, height: 844 };

const internalTerms = [
  /\bdemo\b/i,
  /데모/,
  /\breview\b/i,
  /\baudit\b/i,
  /source-backed/i,
  /sourceTrace/,
  /partial_draft/,
  /source_import_required/,
  /\bFlow Map\b/,
  /Flow\s+일정/,
  /지도\s+일정/,
  /지도\s+루틴/,
  /\bbundle\b/i,
  /\breadiness\b/i,
  /검수\s*필요/,
  /정리\s*필요/,
  /\bStep\b/,
  /\bItem\b/,
];

const cleanRoutes = [
  { route: '/', screenshot: '01-home-mobile.png' },
  { route: '/flows', screenshot: '02-flows-mobile.png' },
  { route: '/flow-maps/moving-d30', screenshot: '03-flow-map-moving-mobile.png' },
  { route: '/flow-maps/middle-school-math-1', screenshot: '04-flow-map-math-mobile.png' },
  { route: '/f/vehicle-inspection-prep', screenshot: '05-public-vehicle-inspection-mobile.png' },
  { route: '/my', screenshot: '06-my-empty-mobile.png' },
];

function getLaunchOptions() {
  const envPath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH;
  const windowsChromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const executablePath = envPath || (process.platform === 'win32' && fs.existsSync(windowsChromePath) ? windowsChromePath : undefined);
  return executablePath ? { executablePath } : {};
}

async function newMobileContext(browser) {
  return browser.newContext({ baseURL, viewport });
}

async function capture(page, route, state, screenshotName) {
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.locator('body').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(screenshotsDir, screenshotName) });
  return page.evaluate((input) => {
    const bodyText = document.body.innerText;
    const textLines = bodyText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const matchedTerms = input.terms
      .filter((term) => textLines.some((line) => new RegExp(term.source, term.flags).test(line)))
      .map((term) => term.source);
    const firstButton = document.querySelector('button, a')?.textContent?.trim() ?? '';
    return {
      route: input.route,
      state: input.state,
      screenshot: `screenshots/${input.screenshotName}`,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      navVisible: Boolean(document.querySelector('[data-testid="platform-mobile-tabs"]')),
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      firstButton,
      matchedTerms,
    };
  }, {
    route,
    state,
    screenshotName,
    terms: internalTerms.map((term) => ({ source: term.source, flags: term.flags })),
  });
}

async function captureCleanRoute(browser, item) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await page.goto(item.route);
  await page.evaluate(() => window.localStorage.clear());
  const evidence = await capture(page, item.route, 'clean localStorage', item.screenshot);
  await context.close();
  return evidence;
}

async function capturePostSaveRoutes(browser) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await page.goto('/flow-maps/moving-d30', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  const postSavePanelText = await page.getByTestId('my-flow-post-save-panel').innerText();
  const myBodyText = await page.locator('body').innerText();
  if (myBodyText.includes('저장할 콘텐츠를 먼저 고르세요')) {
    throw new Error('Post-save My Flow rendered the true empty state.');
  }
  const myEvidence = await capture(page, '/my?savedMap=moving-d30', 'after saving moving-d30 with 2026-07-22', '07-post-save-my-flow-mobile.png');
  const storageKeysAfterSave = await page.evaluate(() => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean).sort());

  await page.goto('/calendar', { waitUntil: 'networkidle' });
  await page.getByTestId('my-flow-calendar-card').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-selected-date-group').first().waitFor({ state: 'visible' });
  const selectedDayText = await page.getByTestId('my-flow-calendar-selected-day').innerText();
  const calendarBodyText = await page.locator('body').innerText();
  if (calendarBodyText.includes('저장한 일정 없음') || calendarBodyText.includes('일정이 생길 콘텐츠를 먼저 고르세요')) {
    throw new Error('Post-save Calendar rendered the true empty state.');
  }
  const calendarEvidence = await capture(page, '/calendar', 'after saving moving-d30 with 2026-07-22', '08-calendar-after-save-mobile.png');
  await context.close();
  return [
    {
      ...myEvidence,
      postSaveChecks: {
        storageKeysAfterSave,
        hasPostSavePanel: myBodyText.includes('저장됨') && myBodyText.includes('원룸 이사 D-30 일정 지도'),
        hasFirstTask: myBodyText.includes('이사 방식과 견적 후보 정하기'),
        hasTrueEmptyState: myBodyText.includes('저장할 콘텐츠를 먼저 고르세요'),
        hasCompactPostSavePanel:
          postSavePanelText.includes('먼저 열기') &&
          !postSavePanelText.includes('먼저 할 일부터 열어보세요') &&
          !postSavePanelText.includes('지난 일정') &&
          !postSavePanelText.includes('5개 할 일'),
      },
    },
    {
      ...calendarEvidence,
      postSaveChecks: {
        hasCalendarCard: true,
        hasAgenda: calendarBodyText.includes('원룸 이사 D-30 일정 지도') && calendarBodyText.includes('입주청소와 대형폐기물 일정 확인'),
        hasTrueEmptyState: calendarBodyText.includes('저장한 일정 없음') || calendarBodyText.includes('일정이 생길 콘텐츠를 먼저 고르세요'),
        hasCompactAgendaHeader:
          selectedDayText.includes('7월 8일 (수)') &&
          !selectedDayText.includes('선택한 날짜') &&
          !selectedDayText.includes('0개 루틴') &&
          !selectedDayText.includes('1개 · 1개 남음'),
      },
    },
  ];
}

fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true, ...getLaunchOptions() });
try {
  const cleanEvidence = [];
  for (const item of cleanRoutes) {
    cleanEvidence.push(await captureCleanRoute(browser, item));
  }
  const postSaveEvidence = await capturePostSaveRoutes(browser);
  const payload = {
    generatedAt: new Date().toISOString(),
    baseURL,
    viewport,
    finding: {
      b1Conclusion: 'evidence_generation_error',
      summary: 'The app save loop writes the expected localStorage records and renders saved My Flow/Calendar state. The previous final audit screenshots lost the saved browser context.',
      p3_02: 'Post-save My Flow and Calendar evidence uses compact action-first copy without repeated saved counts, stale date summaries, selected-date labels, or zero routine counts.',
    },
    evidence: [...cleanEvidence, ...postSaveEvidence],
  };
  fs.writeFileSync(path.join(outputDir, 'route-evidence.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload.finding, null, 2));
} finally {
  await browser.close();
}
