import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
import { tsImport } from 'tsx/esm/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const guardrailModule = await tsImport(
  pathToFileURL(path.join(repoRoot, 'lib', 'flow', 'user-surface-guardrails.ts')).href,
  import.meta.url,
);
const {
  findFirstTaskRepetitionHits,
  findInternalCopyHits,
  scanRawIsoInputValues,
  scanPrototypeRouteGuardrails,
  scanUserSurfaceGuardrails,
} = guardrailModule;
const packageName = process.env.FLOWME_EVIDENCE_PACKAGE_NAME || '2026-07-05-claude-design-p7-final-review-package';
const packageCycleMatch = packageName.match(/-p(\d+)-/i);
const inferredReviewCycle = packageCycleMatch ? `P${packageCycleMatch[1]}` : 'P7';
const reviewCycle = process.env.FLOWME_EVIDENCE_REVIEW_CYCLE || inferredReviewCycle;
const nextBacklogCycle = process.env.FLOWME_EVIDENCE_NEXT_BACKLOG || `P${Number(reviewCycle.replace(/^P/i, '')) + 1}`;
const captureScriptName = process.env.FLOWME_EVIDENCE_CAPTURE_SCRIPT || 'capture-claude-p7-final-review-package.mjs';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const viewport = { width: 390, height: 844 };
const branchName = getCommandOutput('git', ['branch', '--show-current']) || 'codex/flowme-uxui-second-loop';
const uiBaselineCommit = getCommandOutput('git', ['rev-parse', '--short', 'HEAD']) || 'unknown';
const packageGeneratedFromCommit = uiBaselineCommit;
const packageCommitRef = process.env.FLOWME_EVIDENCE_PACKAGE_COMMIT || 'git commit containing this generated package';
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL || `http://127.0.0.1:${process.env.FLOWME_EVIDENCE_PORT || '3221'}`;
const shouldStartServer = !process.env.FLOWME_EVIDENCE_BASE_URL;
const githubBase = `https://github.com/knhbae/flowme2605/blob/${branchName}`;

const sourceSlugSignals = getDynamicSourceSlugSignals();

const now = '2026-05-28T09:00:00+09:00';

const savedFixtures = {
  moving: [
    { slug: 'moving-d30-basic', selectedArtifactMode: 'calendar', anchor: '2026-07-22' },
  ],
  math: [
    { slug: 'source-backed-middle-school-math-1', selectedArtifactMode: 'checklist' },
  ],
  multiQueue: [
    { slug: 'moving-d30-basic', selectedArtifactMode: 'calendar', anchor: '2026-06-26' },
    { slug: 'computer-skills-d30-study', selectedArtifactMode: 'calendar', anchor: '2026-06-27' },
    { slug: 'used-car-buying-check', selectedArtifactMode: 'checklist' },
  ],
  longList: [
    { slug: 'moving-d30-basic', selectedArtifactMode: 'calendar', anchor: '2026-06-26' },
    { slug: 'computer-skills-d30-study', selectedArtifactMode: 'calendar', anchor: '2026-06-27' },
    { slug: 'home-workout-20min', selectedArtifactMode: 'calendar', anchor: '2026-05-27' },
    { slug: 'baby-food-menu-recipe', selectedArtifactMode: 'sheet', anchor: '2026-05-28' },
    { slug: 'used-car-buying-check', selectedArtifactMode: 'checklist' },
    { slug: 'new-car-delivery-check', selectedArtifactMode: 'checklist' },
  ],
};

const scenarioRecords = [];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const server = await startServerIfNeeded();
  const browser = await chromium.launch(getLaunchOptions());
  const context = await browser.newContext({
    baseURL,
    viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();

  try {
    await page.clock.install({ time: new Date(now) });

    await captureCleanRoute(page, '/', '01-home-mobile.png', 'Home entry and lightweight recommendations');
    await captureCleanRoute(page, '/flows', '02-flows-mobile.png', 'Flow catalog scan with lightweight CTAs');
    await captureUrlFirstHit(page);
    await captureUrlFirstCustomStart(page);
    await captureUrlFirstMissCandidateForm(page);
    await captureUrlFirstCandidateDetail(page);
    await captureCleanRoute(page, '/flow-maps/moving-d30', '03-flow-map-moving-top-mobile.png', 'Moving map save screen top');
    await captureBottom(page, '/flow-maps/moving-d30', '04-flow-map-moving-bottom-mobile.png', 'Moving map bottom sticky clearance');
    await captureCleanRoute(page, '/flow-maps/middle-school-math-1', '05-flow-map-math-mobile.png', 'Math source-backed map screen');

    await captureCleanRoute(page, '/f/vehicle-inspection-prep', '06-public-vehicle-mobile.png', 'Public share save screen');
    await captureCleanRoute(page, '/f/moving-d30-basic', '07-public-moving-mobile.png', 'Public moving share screen');
    await captureBottom(page, '/f/moving-d30-basic', '08-public-moving-bottom-mobile.png', 'Public moving bottom sticky clearance');
    await captureCleanRoute(page, '/f/fridge-cleanout-weekly-plan', '09-workbench-fridge-mobile.png', 'Fridge workbench active rows');
    await captureCleanRoute(page, '/f/washer-tub-clean-monthly', '10-workbench-washer-mobile.png', 'Washer workbench');
    await captureCleanRoute(page, '/f/new-car-delivery-check', '11-workbench-new-car-mobile.png', 'New car checklist workbench');
    await captureCleanRoute(page, '/f/used-car-buying-check', '12-workbench-used-car-mobile.png', 'Used car checklist workbench');
    await captureWorkbenchOpenDetails(page, '/f/new-car-delivery-check', '25-workbench-new-car-open-details-mobile.png', 'New car checklist row details without repeated source links');
    await captureWorkbenchOpenDetails(page, '/f/used-car-buying-check', '26-workbench-used-car-open-details-mobile.png', 'Used car checklist row details without repeated source links');

    await setSavedFlows(page, savedFixtures.moving);
    await captureRoute(page, '/my?savedMap=moving-d30', '13-post-save-my-moving-mobile.png', 'Post-save My Flow for moving map', {
      category: 'saved-state',
      firstTaskTitle: '이사 방식과 견적 후보 정하기',
    });
    await captureRoute(page, '/calendar', '14-calendar-after-moving-save-mobile.png', 'Calendar agenda-first after moving save', {
      category: 'saved-state',
    });

    await setSavedFlows(page, savedFixtures.math);
    await captureRoute(page, '/my?savedMap=middle-school-math-1', '15-post-save-my-math-mobile.png', 'Post-save My Flow for undated math content', {
      category: 'saved-state',
      firstTaskTitle: '1. 소인수분해',
    });

    await setSavedFlows(page, savedFixtures.multiQueue);
    await captureRoute(page, '/my', '16-my-multi-queue-mobile.png', 'My Flow with today overdue next queues', {
      category: 'multi-queue',
      firstTaskTitle: '필기와 실기 시험 범위 나누기',
    });
    await openOverdueSheet(page);
    await captureCurrent(page, '17-my-multi-queue-overdue-sheet-mobile.png', 'My Flow overdue sheet dedupe evidence', {
      category: 'multi-queue',
      modal: 'overdue-sheet',
    });

    await setSavedFlows(page, savedFixtures.longList);
    await page.goto('/my');
    await settle(page);
    await page.getByTestId('my-flow-view-flow').click();
    await settle(page);
    await captureCurrent(page, '18-my-long-list-top-mobile.png', 'My Flow 5+ saved list top', {
      category: 'long-list',
    });
    await page.getByTestId('my-flow-mobile-inventory-open').scrollIntoViewIfNeeded();
    await captureCurrent(page, '19-my-long-list-bottom-mobile.png', 'My Flow 5+ list bottom before sheet', {
      category: 'long-list',
    });
    await page.getByTestId('my-flow-mobile-inventory-open').click();
    await settle(page);
    await page.getByTestId('my-flow-group-row').last().scrollIntoViewIfNeeded();
    await captureCurrent(page, '20-my-long-list-inventory-bottom-mobile.png', 'My Flow 5+ inventory sheet bottom clearance', {
      category: 'long-list',
      modal: 'inventory-sheet',
    });

    await captureRoute(page, '/restart/moving-d30', '21-restart-moving-top-mobile.png', 'Restart prototype top with user date format', {
      category: 'prototype-restart',
      prototypeBucket: true,
    });
    await page.getByTestId('moving-mobile-full-schedule').locator(':scope > button').last().click();
    await settle(page);
    await page.getByTestId('moving-full-schedule-list').scrollIntoViewIfNeeded();
    await captureCurrent(page, '24-restart-moving-full-schedule-mobile.png', 'Restart prototype full schedule date distribution', {
      category: 'prototype-restart',
      prototypeBucket: true,
      scrollPurpose: 'full-schedule-date-distribution',
    });
    await scrollRestartSourceExportIntoEvidenceFrame(page);
    await captureCurrent(page, '22-restart-moving-source-export-mobile.png', 'Restart prototype source and export hierarchy', {
      category: 'prototype-restart',
      prototypeBucket: true,
      scrollPurpose: 'source-export-mid-frame',
    });
    await scrollToPageBottom(page);
    await captureCurrent(page, '23-restart-moving-bottom-mobile.png', 'Restart prototype bottom clearance', {
      category: 'prototype-restart',
      prototypeBucket: true,
      scrollPurpose: 'true-page-bottom',
    });
  } finally {
    await browser.close();
    stopServer(server);
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    packageName,
    reviewCycle,
    nextBacklogCycle,
    branchName,
    uiBaselineCommit,
    packageGeneratedFromCommit,
    packageCommitRef,
    commit: uiBaselineCommit,
    viewport,
    baseURL,
    summary: summarizeEvidence(scenarioRecords),
    scenarios: scenarioRecords,
  };

  fs.writeFileSync(path.join(outputDir, 'route-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'README.md'), renderReadme(evidence));
  fs.writeFileSync(path.join(outputDir, 'audit.md'), renderAudit(evidence));
  fs.writeFileSync(path.join(outputDir, 'prompt-ko.md'), renderPrompt(evidence));
  fs.writeFileSync(path.join(outputDir, 'review.html'), renderHtml(evidence));

  console.log(`Wrote ${path.relative(repoRoot, outputDir)}`);
}

function getCommandOutput(command, args) {
  try {
    return execFileSync(command, args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function getDynamicSourceSlugSignals() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const script = [
    "import { seedBundles } from './lib/flow/seed-flows';",
    "import { getCuratedSourceAppSeedFlowMaps, getSourceBackedHomepageFlowMaps } from './lib/flow/source-backed-my-flow';",
    "import { collectSourceSlugSignals } from './lib/flow/user-surface-guardrails';",
    'console.log(JSON.stringify(collectSourceSlugSignals([...seedBundles, ...getSourceBackedHomepageFlowMaps(), ...getCuratedSourceAppSeedFlowMaps()])));',
  ].join(' ');
  const args = process.platform === 'win32'
    ? ['/c', 'npx.cmd', 'tsx', '-e', script]
    : ['tsx', '-e', script];

  try {
    const output = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch (error) {
    console.warn(`Falling back to no dynamic source slug signals: ${error instanceof Error ? error.message : String(error)}`);
    return [];
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

async function settle(page) {
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForFunction(() => !document.body.innerText.includes('Flow를 불러오는 중입니다.'), null, { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

async function resetStorage(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
}

async function setSavedFlows(page, flows) {
  await resetStorage(page);
  await page.evaluate((savedFlows) => {
    const savedAt = '2026-05-28T00:00:00.000Z';
    for (const flow of savedFlows) {
      window.localStorage.setItem(`flow:saved:${flow.slug}`, JSON.stringify({
        slug: flow.slug,
        savedAt,
        selectedArtifactMode: flow.selectedArtifactMode,
        ...(flow.anchor ? { anchor: flow.anchor } : {}),
      }));
      if (flow.anchor) {
        window.localStorage.setItem(`flow:${flow.slug}:anchorDate`, JSON.stringify({
          mode: 'custom',
          anchor: flow.anchor,
        }));
      }
    }
  }, flows);
}

async function captureCleanRoute(page, route, file, label) {
  await resetStorage(page);
  await captureRoute(page, route, file, label, { category: 'normal-user-route' });
}

async function captureBottom(page, route, file, label) {
  await resetStorage(page);
  await page.goto(route);
  await settle(page);
  await scrollToPageBottom(page);
  await captureCurrent(page, file, label, { category: 'bottom-clearance', route, scrollPurpose: 'true-page-bottom' });
}

async function captureRoute(page, route, file, label, options = {}) {
  await page.goto(route);
  await settle(page);
  await captureCurrent(page, file, label, { ...options, route });
}

async function lookupUrlFirstInput(page, url) {
  await page.goto('/flows');
  await settle(page);
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.waitFor({ state: 'visible' });
  await lookup.getByLabel('원문 URL').fill(url);
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  await page.getByTestId('flow-url-lookup-result').waitFor({ state: 'visible' });
  await settle(page);
}

async function captureUrlFirstHit(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, 'https://mathbang.net/13?utm_source=share');
  await captureCurrent(page, '27-url-first-hit-mobile.png', 'URL-first hit result on Flow finding', {
    category: 'url-first',
    route: '/flows',
    urlFirstState: 'hit',
  });
}

async function captureUrlFirstCustomStart(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, 'https://mathbang.net/13?utm_source=share');
  await page.getByTestId('flow-url-start-mode-custom').click();
  await page.getByTestId('flow-url-custom-start-panel').waitFor({ state: 'visible' });
  await settle(page);
  await captureCurrent(page, '28-url-first-custom-start-mobile.png', 'URL-first lightweight custom start panel', {
    category: 'url-first',
    route: '/flows',
    urlFirstState: 'custom-start',
  });
}

async function captureUrlFirstMissCandidateForm(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, 'https://example.com/source-to-convert?utm_source=review');
  await page.getByTestId('flow-url-supply-candidate-form').waitFor({ state: 'visible' });
  await captureCurrent(page, '29-url-first-miss-candidate-form-mobile.png', 'URL-first miss candidate form', {
    category: 'url-first',
    route: '/flows',
    urlFirstState: 'miss',
  });
}

async function captureUrlFirstCandidateDetail(page) {
  await resetStorage(page);
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        {
          canonicalUrl: 'https://example.com/source-to-convert',
          originalUrl: 'https://example.com/source-to-convert?utm_source=review',
          title: '새로 보고 싶은 준비 체크리스트',
          memo: 'URL에서 따라 할 순서만 남겨두고 싶음',
          status: 'miss_request',
          savedAt: '2026-07-07T00:00:00.000Z',
          lastLookup: {
            status: 'miss',
            title: '아직 준비된 Flow가 없어요',
            checkedAt: '2026-07-07T00:00:00.000Z',
            canSaveToMyFlow: false,
          },
        },
        {
          canonicalUrl: 'https://mathbang.net/13',
          originalUrl: 'https://mathbang.net/13?utm_source=share',
          title: '이제 실행 가능한 수학 후보',
          memo: '후보가 기존 콘텐츠로 닫힌 상태',
          status: 'miss_request',
          savedAt: '2026-07-07T00:00:00.000Z',
          lastLookup: {
            status: 'hit',
            title: '이미 만들어진 Flow가 있어요',
            checkedAt: '2026-07-07T00:00:00.000Z',
            canSaveToMyFlow: true,
            flowMapId: 'middle-school-math-1',
            routeHref: '/flow-maps/middle-school-math-1',
          },
        },
      ]),
    );
  });
  await page.reload();
  await settle(page);
  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await candidateList.waitFor({ state: 'visible' });
  await candidateList.locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' }).getByRole('button', { name: '요청 내용 보기' }).click();
  await settle(page);
  await captureCurrent(page, '30-url-first-candidate-detail-mobile.png', 'URL-first saved candidate request detail', {
    category: 'url-first',
    route: '/flows',
    urlFirstState: 'candidate',
  });
}

async function captureCurrent(page, file, label, options = {}) {
  await settle(page);
  const screenshotPath = path.join(screenshotsDir, file);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const screenshotBuffer = fs.readFileSync(screenshotPath);
  const scan = await scanPage(page, options);
  scenarioRecords.push({
    id: file.replace(/\.png$/, ''),
    label,
    route: scan.url,
    screenshot: `screenshots/${file}`,
    screenshotBytes: screenshotBuffer.length,
    screenshotHash: crypto.createHash('sha256').update(screenshotBuffer).digest('hex'),
    ...scan,
  });
}

async function scrollToPageBottom(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);
}

async function scrollRestartSourceExportIntoEvidenceFrame(page) {
  await page.getByTestId('moving-source-section').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    const target = document.querySelector('[data-testid="moving-source-section"]');
    if (!target) return;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    const preferred = Math.max(0, targetTop - Math.round(window.innerHeight * 0.35));
    const separatedFromBottom = Math.max(0, maxScroll - Math.round(window.innerHeight * 0.35));
    window.scrollTo(0, Math.min(preferred, separatedFromBottom));
  });
  await settle(page);
}

