import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageName = '2026-07-09-flowme-product-direction-review-package';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const viewportMobile = { width: 390, height: 844 };
const viewportWide = { width: 1024, height: 768 };
const evidencePort = process.env.FLOWME_PRODUCT_DIRECTION_PORT || '3231';
const baseURL = `http://127.0.0.1:${evidencePort}`;

const now = '2026-05-28T09:00:00+09:00';

const savedFixtures = {
  sameDateCalendar: [
    { slug: 'moving-d30-basic', selectedArtifactMode: 'calendar', anchor: '2026-06-26' },
    { slug: 'computer-skills-d30-study', selectedArtifactMode: 'calendar', anchor: '2026-06-26' },
    { slug: 'home-workout-20min', selectedArtifactMode: 'calendar', anchor: '2026-05-27' },
    { slug: 'baby-food-menu-recipe', selectedArtifactMode: 'sheet', anchor: '2026-05-27' },
  ],
  multiQueue: [
    { slug: 'moving-d30-basic', selectedArtifactMode: 'calendar', anchor: '2026-06-26' },
    { slug: 'computer-skills-d30-study', selectedArtifactMode: 'calendar', anchor: '2026-06-27' },
    { slug: 'used-car-buying-check', selectedArtifactMode: 'checklist' },
  ],
};

