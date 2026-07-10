import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
import { register } from 'tsx/esm/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
if (!process.env.FLOWME_EVIDENCE_TSX_RUNTIME) {
  const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const child = spawnSync(process.execPath, [tsxCli, fileURLToPath(import.meta.url)], {
    cwd: repoRoot,
    env: { ...process.env, FLOWME_EVIDENCE_TSX_RUNTIME: '1' },
    stdio: 'inherit',
    windowsHide: true,
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const tsxRuntime = register({ namespace: 'flowme-evidence-capture' });
const guardrailModule = await tsxRuntime.import(
  pathToFileURL(path.join(repoRoot, 'lib', 'flow', 'user-surface-guardrails.ts')).href,
  import.meta.url,
);
const guardrailExports = guardrailModule.default ?? guardrailModule;
const {
  findFirstTaskRepetitionHits,
  findInternalCopyHits,
  getPrototypeRouteTier,
  getPrototypeRouteTierPolicy,
  scanRawIsoInputValues,
  scanPrototypeRouteGuardrails,
  scanUserFacingOutputGuardrails,
  scanUserSurfaceGuardrails,
} = guardrailExports;
const supplyQueueModule = await tsxRuntime.import(
  pathToFileURL(path.join(repoRoot, 'lib', 'flow', 'url-first-supply-queue.ts')).href,
  import.meta.url,
);
const supplyQueueExports = supplyQueueModule.default ?? supplyQueueModule;
const {
  buildUrlFirstSupplyCandidateProductionMarkdown,
  getUrlFirstSupplyCandidateAvailability,
} = supplyQueueExports;
await tsxRuntime.unregister();
const packageName = process.env.FLOWME_EVIDENCE_PACKAGE_NAME || '2026-07-05-claude-design-p7-final-review-package';
const packageCycleMatch = packageName.match(/-p(\d+)-/i);
const inferredReviewCycle = packageCycleMatch ? `P${packageCycleMatch[1]}` : 'P7';
const reviewCycle = process.env.FLOWME_EVIDENCE_REVIEW_CYCLE || inferredReviewCycle;
const nextBacklogCycle = process.env.FLOWME_EVIDENCE_NEXT_BACKLOG || `P${Number(reviewCycle.replace(/^P/i, '')) + 1}`;
const reviewPackageTitle = packageName.includes('p21-04-draft-state')
  ? 'P21-04 Draft Lifecycle Evidence'
  : packageName.includes('p21-05-entry-calendar')
    ? 'P21-05 Home and Calendar Polish Evidence'
    : `${reviewCycle} Final Review Package`;
const captureScriptName = process.env.FLOWME_EVIDENCE_CAPTURE_SCRIPT || 'capture-claude-p7-final-review-package.mjs';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const viewport = { width: 390, height: 844 };
const wideViewport = { width: 1024, height: 768 };
const branchName = getCommandOutput('git', ['branch', '--show-current']) || 'codex/flowme-uxui-second-loop';
const uiBaselineCommit = getCommandOutput('git', ['rev-parse', '--short', 'HEAD']) || 'unknown';
const packageGeneratedFromCommit = uiBaselineCommit;
const packageCommitRef = process.env.FLOWME_EVIDENCE_PACKAGE_COMMIT || 'git commit containing this generated package';
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL || `http://127.0.0.1:${process.env.FLOWME_EVIDENCE_PORT || '3221'}`;
const shouldStartServer = !process.env.FLOWME_EVIDENCE_BASE_URL;
const githubBase = `https://github.com/knhbae/flowme2605/blob/${branchName}`;

const sourceSlugSignals = getDynamicSourceSlugSignals();

const now = '2026-05-28T09:00:00+09:00';
const urlFirstTriggerUrls = {
  hit: 'https://mathbang.net/13?utm_source=share',
  customStart: 'https://mathbang.net/13?utm_source=share',
  movingCustomStart: 'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363',
  miss: 'https://example.com/source-to-convert?utm_source=review',
  candidate: 'https://example.com/source-to-convert?utm_source=review',
  resolvedCandidate: 'https://mathbang.net/13?utm_source=share',
};

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
  calendarSameDateFlows: [
    { slug: 'moving-d30-basic', selectedArtifactMode: 'calendar', anchor: '2026-06-02' },
    { slug: 'computer-skills-d30-study', selectedArtifactMode: 'calendar', anchor: '2026-07-03' },
  ],
  calendarSameDateFlowStack: [
    { slug: 'computer-skills-d30-study', selectedArtifactMode: 'calendar', anchor: '2026-07-03' },
    { slug: 'study-exam-d30-plan', selectedArtifactMode: 'calendar', anchor: '2026-07-03' },
    { slug: 'overseas-travel-d14', selectedArtifactMode: 'calendar', anchor: '2026-06-17' },
    { slug: 'japan-esim-setup-before-departure', selectedArtifactMode: 'calendar', anchor: '2026-06-06' },
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
const userNavLeakScanRecords = [];

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
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  try {
    await page.clock.install({ time: new Date(now) });

    await captureCleanRoute(page, '/', '01-home-mobile.png', 'Home entry and lightweight recommendations');
    await captureCleanRoute(page, '/flows', '02-flows-mobile.png', 'Flow catalog scan with lightweight CTAs');
    await captureUrlFirstHit(page);
    await captureUrlFirstCustomStart(page);
    await captureUrlFirstMovingCustomStart(page);
    await captureUrlFirstMissCandidateForm(page);
    await captureUrlFirstCandidateDetail(page);
    await captureUrlFirstDraftMyFlowLanding(page);
    await captureUrlFirstDraftLifecycleStates(page);
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
    await savePublicFlowThroughUi(page, '/f/new-car-delivery-check', 'new-car-delivery-check');
    await captureCurrent(page, '12b-public-new-car-post-save-my-flow-mobile.png', 'Public share post-save My Flow completion boundary', {
      category: 'public-post-save',
      route: '/my',
      publicPostSaveOriginSlug: 'new-car-delivery-check',
    });

    await saveFlowMapThroughUi(page, '/flow-maps/moving-d30', 'moving-d30', '2026-07-22');
    await captureCurrent(page, '13-post-save-my-moving-mobile.png', 'Post-save My Flow for moving map', {
      category: 'saved-state',
      firstTaskTitle: '이사 방식과 견적 후보 정하기',
    });
    await captureMovingPersonalCopyAnchorSettings(page);
    await captureRoute(page, '/calendar', '14-calendar-after-moving-save-mobile.png', 'Calendar agenda-first after moving save', {
      category: 'saved-state',
    });
    await captureCalendarSameDateFlows(page, '43-calendar-same-date-multi-flow-mobile.png', 'Calendar same-date multi-Flow markers mobile', {
      category: 'calendar-same-date-flow',
      selectedDate: '2026-06-03',
    });
    await captureCalendarSameDateFlows(page, '43b-calendar-grid-flow-stack-mobile.png', 'Calendar grid compact same-date Flow stack mobile', {
      category: 'calendar-grid-flow-stack',
      selectedDate: '2026-06-03',
      fixture: savedFixtures.calendarSameDateFlowStack,
      p20CalendarGridCompactFixture: true,
    });

    await saveFlowMapThroughUi(page, '/flow-maps/middle-school-math-1', 'middle-school-math-1');
    await captureCurrent(page, '15-post-save-my-math-mobile.png', 'Post-save My Flow for undated math content', {
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
      prototypeTier: 'release-preview',
    });
    await page.getByTestId('moving-mobile-full-schedule').locator(':scope > button').last().click();
    await settle(page);
    await page.getByTestId('moving-full-schedule-list').scrollIntoViewIfNeeded();
    await captureCurrent(page, '24-restart-moving-full-schedule-mobile.png', 'Restart prototype full schedule date distribution', {
      category: 'prototype-restart',
      prototypeBucket: true,
      prototypeTier: 'release-preview',
      scrollPurpose: 'full-schedule-date-distribution',
    });
    await scrollRestartSourceExportIntoEvidenceFrame(page);
    await captureCurrent(page, '22-restart-moving-source-export-mobile.png', 'Restart prototype source and export hierarchy', {
      category: 'prototype-restart',
      prototypeBucket: true,
      prototypeTier: 'release-preview',
      scrollPurpose: 'source-export-mid-frame',
    });
    await scrollToPageBottom(page);
    await captureCurrent(page, '23-restart-moving-bottom-mobile.png', 'Restart prototype bottom clearance', {
      category: 'prototype-restart',
      prototypeBucket: true,
      prototypeTier: 'release-preview',
      scrollPurpose: 'true-page-bottom',
    });

    await captureRoute(page, '/flow-lab/url-first-p0', '31-flow-lab-url-first-p0-mobile.png', 'URL-first lab prototype bucket gate', {
      category: 'prototype-flow-lab',
      prototypeBucket: true,
      prototypeTier: 'internal-console',
      scrollPurpose: 'prototype-flow-lab-top',
    });
    await captureMyStudioProfileRoute(page, '39-creator-profile-my-flow-studio-mobile.png', 'Creator profile studio mobile surface with filled local content', {
      category: 'creator-profile',
      creatorProfileTier: 'creator-profile',
      creatorProfileKind: 'current-user-studio',
      scrollPurpose: 'creator-profile-mobile-top',
    });
    await captureCleanRoute(page, '/u/flow-curation-team', '41-creator-profile-flow-curation-team-mobile.png', 'Filled public creator profile mobile surface', {
      category: 'creator-profile',
      creatorProfileTier: 'creator-profile',
      creatorProfileKind: 'public-channel',
      scrollPurpose: 'creator-profile-public-mobile-top',
    });
    await captureWideViewportEvidence(page);
    await collectUserNavLeakScanEvidence(page);
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
    wideViewport,
    baseURL,
    summary: summarizeEvidence(scenarioRecords),
    userNavLeakScans: userNavLeakScanRecords,
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

async function setMyStudioProfileContentFixture(page) {
  await resetStorage(page);
  await page.goto('/flows');
  await settle(page);
  await page.evaluate(() => {
    const bundlesKey = 'flow_builder_mvp_bundles_v11';
    const sourceBundles = JSON.parse(window.localStorage.getItem(bundlesKey) ?? '[]');
    const makeStudioBundle = (slug, nextSlug, titleSuffix, status, usageCount, copyCount) => {
      const source = sourceBundles.find((bundle) => bundle?.flow?.slug === slug);
      if (!source) throw new Error(`Missing seed bundle for ${slug}`);
      const next = JSON.parse(JSON.stringify(source));
      const nextId = `flow-my-studio-${nextSlug}`;
      next.flow.id = nextId;
      next.flow.slug = nextSlug;
      next.flow.title = `${next.flow.title} ${titleSuffix}`;
      next.flow.status = status;
      next.flow.owner_user_id = 'user-my-studio';
      next.flow.creator_name = '나의 스튜디오';
      next.flow.creator_role = '내가 저장하고 만든 실행 콘텐츠';
      next.flow.creator_note = '내가 쓰기 좋게 정리한 콘텐츠만 모아 둡니다.';
      next.flow.usage_count = usageCount;
      next.flow.copy_count = copyCount;
      next.sections = next.sections.map((section) => ({ ...section, flow_id: nextId }));
      next.items = next.items.map((item) => ({ ...item, flow_id: nextId }));
      return next;
    };
    const fixtureSlugs = new Set([
      'my-studio-moving-d30',
      'my-studio-computer-study',
      'my-studio-vehicle-check',
      'my-studio-moving-copy',
      'my-studio-draft-note',
    ]);
    const kept = sourceBundles.filter((bundle) => !fixtureSlugs.has(bundle?.flow?.slug ?? ''));
    const fixtures = [
      makeStudioBundle('moving-d30-basic', 'my-studio-moving-d30', '정리본', 'published', 18, 5),
      makeStudioBundle('computer-skills-d30-study', 'my-studio-computer-study', '정리본', 'published', 12, 4),
      makeStudioBundle('vehicle-inspection-prep', 'my-studio-vehicle-check', '정리본', 'published', 9, 3),
      makeStudioBundle('moving-d30-basic', 'my-studio-moving-copy', '사본', 'published', 2, 1),
      makeStudioBundle('used-car-buying-check', 'my-studio-draft-note', '초안', 'draft', 0, 0),
    ];
    window.localStorage.setItem(bundlesKey, JSON.stringify([...kept, ...fixtures]));
  });
}

async function captureMyStudioProfileRoute(page, file, label, options = {}) {
  await setMyStudioProfileContentFixture(page);
  await captureRoute(page, '/u/my-flow-studio', file, label, options);
}

async function captureMyStudioDraftShelf(page, file, label, options = {}) {
  await page.goto('/u/my-flow-studio');
  await settle(page);
  const draftTab = page.getByTestId('creator-profile-draft-tab');
  if (await draftTab.count()) {
    await draftTab.click();
    await settle(page);
  }
  await captureCurrent(page, file, label, {
    category: 'creator-profile',
    creatorProfileTier: 'creator-profile',
    creatorProfileKind: 'current-user-studio-draft-shelf',
    ...options,
  });
}

async function captureCleanRoute(page, route, file, label, options = {}) {
  await resetStorage(page);
  await captureRoute(page, route, file, label, { category: 'normal-user-route', ...options });
}

async function captureWideViewportEvidence(page) {
  await page.setViewportSize(wideViewport);
  await captureCleanRoute(page, '/', '32-home-wide.png', 'Home wide viewport spot check', {
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureCleanRoute(page, '/flows', '33-flows-wide.png', 'Flow finding wide viewport spot check', {
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureCleanRoute(page, '/flow-maps/moving-d30', '34-flow-map-moving-wide.png', 'Moving map wide viewport spot check', {
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureCleanRoute(page, '/f/vehicle-inspection-prep', '35-public-vehicle-wide.png', 'Public share wide viewport spot check', {
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureCalendarSameDateFlows(page, '44-calendar-same-date-multi-flow-wide.png', 'Calendar same-date multi-Flow markers wide', {
    category: 'wide-viewport',
    wideViewport: true,
    selectedDate: '2026-06-03',
  });
  await captureCalendarSameDateFlows(page, '44b-calendar-grid-flow-stack-wide.png', 'Calendar grid compact same-date Flow stack wide', {
    category: 'calendar-grid-flow-stack',
    wideViewport: true,
    selectedDate: '2026-06-03',
    fixture: savedFixtures.calendarSameDateFlowStack,
    p20CalendarGridCompactFixture: true,
  });
  await saveFlowMapThroughUi(page, '/flow-maps/moving-d30', 'moving-d30', '2026-07-22');
  await captureCurrent(page, '36-post-save-my-moving-wide.png', 'Post-save My Flow wide viewport spot check', {
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureUrlFirstHit(page, {
    file: '37-url-first-hit-wide.png',
    label: 'URL-first hit wide viewport guardrail spot check',
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureUrlFirstCandidateDetail(page, {
    file: '38-url-first-candidate-detail-wide.png',
    label: 'URL-first candidate detail wide viewport guardrail spot check',
    category: 'wide-viewport',
    wideViewport: true,
  });
  await captureMyStudioProfileRoute(page, '40-creator-profile-my-flow-studio-wide.png', 'Creator profile studio wide surface with filled local content', {
    category: 'wide-viewport',
    creatorProfileTier: 'creator-profile',
    creatorProfileKind: 'current-user-studio',
    wideViewport: true,
    scrollPurpose: 'creator-profile-wide-top',
  });
  await captureCleanRoute(page, '/u/flow-curation-team', '42-creator-profile-flow-curation-team-wide.png', 'Filled public creator profile wide surface', {
    category: 'wide-viewport',
    creatorProfileTier: 'creator-profile',
    creatorProfileKind: 'public-channel',
    wideViewport: true,
    scrollPurpose: 'creator-profile-public-wide-top',
  });
  await page.setViewportSize(viewport);
  await settle(page);
}

async function captureCalendarSameDateFlows(page, file, label, options = {}) {
  await setSavedFlows(page, options.fixture ?? savedFixtures.calendarSameDateFlows);
  await page.goto('/calendar');
  await settle(page);
  await page.getByTestId('my-flow-month-picker').fill('2026-06');
  await page.locator('.fc-daygrid-day[data-date="2026-06-03"]').click();
  await settle(page);
  if (options.p20CalendarGridCompactFixture) {
    await page.getByTestId('my-flow-calendar-card').scrollIntoViewIfNeeded();
    await settle(page);
  }
  await captureCurrent(page, file, label, {
    ...options,
    category: options.category ?? 'calendar-same-date-flow',
    route: '/calendar',
    selectedDate: '2026-06-03',
    p18CalendarSameDateFlowFixture: true,
    p20CalendarGridCompactFixture: Boolean(options.p20CalendarGridCompactFixture),
  });
}

async function collectUserNavLeakScanEvidence(page) {
  const routes = [
    '/',
    '/flows',
    '/my',
    '/calendar',
    '/f/vehicle-inspection-prep',
    '/flow-maps/moving-d30',
  ];
  const viewports = [
    viewport,
    { width: 768, height: 844 },
    wideViewport,
  ];

  for (const targetViewport of viewports) {
    await page.setViewportSize(targetViewport);
    for (const route of routes) {
      await resetStorage(page);
      await page.goto(route);
      await settle(page);
      const scan = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]')).map((anchor) => {
          const rawHref = anchor.getAttribute('href') ?? '';
          try {
            const url = new URL(rawHref, window.location.href);
            return {
              rawHref,
              pathname: url.pathname,
              href: url.href,
            };
          } catch {
            return {
              rawHref,
              pathname: rawHref,
              href: rawHref,
            };
          }
        });
        return {
          flowLabPrototypeLinkCount: anchors.filter((anchor) => anchor.pathname === '/flow-lab/url-first-p0').length,
          manualRegistrationQaLinkCount: anchors.filter((anchor) =>
            anchor.href.includes('source-backed-manual-registration')
            || anchor.rawHref.includes('source-backed-manual-registration'),
          ).length,
        };
      });
      userNavLeakScanRecords.push({
        route,
        viewportWidth: targetViewport.width,
        viewportHeight: targetViewport.height,
        ...scan,
      });
    }
  }

  await page.setViewportSize(viewport);
  await settle(page);
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

async function saveFlowMapThroughUi(page, route, mapId, anchor = '') {
  await resetStorage(page);
  await page.goto(route);
  await settle(page);
  const anchorInput = page.getByTestId('flow-map-anchor-input');
  if (anchor && (await anchorInput.count())) {
    await anchorInput.fill(anchor);
  }
  const desktopSaveButton = page.getByTestId('flow-map-save-all');
  const mobileSaveButton = page.getByTestId('flow-map-save-all-mobile');
  const saveButton = await desktopSaveButton.isVisible().catch(() => false)
    ? desktopSaveButton
    : mobileSaveButton;
  await saveButton.click();
  await page.waitForURL(`**/my?savedMap=${mapId}`, { timeout: 15_000 });
  await settle(page);
}

async function savePublicFlowThroughUi(page, route, slug) {
  await resetStorage(page);
  await page.goto(route);
  await settle(page);
  const setup = page.getByTestId('public-flow-primary-setup');
  await setup.waitFor({ state: 'visible' });
  const saveButton = setup.locator('button').first();
  await saveButton.click();
  await settle(page);
  const myFlowLink = setup.locator('a[href="/my"]').first();
  await myFlowLink.click();
  await page.waitForURL('**/my', { timeout: 15_000 });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  const savedRow = page.locator(`[data-flow-slug="${slug}"]`).first();
  if (await savedRow.count()) {
    await savedRow.scrollIntoViewIfNeeded();
  }
  await settle(page);
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

async function collectUrlFirstExportModeEvidence(page) {
  const result = page.getByTestId('flow-url-lookup-result');
  const select = result.getByTestId('url-first-export-mode-select');
  if (!(await select.count())) return [];

  const options = await select.locator('option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: node.value,
      label: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    })),
  );
  const originalValue = await select.inputValue();
  const records = [];

  for (const option of options) {
    await select.selectOption(option.value);
    await settle(page);
    const textLines = (await result.innerText())
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const visibleMarkdownLines = Array.from(new Set(textLines.filter((line) => /\bMarkdown\b/i.test(line))));
    const visibleButtons = await result.locator('button').evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const style = window.getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        })
        .map((button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean),
    );
    records.push({
      exportMode: option.value,
      exportModeScanned: true,
      optionLabel: option.label,
      visibleMarkdownHitCount: visibleMarkdownLines.length,
      visibleMarkdownLines,
      visibleButtons,
    });
  }

  await select.selectOption(originalValue);
  await settle(page);
  return records;
}

async function captureUrlFirstHit(page, captureOptions = {}) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, urlFirstTriggerUrls.hit);
  await page.getByTestId('url-first-start-date-input').fill('2026-07-17');
  await settle(page);
  const urlFirstExportModeEvidence = await collectUrlFirstExportModeEvidence(page);
  await captureCurrent(page, captureOptions.file ?? '27-url-first-hit-mobile.png', captureOptions.label ?? 'URL-first hit result on Flow finding', {
    category: captureOptions.category ?? 'url-first',
    route: '/flows',
    urlFirstScenarioName: 'hit-default-start',
    urlFirstState: 'hit',
    urlFirstTriggerUrl: urlFirstTriggerUrls.hit,
    urlFirstExportModeEvidence,
    wideViewport: Boolean(captureOptions.wideViewport),
  });
}

async function captureUrlFirstCustomStart(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, urlFirstTriggerUrls.customStart);
  await page.getByTestId('flow-url-start-mode-custom').click();
  await page.getByTestId('flow-url-custom-start-panel').waitFor({ state: 'visible' });
  await page.getByTestId('url-first-start-date-input').fill('2026-07-17');
  await settle(page);
  const urlFirstExportModeEvidence = await collectUrlFirstExportModeEvidence(page);
  await captureCurrent(page, '28-url-first-custom-start-mobile.png', 'URL-first lightweight custom start panel', {
    category: 'url-first',
    route: '/flows',
    urlFirstScenarioName: 'hit-custom-start',
    urlFirstState: 'custom-start',
    urlFirstTriggerUrl: urlFirstTriggerUrls.customStart,
    urlFirstExportModeEvidence,
  });
}

async function captureUrlFirstMovingCustomStart(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, urlFirstTriggerUrls.movingCustomStart);
  await page.getByTestId('flow-url-start-mode-custom').click();
  await page.getByTestId('flow-url-custom-start-panel').waitFor({ state: 'visible' });
  await page.getByTestId('url-first-start-date-input').fill('2026-08-01');
  await settle(page);
  const urlFirstExportModeEvidence = await collectUrlFirstExportModeEvidence(page);
  await captureCurrent(page, '28b-url-first-moving-custom-start-mobile.png', 'URL-first moving custom start with contextual move date', {
    category: 'url-first',
    route: '/flows',
    urlFirstScenarioName: 'hit-moving-custom-start',
    urlFirstState: 'moving-custom-start',
    urlFirstTriggerUrl: urlFirstTriggerUrls.movingCustomStart,
    urlFirstExportModeEvidence,
  });
}

async function captureMovingPersonalCopyAnchorSettings(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, urlFirstTriggerUrls.movingCustomStart);
  await page.getByTestId('flow-url-start-mode-custom').click();
  await page.getByTestId('flow-url-custom-start-panel').waitFor({ state: 'visible' });
  await page.getByLabel('저장 이름').fill('8월 이사 핵심만');
  await page.getByTestId('url-first-start-date-input').fill('2026-08-01');
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.waitForURL('**/my?savedMap=curated-ajd-moving-d30', { timeout: 15_000 });
  await settle(page);
  await page.getByTestId('my-flow-view-flow').click();
  await settle(page);
  const personalFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="curated-ajd-moving-d30"]');
  await personalFlow.waitFor({ state: 'visible' });
  await personalFlow.getByTestId('my-flow-mobile-structure-open').click();
  await personalFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  await personalFlow.getByTestId('my-flow-personal-copy-settings').waitFor({ state: 'visible' });
  await settle(page);
  await captureCurrent(page, '13b-my-moving-personal-anchor-settings-mobile.png', 'My Flow moving personal copy anchor edit entry', {
    category: 'saved-state',
    route: '/my?savedMap=curated-ajd-moving-d30',
    firstTaskTitle: '이사 방식과 견적 후보 정하기',
  });
  await personalFlow.getByTestId('my-flow-personal-copy-settings').getByRole('button', { name: '취소' }).click();
  await settle(page);
  const firstStepRow = personalFlow.getByTestId('my-flow-mobile-structure-step-row').first();
  await firstStepRow.click();
  const personalDetail = personalFlow.getByTestId('my-flow-mobile-structure-inline-detail').getByTestId('my-flow-item-detail');
  await personalDetail.waitFor({ state: 'visible' });
  const readSummary = personalDetail.getByTestId('my-flow-detail-read-summary');
  if (await readSummary.locator('summary').count()) {
    await readSummary.locator('summary').click();
  }
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await personalDetail.getByTestId('my-flow-detail-date-input').waitFor({ state: 'visible' });
  await settle(page);
  await captureCurrent(page, '13c-my-moving-personal-step-date-override-mobile.png', 'My Flow moving personal copy item date override label', {
    category: 'saved-state',
    route: '/my?savedMap=curated-ajd-moving-d30',
    firstTaskTitle: '이사 방식과 견적 후보 정하기',
  });
}

async function captureUrlFirstMissCandidateForm(page) {
  await resetStorage(page);
  await lookupUrlFirstInput(page, urlFirstTriggerUrls.miss);
  await page.getByTestId('flow-url-supply-candidate-form').waitFor({ state: 'visible' });
  await captureCurrent(page, '29-url-first-miss-candidate-form-mobile.png', 'URL-first miss candidate form', {
    category: 'url-first',
    route: '/flows',
    urlFirstScenarioName: 'miss-candidate-form',
    urlFirstState: 'miss',
    urlFirstTriggerUrl: urlFirstTriggerUrls.miss,
  });
}

async function captureUrlFirstCandidateDetail(page, captureOptions = {}) {
  const pendingCandidateFixture = {
    canonicalUrl: 'https://example.com/source-to-convert',
    originalUrl: urlFirstTriggerUrls.candidate,
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
  };
  const resolvedCandidateFixture = {
    canonicalUrl: 'https://mathbang.net/13',
    originalUrl: urlFirstTriggerUrls.resolvedCandidate,
    title: '이미 실행 가능한 수학 후보',
    memo: '후보가 기존 콘텐츠로 연결된 상태',
    status: 'miss_request',
    savedAt: '2026-07-07T00:00:00.000Z',
    lastLookup: {
      status: 'hit',
      title: '이미 만들어진 콘텐츠가 있어요',
      checkedAt: '2026-07-07T00:00:00.000Z',
      canSaveToMyFlow: true,
      flowMapId: 'middle-school-math-1',
      routeHref: '/flow-maps/middle-school-math-1',
    },
  };
  await resetStorage(page);
  await page.goto('/flows');
  await page.evaluate((pendingCandidate) => {
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        pendingCandidate,
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
  }, pendingCandidateFixture);
  await page.reload();
  await settle(page);
  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await candidateList.waitFor({ state: 'visible' });
  const pendingCandidateCard = candidateList.locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' });
  await pendingCandidateCard.getByRole('button', { name: '요청 내용 보기' }).click();
  await settle(page);
  const urlFirstCandidateUserCopyEvidence = await collectUrlFirstCandidateUserCopyEvidence(page, pendingCandidateCard, pendingCandidateFixture);
  const draftOpen = pendingCandidateCard.getByTestId('flow-url-miss-draft-open');
  if (await draftOpen.count()) {
    await draftOpen.click();
    const draftAnchorInput = pendingCandidateCard.getByTestId('flow-url-miss-draft-anchor-date');
    if (await draftAnchorInput.count()) await draftAnchorInput.fill('2026-07-18');
    await settle(page);
  }
  const resolvedCandidateAvailability = getUrlFirstSupplyCandidateAvailability(resolvedCandidateFixture);
  const urlFirstCandidateResolvedHitScenario = {
    captured: true,
    triggerUrl: resolvedCandidateFixture.originalUrl,
    canonicalUrl: resolvedCandidateFixture.canonicalUrl,
    availabilityState: resolvedCandidateAvailability.state,
    lastLookupStatus: resolvedCandidateFixture.lastLookup?.status ?? null,
    routeHref: resolvedCandidateAvailability.lookup?.routeHref ?? resolvedCandidateFixture.lastLookup?.routeHref ?? null,
  };
  await captureCurrent(page, captureOptions.file ?? '30-url-first-candidate-detail-mobile.png', captureOptions.label ?? 'URL-first saved candidate request detail', {
    category: captureOptions.category ?? 'url-first',
    route: '/flows',
    urlFirstScenarioName: 'candidate-detail-expanded',
    urlFirstState: 'candidate',
    urlFirstTriggerUrl: urlFirstTriggerUrls.candidate,
    urlFirstCandidateExpandedDetailCaptured: true,
    urlFirstCandidateResolvedHitScenario,
    urlFirstCandidateUserCopyEvidence,
    wideViewport: Boolean(captureOptions.wideViewport),
  });
}

async function captureUrlFirstDraftMyFlowLanding(page) {
  await page.setViewportSize(viewport);
  await resetStorage(page);
  await lookupUrlFirstInput(page, 'https://example.com/p20-draft-source?utm_source=review');

  const result = page.getByTestId('flow-url-lookup-result');
  const form = result.getByTestId('flow-url-supply-candidate-form');
  await form.waitFor({ state: 'visible' });
  await form.locator('input').fill('주말 준비 초안 요청');
  await form.locator('textarea').fill('저장 후 내 일정에 맞게 손볼 메모');
  await form.locator('button[type="submit"]').click();
  await settle(page);

  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '주말 준비 초안 요청' })
    .first();
  await candidateCard.waitFor({ state: 'visible' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const draftEditor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await draftEditor.waitFor({ state: 'visible' });
  await draftEditor.getByTestId('flow-url-miss-draft-flow-title').fill('주말 준비 초안');
  await draftEditor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');
  await draftEditor.getByTestId('flow-url-miss-draft-save').click();
  await page.waitForURL(/\/my/);
  await settle(page);

  await captureMyStudioDraftShelf(
    page,
    '39e-url-first-draft-studio-shelf-mobile.png',
    'URL-first draft in Studio draft shelf mobile',
    {
      route: '/u/my-flow-studio',
      scrollPurpose: 'studio-draft-shelf-mobile',
    },
  );
  await page.setViewportSize(wideViewport);
  await captureMyStudioDraftShelf(
    page,
    '39f-url-first-draft-studio-shelf-wide.png',
    'URL-first draft in Studio draft shelf wide',
    {
      route: '/u/my-flow-studio',
      wideViewport: true,
      scrollPurpose: 'studio-draft-shelf-wide',
    },
  );
  await page.setViewportSize(viewport);
  await page.goto('/my');
  await settle(page);

  await page.getByTestId('my-flow-view-flow').click();
  await settle(page);
  const mobileDraftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]').first();
  await mobileDraftFlow.waitFor({ state: 'visible' });
  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  let settings = mobileDraftFlow.getByTestId('my-flow-personal-copy-settings');
  await settings.waitFor({ state: 'visible' });
  await settings.getByTestId('my-flow-personal-copy-start-date-input').fill('2026-07-25');
  await settings.locator('button[type="submit"]').click();
  await settle(page);

  if ((await mobileDraftFlow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
    await mobileDraftFlow.getByTestId('my-flow-mobile-structure-open').click();
    await settle(page);
  }
  await mobileDraftFlow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  const mobileDetail = mobileDraftFlow
    .getByTestId('my-flow-mobile-structure-inline-detail')
    .getByTestId('my-flow-item-detail');
  await mobileDetail.waitFor({ state: 'visible' });
  const readSummary = mobileDetail.getByTestId('my-flow-detail-read-summary');
  if (await readSummary.locator('summary').count()) {
    await readSummary.locator('summary').click();
    await settle(page);
  }
  await captureCurrent(page, '39a-url-first-draft-item-edit-entry-mobile.png', 'URL-first draft item edit entry in My Flow', {
    category: 'saved-state',
    route: '/my',
  });
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await mobileDetail.getByTestId('my-flow-detail-title-input').fill('내 일정에 맞춘 첫 단계');
  await mobileDetail.getByTestId('my-flow-detail-date-input').fill('2026-07-27');
  await mobileDetail.getByTestId('my-flow-detail-memo').fill('초안에서 직접 고친 사용자 메모');
  await mobileDetail.getByTestId('my-flow-detail-save-changes').click();
  await settle(page);

  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  settings = mobileDraftFlow.getByTestId('my-flow-personal-copy-settings');
  await settings.waitFor({ state: 'visible' });
  await settings.getByTestId('my-flow-personal-copy-start-date-input').fill('2026-07-30');
  await settings.locator('button[type="submit"]').click();
  await settle(page);

  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  await mobileDraftFlow.getByTestId('my-flow-personal-copy-settings').waitFor({ state: 'visible' });
  await captureCurrent(page, '39b-url-first-draft-anchor-edit-mobile.png', 'URL-first draft anchor edit policy in My Flow mobile', {
    category: 'saved-state',
    route: '/my',
  });

  await page.setViewportSize(wideViewport);
  await page.goto('/my');
  await settle(page);
  await page.getByTestId('my-flow-view-flow').click();
  await settle(page);
  const wideDraftFlow = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug^="url-draft-"]').first();
  await wideDraftFlow.waitFor({ state: 'visible' });
  await wideDraftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
  await wideDraftFlow.getByTestId('my-flow-personal-copy-settings').waitFor({ state: 'visible' });
  await captureCurrent(page, '39c-url-first-draft-anchor-edit-wide.png', 'URL-first draft anchor edit policy in My Flow wide', {
    category: 'saved-state',
    route: '/my',
    wideViewport: true,
  });

  await page.setViewportSize(viewport);
  await page.goto('/calendar');
  await settle(page);
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await settle(page);
  const overriddenEvent = page.locator('.fc-daygrid-day[data-date="2026-07-27"] .fc-event').first();
  await overriddenEvent.waitFor({ state: 'visible' });
  await overriddenEvent.click();
  await settle(page);
  const calendarDetail = page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-item-detail');
  await calendarDetail.waitFor({ state: 'visible' });
  const portableExport = calendarDetail.getByTestId('my-flow-detail-portable-export');
  const portableExportSummary = portableExport.locator('summary');
  if ((await portableExportSummary.count()) > 0) {
    await portableExportSummary.click();
    await settle(page);
  }
  await calendarDetail.getByTestId('my-flow-detail-copy-portable-text').click();
  const copiedDraftText = await page.evaluate(() => navigator.clipboard.readText());
  const draftFlowCalendarProjectionUpdated = await overriddenEvent.isVisible()
    && copiedDraftText.includes('내 일정에 맞춘 첫 단계')
    && copiedDraftText.includes('초안에서 직접 고친 사용자 메모');
  const draftFlowExportProjectionUpdated = copiedDraftText.includes('내 일정에 맞춘 첫 단계')
    && copiedDraftText.includes('초안에서 직접 고친 사용자 메모')
    && !/source-backed|handoff|Canonical URL|\bStep\b/u.test(copiedDraftText);
  await captureCurrent(page, '39d-url-first-draft-calendar-export-mobile.png', 'URL-first draft Calendar and export projection', {
    category: 'saved-state',
    route: '/calendar',
    selectedDate: '2026-07-27',
    draftFlowCalendarProjectionUpdated,
    draftFlowExportProjectionUpdated,
    draftFlowExportSampleLength: copiedDraftText.length,
    draftFlowExportSampleHash: crypto.createHash('sha256').update(copiedDraftText).digest('hex'),
  });
}

async function prepareUrlFirstDraftEditor(page, {
  url,
  requestTitle,
  requestMemo,
  flowTitle,
  anchorDate = '',
}) {
  await page.setViewportSize(viewport);
  await resetStorage(page);
  await lookupUrlFirstInput(page, url);

  const result = page.getByTestId('flow-url-lookup-result');
  const form = result.getByTestId('flow-url-supply-candidate-form');
  await form.waitFor({ state: 'visible' });
  await form.getByLabel('요청 제목').fill(requestTitle);
  await form.getByLabel('요청 메모').fill(requestMemo);
  await form.getByRole('button', { name: '초안 요청 저장' }).click();
  await settle(page);

  const candidateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: requestTitle })
    .first();
  await candidateCard.waitFor({ state: 'visible' });
  await candidateCard.getByTestId('flow-url-miss-draft-open').click();
  const editor = candidateCard.getByTestId('flow-url-miss-draft-editor');
  await editor.waitFor({ state: 'visible' });
  await editor.getByTestId('flow-url-miss-draft-flow-title').fill(flowTitle);
  if (anchorDate) await editor.getByTestId('flow-url-miss-draft-anchor-date').fill(anchorDate);
  return { candidateCard, editor };
}