async function openOverdueSheet(page) {
  const overdueButton = page.getByTestId('my-flow-overdue-open-sheet');
  if (await overdueButton.count()) {
    await overdueButton.click();
    await settle(page);
  }
}

async function captureWorkbenchOpenDetails(page, route, file, label) {
  await page.goto(route);
  await settle(page);
  const listCard = page.getByTestId('artifact-list-card');
  await listCard.waitFor({ state: 'visible' });
  await listCard.scrollIntoViewIfNeeded();
  await settle(page);

  const summaries = listCard.locator('details summary');
  const count = await summaries.count();
  for (let index = 0; index < count; index += 1) {
    const summary = summaries.nth(index);
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
  }
  await settle(page);

  await captureCurrent(page, file, label, {
    category: 'field-checklist-source-density',
    route,
    scrollPurpose: 'open-row-details-source-density',
  });
}

async function scanPage(page, options = {}) {
  const pageScan = await page.evaluate((payload) => {
    const bodyText = document.body.innerText;
    const lines = bodyText
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const sourceContextSelector = [
      '[data-testid*="source" i]',
      '[data-testid*="trace" i]',
      '[data-testid*="reference" i]',
      '[data-testid*="origin" i]',
      'a[href^="http"]',
    ].join(',');
    const scanTextSelector = [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'p',
      'span',
      'button',
      'a',
      'label',
      'summary',
      'li',
      'td',
      'th',
      'dt',
      'dd',
    ].join(',');
    const normalizeLine = (line) => line.replace(/\s+/g, ' ').trim();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const hasNestedScanText = (element) =>
      Array.from(element.children).some((child) => child.matches(scanTextSelector) || child.querySelector(scanTextSelector));
    const uniqueLines = (values) => Array.from(new Set(values.map(normalizeLine).filter(Boolean)));
    const collectElementLines = (root) => {
      if (!root) return [];
      return uniqueLines(Array.from(root.querySelectorAll(scanTextSelector)).filter((element) => isVisible(element) && !hasNestedScanText(element)).map((element) => element.textContent ?? ''));
    };
    const primaryLines = [];
    const sourceLines = [];
    const isExplicitSourceEvidenceLine = (text) =>
      /^원문\s*근거[:：]/u.test(text) && /https?:\/\//iu.test(text);
    for (const element of Array.from(document.body.querySelectorAll(scanTextSelector)).filter((element) => isVisible(element) && !hasNestedScanText(element))) {
      const text = normalizeLine(element.textContent ?? '');
      if (!text) continue;
      if (element.closest(sourceContextSelector) || isExplicitSourceEvidenceLine(text)) {
        sourceLines.push(text);
      } else {
        primaryLines.push(text);
      }
    }
    const normalizedPrimaryLines = uniqueLines(primaryLines);
    const normalizedSourceLines = uniqueLines(sourceLines);
    const firstTaskTitle = normalizeLine(document.querySelector('[data-testid="my-flow-now-section"] [data-testid="my-flow-mobile-continuation-title"]')?.textContent ?? '');
    const nowSectionLines = collectElementLines(document.querySelector('[data-testid="my-flow-now-section"]'));
    const myFlowQueueLabelLines = uniqueLines([
      '[data-testid="my-flow-now-section"]',
      '[data-testid="my-flow-upcoming-list"]',
      '[data-testid="my-flow-overdue-list"]',
      '[data-testid="my-flow-status-sheet"]',
      '[data-testid="my-flow-today-summary"]',
      '[data-testid="my-flow-status-board"]',
      '[data-testid="my-flow-priority-section"]',
    ].flatMap((selector) => collectElementLines(document.querySelector(selector))));

    const prototypeExportEntryLabels = Array.from(document.querySelectorAll('[data-testid="moving-mobile-export-actions"] button'))
      .map((element) => normalizeLine(element.textContent ?? ''))
      .filter(Boolean);
    const labelForControl = (element) => {
      const explicitLabel = element.id
        ? Array.from(document.querySelectorAll('label')).find((label) => label.htmlFor === element.id)
        : null;
      return normalizeLine(
        element.getAttribute('aria-label')
          ?? explicitLabel?.textContent
          ?? element.closest('label')?.textContent
          ?? element.getAttribute('placeholder')
          ?? element.getAttribute('name')
          ?? element.id
          ?? '',
      );
    };
    const inputValues = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter((element) => isVisible(element))
      .map((element) => ({
        label: labelForControl(element),
        inputType: element instanceof HTMLInputElement
          ? (element.getAttribute('type') ?? 'text')
          : element.tagName.toLowerCase(),
        value: 'value' in element ? element.value : '',
        testId: element.dataset.testid ?? element.closest('[data-testid]')?.dataset.testid ?? '',
      }))
      .filter((entry) => entry.value);

    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
      };
    };

    const countText = (needle) => lines.filter((line) => line.includes(needle)).length;
    const countLabelText = (needle) => myFlowQueueLabelLines.filter((line) => line.includes(needle)).length;
    const collectText = (selector) => uniqueLines(
      Array.from(document.querySelectorAll(selector)).map((element) => element.textContent ?? ''),
    );
    const clickableLabels = Array.from(document.querySelectorAll('button, a'))
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .slice(0, 18);
    const isVisibleInteractiveElement = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        element.getAttribute('aria-hidden') !== 'true'
        && element.getAttribute('tabindex') !== '-1'
        && !element.hasAttribute('disabled')
        && element.getAttribute('aria-disabled') !== 'true'
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
      );
    };
    const focusableEntries = Array.from(document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]'))
      .filter((element) => isVisibleInteractiveElement(element))
      .map((element) => ({
        text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        href: element instanceof HTMLAnchorElement ? element.getAttribute('href') ?? '' : '',
        testId: element.dataset.testid ?? element.closest('[data-testid]')?.dataset.testid ?? '',
      }));
    const hasVisibleElement = (selector) =>
      Array.from(document.querySelectorAll(selector)).some((element) => isVisible(element));
    const getElementTestId = (element) => element?.dataset?.testid ?? element?.closest?.('[data-testid]')?.dataset?.testid ?? '';
    const getAccessibleNameCandidate = (element) => normalizeLine(
      element?.getAttribute?.('aria-label')
        ?? element?.getAttribute?.('title')
        ?? element?.textContent
        ?? '',
    );
    const getVisibleLabel = (element) => normalizeLine(element?.textContent ?? '');
    const getSurfaceName = (element) => {
      if (element.closest('[data-testid="my-flow-now-section"]')) return 'my-flow-now-section';
      if (element.closest('[data-testid="my-flow-status-sheet"]')) return 'my-flow-status-sheet';
      if (element.closest('[data-testid="my-flow-calendar-selected-day"]')) return 'calendar-selected-day';
      if (element.closest('[data-testid="moving-mobile-next-tasks"]')) return 'restart-next-tasks';
      if (element.closest('[data-testid="moving-full-schedule-list"]')) return 'restart-full-schedule';
      if (element.closest('[data-testid="moving-calendar-selected-day"]')) return 'restart-calendar-selected-day';
      return 'route';
    };
    const rowActionPattern = /^(?:열기|수정|완료|편집)$/u;
    const getRowControlAccessibleNames = () =>
      Array.from(document.querySelectorAll([
        '[data-testid="my-flow-now-section"] button',
        '[data-testid="my-flow-status-sheet"] button',
        '[data-testid="my-flow-calendar-selected-day"] article button',
        '[data-testid="moving-mobile-next-tasks"] button',
        '[data-testid="moving-full-schedule-list"] button',
        '[data-testid="moving-calendar-selected-day"] button',
      ].join(',')))
        .filter((element) => isVisibleInteractiveElement(element))
        .map((element) => {
          const visibleLabel = getVisibleLabel(element);
          const accessibleName = getAccessibleNameCandidate(element);
          return {
            surface: getSurfaceName(element),
            testId: getElementTestId(element),
            visibleLabel,
            accessibleName,
            hasContext: Boolean(accessibleName && visibleLabel && accessibleName !== visibleLabel),
          };
        })
        .filter((entry) => rowActionPattern.test(entry.visibleLabel))
        .slice(0, 5);
    const collectContinuationActionable = () => {
      const section = document.querySelector('[data-testid="my-flow-now-section"]');
      const card = section?.querySelector('[data-testid="my-flow-mobile-continuation-card"]') ?? null;
      const control = card?.querySelector('[data-testid="my-flow-mobile-continuation-open"]') ?? null;
      const title = normalizeLine(card?.querySelector('[data-testid="my-flow-mobile-continuation-title"]')?.textContent ?? '');
      const flowContext = normalizeLine(card?.querySelector('[data-testid="my-flow-mobile-continuation-flow-context"]')?.textContent ?? '');
      const sectionVisible = Boolean(section && isVisible(section));
      const cardVisible = Boolean(card && isVisible(card));
      const controlVisible = Boolean(control && isVisible(control));
      const controlFocusable = Boolean(control && isVisibleInteractiveElement(control));

      return {
        sectionVisible,
        cardVisible,
        controlVisible,
        controlFocusable,
        explanationOnly: sectionVisible && (!cardVisible || !controlFocusable || !title),
        targetTitle: title,
        flowContext,
        visibleLabel: getVisibleLabel(control),
        accessibleName: getAccessibleNameCandidate(control),
        flowSlug: card?.dataset.flowSlug ?? '',
        rowKey: card?.dataset.rowKey ?? '',
      };
    };
    const rowDateTextPattern = /\d{1,2}\s*월\s*\d{1,2}\s*일/u;
    const rowTimingTextPattern = /\bD(?:-\d+|\+\d+|-Day)\b/u;
    const summarizeRowMeta = (row) => {
      const text = collectElementLines(row).join(' ');
      const visibleDateMetaCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-date-meta"]')).filter((element) => isVisible(element)).length;
      const visibleTimingChipCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-timing-chip"], [data-testid="my-flow-status-sheet-group-timing-chip"]')).filter((element) => isVisible(element)).length;
      const visibleSectionLabelCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-section-label"]')).filter((element) => isVisible(element)).length;
      const visibleFlowChipCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-flow-chip"]')).filter((element) => isVisible(element)).length;

      return {
        textSample: text.slice(0, 140),
        dateTextCount: rowDateTextPattern.test(text) ? 1 : 0,
        timingTextCount: rowTimingTextPattern.test(text) ? 1 : 0,
        visibleDateMetaCount,
        visibleTimingChipCount,
        visibleSectionLabelCount,
        visibleFlowChipCount,
      };
    };
    const summarizeAgendaGroup = (group, rowSelector) => {
      const headerText = normalizeLine((
        group.querySelector(':scope > div')?.textContent
        ?? group.querySelector('[data-testid="my-flow-selected-date-group-meta"]')?.textContent
        ?? ''
      ));
      const rows = Array.from(group.querySelectorAll(rowSelector)).filter((element) => isVisible(element));
      const rowMeta = rows.map(summarizeRowMeta);
      return {
        headerText,
        rowCount: rows.length,
        repeatedDateMetaRowCount: rowMeta.filter((row) => row.visibleDateMetaCount > 0 || row.dateTextCount > 0).length,
        repeatedTimingMetaRowCount: rowMeta.filter((row) => row.visibleTimingChipCount > 0 || row.timingTextCount > 0).length,
        repeatedSectionMetaRowCount: rowMeta.filter((row) => row.visibleSectionLabelCount > 0).length,
        repeatedFlowMetaRowCount: rowMeta.filter((row) => row.visibleFlowChipCount > 0).length,
        rowMeta: rowMeta.slice(0, 5),
      };
    };
    const collectAgendaGroupMeta = () => {
      const calendarRoot = document.querySelector('[data-testid="my-flow-calendar-selected-day"]');
      const calendarGroups = Array.from(calendarRoot?.querySelectorAll('[data-testid="my-flow-selected-date-group"]') ?? [])
        .filter((element) => isVisible(element))
        .map((group) => summarizeAgendaGroup(group, '[data-testid="my-flow-execution-row-shell"] > article, article[data-item-type]'));
      const statusRoot = document.querySelector('[data-testid="my-flow-status-sheet"]');
      const statusGroups = Array.from(statusRoot?.querySelectorAll('[data-testid="my-flow-status-sheet-group"]') ?? [])
        .filter((element) => isVisible(element))
        .map((group) => summarizeAgendaGroup(group, '[data-testid="my-flow-status-sheet-row"]'));
      const ungroupedStatusRows = statusGroups.length
        ? []
        : Array.from(statusRoot?.querySelectorAll('[data-testid="my-flow-status-sheet-row"]') ?? []).filter((element) => isVisible(element));

      return {
        calendarSelectedDay: {
          visible: Boolean(calendarRoot && isVisible(calendarRoot)),
          groupCount: calendarGroups.length,
          groups: calendarGroups,
        },
        myFlowStatusSheet: {
          visible: Boolean(statusRoot && isVisible(statusRoot)),
          groupCount: statusGroups.length,
          groups: statusGroups,
          ungroupedRowCount: ungroupedStatusRows.length,
          ungroupedRowMeta: ungroupedStatusRows.map(summarizeRowMeta).slice(0, 5),
        },
      };
    };
    const progressCompletePattern = /\b\d+\s*\/\s*\d+\s*완료\b/gu;
    const progressRatioPattern = /\b\d+\s*\/\s*\d+\b/gu;
    const progressPercentPattern = /\b\d+\s*%\b/gu;
    const summarizeInventoryProgressMetrics = (row) => {
      const text = collectElementLines(row).join(' ').replace(/\s+/g, ' ').trim();
      const completeMatches = text.match(progressCompletePattern) ?? [];
      const textWithoutCompleteMetrics = text.replace(progressCompletePattern, ' ');
      const ratioMatches = textWithoutCompleteMetrics.match(progressRatioPattern) ?? [];
      const percentMatches = textWithoutCompleteMetrics.match(progressPercentPattern) ?? [];
      const metricCount = completeMatches.length + ratioMatches.length + percentMatches.length;

      return {
        flowSlug: row.dataset.flowSlug ?? '',
        textSample: text.slice(0, 140),
        completeMetricCount: completeMatches.length,
        ratioMetricCount: ratioMatches.length,
        percentMetricCount: percentMatches.length,
        metricCount,
        duplicateProgressMetricCount: Math.max(0, metricCount - 1),
      };
    };
    const collectInventoryProgressMetrics = () => {
      const rows = Array.from(document.querySelectorAll('[data-testid="my-flow-group-row"], [data-testid="my-flow-overview-card"]'))
        .filter((element) => isVisible(element));
      const rowMetrics = rows.map(summarizeInventoryProgressMetrics);

      return {
        rowCount: rows.length,
        duplicateProgressMetricCount: rowMetrics.reduce((sum, row) => sum + row.duplicateProgressMetricCount, 0),
        rows: rowMetrics.filter((row) => row.metricCount > 0 || row.textSample).slice(0, 8),
      };
    };
    const collectInventoryHeaderMetrics = () => {
      const largeRemainingPattern = /\b\d+\s*개\s*남음\b/u;
      const headerElements = Array.from(document.querySelectorAll([
        '[data-testid="my-flow-mobile-flow-summary"]',
        '[data-testid="my-flow-overview-summary"]',
      ].join(','))).filter((element) => isVisible(element));
      const hits = headerElements
        .map((element) => normalizeLine(element.textContent ?? ''))
        .filter((line) => largeRemainingPattern.test(line));

      return {
        checkedSurfaceCount: headerElements.length,
        largeRemainingCount: hits.length,
        hits: hits.slice(0, 5),
      };
    };
    const collectWorkbenchRepeatedDetailSentences = () => {
      const lines = Array.from(document.querySelectorAll('[data-testid="artifact-list-card"] details p'))
        .filter((element) => isVisible(element))
        .map((element) => normalizeLine(element.textContent ?? ''))
        .filter((line) => /^주의\s*:/u.test(line))
        .filter(Boolean);
      const counts = lines.reduce((map, line) => {
        map.set(line, (map.get(line) ?? 0) + 1);
        return map;
      }, new Map());
      const repeated = Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([line, count]) => ({ line, count }));

      return {
        checkedSentenceCount: lines.length,
        repeatedSentenceCount: repeated.reduce((sum, item) => sum + item.count - 1, 0),
        repeatedSentences: repeated.slice(0, 5),
      };
    };
    const collectPublicWorkbenchExportLabels = () => {
      const buttons = Array.from(document.querySelectorAll([
        '[data-testid^="mobile-artifact-export-"]',
        '[data-testid="mobile-export-bar"] button',
        '[data-testid="mobile-export-sheet"] button',
      ].join(',')))
        .filter((element) => isVisibleInteractiveElement(element))
        .map((element) => ({
          testId: getElementTestId(element),
          visibleLabel: getVisibleLabel(element),
          accessibleName: getAccessibleNameCandidate(element),
        }))
        .filter((entry) => entry.visibleLabel);
      const byVisibleLabel = buttons.reduce((map, entry) => {
        map.set(entry.visibleLabel, [...(map.get(entry.visibleLabel) ?? []), entry]);
        return map;
      }, new Map());
      const duplicateVisibleLabels = Array.from(byVisibleLabel.entries())
        .filter(([, entries]) => entries.length > 1)
        .map(([visibleLabel, entries]) => ({
          visibleLabel,
          count: entries.length,
          accessibleNames: uniqueLines(entries.map((entry) => entry.accessibleName)).slice(0, 5),
        }));

      return {
        buttonCount: buttons.length,
        duplicateVisibleLabelCount: duplicateVisibleLabels.length,
        duplicateVisibleLabels,
        samples: buttons.slice(0, 8),
      };
    };
    const collectUrlFirstMarkers = () => {
      const lookupResult = document.querySelector('[data-testid="flow-url-lookup-result"]');
      const customStart = document.querySelector('[data-testid="flow-url-custom-start-panel"]');
      const supplyForm = document.querySelector('[data-testid="flow-url-supply-candidate-form"]');
      const candidateList = document.querySelector('[data-testid="flow-url-supply-candidate-list"]');
      const requestDetail = document.querySelector('[data-testid="flow-url-supply-production-handoff"]');
      const resultText = normalizeLine(lookupResult?.textContent ?? '');

      return {
        resultVisible: Boolean(lookupResult && isVisible(lookupResult)),
        customStartVisible: Boolean(customStart && isVisible(customStart)),
        supplyFormVisible: Boolean(supplyForm && isVisible(supplyForm)),
        candidateListVisible: Boolean(candidateList && isVisible(candidateList)),
        requestDetailVisible: Boolean(requestDetail && isVisible(requestDetail)),
        hasHitResult: /이미 .*Flow/.test(resultText),
        hasMissResult: /아직 .*Flow/.test(resultText) && Boolean(supplyForm && isVisible(supplyForm)),
      };
    };
    const publicBrowseLinkFocusableIndex = focusableEntries.findIndex((entry) => entry.testId === 'flow-public-secondary-browse-link');
    const publicPrimaryPathFocusableIndex = focusableEntries.findIndex((entry) =>
      [
        'public-flow-mobile-save-cta',
        'public-flow-primary-setup',
        'public-flow-save-actions',
        'moving-save-actions',
      ].includes(entry.testId)
      || entry.text.includes('내 Flow에 저장')
      || entry.text.includes('내 도구로 가져가기'),
    );
    const restartNextTaskDateLabels = Array.from(document.querySelectorAll('[data-testid="moving-mobile-next-tasks"] article p'))
      .map((element) => normalizeLine(element.textContent ?? ''))
      .filter(Boolean);
    const restartNextTaskTitles = collectText('[data-testid="moving-mobile-next-tasks"] article h3');
    const restartFullScheduleGroupHeadings = collectText('[data-testid="moving-schedule-date-group-heading"]');
    const restartFullScheduleDateLabels = collectText('[data-testid="moving-schedule-date-group-heading"] span:nth-child(2)');
    const restartFullScheduleOffsetLabels = collectText('[data-testid="moving-schedule-date-group-heading"] span:first-child')
      .map((label) => label.replace(/\s*마일스톤\s+\d+개\s*$/, ''));
    const restartFullScheduleUniqueDateLabels = uniqueLines(restartFullScheduleDateLabels);
    const restartFullScheduleUniqueOffsetLabels = uniqueLines(restartFullScheduleOffsetLabels);
    const restartD30MilestoneGroupHeadingVisible = restartFullScheduleGroupHeadings.some((heading) =>
      /D-30.*마일스톤\s+3개/.test(heading),
    );
    const restartFirstThreeDateLabels = restartNextTaskDateLabels.slice(0, 3);
    const restartFirstThreeSameDateLabel = restartFirstThreeDateLabels.length === 3
      && restartFirstThreeDateLabels.every((label) => label === restartFirstThreeDateLabels[0]);

    return {
      category: payload.options.category ?? 'route',
      prototypeBucket: Boolean(payload.options.prototypeBucket),
      urlFirstState: payload.options.urlFirstState ?? null,
      url: window.location.pathname + window.location.search,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      scrollPurpose: payload.options.scrollPurpose ?? null,
      scrollY: Math.round(window.scrollY),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
      navVisible: Boolean(document.querySelector('[data-testid="platform-mobile-tabs"]')),
      publicShellVisible: Boolean(document.querySelector('[data-testid="flow-public-shell"]')),
      primarySaveActionVisible: hasVisibleElement('[data-testid="public-flow-mobile-save-cta"], [data-testid="public-flow-save-actions"], [data-testid="moving-save-actions"], [data-testid="flow-map-mobile-sticky-save"]'),
      browseLinkSecondaryCandidate: clickableLabels.includes('콘텐츠 더 보기'),
      firstClickableLabels: clickableLabels,
      firstFocusableLabels: focusableEntries.map((entry) => entry.text).filter(Boolean).slice(0, 18),
      internalHits: [],
      sourceSlugSignals: payload.sourceSlugSignals,
      sourceSlugHits: [],
      structuralDisplayHits: [],
      rawIsoLines: [],
      flowSuffixLines: [],
      firstTaskRepetitionHits: [],
      prototypeDisplayGateHits: {
        rawRouteSlugHits: [],
        englishWeekdayHits: [],
        englishUiVerbHits: [],
        englishMonthTimeHits: [],
        mixedExportLanguageHits: [],
        duplicateExportEntryHits: [],
      },
      guardrailRuntimeInputs: {
        normalizedPrimaryLines,
        normalizedSourceLines,
        nowSectionLines,
        firstTaskTitle,
        prototypeExportEntryLabels,
        inputValues,
      },
      repetitionCounts: {
        countScope: 'my-flow-queue-label-surfaces',
        firstTaskTitle: firstTaskTitle ? nowSectionLines.filter((line) => line.includes(firstTaskTitle)).length : 0,
        firstTaskLabel: countLabelText('먼저 할 일'),
        overdueLabel: countLabelText('지난 할 일'),
        legacyOverdueLabels: countLabelText('밀린 할 일') + countLabelText('지난 일정') + countLabelText('밀림'),
        nextTaskLabel: countLabelText('다음 할 일'),
        checkItemsLong: countText('확인할 항목'),
        checkItemsShort: countText('확인 항목'),
      },
      fixedRects: {
        platformMobileTabs: rectFor('[data-testid="platform-mobile-tabs"]'),
        flowMapStickySave: rectFor('[data-testid="flow-map-mobile-sticky-save"]'),
        publicMobileSaveCta: rectFor('[data-testid="public-flow-mobile-save-cta"]'),
        mobileExportBar: rectFor('[data-testid="mobile-export-bar"]'),
      },
      markers: {
        homeRecommendationCards: document.querySelectorAll('[data-home-recommendation-card="true"]').length,
        catalogCards: document.querySelectorAll('[data-testid="flow-map-catalog-card"], [data-testid="single-flow-catalog-card"]').length,
        postSavePanel: Boolean(document.querySelector('[data-testid="my-flow-post-save-panel"]')),
        myFlowNowSection: Boolean(document.querySelector('[data-testid="my-flow-now-section"]')),
        calendarSelectedDay: Boolean(document.querySelector('[data-testid="my-flow-calendar-selected-day"]')),
        statusSheetRows: document.querySelectorAll('[data-testid="my-flow-status-sheet-row"]').length,
        continuationActionable: collectContinuationActionable(),
        agendaGroupMeta: collectAgendaGroupMeta(),
        rowControlAccessibleNames: getRowControlAccessibleNames(),
        inventoryProgressMetrics: collectInventoryProgressMetrics(),
        inventoryHeaderMetrics: collectInventoryHeaderMetrics(),
        workbenchRepeatedDetailSentences: collectWorkbenchRepeatedDetailSentences(),
        publicWorkbenchExportLabels: collectPublicWorkbenchExportLabels(),
        urlFirst: collectUrlFirstMarkers(),
        inventoryRows: document.querySelectorAll('[data-testid="my-flow-group-row"]').length,
        restartInlineExportButtons: document.querySelectorAll('#moving-restart-export-panel button').length,
        restartMobileExportButtons: document.querySelectorAll('[data-testid="moving-mobile-export-actions"] button').length,
        workbenchRowDetailCount: document.querySelectorAll('[data-testid="artifact-list-card"] details').length,
        workbenchRowDetailSourceLinkCount: document.querySelectorAll('[data-testid="artifact-list-card"] details a[href]').length,
        workbenchSourceAccessLinkCount: document.querySelectorAll('[data-testid="flow-source-card"] a[href], [data-testid="used-car-source-bridge"] a[href], [data-testid="maintenance-source-bridge"] a[href]').length,
        publicPrimarySetupVisible: hasVisibleElement('[data-testid="public-flow-primary-setup"]'),
        publicBrowseLinkFocusable: publicBrowseLinkFocusableIndex >= 0,
        publicBrowseLinkFocusableIndex,
        publicPrimaryPathFocusableIndex,
        publicBrowseLinkAfterPrimary: publicBrowseLinkFocusableIndex >= 0
          && publicPrimaryPathFocusableIndex >= 0
          && publicBrowseLinkFocusableIndex > publicPrimaryPathFocusableIndex,
        restartScheduleDateCheck: {
          firstThreeDateLabels: restartFirstThreeDateLabels,
          firstThreeTitles: restartNextTaskTitles.slice(0, 3),
          firstThreeSameDateLabel: restartFirstThreeSameDateLabel ? restartFirstThreeDateLabels[0] : null,
          firstThreeSameD30Milestone: restartFirstThreeSameDateLabel && /D-30/.test(restartFirstThreeDateLabels[0] ?? ''),
          fullScheduleDateLabels: restartFullScheduleDateLabels,
          fullScheduleOffsetLabels: restartFullScheduleOffsetLabels,
          fullScheduleGroupHeadings: restartFullScheduleGroupHeadings,
          d30MilestoneGroupHeadingVisible: restartD30MilestoneGroupHeadingVisible,
          fullScheduleUniqueDateLabelCount: restartFullScheduleUniqueDateLabels.length,
          fullScheduleUniqueOffsetLabelCount: restartFullScheduleUniqueOffsetLabels.length,
          fullScheduleHasDistributedDates: restartFullScheduleUniqueDateLabels.length > 1 && restartFullScheduleUniqueOffsetLabels.length > 1,
        },
      },
    };
  }, {
    options,
    sourceSlugSignals,
  });

  const { guardrailRuntimeInputs, ...record } = pageScan;
  const primaryLines = guardrailRuntimeInputs?.normalizedPrimaryLines ?? [];
  const nowSectionLines = guardrailRuntimeInputs?.nowSectionLines ?? [];
  const firstTaskTitle = guardrailRuntimeInputs?.firstTaskTitle ?? '';
  const rawIsoInputValueScan = scanRawIsoInputValues(guardrailRuntimeInputs?.inputValues ?? []);
  const internalHits = findInternalCopyHits(primaryLines);
  const userSurfaceGuardrails = scanUserSurfaceGuardrails({
    primaryLines,
    sourceSlugSignals,
  });
  const prototypeRouteGuardrails = scanPrototypeRouteGuardrails({
    primaryLines,
    exportEntryLabels: guardrailRuntimeInputs?.prototypeExportEntryLabels ?? [],
  });
  const firstTaskRepetitionHits = firstTaskTitle
    ? findFirstTaskRepetitionHits(nowSectionLines, firstTaskTitle, { maxCount: 1 })
    : [];

  return {
    ...record,
    internalHits,
    sourceSlugSignals: userSurfaceGuardrails.sourceSlugSignals,
    sourceSlugHits: userSurfaceGuardrails.sourceSlugHits,
    structuralDisplayHits: userSurfaceGuardrails.structuralDisplayHits.map((line) => ({
      pattern: 'user-surface-guardrails',
      line,
    })),
    rawIsoLines: userSurfaceGuardrails.rawIsoDateHits,
    rawIsoInputValueHits: rawIsoInputValueScan.rawIsoInputValueHits,
    rawIsoInputValueExemptions: rawIsoInputValueScan.rawIsoInputValueExemptions,
    flowSuffixLines: userSurfaceGuardrails.trailingFlowSuffixHits,
    firstTaskRepetitionHits,
    prototypeDisplayGateHits: prototypeRouteGuardrails,
    repetitionCounts: {
      ...record.repetitionCounts,
      firstTaskTitle: firstTaskTitle
        ? nowSectionLines.filter((line) => line.includes(firstTaskTitle)).length
        : 0,
    },
  };
}

