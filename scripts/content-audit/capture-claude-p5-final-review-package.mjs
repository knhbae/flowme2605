import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageName = '2026-07-04-claude-design-p5-final-review-package';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const viewport = { width: 390, height: 844 };
const branchName = getCommandOutput('git', ['branch', '--show-current']) || 'codex/flowme-uxui-second-loop';
const baselineCommit = getCommandOutput('git', ['rev-parse', '--short', 'HEAD']) || 'unknown';
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL || `http://127.0.0.1:${process.env.FLOWME_EVIDENCE_PORT || '3219'}`;
const shouldStartServer = !process.env.FLOWME_EVIDENCE_BASE_URL;
const githubBase = `https://github.com/knhbae/flowme2605/blob/${branchName}/flow-mvp`;

const internalTerms = [
  /\bdemo\b/i,
  /\breview\b/i,
  /\baudit\b/i,
  /source-backed/i,
  /sourceTrace/,
  /partial_draft/,
  /source_import_required/,
  /검수 필요/,
  /정리 필요/,
  /\bFlow Map\b/,
  /\bbundle\b/i,
  /\breadiness\b/i,
  /\bStep\b/,
  /\bItem\b/,
];

const p5DisplayTerms = [
  /Mathbang/i,
  /일정 지도/,
  /저장한 지도/,
  /지도 원문/,
  /진도형 Flow/,
];

const allowedFlowSuffixLines = new Set([
  'Flow',
  '내 Flow',
  'Flow 찾기',
  'FlowMe',
  '내 Flow에 저장',
  '내 Flow에서 보기',
]);

const routeShots = [
  { route: '/', file: '01-home-mobile.png', label: '홈 첫 진입' },
  { route: '/flows', file: '02-flows-mobile.png', label: 'Flow 찾기 목록' },
  { route: '/flow-maps/moving-d30', file: '03-flow-map-moving-mobile.png', label: 'Flow Map 이사 저장 전' },
  { route: '/flow-maps/middle-school-math-1', file: '04-flow-map-math-mobile.png', label: 'Flow Map 수학 저장 전' },
  { route: '/f/vehicle-inspection-prep', file: '05-public-vehicle-mobile.png', label: '공유 자동차검사' },
  { route: '/f/jeonse-contract-precheck-docs', file: '06-public-jeonse-mobile.png', label: '공유 전세계약 서류' },
  { route: '/f/moving-d30-basic', file: '07-public-moving-mobile.png', label: '공유 이사 D-30' },
  { route: '/f/fridge-cleanout-weekly-plan', file: '08-public-fridge-mobile.png', label: '냉장고 workbench' },
  { route: '/f/washer-tub-clean-monthly', file: '09-public-washer-mobile.png', label: '세탁기 workbench' },
  { route: '/f/new-car-delivery-check', file: '10-public-new-car-mobile.png', label: '신차 인수 workbench' },
  { route: '/f/used-car-buying-check', file: '11-public-used-car-mobile.png', label: '중고차 구매 workbench' },
  { route: '/my', file: '12-my-empty-mobile.png', label: 'My Flow 빈 상태' },
  { route: '/calendar', file: '13-calendar-empty-mobile.png', label: '캘린더 빈 상태' },
];

const scenarioLabels = {
  s01: '첫 진입에서 Flow 찾기까지',
  s02: 'Flow 찾기에서 이사 Flow Map 저장 후 My Flow/Calendar',
  s03: '날짜 없는 중1 수학 Flow Map 저장 후 첫 실행',
  s04: '공유 /f 저장 전/후와 My Flow 전환',
  s05: '특수 workbench와 export 접근',
  s06: '여러 Flow 저장 후 실행 허브',
};