const productDirectionScenarios = [
  {
    id: 'first-visit',
    title: '처음 온 사용자',
    routes: ['/', '/flows', '/my', '/calendar'],
    question: 'URL/메모를 실행 가능한 Flow로 바꾸고 My Flow/Calendar로 이어지는 제품 문장이 즉시 읽히는가.',
    userFeedback: '첫 흐름은 이해되지만 Calendar에서 Flow 구분이 약하고 일정 라벨이 일반적이라는 피드백이 있었다.',
    evidenceIds: ['01-home-mobile', '02-flows-mobile', 'pd-calendar-empty-mobile', '32-home-wide', '33-flows-wide'],
  },
  {
    id: 'url-first-hit',
    title: 'URL-first hit 사용자',
    routes: ['/flows'],
    question: '이미 준비된 Flow를 찾고 시작하는 가치가 AI 데모가 아니라 실제 실행 시작으로 보이는가.',
    userFeedback: 'hit 자체는 잘 작동한다. 다만 Step 제외보다 더 높은 수정 자유도가 장기적으로 필요해 보인다.',
    evidenceIds: ['27-url-first-hit-mobile', '28-url-first-custom-start-mobile', '37-url-first-hit-wide'],
  },
  {
    id: 'url-first-miss-candidate',
    title: 'URL-first miss/candidate 사용자',
    routes: ['/flows'],
    question: '준비된 Flow가 없을 때 요청 저장만으로 충분한가, AI 초안 만들기 흐름이 필요한가.',
    userFeedback: 'miss에서는 AI가 초안을 만들고 사용자가 손보는 과정이 필요해 보인다는 피드백이 있었다.',
    evidenceIds: ['29-url-first-miss-candidate-form-mobile', '30-url-first-candidate-detail-mobile', 'pd-url-first-resolved-candidate-mobile', '38-url-first-candidate-detail-wide'],
  },
  {
    id: 'public-share',
    title: 'public /f 공유 진입 사용자',
    routes: ['/f/vehicle-inspection-prep', '/f/moving-d30-basic'],
    question: '공유받은 사용자가 Flow 단위 저장과 Step 단위 export를 혼동하지 않고 주 행동을 고를 수 있는가.',
    userFeedback: '현재 export가 Step 단위처럼 보이며 Flow 단위 저장/export와 Step 단위 export 책임을 다시 고민해야 한다.',
    evidenceIds: ['06-public-vehicle-mobile', 'pd-public-vehicle-export-mobile', 'pd-public-vehicle-bottom-mobile', '07-public-moving-mobile', 'pd-public-moving-export-mobile', '08-public-moving-bottom-mobile', '35-public-vehicle-wide'],
  },
  {
    id: 'my-flow-repeat',
    title: 'My Flow 반복 사용자',
    routes: ['/my?savedMap=moving-d30', '/my?savedMap=middle-school-math-1', '/my'],
    question: '저장 완료, 다음 할 일, 지난/오늘/다음 상태, 열기/체크가 설명보다 먼저 보이는가.',
    userFeedback: '기능은 있으나 오늘 할 일을 확인하고 체크하기까지 depth가 깊어 실서비스 느낌이 약하다는 피드백이 있었다.',
    evidenceIds: ['13-post-save-my-moving-mobile', '15-post-save-my-math-mobile', '16-my-multi-queue-mobile', 'pd-my-today-detail-mobile', '18-my-long-list-top-mobile', '36-post-save-my-moving-wide'],
  },
  {
    id: 'calendar-heavy',
    title: 'Calendar-heavy 사용자',
    routes: ['/calendar'],
    question: 'Calendar가 보관된 데이터가 아니라 오늘/선택일 실행 화면으로 보이고, 여러 Flow/동일 날짜가 구분되는가.',
    userFeedback: 'Calendar는 핵심 실행 화면인데 콘텐츠 종류와 동일 날짜 항목 구분이 부족하다는 피드백이 있었다.',
    evidenceIds: ['pd-calendar-empty-mobile', '14-calendar-after-moving-save-mobile', 'pd-calendar-multi-flow-mobile', 'pd-calendar-multi-flow-wide'],
  },
  {
    id: 'creator-studio',
    title: 'Creator / Studio 방향',
    routes: ['/u/flow-curation-team', '/u/my-flow-studio', '/flow-lab/url-first-p0', '/restart/moving-d30'],
    question: 'Studio/creator를 지금 키울 핵심 축으로 볼지, 개인 실행 도구의 보조 표면으로 둘지 판단한다.',
    userFeedback: 'Studio를 개념만 먼저 볼지, Calendar/My Flow/public export 같은 기본 실행면을 먼저 고칠지 결정이 필요하다.',
    evidenceIds: ['39-creator-profile-my-flow-studio-mobile', '40-creator-profile-my-flow-studio-wide', '41-creator-profile-flow-curation-team-mobile', '42-creator-profile-flow-curation-team-wide', '31-flow-lab-url-first-p0-mobile', '21-restart-moving-top-mobile'],
  },
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  generateBaseEvidencePackage();

  const evidencePath = path.join(outputDir, 'route-evidence.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL,
    viewport: viewportMobile,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const supplementalRecords = [];

  try {
    await page.clock.install({ time: new Date(now) });

    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-calendar-empty-mobile',
      label: 'Calendar empty state before saving any Flow',
      route: '/calendar',
      viewport: viewportMobile,
      scenarioId: 'first-visit',
      scrollPurpose: 'calendar-empty-state',
      setup: resetStorage,
    }));

    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-public-vehicle-export-mobile',
      label: 'Public vehicle Flow export/body area',
      route: '/f/vehicle-inspection-prep',
      viewport: viewportMobile,
      scenarioId: 'public-share',
      scrollPurpose: 'public-flow-export-area',
      setup: resetStorage,
      scroll: () => scrollToFirstVisible(page, [
        '[data-testid="artifact-list-card"]',
        '[data-testid="mobile-artifact-summary-card"]',
        '[data-testid^="mobile-artifact-export-"]',
      ]),
    }));

    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-public-vehicle-bottom-mobile',
      label: 'Public vehicle Flow true bottom and sticky primary',
      route: '/f/vehicle-inspection-prep',
      viewport: viewportMobile,
      scenarioId: 'public-share',
      scrollPurpose: 'public-flow-bottom',
      setup: resetStorage,
      scroll: () => scrollToBottom(page),
    }));

    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-public-moving-export-mobile',
      label: 'Public moving Flow export/body area',
      route: '/f/moving-d30-basic',
      viewport: viewportMobile,
      scenarioId: 'public-share',
      scrollPurpose: 'public-flow-export-area',
      setup: resetStorage,
      scroll: () => scrollToFirstVisible(page, [
        '[data-testid="artifact-calendar-card"]',
        '[data-testid="mobile-artifact-summary-card"]',
        '[data-testid^="mobile-artifact-export-"]',
      ]),
    }));

    await setSavedFlows(page, savedFixtures.multiQueue);
    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-my-today-detail-mobile',
      label: 'My Flow today action detail opened',
      route: '/my',
      viewport: viewportMobile,
      scenarioId: 'my-flow-repeat',
      scrollPurpose: 'today-action-detail-open',
      preserveStorage: true,
      beforeCapture: openFirstTodayAction,
    }));

    await setSavedFlows(page, savedFixtures.sameDateCalendar);
    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-calendar-multi-flow-mobile',
      label: 'Calendar with multiple dated Flows on the selected day',
      route: '/calendar',
      viewport: viewportMobile,
      scenarioId: 'calendar-heavy',
      scrollPurpose: 'calendar-multi-flow-selected-day',
      preserveStorage: true,
    }));

    await setSavedFlows(page, savedFixtures.sameDateCalendar);
    supplementalRecords.push(await captureSupplemental(page, {
      id: 'pd-calendar-multi-flow-wide',
      label: 'Calendar same-day multi-Flow wide viewport',
      route: '/calendar',
      viewport: viewportWide,
      scenarioId: 'calendar-heavy',
      scrollPurpose: 'calendar-multi-flow-selected-day-wide',
      preserveStorage: true,
    }));

    supplementalRecords.push(await captureResolvedCandidate(page));
  } finally {
    await browser.close();
    stopServer(server);
  }

  evidence.scenarios = [...evidence.scenarios, ...supplementalRecords];
  evidence.summary.totalScreenshots = evidence.scenarios.length;
  evidence.summary.productDirectionReview = {
    reviewType: 'P17-00 product-direction',
    scenarioCount: productDirectionScenarios.length,
    supplementalScreenshotCount: supplementalRecords.length,
    mobileScenarioScreenshotCount: evidence.scenarios.filter((record) => record.viewportWidth === 390).length,
    wideScenarioScreenshotCount: evidence.scenarios.filter((record) => record.viewportWidth === 1024).length,
    calendarMultiFlowEvidenceCaptured: evidence.scenarios.some((record) => record.id === 'pd-calendar-multi-flow-mobile'),
    calendarSameDateConcernDocumented: true,
    myFlowTodayDepthEvidenceCaptured: evidence.scenarios.some((record) => record.id === 'pd-my-today-detail-mobile'),
    publicFlowExportUnitConcernDocumented: true,
    urlFirstEditDraftConcernDocumented: true,
    studioDirectionConcernDocumented: true,
  };
  evidence.productDirectionScenarios = productDirectionScenarios.map((scenario) => ({
    ...scenario,
    screenshots: scenario.evidenceIds
      .map((id) => evidence.scenarios.find((record) => record.id === id))
      .filter(Boolean)
      .map((record) => ({
        id: record.id,
        route: record.route,
        screenshot: record.screenshot,
        viewportWidth: record.viewportWidth,
        label: record.label,
      })),
  }));
  evidence.userFeedbackFocus = [
    'Calendar에서 여러 Flow와 동일 날짜 항목이 충분히 구분되는지',
    'My Flow에서 오늘 할 일 확인/체크 depth가 실행 허브답게 낮은지',
    'public /f에서 Flow 단위 저장/export와 Step 단위 export가 혼동되지 않는지',
    'URL-first hit 편집 자유도와 miss AI draft 필요성이 어느 정도인지',
    'Studio/creator를 지금 키울지 보조 표면으로 둘지',
  ];

  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'README.md'), renderReadme(evidence));
  fs.writeFileSync(path.join(outputDir, 'audit.md'), renderAudit(evidence));
  fs.writeFileSync(path.join(outputDir, 'prompt-ko.md'), renderPrompt(evidence));
  fs.writeFileSync(path.join(outputDir, 'review.html'), renderHtml(evidence));

  console.log(`P17 product direction review package generated at ${path.relative(repoRoot, outputDir)}`);
}