function summarizeEvidence(records) {
  const normal = records.filter((record) => !record.prototypeBucket);
  const fieldChecklistSourceDensity = records.filter((record) => record.category === 'field-checklist-source-density');
  const urlFirst = normal.filter((record) => record.category === 'url-first');
  const restart = records.filter((record) => record.prototypeBucket);
  const publicShareRoutes = normal.filter((record) => record.publicShellVisible);
  const restartSourceFrame = records.find((record) => record.id === '22-restart-moving-source-export-mobile');
  const restartBottomFrame = records.find((record) => record.id === '23-restart-moving-bottom-mobile');
  const restartScheduleFrame = records.find((record) => record.id === '24-restart-moving-full-schedule-mobile')
    ?? records.find((record) => record.id === '21-restart-moving-top-mobile');
  const restartScheduleDateCheck = restartScheduleFrame?.markers?.restartScheduleDateCheck ?? {};
  const restartFirstThreeSameD30Milestone = Boolean(
    restartScheduleDateCheck.firstThreeSameD30Milestone
    && restartScheduleDateCheck.fullScheduleHasDistributedDates,
  );
  const getAgendaGroups = (record) => [
    ...(record.markers?.agendaGroupMeta?.calendarSelectedDay?.groups ?? []),
    ...(record.markers?.agendaGroupMeta?.myFlowStatusSheet?.groups ?? []),
  ];
  const countAgendaGroupRows = (record, field) =>
    getAgendaGroups(record).reduce((sum, group) => sum + (group[field] ?? 0), 0);
  return {
    totalScreenshots: records.length,
    uiBaselineCommit,
    packageGeneratedFromCommit,
    packageCommitRef,
    normalRouteInternalHitCount: normal.reduce((sum, record) => sum + record.internalHits.length, 0),
    normalRouteSourceSlugHitCount: normal.reduce((sum, record) => sum + record.sourceSlugHits.length, 0),
    normalRouteStructuralDisplayHitCount: normal.reduce((sum, record) => sum + record.structuralDisplayHits.length + record.flowSuffixLines.length, 0),
    normalRouteRawIsoHitCount: normal.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    normalRouteInputRawIsoHitCount: normal.reduce((sum, record) => sum + (record.rawIsoInputValueHits?.length ?? 0), 0),
    normalRouteInputRawIsoExemptCount: normal.reduce((sum, record) => sum + (record.rawIsoInputValueExemptions?.length ?? 0), 0),
    normalRouteFirstTaskRepetitionHitCount: normal.reduce((sum, record) => sum + (record.firstTaskRepetitionHits?.length ?? 0), 0),
    normalRouteContinuationActionableCount: normal.filter((record) =>
      Boolean(record.markers?.continuationActionable?.controlFocusable),
    ).length,
    normalRouteContinuationExplanationOnlyCount: normal.filter((record) =>
      Boolean(record.markers?.continuationActionable?.explanationOnly),
    ).length,
    normalRouteAgendaGroupMetaCount: normal.reduce((sum, record) => sum + getAgendaGroups(record).length, 0),
    normalRouteAgendaGroupRepeatedDateMetaRowCount: normal.reduce((sum, record) =>
      sum + countAgendaGroupRows(record, 'repeatedDateMetaRowCount'),
    0),
    normalRouteAgendaGroupRepeatedTimingMetaRowCount: normal.reduce((sum, record) =>
      sum + countAgendaGroupRows(record, 'repeatedTimingMetaRowCount'),
    0),
    normalRouteStatusSheetGroupMetaCount: normal.reduce((sum, record) =>
      sum + (record.markers?.agendaGroupMeta?.myFlowStatusSheet?.groupCount ?? 0),
    0),
    normalRouteStatusSheetUngroupedRowCount: normal.reduce((sum, record) =>
      sum + (record.markers?.agendaGroupMeta?.myFlowStatusSheet?.ungroupedRowCount ?? 0),
    0),
    normalRouteRowControlAccessibleNameSampleCount: normal.reduce((sum, record) =>
      sum + (record.markers?.rowControlAccessibleNames?.length ?? 0),
    0),
    normalRouteRowControlAccessibleNameContextCount: normal.reduce((sum, record) =>
      sum + (record.markers?.rowControlAccessibleNames ?? []).filter((sample) => sample.hasContext).length,
    0),
    normalRouteInventoryDuplicateProgressMetricCount: normal.reduce((sum, record) =>
      sum + (record.markers?.inventoryProgressMetrics?.duplicateProgressMetricCount ?? 0),
    0),
    normalRouteInventoryHeaderLargeRemainingCount: normal.reduce((sum, record) =>
      sum + (record.markers?.inventoryHeaderMetrics?.largeRemainingCount ?? 0),
    0),
    urlFirstScenarioCount: urlFirst.length,
    urlFirstStatesCaptured: urlFirst.map((record) => record.urlFirstState ?? record.id),
    urlFirstNormalInternalHitCount: urlFirst.reduce((sum, record) => sum + record.internalHits.length, 0),
    urlFirstNormalSourceSlugHitCount: urlFirst.reduce((sum, record) => sum + record.sourceSlugHits.length, 0),
    urlFirstNormalStructuralDisplayHitCount: urlFirst.reduce((sum, record) => sum + record.structuralDisplayHits.length + record.flowSuffixLines.length, 0),
    urlFirstNormalRawIsoHitCount: urlFirst.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    urlFirstNormalInputRawIsoHitCount: urlFirst.reduce((sum, record) => sum + (record.rawIsoInputValueHits?.length ?? 0), 0),
    urlFirstMarkerVisibleCount: urlFirst.filter((record) => record.markers?.urlFirst?.resultVisible || record.markers?.urlFirst?.candidateListVisible).length,
    normalRouteQueueLabelScope: 'my-flow-queue-label-surfaces',
    normalRouteQueueLabelCount: normal.reduce((sum, record) =>
      sum
      + (record.repetitionCounts?.firstTaskLabel ?? 0)
      + (record.repetitionCounts?.overdueLabel ?? 0)
      + (record.repetitionCounts?.nextTaskLabel ?? 0),
    0),
    normalRouteLegacyOverdueLabelCount: normal.reduce((sum, record) => sum + (record.repetitionCounts?.legacyOverdueLabels ?? 0), 0),
    normalRouteHorizontalOverflowCount: normal.filter((record) => !record.noHorizontalOverflow).length,
    fieldWorkbenchRowDetailSourceLinkCount: fieldChecklistSourceDensity.reduce((sum, record) => sum + (record.markers.workbenchRowDetailSourceLinkCount ?? 0), 0),
    fieldWorkbenchSourceAccessLinkCount: fieldChecklistSourceDensity.reduce((sum, record) => sum + (record.markers.workbenchSourceAccessLinkCount ?? 0), 0),
    fieldWorkbenchOpenDetailCounts: fieldChecklistSourceDensity.map((record) => record.markers.workbenchRowDetailCount ?? 0),
    fieldWorkbenchRepeatedDetailSentenceCount: fieldChecklistSourceDensity.reduce((sum, record) =>
      sum + (record.markers.workbenchRepeatedDetailSentences?.repeatedSentenceCount ?? 0),
    0),
    publicWorkbenchDuplicateExportVisibleLabelCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.duplicateVisibleLabelCount ?? 0),
    0),
    publicShareRouteCount: publicShareRoutes.length,
    publicShareSecondaryBrowseFocusableCount: publicShareRoutes.filter((record) => record.markers.publicBrowseLinkFocusable).length,
    publicShareSecondaryBrowseAfterPrimaryCount: publicShareRoutes.filter((record) => record.markers.publicBrowseLinkAfterPrimary).length,
    publicShareSecondaryBrowseBeforePrimaryCount: publicShareRoutes.filter((record) =>
      record.markers.publicBrowseLinkFocusableIndex >= 0
      && record.markers.publicPrimaryPathFocusableIndex >= 0
      && record.markers.publicBrowseLinkFocusableIndex <= record.markers.publicPrimaryPathFocusableIndex,
    ).length,
    publicSharePrimaryPathFocusableCount: publicShareRoutes.filter((record) => record.markers.publicPrimaryPathFocusableIndex >= 0).length,
    publicSharePrimaryPathVisibleCount: publicShareRoutes.filter((record) =>
      record.primarySaveActionVisible || record.markers.publicPrimarySetupVisible,
    ).length,
    restartPrototypeRawIsoHitCount: restart.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    restartPrototypeInputRawIsoHitCount: restart.reduce((sum, record) => sum + (record.rawIsoInputValueHits?.length ?? 0), 0),
    restartPrototypeInputRawIsoExemptCount: restart.reduce((sum, record) => sum + (record.rawIsoInputValueExemptions?.length ?? 0), 0),
    restartPrototypeInputRawIsoExemptions: restart.flatMap((record) =>
      (record.rawIsoInputValueExemptions ?? []).map((hit) => ({
        route: record.url,
        scrollPurpose: record.scrollPurpose,
        label: hit.label,
        inputType: hit.inputType,
        testId: hit.testId ?? '',
        reason: hit.reason,
      })),
    ),
    restartPrototypeRawRouteSlugHitCount: restart.reduce((sum, record) => sum + (record.prototypeDisplayGateHits?.rawRouteSlugHits?.length ?? 0), 0),
    restartPrototypeEnglishWeekdayHitCount: restart.reduce((sum, record) => sum + (record.prototypeDisplayGateHits?.englishWeekdayHits?.length ?? 0), 0),
    restartPrototypeEnglishUiVerbHitCount: restart.reduce((sum, record) => sum + (record.prototypeDisplayGateHits?.englishUiVerbHits?.length ?? 0), 0),
    restartPrototypeEnglishMonthTimeHitCount: restart.reduce((sum, record) => sum + (record.prototypeDisplayGateHits?.englishMonthTimeHits?.length ?? 0), 0),
    restartPrototypeMixedExportLanguageHitCount: restart.reduce((sum, record) => sum + (record.prototypeDisplayGateHits?.mixedExportLanguageHits?.length ?? 0), 0),
    restartPrototypeDuplicateExportEntryHitCount: restart.reduce((sum, record) => sum + (record.prototypeDisplayGateHits?.duplicateExportEntryHits?.length ?? 0), 0),
    restartPrototypeHorizontalOverflowCount: restart.filter((record) => !record.noHorizontalOverflow).length,
    restartPrototypeInlineExportButtonCounts: restart.map((record) => record.markers.restartInlineExportButtons),
    restartPrototypeExportButtonCounts: restart.map((record) => record.markers.restartMobileExportButtons),
    restartPrototypeSourceBottomFramesDistinct: Boolean(
      restartSourceFrame
      && restartBottomFrame
      && restartSourceFrame.scrollY !== restartBottomFrame.scrollY
      && restartSourceFrame.screenshotHash !== restartBottomFrame.screenshotHash,
    ),
    restartPrototypeSourceExportScrollY: restartSourceFrame?.scrollY ?? null,
    restartPrototypeBottomScrollY: restartBottomFrame?.scrollY ?? null,
    restartPrototypeFirstThreeSameD30Milestone: restartFirstThreeSameD30Milestone,
    restartPrototypeD30MilestoneGroupHeadingVisible: Boolean(
      restartScheduleDateCheck.d30MilestoneGroupHeadingVisible,
    ),
    restartPrototypeFirstThreeDateLabels: restartScheduleDateCheck.firstThreeDateLabels ?? [],
    restartPrototypeFirstThreeTitles: restartScheduleDateCheck.firstThreeTitles ?? [],
    restartPrototypeFullScheduleUniqueDateLabelCount: restartScheduleDateCheck.fullScheduleUniqueDateLabelCount ?? 0,
    restartPrototypeFullScheduleUniqueOffsetLabelCount: restartScheduleDateCheck.fullScheduleUniqueOffsetLabelCount ?? 0,
    restartPrototypeDateDistributionJudgment: restartFirstThreeSameD30Milestone
      ? 'intentional-d30-milestone-group'
      : 'needs-date-display-review',
  };
}

