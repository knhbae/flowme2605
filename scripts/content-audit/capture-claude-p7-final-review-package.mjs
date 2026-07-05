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

const forbiddenInternalTerms = [
  /\bdemo\b/i,
  /데모/,
  /\breview\b/i,
  /\baudit\b/i,
  /source-backed/i,
  /sourceTrace/,
  /partial_draft/,
  /source_import_required/,
  /검수 필요/,
  /정리 필요/,
  /후보 콘텐츠/,
  /\bFlow Map\b/,
  /\bStep\b/,
  /\bItem\b/,
];

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
  const context = await browser.newContext({ baseURL, viewport });
  const page = await context.newPage();

  try {
    await page.clock.install({ time: new Date(now) });

    await captureCleanRoute(page, '/', '01-home-mobile.png', 'Home entry and lightweight recommendations');
    await captureCleanRoute(page, '/flows', '02-flows-mobile.png', 'Flow catalog scan with lightweight CTAs');
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
    for (const element of Array.from(document.body.querySelectorAll(scanTextSelector)).filter((element) => isVisible(element) && !hasNestedScanText(element))) {
      const text = normalizeLine(element.textContent ?? '');
      if (!text) continue;
      if (element.closest(sourceContextSelector)) {
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

    const matches = (patterns) => patterns.flatMap((pattern) => {
      const regex = new RegExp(pattern.source, pattern.flags);
      return lines.filter((line) => regex.test(line)).map((line) => ({ pattern: pattern.label, line }));
    });

    const prototypeExportEntryLabels = Array.from(document.querySelectorAll('[data-testid="moving-mobile-export-actions"] button'))
      .map((element) => normalizeLine(element.textContent ?? ''))
      .filter(Boolean);

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
      internalHits: matches(payload.forbiddenInternalTerms),
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
    forbiddenInternalTerms: forbiddenInternalTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
    sourceSlugSignals,
  });

  const { guardrailRuntimeInputs, ...record } = pageScan;
  const primaryLines = guardrailRuntimeInputs?.normalizedPrimaryLines ?? [];
  const nowSectionLines = guardrailRuntimeInputs?.nowSectionLines ?? [];
  const firstTaskTitle = guardrailRuntimeInputs?.firstTaskTitle ?? '';
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
    sourceSlugSignals: userSurfaceGuardrails.sourceSlugSignals,
    sourceSlugHits: userSurfaceGuardrails.sourceSlugHits,
    structuralDisplayHits: userSurfaceGuardrails.structuralDisplayHits.map((line) => ({
      pattern: 'user-surface-guardrails',
      line,
    })),
    rawIsoLines: userSurfaceGuardrails.rawIsoDateHits,
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
  return {
    totalScreenshots: records.length,
    uiBaselineCommit,
    packageGeneratedFromCommit,
    packageCommitRef,
    normalRouteInternalHitCount: normal.reduce((sum, record) => sum + record.internalHits.length, 0),
    normalRouteSourceSlugHitCount: normal.reduce((sum, record) => sum + record.sourceSlugHits.length, 0),
    normalRouteStructuralDisplayHitCount: normal.reduce((sum, record) => sum + record.structuralDisplayHits.length + record.flowSuffixLines.length, 0),
    normalRouteRawIsoHitCount: normal.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    normalRouteFirstTaskRepetitionHitCount: normal.reduce((sum, record) => sum + (record.firstTaskRepetitionHits?.length ?? 0), 0),
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

For P9, it additionally closes P9-01 to P9-07: data-driven guardrail coverage, accessible public browse-link ordering, My Flow structural-copy cleanup, source-slug punctuation scanning, restart/prototype English UI gate expansion, restart D-30 milestone grouping, and direct guardrail helper unit tests.

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
- Normal route first task repetition hits: ${evidence.summary.normalRouteFirstTaskRepetitionHitCount}
- Normal route queue label scope: ${evidence.summary.normalRouteQueueLabelScope}
- Normal route legacy overdue label hits: ${evidence.summary.normalRouteLegacyOverdueLabelCount}
- Normal route horizontal overflow count: ${evidence.summary.normalRouteHorizontalOverflowCount}
- Field workbench row-detail source link count: ${evidence.summary.fieldWorkbenchRowDetailSourceLinkCount}
- Field workbench source access link count: ${evidence.summary.fieldWorkbenchSourceAccessLinkCount}
- Public share route count: ${evidence.summary.publicShareRouteCount}
- Public share secondary browse focusable count: ${evidence.summary.publicShareSecondaryBrowseFocusableCount}
- Public share secondary browse after-primary count: ${evidence.summary.publicShareSecondaryBrowseAfterPrimaryCount}
- Public share secondary browse before-primary count: ${evidence.summary.publicShareSecondaryBrowseBeforePrimaryCount}
- Public share primary path focusable count: ${evidence.summary.publicSharePrimaryPathFocusableCount}
- Public share primary path visible count: ${evidence.summary.publicSharePrimaryPathVisibleCount}
- Restart prototype raw ISO hits: ${evidence.summary.restartPrototypeRawIsoHitCount}
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
    `| ${record.id} | \`${record.route}\` | ${record.label} | ${record.noHorizontalOverflow ? 'OK' : 'Overflow'} | ${record.internalHits.length} | ${record.sourceSlugHits.length} | ${record.rawIsoLines.length} |`
  )).join('\n');

  return `# Claude Design ${reviewCycle} Guardrail Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. P8-01 generalizes the same guardrails for new seed/source/route additions, P8-02 expands the restart/prototype promotion gate, P8-03/P8-04 fix My Flow overdue labeling/status accuracy, P8-05/P8-06/P8-08 clean up evidence duplication, label-count scope, and commit metadata, P8-07 confirms the \`/restart/moving-d30\` first-three-row date repetition as an intentional D-30 milestone group rather than a date-distribution bug, P8-09 lowers repeated row-level source links in field checklist workbenches, and P8-10/P9-02 keeps public share browse navigation accessible but after the primary save/input path. P9-01 to P9-07 then close the remaining guardrail coverage, accessibility ordering, structural-copy, punctuation, prototype gate, restart grouping, and guardrail-unit-test gaps. This does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

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

## Summary

\`\`\`json
${JSON.stringify(evidence.summary, null, 2)}
\`\`\`

## Scenario Matrix

| ID | Route | Scenario | Width | Internal | Source slug | Raw ISO |
| --- | --- | --- | --- | ---: | ---: | ---: |
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
1. P7-01~P7-05가 실제 화면 기준으로 유지되는지 확인
2. P7-06/P8-01 guardrail 일반화가 충분한지 확인
3. P8-05/P8-06/P8-08의 evidence cleanup이 충분한지 확인
   - /restart source/export frame과 bottom frame이 서로 다른 scroll position/screenshot인지
   - My Flow 반복 라벨 카운터가 실제 queue/section label surface를 세는지
   - UI baseline commit과 package generation metadata가 헷갈리지 않는지
4. 정상 사용자 route에서 아래 회귀가 다시 생길 위험이 있는지 확인
   - seed/source metadata에서 동적으로 추출되는 source slug가 제목/부제/주요 문구로 노출
   - 콘텐츠 제목 끝 Flow 접미
   - 일정 지도, 저장한 지도 같은 내부 구조형 표현
   - raw ISO 날짜
   - My Flow 첫 할 일 제목 반복
   - 모바일 390px 좌우 overflow
   - 하단 fixed/sticky가 마지막 버튼/행/agenda를 가림
5. /restart/moving-d30 prototype bucket을 별도 관리하는 기준이 충분한지 확인
6. P8-09 field checklist workbench source-density guardrail이 충분한지 확인
   - new-car / used-car row detail source link count가 0인지
   - source/reference access link count가 0보다 크게 유지되는지
7. P8-10 public share CTA/tab-order guardrail이 충분한지 확인
   - 공개 /f 저장 전 화면에서 \`내 Flow에 저장\` 또는 입력/setup path가 primary인지
   - \`콘텐츠 더 보기\`가 시각적으로도 tab order/accessibility에서도 보조 링크로만 남는지
8. 단순 평가로 끝내지 말고, 필요하면 다음 backlog를 Blocking/High/Medium/Low로 작성

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

8. P9-01~P9-07 마감 기준이 충분한지 확인
   - seed/source 데이터 기반 guardrail coverage가 새 콘텐츠 추가에도 회귀를 잡을 수 있는지
   - source slug punctuation, prototype English UI gate, My Flow structural copy, restart D-30 milestone grouping, guardrail helper unit tests가 충분히 닫혔는지

요청 산출물:
1. route별 UX/UI 문제 목록
2. Blocking/High/Medium/Low 우선순위
3. 바로 개발 가능한 ${nextBacklogCycle} backlog
4. 유지해야 할 기준선
5. 화면별 구체 수정 지시
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
    <p class="lead">P7/P8 기준선 위에 P9-01~P9-07 guardrail coverage, 접근성 순서, My Flow 구조어, prototype gate, restart milestone grouping, helper unit test 기준을 고정하기 위한 모바일 390px screenshot/evidence 패키지입니다.</p>
    <p class="meta">UI baseline commit: ${escapeHtml(evidence.uiBaselineCommit)} · Package generated from: ${escapeHtml(evidence.packageGeneratedFromCommit)} · Package commit ref: ${escapeHtml(evidence.packageCommitRef)}</p>
    <section class="summary">
      <div class="stat"><b>${evidence.summary.totalScreenshots}</b><span>screenshots</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInternalHitCount}</b><span>normal internal hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteSourceSlugHitCount}</b><span>normal source slug hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRawIsoHitCount}</b><span>normal raw ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteFirstTaskRepetitionHitCount}</b><span>first task repeats</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteLegacyOverdueLabelCount}</b><span>legacy overdue labels</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeRawIsoHitCount}</b><span>restart raw ISO hits</span></div>
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