function generateBaseEvidencePackage() {
  execFileSync(
    process.execPath,
    [path.join(repoRoot, 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs')],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        FLOWME_EVIDENCE_PACKAGE_NAME: packageName,
        FLOWME_EVIDENCE_REVIEW_CYCLE: 'P17',
        FLOWME_EVIDENCE_NEXT_BACKLOG: 'P18',
        FLOWME_EVIDENCE_CAPTURE_SCRIPT: 'capture-flowme-product-direction-review-package.mjs',
        FLOWME_EVIDENCE_PORT: evidencePort,
      },
    },
  );
}

async function startServer() {
  const serverCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const serverArgs = process.platform === 'win32'
    ? ['/c', 'npm.cmd', 'run', 'start', '--', '-p', evidencePort]
    : ['run', 'start', '--', '-p', evidencePort];
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
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
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

async function captureSupplemental(page, options) {
  await page.setViewportSize(options.viewport);
  if (!options.preserveStorage) {
    await options.setup?.(page);
  }
  await page.goto(options.route);
  await settle(page);
  await options.beforeCapture?.(page);
  await options.scroll?.(page);
  await settle(page);
  return captureCurrent(page, options);
}

async function captureResolvedCandidate(page) {
  await page.setViewportSize(viewportMobile);
  await resetStorage(page);
  await page.goto('/flows');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
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
  return captureCurrent(page, {
    id: 'pd-url-first-resolved-candidate-mobile',
    label: 'URL-first resolved candidate card',
    route: '/flows',
    viewport: viewportMobile,
    scenarioId: 'url-first-miss-candidate',
    scrollPurpose: 'resolved-candidate-card',
  });
}

async function openFirstTodayAction(page) {
  const section = page.getByTestId('my-flow-now-section');
  await section.waitFor({ state: 'visible' });
  const openButton = section.getByRole('button', { name: /열기/ }).first();
  if (await openButton.count()) {
    await openButton.click();
    await settle(page);
  }
}

async function scrollToFirstVisible(page, selectors) {
  await page.evaluate((inputSelectors) => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    for (const selector of inputSelectors) {
      const element = Array.from(document.querySelectorAll(selector)).find(isVisible);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
        return;
      }
    }
  }, selectors);
}