function renderReadme(evidence) {
  return `# FlowMe Claude Design ${reviewCycle} Final Review Package

- Generated: ${evidence.generatedAt}
- Branch: \`${branchName}\`
- UI baseline commit: \`${evidence.uiBaselineCommit}\`
- Package generated from commit: \`${evidence.packageGeneratedFromCommit}\`
- Package commit ref: \`${evidence.packageCommitRef}\`
- Viewport: ${viewport.width}x${viewport.height}

This package freezes the P7-01 to P7-05 UX/UI baselines with P7-06 guardrails, the P8-01 generalized scan rules, the P8-02 restart/prototype promotion gate, the P8-03/P8-04 My Flow overdue label/status corrections, the P8-05/P8-06/P8-08 evidence/package metadata cleanup, the P8-07 restart date-display decision, the P8-09 field-checklist source-density rule, and the P8-10/P9-02 public share CTA/tab-order rule.

It also keeps the P9-01 to P9-07 coverage closed: data-driven guardrail coverage, accessible public browse-link ordering, My Flow structural-copy cleanup, source-slug punctuation scanning, restart/prototype English UI gate expansion, restart D-30 milestone grouping, and direct guardrail helper unit tests.

For P10, this package closes P10-01 to P10-07: guardrail/capture canonicalization, public share primary save/setup path evidence, actionable My Flow continuation, Calendar agenda group-header density, shorter visible control labels with accessible names, GitHub link-base cleanup, and visible-text/input-value raw ISO separation.

For P10-07 specifically, the scan separates raw ISO visible text from raw ISO input values. Native \`input[type=date]\` ISO values are treated as technical browser control values and recorded in an explicit exemption bucket; non-date input values with raw ISO remain guardrail hits.

P11-02 adds JSON-level evidence markers for the P10-03/P10-04/P10-05 claims: \`continuationActionable\`, \`agendaGroupMeta\`, and \`rowControlAccessibleNames\`. Claude Design can now judge the continuation row, Calendar/My Flow group metadata, and short visible labels with preserved accessible names from \`route-evidence.json\` without relying only on screenshots.

P11-04/P11-09 reduce My Flow inventory metric noise. Each saved-content row exposes one primary progress label, and the mobile all-tab header avoids large total remaining-count copy. The capture output records \`inventoryProgressMetrics\` and \`inventoryHeaderMetrics\` so duplicate progress metrics and large remaining-count headers can be judged from JSON markers.

P11-05/P11-06 keep the capture pipeline aligned with the canonical guardrail library and make native date input exemptions traceable by test id. P11-07/P11-10 keep fridge/washer setup paths measurable and allow the fridge first-action title to wrap to two lines on mobile. P11-08/P11-11 lower repeated field-checklist detail caution copy and extend public workbench export-label evidence so duplicate visible export entry points are caught.

P12-01~P12-04 add the URL-first first-execution slice to the normal user-route guardrail set. The package captures hit, custom-start, miss, and saved-candidate states on \`/flows\` and records URL-first-specific buckets for internal copy, dynamic source slug, structural title, raw ISO text, and input raw ISO hits. These scenarios should remain at zero while preserving canonical lookup, source-backed reuse, and non-executable local candidate storage.

## Files

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [prompt-ko.md](./prompt-ko.md)
- [screenshots/](./screenshots/)

## Guardrail Summary

- Normal route internal copy hits: ${evidence.summary.normalRouteInternalHitCount}
- Normal route source slug hits: ${evidence.summary.normalRouteSourceSlugHitCount}
- Normal route trailing Flow/map phrase hits: ${evidence.summary.normalRouteStructuralDisplayHitCount}
- Normal route raw ISO hits: ${evidence.summary.normalRouteRawIsoHitCount}
- Normal route input raw ISO hits: ${evidence.summary.normalRouteInputRawIsoHitCount}
- Normal route native date input raw ISO exemptions: ${evidence.summary.normalRouteInputRawIsoExemptCount}
- Normal route first task repetition hits: ${evidence.summary.normalRouteFirstTaskRepetitionHitCount}
- Normal route continuation actionable count: ${evidence.summary.normalRouteContinuationActionableCount}
- Normal route continuation explanation-only count: ${evidence.summary.normalRouteContinuationExplanationOnlyCount}
- Normal route agenda/status group marker count: ${evidence.summary.normalRouteAgendaGroupMetaCount}
- Normal route agenda/status repeated date meta rows: ${evidence.summary.normalRouteAgendaGroupRepeatedDateMetaRowCount}
- Normal route row control accessible name samples: ${evidence.summary.normalRouteRowControlAccessibleNameSampleCount}
- Normal route row control samples with context: ${evidence.summary.normalRouteRowControlAccessibleNameContextCount}
- URL-first normal scenarios captured: ${evidence.summary.urlFirstScenarioCount}
- URL-first states captured: ${JSON.stringify(evidence.summary.urlFirstStatesCaptured)}
- URL-first internal copy hits: ${evidence.summary.urlFirstNormalInternalHitCount}
- URL-first source slug hits: ${evidence.summary.urlFirstNormalSourceSlugHitCount}
- URL-first structural/trailing title hits: ${evidence.summary.urlFirstNormalStructuralDisplayHitCount}
- URL-first raw ISO hits: ${evidence.summary.urlFirstNormalRawIsoHitCount}
- URL-first input raw ISO hits: ${evidence.summary.urlFirstNormalInputRawIsoHitCount}
- URL-first visible marker count: ${evidence.summary.urlFirstMarkerVisibleCount}
- Normal route queue label scope: ${evidence.summary.normalRouteQueueLabelScope}
- Normal route legacy overdue label hits: ${evidence.summary.normalRouteLegacyOverdueLabelCount}
- Normal route horizontal overflow count: ${evidence.summary.normalRouteHorizontalOverflowCount}
- Field workbench row-detail source link count: ${evidence.summary.fieldWorkbenchRowDetailSourceLinkCount}
- Field workbench source access link count: ${evidence.summary.fieldWorkbenchSourceAccessLinkCount}
- Field workbench repeated detail caution count: ${evidence.summary.fieldWorkbenchRepeatedDetailSentenceCount}
- Public workbench duplicate export visible-label count: ${evidence.summary.publicWorkbenchDuplicateExportVisibleLabelCount}
- Public share route count: ${evidence.summary.publicShareRouteCount}
- Public share secondary browse focusable count: ${evidence.summary.publicShareSecondaryBrowseFocusableCount}
- Public share secondary browse after-primary count: ${evidence.summary.publicShareSecondaryBrowseAfterPrimaryCount}
- Public share secondary browse before-primary count: ${evidence.summary.publicShareSecondaryBrowseBeforePrimaryCount}
- Public share primary path focusable count: ${evidence.summary.publicSharePrimaryPathFocusableCount}
- Public share primary path visible count: ${evidence.summary.publicSharePrimaryPathVisibleCount}
- Restart prototype raw ISO hits: ${evidence.summary.restartPrototypeRawIsoHitCount}
- Restart prototype input raw ISO hits: ${evidence.summary.restartPrototypeInputRawIsoHitCount}
- Restart prototype native date input raw ISO exemptions: ${evidence.summary.restartPrototypeInputRawIsoExemptCount}
- Restart prototype raw route slug hits: ${evidence.summary.restartPrototypeRawRouteSlugHitCount}
- Restart prototype English weekday hits: ${evidence.summary.restartPrototypeEnglishWeekdayHitCount}
- Restart prototype English UI verb hits: ${evidence.summary.restartPrototypeEnglishUiVerbHitCount}
- Restart prototype English month/time hits: ${evidence.summary.restartPrototypeEnglishMonthTimeHitCount}
- Restart prototype mixed export-language hits: ${evidence.summary.restartPrototypeMixedExportLanguageHitCount}
- Restart prototype duplicate export-entry hits: ${evidence.summary.restartPrototypeDuplicateExportEntryHitCount}
- Restart source/export and bottom frames distinct: ${evidence.summary.restartPrototypeSourceBottomFramesDistinct}
- Restart first 3 rows are one D-30 milestone group: ${evidence.summary.restartPrototypeFirstThreeSameD30Milestone}
- Restart D-30 milestone group heading visible: ${evidence.summary.restartPrototypeD30MilestoneGroupHeadingVisible}
- Restart full schedule unique date labels: ${evidence.summary.restartPrototypeFullScheduleUniqueDateLabelCount}

## GitHub Links

- [Source root](${githubBase})
- [E2E guardrails](${githubBase}/tests/e2e/flow-mvp.spec.ts)
- [Workbench source density E2E](${githubBase}/tests/e2e/workbench-source-density.spec.ts)
- [Public share CTA/tab-order E2E](${githubBase}/tests/e2e/public-share-cta-order.spec.ts)
- [Capture script](${githubBase}/scripts/content-audit/${captureScriptName})
`;
}