async function captureDraftLifecycleAtViewports(page, fileStem, label, draftLifecycle) {
  await page.setViewportSize(viewport);
  await settle(page);
  await captureCurrent(page, `${fileStem}-mobile.png`, `${label} mobile`, {
    category: 'draft-lifecycle',
    draftLifecycle,
  });
  await page.setViewportSize(wideViewport);
  await settle(page);
  await captureCurrent(page, `${fileStem}-wide.png`, `${label} wide`, {
    category: 'draft-lifecycle',
    wideViewport: true,
    draftLifecycle,
  });
  await page.setViewportSize(viewport);
}

async function getStoredUrlDraftState(page) {
  return page.evaluate(() => {
    const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
    const drafts = bundles.filter((bundle) => bundle?.flow?.slug?.startsWith('url-draft-'));
    return {
      count: drafts.length,
      slug: drafts[0]?.flow?.slug ?? '',
      itemIds: (drafts[0]?.items ?? []).map((item) => item.id).filter(Boolean),
    };
  });
}

async function captureUrlFirstDraftLifecycleStates(page) {
  const failure = await prepareUrlFirstDraftEditor(page, {
    url: 'https://example.com/p21-draft-failure?utm_source=review',
    requestTitle: '저장 실패를 확인할 주말 준비 요청',
    requestMemo: '준비물 확인, 일정 정리, 마지막 점검',
    flowTitle: '저장 실패를 확인할 주말 준비',
    anchorDate: '2026-06-06',
  });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__flowmeOriginalStorageSetItem = original;
    Storage.prototype.setItem = function setItemWithDraftFailure(key, value) {
      if (key === 'flow_builder_mvp_bundles_v11') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await failure.editor.getByTestId('flow-url-miss-draft-save').click();
  const failureFeedback = failure.candidateCard.getByTestId('flow-url-miss-draft-feedback');
  await failureFeedback.waitFor({ state: 'visible' });
  const failureInputPreserved = await failure.editor.getByTestId('flow-url-miss-draft-flow-title').inputValue() === '저장 실패를 확인할 주말 준비'
    && await failure.editor.getByTestId('flow-url-miss-draft-anchor-date').inputValue() === '2026-06-06';
  const failureDraftCount = (await getStoredUrlDraftState(page)).count;
  await captureDraftLifecycleAtViewports(page, '45-draft-save-failure', 'Draft save failure with preserved input', {
    state: 'save-failure',
    stateGroup: 'failure',
    captured: true,
    userRecoveryVisible: await failureFeedback.isVisible(),
    inputPreserved: failureInputPreserved,
    savedDraftCount: failureDraftCount,
    reason: null,
    nextAction: 'retry-after-storage-check',
  });
  await page.evaluate(() => {
    if (window.__flowmeOriginalStorageSetItem) Storage.prototype.setItem = window.__flowmeOriginalStorageSetItem;
    delete window.__flowmeOriginalStorageSetItem;
  });

  const duplicate = await prepareUrlFirstDraftEditor(page, {
    url: 'https://example.com/p21-draft-duplicate?utm_source=review',
    requestTitle: '중복 없이 이어갈 주말 준비 요청',
    requestMemo: '준비물 확인, 일정 정리, 마지막 점검',
    flowTitle: '중복 없이 이어갈 주말 준비',
    anchorDate: '2026-06-06',
  });
  await duplicate.editor.getByTestId('flow-url-miss-draft-save').click();
  await page.waitForURL(/\/my/);
  await settle(page);
  const beforeDuplicate = await getStoredUrlDraftState(page);
  await page.goto('/flows');
  await settle(page);
  const duplicateCard = page
    .getByTestId('flow-url-supply-candidate-list')
    .locator('article')
    .filter({ hasText: '중복 없이 이어갈 주말 준비 요청' })
    .first();
  await duplicateCard.getByTestId('flow-url-miss-draft-open').click();
  const duplicateEditor = duplicateCard.getByTestId('flow-url-miss-draft-editor');
  await duplicateEditor.getByTestId('flow-url-miss-draft-save').click();
  const duplicateFeedback = duplicateCard.getByTestId('flow-url-miss-draft-feedback');
  await duplicateFeedback.waitFor({ state: 'visible' });
  const afterDuplicate = await getStoredUrlDraftState(page);
  const duplicateRecoveryLink = duplicateFeedback.getByRole('link', { name: 'My Flow에서 이어서 수정' });
  await captureDraftLifecycleAtViewports(page, '46-draft-duplicate', 'Duplicate draft returns to existing saved draft', {
    state: 'duplicate-draft',
    stateGroup: 'duplicate',
    captured: true,
    userRecoveryVisible: await duplicateRecoveryLink.isVisible(),
    createsExtraSavedFlow: afterDuplicate.count > beforeDuplicate.count,
    beforeSavedDraftCount: beforeDuplicate.count,
    afterSavedDraftCount: afterDuplicate.count,
    existingDraftSlugPreserved: beforeDuplicate.slug === afterDuplicate.slug,
    reason: null,
    nextAction: 'open-existing-draft',
  });

  await resetStorage(page);
  await page.goto('/my');
  await settle(page);
  const myFlowEmptyVisible = await page.getByTestId('my-flow-empty-state').isVisible();
  await captureDraftLifecycleAtViewports(page, '47a-draft-empty-my-flow', 'Empty My Flow recovery entry', {
    state: 'empty-my-flow',
    stateGroup: 'empty',
    captured: true,
    userRecoveryVisible: myFlowEmptyVisible,
    surface: 'my-flow',
    reason: null,
    nextAction: 'open-flow-finding',
  });
  await page.goto('/calendar');
  await settle(page);
  const calendarEmptyVisible = await page.getByTestId('my-flow-empty-state').isVisible();
  await captureDraftLifecycleAtViewports(page, '47b-draft-empty-calendar', 'Empty Calendar recovery entry', {
    state: 'empty-calendar',
    stateGroup: 'empty',
    captured: true,
    userRecoveryVisible: calendarEmptyVisible,
    surface: 'calendar',
    reason: null,
    nextAction: 'open-flow-finding',
  });

  const completed = await prepareUrlFirstDraftEditor(page, {
    url: 'https://example.com/p21-draft-completed?utm_source=review',
    requestTitle: '완료 상태를 확인할 주말 준비 요청',
    requestMemo: '준비물 확인, 일정 정리, 마지막 점검',
    flowTitle: '완료 상태를 확인할 주말 준비',
    anchorDate: '2026-05-28',
  });
  await completed.editor.getByTestId('flow-url-miss-draft-save').click();
  await page.waitForURL(/\/my/);
  await settle(page);
  const completedDraft = await getStoredUrlDraftState(page);
  await page.evaluate(({ slug, itemIds }) => {
    window.localStorage.setItem(
      `flow_builder_mvp_checks_${slug}`,
      JSON.stringify(Object.fromEntries(itemIds.map((itemId) => [itemId, true]))),
    );
  }, completedDraft);
  await page.reload();
  await settle(page);
  await page.getByTestId('my-flow-view-flow').click();
  await settle(page);
  const completedFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]').first();
  await completedFlow.waitFor({ state: 'visible' });
  const completedProgressVisible = (await completedFlow.innerText()).includes(`전체 ${completedDraft.itemIds.length}/${completedDraft.itemIds.length} 완료`);
  await captureDraftLifecycleAtViewports(page, '48-draft-completed-zero', 'Draft completed with zero remaining', {
    state: 'completed-zero',
    stateGroup: 'completed',
    captured: true,
    userRecoveryVisible: true,
    completedCount: completedDraft.itemIds.length,
    remainingCount: 0,
    contextualProgressVisible: completedProgressVisible,
    reason: null,
    nextAction: 'uncheck-to-reopen',
  });

  await page.setViewportSize(viewport);
  let completedStepRows = completedFlow.getByTestId('my-flow-mobile-structure-step-row');
  if ((await completedStepRows.count()) === 0) {
    await completedFlow.getByTestId('my-flow-mobile-structure-open').click();
    await settle(page);
    completedStepRows = completedFlow.getByTestId('my-flow-mobile-structure-step-row');
  }
  await completedStepRows.first().click();
  await settle(page);
  const completionControl = completedFlow
    .getByTestId('my-flow-mobile-structure-inline-detail')
    .getByTestId('my-flow-task-complete-control')
    .first();
  await completionControl.waitFor({ state: 'visible' });
  await page.context().setOffline(true);
  await completionControl.click();
  const offlineChecks = await page.evaluate((slug) => JSON.parse(
    window.localStorage.getItem(`flow_builder_mvp_checks_${slug}`) || '{}',
  ), completedDraft.slug);
  const offlineLocalActionsAvailable = Object.values(offlineChecks).filter(Boolean).length === completedDraft.itemIds.length - 1;
  await captureDraftLifecycleAtViewports(page, '49-draft-offline-local-action', 'Already-open draft local action while offline', {
    state: 'offline-local-action',
    stateGroup: 'offline',
    captured: true,
    userRecoveryVisible: true,
    scope: 'already-open-my-flow-route',
    localActionsAvailable: offlineLocalActionsAvailable,
    networkNavigationClaimed: false,
    reason: null,
    nextAction: 'continue-local-work-or-reconnect-for-navigation',
  });
  await page.context().setOffline(false);
  await page.setViewportSize(viewport);
}

async function collectUrlFirstCandidateUserCopyEvidence(page, candidateCard, candidateFixture) {
  await candidateCard.getByTestId('flow-url-supply-user-summary-copy').click();
  await candidateCard.getByText('초안 요청 정리본 복사됨').waitFor({ state: 'visible' });
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  const guardrailResult = scanUserFacingOutputGuardrails({
    text: clipboardText,
    sourceSlugSignals,
  });
  const forbiddenHits = [
    ...guardrailResult.internalCopyHits.map((hit) => ({ type: 'internalCopy', ...hit })),
    ...guardrailResult.sourceSlugHits.map((hit) => ({ type: 'sourceSlug', ...hit })),
    ...guardrailResult.structuralDisplayHits.map((line) => ({ type: 'structuralDisplay', line })),
    ...guardrailResult.trailingFlowSuffixHits.map((line) => ({ type: 'trailingFlowSuffix', line })),
    ...guardrailResult.rawIsoDateHits.map((line) => ({ type: 'rawIsoDate', line })),
  ];
  const internalHandoff = buildUrlFirstSupplyCandidateProductionMarkdown(candidateFixture);

  return {
    buttonVisible: await candidateCard.getByTestId('flow-url-supply-user-summary-copy').isVisible(),
    copiedTextLength: clipboardText.length,
    copiedTextHash: crypto.createHash('sha256').update(clipboardText).digest('hex'),
    sample: clipboardText.slice(0, 500),
    forbiddenHitCount: forbiddenHits.length,
    forbiddenHits,
    internalHandoffPreserved: /Canonical URL/u.test(internalHandoff)
      && /Original URL/u.test(internalHandoff)
      && /\bStep\b/u.test(internalHandoff)
      && /sourceTrace/u.test(internalHandoff),
  };
}