function getCommandOutput(command, args) {
  try {
    return execFileSync(command, args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function getLaunchOptions() {
  const envPath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH;
  const windowsChromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const executablePath = envPath || (process.platform === 'win32' && fs.existsSync(windowsChromePath) ? windowsChromePath : undefined);
  return executablePath ? { executablePath } : {};
}

async function startServerIfNeeded() {
  if (!shouldStartServer) return null;
  const port = new URL(baseURL).port;
  const serverCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const serverArgs = process.platform === 'win32'
    ? ['/c', 'npm.cmd', 'run', 'start', '--', '-p', port]
    : ['run', 'start', '--', '-p', port];
  const server = spawn(serverCommand, serverArgs, {
    cwd: repoRoot,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await waitForServer(`${baseURL}/flows`, 60_000);
  return server;
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = '';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function stopServer(server) {
  if (!server?.pid) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      server.kill('SIGTERM');
    }
  } catch {
    server.kill();
  }
}

async function newMobileContext(browser) {
  return browser.newContext({ baseURL, viewport });
}

async function settle(page) {
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(250);
}

async function resetStorage(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(page);
}

async function capture(page, records, input) {
  await settle(page);
  const screenshotPath = path.join(screenshotsDir, input.file);
  await page.screenshot({ path: screenshotPath });
  const evidence = await page.evaluate((payload) => {
    const bodyText = document.body.innerText;
    const textLines = bodyText
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const matchedInternalTerms = payload.internalTerms
      .filter((term) => textLines.some((line) => new RegExp(term.source, term.flags).test(line)))
      .map((term) => term.label);
    const matchedP5Terms = payload.p5Terms
      .filter((term) => textLines.some((line) => new RegExp(term.source, term.flags).test(line)))
      .map((term) => term.label);
    const matchedP5Lines = textLines
      .filter((line) => payload.p5Terms.some((term) => new RegExp(term.source, term.flags).test(line)))
      .slice(0, 20);
    const flowSuffixLines = textLines
      .filter((line) => /[\p{L}\p{N})\]]\s*Flow$/u.test(line))
      .filter((line) => !payload.allowedFlowSuffixLines.includes(line))
      .slice(0, 20);
    const rawIsoLines = textLines
      .filter((line) => /\b20\d{2}-\d{2}-\d{2}\b/.test(line))
      .filter((line) => !/(확인|업데이트|출처|정확한 출처|원문|source|\.com|\.kr|\.net|\.co\.kr)/i.test(line))
      .slice(0, 20);
    const actions = Array.from(document.querySelectorAll('button, a'))
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .slice(0, 12);

    function rectFor(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
      };
    }

    return {
      url: window.location.pathname + window.location.search,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      scrollY: Math.round(window.scrollY),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      navVisible: Boolean(document.querySelector('[data-testid="platform-mobile-tabs"]')),
      publicShellVisible: Boolean(document.querySelector('[data-testid="flow-public-shell"]')),
      activeMobileTab: document.querySelector('[data-testid="platform-mobile-tabs"] [aria-current="page"]')?.textContent?.trim() ?? '',
      firstActions: actions,
      matchedInternalTerms,
      matchedP5Terms,
      matchedP5Lines,
      flowSuffixLines,
      rawIsoLines,
      markers: {
        homePrimaryCard: Boolean(document.querySelector('[data-testid="home-primary-flow-card"]')),
        catalogCard: Boolean(document.querySelector('[data-testid="flow-map-catalog-card"], [data-testid="single-flow-catalog-card"]')),
        flowMapStickySave: Boolean(document.querySelector('[data-testid="flow-map-mobile-sticky-save"]')),
        publicMobileSaveCta: Boolean(document.querySelector('[data-testid="public-flow-mobile-save-cta"]')),
        mobileExportBar: Boolean(document.querySelector('[data-testid="mobile-export-bar"]')),
        mobileExportSheet: Boolean(document.querySelector('[data-testid="mobile-export-sheet"]')),
        postSavePanel: Boolean(document.querySelector('[data-testid="my-flow-post-save-panel"]')),
        myFlowWorkspace: Boolean(document.querySelector('[data-testid="my-flow-workspace"]')),
        myFlowInlineDetail: Boolean(document.querySelector('[data-testid="my-flow-inline-detail"]')),
        calendarCard: Boolean(document.querySelector('[data-testid="my-flow-calendar-card"]')),
        selectedDateGroup: Boolean(document.querySelector('[data-testid="my-flow-selected-date-group"]')),
        fridgeSheet: Boolean(document.querySelector('[data-testid="artifact-log-table-spreadsheet"]')),
        washerNextCard: Boolean(document.querySelector('[data-testid="maintenance-routine-next-card"]')),
      },
      fixedRects: {
        platformMobileTabs: rectFor('[data-testid="platform-mobile-tabs"]'),
        flowMapStickySave: rectFor('[data-testid="flow-map-mobile-sticky-save"]'),
        publicMobileSaveCta: rectFor('[data-testid="public-flow-mobile-save-cta"]'),
        mobileExportBar: rectFor('[data-testid="mobile-export-bar"]'),
      },
    };
  }, {
    internalTerms: internalTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
    p5Terms: p5DisplayTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
    allowedFlowSuffixLines: Array.from(allowedFlowSuffixLines),
  });
  records.push({
    kind: input.kind,
    scenarioId: input.scenarioId ?? '',
    scenario: input.scenarioId ? scenarioLabels[input.scenarioId] : '',
    label: input.label,
    note: input.note,
    screenshot: `screenshots/${input.file}`,
    ...evidence,
  });
}

async function captureRouteShots(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  for (const item of routeShots) {
    process.stdout.write(`route ${item.route}\n`);
    await resetStorage(page, item.route);
    await capture(page, records, { kind: 'route', label: item.label, note: 'clean localStorage route top', file: item.file });
  }
  await context.close();
}

async function saveMovingMap(page) {
  await resetStorage(page, '/flow-maps/moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
}

async function captureScenarios(browser, records) {
  await scenarioHomeToFlows(browser, records);
  await scenarioMovingMap(browser, records);
  await scenarioMathMap(browser, records);
  await scenarioPublicFlow(browser, records);
  await scenarioWorkbenches(browser, records);
  await scenarioRepeatUser(browser, records);
}

async function scenarioHomeToFlows(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/');
  await capture(page, records, { kind: 'scenario', scenarioId: 's01', label: '홈 첫 화면', note: '처음 온 사용자가 핵심 행동과 추천 시작점을 보는 상태', file: 's01-01-home-entry.png' });
  await page.goto('/flows', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await capture(page, records, { kind: 'scenario', scenarioId: 's01', label: 'Flow 찾기 상단', note: '콘텐츠 목록 상단과 첫 카드 노출 상태', file: 's01-02-flows-top.png' });
  await page.locator('[data-testid="flow-map-catalog-card"], [data-testid="single-flow-catalog-card"]').first().scrollIntoViewIfNeeded();
  await capture(page, records, { kind: 'scenario', scenarioId: 's01', label: '첫 콘텐츠 카드', note: '카드 정보 위계와 CTA 경량화 상태', file: 's01-03-first-card.png' });
  await context.close();
}

async function scenarioMovingMap(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/flow-maps/moving-d30');
  await capture(page, records, { kind: 'scenario', scenarioId: 's02', label: '이사 Flow Map 저장 전', note: '입력, 결과 약속, 먼저 할 일, sticky CTA 확인', file: 's02-01-moving-map-before-input.png' });
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await capture(page, records, { kind: 'scenario', scenarioId: 's02', label: '이사일 입력 후', note: '입력 후 저장 CTA와 결과 예측 확인', file: 's02-02-moving-map-date-entered.png' });
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's02', label: '저장 직후 My Flow', note: '저장 배너와 첫 실행 항목이 같은 방향을 가리키는지 확인', file: 's02-03-post-save-my-flow.png' });
  await page.getByTestId('my-flow-post-save-open-first').click();
  await page.getByTestId('my-flow-inline-detail').first().waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's02', label: '첫 할 일 상세', note: '체크, 메모/source/export 접근이 과하게 노출되지 않는지 확인', file: 's02-04-first-task-detail.png' });
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('my-flow-calendar-card').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-selected-date-group').first().waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's02', label: '저장 후 Calendar agenda', note: '가장 가까운 저장 일정과 agenda-first 상태 확인', file: 's02-05-calendar-agenda.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(page, records, { kind: 'scenario', scenarioId: 's02', label: 'Calendar 하단', note: '하단 탭이 마지막 agenda를 가리지 않는지 확인', file: 's02-06-calendar-bottom.png' });
  await context.close();
}