function renderAudit(evidence) {
  const rows = evidence.scenarios.map((record) => (
    `| ${record.id} | \`${record.route}\` | ${record.label} | ${record.noHorizontalOverflow ? 'OK' : 'Overflow'} | ${record.internalHits.length} | ${record.sourceSlugHits.length} | ${record.rawIsoLines.length} | ${record.rawIsoInputValueHits?.length ?? 0} | ${record.rawIsoInputValueExemptions?.length ?? 0} |`
  )).join('\n');

  return `# Claude Design ${reviewCycle} Guardrail Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. P8-01 generalizes the same guardrails for new seed/source/route additions, P8-02 expands the restart/prototype promotion gate, P8-03/P8-04 fix My Flow overdue labeling/status accuracy, P8-05/P8-06/P8-08 clean up evidence duplication, label-count scope, and commit metadata, P8-07 confirms the \`/restart/moving-d30\` first-three-row date repetition as an intentional D-30 milestone group rather than a date-distribution bug, P8-09 lowers repeated row-level source links in field checklist workbenches, and P8-10/P9-02 keeps public share browse navigation accessible but after the primary save/input path. P9-01 to P9-07 then close the remaining guardrail coverage, accessibility ordering, structural-copy, punctuation, prototype gate, restart grouping, and guardrail-unit-test gaps.

P10-01 to P10-07 close the current review loop: capture uses the canonical \`user-surface-guardrails.ts\` rules, public share workbenches expose a visible/focusable primary save/setup path, My Flow continuation cards remain actionable, Calendar same-day agenda metadata is grouped, repeated visible control labels stay short while aria labels retain context, GitHub package links use the correct base, and raw ISO input values are separated from visible text. This does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

P10-07 extends the same evidence gate to input values: visible text raw ISO remains a failure, non-date input values with raw ISO remain a failure, and native \`input[type=date]\` values are recorded separately as technical browser control exemptions.

P11-02 keeps the UI unchanged and strengthens the evidence layer. The capture output now records \`continuationActionable\`, \`agendaGroupMeta\`, and \`rowControlAccessibleNames\` so P10-03/P10-04/P10-05 can be reviewed from JSON markers as well as screenshots. Calendar agenda groups and My Flow status-sheet groups use the same marker shape.

P11-04/P11-09 lower My Flow inventory density without changing progress calculations. Inventory rows keep a single visible progress label, the mobile all-tab header avoids large total remaining-count copy, and \`inventoryProgressMetrics\`/\`inventoryHeaderMetrics\` markers make those claims auditable from JSON.

P11-05/P11-06 keep capture/evidence rules centralized and traceable: internal-copy scans use the canonical guardrail helper, the browser context is Korean locale/Asia-Seoul timezone, and date inputs carry stable test ids for native raw ISO exemption evidence. P11-07/P11-10 keep fridge/washer setup paths visible and measurable, and the fridge first-action title can wrap to two lines. P11-08/P11-11 move repeated field-checklist caution copy into a common note and record public workbench export visible-label duplication as JSON evidence.

P12-01~P12-04 bring URL-first hit/custom-start/miss/candidate states into the normal user-route capture schema. The same guardrail buckets now cover \`/flows\` URL-first user surfaces, including source slug leakage such as \`Mathbang\`, raw ISO dates in candidate cards, production-only copy such as \`Canonical URL\`/\`handoff\`, and roadmap/queue/pipeline wording such as \`P0\`, \`대기열\`, or \`파이프라인\`.

## Baselines Covered

- P7-01: \`/restart/moving-d30\` uses user-facing date text and a quieter export hierarchy.
- P7-02: My Flow today/overdue/next queues are deduped.
- P7-03: My Flow 5+ saved list bottom clearance is verified.
- P7-04: Home shows a small curated recommendation set, not a single fixed experiment.
- P7-05: Public \`/f\` browse links remain secondary to \`내 Flow에 저장\`.
- P7-06/P8-01: Normal route scan buckets stay at zero for internal labels, dynamic source slug leaks, structural title suffixes, raw ISO dates, first-task repetition, and mobile overflow.
- P8-02/P9-05: Restart/prototype routes must also avoid raw route slugs, English weekday/month-time labels, English UI verbs, mixed export-language copy, and duplicate export entry points before promotion.
- P8-03/P8-04: My Flow uses \`지난 할 일\` consistently for overdue work, and past rows in the saved-content list are not labeled as \`다음 할 일\`.
- P8-05: Restart source/export and true-bottom frames are captured at separate scroll positions and carry screenshot hashes.
- P8-06: My Flow label repetition counters use \`my-flow-queue-label-surfaces\`, not full page body text.
- P8-07/P9-06: \`/restart/moving-d30\` first three visible rows share the same D-30 date because all three source rows are D-30 milestones; the full schedule now labels that cluster as a D-30 milestone group and later dates remain distributed.
- P8-08: UI baseline commit and package generation commit metadata are separated.
- P8-09: field checklist row details keep execution criteria/details, but repeated row-level source links are suppressed; source access remains available in the source/reference area.
- P8-10/P9-02: public \`/f/[slug]\` share screens keep \`콘텐츠 더 보기\` as an accessible secondary link, but place it after the primary save/input path in DOM/tab order.
- P9-01/P9-04/P9-05/P9-07: guardrail coverage is data-driven, source slug punctuation and prototype English UI classes are covered, and helper-level positive/negative unit tests lock the rules.
- P9-03: My Flow structural terms such as \`Flow 상태판\` are removed from user-facing copy and covered by structural-display guardrails.
- P9-06: restart full schedule groups same-day D-30 items under a visible milestone heading instead of repeating the date as unexplained row text.
- P10-01: capture/package evidence uses the canonical \`lib/flow/user-surface-guardrails.ts\` implementation rather than copied regex rules.
- P10-02: public \`/f/[slug]\` workbenches keep \`내 Flow에 저장\` or setup/input as visible, focusable primary paths before \`콘텐츠 더 보기\`.
- P10-03: My Flow \`지금 이어하기\` evidence is tied to an actionable first row, not an explanation-only card.
- P10-04: Calendar selected-day agenda groups shared same-day metadata in the group header instead of repeating chips on every row.
- P10-05: restart/My Flow visible row controls stay short, while accessible labels preserve the row title and action context.
- P10-06: generated GitHub links use the repository root base and avoid duplicate \`/flow-mvp\` path segments.
- P10-07: visible raw ISO text, raw ISO input hits, and native date input exemptions are counted separately.
- P11-01: My Flow overdue status sheets group shared date/content/timing metadata once per group.
- P11-02: continuation actionable state, Calendar/status-sheet group metadata, and row-control accessible-name samples are recorded as route-evidence markers.
- P11-04/P11-09: My Flow inventory rows avoid duplicate progress metrics, and the mobile all-tab header avoids large total remaining-count copy.
- P11-05/P11-06: capture guardrail logic stays canonical, locale/timezone are fixed, and native date input exemptions include concrete test ids.
- P11-07/P11-10: fridge/washer setup paths are visible/focusable evidence targets, and the fridge first-action title supports two-line mobile wrapping.
- P11-08/P11-11: field checklist repeated caution copy is common-note only, and public workbench export labels do not duplicate as ambiguous visible entry points.
- P12-01/P12-04: URL-first hit, custom-start, miss, and candidate states are captured as normal user-route scenarios and must keep URL-first internal/source/raw-ISO buckets at zero.

## Summary

\`\`\`json
${JSON.stringify(evidence.summary, null, 2)}
\`\`\`

## Scenario Matrix

| ID | Route | Scenario | Width | Internal | Source slug | Raw ISO | Input ISO | Native date input exempt |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
${rows}

## Restart Prototype Bucket

\`/restart/moving-d30\` remains outside the primary 4-tab IA. It is tracked as a prototype route, but it must still pass the display gate before any future promotion:

- no user-facing raw ISO dates
- no raw route slug such as \`restart / moving-d30\`
- no English weekday labels such as \`Sun Mon Tue\`
- no English month/time labels such as \`Jan\`, \`Feb\`, \`AM\`, or \`PM\`
- no English UI verbs such as \`download\`, \`copy\`, \`sync\`, or \`import\`
- no mixed export-language copy such as \`export\` plus Korean copy
- no duplicated primary export entry labels
- no source brand slug as title/subtitle copy
- no horizontal overflow at 390px
- native \`input[type=date]\` values may remain ISO as technical browser control values, but they are recorded in an explicit exemption bucket and must not appear as primary label/help/card text

The restart source/export frame and bottom frame must remain distinct:

- source/export scrollY: ${evidence.summary.restartPrototypeSourceExportScrollY}
- bottom scrollY: ${evidence.summary.restartPrototypeBottomScrollY}
- distinct hash/scroll evidence: ${evidence.summary.restartPrototypeSourceBottomFramesDistinct ? 'yes' : 'no'}
- first-three date labels: ${JSON.stringify(evidence.summary.restartPrototypeFirstThreeDateLabels)}
- first-three row titles: ${JSON.stringify(evidence.summary.restartPrototypeFirstThreeTitles)}
- D-30 milestone group heading visible: ${evidence.summary.restartPrototypeD30MilestoneGroupHeadingVisible ? 'yes' : 'no'}
- full schedule unique date labels: ${evidence.summary.restartPrototypeFullScheduleUniqueDateLabelCount}
- full schedule unique offset labels: ${evidence.summary.restartPrototypeFullScheduleUniqueOffsetLabelCount}
- date distribution judgment: ${evidence.summary.restartPrototypeDateDistributionJudgment}
- visible raw ISO hit count: ${evidence.summary.restartPrototypeRawIsoHitCount}
- input raw ISO hit count: ${evidence.summary.restartPrototypeInputRawIsoHitCount}
- native date input ISO exemption count: ${evidence.summary.restartPrototypeInputRawIsoExemptCount}
- native date input ISO exemptions: ${JSON.stringify(evidence.summary.restartPrototypeInputRawIsoExemptions)}

## Field Checklist Source Density

- row detail source link count: ${evidence.summary.fieldWorkbenchRowDetailSourceLinkCount}
- source/reference access link count: ${evidence.summary.fieldWorkbenchSourceAccessLinkCount}
- open detail counts: ${JSON.stringify(evidence.summary.fieldWorkbenchOpenDetailCounts)}

## Public Share CTA / Tab Order

- public share route count: ${evidence.summary.publicShareRouteCount}
- secondary browse focusable count: ${evidence.summary.publicShareSecondaryBrowseFocusableCount}
- secondary browse after-primary count: ${evidence.summary.publicShareSecondaryBrowseAfterPrimaryCount}
- secondary browse before-primary count: ${evidence.summary.publicShareSecondaryBrowseBeforePrimaryCount}
- primary save/input path focusable count: ${evidence.summary.publicSharePrimaryPathFocusableCount}
- primary save/input path visible count: ${evidence.summary.publicSharePrimaryPathVisibleCount}
- expected: \`콘텐츠 더 보기\` remains keyboard/screen-reader reachable as a quiet secondary link, but it should follow \`내 Flow에 저장\` or the input/setup path.

## Commit Metadata

- UI baseline commit: \`${evidence.uiBaselineCommit}\`
- Package generated from commit: \`${evidence.packageGeneratedFromCommit}\`
- Package commit ref: \`${evidence.packageCommitRef}\`

## Residual Risk

- This package is screenshot and E2E evidence, not a replacement for a live device review.
- Future seed additions should be checked against the same display-title/source/date guardrails before being promoted into primary routes.
`;
}