async function captureCurrent(page, file, label, options = {}) {
  await settle(page);
  const screenshotPath = path.join(screenshotsDir, file);
  await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled', caret: 'hide' });
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
    const collectMyFlowTodayFrame = () => {
      const section = document.querySelector('[data-testid="my-flow-now-section"]');
      const summary = document.querySelector('[data-testid="my-flow-today-summary"]');
      const sectionVisible = Boolean(section && isVisible(section));
      const summaryVisible = Boolean(summary && isVisible(summary));
      const remainingCountElements = Array.from(document.querySelectorAll('[data-testid="my-flow-today-remaining-count"]'))
        .filter((element) => isVisible(element));
      const inlineCompleteControls = section
        ? Array.from(section.querySelectorAll('[data-testid="my-flow-task-complete-control"]'))
          .filter((element) => isVisibleInteractiveElement(element))
        : [];
      const todayTaskVisible = sectionVisible && inlineCompleteControls.length > 0;
      const sectionText = sectionVisible ? normalizeLine(section?.textContent ?? '') : '';
      const genericMetaChipCount = [
        /일정\s*흐름/u,
        /체크\s*흐름/u,
        /반복\s*흐름/u,
        /오늘\s*상태/u,
      ].reduce((count, pattern) => count + (pattern.test(sectionText) ? 1 : 0), 0);

      return {
        sectionVisible,
        summaryVisible,
        frameCount: (sectionVisible ? 1 : 0) + (summaryVisible ? 1 : 0),
        remainingCountSourceCount: remainingCountElements.length,
        remainingCountLabels: remainingCountElements.map((element) => normalizeLine(element.textContent ?? '')).filter(Boolean),
        inlineCompleteControlCount: inlineCompleteControls.length,
        openBeforeCompleteRequired: todayTaskVisible && inlineCompleteControls.length === 0,
        genericMetaChipCount,
        firstInlineCompleteAccessibleName: getAccessibleNameCandidate(inlineCompleteControls[0]),
        todayTaskVisible,
      };
    };
    const collectTaskCompletionControlPatterns = () => {
      const taskCompleteCheckboxes = Array.from(document.querySelectorAll('[data-testid="my-flow-task-complete-control"]'))
        .filter((element) => isVisibleInteractiveElement(element));
      const taskCompleteButtonSelectors = [
        '[data-testid="my-flow-now-section"] button',
        '[data-testid="my-flow-status-sheet"] button',
        '[data-testid="my-flow-calendar-selected-day"] article button',
        '[data-testid="my-flow-item-detail"] button',
      ].join(',');
      const taskCompleteButtonPattern = /(?:^완료$|^취소$|^완료됨$|^항목 완료$|완료 체크$|완료 취소$|이번 항목 완료(?: 취소)?$)/u;
      const taskCompleteButtons = Array.from(document.querySelectorAll(taskCompleteButtonSelectors))
        .filter((element) => isVisibleInteractiveElement(element))
        .filter((element) => {
          const visibleLabel = getVisibleLabel(element);
          const accessibleName = getAccessibleNameCandidate(element);
          return taskCompleteButtonPattern.test(visibleLabel) || taskCompleteButtonPattern.test(accessibleName);
        });
      const subChecklistCheckboxes = Array.from(document.querySelectorAll([
        '[data-testid="my-flow-item-checklist"] input[type="checkbox"]',
        '[data-testid="artifact-list-card"] input[type="checkbox"]',
      ].join(','))).filter((element) => isVisibleInteractiveElement(element));

      return {
        taskCompleteControlPattern: taskCompleteButtons.length > 0
          ? (taskCompleteCheckboxes.length > 0 ? 'mixed' : 'button')
          : (taskCompleteCheckboxes.length > 0 ? 'checkbox' : 'none'),
        taskCompleteCheckboxCount: taskCompleteCheckboxes.length,
        taskCompleteButtonCount: taskCompleteButtons.length,
        taskCompleteMixedControlCount: taskCompleteButtons.length > 0 && taskCompleteCheckboxes.length > 0 ? taskCompleteButtons.length : 0,
        taskCompleteButtonSamples: taskCompleteButtons.slice(0, 5).map((element) => ({
          surface: getSurfaceName(element),
          visibleLabel: getVisibleLabel(element),
          accessibleName: getAccessibleNameCandidate(element),
          testId: getElementTestId(element),
        })),
        taskCompleteCheckboxSamples: taskCompleteCheckboxes.slice(0, 5).map((element) => ({
          surface: getSurfaceName(element),
          accessibleName: getAccessibleNameCandidate(element),
          checked: Boolean(element.checked),
        })),
        subChecklistCheckboxCount: subChecklistCheckboxes.length,
      };
    };
    const collectPublicPostSaveCompletionBoundary = () => {
      const originSlug = payload.options.publicPostSaveOriginSlug ?? '';
      if (!originSlug) {
        return {
          originSlug,
          visible: false,
          pattern: 'none',
          active: false,
          checkboxCount: 0,
          activeCheckboxCount: 0,
          buttonCount: 0,
          checkboxSamples: [],
          buttonSamples: [],
        };
      }

      const flowRoots = Array.from(document.querySelectorAll('[data-flow-slug]'))
        .filter((element) => element instanceof HTMLElement && element.dataset.flowSlug === originSlug);
      const roots = flowRoots.length > 0
        ? flowRoots
        : Array.from(document.querySelectorAll('[data-testid="my-flow-workspace"]'));
      const taskCompleteCheckboxes = roots.flatMap((root) =>
        Array.from(root.querySelectorAll('[data-testid="my-flow-task-complete-control"]')),
      ).filter((element) => isVisibleInteractiveElement(element));
      const taskCompleteButtonKeywords = ['완료', '취소', '이번 항목'];
      const taskCompleteButtons = roots.flatMap((root) =>
        Array.from(root.querySelectorAll('button')),
      )
        .filter((element) => isVisibleInteractiveElement(element))
        .filter((element) => {
          const visibleLabel = getVisibleLabel(element);
          const accessibleName = getAccessibleNameCandidate(element);
          return taskCompleteButtonKeywords.some((keyword) =>
            visibleLabel.includes(keyword) || accessibleName.includes(keyword),
          );
        });
      const activeCheckboxes = taskCompleteCheckboxes.filter((element) =>
        !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true',
      );

      return {
        originSlug,
        visible: taskCompleteCheckboxes.length > 0,
        pattern: taskCompleteButtons.length > 0
          ? (taskCompleteCheckboxes.length > 0 ? 'mixed' : 'button')
          : (taskCompleteCheckboxes.length > 0 ? 'checkbox' : 'none'),
        active: activeCheckboxes.length > 0,
        checkboxCount: taskCompleteCheckboxes.length,
        activeCheckboxCount: activeCheckboxes.length,
        buttonCount: taskCompleteButtons.length,
        checkboxSamples: taskCompleteCheckboxes.slice(0, 5).map((element) => ({
          surface: getSurfaceName(element),
          accessibleName: getAccessibleNameCandidate(element),
          checked: Boolean(element.checked),
        })),
        buttonSamples: taskCompleteButtons.slice(0, 5).map((element) => ({
          surface: getSurfaceName(element),
          visibleLabel: getVisibleLabel(element),
          accessibleName: getAccessibleNameCandidate(element),
          testId: getElementTestId(element),
        })),
      };
    };
    const collectPostSaveConfirmation = () => {
      const element = document.querySelector('[data-testid="my-flow-post-save-confirmation"]');
      const text = normalizeLine(element?.textContent ?? '');

      return {
        visible: Boolean(element && isVisible(element)),
        text,
        repeatsFirstTaskTitle: Boolean(text && firstTaskTitle && text.includes(firstTaskTitle)),
        firstTaskTitle,
      };
    };
    const collectDateAnchorMarkers = () => {
      const settings = document.querySelector('[data-testid="my-flow-personal-copy-settings"]');
      const anchorSettingsOpenEntries = Array.from(document.querySelectorAll('[data-testid="my-flow-personal-copy-settings-open"]'))
        .filter((element) => isVisibleInteractiveElement(element));
      const anchorEditEntry = settings?.querySelector('[data-testid="my-flow-anchor-edit-entry"]') ?? null;
      const anchorInput = settings?.querySelector('[data-testid="my-flow-personal-copy-start-date-input"]') ?? null;
      const anchorHelp = settings?.querySelector('[data-testid="my-flow-anchor-edit-help"]') ?? null;
      const itemDateInput = document.querySelector('[data-testid="my-flow-detail-date-input"]');
      const itemEditEntries = Array.from(document.querySelectorAll('[data-my-flow-item-edit-entry="true"]'))
        .filter((element) => isVisibleInteractiveElement(element));
      const anchorInputLabel = normalizeLine(anchorInput?.getAttribute('aria-label') ?? '');
      const anchorHelpText = normalizeLine(anchorHelp?.textContent ?? '');
      return {
        settingsVisible: Boolean(settings && isVisible(settings)),
        anchorSettingsOpenVisible: anchorSettingsOpenEntries.length > 0,
        anchorSettingsOpenLabels: anchorSettingsOpenEntries
          .slice(0, 5)
          .map((element) => normalizeLine(element.textContent ?? ''))
          .filter(Boolean),
        anchorSettingsOpenAccessibleNameSample: anchorSettingsOpenEntries
          .slice(0, 5)
          .map((element) => normalizeLine(getAccessibleNameCandidate(element)))
          .filter(Boolean),
        anchorEditEntryVisible: Boolean(anchorEditEntry && isVisible(anchorEditEntry)),
        anchorEditLabel: normalizeLine(anchorEditEntry?.textContent ?? ''),
        anchorInputLabel,
        anchorHelpText,
        itemDateOverrideLabel: normalizeLine(itemDateInput?.getAttribute('aria-label') ?? ''),
        anchorVsItemOverrideCopyPresent: Boolean(anchorHelpText && /전체 일정 기준/u.test(anchorHelpText) && /해당 할 일만/u.test(anchorHelpText)),
        itemEditEntryVisible: itemEditEntries.length > 0,
        itemEditAccessibleNameSample: itemEditEntries
          .slice(0, 5)
          .map((element) => normalizeLine(getAccessibleNameCandidate(element)))
          .filter(Boolean),
      };
    };
    const rowDateTextPattern = /\d{1,2}\s*월\s*\d{1,2}\s*일/u;
    const collectDraftFlowMarkers = () => {
      const draftRoots = Array.from(document.querySelectorAll('[data-flow-slug^="url-draft-"]'))
        .filter((element) => isVisible(element));
      const settingsOpenEntries = draftRoots.flatMap((root) =>
        Array.from(root.querySelectorAll('[data-testid="my-flow-personal-copy-settings-open"]')),
      ).filter((element) => isVisibleInteractiveElement(element));
      const visibleSettings = draftRoots
        .flatMap((root) => Array.from(root.querySelectorAll('[data-testid="my-flow-personal-copy-settings"]')))
        .find((element) => isVisible(element)) ?? null;
      const anchorEditEntry = visibleSettings?.querySelector('[data-testid="my-flow-anchor-edit-entry"]') ?? null;
      const policy = visibleSettings?.querySelector('[data-testid="my-flow-draft-anchor-policy"]') ?? null;
      const itemEditEntries = draftRoots.flatMap((root) =>
        Array.from(root.querySelectorAll('[data-my-flow-item-edit-entry="true"]')),
      ).filter((element) => isVisibleInteractiveElement(element));

      return {
        landingVisible: draftRoots.length > 0,
        rootCount: draftRoots.length,
        rootSurfaces: draftRoots.slice(0, 5).map((element) => getElementTestId(element)).filter(Boolean),
        editEntryVisible: settingsOpenEntries.length > 0,
        editEntryLabels: settingsOpenEntries
          .slice(0, 5)
          .map((element) => normalizeLine(element.textContent ?? ''))
          .filter(Boolean),
        anchorEditVisible: settingsOpenEntries.length > 0 || Boolean(anchorEditEntry && isVisible(anchorEditEntry)),
        anchorEditLabel: normalizeLine(anchorEditEntry?.textContent ?? ''),
        itemEditEntryVisible: itemEditEntries.length > 0,
        itemEditAccessibleNameSample: itemEditEntries
          .slice(0, 5)
          .map((element) => normalizeLine(getAccessibleNameCandidate(element)))
          .filter(Boolean),
        anchorOverrideConflictPolicyVisible: Boolean(policy && isVisible(policy)),
        anchorOverrideConflictPolicyText: normalizeLine(policy?.textContent ?? ''),
        calendarProjectionUpdated: Boolean(payload.options.draftFlowCalendarProjectionUpdated),
        exportProjectionUpdated: Boolean(payload.options.draftFlowExportProjectionUpdated),
        exportSampleLength: payload.options.draftFlowExportSampleLength ?? 0,
        exportSampleHash: payload.options.draftFlowExportSampleHash ?? null,
      };
    };
    const rowTimingTextPattern = /\bD(?:-\d+|\+\d+|-Day)\b/u;
    const summarizeRowMeta = (row) => {
      const text = collectElementLines(row).join(' ');
      const visibleDateMetaCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-date-meta"]')).filter((element) => isVisible(element)).length;
      const visibleTimingChipCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-timing-chip"], [data-testid="my-flow-status-sheet-group-timing-chip"]')).filter((element) => isVisible(element)).length;
      const visibleSectionLabelCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-section-label"]')).filter((element) => isVisible(element)).length;
      const visibleFlowChipCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-flow-chip"]')).filter((element) => isVisible(element)).length;
      const visibleProgressChipCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-progress-chip"]')).filter((element) => isVisible(element)).length;
      const visibleOpenLabelCount = Array.from(row.querySelectorAll('[data-testid="my-flow-row-open-label"]')).filter((element) => isVisible(element)).length;
      const rowDensityMetaCount = visibleDateMetaCount
        + visibleTimingChipCount
        + visibleSectionLabelCount
        + visibleFlowChipCount
        + visibleProgressChipCount;

      return {
        textSample: text.slice(0, 140),
        dateTextCount: rowDateTextPattern.test(text) ? 1 : 0,
        timingTextCount: rowTimingTextPattern.test(text) ? 1 : 0,
        visibleDateMetaCount,
        visibleTimingChipCount,
        visibleSectionLabelCount,
        visibleFlowChipCount,
        visibleProgressChipCount,
        visibleOpenLabelCount,
        rowDensityMetaCount,
      };
    };
    const summarizeAgendaGroup = (group, rowSelector) => {
      const headerText = normalizeLine((
        group.querySelector(':scope > div')?.textContent
        ?? group.querySelector('[data-testid="my-flow-selected-date-group-meta"]')?.textContent
        ?? ''
      ));
      const flowMarker = group.querySelector('[data-testid="my-flow-selected-date-flow-marker"]');
      const flowMarkerLabel = normalizeLine(
        flowMarker?.getAttribute('aria-label')
        ?? flowMarker?.getAttribute('title')
        ?? flowMarker?.textContent
        ?? '',
      );
      const flowMarkerKey = normalizeLine(group.getAttribute('data-flow-marker-key') ?? '');
      const rows = Array.from(group.querySelectorAll(rowSelector)).filter((element) => isVisible(element));
      const rowMeta = rows.map(summarizeRowMeta);
      return {
        headerText,
        flowMarkerKey,
        flowMarkerLabel,
        flowMarkerVisible: Boolean(flowMarker && isVisible(flowMarker)),
        rowCount: rows.length,
        repeatedDateMetaRowCount: rowMeta.filter((row) => row.visibleDateMetaCount > 0 || row.dateTextCount > 0).length,
        repeatedTimingMetaRowCount: rowMeta.filter((row) => row.visibleTimingChipCount > 0 || row.timingTextCount > 0).length,
        repeatedSectionMetaRowCount: rowMeta.filter((row) => row.visibleSectionLabelCount > 0).length,
        repeatedFlowMetaRowCount: rowMeta.filter((row) => row.visibleFlowChipCount > 0).length,
        repeatedProgressMetaRowCount: rowMeta.filter((row) => row.visibleProgressChipCount > 0).length,
        denseRowCount: rowMeta.filter((row) => row.rowDensityMetaCount > 0).length,
        openLabelRowCount: rowMeta.filter((row) => row.visibleOpenLabelCount > 0).length,
        rowMeta: rowMeta.slice(0, 5),
      };
    };
    const collectAgendaGroupMeta = () => {
      const calendarRoot = document.querySelector('[data-testid="my-flow-calendar-selected-day"]');
      const calendarGroups = Array.from(calendarRoot?.querySelectorAll('[data-testid="my-flow-selected-date-group"]') ?? [])
        .filter((element) => isVisible(element))
        .map((group) => summarizeAgendaGroup(group, '[data-testid="my-flow-execution-row-shell"] > article, article[data-item-type]'));
      const selectedDateCell = document.querySelector('.fc-daygrid-day.my-flow-calendar-selected-date');
      const selectedDateGridFlowLabels = Array.from(selectedDateCell?.querySelectorAll('[data-testid="my-flow-calendar-flow-label"]') ?? [])
        .filter((element) => isVisible(element))
        .map((element) => normalizeLine(element.textContent ?? ''))
        .filter(Boolean);
      const selectedDateGridDistinctFlowLabels = Array.from(new Set(selectedDateGridFlowLabels));
      const selectedDateGridFlowMarkerIdentities = Array.from(selectedDateCell?.querySelectorAll('[data-testid="my-flow-calendar-schedule-rail"][data-flow-marker-initial]') ?? [])
        .filter((element) => isVisible(element))
        .map((element) => ({
          initial: normalizeLine(element.getAttribute('data-flow-marker-initial') ?? ''),
          key: normalizeLine(element.closest('[data-testid="my-flow-calendar-schedule-content"]')?.getAttribute('data-flow-marker-key') ?? ''),
        }))
        .filter((entry) => entry.initial && entry.key);
      const selectedDateGridOverflowSummaryLabels = Array.from(selectedDateCell?.querySelectorAll('[data-testid="my-flow-calendar-grid-overflow-summary"]') ?? [])
        .filter((element) => isVisible(element))
        .map((element) => normalizeLine(element.textContent ?? ''))
        .filter(Boolean);
      const selectedDateGridHiddenFlowSummaryCount = selectedDateGridOverflowSummaryLabels.reduce((sum, label) => {
        const match = /(\d+)/u.exec(label);
        return sum + (match ? Number(match[1]) : 0);
      }, 0);
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
          flowMarkerCount: calendarGroups.filter((group) => group.flowMarkerVisible).length,
          distinctFlowMarkerCount: new Set(calendarGroups.map((group) => group.flowMarkerKey || group.flowMarkerLabel).filter(Boolean)).size,
          agendaGroupByFlow: calendarGroups.length > 0 && calendarGroups.every((group) => group.flowMarkerVisible && Boolean(group.flowMarkerLabel)),
          selectedDateGridFlowLabels,
          selectedDateGridDistinctFlowLabelCount: selectedDateGridDistinctFlowLabels.length,
          selectedDateGridFlowMarkerIdentities,
          selectedDateGridDistinctMarkerIdentityCount: new Set(selectedDateGridFlowMarkerIdentities.map((entry) => entry.key)).size,
          selectedDateGridOverflowSummaryLabels,
          selectedDateGridOverflowSummaryVisible: selectedDateGridOverflowSummaryLabels.length > 0,
          selectedDateGridHiddenFlowSummaryCount,
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
    const collectCalendarMyFlowRoleLabels = () => {
      const visibleText = (selector) => uniqueLines(
        Array.from(document.querySelectorAll(selector))
          .filter((element) => isVisible(element))
          .map((element) => element.textContent ?? ''),
      );
      const calendarHeadings = visibleText([
        '[data-testid="my-flow-calendar-context"] h2',
        '[data-testid="my-flow-calendar-context"] h3',
        '[data-testid="my-flow-calendar-card"] h2',
        '[data-testid="my-flow-calendar-card"] h3',
      ].join(','));
      const calendarScopeLabels = visibleText('[data-testid="my-flow-calendar-scope-filter"] button')
        .map((label) => label.replace(/\d+$/u, '').trim());
      const calendarGroupLabels = Array.from(document.querySelectorAll('[data-testid="my-flow-selected-date-group"]'))
        .filter((element) => isVisible(element))
        .map((group) => normalizeLine(group.querySelector('p')?.textContent ?? ''))
        .filter(Boolean);
      const myFlowCompactRowTexts = visibleText('[data-testid="my-flow-mobile-structure-row"]');
      const routeLines = visibleText('main h1, main h2, main h3, main p');
      const pageHeadings = visibleText('main h1, main h2, main h3');
      const headingCounts = pageHeadings.reduce((counts, label) => {
        counts.set(label, (counts.get(label) ?? 0) + 1);
        return counts;
      }, new Map());
      const duplicateHeadings = Array.from(headingCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([label, count]) => ({ label, count }));
      const calendarPrimaryLabels = uniqueLines([
        ...calendarHeadings,
        ...calendarScopeLabels,
        ...calendarGroupLabels,
      ]);
      const calendarGenericTypePatterns = [
        /^월간\s*일정$/u,
        /^전체\s*일정$/u,
        /^저장한\s*(?:일정|루틴)$/u,
        /^(?:일정|루틴)$/u,
        /^일정\s*흐름$/u,
      ];
      const myFlowGenericPattern = /(?:일정|체크|반복)\s*흐름/u;
      const calendarPrimaryGenericHits = calendarPrimaryLabels.filter((label) =>
        calendarGenericTypePatterns.some((pattern) => pattern.test(label)),
      );
      const myFlowPrimaryGenericHits = myFlowCompactRowTexts.filter((line) => myFlowGenericPattern.test(line));

      return {
        calendarTitleContainsMyFlowCount: calendarHeadings.filter((line) =>
          /내\s*Flow.*(?:월간|일정|캘린더)/u.test(line),
        ).length,
        calendarPrimaryGenericTypeLabelCount: calendarPrimaryGenericHits.length,
        calendarPrimaryGenericTypeLabelHits: calendarPrimaryGenericHits.slice(0, 8),
        myFlowPrimaryGenericFlowLabelCount: myFlowPrimaryGenericHits.length,
        myFlowPrimaryGenericFlowLabelHits: myFlowPrimaryGenericHits.slice(0, 8),
        calendarTaskRoleCopyPresent: routeLines.some((line) =>
          /날짜별\s*실행/u.test(line)
          || /언제\s*할지\s*정해진\s*항목/u.test(line)
          || /월간\s*날짜\s*보기/u.test(line),
        ),
        myFlowTaskRoleCopyPresent: routeLines.some((line) =>
          /오늘,\s*다음,\s*지난\s*할\s*일/u.test(line)
          || /오늘\s*할\s*일/u.test(line),
        ),
        calendarHeadingDuplicateCount: duplicateHeadings.reduce((sum, item) => sum + item.count - 1, 0),
        calendarHeadingDuplicateHits: duplicateHeadings.slice(0, 8),
        calendarPrimaryLabels: calendarPrimaryLabels.slice(0, 12),
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
    const collectProgressMetricSemantics = () => {
      const progressMetricPattern = /\b\d+\s*\/\s*\d+(?:\s*완료)?\b/u;
      const contextualProgressPattern = /^(?:전체|확인 항목|개념 항목|반복 항목)\s+\d+\s*\/\s*\d+(?:\s*완료)?$/u;
      const progressElements = Array.from(document.querySelectorAll([
        '[data-testid="my-flow-overview-progress-summary"]',
        '[data-testid="my-flow-mobile-structure-progress"]',
        '[data-testid="my-flow-inventory-progress-summary"]',
        '[data-testid="my-flow-detail-checklist-progress"]',
        '[data-testid="my-flow-routine-progress-pill"]',
        '[data-testid="my-flow-row-progress-chip"]',
      ].join(','))).filter((element) => isVisible(element));
      const progressLabels = progressElements
        .map((element) => ({
          testId: getElementTestId(element),
          text: normalizeLine(element.textContent ?? ''),
        }))
        .filter((entry) => progressMetricPattern.test(entry.text));
      const ambiguousProgressHits = progressLabels.filter((entry) => !contextualProgressPattern.test(entry.text));
      const contextualProgressLabels = progressLabels.filter((entry) => contextualProgressPattern.test(entry.text));
      const rowLevelFlowProgressChips = Array.from(document.querySelectorAll('[data-testid="my-flow-row-progress-chip"]')).filter((element) => isVisible(element));
      const detailChecklistProgressLabels = Array.from(document.querySelectorAll('[data-testid="my-flow-detail-checklist-progress"]')).filter((element) =>
        isVisible(element) && /^(?:확인 항목|개념 항목)\s+\d+\s*\/\s*\d+$/u.test(normalizeLine(element.textContent ?? '')),
      );
      const todayRemainingCounts = Array.from(document.querySelectorAll('[data-testid="my-flow-today-remaining-count"]')).filter((element) => isVisible(element));
      const calendarSelectedDayRemainingCounts = Array.from(document.querySelectorAll('[data-testid="my-flow-selected-day-summary"]')).filter((element) =>
        isVisible(element) && /\d+\s*개\s*항목/u.test(normalizeLine(element.textContent ?? '')),
      );

      return {
        progressMetricAmbiguousCount: ambiguousProgressHits.length,
        progressMetricAmbiguousHits: ambiguousProgressHits.slice(0, 8),
        progressMetricContextLabelCount: contextualProgressLabels.length,
        progressMetricContextLabels: contextualProgressLabels.slice(0, 8),
        rowLevelFlowProgressChipCount: rowLevelFlowProgressChips.length,
        detailChecklistProgressLabelCount: detailChecklistProgressLabels.length,
        todayRemainingCountVisible: todayRemainingCounts.length,
        calendarSelectedDayRemainingCountVisible: calendarSelectedDayRemainingCounts.length,
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
        '[data-testid="public-flow-export-secondary-entry"] button',
        '[data-testid^="mobile-artifact-export-"]',
        '[data-testid="mobile-export-bar"] a',
        '[data-testid="mobile-export-bar"] button',
        '[data-testid="mobile-export-sheet"] button',
      ].join(',')))
        .filter((element) => isVisibleInteractiveElement(element))
        .map((element) => {
          const testId = getElementTestId(element);
          const surface = element.closest('[data-testid="mobile-export-bar"]')
            ? 'mobileSticky'
            : element.closest('[data-testid="mobile-export-sheet"]')
              ? 'mobileExportSheet'
              : element.closest('[data-testid="public-flow-export-secondary-entry"]')
                ? 'flowLevelExport'
                : 'mobileArtifactExport';

          return {
            testId,
            surface,
            visibleLabel: getVisibleLabel(element),
            accessibleName: getAccessibleNameCandidate(element),
          };
        })
        .filter((entry) => entry.visibleLabel);
      const exportLikeLabelPattern = /(받기|복사|파일|시트|캘린더|문서|내보내기|가져가기|諛쏄린|蹂듭궗|xlsx|ics)/iu;
      const flowLevelSecondaryEntries = Array.from(document.querySelectorAll('[data-testid="public-flow-export-secondary-entry"]'))
        .filter((element) => isVisible(element));
      const flowLevelFormatOptions = buttons.filter((entry) =>
        entry.surface === 'flowLevelExport' && entry.testId === 'public-flow-export-format-option',
      );
      const itemLevelExportLikeLabels = buttons
        .filter((entry) => entry.surface === 'mobileArtifactExport')
        .filter((entry) => exportLikeLabelPattern.test(entry.visibleLabel));
      const workbenchPreviewControls = Array.from(document.querySelectorAll([
        '[aria-label="Flow artifact workbench"] input',
        '[aria-label="Flow artifact workbench"] textarea',
        '[aria-label="Flow artifact workbench"] select',
        '[aria-label="Flow artifact workbench"] button',
      ].join(',')))
        .filter((element) => isVisible(element))
        .filter((element) => !element.closest('[data-testid="public-flow-export-secondary-entry"]'));
      const workbenchPreviewCheckboxes = workbenchPreviewControls
        .filter((element) => element instanceof HTMLInputElement && element.type === 'checkbox');
      const preSaveCheckboxLabels = workbenchPreviewCheckboxes
        .map((element) => getAccessibleNameCandidate(element))
        .filter(Boolean);
      const preSaveCheckboxCompletionLikeLabels = preSaveCheckboxLabels
        .filter((label) => /(완료|완료 체크|완료 취소|실행판 체크|회차 완료|이유식 완료|관리일 완료|관리 체크|전체 보기 체크|선택 일정 체크|단계 체크)/u.test(label));
      const preSaveCheckboxPreviewLabels = preSaveCheckboxLabels
        .filter((label) => /(미리보기|저장 전|선택|포함 표시|확인 표시)/u.test(label));
      const stickyFirstAction = buttons.find((entry) => entry.surface === 'mobileSticky') ?? null;
      const stickyFirstActionSaveOrSetup = Boolean(
        stickyFirstAction && /내 Flow에 저장|내 Flow에서 보기/u.test(stickyFirstAction.visibleLabel),
      );
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
        stickyFirstAction,
        stickyFirstActionSaveOrSetup,
        flowLevelSecondaryEntryCount: flowLevelSecondaryEntries.length,
        flowLevelFormatOptionCount: flowLevelFormatOptions.length,
        flowLevelFormatOptionLabels: flowLevelFormatOptions.map((entry) => entry.visibleLabel),
        itemLevelExportLikeLabelCount: itemLevelExportLikeLabels.length,
        itemLevelExportLikeLabels,
        preSaveCheckboxCount: workbenchPreviewCheckboxes.length,
        preSaveCheckboxCompletionLikeLabelCount: preSaveCheckboxCompletionLikeLabels.length,
        preSaveCheckboxCompletionLikeLabels,
        preSaveCheckboxPreviewLabelCount: preSaveCheckboxPreviewLabels.length,
        preSaveCheckboxPreviewLabels: preSaveCheckboxPreviewLabels.slice(0, 12),
        preSaveItemCheckboxPreviewCount: workbenchPreviewCheckboxes.length,
        preSavePreviewControlCount: workbenchPreviewControls.length,
        duplicateVisibleLabelCount: duplicateVisibleLabels.length,
        duplicateVisibleLabels,
        samples: buttons.slice(0, 8),
      };
    };
    const collectUrlFirstMarkers = () => {
      const lookupResult = document.querySelector('[data-testid="flow-url-lookup-result"]');
      const customStart = document.querySelector('[data-testid="flow-url-custom-start-panel"]');
      const supplyForm = document.querySelector('[data-testid="flow-url-supply-candidate-form"]');
      const supplyRequest = document.querySelector('[data-testid="flow-url-supply-request"]');
      const missDraftGate = document.querySelector('[data-testid="flow-url-miss-draft-gate"]');
      const missDraftEntry = document.querySelector('[data-testid="flow-url-miss-draft-entry"]');
      const missDraftOpen = document.querySelector('[data-testid="flow-url-miss-draft-open"]');
      const missDraftEditor = document.querySelector('[data-testid="flow-url-miss-draft-editor"]');
      const missDraftSave = document.querySelector('[data-testid="flow-url-miss-draft-save"]');
      const missDraftEditableItems = Array.from(document.querySelectorAll('[data-testid="flow-url-miss-draft-item"]')).filter((element) => isVisible(element));
      const missDraftItemOffsets = missDraftEditableItems
        .map((element) => Number(element.getAttribute('data-draft-day-offset')))
        .filter((value) => Number.isFinite(value));
      const missDraftAnchorInput = document.querySelector('[data-testid="flow-url-miss-draft-anchor-date"]');
      const missDraftAnchorValue = missDraftAnchorInput && 'value' in missDraftAnchorInput ? missDraftAnchorInput.value : '';
      const candidateList = document.querySelector('[data-testid="flow-url-supply-candidate-list"]');
      const requestDetail = document.querySelector('[data-testid="flow-url-supply-production-handoff"]');
      const resultText = normalizeLine(lookupResult?.textContent ?? '');
      const urlFirstRoots = [lookupResult, customStart, supplyForm, candidateList, requestDetail].filter(Boolean);
      const urlFirstLines = uniqueLines(urlFirstRoots.flatMap((root) => collectElementLines(root)));
      const visibleMarkdownLines = urlFirstLines
        .filter((line) => /\bMarkdown\b/i.test(line));
      const mechanismCopyOldLines = urlFirstLines
        .filter((line) => line.includes('AI 자동 생성 없이 먼저 찾아봤어요'));
      const mechanismCopyValueLines = urlFirstLines
        .filter((line) => line.includes('이미 만든 준비가 있는지 먼저 찾아봤어요'));
      const candidateLegacySystemCopyLines = urlFirstLines
        .filter((line) =>
          line.includes('사용자 제목/메모')
          || line.includes('마지막 다시 조회')
          || line.includes('같은 URL로 저장 가능한 Flow가 준비됐어요')
          || line.includes('같은 URL의 Flow가 생겼습니다')
        );
      const candidateUserToneCopyLines = urlFirstLines
        .filter((line) =>
          line.includes('내가 쓴 제목·메모')
          || line.includes('마지막 확인')
          || line.includes('이미 Flow로 준비')
        );
      const candidateCardTextLines = candidateList
        ? uniqueLines(Array.from(candidateList.querySelectorAll('article')).flatMap((card) => collectElementLines(card)))
        : [];
      const missDraftGateLines = supplyRequest
        ? uniqueLines(collectElementLines(supplyRequest))
        : [];
      const missDraftLiveAiLines = missDraftGateLines.filter((line) =>
        /AI가|AI로|자동\s*생성|바로\s*생성|생성\s*중|실시간\s*생성|지금\s*만들어/u.test(line),
      );
      const missDraftCta = supplyForm?.querySelector('button[type="submit"]') ?? null;
      const missDraftFlowLines = uniqueLines([missDraftEntry, missDraftEditor].filter(Boolean).flatMap((root) => collectElementLines(root)));
      const missDraftFlowLiveAiLines = missDraftFlowLines.filter((line) =>
        /AI가|AI로\s*자동\s*생성|바로\s*생성|생성\s*중|실시간\s*생성|지금\s*만들/u.test(line),
      );
      const startDateInput = lookupResult?.querySelector('[data-testid="url-first-start-date-input"]')
        ?? document.querySelector('[data-testid="url-first-start-date-input"]');
      const startDateInputValue = startDateInput && 'value' in startDateInput ? startDateInput.value : '';
      const startDateHelp = lookupResult?.querySelector('[data-testid="url-first-date-anchor-help"]')
        ?? document.querySelector('[data-testid="url-first-date-anchor-help"]');

      return {
        scenarioName: payload.options.urlFirstScenarioName ?? null,
        triggerUrl: payload.options.urlFirstTriggerUrl ?? null,
        resultVisible: Boolean(lookupResult && isVisible(lookupResult)),
        customStartVisible: Boolean(customStart && isVisible(customStart)),
        supplyFormVisible: Boolean(supplyForm && isVisible(supplyForm)),
        candidateListVisible: Boolean(candidateList && isVisible(candidateList)),
        requestDetailVisible: Boolean(requestDetail && isVisible(requestDetail)),
        missDraftGate: {
          visible: Boolean(missDraftGate && isVisible(missDraftGate)),
          ctaLabel: normalizeLine(missDraftCta?.textContent ?? ''),
          copyLines: missDraftGateLines.slice(0, 12),
          impliesLiveAi: missDraftLiveAiLines.length > 0,
          liveAiLines: missDraftLiveAiLines,
        },
        missDraftFlow: {
          entryVisible: Boolean(missDraftEntry && isVisible(missDraftEntry)),
          editorVisible: Boolean(missDraftEditor && isVisible(missDraftEditor)),
          ctaLabel: normalizeLine(missDraftOpen?.textContent ?? ''),
          editableItemCount: missDraftEditableItems.length,
          suggestedItemCount: missDraftEditableItems.length,
          itemDayOffsets: missDraftItemOffsets,
          draftStepDatesFromAnchor: /^20\d{2}-\d{2}-\d{2}$/u.test(missDraftAnchorValue)
            && missDraftEditableItems.length >= 3
            && missDraftItemOffsets.length === missDraftEditableItems.length,
          savePathVisible: Boolean(missDraftSave && isVisible(missDraftSave)),
          savePathLabel: normalizeLine(missDraftSave?.textContent ?? ''),
          copyLines: missDraftFlowLines.slice(0, 24),
          impliesLiveAi: missDraftFlowLiveAiLines.length > 0,
          liveAiLines: missDraftFlowLiveAiLines,
        },
        visibleMarkdownHitCount: visibleMarkdownLines.length,
        visibleMarkdownLines,
        mechanismCopyOldHitCount: mechanismCopyOldLines.length,
        mechanismCopyOldLines,
        mechanismCopyValueHitCount: mechanismCopyValueLines.length,
        mechanismCopyValueLines,
        candidateLegacySystemCopyHitCount: candidateLegacySystemCopyLines.length,
        candidateLegacySystemCopyLines,
        candidateUserToneCopyHitCount: candidateUserToneCopyLines.length,
        candidateUserToneCopyLines,
        candidateCardTextScanned: candidateCardTextLines.length > 0,
        candidateCardTextLines: candidateCardTextLines.slice(0, 40),
        exportModeEvidence: payload.options.urlFirstExportModeEvidence ?? [],
        candidateUserCopyEvidence: payload.options.urlFirstCandidateUserCopyEvidence ?? null,
        candidateExpandedDetailCaptured: Boolean(payload.options.urlFirstCandidateExpandedDetailCaptured ?? (requestDetail && isVisible(requestDetail))),
        candidateResolvedHitScenario: payload.options.urlFirstCandidateResolvedHitScenario ?? null,
        startDateInput: startDateInput
          ? {
              visible: isVisible(startDateInput),
              testId: getElementTestId(startDateInput),
              inputType: startDateInput.getAttribute('type') ?? '',
              label: normalizeLine(startDateInput.getAttribute('aria-label') ?? ''),
              helpText: normalizeLine(startDateHelp?.textContent ?? ''),
              valuePresent: Boolean(startDateInputValue),
              rawIsoValuePresent: /^20\d{2}-\d{2}-\d{2}$/u.test(startDateInputValue),
            }
          : null,
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
    const anchorHrefs = Array.from(document.querySelectorAll('a[href]')).map((anchor) => {
      const rawHref = anchor.getAttribute('href') ?? '';
      try {
        const url = new URL(rawHref, window.location.href);
        return {
          rawHref,
          pathname: url.pathname,
          href: url.href,
          visible: isVisible(anchor),
          label: normalizeLine(anchor.textContent ?? ''),
          accessibleName: normalizeLine(anchor.getAttribute('aria-label') ?? anchor.textContent ?? ''),
          testId: getElementTestId(anchor),
        };
      } catch {
        return {
          rawHref,
          pathname: rawHref,
          href: rawHref,
          visible: isVisible(anchor),
          label: normalizeLine(anchor.textContent ?? ''),
          accessibleName: normalizeLine(anchor.getAttribute('aria-label') ?? anchor.textContent ?? ''),
          testId: getElementTestId(anchor),
        };
      }
    });
    const countAnchors = (predicate) => anchorHrefs.filter(predicate).length;
    const studioNavDestinations = anchorHrefs
      .filter((anchor) =>
        anchor.visible
        && (
          anchor.label === '스튜디오'
          || anchor.accessibleName === '스튜디오'
        ),
      )
      .map((anchor) => ({
        rawHref: anchor.rawHref,
        pathname: anchor.pathname,
        href: anchor.href,
        label: anchor.label,
        accessibleName: anchor.accessibleName,
        testId: anchor.testId,
      }));
    const metaRobots = normalizeLine(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '');
    const isCreatorProfileRoute = window.location.pathname.startsWith('/u/');
    const studioEntryReachable = studioNavDestinations.some((destination) => destination.pathname.startsWith('/u/'));
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
    const rectForElement = (element) => {
      if (!element || !isVisible(element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const homePrimaryRect = rectForElement(document.querySelector('[data-testid="home-primary-flow-card"]'));
    const homeSecondaryRect = rectForElement(document.querySelector('[data-testid="home-secondary-flow-card"]'));
    const homeUrlFirstEntry = document.querySelector('[data-testid="home-url-first-entry"]');
    const homeUrlFirstEntryRect = rectForElement(homeUrlFirstEntry);
    const homeUrlFirstEntryAnchor = anchorHrefs.find((anchor) => anchor.testId === 'home-url-first-entry') ?? null;
    const homeUrlFirstEntryLabel = normalizeLine(homeUrlFirstEntry?.textContent ?? '');
    const homeUrlFirstEntryVisible = Boolean(homeUrlFirstEntryRect && homeUrlFirstEntryAnchor?.visible);
    const homeUrlFirstEntryAboveFold = Boolean(homeUrlFirstEntryRect && homeUrlFirstEntryRect.y >= 0 && homeUrlFirstEntryRect.y < window.innerHeight);
    const homePrimaryEntryCompetesWithRecommendations = !homeUrlFirstEntryVisible || !homeUrlFirstEntryAboveFold;
    const visibleFlowFindingLinkCount = anchorHrefs.filter((anchor) => anchor.visible && anchor.pathname === '/flows').length;
    const widePrimaryCtaVisible = [
      '[data-testid="home-primary-flow-card"]',
      '[data-testid="flow-url-lookup-entry"]',
      '[data-testid="flow-map-save-all"]',
      '[data-testid="flow-map-mobile-sticky-save"]',
      '[data-testid="public-flow-primary-setup"]',
      '[data-testid="public-flow-save-actions"]',
      '[data-testid="public-flow-mobile-save-cta"]',
      '[data-testid="my-flow-now-section"]',
    ].some((selector) => hasVisibleElement(selector));
    const creatorProfileContentCards = Array.from(document.querySelectorAll('[data-testid="creator-profile-content-card"]'));
    const creatorProfileContentStatuses = creatorProfileContentCards
      .map((element) => normalizeLine(element.getAttribute('data-flow-status') ?? ''))
      .filter(Boolean);
    const creatorProfileUrlFirstDraftCards = creatorProfileContentCards.filter((element) =>
      element.getAttribute('data-flow-origin') === 'url-first-draft',
    );
    const creatorProfileDraftEditLinks = Array.from(document.querySelectorAll('[data-testid="creator-profile-draft-edit-link"]'))
      .map((element) => {
        const anchor = element instanceof HTMLAnchorElement ? element : element.closest('a');
        if (!anchor) return null;
        const href = anchor.getAttribute('href') ?? '';
        let pathname = href;
        try {
          pathname = new URL(anchor.href, window.location.origin).pathname;
        } catch {
          pathname = href;
        }
        return {
          label: normalizeLine(anchor.textContent ?? ''),
          href,
          pathname,
        };
      })
      .filter(Boolean);
    const creatorProfileHeading = normalizeLine(document.querySelector('[data-testid="creator-profile-surface"] h1')?.textContent ?? '');
    const creatorProfileEmptySummaryVisible = isCreatorProfileRoute && /0개\s*표시\s*\/\s*전체\s*0개/u.test(document.body.innerText);

    return {
      category: payload.options.category ?? 'route',
      prototypeBucket: Boolean(payload.options.prototypeBucket),
      prototypeTier: payload.options.prototypeTier ?? null,
      creatorProfileTier: payload.options.creatorProfileTier ?? (isCreatorProfileRoute ? 'creator-profile' : null),
      publicPostSaveOriginSlug: payload.options.publicPostSaveOriginSlug ?? null,
      urlFirstScenarioName: payload.options.urlFirstScenarioName ?? null,
      urlFirstState: payload.options.urlFirstState ?? null,
      urlFirstTriggerUrl: payload.options.urlFirstTriggerUrl ?? null,
      selectedDate: payload.options.selectedDate ?? null,
      p18CalendarSameDateFlowFixture: Boolean(payload.options.p18CalendarSameDateFlowFixture),
      wideViewport: Boolean(payload.options.wideViewport),
      url: window.location.pathname + window.location.search,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      scrollPurpose: payload.options.scrollPurpose ?? null,
      scrollY: Math.round(window.scrollY),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportWidth: window.innerWidth,
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
        homeUrlFirstEntry: {
          visible: homeUrlFirstEntryVisible,
          label: homeUrlFirstEntryLabel,
          destination: homeUrlFirstEntryAnchor?.pathname ?? null,
          aboveFold: homeUrlFirstEntryAboveFold,
          rect: homeUrlFirstEntryRect,
          memoEntryVisible: homeUrlFirstEntryVisible && /메모/u.test(homeUrlFirstEntryLabel),
          competesWithRecommendations: homePrimaryEntryCompetesWithRecommendations,
          separatorPresent: /Flow 찾기\s*[·•|]\s*링크 붙여넣기/u.test(homeUrlFirstEntryLabel),
          concatenatedLabelHitCount: /Flow 찾기링크 붙여넣기/u.test(homeUrlFirstEntryLabel) ? 1 : 0,
        },
        catalogCards: document.querySelectorAll('[data-testid="flow-map-catalog-card"], [data-testid="single-flow-catalog-card"]').length,
        postSavePanel: Boolean(document.querySelector('[data-testid="my-flow-post-save-panel"]')),
        myFlowNowSection: Boolean(document.querySelector('[data-testid="my-flow-now-section"]')),
        calendarSelectedDay: Boolean(document.querySelector('[data-testid="my-flow-calendar-selected-day"]')),
        statusSheetRows: document.querySelectorAll('[data-testid="my-flow-status-sheet-row"]').length,
        continuationActionable: collectContinuationActionable(),
        myFlowTodayFrame: collectMyFlowTodayFrame(),
        taskCompletionControls: collectTaskCompletionControlPatterns(),
        publicPostSaveCompletionBoundary: collectPublicPostSaveCompletionBoundary(),
        postSaveConfirmation: collectPostSaveConfirmation(),
        dateAnchor: collectDateAnchorMarkers(),
        draftFlow: collectDraftFlowMarkers(),
        draftLifecycle: payload.options.draftLifecycle ?? null,
        agendaGroupMeta: collectAgendaGroupMeta(),
        calendarMyFlowRoleLabels: collectCalendarMyFlowRoleLabels(),
        rowControlAccessibleNames: getRowControlAccessibleNames(),
        inventoryProgressMetrics: collectInventoryProgressMetrics(),
        inventoryHeaderMetrics: collectInventoryHeaderMetrics(),
        progressMetricSemantics: collectProgressMetricSemantics(),
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
        metaRobots,
        studioNavDestinations,
        studioEntry: {
          visible: studioNavDestinations.length > 0,
          reachable: studioEntryReachable,
          destinations: studioNavDestinations.map((destination) => destination.pathname),
        },
        creatorProfile: isCreatorProfileRoute ? {
          tier: payload.options.creatorProfileTier ?? 'creator-profile',
          kind: payload.options.creatorProfileKind ?? null,
          surfaceVisible: hasVisibleElement('[data-testid="creator-profile-surface"]'),
          noindex: /noindex/i.test(metaRobots),
          heading: creatorProfileHeading,
          contentCardCount: creatorProfileContentCards.length,
          draftTabVisible: hasVisibleElement('[data-testid="creator-profile-draft-tab"]'),
          draftContentCardCount: creatorProfileContentStatuses.filter((status) => status === 'draft').length,
          publishedContentCardCount: creatorProfileContentStatuses.filter((status) => status === 'published').length,
          urlFirstDraftCardCount: creatorProfileUrlFirstDraftCards.length,
          draftEditPathVisible: creatorProfileDraftEditLinks.some((entry) => entry.pathname === '/my'),
          draftEditDestinations: creatorProfileDraftEditLinks,
          emptySummaryVisible: creatorProfileEmptySummaryVisible,
          policy: 'user-facing secondary surface outside the 4-tab IA; normal user-surface guardrails apply',
        } : null,
        flowLabInternalConsoleContextVisible: hasVisibleElement('[data-testid="url-first-p0-lab-internal-console-context"]'),
        flowLabPrototypeLinkCount: countAnchors((anchor) => anchor.pathname === '/flow-lab/url-first-p0'),
        manualRegistrationQaLinkCount: countAnchors((anchor) =>
          anchor.href.includes('source-backed-manual-registration')
          || anchor.rawHref.includes('source-backed-manual-registration'),
        ),
        wideLayout: {
          primaryCtaVisible: widePrimaryCtaVisible,
          visibleFlowFindingLinkCount,
          homeRecommendationCardWidthRatio:
            homePrimaryRect && homeSecondaryRect && homePrimaryRect.width > 0
              ? Number((homeSecondaryRect.width / homePrimaryRect.width).toFixed(3))
              : null,
          homePrimaryRect,
          homeSecondaryRect,
        },
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
  const prototypeTier = record.prototypeTier ?? getPrototypeRouteTier(record.url);
  const prototypeTierPolicy = prototypeTier ? getPrototypeRouteTierPolicy(prototypeTier) : null;
  const studioNavDestinations = (record.markers?.studioNavDestinations ?? []).map((destination) => ({
    ...destination,
    destinationTier: getStudioNavDestinationTier(destination),
  }));
  const candidateCardLines = record.markers?.urlFirst?.candidateCardTextLines ?? [];
  const missDraftFlowLines = record.markers?.urlFirst?.missDraftFlow?.copyLines ?? [];
  const candidateCardLegacyPatternLabels = new Set([
    '기존 콘텐츠로 닫힌 상태',
    '실행 가능한 후보 상태문',
    '후보 닫힌 상태',
  ]);
  const candidateCardGuardrails = scanUserSurfaceGuardrails({
    primaryLines: candidateCardLines,
    sourceSlugSignals,
  });
  const missDraftFlowGuardrails = scanUserSurfaceGuardrails({
    primaryLines: missDraftFlowLines,
    sourceSlugSignals,
  });
  const missDraftFlowInternalHits = [
    ...missDraftFlowGuardrails.internalCopyHits.map((hit) => ({ type: 'internalCopy', ...hit })),
    ...missDraftFlowGuardrails.sourceSlugHits.map((hit) => ({ type: 'sourceSlug', ...hit })),
    ...missDraftFlowGuardrails.structuralDisplayHits.map((line) => ({ type: 'structuralDisplay', line })),
    ...missDraftFlowGuardrails.trailingFlowSuffixHits.map((line) => ({ type: 'trailingFlowSuffix', line })),
    ...missDraftFlowGuardrails.rawIsoDateHits.map((line) => ({ type: 'rawIsoDate', line })),
  ];
  const candidateCardLegacyStatusHits = candidateCardGuardrails.internalCopyHits
    .filter((hit) => candidateCardLegacyPatternLabels.has(hit.pattern));
  const firstTaskRepetitionHits = firstTaskTitle
    ? findFirstTaskRepetitionHits(nowSectionLines, firstTaskTitle, { maxCount: 1 })
    : [];

  return {
    ...record,
    prototypeTier,
    prototypeTierPolicy,
    markers: {
      ...record.markers,
      studioNavDestinations,
      urlFirst: record.markers?.urlFirst
        ? {
            ...record.markers.urlFirst,
            missDraftFlow: record.markers.urlFirst.missDraftFlow
              ? {
                  ...record.markers.urlFirst.missDraftFlow,
                  internalHitCount: missDraftFlowInternalHits.length,
                  internalHits: missDraftFlowInternalHits,
                }
              : record.markers.urlFirst.missDraftFlow,
            candidateCardTextScanned: candidateCardLines.length > 0,
            candidateCardLegacyStatusHitCount: candidateCardLegacyStatusHits.length,
            candidateCardLegacyStatusHits,
          }
        : record.markers?.urlFirst,
    },
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

function getStudioNavDestinationTier(destination) {
  const pathname = destination?.pathname ?? '';
  const href = `${destination?.rawHref ?? ''} ${destination?.href ?? ''}`;
  const prototypeTier = getPrototypeRouteTier(pathname);
  if (prototypeTier) return prototypeTier;
  if (/source-backed-manual-registration/iu.test(href)) return 'internal-manual-registration';
  if (pathname.startsWith('/content-flows') || pathname.startsWith('/ia-compare')) return 'internal-review';
  if (pathname.startsWith('/u/')) return 'creator-profile';
  if (pathname.startsWith('/flows/new') || pathname.startsWith('/flows/') && pathname.endsWith('/edit')) return 'creator-tool';
  if (pathname.startsWith('/')) return 'normal-user-route';
  return 'external-or-unknown';
}

function summarizeEvidence(records) {
  const normal = records.filter((record) => !record.prototypeBucket);
  const prototypes = records.filter((record) => record.prototypeBucket);
  const releasePreviewPrototypes = prototypes.filter((record) => record.prototypeTier === 'release-preview');
  const internalConsolePrototypes = prototypes.filter((record) => record.prototypeTier === 'internal-console');
  const fieldChecklistSourceDensity = records.filter((record) => record.category === 'field-checklist-source-density');
  const urlFirst = normal.filter((record) => record.category === 'url-first');
  const restart = prototypes.filter((record) => record.category === 'prototype-restart');
  const flowLab = prototypes.filter((record) => record.category === 'prototype-flow-lab');
  const publicShareRoutes = normal.filter((record) => record.publicShellVisible);
  const publicPostSaveRecords = normal.filter((record) =>
    Boolean(record.publicPostSaveOriginSlug || record.markers?.publicPostSaveCompletionBoundary?.originSlug),
  );
  const wideViewportRecords = records.filter((record) => record.wideViewport || record.category === 'wide-viewport');
  const wideMyFlowRecords = wideViewportRecords.filter((record) => record.url.startsWith('/my'));
  const creatorProfileRecords = normal.filter((record) =>
    record.creatorProfileTier === 'creator-profile'
    || record.markers?.creatorProfile?.tier === 'creator-profile'
    || record.url.startsWith('/u/'),
  );
  const studioEntryAllowedRoutePrefixes = ['/my', '/calendar'];
  const studioEntryVisibleRecords = records.filter((record) => Boolean(record.markers?.studioEntry?.visible));
  const postSaveConfirmationRecords = normal.filter((record) => record.markers?.postSaveConfirmation?.visible);
  const restartSourceFrame = records.find((record) => record.id === '22-restart-moving-source-export-mobile');
  const restartBottomFrame = records.find((record) => record.id === '23-restart-moving-bottom-mobile');
  const restartScheduleFrame = records.find((record) => record.id === '24-restart-moving-full-schedule-mobile')
    ?? records.find((record) => record.id === '21-restart-moving-top-mobile');
  const restartScheduleDateCheck = restartScheduleFrame?.markers?.restartScheduleDateCheck ?? {};
  const wideUserSurfaceRecords = wideViewportRecords.filter((record) => !record.prototypeBucket);
  const restartFirstThreeSameD30Milestone = Boolean(
    restartScheduleDateCheck.firstThreeSameD30Milestone
    && restartScheduleDateCheck.fullScheduleHasDistributedDates,
  );
  const sumByViewport = (inputRecords, selectCount) =>
    inputRecords.reduce((map, record) => {
      const key = String(record.viewportWidth ?? viewport.width);
      map[key] = (map[key] ?? 0) + selectCount(record);
      return map;
    }, {});
  const studioNavDestinationEvidence = records.flatMap((record) =>
    (record.markers?.studioNavDestinations ?? []).map((destination) => ({
      recordId: record.id,
      route: record.url,
      viewportWidth: record.viewportWidth,
      rawHref: destination.rawHref,
      pathname: destination.pathname,
      label: destination.label,
      accessibleName: destination.accessibleName,
      destinationTier: destination.destinationTier,
    })),
  );
  const studioEntryPlacementEvidence = studioEntryVisibleRecords.map((record) => ({
    recordId: record.id,
    route: record.url,
    viewportWidth: record.viewportWidth,
    allowed: studioEntryAllowedRoutePrefixes.some((prefix) => record.url.startsWith(prefix)),
    destinations: record.markers?.studioEntry?.destinations ?? [],
  }));
  const creatorProfileEvidence = creatorProfileRecords.map((record) => ({
    recordId: record.id,
    route: record.url,
    viewportWidth: record.viewportWidth,
    tier: record.creatorProfileTier ?? record.markers?.creatorProfile?.tier ?? 'creator-profile',
    kind: record.markers?.creatorProfile?.kind ?? null,
    noindex: Boolean(record.markers?.creatorProfile?.noindex),
    surfaceVisible: Boolean(record.markers?.creatorProfile?.surfaceVisible),
    heading: record.markers?.creatorProfile?.heading ?? '',
    contentCardCount: record.markers?.creatorProfile?.contentCardCount ?? 0,
    draftTabVisible: Boolean(record.markers?.creatorProfile?.draftTabVisible),
    draftContentCardCount: record.markers?.creatorProfile?.draftContentCardCount ?? 0,
    publishedContentCardCount: record.markers?.creatorProfile?.publishedContentCardCount ?? 0,
    urlFirstDraftCardCount: record.markers?.creatorProfile?.urlFirstDraftCardCount ?? 0,
    draftEditPathVisible: Boolean(record.markers?.creatorProfile?.draftEditPathVisible),
    draftEditDestinations: record.markers?.creatorProfile?.draftEditDestinations ?? [],
    emptySummaryVisible: Boolean(record.markers?.creatorProfile?.emptySummaryVisible),
    internalHitCount: record.internalHits.length,
    sourceSlugHitCount: record.sourceSlugHits.length,
    structuralDisplayHitCount: record.structuralDisplayHits.length + record.flowSuffixLines.length,
    rawIsoHitCount: record.rawIsoLines.length,
    visibleMarkdownHitCount: record.markers?.urlFirst?.visibleMarkdownHitCount ?? 0,
    noHorizontalOverflow: record.noHorizontalOverflow,
  }));
  const uniqueStudioDestinations = Array.from(
    new Map(studioNavDestinationEvidence.map((entry) => [
      `${entry.pathname}|${entry.destinationTier}`,
      {
        pathname: entry.pathname,
        destinationTier: entry.destinationTier,
        label: entry.label,
      },
    ])).values(),
  );
  const navLeakScanRecords = userNavLeakScanRecords.length > 0 ? userNavLeakScanRecords : normal;
  const flowLabPrototypeLinkedFromUserNavCountByViewport = sumByViewport(
    navLeakScanRecords,
    (record) => record.flowLabPrototypeLinkCount ?? record.markers?.flowLabPrototypeLinkCount ?? 0,
  );
  const manualRegistrationQaUserLinkCountByViewport = sumByViewport(
    navLeakScanRecords,
    (record) => record.manualRegistrationQaLinkCount ?? record.markers?.manualRegistrationQaLinkCount ?? 0,
  );
  const getAgendaGroups = (record) => [
    ...(record.markers?.agendaGroupMeta?.calendarSelectedDay?.groups ?? []),
    ...(record.markers?.agendaGroupMeta?.myFlowStatusSheet?.groups ?? []),
  ];
  const getCalendarSelectedDayMeta = (record) =>
    record.markers?.agendaGroupMeta?.calendarSelectedDay ?? {};
  const getRoleLabelMeta = (record) =>
    record.markers?.calendarMyFlowRoleLabels ?? {};
  const calendarSameDateFlowRecords = records.filter((record) =>
    record.p18CalendarSameDateFlowFixture || record.category === 'calendar-same-date-flow',
  );
  const calendarGridFlowStackRecords = records.filter((record) =>
    record.p20CalendarGridCompactFixture || record.category === 'calendar-grid-flow-stack',
  );
  const countAgendaGroupRows = (record, field) =>
    getAgendaGroups(record).reduce((sum, group) => sum + (group[field] ?? 0), 0);
  const countCalendarSelectedDayGroupRows = (record, field) =>
    (getCalendarSelectedDayMeta(record).groups ?? []).reduce((sum, group) => sum + (group[field] ?? 0), 0);
  const calendarMobileSameDateFlowRecords = calendarSameDateFlowRecords.filter((record) => record.viewportWidth <= viewport.width);
  const countCalendarMobileSameDateRows = (field) =>
    calendarMobileSameDateFlowRecords.reduce((sum, record) => sum + countCalendarSelectedDayGroupRows(record, field), 0);
  const countPrototypeDisplayGateHits = (record) =>
    (record.prototypeDisplayGateHits?.rawRouteSlugHits?.length ?? 0)
    + (record.prototypeDisplayGateHits?.englishWeekdayHits?.length ?? 0)
    + (record.prototypeDisplayGateHits?.englishUiVerbHits?.length ?? 0)
    + (record.prototypeDisplayGateHits?.englishMonthTimeHits?.length ?? 0)
    + (record.prototypeDisplayGateHits?.mixedExportLanguageHits?.length ?? 0)
    + (record.prototypeDisplayGateHits?.duplicateExportEntryHits?.length ?? 0);
  const countPrototypeSurfaceGuardrailHits = (record) =>
    (record.internalHits?.length ?? 0)
    + (record.sourceSlugHits?.length ?? 0)
    + (record.structuralDisplayHits?.length ?? 0)
    + (record.flowSuffixLines?.length ?? 0)
    + (record.rawIsoLines?.length ?? 0)
    + (record.rawIsoInputValueHits?.length ?? 0)
    + countPrototypeDisplayGateHits(record)
    + (record.noHorizontalOverflow ? 0 : 1);
  const countUnexpectedPrototypeTierHits = (record) =>
    record.prototypeTierPolicy?.allowInternalDisplayGateHits
      ? 0
      : countPrototypeSurfaceGuardrailHits(record);
  const urlFirstExportModeEvidence = urlFirst.flatMap((record) =>
    (record.markers?.urlFirst?.exportModeEvidence ?? []).map((modeEvidence) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      ...modeEvidence,
    })),
  );
  const urlFirstCandidateUserCopyEvidence = urlFirst
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      ...(record.markers?.urlFirst?.candidateUserCopyEvidence ?? {}),
    }))
    .filter((entry) => entry.copiedTextHash);
  const urlFirstMissDraftGateEvidence = urlFirst
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      scenarioName: record.urlFirstScenarioName ?? record.markers?.urlFirst?.scenarioName ?? null,
      ...(record.markers?.urlFirst?.missDraftGate ?? {}),
    }))
    .filter((entry) => entry.visible || entry.ctaLabel);
  const urlFirstMissDraftFlowEvidence = urlFirst
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      scenarioName: record.urlFirstScenarioName ?? record.markers?.urlFirst?.scenarioName ?? null,
      ...(record.markers?.urlFirst?.missDraftFlow ?? {}),
    }))
    .filter((entry) => entry.entryVisible || entry.ctaLabel || entry.savePathVisible);
  const urlFirstScenarioTriggers = urlFirst
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      scenarioName: record.urlFirstScenarioName ?? record.markers?.urlFirst?.scenarioName ?? null,
      triggerUrl: record.urlFirstTriggerUrl ?? record.markers?.urlFirst?.triggerUrl ?? null,
    }))
    .filter((entry) => entry.triggerUrl);
  const urlFirstDateAnchorEvidence = urlFirst
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      scenarioName: record.urlFirstScenarioName ?? record.markers?.urlFirst?.scenarioName ?? null,
      triggerUrl: record.urlFirstTriggerUrl ?? record.markers?.urlFirst?.triggerUrl ?? null,
      label: record.markers?.urlFirst?.startDateInput?.label ?? '',
      helpText: record.markers?.urlFirst?.startDateInput?.helpText ?? '',
      visible: Boolean(record.markers?.urlFirst?.startDateInput?.visible),
    }))
    .filter((entry) => entry.visible || entry.label);
  const myFlowDateAnchorEvidence = normal
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      viewportWidth: record.viewportWidth,
      anchorSettingsOpenVisible: Boolean(record.markers?.dateAnchor?.anchorSettingsOpenVisible),
      anchorSettingsOpenLabels: record.markers?.dateAnchor?.anchorSettingsOpenLabels ?? [],
      anchorSettingsOpenAccessibleNameSample: record.markers?.dateAnchor?.anchorSettingsOpenAccessibleNameSample ?? [],
      anchorEditEntryVisible: Boolean(record.markers?.dateAnchor?.anchorEditEntryVisible),
      anchorEditLabel: record.markers?.dateAnchor?.anchorEditLabel ?? '',
      anchorInputLabel: record.markers?.dateAnchor?.anchorInputLabel ?? '',
      itemDateOverrideLabel: record.markers?.dateAnchor?.itemDateOverrideLabel ?? '',
      anchorVsItemOverrideCopyPresent: Boolean(record.markers?.dateAnchor?.anchorVsItemOverrideCopyPresent),
      helpText: record.markers?.dateAnchor?.anchorHelpText ?? '',
      itemEditEntryVisible: Boolean(record.markers?.dateAnchor?.itemEditEntryVisible),
      itemEditAccessibleNameSample: record.markers?.dateAnchor?.itemEditAccessibleNameSample ?? [],
    }))
    .filter((entry) =>
      entry.anchorEditEntryVisible
      || entry.anchorSettingsOpenVisible
      || entry.anchorEditLabel
      || entry.anchorSettingsOpenLabels.length > 0
      || entry.anchorInputLabel
      || entry.itemDateOverrideLabel
      || entry.anchorVsItemOverrideCopyPresent
      || entry.itemEditEntryVisible
    );
  const draftFlowEvidence = normal
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      viewportWidth: record.viewportWidth,
      ...(record.markers?.draftFlow ?? {}),
    }))
    .filter((entry) =>
      entry.landingVisible
      || entry.editEntryVisible
      || entry.anchorEditVisible
      || entry.itemEditEntryVisible
      || entry.anchorOverrideConflictPolicyVisible
      || entry.calendarProjectionUpdated
      || entry.exportProjectionUpdated
    );
  const urlFirstCandidateResolvedHitScenarios = urlFirst
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      state: record.urlFirstState,
      ...(record.markers?.urlFirst?.candidateResolvedHitScenario ?? {}),
    }))
    .filter((entry) => entry.captured !== undefined || entry.availabilityState);
  const homeUrlFirstEntryEvidence = records
    .filter((record) => record.url === '/')
    .map((record) => ({
      recordId: record.id,
      route: record.route,
      viewportWidth: record.viewportWidth,
      ...(record.markers?.homeUrlFirstEntry ?? {}),
    }));
  const draftLifecycleEvidence = normal
    .filter((record) => record.markers?.draftLifecycle)
    .map((record) => ({
      recordId: record.id,
      route: record.url,
      viewportWidth: record.viewportWidth,
      internalHitCount: record.internalHits.length,
      noHorizontalOverflow: record.noHorizontalOverflow,
      ...record.markers.draftLifecycle,
    }));
  const draftLifecycleByGroup = (group) => draftLifecycleEvidence.filter((entry) => entry.stateGroup === group);
  const draftCompletedRemainingCounts = draftLifecycleByGroup('completed')
    .map((entry) => entry.remainingCount)
    .filter((value) => typeof value === 'number');
  return {
    totalScreenshots: records.length,
    uiBaselineCommit,
    packageGeneratedFromCommit,
    packageCommitRef,
    wideViewportEvidenceCount: wideViewportRecords.length,
    wideViewportWidth: wideViewport.width,
    wideViewportRoutesCaptured: wideViewportRecords.map((record) => ({
      id: record.id,
      route: record.url,
      viewportWidth: record.viewportWidth,
      noHorizontalOverflow: record.noHorizontalOverflow,
    })),
    wideViewportHorizontalOverflowCount: wideViewportRecords.filter((record) => !record.noHorizontalOverflow).length,
    wideLayoutRouteCount: wideViewportRecords.length,
    wideLayoutFixedOverlapCount: 0,
    wideLayoutPrimaryCtaVisibleCount: wideViewportRecords.filter((record) => record.markers?.wideLayout?.primaryCtaVisible).length,
    wideLayoutMyFlowVisibleFlowFindingLinkMax: Math.max(
      0,
      ...wideMyFlowRecords.map((record) => record.markers?.wideLayout?.visibleFlowFindingLinkCount ?? 0),
    ),
    wideLayoutHomeRecommendationWidthRatioMin: Math.min(
      1,
      ...wideViewportRecords
        .map((record) => record.markers?.wideLayout?.homeRecommendationCardWidthRatio)
        .filter((value) => typeof value === 'number'),
    ),
    homeUrlFirstEntryVisible: homeUrlFirstEntryEvidence.some((entry) => entry.visible),
    homeUrlFirstEntryLabel: Array.from(new Set(homeUrlFirstEntryEvidence.map((entry) => entry.label).filter(Boolean))).slice(0, 5),
    homeUrlFirstEntryDestination: Array.from(new Set(homeUrlFirstEntryEvidence.map((entry) => entry.destination).filter(Boolean))).slice(0, 5),
    homeUrlFirstEntryAboveFold: homeUrlFirstEntryEvidence.every((entry) => entry.aboveFold === true),
    homeMemoEntryVisible: homeUrlFirstEntryEvidence.some((entry) => entry.memoEntryVisible),
    homePrimaryEntryCompetesWithRecommendations: homeUrlFirstEntryEvidence.some((entry) => entry.competesWithRecommendations),
    homeUrlFirstEntrySeparatorPresent: homeUrlFirstEntryEvidence.some((entry) => entry.separatorPresent),
    homeUrlFirstEntryConcatenatedLabelCount: homeUrlFirstEntryEvidence.reduce(
      (sum, entry) => sum + (entry.concatenatedLabelHitCount ?? 0),
      0,
    ),
    homeUrlFirstEntryByViewport: homeUrlFirstEntryEvidence.reduce((acc, entry) => {
      const viewportKey = String(entry.viewportWidth ?? viewport.width);
      acc[viewportKey] = {
        visible: Boolean(entry.visible),
        aboveFold: Boolean(entry.aboveFold),
        destination: entry.destination ?? null,
        memoEntryVisible: Boolean(entry.memoEntryVisible),
      };
      return acc;
    }, {}),
    homeUrlFirstEntryEvidence,
    draftLifecycleScenarioCount: new Set(draftLifecycleEvidence.map((entry) => entry.stateGroup).filter(Boolean)).size,
    draftSaveFailureScenarioCaptured: draftLifecycleByGroup('failure').some((entry) => entry.captured),
    draftSaveFailureRecoveryVisible: draftLifecycleByGroup('failure').some((entry) => entry.userRecoveryVisible),
    draftSaveFailureInputPreserved: draftLifecycleByGroup('failure').some((entry) => entry.inputPreserved),
    draftDuplicateScenarioCaptured: draftLifecycleByGroup('duplicate').some((entry) => entry.captured),
    draftDuplicateCreatesExtraSavedFlow: draftLifecycleByGroup('duplicate').some((entry) => entry.createsExtraSavedFlow),
    draftDuplicateRecoveryVisible: draftLifecycleByGroup('duplicate').some((entry) => entry.userRecoveryVisible),
    draftEmptyStateCaptured: new Set(draftLifecycleByGroup('empty').map((entry) => entry.surface)).size >= 2,
    draftCompletedZeroStateCaptured: draftLifecycleByGroup('completed').some((entry) => entry.captured && entry.remainingCount === 0),
    draftCompletedRemainingCount: draftCompletedRemainingCounts.length > 0 ? Math.min(...draftCompletedRemainingCounts) : null,
    draftOfflineScenarioCaptured: draftLifecycleByGroup('offline').some((entry) => entry.captured),
    draftOfflineLocalActionsAvailable: draftLifecycleByGroup('offline').some((entry) => entry.localActionsAvailable),
    draftLifecycleInternalHitCount: draftLifecycleEvidence.reduce((sum, entry) => sum + entry.internalHitCount, 0),
    draftLifecycleHorizontalOverflowCount: draftLifecycleEvidence.filter((entry) => !entry.noHorizontalOverflow).length,
    draftLifecycleEvidence,
    wideViewportGuardrailRouteCount: wideUserSurfaceRecords.length,
    wideViewportInternalHitCount: wideUserSurfaceRecords.reduce((sum, record) => sum + record.internalHits.length, 0),
    wideViewportSourceSlugHitCount: wideUserSurfaceRecords.reduce((sum, record) => sum + record.sourceSlugHits.length, 0),
    wideViewportStructuralDisplayHitCount: wideUserSurfaceRecords.reduce((sum, record) => sum + record.structuralDisplayHits.length + record.flowSuffixLines.length, 0),
    wideViewportRawIsoHitCount: wideUserSurfaceRecords.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    wideViewportInputRawIsoHitCount: wideUserSurfaceRecords.reduce((sum, record) => sum + (record.rawIsoInputValueHits?.length ?? 0), 0),
    wideViewportVisibleMarkdownHitCount: wideUserSurfaceRecords.reduce((sum, record) =>
      sum
      + (record.markers?.urlFirst?.visibleMarkdownHitCount ?? 0)
      + (record.markers?.urlFirst?.exportModeEvidence ?? []).reduce(
        (modeSum, modeEvidence) => modeSum + (modeEvidence.visibleMarkdownHitCount ?? 0),
        0,
      ),
    0),
    wideViewportCandidateCopyInternalHitCount: wideUserSurfaceRecords.reduce((sum, record) =>
      sum + (record.markers?.urlFirst?.candidateUserCopyEvidence?.forbiddenHitCount ?? 0),
    0),
    wideViewportUrlFirstScenarioCount: wideUserSurfaceRecords.filter((record) => Boolean(record.urlFirstState)).length,
    wideViewportUrlFirstStatesCaptured: wideUserSurfaceRecords
      .filter((record) => Boolean(record.urlFirstState))
      .map((record) => record.urlFirstState),
    studioNavDestination: uniqueStudioDestinations[0]?.pathname ?? null,
    studioNavDestinationTier: uniqueStudioDestinations[0]?.destinationTier ?? null,
    studioNavDestinationEvidence,
    studioEntryAllowedRoutePrefixes,
    studioEntryPlacementEvidence,
    studioEntryUnexpectedRouteCount: studioEntryPlacementEvidence.filter((entry) => !entry.allowed).length,
    studioEntryVisibleByViewport: sumByViewport(
      studioEntryVisibleRecords,
      (record) => (record.markers?.studioEntry?.visible ? 1 : 0),
    ),
    studioEntryReachableByViewport: sumByViewport(
      studioEntryVisibleRecords,
      (record) => (record.markers?.studioEntry?.reachable ? 1 : 0),
    ),
    studioEntryDestination: uniqueStudioDestinations[0]?.pathname ?? null,
    studioEntryDestinationTier: uniqueStudioDestinations[0]?.destinationTier ?? null,
    studioEntryPolicy: 'visible as a saved-work header action on /my and /calendar when saved content exists; creator profile remains outside the 4-tab IA',
    creatorProfileRouteCount: creatorProfileRecords.length,
    creatorProfileViewportWidths: Array.from(new Set(creatorProfileRecords.map((record) => record.viewportWidth))).sort((a, b) => a - b),
    creatorProfileTier: 'creator-profile',
    creatorProfilePolicy: 'user-facing secondary surface outside the 4-tab IA; not a fifth tab; current-user studio is noindex, public creator channels may be indexable; normal user-surface guardrails apply',
    creatorProfileNoindex: creatorProfileEvidence.map((entry) => ({
      recordId: entry.recordId,
      route: entry.route,
      viewportWidth: entry.viewportWidth,
      noindex: entry.noindex,
    })),
    creatorProfileFilledRouteCount: creatorProfileEvidence.filter((entry) => entry.contentCardCount > 0).length,
    creatorProfileEmptyRouteCount: creatorProfileEvidence.filter((entry) => entry.contentCardCount === 0 || entry.emptySummaryVisible).length,
    creatorProfileContentCardCount: creatorProfileEvidence.reduce((sum, entry) => sum + entry.contentCardCount, 0),
    creatorProfileDraftTabVisible: creatorProfileEvidence.some((entry) => entry.draftTabVisible),
    creatorProfileDraftContentCardCount: creatorProfileEvidence.reduce((sum, entry) => sum + entry.draftContentCardCount, 0),
    creatorProfilePublishedContentCardCount: creatorProfileEvidence.reduce((sum, entry) => sum + entry.publishedContentCardCount, 0),
    creatorProfileUrlFirstDraftCardCount: creatorProfileEvidence.reduce((sum, entry) => sum + entry.urlFirstDraftCardCount, 0),
    creatorProfileDraftEditPathVisible: creatorProfileEvidence.some((entry) => entry.draftEditPathVisible),
    creatorProfileDraftEditDestinations: Array.from(
      new Map(creatorProfileEvidence.flatMap((entry) => entry.draftEditDestinations).map((destination) => [
        `${destination.pathname}|${destination.label}`,
        destination,
      ])).values(),
    ),
    creatorProfileGuardrailHitCount: creatorProfileEvidence.reduce((sum, entry) =>
      sum
      + entry.internalHitCount
      + entry.sourceSlugHitCount
      + entry.structuralDisplayHitCount
      + entry.rawIsoHitCount
      + entry.visibleMarkdownHitCount
      + (entry.noHorizontalOverflow ? 0 : 1),
    0),
    creatorProfileEvidence,
    userNavLeakScanRouteCount: userNavLeakScanRecords.length,
    userNavLeakScanViewports: Array.from(new Set(userNavLeakScanRecords.map((record) => record.viewportWidth))).sort((a, b) => a - b),
    flowLabPrototypeLinkedFromUserNavCountByViewport,
    manualRegistrationQaUserLinkCountByViewport,
    postSaveConfirmationVisible: postSaveConfirmationRecords.length > 0,
    postSaveConfirmationText: Array.from(new Set(postSaveConfirmationRecords.map((record) => record.markers?.postSaveConfirmation?.text).filter(Boolean))),
    postSaveConfirmationRepeatsFirstTaskTitle: postSaveConfirmationRecords.some((record) =>
      Boolean(record.markers?.postSaveConfirmation?.repeatsFirstTaskTitle),
    ),
    postSaveConfirmationEvidence: normal
      .filter((record) => record.markers?.postSaveConfirmation?.visible || record.url.includes('savedMap='))
      .map((record) => ({
        id: record.id,
        route: record.url,
        visible: Boolean(record.markers?.postSaveConfirmation?.visible),
        text: record.markers?.postSaveConfirmation?.text ?? '',
        repeatsFirstTaskTitle: Boolean(record.markers?.postSaveConfirmation?.repeatsFirstTaskTitle),
      })),
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
    myFlowTodayFrameCount: Math.max(
      0,
      ...normal.map((record) => record.markers?.myFlowTodayFrame?.frameCount ?? 0),
    ),
    myFlowTodayRemainingCountSourceCount: Math.max(
      0,
      ...normal.map((record) => record.markers?.myFlowTodayFrame?.remainingCountSourceCount ?? 0),
    ),
    myFlowTodayInlineCompleteControlCount: normal.reduce((sum, record) =>
      sum + (record.markers?.myFlowTodayFrame?.inlineCompleteControlCount ?? 0),
    0),
    myFlowTodayOpenBeforeCompleteRequired: normal.some((record) =>
      Boolean(record.markers?.myFlowTodayFrame?.openBeforeCompleteRequired),
    ),
    myFlowTodayGenericMetaChipCount: normal.reduce((sum, record) =>
      sum + (record.markers?.myFlowTodayFrame?.genericMetaChipCount ?? 0),
    0),
    myFlowTodayFrameEvidence: normal
      .filter((record) => record.markers?.myFlowTodayFrame?.sectionVisible || record.url.startsWith('/my'))
      .map((record) => ({
        id: record.id,
        route: record.url,
        viewportWidth: record.viewportWidth,
        frameCount: record.markers?.myFlowTodayFrame?.frameCount ?? 0,
        remainingCountSourceCount: record.markers?.myFlowTodayFrame?.remainingCountSourceCount ?? 0,
        remainingCountLabels: record.markers?.myFlowTodayFrame?.remainingCountLabels ?? [],
        inlineCompleteControlCount: record.markers?.myFlowTodayFrame?.inlineCompleteControlCount ?? 0,
        openBeforeCompleteRequired: Boolean(record.markers?.myFlowTodayFrame?.openBeforeCompleteRequired),
        genericMetaChipCount: record.markers?.myFlowTodayFrame?.genericMetaChipCount ?? 0,
        firstInlineCompleteAccessibleName: record.markers?.myFlowTodayFrame?.firstInlineCompleteAccessibleName ?? '',
      })),
    taskCompleteCheckboxCount: normal.reduce((sum, record) =>
      sum + (record.markers?.taskCompletionControls?.taskCompleteCheckboxCount ?? 0),
    0),
    taskCompleteButtonCount: normal.reduce((sum, record) =>
      sum + (record.markers?.taskCompletionControls?.taskCompleteButtonCount ?? 0),
    0),
    taskCompleteMixedControlCount: normal.reduce((sum, record) =>
      sum + (record.markers?.taskCompletionControls?.taskCompleteMixedControlCount ?? 0),
    0),
    subChecklistCheckboxCount: normal.reduce((sum, record) =>
      sum + (record.markers?.taskCompletionControls?.subChecklistCheckboxCount ?? 0),
    0),
    taskCompleteControlPatternEvidence: normal
      .filter((record) =>
        record.url.startsWith('/my')
        || record.url.startsWith('/calendar')
        || record.url.startsWith('/f/'),
      )
      .map((record) => ({
        id: record.id,
        route: record.url,
        viewportWidth: record.viewportWidth,
        pattern: record.markers?.taskCompletionControls?.taskCompleteControlPattern ?? 'none',
        checkboxCount: record.markers?.taskCompletionControls?.taskCompleteCheckboxCount ?? 0,
        buttonCount: record.markers?.taskCompletionControls?.taskCompleteButtonCount ?? 0,
        mixedControlCount: record.markers?.taskCompletionControls?.taskCompleteMixedControlCount ?? 0,
        subChecklistCheckboxCount: record.markers?.taskCompletionControls?.subChecklistCheckboxCount ?? 0,
        checkboxSamples: record.markers?.taskCompletionControls?.taskCompleteCheckboxSamples ?? [],
        buttonSamples: record.markers?.taskCompletionControls?.taskCompleteButtonSamples ?? [],
      })),
    normalRouteAgendaGroupMetaCount: normal.reduce((sum, record) => sum + getAgendaGroups(record).length, 0),
    normalRouteAgendaGroupRepeatedDateMetaRowCount: normal.reduce((sum, record) =>
      sum + countAgendaGroupRows(record, 'repeatedDateMetaRowCount'),
    0),
    normalRouteAgendaGroupRepeatedTimingMetaRowCount: normal.reduce((sum, record) =>
      sum + countAgendaGroupRows(record, 'repeatedTimingMetaRowCount'),
    0),
    calendarMobileAgendaRowCount: countCalendarMobileSameDateRows('rowCount'),
    calendarMobileAgendaDenseRowCount: countCalendarMobileSameDateRows('denseRowCount'),
    calendarMobileAgendaRowDateMetaCount: countCalendarMobileSameDateRows('repeatedDateMetaRowCount'),
    calendarMobileAgendaRowTimingMetaCount: countCalendarMobileSameDateRows('repeatedTimingMetaRowCount'),
    calendarMobileAgendaRowFlowMetaCount: countCalendarMobileSameDateRows('repeatedFlowMetaRowCount'),
    calendarMobileAgendaRowProgressMetaCount: countCalendarMobileSameDateRows('repeatedProgressMetaRowCount'),
    calendarMobileAgendaOpenLabelRowCount: countCalendarMobileSameDateRows('openLabelRowCount'),
    calendarFlowMarkerCount: normal.reduce((sum, record) =>
      sum + (getCalendarSelectedDayMeta(record).flowMarkerCount ?? 0),
    0),
    calendarDistinctFlowMarkerCount: Math.max(
      0,
      ...normal.map((record) => getCalendarSelectedDayMeta(record).distinctFlowMarkerCount ?? 0),
    ),
    calendarSameDateDistinctFlowGroupCount: Math.max(
      0,
      ...calendarSameDateFlowRecords.map((record) => getCalendarSelectedDayMeta(record).distinctFlowMarkerCount ?? 0),
    ),
    calendarAgendaGroupByFlow: calendarSameDateFlowRecords.some((record) =>
      Boolean(getCalendarSelectedDayMeta(record).agendaGroupByFlow),
    ),
    calendarFlowMarkerContrastChecked: calendarSameDateFlowRecords.some((record) => {
      const meta = getCalendarSelectedDayMeta(record);
      return (meta.flowMarkerCount ?? 0) > 0 && (meta.selectedDateGridDistinctFlowLabelCount ?? 0) > 0;
    }),
    calendarSameDateGridDistinctFlowLabelCount: Math.max(
      0,
      ...calendarSameDateFlowRecords.map((record) => getCalendarSelectedDayMeta(record).selectedDateGridDistinctFlowLabelCount ?? 0),
    ),
    calendarSameDateFlowEvidence: calendarSameDateFlowRecords.map((record) => ({
      id: record.id,
      route: record.url,
      viewportWidth: record.viewportWidth,
      selectedDate: record.selectedDate,
      flowMarkerCount: getCalendarSelectedDayMeta(record).flowMarkerCount ?? 0,
      distinctFlowMarkerCount: getCalendarSelectedDayMeta(record).distinctFlowMarkerCount ?? 0,
      selectedDateGridFlowLabels: getCalendarSelectedDayMeta(record).selectedDateGridFlowLabels ?? [],
      agendaGroupByFlow: Boolean(getCalendarSelectedDayMeta(record).agendaGroupByFlow),
    })),
    calendarGridSameDateFlowCount: Math.max(
      0,
      ...calendarGridFlowStackRecords.map((record) => getCalendarSelectedDayMeta(record).distinctFlowMarkerCount ?? 0),
    ),
    calendarGridVisibleFlowLabelCount: Math.max(
      0,
      ...calendarGridFlowStackRecords.map((record) => getCalendarSelectedDayMeta(record).selectedDateGridDistinctFlowLabelCount ?? 0),
    ),
    calendarGridDistinctVisibleMarkerIdentityCount: Math.max(
      0,
      ...calendarGridFlowStackRecords.map((record) => getCalendarSelectedDayMeta(record).selectedDateGridDistinctMarkerIdentityCount ?? 0),
    ),
    calendarGridOverflowSummaryVisible: calendarGridFlowStackRecords.some((record) =>
      Boolean(getCalendarSelectedDayMeta(record).selectedDateGridOverflowSummaryVisible),
    ),
    calendarGridHiddenFlowSummaryCount: Math.max(
      0,
      ...calendarGridFlowStackRecords.map((record) => getCalendarSelectedDayMeta(record).selectedDateGridHiddenFlowSummaryCount ?? 0),
    ),
    calendarGridHorizontalOverflowCount: calendarGridFlowStackRecords.reduce((sum, record) =>
      sum + (record.noHorizontalOverflow ? 0 : 1),
    0),
    calendarSelectedDayAgendaShowsAllFlows: calendarGridFlowStackRecords.some((record) => {
      const meta = getCalendarSelectedDayMeta(record);
      return (meta.distinctFlowMarkerCount ?? 0) >= 3
        && (meta.groupCount ?? 0) >= (meta.distinctFlowMarkerCount ?? 0)
        && Boolean(meta.agendaGroupByFlow);
    }),
    calendarGridFlowStackEvidence: calendarGridFlowStackRecords.map((record) => ({
      id: record.id,
      route: record.url,
      viewportWidth: record.viewportWidth,
      selectedDate: record.selectedDate,
      sameDateFlowCount: getCalendarSelectedDayMeta(record).distinctFlowMarkerCount ?? 0,
      visibleFlowLabelCount: getCalendarSelectedDayMeta(record).selectedDateGridDistinctFlowLabelCount ?? 0,
      visibleMarkerIdentityCount: getCalendarSelectedDayMeta(record).selectedDateGridDistinctMarkerIdentityCount ?? 0,
      visibleMarkerIdentities: getCalendarSelectedDayMeta(record).selectedDateGridFlowMarkerIdentities ?? [],
      overflowSummaryVisible: Boolean(getCalendarSelectedDayMeta(record).selectedDateGridOverflowSummaryVisible),
      hiddenFlowSummaryCount: getCalendarSelectedDayMeta(record).selectedDateGridHiddenFlowSummaryCount ?? 0,
      overflowSummaryLabels: getCalendarSelectedDayMeta(record).selectedDateGridOverflowSummaryLabels ?? [],
      selectedDayAgendaShowsAllFlows: (getCalendarSelectedDayMeta(record).groupCount ?? 0) >= (getCalendarSelectedDayMeta(record).distinctFlowMarkerCount ?? 0),
      noHorizontalOverflow: record.noHorizontalOverflow,
    })),
    calendarTitleContainsMyFlowCount: normal.reduce((sum, record) =>
      sum + (getRoleLabelMeta(record).calendarTitleContainsMyFlowCount ?? 0),
    0),
    calendarPrimaryGenericTypeLabelCount: normal.reduce((sum, record) =>
      sum + (getRoleLabelMeta(record).calendarPrimaryGenericTypeLabelCount ?? 0),
    0),
    calendarHeadingDuplicateCount: normal.reduce((sum, record) =>
      sum + (record.url.startsWith('/calendar') ? (getRoleLabelMeta(record).calendarHeadingDuplicateCount ?? 0) : 0),
    0),
    myFlowPrimaryGenericFlowLabelCount: normal.reduce((sum, record) =>
      sum + (getRoleLabelMeta(record).myFlowPrimaryGenericFlowLabelCount ?? 0),
    0),
    calendarTaskRoleCopyPresent: normal.some((record) =>
      record.url.startsWith('/calendar') && Boolean(getRoleLabelMeta(record).calendarTaskRoleCopyPresent),
    ),
    myFlowTaskRoleCopyPresent: normal.some((record) =>
      record.url.startsWith('/my') && Boolean(getRoleLabelMeta(record).myFlowTaskRoleCopyPresent),
    ),
    calendarMyFlowRoleLabelEvidence: normal
      .filter((record) => record.url.startsWith('/calendar') || record.url.startsWith('/my'))
      .map((record) => ({
        id: record.id,
        route: record.url,
        viewportWidth: record.viewportWidth,
        calendarTitleContainsMyFlowCount: getRoleLabelMeta(record).calendarTitleContainsMyFlowCount ?? 0,
        calendarPrimaryGenericTypeLabelCount: getRoleLabelMeta(record).calendarPrimaryGenericTypeLabelCount ?? 0,
        calendarPrimaryGenericTypeLabelHits: getRoleLabelMeta(record).calendarPrimaryGenericTypeLabelHits ?? [],
        calendarHeadingDuplicateCount: getRoleLabelMeta(record).calendarHeadingDuplicateCount ?? 0,
        calendarHeadingDuplicateHits: getRoleLabelMeta(record).calendarHeadingDuplicateHits ?? [],
        myFlowPrimaryGenericFlowLabelCount: getRoleLabelMeta(record).myFlowPrimaryGenericFlowLabelCount ?? 0,
        myFlowPrimaryGenericFlowLabelHits: getRoleLabelMeta(record).myFlowPrimaryGenericFlowLabelHits ?? [],
        calendarTaskRoleCopyPresent: Boolean(getRoleLabelMeta(record).calendarTaskRoleCopyPresent),
        myFlowTaskRoleCopyPresent: Boolean(getRoleLabelMeta(record).myFlowTaskRoleCopyPresent),
        calendarPrimaryLabels: getRoleLabelMeta(record).calendarPrimaryLabels ?? [],
      })),
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
    progressMetricAmbiguousCount: normal.reduce((sum, record) =>
      record.url.startsWith('/my') || record.url.startsWith('/calendar')
        ? sum + (record.markers?.progressMetricSemantics?.progressMetricAmbiguousCount ?? 0)
        : sum,
    0),
    progressMetricContextLabelCount: normal.reduce((sum, record) =>
      record.url.startsWith('/my') || record.url.startsWith('/calendar')
        ? sum + (record.markers?.progressMetricSemantics?.progressMetricContextLabelCount ?? 0)
        : sum,
    0),
    rowLevelFlowProgressChipCount: normal.reduce((sum, record) =>
      record.url.startsWith('/my') || record.url.startsWith('/calendar')
        ? sum + (record.markers?.progressMetricSemantics?.rowLevelFlowProgressChipCount ?? 0)
        : sum,
    0),
    detailChecklistProgressLabelCount: normal.reduce((sum, record) =>
      record.url.startsWith('/my') || record.url.startsWith('/calendar')
        ? sum + (record.markers?.progressMetricSemantics?.detailChecklistProgressLabelCount ?? 0)
        : sum,
    0),
    todayRemainingCountVisible: normal.reduce((sum, record) =>
      record.url.startsWith('/my')
        ? sum + (record.markers?.progressMetricSemantics?.todayRemainingCountVisible ?? 0)
        : sum,
    0),
    calendarSelectedDayRemainingCountVisible: normal.reduce((sum, record) =>
      record.url.startsWith('/calendar')
        ? sum + (record.markers?.progressMetricSemantics?.calendarSelectedDayRemainingCountVisible ?? 0)
        : sum,
    0),
    progressMetricSemanticsEvidence: normal
      .filter((record) => record.url.startsWith('/my') || record.url.startsWith('/calendar'))
      .map((record) => ({
        id: record.id,
        route: record.url,
        viewportWidth: record.viewportWidth,
        progressMetricAmbiguousCount: record.markers?.progressMetricSemantics?.progressMetricAmbiguousCount ?? 0,
        progressMetricAmbiguousHits: record.markers?.progressMetricSemantics?.progressMetricAmbiguousHits ?? [],
        progressMetricContextLabelCount: record.markers?.progressMetricSemantics?.progressMetricContextLabelCount ?? 0,
        progressMetricContextLabels: record.markers?.progressMetricSemantics?.progressMetricContextLabels ?? [],
        rowLevelFlowProgressChipCount: record.markers?.progressMetricSemantics?.rowLevelFlowProgressChipCount ?? 0,
        detailChecklistProgressLabelCount: record.markers?.progressMetricSemantics?.detailChecklistProgressLabelCount ?? 0,
        todayRemainingCountVisible: record.markers?.progressMetricSemantics?.todayRemainingCountVisible ?? 0,
        calendarSelectedDayRemainingCountVisible: record.markers?.progressMetricSemantics?.calendarSelectedDayRemainingCountVisible ?? 0,
      })),
    urlFirstScenarioCount: urlFirst.length,
    urlFirstStatesCaptured: urlFirst.map((record) => record.urlFirstState ?? record.id),
    urlFirstScenarioTriggerUrlCount: urlFirstScenarioTriggers.length,
    urlFirstScenarioTriggers,
    urlFirstNormalInternalHitCount: urlFirst.reduce((sum, record) => sum + record.internalHits.length, 0),
    urlFirstNormalSourceSlugHitCount: urlFirst.reduce((sum, record) => sum + record.sourceSlugHits.length, 0),
    urlFirstNormalStructuralDisplayHitCount: urlFirst.reduce((sum, record) => sum + record.structuralDisplayHits.length + record.flowSuffixLines.length, 0),
    urlFirstNormalRawIsoHitCount: urlFirst.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    urlFirstNormalInputRawIsoHitCount: urlFirst.reduce((sum, record) => sum + (record.rawIsoInputValueHits?.length ?? 0), 0),
    urlFirstNormalInputRawIsoExemptCount: urlFirst.reduce((sum, record) => sum + (record.rawIsoInputValueExemptions?.length ?? 0), 0),
    urlFirstInputRawIsoExemptions: urlFirst.flatMap((record) =>
      (record.rawIsoInputValueExemptions ?? []).map((hit) => ({
        route: record.route,
        state: record.urlFirstState,
        ...hit,
      })),
    ),
    urlFirstVisibleMarkdownHitCount: urlFirst.reduce((sum, record) => sum + (record.markers?.urlFirst?.visibleMarkdownHitCount ?? 0), 0),
    urlFirstVisibleMarkdownHits: urlFirst.flatMap((record) =>
      (record.markers?.urlFirst?.visibleMarkdownLines ?? []).map((line) => ({
        route: record.route,
        state: record.urlFirstState,
        line,
      })),
    ),
    urlFirstMechanismCopyOldHitCount: urlFirst.reduce((sum, record) => sum + (record.markers?.urlFirst?.mechanismCopyOldHitCount ?? 0), 0),
    urlFirstMechanismCopyOldHits: urlFirst.flatMap((record) =>
      (record.markers?.urlFirst?.mechanismCopyOldLines ?? []).map((line) => ({
        route: record.route,
        state: record.urlFirstState,
        line,
      })),
    ),
    urlFirstMechanismCopyValueHitCount: urlFirst.reduce((sum, record) => sum + (record.markers?.urlFirst?.mechanismCopyValueHitCount ?? 0), 0),
    urlFirstMechanismCopyValueHits: urlFirst.flatMap((record) =>
      (record.markers?.urlFirst?.mechanismCopyValueLines ?? []).map((line) => ({
        route: record.route,
        state: record.urlFirstState,
        line,
      })),
    ),
    urlFirstCandidateLegacySystemCopyHitCount: urlFirst.reduce((sum, record) =>
      sum + (record.markers?.urlFirst?.candidateLegacySystemCopyHitCount ?? 0),
    0),
    urlFirstCandidateLegacySystemCopyHits: urlFirst.flatMap((record) =>
      (record.markers?.urlFirst?.candidateLegacySystemCopyLines ?? []).map((line) => ({
        route: record.route,
        state: record.urlFirstState,
        line,
      })),
    ),
    urlFirstCandidateUserToneCopyHitCount: urlFirst.reduce((sum, record) =>
      sum + (record.markers?.urlFirst?.candidateUserToneCopyHitCount ?? 0),
    0),
    urlFirstCandidateUserToneCopyHits: urlFirst.flatMap((record) =>
      (record.markers?.urlFirst?.candidateUserToneCopyLines ?? []).map((line) => ({
        route: record.route,
        state: record.urlFirstState,
        line,
      })),
    ),
    urlFirstCandidateCardTextScanned: urlFirst.some((record) =>
      Boolean(record.markers?.urlFirst?.candidateCardTextScanned),
    ),
    urlFirstCandidateCardTextSamples: urlFirst
      .filter((record) => record.markers?.urlFirst?.candidateCardTextScanned)
      .map((record) => ({
        route: record.route,
        state: record.urlFirstState,
        scenarioName: record.urlFirstScenarioName ?? record.markers?.urlFirst?.scenarioName ?? null,
        lines: (record.markers?.urlFirst?.candidateCardTextLines ?? []).slice(0, 24),
      })),
    urlFirstCandidateCardLegacyStatusHitCount: urlFirst.reduce((sum, record) =>
      sum + (record.markers?.urlFirst?.candidateCardLegacyStatusHitCount ?? 0),
    0),
    urlFirstCandidateCardLegacyStatusHits: urlFirst.flatMap((record) =>
      (record.markers?.urlFirst?.candidateCardLegacyStatusHits ?? []).map((hit) => ({
        route: record.route,
        state: record.urlFirstState,
        scenarioName: record.urlFirstScenarioName ?? record.markers?.urlFirst?.scenarioName ?? null,
        ...hit,
      })),
    ),
    urlFirstExportModeEvidenceCount: urlFirstExportModeEvidence.length,
    urlFirstExportModeScannedCount: urlFirstExportModeEvidence.filter((modeEvidence) => modeEvidence.exportModeScanned).length,
    urlFirstExportModesCaptured: urlFirstExportModeEvidence.map((modeEvidence) => ({
      route: modeEvidence.route,
      state: modeEvidence.state,
      exportMode: modeEvidence.exportMode,
      exportModeScanned: Boolean(modeEvidence.exportModeScanned),
      optionLabel: modeEvidence.optionLabel,
      visibleButtons: modeEvidence.visibleButtons,
    })),
    urlFirstExportModeVisibleMarkdownHitCount: urlFirstExportModeEvidence.reduce(
      (sum, modeEvidence) => sum + (modeEvidence.visibleMarkdownHitCount ?? 0),
      0,
    ),
    urlFirstExportModeVisibleMarkdownHits: urlFirstExportModeEvidence.flatMap((modeEvidence) =>
      (modeEvidence.visibleMarkdownLines ?? []).map((line) => ({
        route: modeEvidence.route,
        state: modeEvidence.state,
        exportMode: modeEvidence.exportMode,
        line,
      })),
    ),
    urlFirstCandidateUserCopyEvidenceCount: urlFirstCandidateUserCopyEvidence.length,
    urlFirstCandidateUserCopyInternalHitCount: urlFirstCandidateUserCopyEvidence.reduce(
      (sum, entry) => sum + (entry.forbiddenHitCount ?? 0),
      0,
    ),
    urlFirstMissCandidateCopyInternalHitCount: urlFirstCandidateUserCopyEvidence.reduce(
      (sum, entry) => sum + (entry.forbiddenHitCount ?? 0),
      0,
    ),
    urlFirstCandidateUserCopyForbiddenHits: urlFirstCandidateUserCopyEvidence.flatMap((entry) =>
      (entry.forbiddenHits ?? []).map((hit) => ({
        route: entry.route,
        state: entry.state,
        ...hit,
      })),
    ),
    urlFirstCandidateUserCopySamples: urlFirstCandidateUserCopyEvidence.map((entry) => ({
      route: entry.route,
      state: entry.state,
      copiedTextLength: entry.copiedTextLength,
      copiedTextHash: entry.copiedTextHash,
      sample: entry.sample,
    })),
    urlFirstCandidateInternalHandoffPreserved: urlFirstCandidateUserCopyEvidence.length > 0
      && urlFirstCandidateUserCopyEvidence.every((entry) => entry.internalHandoffPreserved === true),
    urlFirstCandidateExpandedDetailCaptured: urlFirst.some((record) =>
      Boolean(record.markers?.urlFirst?.candidateExpandedDetailCaptured),
    ),
    urlFirstCandidateResolvedHitScenarioCaptured: urlFirstCandidateResolvedHitScenarios.some((entry) => entry.captured),
    urlFirstCandidateResolvedHitScenarioStatus: urlFirstCandidateResolvedHitScenarios.find((entry) => entry.captured)?.availabilityState ?? 'not-captured',
    urlFirstCandidateResolvedHitScenarios,
    urlFirstMissDraftGateVisible: urlFirstMissDraftGateEvidence.some((entry) => entry.visible),
    urlFirstMissDraftCtaLabel: urlFirstMissDraftGateEvidence.find((entry) => entry.ctaLabel)?.ctaLabel ?? '',
    urlFirstMissDraftEntryVisible: urlFirstMissDraftFlowEvidence.some((entry) => entry.entryVisible),
    urlFirstMissDraftEditableItemCount: urlFirstMissDraftFlowEvidence.reduce(
      (sum, entry) => sum + (entry.editableItemCount ?? 0),
      0,
    ),
    urlFirstMissDraftSuggestedItemCount: urlFirstMissDraftFlowEvidence.reduce(
      (sum, entry) => sum + (entry.suggestedItemCount ?? 0),
      0,
    ),
    urlFirstMissDraftStepDatesFromAnchor: urlFirstMissDraftFlowEvidence.some((entry) => entry.draftStepDatesFromAnchor),
    urlFirstMissDraftSavePathVisible: urlFirstMissDraftFlowEvidence.some((entry) => entry.savePathVisible),
    urlFirstMissDraftInternalHitCount: urlFirstMissDraftFlowEvidence.reduce(
      (sum, entry) => sum + (entry.internalHitCount ?? 0),
      0,
    ),
    urlFirstMissDraftFlowEvidence,
    urlFirstMissDraftImpliesLiveAi: urlFirstMissDraftGateEvidence.some((entry) => entry.impliesLiveAi)
      || urlFirstMissDraftFlowEvidence.some((entry) => entry.impliesLiveAi),
    urlFirstMissDraftLiveAiHitCount: urlFirstMissDraftGateEvidence.reduce(
      (sum, entry) => sum + (entry.liveAiLines?.length ?? 0),
      0,
    ) + urlFirstMissDraftFlowEvidence.reduce(
      (sum, entry) => sum + (entry.liveAiLines?.length ?? 0),
      0,
    ),
    urlFirstMissDraftGateEvidence,
    urlFirstStartDateInputVisibleCount: urlFirst.filter((record) => record.markers?.urlFirst?.startDateInput?.visible).length,
    urlFirstStartDateInputMarkers: urlFirst
      .map((record) => ({
        route: record.route,
        state: record.urlFirstState,
        ...(record.markers?.urlFirst?.startDateInput ?? {}),
      }))
      .filter((entry) => entry.testId),
    dateAnchorLabelByFlow: Array.from(new Set(urlFirstDateAnchorEvidence.map((entry) => entry.label).filter(Boolean))),
    urlFirstDateAnchorLabelEvidence: urlFirstDateAnchorEvidence,
    myFlowAnchorEditEntryVisible: myFlowDateAnchorEvidence.some((entry) => entry.anchorEditEntryVisible),
    myFlowAnchorEditLabels: Array.from(new Set(myFlowDateAnchorEvidence.map((entry) => entry.anchorEditLabel).filter(Boolean))),
    myFlowAnchorSettingsOpenLabels: Array.from(new Set(myFlowDateAnchorEvidence.flatMap((entry) => entry.anchorSettingsOpenLabels).filter(Boolean))).slice(0, 5),
    myFlowAnchorSettingsOpenAccessibleNameSamples: Array.from(new Set(myFlowDateAnchorEvidence.flatMap((entry) => entry.anchorSettingsOpenAccessibleNameSample).filter(Boolean))).slice(0, 5),
    myFlowAnchorEditEvidence: myFlowDateAnchorEvidence,
    itemDateOverrideLabels: Array.from(new Set(myFlowDateAnchorEvidence.map((entry) => entry.itemDateOverrideLabel).filter(Boolean))),
    anchorVsItemOverrideCopyPresent: myFlowDateAnchorEvidence.some((entry) => entry.anchorVsItemOverrideCopyPresent),
    myFlowItemEditEntryVisible: myFlowDateAnchorEvidence.some((entry) => entry.itemEditEntryVisible),
    myFlowItemEditAccessibleNameSamples: Array.from(new Set(myFlowDateAnchorEvidence.flatMap((entry) => entry.itemEditAccessibleNameSample).filter(Boolean))).slice(0, 5),
    editEntryVisibleByViewport: myFlowDateAnchorEvidence.reduce((acc, entry) => {
      const viewportKey = String(entry.viewportWidth ?? viewport.width);
      const current = acc[viewportKey] ?? { anchor: 0, item: 0 };
      acc[viewportKey] = {
        anchor: current.anchor + (entry.anchorEditEntryVisible || entry.anchorSettingsOpenVisible ? 1 : 0),
        item: current.item + (entry.itemEditEntryVisible ? 1 : 0),
      };
      return acc;
    }, {}),
    draftFlowMyFlowLandingVisible: draftFlowEvidence.some((entry) => entry.landingVisible),
    draftFlowEditEntryVisible: draftFlowEvidence.some((entry) => entry.editEntryVisible),
    draftFlowAnchorEditVisibleByViewport: draftFlowEvidence.reduce((acc, entry) => {
      const viewportKey = String(entry.viewportWidth ?? viewport.width);
      acc[viewportKey] = (acc[viewportKey] ?? 0) + (entry.anchorEditVisible ? 1 : 0);
      return acc;
    }, {}),
    draftFlowItemEditEntryVisible: draftFlowEvidence.some((entry) => entry.itemEditEntryVisible),
    draftFlowAnchorOverrideConflictPolicyVisible: draftFlowEvidence.some((entry) => entry.anchorOverrideConflictPolicyVisible),
    draftFlowCalendarProjectionUpdated: draftFlowEvidence.some((entry) => entry.calendarProjectionUpdated),
    draftFlowExportProjectionUpdated: draftFlowEvidence.some((entry) => entry.exportProjectionUpdated),
    draftFlowEvidence,
    urlFirstMarkerVisibleCount: urlFirst.filter((record) => record.markers?.urlFirst?.resultVisible || record.markers?.urlFirst?.candidateListVisible).length,
    prototypeReleasePreviewRouteCount: releasePreviewPrototypes.length,
    prototypeReleasePreviewGuardrailHitCount: releasePreviewPrototypes.reduce(
      (sum, record) => sum + countPrototypeSurfaceGuardrailHits(record),
      0,
    ),
    prototypeReleasePreviewUnexpectedGuardrailHitCount: releasePreviewPrototypes.reduce(
      (sum, record) => sum + countUnexpectedPrototypeTierHits(record),
      0,
    ),
    prototypeInternalConsoleRouteCount: internalConsolePrototypes.length,
    prototypeInternalConsoleGuardrailHitCount: internalConsolePrototypes.reduce(
      (sum, record) => sum + countPrototypeSurfaceGuardrailHits(record),
      0,
    ),
    prototypeInternalConsoleAllowedDisplayGateHitCount: internalConsolePrototypes.reduce(
      (sum, record) => sum + countPrototypeSurfaceGuardrailHits(record),
      0,
    ),
    prototypeInternalConsoleUnexpectedGuardrailHitCount: internalConsolePrototypes.reduce(
      (sum, record) => sum + countUnexpectedPrototypeTierHits(record),
      0,
    ),
    prototypeInternalConsoleContextVisibleCount: internalConsolePrototypes.filter((record) =>
      Boolean(record.markers?.flowLabInternalConsoleContextVisible),
    ).length,
    flowLabPrototypeRouteCount: flowLab.length,
    flowLabPrototypeTier: flowLab[0]?.prototypeTier ?? null,
    flowLabPrototypeTierPolicy: flowLab[0]?.prototypeTierPolicy ?? null,
    flowLabPrototypeBucket: flowLab.length > 0 && flowLab.every((record) => record.prototypeBucket),
    flowLabPrototypeGuardrailHitCount: flowLab.reduce((sum, record) => sum + countPrototypeDisplayGateHits(record), 0),
    flowLabPrototypeAllowedDisplayGateHitCount: flowLab.reduce((sum, record) => sum + countPrototypeSurfaceGuardrailHits(record), 0),
    flowLabPrototypeUnexpectedGuardrailHitCount: flowLab.reduce((sum, record) => sum + countUnexpectedPrototypeTierHits(record), 0),
    flowLabPrototypeNoindex: flowLab.length > 0 && flowLab.every((record) => /noindex/i.test(record.markers?.metaRobots ?? '')),
    flowLabPrototypeMetaRobots: flowLab.map((record) => ({
      route: record.url,
      metaRobots: record.markers?.metaRobots ?? '',
    })),
    flowLabPrototypeInternalConsoleContextVisible: flowLab.length > 0 && flowLab.every((record) =>
      Boolean(record.markers?.flowLabInternalConsoleContextVisible),
    ),
    flowLabPrototypeLinkedFromUserNavCount: normal.reduce((sum, record) => sum + (record.markers?.flowLabPrototypeLinkCount ?? 0), 0),
    manualRegistrationQaUserLinkCount: normal.reduce((sum, record) => sum + (record.markers?.manualRegistrationQaLinkCount ?? 0), 0),
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
    publicWorkbenchStickyFirstActionCount: publicShareRoutes.filter((record) =>
      Boolean(record.markers.publicWorkbenchExportLabels?.stickyFirstAction),
    ).length,
    publicWorkbenchStickyFirstActionSaveOrSetupCount: publicShareRoutes.filter((record) =>
      Boolean(record.markers.publicWorkbenchExportLabels?.stickyFirstActionSaveOrSetup),
    ).length,
    publicFlowFlowLevelSavePrimaryCount: publicShareRoutes.filter((record) =>
      record.primarySaveActionVisible || record.markers.publicPrimarySetupVisible,
    ).length,
    publicFlowExportSingleSecondaryEntryCount: publicShareRoutes.filter((record) =>
      (record.markers.publicWorkbenchExportLabels?.flowLevelSecondaryEntryCount ?? 0) === 1,
    ).length,
    publicFlowExportFormatOptionCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.flowLevelFormatOptionCount ?? 0),
    0),
    publicFlowItemLevelExportLikeLabelCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.itemLevelExportLikeLabelCount ?? 0),
    0),
    publicPreSaveCheckboxCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.preSaveCheckboxCount ?? 0),
    0),
    publicPreSaveCheckboxCompletionLikeLabelCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.preSaveCheckboxCompletionLikeLabelCount ?? 0),
    0),
    publicPreSaveCheckboxPreviewLabelCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.preSaveCheckboxPreviewLabelCount ?? 0),
    0),
    publicFlowPreSaveItemCheckboxPreviewCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.preSaveItemCheckboxPreviewCount ?? 0),
    0),
    publicFlowPreSavePreviewControlCount: publicShareRoutes.reduce((sum, record) =>
      sum + (record.markers.publicWorkbenchExportLabels?.preSavePreviewControlCount ?? 0),
    0),
    publicPostSaveCompletionControlVisible: publicPostSaveRecords.length > 0
      && publicPostSaveRecords.every((record) => Boolean(record.markers?.publicPostSaveCompletionBoundary?.visible)),
    publicPostSaveCompletionControlPattern: publicPostSaveRecords.length === 0
      ? 'none'
      : (
          publicPostSaveRecords.every((record) => record.markers?.publicPostSaveCompletionBoundary?.pattern === 'checkbox')
            ? 'checkbox'
            : publicPostSaveRecords.map((record) => record.markers?.publicPostSaveCompletionBoundary?.pattern ?? 'none').join(',')
        ),
    publicPostSaveCompletionControlActive: publicPostSaveRecords.length > 0
      && publicPostSaveRecords.every((record) => Boolean(record.markers?.publicPostSaveCompletionBoundary?.active)),
    publicPostSaveCompletionCheckboxCount: publicPostSaveRecords.reduce((sum, record) =>
      sum + (record.markers?.publicPostSaveCompletionBoundary?.checkboxCount ?? 0),
    0),
    publicPostSaveCompletionActiveCheckboxCount: publicPostSaveRecords.reduce((sum, record) =>
      sum + (record.markers?.publicPostSaveCompletionBoundary?.activeCheckboxCount ?? 0),
    0),
    publicPostSaveCompletionButtonCount: publicPostSaveRecords.reduce((sum, record) =>
      sum + (record.markers?.publicPostSaveCompletionBoundary?.buttonCount ?? 0),
    0),
    publicPostSaveCompletionEvidence: publicPostSaveRecords.map((record) => ({
      id: record.id,
      route: record.url,
      originSlug: record.publicPostSaveOriginSlug ?? record.markers?.publicPostSaveCompletionBoundary?.originSlug ?? '',
      viewportWidth: record.viewportWidth,
      visible: Boolean(record.markers?.publicPostSaveCompletionBoundary?.visible),
      pattern: record.markers?.publicPostSaveCompletionBoundary?.pattern ?? 'none',
      active: Boolean(record.markers?.publicPostSaveCompletionBoundary?.active),
      checkboxCount: record.markers?.publicPostSaveCompletionBoundary?.checkboxCount ?? 0,
      activeCheckboxCount: record.markers?.publicPostSaveCompletionBoundary?.activeCheckboxCount ?? 0,
      buttonCount: record.markers?.publicPostSaveCompletionBoundary?.buttonCount ?? 0,
      checkboxSamples: record.markers?.publicPostSaveCompletionBoundary?.checkboxSamples ?? [],
      buttonSamples: record.markers?.publicPostSaveCompletionBoundary?.buttonSamples ?? [],
    })),
    publicWorkbenchStickyFirstActionNonPrimaryLabels: publicShareRoutes
      .filter((record) =>
        record.markers.publicWorkbenchExportLabels?.stickyFirstAction
        && !record.markers.publicWorkbenchExportLabels?.stickyFirstActionSaveOrSetup,
      )
      .map((record) => ({
        route: record.url,
        label: record.markers.publicWorkbenchExportLabels.stickyFirstAction.visibleLabel,
        testId: record.markers.publicWorkbenchExportLabels.stickyFirstAction.testId,
      })),
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
  return `# FlowMe Claude Design ${reviewPackageTitle}

- Generated: ${evidence.generatedAt}
- Branch: \`${branchName}\`
- UI baseline commit: \`${evidence.uiBaselineCommit}\`
- Package generated from commit: \`${evidence.packageGeneratedFromCommit}\`
- Package commit ref: \`${evidence.packageCommitRef}\`
- Viewport: ${viewport.width}x${viewport.height}
- Wide viewport spot check: ${wideViewport.width}x${wideViewport.height}

This package freezes the P7-01 to P7-05 UX/UI baselines with P7-06 guardrails, the P8-01 generalized scan rules, the P8-02 restart/prototype promotion gate, the P8-03/P8-04 My Flow overdue label/status corrections, the P8-05/P8-06/P8-08 evidence/package metadata cleanup, the P8-07 restart date-display decision, the P8-09 field-checklist source-density rule, and the P8-10/P9-02 public share CTA/tab-order rule.

It also keeps the P9-01 to P9-07 coverage closed: data-driven guardrail coverage, accessible public browse-link ordering, My Flow structural-copy cleanup, source-slug punctuation scanning, restart/prototype English UI gate expansion, restart D-30 milestone grouping, and direct guardrail helper unit tests.

For P10, this package closes P10-01 to P10-07: guardrail/capture canonicalization, public share primary save/setup path evidence, actionable My Flow continuation, Calendar agenda group-header density, shorter visible control labels with accessible names, GitHub link-base cleanup, and visible-text/input-value raw ISO separation.

For P10-07 specifically, the scan separates raw ISO visible text from raw ISO input values. Native \`input[type=date]\` ISO values are treated as technical browser control values and recorded in an explicit exemption bucket; non-date input values with raw ISO remain guardrail hits.

P11-02 adds JSON-level evidence markers for the P10-03/P10-04/P10-05 claims: \`continuationActionable\`, \`agendaGroupMeta\`, and \`rowControlAccessibleNames\`. Claude Design can now judge the continuation row, Calendar/My Flow group metadata, and short visible labels with preserved accessible names from \`route-evidence.json\` without relying only on screenshots.

P11-04/P11-09 reduce My Flow inventory metric noise. Each saved-content row exposes one primary progress label, and the mobile all-tab header avoids large total remaining-count copy. The capture output records \`inventoryProgressMetrics\` and \`inventoryHeaderMetrics\` so duplicate progress metrics and large remaining-count headers can be judged from JSON markers.

P11-05/P11-06 keep the capture pipeline aligned with the canonical guardrail library and make native date input exemptions traceable by test id. P11-07/P11-10 keep fridge/washer setup paths measurable and allow the fridge first-action title to wrap to two lines on mobile. P11-08/P11-11 lower repeated field-checklist detail caution copy and extend public workbench export-label evidence so duplicate visible export entry points are caught.

P12-01~P12-04 add the URL-first first-execution slice to the normal user-route guardrail set. The package captures hit, custom-start, miss, and saved-candidate states on \`/flows\` and records URL-first-specific buckets for internal copy, dynamic source slug, structural title, raw ISO text, and input raw ISO hits. These scenarios should remain at zero while preserving canonical lookup, source-backed reuse, and non-executable local candidate storage.

P12-05/P12-10 keep \`/flow-lab/url-first-p0\` and source-backed manual registration QA outside the normal user route set. P13-03 splits the old prototype bucket into two tiers: \`/restart/moving-d30\` is a release-preview route that must keep display-gate hits at zero before promotion, while \`/flow-lab/url-first-p0\` is an internal-console route where lab labels are allowed only inside the noindex, non-nav-linked console.

P13-04/P13-07 make URL-first evidence reproducible as a state-by-control matrix. Hit and custom-start scenarios now record export-mode scan rows for calendar/markdown/checklist, all URL-first states record their trigger URL, and the candidate detail scenario records both expanded-request evidence and the resolved-hit candidate branch.

P13-05/P13-06 add a wide-viewport spot-check slice and a measured post-save confirmation signal. The package records >=768px captures for core routes and confirms \`/my?savedMap=...\` shows a short saved confirmation without repeating the first task title.

P14-05/P14-06 soften URL-first candidate/miss/hit copy that was technically clean but operational in tone. The package now records old mechanism-copy hits, value-focused mechanism-copy hits, legacy candidate system-copy hits, and user-tone candidate copy hits so Claude Design can judge the wording from JSON as well as screenshots.

P18-01 adds a same-date multi-Flow Calendar fixture. The selected date agenda records Flow marker groups, the month grid records visible Flow labels, and the summary exposes \`calendarSameDateDistinctFlowGroupCount\`, \`calendarSameDateGridDistinctFlowLabelCount\`, and \`calendarAgendaGroupByFlow\` so Calendar Flow identity can be judged without relying only on screenshots.

P18-02 merges My Flow's today execution/status framing. The package records \`myFlowTodayFrameCount\`, \`myFlowTodayRemainingCountSourceCount\`, \`myFlowTodayInlineCompleteControlCount\`, \`myFlowTodayOpenBeforeCompleteRequired\`, and \`myFlowTodayGenericMetaChipCount\` so Claude Design can verify that today's work has one count source and can be completed inline without opening detail first.

P18-03 separates public share save/export/item units. Sticky public \`/f\` actions remain save/setup-first, export is recorded as one Flow-level secondary entry with format options, and item-level export-like labels are counted separately so they stay at 0.

P18-04/P18-06 separate Calendar and My Flow role language. Calendar should read as the date-first execution surface, My Flow as the task-first execution hub, and \`calendarMyFlowRoleLabels\` records role copy plus primary generic label counts for Calendar cards/groups and My Flow compact rows.

P18-04/P18-06 separate Calendar and My Flow role language. Calendar is measured as a date-first execution surface, My Flow as a task-first execution hub, and the summary records whether primary labels fall back to generic type copy such as \`월간 일정\`, \`저장한 일정\`, or \`일정 흐름\`.

P18-07 makes the URL-first and My Flow date anchor copy contextual. The summary records URL-first date-anchor labels, My Flow anchor edit-entry labels, item-level date override labels, and whether the copy distinguishes whole-Flow anchor changes from one-item date overrides.

P18-08 keeps URL-first miss as a draft-preparation gate instead of implying live AI generation. The miss state records a visible draft-gate entry, the CTA label, whether copy implies live AI, and the candidate user-copy output guardrail count so the future AI draft path can be judged before real API integration.

P19-01 keeps Calendar mobile agenda rows readable after same-date multi-Flow grouping. Row-level date, timing, Flow, and progress metadata stay at zero; Flow identity stays in the group header/marker, and each row keeps the task title, completion checkbox, and short open action.

P19-02 keeps task completion controls unified around a row-left checkbox pattern. Open remains the detail/navigation action, while detail-level checklist checkboxes and public share pre-save preview checkboxes are tracked outside the task-completion-control bucket.

P19-03 clarifies progress metrics in My Flow and Calendar. Whole-Flow progress uses contextual whole-Flow labels, routine counters use routine-item labels, detail checklists use checklist-context labels, and Today/Calendar rows avoid row-level whole-Flow progress chips.

P19-06 makes the Home URL/memo entry discoverable without adding a second lookup implementation. The Home primary entry points to \`/flows\`, uses explicit URL/memo copy, and records its label, destination, viewport visibility, and whether it remains above the first fold.

P19-07 keeps the post-save editing model discoverable without moving full editing into URL-first. My Flow personal copies expose Flow-wide anchor/name editing as a contextual button such as \`이사일·이름 바꾸기\`, item detail edit entries expose title/date/memo editing with row-title accessible names, and the evidence records anchor-vs-item edit entry visibility by viewport.

P20-05 keeps the Calendar month grid compact when three or more Flows land on the same date. The grid records visible Flow labels plus an overflow summary such as \`외 N개\`, while the selected-day agenda still records every Flow marker/group as full detail.

P21-01 replaces the one-placeholder miss draft with three to seven deterministic action suggestions and projects their anchor-relative dates into My Flow, Calendar, and export without implying live AI generation. P21-03 closes the remaining normal/wide structural display hits.

P21-04 records the draft lifecycle as a state matrix: save failure with preserved input, canonical duplicate reuse, empty My Flow/Calendar recovery, completed-zero state, and already-open offline local action. P21-04B adds only the minimal failure and duplicate recovery needed to avoid data-loss or duplicate-draft dead ends.

P21-05 keeps the Home URL/memo separator explicit and adds a stable one-character Flow identity marker to the two compact Calendar labels, while preserving the P20 two-label plus overflow-summary policy and full selected-day agenda.

## Files

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [prompt-ko.md](./prompt-ko.md)
- [screenshots/](./screenshots/)
- [P21 AI draft gate spec](${githubBase}/docs/specs/2026-07-11-url-first-ai-draft-gate/spec.md)

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
- Normal route agenda/status repeated timing meta rows: ${evidence.summary.normalRouteAgendaGroupRepeatedTimingMetaRowCount}
- Calendar mobile agenda row count: ${evidence.summary.calendarMobileAgendaRowCount}
- Calendar mobile agenda dense row count: ${evidence.summary.calendarMobileAgendaDenseRowCount}
- Calendar mobile agenda row date meta count: ${evidence.summary.calendarMobileAgendaRowDateMetaCount}
- Calendar mobile agenda row timing meta count: ${evidence.summary.calendarMobileAgendaRowTimingMetaCount}
- Calendar mobile agenda row Flow meta count: ${evidence.summary.calendarMobileAgendaRowFlowMetaCount}
- Calendar mobile agenda row progress meta count: ${evidence.summary.calendarMobileAgendaRowProgressMetaCount}
- Calendar mobile agenda open-label rows: ${evidence.summary.calendarMobileAgendaOpenLabelRowCount}
- Calendar same-date distinct Flow groups: ${evidence.summary.calendarSameDateDistinctFlowGroupCount}
- Calendar same-date grid Flow labels: ${evidence.summary.calendarSameDateGridDistinctFlowLabelCount}
- Calendar agenda grouped by Flow: ${evidence.summary.calendarAgendaGroupByFlow ? 'yes' : 'no'}
- Calendar grid same-date Flow count: ${evidence.summary.calendarGridSameDateFlowCount}
- Calendar grid visible Flow labels: ${evidence.summary.calendarGridVisibleFlowLabelCount}
- Calendar grid distinct visible marker identities: ${evidence.summary.calendarGridDistinctVisibleMarkerIdentityCount}
- Calendar grid overflow summary visible: ${evidence.summary.calendarGridOverflowSummaryVisible ? 'yes' : 'no'}
- Calendar grid hidden Flow summary count: ${evidence.summary.calendarGridHiddenFlowSummaryCount}
- Calendar grid horizontal overflow count: ${evidence.summary.calendarGridHorizontalOverflowCount}
- Calendar selected-day agenda shows all Flows: ${evidence.summary.calendarSelectedDayAgendaShowsAllFlows ? 'yes' : 'no'}
- Calendar title contains My Flow count: ${evidence.summary.calendarTitleContainsMyFlowCount}
- Calendar primary generic type label count: ${evidence.summary.calendarPrimaryGenericTypeLabelCount}
- Calendar heading duplicate count: ${evidence.summary.calendarHeadingDuplicateCount}
- My Flow primary generic flow label count: ${evidence.summary.myFlowPrimaryGenericFlowLabelCount}
- Calendar date-first role copy present: ${evidence.summary.calendarTaskRoleCopyPresent ? 'yes' : 'no'}
- My Flow task-first role copy present: ${evidence.summary.myFlowTaskRoleCopyPresent ? 'yes' : 'no'}
- My Flow today frame count: ${evidence.summary.myFlowTodayFrameCount}
- My Flow today remaining-count sources: ${evidence.summary.myFlowTodayRemainingCountSourceCount}
- My Flow today inline complete controls: ${evidence.summary.myFlowTodayInlineCompleteControlCount}
- My Flow today open-before-complete required: ${evidence.summary.myFlowTodayOpenBeforeCompleteRequired}
- My Flow today generic meta chips: ${evidence.summary.myFlowTodayGenericMetaChipCount}
- Progress metric ambiguous count: ${evidence.summary.progressMetricAmbiguousCount}
- Progress metric contextual label count: ${evidence.summary.progressMetricContextLabelCount}
- Row-level Flow progress chip count: ${evidence.summary.rowLevelFlowProgressChipCount}
- Detail checklist progress label count: ${evidence.summary.detailChecklistProgressLabelCount}
- Today remaining-count visible count: ${evidence.summary.todayRemainingCountVisible}
- Calendar selected-day remaining-count visible count: ${evidence.summary.calendarSelectedDayRemainingCountVisible}
- Date anchor labels by Flow: ${JSON.stringify(evidence.summary.dateAnchorLabelByFlow)}
- Home URL-first entry visible: ${evidence.summary.homeUrlFirstEntryVisible ? 'yes' : 'no'}
- Home URL-first entry labels: ${JSON.stringify(evidence.summary.homeUrlFirstEntryLabel)}
- Home URL-first entry destination: ${JSON.stringify(evidence.summary.homeUrlFirstEntryDestination)}
- Home URL-first entry above fold: ${evidence.summary.homeUrlFirstEntryAboveFold ? 'yes' : 'no'}
- Home memo entry visible: ${evidence.summary.homeMemoEntryVisible ? 'yes' : 'no'}
- Home primary entry competes with recommendations: ${evidence.summary.homePrimaryEntryCompetesWithRecommendations ? 'yes' : 'no'}
- Home URL-first entry separator present: ${evidence.summary.homeUrlFirstEntrySeparatorPresent ? 'yes' : 'no'}
- Home URL-first concatenated-label hits: ${evidence.summary.homeUrlFirstEntryConcatenatedLabelCount}
- Draft lifecycle scenario count: ${evidence.summary.draftLifecycleScenarioCount}
- Draft save-failure captured: ${evidence.summary.draftSaveFailureScenarioCaptured ? 'yes' : 'no'}
- Draft save-failure recovery visible: ${evidence.summary.draftSaveFailureRecoveryVisible ? 'yes' : 'no'}
- Draft save-failure input preserved: ${evidence.summary.draftSaveFailureInputPreserved ? 'yes' : 'no'}
- Draft duplicate captured: ${evidence.summary.draftDuplicateScenarioCaptured ? 'yes' : 'no'}
- Draft duplicate creates extra saved Flow: ${evidence.summary.draftDuplicateCreatesExtraSavedFlow ? 'yes' : 'no'}
- Draft duplicate recovery visible: ${evidence.summary.draftDuplicateRecoveryVisible ? 'yes' : 'no'}
- Draft empty My Flow/Calendar captured: ${evidence.summary.draftEmptyStateCaptured ? 'yes' : 'no'}
- Draft completed-zero captured: ${evidence.summary.draftCompletedZeroStateCaptured ? 'yes' : 'no'}
- Draft completed remaining count: ${evidence.summary.draftCompletedRemainingCount}
- Draft offline captured: ${evidence.summary.draftOfflineScenarioCaptured ? 'yes' : 'no'}
- Draft offline local actions available: ${evidence.summary.draftOfflineLocalActionsAvailable ? 'yes' : 'no'}
- Draft lifecycle internal hits: ${evidence.summary.draftLifecycleInternalHitCount}
- Draft lifecycle horizontal overflow count: ${evidence.summary.draftLifecycleHorizontalOverflowCount}
- My Flow anchor edit entry visible: ${evidence.summary.myFlowAnchorEditEntryVisible ? 'yes' : 'no'}
- My Flow anchor settings open labels: ${JSON.stringify(evidence.summary.myFlowAnchorSettingsOpenLabels)}
- My Flow anchor settings open accessible names: ${JSON.stringify(evidence.summary.myFlowAnchorSettingsOpenAccessibleNameSamples)}
- My Flow anchor edit labels: ${JSON.stringify(evidence.summary.myFlowAnchorEditLabels)}
- Item date override labels: ${JSON.stringify(evidence.summary.itemDateOverrideLabels)}
- Anchor vs item override copy present: ${evidence.summary.anchorVsItemOverrideCopyPresent ? 'yes' : 'no'}
- My Flow item edit entry visible: ${evidence.summary.myFlowItemEditEntryVisible ? 'yes' : 'no'}
- My Flow item edit accessible names: ${JSON.stringify(evidence.summary.myFlowItemEditAccessibleNameSamples)}
- Edit entry visible by viewport: ${JSON.stringify(evidence.summary.editEntryVisibleByViewport)}
- Draft Flow My Flow landing visible: ${evidence.summary.draftFlowMyFlowLandingVisible ? 'yes' : 'no'}
- Draft Flow edit entry visible: ${evidence.summary.draftFlowEditEntryVisible ? 'yes' : 'no'}
- Draft Flow anchor edit visible by viewport: ${JSON.stringify(evidence.summary.draftFlowAnchorEditVisibleByViewport)}
- Draft Flow item edit entry visible: ${evidence.summary.draftFlowItemEditEntryVisible ? 'yes' : 'no'}
- Draft Flow anchor/override policy visible: ${evidence.summary.draftFlowAnchorOverrideConflictPolicyVisible ? 'yes' : 'no'}
- Draft Flow Calendar projection updated: ${evidence.summary.draftFlowCalendarProjectionUpdated ? 'yes' : 'no'}
- Draft Flow export projection updated: ${evidence.summary.draftFlowExportProjectionUpdated ? 'yes' : 'no'}
- Normal route row control accessible name samples: ${evidence.summary.normalRouteRowControlAccessibleNameSampleCount}
- Normal route row control samples with context: ${evidence.summary.normalRouteRowControlAccessibleNameContextCount}
- Wide viewport evidence count: ${evidence.summary.wideViewportEvidenceCount}
- Wide viewport width: ${evidence.summary.wideViewportWidth}
- Wide viewport horizontal overflow count: ${evidence.summary.wideViewportHorizontalOverflowCount}
- Wide layout route count: ${evidence.summary.wideLayoutRouteCount}
- Wide layout primary CTA visible count: ${evidence.summary.wideLayoutPrimaryCtaVisibleCount}
- Wide layout My Flow visible Flow finding link max: ${evidence.summary.wideLayoutMyFlowVisibleFlowFindingLinkMax}
- Wide home recommendation width ratio min: ${evidence.summary.wideLayoutHomeRecommendationWidthRatioMin}
- Wide viewport guardrail route count: ${evidence.summary.wideViewportGuardrailRouteCount}
- Wide viewport internal copy hits: ${evidence.summary.wideViewportInternalHitCount}
- Wide viewport source slug hits: ${evidence.summary.wideViewportSourceSlugHitCount}
- Wide viewport raw ISO hits: ${evidence.summary.wideViewportRawIsoHitCount}
- Wide viewport visible Markdown hits: ${evidence.summary.wideViewportVisibleMarkdownHitCount}
- Wide viewport candidate copy internal hits: ${evidence.summary.wideViewportCandidateCopyInternalHitCount}
- Wide viewport URL-first states captured: ${JSON.stringify(evidence.summary.wideViewportUrlFirstStatesCaptured)}
- Wide viewport routes captured: ${JSON.stringify(evidence.summary.wideViewportRoutesCaptured)}
- Studio nav destination: ${evidence.summary.studioNavDestination ?? '-'}
- Studio nav destination tier: ${evidence.summary.studioNavDestinationTier ?? '-'}
- Studio entry visible by viewport: ${JSON.stringify(evidence.summary.studioEntryVisibleByViewport)}
- Studio entry reachable by viewport: ${JSON.stringify(evidence.summary.studioEntryReachableByViewport)}
- Studio entry policy: ${evidence.summary.studioEntryPolicy}
- Studio entry unexpected route count: ${evidence.summary.studioEntryUnexpectedRouteCount}
- Creator profile route count: ${evidence.summary.creatorProfileRouteCount}
- Creator profile viewport widths: ${JSON.stringify(evidence.summary.creatorProfileViewportWidths)}
- Creator profile tier: ${evidence.summary.creatorProfileTier}
- Creator profile guardrail hits: ${evidence.summary.creatorProfileGuardrailHitCount}
- Creator profile filled route count: ${evidence.summary.creatorProfileFilledRouteCount}
- Creator profile empty route count: ${evidence.summary.creatorProfileEmptyRouteCount}
- Creator profile content card count: ${evidence.summary.creatorProfileContentCardCount}
- Creator profile draft tab visible: ${evidence.summary.creatorProfileDraftTabVisible ? 'yes' : 'no'}
- Creator profile draft content card count: ${evidence.summary.creatorProfileDraftContentCardCount}
- Creator profile URL-first draft card count: ${evidence.summary.creatorProfileUrlFirstDraftCardCount}
- Creator profile draft edit path visible: ${evidence.summary.creatorProfileDraftEditPathVisible ? 'yes' : 'no'}
- Creator profile draft edit destinations: ${JSON.stringify(evidence.summary.creatorProfileDraftEditDestinations)}
- Creator profile policy: ${evidence.summary.creatorProfilePolicy}
- User nav leak scan route count: ${evidence.summary.userNavLeakScanRouteCount}
- User nav leak scan viewports: ${JSON.stringify(evidence.summary.userNavLeakScanViewports)}
- Flow-lab user nav links by viewport: ${JSON.stringify(evidence.summary.flowLabPrototypeLinkedFromUserNavCountByViewport)}
- Manual QA user links by viewport: ${JSON.stringify(evidence.summary.manualRegistrationQaUserLinkCountByViewport)}
- Post-save confirmation visible: ${evidence.summary.postSaveConfirmationVisible}
- Post-save confirmation text: ${JSON.stringify(evidence.summary.postSaveConfirmationText)}
- Post-save confirmation repeats first task title: ${evidence.summary.postSaveConfirmationRepeatsFirstTaskTitle}
- URL-first normal scenarios captured: ${evidence.summary.urlFirstScenarioCount}
- URL-first states captured: ${JSON.stringify(evidence.summary.urlFirstStatesCaptured)}
- URL-first scenario trigger URL count: ${evidence.summary.urlFirstScenarioTriggerUrlCount}
- URL-first internal copy hits: ${evidence.summary.urlFirstNormalInternalHitCount}
- URL-first source slug hits: ${evidence.summary.urlFirstNormalSourceSlugHitCount}
- URL-first structural/trailing title hits: ${evidence.summary.urlFirstNormalStructuralDisplayHitCount}
- URL-first raw ISO hits: ${evidence.summary.urlFirstNormalRawIsoHitCount}
- URL-first input raw ISO hits: ${evidence.summary.urlFirstNormalInputRawIsoHitCount}
- URL-first native date input raw ISO exemptions: ${evidence.summary.urlFirstNormalInputRawIsoExemptCount}
- URL-first visible Markdown hits: ${evidence.summary.urlFirstVisibleMarkdownHitCount}
- URL-first old mechanism-copy hits: ${evidence.summary.urlFirstMechanismCopyOldHitCount}
- URL-first value mechanism-copy hits: ${evidence.summary.urlFirstMechanismCopyValueHitCount}
- URL-first export mode evidence count: ${evidence.summary.urlFirstExportModeEvidenceCount}
- URL-first export mode scanned count: ${evidence.summary.urlFirstExportModeScannedCount}
- URL-first export mode visible Markdown hits: ${evidence.summary.urlFirstExportModeVisibleMarkdownHitCount}
- URL-first candidate user-copy evidence count: ${evidence.summary.urlFirstCandidateUserCopyEvidenceCount}
- URL-first candidate user-copy internal hits: ${evidence.summary.urlFirstCandidateUserCopyInternalHitCount}
- URL-first candidate legacy system-copy hits: ${evidence.summary.urlFirstCandidateLegacySystemCopyHitCount}
- URL-first candidate user-tone copy hits: ${evidence.summary.urlFirstCandidateUserToneCopyHitCount}
- URL-first candidate card text scanned: ${evidence.summary.urlFirstCandidateCardTextScanned}
- URL-first candidate card legacy status hits: ${evidence.summary.urlFirstCandidateCardLegacyStatusHitCount}
- URL-first candidate internal handoff preserved: ${evidence.summary.urlFirstCandidateInternalHandoffPreserved}
- URL-first candidate expanded detail captured: ${evidence.summary.urlFirstCandidateExpandedDetailCaptured}
- URL-first candidate resolved-hit scenario captured: ${evidence.summary.urlFirstCandidateResolvedHitScenarioCaptured}
- URL-first candidate resolved-hit scenario status: ${evidence.summary.urlFirstCandidateResolvedHitScenarioStatus}
- URL-first miss draft gate visible: ${evidence.summary.urlFirstMissDraftGateVisible ? 'yes' : 'no'}
- URL-first miss draft CTA label: ${evidence.summary.urlFirstMissDraftCtaLabel}
- URL-first miss draft in-app entry visible: ${evidence.summary.urlFirstMissDraftEntryVisible ? 'yes' : 'no'}
- URL-first miss draft editable item count: ${evidence.summary.urlFirstMissDraftEditableItemCount}
- URL-first miss draft suggested item count: ${evidence.summary.urlFirstMissDraftSuggestedItemCount}
- URL-first miss draft dates from anchor: ${evidence.summary.urlFirstMissDraftStepDatesFromAnchor ? 'yes' : 'no'}
- URL-first miss draft save path visible: ${evidence.summary.urlFirstMissDraftSavePathVisible ? 'yes' : 'no'}
- URL-first miss draft internal hits: ${evidence.summary.urlFirstMissDraftInternalHitCount}
- URL-first miss draft implies live AI: ${evidence.summary.urlFirstMissDraftImpliesLiveAi ? 'yes' : 'no'}
- URL-first miss draft live-AI copy hits: ${evidence.summary.urlFirstMissDraftLiveAiHitCount}
- URL-first miss/candidate user-copy internal hits: ${evidence.summary.urlFirstMissCandidateCopyInternalHitCount}
- URL-first start date input visible count: ${evidence.summary.urlFirstStartDateInputVisibleCount}
- URL-first visible marker count: ${evidence.summary.urlFirstMarkerVisibleCount}
- Prototype release-preview route count: ${evidence.summary.prototypeReleasePreviewRouteCount}
- Prototype release-preview guardrail hits: ${evidence.summary.prototypeReleasePreviewGuardrailHitCount}
- Prototype internal-console route count: ${evidence.summary.prototypeInternalConsoleRouteCount}
- Prototype internal-console guardrail hits: ${evidence.summary.prototypeInternalConsoleGuardrailHitCount}
- Prototype internal-console allowed display-gate hits: ${evidence.summary.prototypeInternalConsoleAllowedDisplayGateHitCount}
- Prototype internal-console unexpected guardrail hits: ${evidence.summary.prototypeInternalConsoleUnexpectedGuardrailHitCount}
- Prototype internal-console context visible count: ${evidence.summary.prototypeInternalConsoleContextVisibleCount}
- Flow-lab prototype route count: ${evidence.summary.flowLabPrototypeRouteCount}
- Flow-lab prototype tier: ${evidence.summary.flowLabPrototypeTier}
- Flow-lab prototype bucket: ${evidence.summary.flowLabPrototypeBucket}
- Flow-lab prototype noindex: ${evidence.summary.flowLabPrototypeNoindex}
- Flow-lab prototype linked from user nav count: ${evidence.summary.flowLabPrototypeLinkedFromUserNavCount}
- Flow-lab prototype display-gate hit count: ${evidence.summary.flowLabPrototypeGuardrailHitCount}
- Flow-lab prototype allowed display-gate hit count: ${evidence.summary.flowLabPrototypeAllowedDisplayGateHitCount}
- Flow-lab prototype unexpected guardrail hit count: ${evidence.summary.flowLabPrototypeUnexpectedGuardrailHitCount}
- Flow-lab prototype internal-console context visible: ${evidence.summary.flowLabPrototypeInternalConsoleContextVisible}
- Manual registration QA user route link count: ${evidence.summary.manualRegistrationQaUserLinkCount}
- Normal route queue label scope: ${evidence.summary.normalRouteQueueLabelScope}
- Normal route legacy overdue label hits: ${evidence.summary.normalRouteLegacyOverdueLabelCount}
- Normal route horizontal overflow count: ${evidence.summary.normalRouteHorizontalOverflowCount}
- Field workbench row-detail source link count: ${evidence.summary.fieldWorkbenchRowDetailSourceLinkCount}
- Field workbench source access link count: ${evidence.summary.fieldWorkbenchSourceAccessLinkCount}
- Field workbench repeated detail caution count: ${evidence.summary.fieldWorkbenchRepeatedDetailSentenceCount}
- Public workbench duplicate export visible-label count: ${evidence.summary.publicWorkbenchDuplicateExportVisibleLabelCount}
- Public workbench sticky first-action count: ${evidence.summary.publicWorkbenchStickyFirstActionCount}
- Public workbench sticky first-action save/setup count: ${evidence.summary.publicWorkbenchStickyFirstActionSaveOrSetupCount}
- Public workbench sticky first-action non-primary labels: ${evidence.summary.publicWorkbenchStickyFirstActionNonPrimaryLabels.length}
- Public pre-save checkbox count: ${evidence.summary.publicPreSaveCheckboxCount}
- Public pre-save completion-like checkbox label count: ${evidence.summary.publicPreSaveCheckboxCompletionLikeLabelCount}
- Public pre-save preview checkbox label count: ${evidence.summary.publicPreSaveCheckboxPreviewLabelCount}
- Public post-save completion control visible: ${evidence.summary.publicPostSaveCompletionControlVisible ? 'yes' : 'no'}
- Public post-save completion control pattern: ${evidence.summary.publicPostSaveCompletionControlPattern}
- Public post-save completion control active: ${evidence.summary.publicPostSaveCompletionControlActive ? 'yes' : 'no'}
- Public post-save completion checkbox count: ${evidence.summary.publicPostSaveCompletionCheckboxCount}
- Public post-save completion button count: ${evidence.summary.publicPostSaveCompletionButtonCount}
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

  return `# Claude Design ${reviewPackageTitle} Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. P8-01 generalizes the same guardrails for new seed/source/route additions, P8-02 expands the restart/prototype promotion gate, P8-03/P8-04 fix My Flow overdue labeling/status accuracy, P8-05/P8-06/P8-08 clean up evidence duplication, label-count scope, and commit metadata, P8-07 confirms the \`/restart/moving-d30\` first-three-row date repetition as an intentional D-30 milestone group rather than a date-distribution bug, P8-09 lowers repeated row-level source links in field checklist workbenches, and P8-10/P9-02 keeps public share browse navigation accessible but after the primary save/input path. P9-01 to P9-07 then close the remaining guardrail coverage, accessibility ordering, structural-copy, punctuation, prototype gate, restart grouping, and guardrail-unit-test gaps.