async function scenarioMathMap(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/flow-maps/middle-school-math-1');
  await capture(page, records, { kind: 'scenario', scenarioId: 's03', label: '중1 수학 저장 전', note: 'Mathbang/source slug와 일정 지도 표현이 제거됐는지 확인', file: 's03-01-math-map-before-save.png' });
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=middle-school-math-1');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's03', label: '날짜 없는 콘텐츠 저장 후', note: '빈 상태 대신 첫 실행 항목이 보이는지 확인', file: 's03-02-math-post-save.png' });
  await page.getByTestId('my-flow-post-save-open-first').click();
  await page.getByTestId('my-flow-inline-detail').first().waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's03', label: '날짜 없는 첫 할 일 상세', note: '진도표 상세가 실행 가능한 형태로 열리는지 확인', file: 's03-03-math-first-task.png' });
  await context.close();
}

async function scenarioPublicFlow(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/f/vehicle-inspection-prep');
  await capture(page, records, { kind: 'scenario', scenarioId: 's04', label: '공유 자동차검사 저장 전', note: '공유 shell, 입력, 저장 CTA hierarchy 확인', file: 's04-01-vehicle-before-input.png' });
  const vehicleDate = page.locator('input[type="date"]').first();
  if (await vehicleDate.count()) await vehicleDate.fill('2026-07-17');
  await capture(page, records, { kind: 'scenario', scenarioId: 's04', label: '공유 자동차검사 날짜 입력 후', note: '대안 버튼이 주 행동과 경쟁하지 않는지 확인', file: 's04-02-vehicle-date-entered.png' });
  await page.getByTestId('public-flow-mobile-save-cta').locator('button').first().click();
  await page.getByTestId('public-flow-mobile-save-cta').locator('a').first().waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's04', label: '공유 자동차검사 저장 완료', note: '저장 완료 후 My Flow 이동 CTA와 날짜 표시 확인', file: 's04-03-vehicle-after-save.png' });
  await page.getByTestId('public-flow-mobile-save-cta').locator('a').first().click();
  await page.waitForURL('**/my');
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's04', label: '공유 저장 후 My Flow', note: '공유 shell에서 앱 shell 실행 허브로 이어지는지 확인', file: 's04-04-vehicle-my-flow.png' });

  await resetStorage(page, '/f/jeonse-contract-precheck-docs');
  await capture(page, records, { kind: 'scenario', scenarioId: 's04', label: '공유 전세계약 서류', note: '공유 상세의 CTA와 source/detail 위계 확인', file: 's04-05-jeonse-before-save.png' });
  await resetStorage(page, '/f/moving-d30-basic');
  const movingDate = page.locator('input[type="date"]').first();
  if (await movingDate.count()) await movingDate.fill('2026-07-22');
  await capture(page, records, { kind: 'scenario', scenarioId: 's04', label: '공유 이사 D-30', note: 'export-first 공유 화면의 입력과 저장/export 위계 확인', file: 's04-06-public-moving.png' });
  await context.close();
}