function renderPrompt(evidence) {
  return `아래 GitHub 소스/문서/screenshot만 보고 FlowMe ${reviewCycle} 마감 상태를 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로 검토해주세요.

검토 기준:
1. P4~P9 기준선이 P10 이후에도 실제 화면 기준으로 유지되는지 확인
2. P10-01 guardrail/capture 정본 단일화가 충분한지 확인
3. P10-02 공개 /f workbench primary save/setup path evidence가 충분한지 확인
   - \`내 Flow에 저장\` 또는 입력/setup path가 visible/focusable primary인지
   - \`콘텐츠 더 보기\`가 접근 가능하지만 primary 뒤의 보조 탐색인지
4. P10-03 My Flow \`지금 이어하기\`가 explanation-only card로 보이지 않는지 확인
5. P10-04 Calendar selected-day agenda에서 같은 날짜의 공통 metadata/chip이 과하게 반복되지 않는지 확인
6. P10-05 restart/My Flow row control label이 짧게 보이고 aria-label에는 전체 맥락이 보존되는지 확인
7. P10-06 GitHub link base가 실제 repository path에서 열리는지 확인
8. P10-07 raw ISO evidence가 visible text, user-visible input hit, native date input exemption을 올바르게 분리하는지 확인
9. 정상 사용자 route에서 아래 회귀가 다시 생길 위험이 있는지 확인
   - seed/source metadata에서 동적으로 추출되는 source slug가 제목/부제/주요 문구로 노출
   - 콘텐츠 제목 끝 Flow 접미
   - 일정 지도, 저장한 지도 같은 내부 구조형 표현
   - raw ISO 날짜
   - non-date input value의 raw ISO 날짜
   - My Flow 첫 할 일 제목 반복
   - 모바일 390px 좌우 overflow
   - 하단 fixed/sticky가 마지막 버튼/행/agenda를 가림
10. /restart/moving-d30 prototype bucket을 별도 관리하는 기준이 충분한지 확인
11. P8-09 field checklist workbench source-density guardrail이 충분한지 확인
   - new-car / used-car row detail source link count가 0인지
   - source/reference access link count가 0보다 크게 유지되는지
12. 단순 평가로 끝내지 말고, 필요하면 다음 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- ${reviewCycle} review package README: ${githubBase}/docs/content-audit/${packageName}/README.md
- Audit markdown: ${githubBase}/docs/content-audit/${packageName}/audit.md
- Review HTML: ${githubBase}/docs/content-audit/${packageName}/review.html
- Route evidence JSON: ${githubBase}/docs/content-audit/${packageName}/route-evidence.json
- Screenshots folder: ${githubBase}/docs/content-audit/${packageName}/screenshots
- E2E guardrails: ${githubBase}/tests/e2e/flow-mvp.spec.ts
- Workbench source density E2E: ${githubBase}/tests/e2e/workbench-source-density.spec.ts
- Public share CTA/tab-order E2E: ${githubBase}/tests/e2e/public-share-cta-order.spec.ts

현재 guardrail scan 요약:
\`\`\`json
${JSON.stringify(evidence.summary, null, 2)}
\`\`\`

요청 산출물:
1. route별 UX/UI 문제 목록
2. Blocking/High/Medium/Low 우선순위
3. 바로 개발 가능한 ${nextBacklogCycle} backlog
4. 유지해야 할 기준선
5. 화면별 구체 수정 지시
6. evidence가 부족한 시나리오
`;
}