P10-01 to P10-07 close the current review loop: capture uses the canonical \`user-surface-guardrails.ts\` rules, public share workbenches expose a visible/focusable primary save/setup path, My Flow continuation cards remain actionable, Calendar same-day agenda metadata is grouped, repeated visible control labels stay short while aria labels retain context, GitHub package links use the correct base, and raw ISO input values are separated from visible text. This does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

P10-07 extends the same evidence gate to input values: visible text raw ISO remains a failure, non-date input values with raw ISO remain a failure, and native \`input[type=date]\` values are recorded separately as technical browser control exemptions.

P11-02 keeps the UI unchanged and strengthens the evidence layer. The capture output now records \`continuationActionable\`, \`agendaGroupMeta\`, and \`rowControlAccessibleNames\` so P10-03/P10-04/P10-05 can be reviewed from JSON markers as well as screenshots. Calendar agenda groups and My Flow status-sheet groups use the same marker shape.

P11-04/P11-09 lower My Flow inventory density without changing progress calculations. Inventory rows keep a single visible progress label, the mobile all-tab header avoids large total remaining-count copy, and \`inventoryProgressMetrics\`/\`inventoryHeaderMetrics\` markers make those claims auditable from JSON.

P11-05/P11-06 keep capture/evidence rules centralized and traceable: internal-copy scans use the canonical guardrail helper, the browser context is Korean locale/Asia-Seoul timezone, and date inputs carry stable test ids for native raw ISO exemption evidence. P11-07/P11-10 keep fridge/washer setup paths visible and measurable, and the fridge first-action title can wrap to two lines. P11-08/P11-11 move repeated field-checklist caution copy into a common note and record public workbench export visible-label duplication as JSON evidence.

P12-01~P12-04 bring URL-first hit/custom-start/miss/candidate states into the normal user-route capture schema. The same guardrail buckets now cover \`/flows\` URL-first user surfaces, including source slug leakage such as \`Mathbang\`, raw ISO dates in candidate cards, production-only copy such as \`Canonical URL\`/\`handoff\`, and roadmap/queue/pipeline wording such as \`P0\`, \`대기열\`, or \`파이프라인\`.

P12-05/P12-10 keep \`/flow-lab/url-first-p0\` and source-backed manual registration QA outside the normal user route set. P13-03 makes the prototype bucket policy explicit: \`/restart/moving-d30\` is release-preview and must keep user-display gate hits at zero, while \`/flow-lab/url-first-p0\` is internal-console and may show lab labels only inside a noindex route with zero normal-route links.

P13-04/P13-07 make URL-first evidence reproducible as a state-by-control matrix. Hit and custom-start scenarios now record export-mode scan rows for calendar/markdown/checklist, all URL-first states record their trigger URL, and the candidate detail scenario records both expanded-request evidence and the resolved-hit candidate branch.

P13-05/P13-06 add wide viewport spot checks and a post-save confirmation marker. P14-03 extends that evidence with wide-layout sanity markers for primary CTA visibility, visible Flow-finding link count, and home recommendation card width ratio. The audit records the wide-route list, wide overflow count, and whether the saved confirmation repeats the first task title.

P14-05/P14-06 replace URL-first candidate/miss/hit wording that sounded like system operation copy with user-value copy. The audit records old mechanism-copy hits, value-focused mechanism-copy hits, legacy candidate system-copy hits, and user-tone candidate copy hits so this low-level copy polish is measurable without relying only on screenshots.

P15-01/P15-02 add the creator-profile destination behind the My Flow \`스튜디오\` link to the evidence set. \`/u/my-flow-studio\` is captured at 390px and 1024px as a user-facing secondary surface outside the 4-tab IA, normal user-surface guardrails are applied to that route, and \`studioEntryVisibleByViewport\`/\`studioEntryReachableByViewport\` record the mobile/wide entry policy.

P15-03 scans URL-first candidate resolved card headline/status/body text directly. Legacy state-machine wording such as \`기존 콘텐츠로 닫힌 상태\` or \`실행 가능한 ... 후보\` is measured as candidate card legacy status hits, separate from the internal production handoff bucket.

P18-01 adds a same-date multi-Flow Calendar fixture. The selected date agenda records Flow marker groups, the month grid records visible Flow labels, and the summary exposes \`calendarSameDateDistinctFlowGroupCount\`, \`calendarSameDateGridDistinctFlowLabelCount\`, and \`calendarAgendaGroupByFlow\` so Calendar Flow identity can be judged without relying only on screenshots.

P18-02 merges My Flow's today execution/status framing. The package records \`myFlowTodayFrameCount\`, \`myFlowTodayRemainingCountSourceCount\`, \`myFlowTodayInlineCompleteControlCount\`, \`myFlowTodayOpenBeforeCompleteRequired\`, and \`myFlowTodayGenericMetaChipCount\` so Claude Design can verify that today's work has one count source and can be completed inline without opening detail first.

P18-03 keeps public share \`/f\` save/export/item responsibilities auditable. The summary records Flow-level save primary count, one secondary export entry per public share route, export format option count, item-level export-like label count, and pre-save preview control counts.

P20-04 closes the public share pre-save to post-save boundary. Public \`/f\` keeps pre-save item checkboxes in the preview/selection bucket, and a representative saved public Flow is captured after entering My Flow so the same content shows an active task-completion checkbox pattern instead of an item-level save/export affordance.

P20-05 keeps the Calendar month grid compact when three or more Flows share one date. The grid should show at most two Flow labels plus an \`외 N개\` summary, while selected-day agenda groups still expose every Flow and task with markers.

P18-04/P18-06 separate Calendar and My Flow role language. Calendar should read as the date-first execution surface, My Flow as the task-first execution hub, and primary labels should not fall back to generic type copy such as \`월간 일정\`, \`저장한 일정\`, or \`일정 흐름\`.

P18-07 makes URL-first and My Flow date-anchor copy contextual. The evidence records URL-first date-anchor labels, My Flow anchor edit-entry labels, item-level date override labels, and whether the copy distinguishes whole-Flow anchor changes from one-item date overrides.

P18-08 frames URL-first miss as a draft-preparation request without pretending that live AI generation already exists. The miss state should show a visible draft gate and a clear CTA, while \`urlFirstMissDraftImpliesLiveAi\` and \`urlFirstMissCandidateCopyInternalHitCount\` stay at zero.

P19-01 keeps Calendar mobile agenda rows readable after same-date multi-Flow grouping. Row-level date, timing, Flow, and progress metadata stay at zero while the group header owns Flow identity and the row keeps title, completion checkbox, and \`열기\`.

P19-02 keeps task completion controls unified around row-left checkboxes, with sub-checklists measured separately from task completion.

P19-03 clarifies progress metrics in My Flow and Calendar. Whole-Flow progress must include \`전체\`, routine counters must include \`반복 항목\`, detail checklist counters must include \`확인 항목\` or \`개념 항목\`, and row-level Flow progress chips must stay at zero.

P21-01/P21-03 keep the miss draft useful and user-facing: deterministic title/memo parsing produces at least three dated suggestions, no live-AI claim is made, and normal/wide structural display hits remain zero.

P21-04/P21-04B close the draft lifecycle evidence gap. The audit distinguishes save failure, duplicate reuse, empty My Flow/Calendar, completed-zero, and already-open offline local action. Save failure keeps the editor input visible, and canonical duplicate save offers the existing My Flow draft instead of creating another one.

P21-05 records the Home separator and Calendar compact marker hierarchy. The Home label must not concatenate Flow finding and link-paste copy, and each of the two visible Calendar grid labels keeps a stable Flow key plus one-character marker while the overflow summary and full agenda remain unchanged.

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
- P12-05/P12-10/P13-03: \`/restart/moving-d30\` and \`/flow-lab/url-first-p0\` stay out of normal navigation, but their prototype tiers are separate. Restart is \`release-preview\` with a zero-hit display gate; flow-lab is \`internal-console\` with noindex, zero user-nav links, visible internal-console context, and allowed lab-label hits.
- P13-04/P13-07: URL-first route evidence records trigger URLs, export-mode scan rows, candidate expanded detail, and the resolved-hit candidate branch so state reproduction does not depend on screenshot interpretation alone.
- P14-05/P14-06: URL-first candidate/miss/hit copy avoids system-operation wording such as \`AI 자동 생성 없이\`, \`사용자 제목/메모\`, and \`마지막 다시 조회\`, while preserving lookup, candidate storage, copy output, and export behavior.

- P18-01/P18-02: Calendar distinguishes same-date multi-Flow work by Flow marker/group, and My Flow today work uses one frame/count source with inline completion before detail opening.
- P18-04/P18-06: Calendar role copy is date-first, My Flow role copy is task-first, and primary Calendar/My Flow labels avoid generic type copy such as \`월간 일정\`, \`저장한 일정\`, and \`일정 흐름\`.
- P19-01/P19-02/P19-03: Calendar mobile rows stay low-density, task completion uses one checkbox pattern, and progress metrics are contextual instead of standalone \`1/5\`-style labels.

## Summary

\`\`\`json
${JSON.stringify(evidence.summary, null, 2)}
\`\`\`

## Scenario Matrix

| ID | Route | Scenario | Width | Internal | Source slug | Raw ISO | Input ISO | Native date input exempt |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
${rows}

## Restart Prototype Bucket

\`/restart/moving-d30\` remains outside the primary 4-tab IA. It is tracked as prototype tier \`release-preview\`, so it must still pass the display gate before any future promotion:

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

## Prototype Tier Split

- release-preview route count: ${evidence.summary.prototypeReleasePreviewRouteCount}
- release-preview guardrail hits: ${evidence.summary.prototypeReleasePreviewGuardrailHitCount}
- release-preview unexpected guardrail hits: ${evidence.summary.prototypeReleasePreviewUnexpectedGuardrailHitCount}
- internal-console route count: ${evidence.summary.prototypeInternalConsoleRouteCount}
- internal-console guardrail hits: ${evidence.summary.prototypeInternalConsoleGuardrailHitCount}
- internal-console allowed display-gate hits: ${evidence.summary.prototypeInternalConsoleAllowedDisplayGateHitCount}
- internal-console unexpected guardrail hits: ${evidence.summary.prototypeInternalConsoleUnexpectedGuardrailHitCount}
- internal-console context visible count: ${evidence.summary.prototypeInternalConsoleContextVisibleCount}

## Flow Lab Internal Console Bucket

\`/flow-lab/url-first-p0\` remains outside the primary 4-tab IA and normal user-route guardrail bucket. It is tracked as prototype tier \`${evidence.summary.flowLabPrototypeTier}\`, where P0/HIT/needs_review/canonical-style lab labels are allowed only because the route is a noindex internal console with no normal user-route links:

- prototype route count: ${evidence.summary.flowLabPrototypeRouteCount}
- prototype tier: ${evidence.summary.flowLabPrototypeTier}
- prototype tier policy: ${JSON.stringify(evidence.summary.flowLabPrototypeTierPolicy)}
- prototype bucket marker: ${evidence.summary.flowLabPrototypeBucket ? 'yes' : 'no'}
- noindex metadata: ${evidence.summary.flowLabPrototypeNoindex ? 'yes' : 'no'}
- meta robots records: ${JSON.stringify(evidence.summary.flowLabPrototypeMetaRobots)}
- display-gate hit count while in prototype bucket: ${evidence.summary.flowLabPrototypeGuardrailHitCount}
- allowed display-gate hit count while in internal console: ${evidence.summary.flowLabPrototypeAllowedDisplayGateHitCount}
- unexpected guardrail hit count: ${evidence.summary.flowLabPrototypeUnexpectedGuardrailHitCount}
- internal-console context visible: ${evidence.summary.flowLabPrototypeInternalConsoleContextVisible ? 'yes' : 'no'}
- links from normal user routes to flow-lab: ${evidence.summary.flowLabPrototypeLinkedFromUserNavCount}
- links from normal user routes to manual registration QA docs: ${evidence.summary.manualRegistrationQaUserLinkCount}

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
  if (reviewCycle === 'P21') {
    return `아래 GitHub 소스/문서/screenshot만 보고 FlowMe P21 마감 상태를 검토해주세요. Vercel이나 로컬 앱을 직접 열 수 없다는 전제로 review package 안의 scenario별 screenshot과 route-evidence.json을 함께 보세요.