async function scenarioWorkbenches(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/f/fridge-cleanout-weekly-plan');
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '냉장고 workbench 첫 화면', note: '빈 시트가 폼처럼 반복되지 않고 첫 기록 단위가 보이는지 확인', file: 's05-01-fridge-top.png' });
  await page.getByTestId('artifact-log-table-spreadsheet').scrollIntoViewIfNeeded();
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '냉장고 시트 영역', note: '우선 재료/메뉴 후보/보류/상태 컬럼과 placeholder 밀도 확인', file: 's05-02-fridge-sheet.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '냉장고 하단', note: 'sticky bar가 마지막 행을 가리지 않는지 확인', file: 's05-03-fridge-bottom.png' });

  await resetStorage(page, '/f/washer-tub-clean-monthly');
  await page.getByTestId('maintenance-routine-next-card').scrollIntoViewIfNeeded();
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '세탁기 관리 카드', note: '사용자용 날짜 포맷과 관리 주기 카드 확인', file: 's05-04-washer-next-card.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '세탁기 하단', note: 'sticky bar와 마지막 콘텐츠 clearance 확인', file: 's05-05-washer-bottom.png' });

  await resetStorage(page, '/f/new-car-delivery-check');
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '신차 인수 workbench', note: '특수 체크 화면의 visual tone과 CTA 위계 확인', file: 's05-06-new-car-top.png' });
  await resetStorage(page, '/f/used-car-buying-check');
  await capture(page, records, { kind: 'scenario', scenarioId: 's05', label: '중고차 구매 workbench', note: '특수 체크 화면의 visual tone과 CTA 위계 확인', file: 's05-07-used-car-top.png' });
  await context.close();
}