function renderHtml(evidence) {
  const cards = evidence.scenarios.map((record) => `
    <article class="card">
      <div class="meta">${escapeHtml(record.id)} · ${escapeHtml(record.route)}</div>
      <h2>${escapeHtml(record.label)}</h2>
      <img src="${escapeHtml(record.screenshot)}" alt="${escapeHtml(record.label)}" loading="lazy" />
      <dl>
        <div><dt>overflow</dt><dd>${record.noHorizontalOverflow ? '0' : '1'}</dd></div>
        <div><dt>internal</dt><dd>${record.internalHits.length}</dd></div>
        <div><dt>source slug</dt><dd>${record.sourceSlugHits.length}</dd></div>
        <div><dt>raw ISO</dt><dd>${record.rawIsoLines.length}</dd></div>
        <div><dt>input ISO</dt><dd>${record.rawIsoInputValueHits?.length ?? 0}</dd></div>
        <div><dt>input ISO exempt</dt><dd>${record.rawIsoInputValueExemptions?.length ?? 0}</dd></div>
        <div><dt>scroll</dt><dd>${record.scrollY}</dd></div>
        <div><dt>purpose</dt><dd>${escapeHtml(record.scrollPurpose ?? '-')}</dd></div>
      </dl>
    </article>
  `.replace(/[ \t]+$/gm, '').trim()).join('\n\n');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowMe ${reviewCycle} Final Review Package</title>
  <style>
    :root { color-scheme: light; --bg: #fafaf8; --ink: #171717; --muted: #6b675f; --line: #e7e4dd; --brand: #3654ff; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: 0; }
    .lead { margin: 0 0 24px; color: var(--muted); line-height: 1.6; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 24px 0; }
    .stat, .card { border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 12px 36px rgba(30, 25, 18, 0.06); }
    .stat { padding: 16px; }
    .stat b { display: block; font-size: 26px; color: var(--brand); }
    .stat span { color: var(--muted); font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .card { padding: 14px; }
    .card h2 { margin: 6px 0 12px; font-size: 17px; }
    .meta { color: var(--muted); font-size: 12px; }
    img { width: 100%; border-radius: 12px; border: 1px solid var(--line); background: #f6f4ef; }
    dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 0; }
    dl div { border-radius: 10px; background: #f6f4ef; padding: 8px; }
    dt { color: var(--muted); font-size: 11px; }
    dd { margin: 2px 0 0; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>FlowMe ${reviewCycle} Final Review Package</h1>
    <p class="lead">P7/P8/P9/P10 기준선 위에 P11-01~P11-11 My Flow group header, continuation/status copy, inventory density, capture guardrail traceability, fridge/washer setup affordance, field-checklist detail density, public workbench export label evidence를 고정하기 위한 모바일 390px screenshot/evidence 패키지입니다.</p>
    <p class="meta">UI baseline commit: ${escapeHtml(evidence.uiBaselineCommit)} · Package generated from: ${escapeHtml(evidence.packageGeneratedFromCommit)} · Package commit ref: ${escapeHtml(evidence.packageCommitRef)}</p>
    <section class="summary">
      <div class="stat"><b>${evidence.summary.totalScreenshots}</b><span>screenshots</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInternalHitCount}</b><span>normal internal hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteSourceSlugHitCount}</b><span>normal source slug hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRawIsoHitCount}</b><span>normal raw ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInputRawIsoHitCount}</b><span>normal input ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInputRawIsoExemptCount}</b><span>normal input ISO exempt</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteFirstTaskRepetitionHitCount}</b><span>first task repeats</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteContinuationActionableCount}</b><span>continuation actionable</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteContinuationExplanationOnlyCount}</b><span>continuation explanation-only</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteAgendaGroupMetaCount}</b><span>agenda/status groups</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteAgendaGroupRepeatedDateMetaRowCount}</b><span>repeated date meta rows</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRowControlAccessibleNameSampleCount}</b><span>row control a11y samples</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRowControlAccessibleNameContextCount}</b><span>row control samples with context</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteLegacyOverdueLabelCount}</b><span>legacy overdue labels</span></div>
      <div class="stat"><b>${evidence.summary.fieldWorkbenchRepeatedDetailSentenceCount}</b><span>field repeated caution</span></div>
      <div class="stat"><b>${evidence.summary.publicWorkbenchDuplicateExportVisibleLabelCount}</b><span>public export label duplicates</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeRawIsoHitCount}</b><span>restart raw ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeInputRawIsoHitCount}</b><span>restart input ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeInputRawIsoExemptCount}</b><span>restart input ISO exempt</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeRawRouteSlugHitCount}</b><span>restart route slug hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeEnglishWeekdayHitCount}</b><span>restart English weekday hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeEnglishUiVerbHitCount}</b><span>restart English UI verb hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeEnglishMonthTimeHitCount}</b><span>restart English month/time hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeMixedExportLanguageHitCount}</b><span>restart mixed export hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeDuplicateExportEntryHitCount}</b><span>restart duplicate export entries</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeSourceBottomFramesDistinct ? 'yes' : 'no'}</b><span>restart source/bottom distinct</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeFirstThreeSameD30Milestone ? 'yes' : 'no'}</b><span>restart first 3 = D-30 group</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeD30MilestoneGroupHeadingVisible ? 'yes' : 'no'}</b><span>restart D-30 group heading</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeFullScheduleUniqueDateLabelCount}</b><span>restart full schedule dates</span></div>
      <div class="stat"><b>${evidence.summary.fieldWorkbenchRowDetailSourceLinkCount}</b><span>field row source links</span></div>
      <div class="stat"><b>${evidence.summary.fieldWorkbenchSourceAccessLinkCount}</b><span>field source access links</span></div>
      <div class="stat"><b>${evidence.summary.publicShareSecondaryBrowseBeforePrimaryCount}</b><span>public browse before primary</span></div>
    </section>
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