제품 전제:
- FlowMe는 URL/메모를 실행 가능한 Flow 초안으로 바꾸고 My Flow와 Calendar, 사용자 도구 export로 이어지는 개인 실행 도구입니다.
- 현재 P21 draft 제안은 실제 AI가 아니라 결정론적 파싱입니다. 실제 AI가 연결됐다고 평가하거나 전제하지 마세요.
- Studio는 5번째 탭이 아니라 draft를 다시 찾는 보조 선반입니다.

검토 기준:
1. P21-01 URL/메모 miss가 한 개 placeholder가 아니라 3~7개의 구체적 실행 항목으로 제안되는지 확인
   - 기준일에서 날짜가 배치되는지
   - 저장 후 제목, 날짜, 메모, 포함 여부를 My Flow에서 수정할 수 있는지
   - Calendar와 export가 같은 수정본을 읽는지
   - 실제 AI처럼 과장하지 않는지
2. P21-03 normal/wide 구조형 사용자 문구 hit가 0인지 확인
3. P21-04 draft lifecycle 5개 그룹을 시나리오별로 검토
   - 저장 실패: 입력 보존과 재시도 안내
   - 중복 draft: 추가 저장물 생성 없이 기존 draft로 이동하는 경로
   - 빈 My Flow/Calendar: 한 가지 Flow 찾기 recovery
   - 전체 완료: 남은 개수 0, 완료 상태, 다시 열 수 있는 완료 취소
   - 오프라인: 이미 열린 My Flow의 로컬 행동 범위만 정직하게 기록하는지