async function scrollToBottom(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

async function captureCurrent(page, options) {
  const file = `${options.id}.png`;
  const screenshotPath = path.join(screenshotsDir, file);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const screenshotBuffer = fs.readFileSync(screenshotPath);
  const pageScan = await scanSupplementalPage(page);
  return {
    id: options.id,
    label: options.label,
    route: options.route,
    url: pageScan.url,
    screenshot: `screenshots/${file}`,
    screenshotBytes: screenshotBuffer.length,
    screenshotHash: crypto.createHash('sha256').update(screenshotBuffer).digest('hex'),
    category: 'product-direction',
    productDirectionScenario: options.scenarioId,
    viewportWidth: options.viewport.width,
    viewportHeight: options.viewport.height,
    scrollPurpose: options.scrollPurpose,
    ...pageScan,
  };
}

async function scanSupplementalPage(page) {
  return page.evaluate(() => {
    const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const visibleTextSample = normalize(document.body.innerText)
      .split(/(?<=요\.|다\.|\.|\n)/)
      .map(normalize)
      .filter(Boolean)
      .slice(0, 18);
    const clickable = Array.from(document.querySelectorAll('a[href],button'))
      .filter(isVisible)
      .map((element) => normalize(element.getAttribute('aria-label') || element.textContent))
      .filter(Boolean)
      .slice(0, 18);
    const exportLabels = Array.from(document.querySelectorAll('[data-testid*="export" i], [data-testid*="download" i]'))
      .filter(isVisible)
      .map((element) => normalize(element.textContent))
      .filter(Boolean)
      .slice(0, 12);
    const calendarGroups = Array.from(document.querySelectorAll('[data-testid="my-flow-selected-date-group"]'))
      .filter(isVisible)
      .map((element) => normalize(element.textContent))
      .slice(0, 8);
    const myFlowDetailVisible = Boolean(document.querySelector('[data-testid="my-flow-item-detail"], [data-testid="my-flow-priority-inline-detail"], [data-testid="my-flow-mobile-structure-inline-detail"]'));
    const path = `${window.location.pathname}${window.location.search}`;
    return {
      url: path,
      h1: normalize(document.querySelector('h1')?.textContent ?? ''),
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
      firstClickableLabels: clickable,
      visibleTextSample,
      productDirectionMarkers: {
        exportLabels,
        calendarGroupCount: calendarGroups.length,
        calendarGroups,
        myFlowDetailVisible,
        studioLinks: Array.from(document.querySelectorAll('a[href^="/u/"]'))
          .filter(isVisible)
          .map((element) => ({
            href: element.getAttribute('href'),
            label: normalize(element.textContent),
          })),
      },
    };
  });
}

function renderReadme(evidence) {
  const summary = evidence.summary;
  return `# FlowMe P17-00 Product Direction Review Package

- Generated: ${evidence.generatedAt}
- Branch: \`${evidence.branchName}\`
- UI baseline commit: \`${evidence.uiBaselineCommit}\`
- Package generated from commit: \`${evidence.packageGeneratedFromCommit}\`
- Review purpose: P1~P16 개선 루프 이후 제품 방향 판단
- Mobile viewport: 390x844
- Wide viewport: 1024x768

이 패키지는 새 기능이나 UI 수정이 아니라, 현재 FlowMe를 Claude Design이 시나리오별로 다시 판단할 수 있게 만든 제품 방향 review package입니다. P12~P16 guardrail/evidence 기준선은 기존 캡처 스크립트로 먼저 재생성했고, 그 위에 사용자 피드백 중심의 Calendar/My Flow/public export/URL-first/Studio 보강 screenshot을 추가했습니다.

## Files

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [prompt-ko.md](./prompt-ko.md)
- [screenshots/](./screenshots/)

## Product Direction Scenarios

${productDirectionScenarios.map((scenario) => `- ${scenario.title}: ${scenario.question}`).join('\n')}

## Key Evidence Summary

- Total screenshots: ${summary.totalScreenshots}
- Product direction scenarios: ${summary.productDirectionReview.scenarioCount}
- Product direction supplemental screenshots: ${summary.productDirectionReview.supplementalScreenshotCount}
- Wide viewport evidence count: ${summary.wideViewportEvidenceCount}
- Normal route guardrail hits: ${summary.normalRouteInternalHitCount + summary.normalRouteSourceSlugHitCount + summary.normalRouteStructuralDisplayHitCount + summary.normalRouteRawIsoHitCount}
- URL-first visible Markdown hits: ${summary.urlFirstVisibleMarkdownHitCount}
- URL-first export mode visible Markdown hits: ${summary.urlFirstExportModeVisibleMarkdownHitCount}
- Candidate user-copy internal hits: ${summary.urlFirstCandidateUserCopyInternalHitCount}
- Candidate card legacy status hits: ${summary.urlFirstCandidateCardLegacyStatusHitCount}
- Creator profile guardrail hits: ${summary.creatorProfileGuardrailHitCount}
- Flow-lab user nav links by viewport: ${JSON.stringify(summary.flowLabPrototypeLinkedFromUserNavCountByViewport)}
- Restart release-preview guardrail hits: ${summary.prototypeReleasePreviewGuardrailHitCount}
- Calendar group repeated timing meta rows: ${summary.normalRouteAgendaGroupRepeatedTimingMetaRowCount}

## Review Focus

1. Calendar가 여러 Flow와 동일 날짜 항목을 충분히 구분하는가.
2. My Flow가 오늘 할 일 확인/체크까지 너무 깊지 않은가.
3. public \`/f\`에서 Flow 단위 저장/export와 Step 단위 export가 혼동되지 않는가.
4. URL-first hit의 수정 자유도와 miss의 AI draft 필요성이 어느 정도인가.
5. Studio/creator는 지금 키울 축인가, 아니면 보조 표면으로 유지해야 하는가.
`;
}

function renderAudit(evidence) {
  return `# FlowMe P17-00 Product Direction Audit

## Purpose

P1~P16 동안 FlowMe는 4탭 IA, URL-first, public share 저장, My Flow 실행 허브, Calendar 실행 화면, creator/studio tier, internal/prototype guardrail을 계속 정리했다. 이번 P17-00은 더 많은 UI polish를 바로 진행하기 전에, 제품 방향 자체를 다시 보는 intake package다.

## Current Product Hypothesis

FlowMe는 당분간 "URL/메모를 실행 가능한 Flow로 바꾸고, My Flow와 Calendar로 이어주는 개인 실행 도구"로 판단한다. Studio/creator는 5번째 탭이 아니라 보조 표면이다.

## User Feedback Reflected

- 전체 흐름 \`/\` -> \`/flows\` -> \`/my\` -> \`/calendar\`는 이해된다.
- Calendar에서 다른 Flow가 색상/라벨로 충분히 구분되지 않는다. 동일 날짜에 여러 항목이 있을 때 판단이 어렵다.
- URL-first hit는 가치가 보인다. 다만 Step 제외보다 더 높은 item/event 수준 편집 자유도가 장기적으로 필요할 수 있다.
- URL-first miss는 요청 저장만으로 끝나기보다 AI 초안 만들기와 사용자 수정 흐름이 필요해 보인다.
- public \`/f\`는 Flow 단위 저장과 Step 단위 export/save 책임이 아직 모호하다.
- My Flow는 기능은 있으나 오늘 할 일을 확인/체크하기까지 depth가 깊어 보인다.
- Calendar는 콘텐츠 종류별 핵심 실행 화면이 될 수 있지만 현재는 부족하다.
- Studio는 지금 키울지, 기본 실행 화면을 먼저 다듬을지 결정해야 한다.

## Scenario Audit

${productDirectionScenarios.map((scenario) => `### ${scenario.title}

- Routes: ${scenario.routes.map((route) => `\`${route}\``).join(', ')}
- 판단 질문: ${scenario.question}
- 사용자 피드백: ${scenario.userFeedback}
- Evidence screenshots: ${scenario.evidenceIds.map((id) => `\`${id}\``).join(', ')}
`).join('\n')}

## Baseline Guardrails Kept

- Normal route internal/source/raw ISO guardrail hits remain 0.
- URL-first visible Markdown and export-mode Markdown hits remain 0.
- Candidate user copy output internal hits remain 0.
- Candidate card legacy status hits remain 0.
- Creator profile guardrail hits remain 0.
- \`/flow-lab/url-first-p0\` remains internal-console with user nav links 0.
- \`/restart/moving-d30\` remains release-preview with display-gate hits 0.
- Calendar/My Flow group repeated timing meta rows remain 0.

## What Claude Design Should Decide

1. P17의 첫 구현 slice를 Calendar 구분/실행성으로 잡을지.
2. My Flow 오늘 할 일 depth 축소를 Calendar보다 먼저 볼지.
3. public \`/f\`의 Flow-level save/export와 Step-level export 단위를 어떻게 나눌지.
4. URL-first miss AI draft와 hit item/event editing을 언제 spec으로 승격할지.
5. Studio/creator를 보조 표면으로 유지할지, creator platform 축으로 키울지.

## Evidence Limits

이 패키지는 localStorage fixture와 screenshot/evidence 기반이다. 실제 사용자 행동 데이터나 서버 계정 상태 검증은 아니다. Calendar 색/구분, My Flow 체크 depth, public export 단위 같은 문제는 Claude Design 평가 이후 별도 구현 목표로 분리해야 한다.
`;
}

function renderPrompt(evidence) {
  const githubBase = `https://github.com/knhbae/flowme2605/blob/${evidence.branchName}`;
  return `아래 내용을 Claude Design에 그대로 붙여넣으세요.

\`\`\`text
FlowMe 최신 GitHub main 기준 소스/문서/screenshot/evidence를 보고 제품 방향을 재검토해주세요.

이번 요청은 단순 UI polish 검토가 아닙니다. P1~P16 개선 루프 이후, FlowMe가 앞으로 어디에 집중해야 하는지 정하기 위한 P17/P18 backlog 산출 요청입니다. Vercel preview를 직접 못 본다는 전제로 GitHub의 review package, route-evidence, screenshot, 문서를 기준으로 판단해주세요.

Review package:
- README: ${githubBase}/docs/content-audit/${packageName}/README.md
- Audit: ${githubBase}/docs/content-audit/${packageName}/audit.md
- Review HTML: ${githubBase}/docs/content-audit/${packageName}/review.html
- Route evidence JSON: ${githubBase}/docs/content-audit/${packageName}/route-evidence.json
- Screenshots: ${githubBase}/docs/content-audit/${packageName}/screenshots

현재 제품 가설:
"FlowMe는 URL/메모를 실행 가능한 Flow로 바꾸고, My Flow와 Calendar로 이어주는 개인 실행 도구다. Studio/creator는 당장은 5번째 탭이 아니라 보조 표면이다."

사용자 피드백 요약:
1. / -> /flows -> /my -> /calendar 흐름은 이해된다.
2. Calendar에서 여러 Flow가 같은 색과 비슷한 라벨로 보여 구분이 약하다. "일정" 같은 일반 라벨도 문제다. 동일 날짜 여러 Flow 항목 처리가 더 필요해 보인다.
3. /flows URL-first hit는 가치가 보인다. 다만 Step 제외만으로는 수정 자유도가 낮아 보이며, 장기적으로 item마다 calendar .ics event 수준의 정보와 수정 가능성이 필요해 보인다.
4. URL-first miss에서는 AI가 초안을 만들고 사용자가 손보는 흐름이 필요해 보인다.
5. Public /f는 저장과 export가 모두 보이지만, 현재는 export가 Step 단위처럼 보여 Flow 단위 저장/export와 Step 단위 export 책임이 모호하다.
6. My Flow는 기능은 있으나 오늘 할 일을 확인/체크하기까지 depth가 깊어 실서비스 실행 허브로는 덜 다듬어진 느낌이다.
7. Calendar도 콘텐츠 종류별 핵심 실행 화면일 수 있는데 현재는 부족하다.
8. Studio/creator를 지금 키울지, 기본 실행 화면을 먼저 고칠지 판단이 필요하다.

시나리오별로 봐주세요:

1. 처음 온 사용자
- /, /flows, /my, /calendar
- "URL/메모 -> 실행 가능한 Flow -> My Flow/Calendar"가 한 문장으로 이해되는지

2. URL-first hit 사용자
- /flows hit result
- Step include/exclude
- export mode calendar/markdown/checklist
- 저장 후 /my
- 기존 Flow를 찾고 시작하는 가치가 보이는지, 수정 자유도가 충분한지

3. URL-first miss/candidate 사용자
- /flows miss
- candidate form/detail/resolved candidate
- 요청 저장만으로 충분한지, AI draft builder가 필요한지

4. Public /f 공유 진입 사용자
- /f/vehicle-inspection-prep
- /f/moving-d30-basic
- 저장 CTA, setup path, export 영역, sticky bottom
- Flow 단위 저장/export와 Step 단위 export가 혼동되지 않는지

5. My Flow 반복 사용자
- /my?savedMap=moving-d30
- /my?savedMap=middle-school-math-1
- /my 다중 큐/긴 목록
- 오늘 할 일을 보고 체크하기까지 depth가 적절한지

6. Calendar-heavy 사용자
- /calendar moving-d30 저장 후
- /calendar 여러 dated Flow 저장 상태
- 같은 날짜 여러 항목
- Flow별 구분, 라벨, grouping, 실행성 판단

7. Creator / Studio
- /u/flow-curation-team
- /u/my-flow-studio
- /restart/moving-d30
- /flow-lab/url-first-p0
- Studio를 지금 키울 축인지, 보조 표면으로 유지할지 판단

산출물을 아래 형식으로 주세요:

1. Executive summary
- 현재 FlowMe의 제품 문장이 화면에서 얼마나 전달되는지
- 개인 실행 도구 vs creator/studio platform 중 어디에 집중해야 하는지

2. Scenario findings
- 각 시나리오별 문제 목록
- 사용자 영향
- 화면/route/screenshot 기준 근거

3. Priority backlog
- Blocking / High / Medium / Low로 분류
- 각 항목은 바로 개발 가능한 목표로 작성
- "왜 지금 해야 하는지"와 "건드리면 안 되는 기준선" 포함

4. Direction decision
- Calendar를 핵심 실행 화면으로 강화할지
- My Flow의 오늘 할 일 depth를 줄일지
- Public /f의 Flow-level vs Step-level export/save 단위를 어떻게 나눌지
- URL-first miss AI draft를 언제 열지
- Studio/creator를 지금 키울지 보류할지

5. Evidence gaps
- 현재 screenshot/route-evidence만으로 부족한 시나리오
- 추가로 찍어야 할 viewport/state/fixture

6. P17/P18 recommendation
- 가장 먼저 할 1개 slice
- 그 다음 2~4개 후속 slice
- 당장 하지 말아야 할 것

주의:
- 내부어(P0, 대기열, 파이프라인, Canonical URL, handoff, source-backed, Step, Item, Markdown 등)가 사용자 화면에 다시 노출되는 제안은 피해주세요.
- 4탭 IA는 유지하는 전제로 봐주세요.
- /flow-lab은 internal-console, /restart는 release-preview, /u/*는 creator-profile tier라는 기존 분리를 유지해주세요.
- 새 기능 제안은 가능하지만, 먼저 제품 방향과 실행 화면 품질 관점에서 우선순위를 정해주세요.
\`\`\`
`;
}

function renderHtml(evidence) {
  const recordsById = new Map(evidence.scenarios.map((record) => [record.id, record]));
  const scenarioSections = productDirectionScenarios.map((scenario) => {
    const cards = scenario.evidenceIds
      .map((id) => recordsById.get(id))
      .filter(Boolean)
      .map((record) => `
        <figure>
          <img src="${escapeHtml(record.screenshot)}" alt="${escapeHtml(record.label)}" loading="lazy">
          <figcaption>
            <b>${escapeHtml(record.id)}</b>
            <span>${escapeHtml(record.label)}</span>
            <code>${escapeHtml(record.route ?? record.url ?? '')}</code>
            <small>${record.viewportWidth}×${record.viewportHeight}</small>
          </figcaption>
        </figure>
      `).join('\n');
    return `
      <section class="scenario" id="${escapeHtml(scenario.id)}">
        <h2>${escapeHtml(scenario.title)}</h2>
        <p class="question">${escapeHtml(scenario.question)}</p>
        <p class="feedback">${escapeHtml(scenario.userFeedback)}</p>
        <div class="shot-grid">${cards}</div>
      </section>
    `;
  }).join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe P17-00 Product Direction Review</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17202a;
      --muted: #5c6875;
      --line: #d8dee7;
      --soft: #f5f7fb;
      --accent: #2457d6;
      --warn: #9a5b00;
      --high: #b42318;
      --ok: #0f766e;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #fff; line-height: 1.55; }
    article { max-width: 1240px; margin: 0 auto; padding: 32px 20px 64px; }
    h1, h2, h3 { margin: 0; line-height: 1.25; letter-spacing: 0; }
    h1 { font-size: 30px; }
    h2 { margin-top: 34px; padding-top: 22px; border-top: 1px solid var(--line); font-size: 22px; }
    p { margin: 10px 0; }
    code { border-radius: 4px; background: #eef2f8; padding: 1px 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .92em; }
    .lead { margin-top: 18px; padding: 16px 18px; border: 1px solid var(--line); background: var(--soft); border-radius: 8px; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
    .stat { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fff; }
    .stat b { display: block; font-size: 22px; }
    .stat span { color: var(--muted); font-size: 13px; }
    .question { font-weight: 700; }
    .feedback { color: var(--muted); }
    .shot-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 14px; align-items: start; }
    figure { margin: 0; border: 1px solid var(--line); border-radius: 8px; background: #fff; overflow: hidden; }
    img { display: block; width: 100%; height: auto; background: #f8fafc; border-bottom: 1px solid var(--line); }
    figcaption { display: grid; gap: 3px; padding: 10px 12px; font-size: 13px; }
    figcaption span, small { color: var(--muted); }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 14px; }
    th, td { border: 1px solid var(--line); padding: 9px 10px; text-align: left; vertical-align: top; }
    th { background: var(--soft); }
    @media (max-width: 920px) {
      article { padding: 24px 14px 48px; }
      .stats, .shot-grid { grid-template-columns: 1fr; }
      h1 { font-size: 25px; }
    }
  </style>
</head>
<body>
<article>
  <h1>FlowMe P17-00 Product Direction Review Package</h1>
  <p class="lead">P1~P16 개선 루프 이후, FlowMe를 "URL/메모를 실행 가능한 Flow로 바꾸고 My Flow/Calendar로 이어주는 개인 실행 도구"로 계속 볼지 판단하기 위한 시나리오별 screenshot/evidence 패키지입니다.</p>
  <div class="stats">
    <div class="stat"><b>${evidence.summary.totalScreenshots}</b><span>screenshots</span></div>
    <div class="stat"><b>${evidence.summary.productDirectionReview.scenarioCount}</b><span>product scenarios</span></div>
    <div class="stat"><b>${evidence.summary.wideViewportEvidenceCount}</b><span>wide baseline captures</span></div>
    <div class="stat"><b>${evidence.summary.urlFirstVisibleMarkdownHitCount}</b><span>URL-first Markdown hits</span></div>
    <div class="stat"><b>${evidence.summary.urlFirstCandidateUserCopyInternalHitCount}</b><span>candidate copy output hits</span></div>
    <div class="stat"><b>${evidence.summary.creatorProfileGuardrailHitCount}</b><span>creator-profile hits</span></div>
    <div class="stat"><b>${evidence.summary.normalRouteAgendaGroupRepeatedTimingMetaRowCount}</b><span>repeated timing meta rows</span></div>
    <div class="stat"><b>${evidence.summary.prototypeReleasePreviewGuardrailHitCount}</b><span>restart release-preview hits</span></div>
  </div>

  <h2>Review Questions</h2>
  <table>
    <thead>
      <tr><th>Area</th><th>Question</th></tr>
    </thead>
    <tbody>
      <tr><td>Calendar</td><td>여러 Flow와 동일 날짜 항목이 사용자가 실행하기 쉽게 구분되는가.</td></tr>
      <tr><td>My Flow</td><td>오늘 할 일을 확인하고 체크하기까지 depth가 실행 허브답게 낮은가.</td></tr>
      <tr><td>Public /f</td><td>Flow 단위 저장/export와 Step 단위 export 책임이 명확한가.</td></tr>
      <tr><td>URL-first</td><td>hit 편집 자유도와 miss AI draft가 언제 필요한가.</td></tr>
      <tr><td>Studio</td><td>creator/studio를 지금 키울 축인지, 보조 표면으로 둘지.</td></tr>
    </tbody>
  </table>

  ${scenarioSections}
</article>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