async function scenarioRepeatUser(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await saveMovingMap(page);
  await page.goto('/flow-maps/middle-school-math-1', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=middle-school-math-1');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await capture(page, records, { kind: 'scenario', scenarioId: 's06', label: '여러 콘텐츠 저장 직후', note: '방금 저장한 콘텐츠의 첫 실행 항목이 먼저 보이는지 확인', file: 's06-01-multiple-post-save.png' });
  const allTab = page.getByTestId('my-flow-view-flow');
  if (await allTab.count()) {
    await allTab.click();
    await page.waitForTimeout(250);
  }
  await capture(page, records, { kind: 'scenario', scenarioId: 's06', label: 'My Flow 저장 목록', note: '여러 저장 콘텐츠의 n/n 완료, 진행바, 다음 할 일 스캔성 확인', file: 's06-02-my-flow-saved-list.png' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(page, records, { kind: 'scenario', scenarioId: 's06', label: 'My Flow 하단', note: '하단 탭이 마지막 저장 카드나 버튼을 가리지 않는지 확인', file: 's06-03-my-flow-bottom.png' });
  await context.close();
}

function validate(records) {
  const failures = [];
  for (const item of records) {
    if (!item.noHorizontalOverflow) failures.push(`${item.screenshot}: horizontal overflow ${item.scrollWidth}/${item.clientWidth}`);
    if (item.matchedInternalTerms.length > 0) failures.push(`${item.screenshot}: internal terms ${item.matchedInternalTerms.join(', ')}`);
    if (item.flowSuffixLines.length > 0) failures.push(`${item.screenshot}: trailing Flow lines ${item.flowSuffixLines.join(' | ')}`);
    if (item.matchedP5Terms.length > 0) failures.push(`${item.screenshot}: P5 display terms ${item.matchedP5Terms.join(', ')}`);
    if (item.rawIsoLines.length > 0) failures.push(`${item.screenshot}: raw ISO dates ${item.rawIsoLines.join(' | ')}`);
  }
  const postSaveMoving = records.find((item) => item.screenshot.endsWith('s02-03-post-save-my-flow.png'));
  if (!postSaveMoving?.markers.postSavePanel || !postSaveMoving?.markers.myFlowWorkspace) failures.push('moving post-save My Flow evidence missing post-save/workspace markers');
  const calendarAgenda = records.find((item) => item.screenshot.endsWith('s02-05-calendar-agenda.png'));
  if (!calendarAgenda?.markers.calendarCard || !calendarAgenda?.markers.selectedDateGroup) failures.push('calendar agenda evidence missing calendar/selected date markers');
  const mathPostSave = records.find((item) => item.screenshot.endsWith('s03-02-math-post-save.png'));
  if (!mathPostSave?.markers.postSavePanel) failures.push('math post-save evidence missing post-save panel');
  const fridgeSheet = records.find((item) => item.screenshot.endsWith('s05-02-fridge-sheet.png'));
  if (!fridgeSheet?.markers.fridgeSheet) failures.push('fridge sheet evidence missing spreadsheet marker');
  return failures;
}

function writePackage(payload) {
  fs.writeFileSync(path.join(outputDir, 'route-evidence.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'README.md'), renderReadme(payload), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'audit.md'), renderAudit(payload), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'prompt-ko.md'), renderPrompt(payload), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'review.html'), renderHtml(payload), 'utf8');
}

function renderReadme(payload) {
  return `# Claude Design P5 final review package

FlowMe P5-01~P5-07 개선 루프를 최신 모바일 390px 화면으로 다시 감사하기 위한 GitHub 기반 리뷰 패키지입니다. 새 기능을 추가하지 않고 현재 화면 기준선과 시나리오별 screenshot evidence를 정리했습니다.

## 읽는 순서

1. [review.html](./review.html) - route/scenario screenshot 보드
2. [audit.md](./audit.md) - P5-01~P5-07 기준선 감사 결과
3. [route-evidence.json](./route-evidence.json) - 390px DOM/문구/overflow evidence
4. [prompt-ko.md](./prompt-ko.md) - Claude Design 재검토 복붙용 프롬프트
5. [screenshots](./screenshots/) - 최신 모바일 390px screenshot ${payload.records.length}장

## 생성 기준

- Branch: \`${branchName}\`
- Commit: \`${baselineCommit}\`
- Viewport: ${viewport.width} x ${viewport.height}
- Base URL: \`${baseURL}\`
- Generated at: ${payload.generatedAt}
- Script: [capture-claude-p5-final-review-package.mjs](../../../scripts/content-audit/capture-claude-p5-final-review-package.mjs)

## GitHub 링크

- [README](${githubBase}/docs/content-audit/${packageName}/README.md)
- [review.html](${githubBase}/docs/content-audit/${packageName}/review.html)
- [audit.md](${githubBase}/docs/content-audit/${packageName}/audit.md)
- [route-evidence.json](${githubBase}/docs/content-audit/${packageName}/route-evidence.json)
- [prompt-ko.md](${githubBase}/docs/content-audit/${packageName}/prompt-ko.md)

## 재생성 명령

\`\`\`powershell
npm.cmd run build
node scripts\\content-audit\\capture-claude-p5-final-review-package.mjs
\`\`\`
`;
}

function renderAudit(payload) {
  const routeRows = payload.records
    .map((item) => `| ${item.kind} | ${item.scenarioId || '-'} | \`${item.url}\` | ${item.label} | [${path.basename(item.screenshot)}](./${item.screenshot}) | ${item.noHorizontalOverflow ? 'OK' : 'overflow'} | ${item.matchedP5Terms.length} | ${item.rawIsoLines.length} |`)
    .join('\n');
  const scenarioRows = Object.entries(scenarioLabels)
    .map(([id, label]) => `| ${id} | ${label} | ${payload.records.filter((item) => item.scenarioId === id).length}장 |`)
    .join('\n');

  return `# FlowMe P5 final audit

- 작성일: 2026-07-04
- 기준 branch: \`${branchName}\`
- 기준 commit: \`${baselineCommit}\`
- 범위: 홈, Flow 찾기, 공유 \`/f/[slug]\`, Flow Map 상세, My Flow, Calendar, 특수 workbench
- 원칙: 새 기능 없음. 4탭 IA 유지. \`/f/[slug]\` 공유 shell 유지. seed/source-backed 데이터와 저장/export 스키마 변경 없음.

## P5 기준선 감사

| 항목 | 판정 | evidence |
| --- | --- | --- |
| P5-01 공유 \`/f/[slug]\` 입력/저장 CTA hierarchy | 유지 확인 | \`s04-01\`~\`s04-06\` |
| P5-02 sticky bottom clearance | 유지 확인 | \`s02-06\`, \`s05-03\`, \`s05-05\`, \`s06-03\` |
| P5-03 My Flow 상태 라벨 반복 제거 | 유지 확인 | \`s02-03\`, \`s03-02\`, \`s06-01\` |
| P5-04 \`/flows\` 카드 CTA 경량화 | 유지 확인 | \`02-flows-mobile\`, \`s01-03\` |
| P5-05 날짜 입력 선택지/사용자용 날짜 포맷 | 유지 확인 | \`s04-02\`, \`s04-03\`, \`s05-04\` |
| P5-06 내부어 표시 제거 | 유지 확인 | \`Mathbang\`, \`일정 지도\`, \`저장한 지도\` scan 0건 |
| P5-07 냉장고 placeholder 정리 | 유지 확인 | \`s05-01\`, \`s05-02\`, \`s05-03\` |

## 시나리오 구성

| Scenario | 목적 | Screenshot |
| --- | --- | --- |
${scenarioRows}

## 자동 스캔 요약

- Horizontal overflow failures: ${payload.validation.horizontalOverflowFailures}
- Internal term hits: ${payload.validation.internalTermHits}
- 콘텐츠 제목 끝 \`Flow\` 접미 hits: ${payload.validation.flowSuffixHits}
- P5 표시어(\`Mathbang\`, \`일정 지도\`, \`저장한 지도\`) hits: ${payload.validation.p5DisplayTermHits}
- Raw ISO visible text hits: ${payload.validation.rawIsoHits}

## Evidence table

| Kind | Scenario | URL | Label | Screenshot | Overflow | P5 term hits | ISO hits |
| --- | --- | --- | --- | --- | --- | --- | --- |
${routeRows}

## Claude에게 확인받을 질문

1. P5-01~P5-07을 닫힌 기준선으로 봐도 되는가?
2. 저장 후 My Flow와 Calendar evidence가 충분히 실행형 앱처럼 보이는가?
3. 공유 \`/f/[slug]\` shell은 계속 공유 진입 예외로 유지해도 되는가?
4. 특수 workbench들이 하나의 FlowMe 앱 톤으로 보이는가?
5. 다음 루프가 필요하다면 P6 backlog를 Blocking/High/Medium/Low로 작성해 달라.

## 남은 리스크

- 이 패키지는 screenshot/DOM evidence입니다. 실제 사용자 행동 검증은 아닙니다.
- Claude Design은 Vercel을 보지 못한다는 전제로 GitHub 파일과 screenshot만 검토해야 합니다.
`;
}

function renderPrompt(payload) {
  return `FlowMe P5-01~P5-07 개선 루프를 다시 검토해줘.

전제:
- Vercel은 볼 수 없다고 가정하고 GitHub 소스/문서/screenshot만 보고 판단해줘.
- 단순 감상평이 아니라 다음 산출물을 만들어줘.
- P5-01~P5-07이 닫혔는지, 다시 열어야 하는지, 다음 P6 backlog가 필요한지 판단해줘.

먼저 볼 파일:
1. \`flow-mvp/docs/content-audit/${packageName}/review.html\`
2. \`flow-mvp/docs/content-audit/${packageName}/audit.md\`
3. \`flow-mvp/docs/content-audit/${packageName}/route-evidence.json\`
4. \`flow-mvp/docs/content-audit/${packageName}/screenshots/\`
5. \`flow-mvp/docs/SERVICE_STRUCTURE.md\`

검토 기준:
- 4탭 IA는 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 \`/f/[slug]\`는 공유 진입 shell 예외로 유지
- 저장 후에는 My Flow 실행 허브로 이어져야 함
- 사용자는 Flow/Step/Item/source-backed/review/audit 같은 내부 모델을 몰라도 돼야 함
- seed/source-backed 데이터와 저장/실행/export 스키마는 유지
- 화면은 설명형이 아니라 실행형 앱처럼 보여야 함
- 모바일 390px에서 좌우 스크롤, 하단 sticky 겹침, raw ISO 날짜, 중복 라벨이 없어야 함

특히 확인할 P5 항목:
1. P5-01 공유 \`/f/[slug]\` 입력/저장 CTA hierarchy
2. P5-02 sticky bottom clearance
3. P5-03 My Flow 상태 라벨 반복 제거
4. P5-04 \`/flows\` 카드 CTA 경량화
5. P5-05 날짜 입력 선택지/사용자용 날짜 포맷
6. P5-06 \`...일정 지도\`, \`Mathbang\`, \`저장한 지도\` 같은 내부어 표시 제거
7. P5-07 냉장고 workbench 빈 placeholder 정리

산출물:
1. P5-01~P5-07 각각의 Close / Reopen / Needs follow-up 판정
2. route별 UX/UI 문제 목록
3. Blocking / High / Medium / Low 우선순위
4. 바로 개발 가능한 P6 backlog
5. 유지해야 할 기준선
6. 화면별 구체 수정 지시
7. revised screen spec 또는 copy 제안이 필요하면 함께 작성

현재 evidence 요약:
- Screenshot: ${payload.records.length}장
- Branch: \`${branchName}\`
- Commit: \`${baselineCommit}\`
- P5 표시어 scan hits: ${payload.validation.p5DisplayTermHits}
- raw ISO visible text hits: ${payload.validation.rawIsoHits}
- trailing Flow title hits: ${payload.validation.flowSuffixHits}
- horizontal overflow failures: ${payload.validation.horizontalOverflowFailures}
`;
}

function renderHtml(payload) {
  const cards = payload.records
    .map((item) => `
      <article class="card">
        <div class="meta"><span>${escapeHtml(item.kind)}</span><span>${escapeHtml(item.scenarioId || 'route')}</span></div>
        <h3>${escapeHtml(item.label)}</h3>
        <p class="url">${escapeHtml(item.url)}</p>
        <img src="${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.label)}" />
        <p>${escapeHtml(item.note)}</p>
        <dl>
          <div><dt>Shell</dt><dd>${item.navVisible ? `4-tab ${escapeHtml(item.activeMobileTab)}` : item.publicShellVisible ? 'Share shell' : 'None'}</dd></div>
          <div><dt>Overflow</dt><dd>${item.noHorizontalOverflow ? 'OK' : `${item.scrollWidth}/${item.clientWidth}`}</dd></div>
          <div><dt>P5 terms</dt><dd>${item.matchedP5Terms.length}</dd></div>
          <div><dt>ISO</dt><dd>${item.rawIsoLines.length}</dd></div>
        </dl>
      </article>
    `)
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowMe Claude Design P5 Final Review</title>
  <style>
    :root { --bg:#FAFAF8; --surface:#fff; --text:#1B1A17; --muted:#6E6B64; --border:#E7E4DD; --action:#3654FF; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1200px; margin:0 auto; padding:32px 20px 64px; }
    h1 { margin:0; font-size:clamp(32px,5vw,56px); line-height:1.04; letter-spacing:0; }
    h2 { margin:34px 0 14px; font-size:24px; }
    h3 { margin:8px 0 4px; font-size:18px; }
    p { color:var(--muted); line-height:1.65; }
    a { color:var(--action); font-weight:700; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin:22px 0; }
    .pill { border:1px solid var(--border); border-radius:16px; background:var(--surface); padding:16px; }
    .pill strong { display:block; font-size:24px; margin-bottom:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; }
    .card { border:1px solid var(--border); border-radius:18px; background:var(--surface); padding:14px; box-shadow:0 1px 0 rgba(27,26,23,.03); }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
    .meta span { border:1px solid var(--border); border-radius:999px; background:#FAFAF8; padding:4px 8px; color:var(--muted); font-size:12px; font-weight:700; }
    .url { margin:0 0 10px; font-size:13px; font-weight:700; }
    img { width:100%; border:1px solid var(--border); border-radius:14px; background:#F3F1EC; }
    dl { display:grid; gap:8px; margin:12px 0 0; }
    dl div { display:flex; justify-content:space-between; gap:12px; border-top:1px solid var(--border); padding-top:8px; font-size:13px; }
    dt { color:var(--muted); }
    dd { margin:0; font-weight:700; text-align:right; }
  </style>
</head>
<body>
  <main>
    <header>
      <p><strong>FlowMe Claude Design P5 Final Review</strong></p>
      <h1>P5-01~P5-07 마감 감사 패키지</h1>
      <p>모바일 390px 기준 route top-shot과 실제 저장 시나리오 screenshot을 함께 묶었습니다. Claude Design이 Vercel 없이 GitHub 파일만 보고 P6 backlog를 판단할 수 있게 만드는 패키지입니다.</p>
      <p><a href="./audit.md">audit.md</a> · <a href="./route-evidence.json">route-evidence.json</a> · <a href="./prompt-ko.md">prompt-ko.md</a></p>
    </header>
    <section class="summary">
      <div class="pill"><strong>${payload.records.length}</strong><span>screenshots</span></div>
      <div class="pill"><strong>${payload.validation.p5DisplayTermHits}</strong><span>P5 display term hits</span></div>
      <div class="pill"><strong>${payload.validation.rawIsoHits}</strong><span>raw ISO hits</span></div>
      <div class="pill"><strong>${payload.validation.horizontalOverflowFailures}</strong><span>overflow failures</span></div>
    </section>
    <h2>Evidence</h2>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

fs.mkdirSync(screenshotsDir, { recursive: true });

const server = await startServerIfNeeded();
const browser = await chromium.launch({ headless: true, ...getLaunchOptions() });
try {
  const records = [];
  await captureRouteShots(browser, records);
  await captureScenarios(browser, records);
  const failures = validate(records);
  const payload = {
    generatedAt: new Date().toISOString(),
    packageName,
    branchName,
    baselineCommit,
    baseURL,
    viewport,
    scenarios: scenarioLabels,
    records,
    validation: {
      passed: failures.length === 0,
      failures,
      horizontalOverflowFailures: records.filter((item) => !item.noHorizontalOverflow).length,
      internalTermHits: records.reduce((sum, item) => sum + item.matchedInternalTerms.length, 0),
      flowSuffixHits: records.reduce((sum, item) => sum + item.flowSuffixLines.length, 0),
      p5DisplayTermHits: records.reduce((sum, item) => sum + item.matchedP5Terms.length, 0),
      rawIsoHits: records.reduce((sum, item) => sum + item.rawIsoLines.length, 0),
    },
    github: {
      readme: `${githubBase}/docs/content-audit/${packageName}/README.md`,
      reviewHtml: `${githubBase}/docs/content-audit/${packageName}/review.html`,
      audit: `${githubBase}/docs/content-audit/${packageName}/audit.md`,
      evidence: `${githubBase}/docs/content-audit/${packageName}/route-evidence.json`,
      prompt: `${githubBase}/docs/content-audit/${packageName}/prompt-ko.md`,
    },
  };
  writePackage(payload);
  if (failures.length > 0) {
    throw new Error(`P5 review package validation failed:\n${failures.join('\n')}`);
  }
  console.log(JSON.stringify({ packageName, screenshots: records.length, outputDir, validation: payload.validation }, null, 2));
} finally {
  await browser.close();
  stopServer(server);
}