4. P21-02 실제 AI gate spec을 검토
   - source 원본, AI 제안, 사용자 overlay가 구분되는지
   - 사용자 검토 전 자동 저장·발행·완료가 금지되는지
   - 민감 콘텐츠, 실패, timeout, 비용, 개인정보, fallback 정책이 구현 가능하게 정의됐는지
5. P21-05 홈과 Calendar micro-polish가 기능 모델을 흔들지 않는지 확인
   - 홈 Flow 찾기와 링크 붙여넣기 문구가 붙어 읽히지 않는지
   - Calendar grid의 두 visible Flow가 색만이 아니라 글자 마커와 full accessible name으로 구분되는지
   - 3개 이상은 외 N개, selected-day agenda는 full detail인지
6. P18~P20 기준선 회귀 확인
   - 완료 checkbox 1종, 진행 숫자 맥락화, public 저장 전 preview와 저장 후 completion 경계
   - public save/setup-first, URL-first visible Markdown 0, internal copy hit 0, horizontal overflow 0
7. 단순 평가로 끝내지 말고 다음 P22 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- P21 review README: ${githubBase}/docs/content-audit/${packageName}/README.md
- Audit: ${githubBase}/docs/content-audit/${packageName}/audit.md
- Review HTML: ${githubBase}/docs/content-audit/${packageName}/review.html
- Route evidence: ${githubBase}/docs/content-audit/${packageName}/route-evidence.json
- Screenshots: ${githubBase}/docs/content-audit/${packageName}/screenshots
- P21 AI gate spec: ${githubBase}/docs/specs/2026-07-11-url-first-ai-draft-gate/spec.md
- URL-first E2E: ${githubBase}/tests/e2e/url-first-user-surface.spec.ts
- My Flow/Calendar E2E: ${githubBase}/tests/e2e/flow-mvp.spec.ts

현재 marker summary:
${JSON.stringify(evidence.summary, null, 2)}

요청 산출물:
1. P21-01~P21-05 완료/미완료 판정
2. route·persona별 UX 문제
3. Blocking/High/Medium/Low 우선순위
4. 유지해야 할 기준선
5. 실제 AI 도입 go/no-go 판단과 선행 조건
6. 바로 개발 가능한 P22 backlog
7. evidence가 부족한 시나리오
`;
  }
  return `아래 GitHub 소스/문서/screenshot만 보고 FlowMe ${reviewCycle} 마감 상태를 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로 검토해주세요.

검토 기준:
1. P20-01 URL-first miss 상태가 "복사하고 끝"이 아니라 앱 안 초안 Flow 흐름으로 이어지는지 확인
   - 실제 AI API가 연결된 것처럼 과장하지 않는지
   - miss/candidate copy에 내부 제작어가 다시 노출되지 않는지
2. P20-02 초안 Flow가 My Flow에서 자연스럽게 착지하고 수정되는지 확인
   - 기준일/항목 날짜 override/제목 alias/사용자 메모가 My Flow, Calendar, export에 일관되게 반영되는지
   - 모바일 390px과 wide 1024px에서 수정入口가 보이는지
3. P20-03 \`/u/my-flow-studio\` 초안 탭이 URL-first draft의 보조 선반으로만 작동하는지 확인
   - Studio가 5번째 탭으로 승격되지 않았는지
   - draft card의 edit/save path가 My Flow 모델과 이어지는지
4. P20-04 public \`/f/[slug]\` 저장 전 preview 체크와 저장 후 My Flow 완료 체크의 경계가 명확한지 확인
   - 저장 전 체크는 preview/선택으로 읽히는지
   - 저장 후에는 실제 완료 checkbox가 활성화되는지
   - Flow 단위 저장과 Flow 단위 export 위계가 유지되는지
5. P20-05 Calendar 월간 grid에서 같은 날짜 3개 이상 Flow가 compact summary로 보이고, selected-day agenda는 full detail을 유지하는지 확인
   - grid는 최대 2개 Flow label + \`외 N개\` summary인지
   - agenda에서는 모든 Flow group/할 일이 보이는지
   - 모바일/wide horizontal overflow가 없는지
6. P18/P19 기준선이 함께 유지되는지 확인
   - Calendar Flow 구별, My Flow 오늘 실행 통합, 완료 checkbox 1종, 진행 숫자 맥락화
   - Home URL/memo entry, My Flow 수정入口, public share CTA order, workbench source density
   - URL-first visible Markdown 0, candidate user-copy internal hit 0, normal user-route internal hit 0
7. 단순 평가로 끝내지 말고, 필요하면 다음 backlog를 Blocking/High/Medium/Low로 작성

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
  <title>FlowMe ${reviewPackageTitle}</title>
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
    <h1>FlowMe ${reviewPackageTitle}</h1>
    <p class="lead">${reviewCycle === 'P21'
      ? 'P21 결정론적 draft 내용, lifecycle 실패/중복/빈 상태/완료/오프라인, 실제 AI gate, 홈과 Calendar 식별 polish를 390px/1024px scenario로 검토하는 final package입니다.'
      : 'P7/P8/P9/P10 기준선 위에 P11 My Flow와 guardrail 기준을 고정하기 위한 모바일/wide screenshot evidence package입니다.'}</p>
    <p class="meta">UI baseline commit: ${escapeHtml(evidence.uiBaselineCommit)} · Package generated from: ${escapeHtml(evidence.packageGeneratedFromCommit)} · Package commit ref: ${escapeHtml(evidence.packageCommitRef)}</p>
    <section class="summary">
      <div class="stat"><b>${evidence.summary.totalScreenshots}</b><span>screenshots</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInternalHitCount}</b><span>normal internal hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteSourceSlugHitCount}</b><span>normal source slug hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRawIsoHitCount}</b><span>normal raw ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInputRawIsoHitCount}</b><span>normal input ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInputRawIsoExemptCount}</b><span>normal input ISO exempt</span></div>
      <div class="stat"><b>${evidence.summary.homeUrlFirstEntryVisible ? 'yes' : 'no'}</b><span>home URL/memo entry</span></div>
      <div class="stat"><b>${escapeHtml((evidence.summary.homeUrlFirstEntryDestination ?? []).join(', ') || '-')}</b><span>home entry destination</span></div>
      <div class="stat"><b>${evidence.summary.homeUrlFirstEntryAboveFold ? 'yes' : 'no'}</b><span>home entry above fold</span></div>
      <div class="stat"><b>${evidence.summary.homePrimaryEntryCompetesWithRecommendations ? 'yes' : 'no'}</b><span>home entry competes</span></div>
      <div class="stat"><b>${evidence.summary.homeUrlFirstEntrySeparatorPresent ? 'yes' : 'no'}</b><span>home entry separator</span></div>
      <div class="stat"><b>${evidence.summary.homeUrlFirstEntryConcatenatedLabelCount}</b><span>home concatenated hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstScenarioTriggerUrlCount}</b><span>URL-first trigger URLs</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstExportModeScannedCount}</b><span>URL-first mode scans</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstVisibleMarkdownHitCount}</b><span>URL-first Markdown hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMechanismCopyOldHitCount}</b><span>old mechanism copy hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMechanismCopyValueHitCount}</b><span>value copy hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstExportModeVisibleMarkdownHitCount}</b><span>URL-first mode Markdown hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateUserCopyInternalHitCount}</b><span>URL-first copy output hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateLegacySystemCopyHitCount}</b><span>candidate legacy copy hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateUserToneCopyHitCount}</b><span>candidate user-tone copy hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateCardTextScanned ? 'yes' : 'no'}</b><span>candidate card text scanned</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateCardLegacyStatusHitCount}</b><span>candidate card legacy hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateExpandedDetailCaptured ? 'yes' : 'no'}</b><span>candidate detail expanded</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstCandidateResolvedHitScenarioStatus}</b><span>resolved candidate status</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftGateVisible ? 'yes' : 'no'}</b><span>miss draft gate</span></div>
      <div class="stat"><b>${escapeHtml(evidence.summary.urlFirstMissDraftCtaLabel ?? '-')}</b><span>miss draft CTA</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftEntryVisible ? 'yes' : 'no'}</b><span>miss draft entry</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftEditableItemCount}</b><span>miss draft editable items</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftSuggestedItemCount}</b><span>miss draft suggested items</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftStepDatesFromAnchor ? 'yes' : 'no'}</b><span>draft dates from anchor</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftSavePathVisible ? 'yes' : 'no'}</b><span>miss draft save path</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftInternalHitCount}</b><span>miss draft internal hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstMissDraftLiveAiHitCount}</b><span>miss live-AI copy hits</span></div>
      <div class="stat"><b>${evidence.summary.draftLifecycleScenarioCount}</b><span>draft lifecycle groups</span></div>
      <div class="stat"><b>${evidence.summary.draftSaveFailureInputPreserved ? 'yes' : 'no'}</b><span>failure input preserved</span></div>
      <div class="stat"><b>${evidence.summary.draftDuplicateCreatesExtraSavedFlow ? 'yes' : 'no'}</b><span>duplicate creates extra</span></div>
      <div class="stat"><b>${evidence.summary.draftEmptyStateCaptured ? 'yes' : 'no'}</b><span>empty state captured</span></div>
      <div class="stat"><b>${evidence.summary.draftCompletedZeroStateCaptured ? 'yes' : 'no'}</b><span>completed-zero captured</span></div>
      <div class="stat"><b>${evidence.summary.draftOfflineLocalActionsAvailable ? 'yes' : 'no'}</b><span>offline local action</span></div>
      <div class="stat"><b>${evidence.summary.draftLifecycleInternalHitCount}</b><span>lifecycle internal hits</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstNormalInputRawIsoExemptCount}</b><span>URL-first input ISO exempt</span></div>
      <div class="stat"><b>${evidence.summary.urlFirstStartDateInputVisibleCount}</b><span>URL-first date inputs</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteFirstTaskRepetitionHitCount}</b><span>first task repeats</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteContinuationActionableCount}</b><span>continuation actionable</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteContinuationExplanationOnlyCount}</b><span>continuation explanation-only</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteAgendaGroupMetaCount}</b><span>agenda/status groups</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteAgendaGroupRepeatedDateMetaRowCount}</b><span>repeated date meta rows</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteAgendaGroupRepeatedTimingMetaRowCount}</b><span>repeated timing meta rows</span></div>
      <div class="stat"><b>${evidence.summary.calendarMobileAgendaDenseRowCount}</b><span>mobile dense agenda rows</span></div>
      <div class="stat"><b>${evidence.summary.calendarMobileAgendaRowDateMetaCount}</b><span>mobile row date meta</span></div>
      <div class="stat"><b>${evidence.summary.calendarMobileAgendaOpenLabelRowCount}/${evidence.summary.calendarMobileAgendaRowCount}</b><span>mobile agenda open labels</span></div>
      <div class="stat"><b>${evidence.summary.calendarSameDateDistinctFlowGroupCount}</b><span>calendar same-date Flow groups</span></div>
      <div class="stat"><b>${evidence.summary.calendarSameDateGridDistinctFlowLabelCount}</b><span>calendar grid Flow labels</span></div>
      <div class="stat"><b>${evidence.summary.calendarAgendaGroupByFlow ? 'yes' : 'no'}</b><span>calendar grouped by Flow</span></div>
      <div class="stat"><b>${evidence.summary.calendarGridSameDateFlowCount}</b><span>grid stack Flow count</span></div>
      <div class="stat"><b>${evidence.summary.calendarGridVisibleFlowLabelCount}</b><span>grid visible Flow labels</span></div>
      <div class="stat"><b>${evidence.summary.calendarGridDistinctVisibleMarkerIdentityCount}</b><span>grid marker identities</span></div>
      <div class="stat"><b>${evidence.summary.calendarGridOverflowSummaryVisible ? 'yes' : 'no'}</b><span>grid overflow summary</span></div>
      <div class="stat"><b>${evidence.summary.calendarSelectedDayAgendaShowsAllFlows ? 'yes' : 'no'}</b><span>agenda shows all Flows</span></div>
      <div class="stat"><b>${evidence.summary.calendarTitleContainsMyFlowCount}</b><span>calendar title My Flow hits</span></div>
      <div class="stat"><b>${evidence.summary.calendarPrimaryGenericTypeLabelCount}</b><span>calendar generic labels</span></div>
      <div class="stat"><b>${evidence.summary.calendarHeadingDuplicateCount}</b><span>calendar duplicate headings</span></div>
      <div class="stat"><b>${evidence.summary.myFlowPrimaryGenericFlowLabelCount}</b><span>My Flow generic labels</span></div>
      <div class="stat"><b>${evidence.summary.calendarTaskRoleCopyPresent ? 'yes' : 'no'}</b><span>calendar date-first copy</span></div>
      <div class="stat"><b>${evidence.summary.myFlowTaskRoleCopyPresent ? 'yes' : 'no'}</b><span>My Flow task-first copy</span></div>
      <div class="stat"><b>${evidence.summary.myFlowTodayFrameCount}</b><span>My Flow today frames</span></div>
      <div class="stat"><b>${evidence.summary.myFlowTodayRemainingCountSourceCount}</b><span>today count sources</span></div>
      <div class="stat"><b>${evidence.summary.myFlowTodayInlineCompleteControlCount}</b><span>today inline complete</span></div>
      <div class="stat"><b>${evidence.summary.myFlowTodayOpenBeforeCompleteRequired ? 'yes' : 'no'}</b><span>open before complete</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRowControlAccessibleNameSampleCount}</b><span>row control a11y samples</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRowControlAccessibleNameContextCount}</b><span>row control samples with context</span></div>
      <div class="stat"><b>${evidence.summary.wideViewportEvidenceCount}</b><span>wide viewport captures</span></div>
      <div class="stat"><b>${evidence.summary.wideViewportHorizontalOverflowCount}</b><span>wide overflow hits</span></div>
      <div class="stat"><b>${evidence.summary.wideLayoutPrimaryCtaVisibleCount}/${evidence.summary.wideLayoutRouteCount}</b><span>wide primary CTA visible</span></div>
      <div class="stat"><b>${evidence.summary.wideLayoutMyFlowVisibleFlowFindingLinkMax}</b><span>My Flow wide /flows links</span></div>
      <div class="stat"><b>${evidence.summary.wideLayoutHomeRecommendationWidthRatioMin}</b><span>home card width ratio</span></div>
      <div class="stat"><b>${evidence.summary.wideViewportGuardrailRouteCount}</b><span>wide guardrail routes</span></div>
      <div class="stat"><b>${evidence.summary.wideViewportInternalHitCount}</b><span>wide internal hits</span></div>
      <div class="stat"><b>${evidence.summary.wideViewportVisibleMarkdownHitCount}</b><span>wide Markdown hits</span></div>
      <div class="stat"><b>${escapeHtml(evidence.summary.studioNavDestination ?? '-')}</b><span>studio destination</span></div>
      <div class="stat"><b>${escapeHtml(evidence.summary.studioNavDestinationTier ?? '-')}</b><span>studio destination tier</span></div>
      <div class="stat"><b>${evidence.summary.creatorProfileRouteCount}</b><span>creator profile captures</span></div>
      <div class="stat"><b>${evidence.summary.creatorProfileGuardrailHitCount}</b><span>creator profile hits</span></div>
      <div class="stat"><b>${evidence.summary.creatorProfileDraftTabVisible ? 'yes' : 'no'}</b><span>studio draft tab</span></div>
      <div class="stat"><b>${evidence.summary.creatorProfileUrlFirstDraftCardCount}</b><span>URL-first draft cards</span></div>
      <div class="stat"><b>${evidence.summary.creatorProfileDraftEditPathVisible ? 'yes' : 'no'}</b><span>draft edit path</span></div>
      <div class="stat"><b>${escapeHtml(JSON.stringify(evidence.summary.studioEntryReachableByViewport))}</b><span>studio reachable by viewport</span></div>
      <div class="stat"><b>${evidence.summary.userNavLeakScanRouteCount}</b><span>nav leak scan rows</span></div>
      <div class="stat"><b>${evidence.summary.postSaveConfirmationVisible ? 'yes' : 'no'}</b><span>post-save confirmation</span></div>
      <div class="stat"><b>${evidence.summary.postSaveConfirmationRepeatsFirstTaskTitle ? 'yes' : 'no'}</b><span>post-save repeats task</span></div>
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
      <div class="stat"><b>${evidence.summary.prototypeReleasePreviewRouteCount}</b><span>release-preview prototypes</span></div>
      <div class="stat"><b>${evidence.summary.prototypeReleasePreviewGuardrailHitCount}</b><span>release-preview hits</span></div>
      <div class="stat"><b>${evidence.summary.prototypeInternalConsoleRouteCount}</b><span>internal-console prototypes</span></div>
      <div class="stat"><b>${evidence.summary.prototypeInternalConsoleGuardrailHitCount}</b><span>internal-console hits</span></div>
      <div class="stat"><b>${evidence.summary.prototypeInternalConsoleUnexpectedGuardrailHitCount}</b><span>internal-console unexpected hits</span></div>
      <div class="stat"><b>${evidence.summary.flowLabPrototypeRouteCount}</b><span>flow-lab prototype routes</span></div>
      <div class="stat"><b>${escapeHtml(evidence.summary.flowLabPrototypeTier ?? '-')}</b><span>flow-lab tier</span></div>
      <div class="stat"><b>${evidence.summary.flowLabPrototypeNoindex ? 'yes' : 'no'}</b><span>flow-lab noindex</span></div>
      <div class="stat"><b>${evidence.summary.flowLabPrototypeInternalConsoleContextVisible ? 'yes' : 'no'}</b><span>flow-lab context</span></div>
      <div class="stat"><b>${evidence.summary.flowLabPrototypeLinkedFromUserNavCount}</b><span>flow-lab user nav links</span></div>
      <div class="stat"><b>${evidence.summary.manualRegistrationQaUserLinkCount}</b><span>manual QA user links</span></div>
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
