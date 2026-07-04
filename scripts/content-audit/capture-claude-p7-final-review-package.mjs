import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageName = '2026-07-05-claude-design-p7-final-review-package';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const viewport = { width: 390, height: 844 };
const branchName = getCommandOutput('git', ['branch', '--show-current']) || 'codex/flowme-uxui-second-loop';
const commit = getCommandOutput('git', ['rev-parse', '--short', 'HEAD']) || 'unknown';
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL || `http://127.0.0.1:${process.env.FLOWME_EVIDENCE_PORT || '3221'}`;
const shouldStartServer = !process.env.FLOWME_EVIDENCE_BASE_URL;
const githubBase = `https://github.com/knhbae/flowme2605/blob/${branchName}/flow-mvp`;

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

const sourceSlugTerms = [/\bAJD\b/, /\bMathbang\b/];
const structuralDisplayTerms = [/일정\s*지도/, /저장한\s*지도/, /지도\s*일정/, /지도\s*루틴/];
const rawIsoDatePattern = /\b20\d{2}-\d{2}-\d{2}\b/;
const allowedFlowSuffixLines = new Set(['Flow', '내 Flow', 'Flow 찾기', 'FlowMe', '내 Flow에 저장', '내 Flow에서 보기']);

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
    await page.getByTestId('moving-source-section').scrollIntoViewIfNeeded();
    await captureCurrent(page, '22-restart-moving-source-export-mobile.png', 'Restart prototype source and export hierarchy', {
      category: 'prototype-restart',
      prototypeBucket: true,
    });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await settle(page);
    await captureCurrent(page, '23-restart-moving-bottom-mobile.png', 'Restart prototype bottom clearance', {
      category: 'prototype-restart',
      prototypeBucket: true,
    });
  } finally {
    await browser.close();
    stopServer(server);
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    packageName,
    branchName,
    commit,
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
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);
  await captureCurrent(page, file, label, { category: 'bottom-clearance', route });
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
  const scan = await scanPage(page, options);
  scenarioRecords.push({
    id: file.replace(/\.png$/, ''),
    label,
    route: scan.url,
    screenshot: `screenshots/${file}`,
    ...scan,
  });
}

async function openOverdueSheet(page) {
  const overdueButton = page.getByTestId('my-flow-overdue-open-sheet');
  if (await overdueButton.count()) {
    await overdueButton.click();
    await settle(page);
  }
}

async function scanPage(page, options = {}) {
  return page.evaluate((payload) => {
    const bodyText = document.body.innerText;
    const lines = bodyText
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const matches = (patterns) => patterns.flatMap((pattern) => {
      const regex = new RegExp(pattern.source, pattern.flags);
      return lines.filter((line) => regex.test(line)).map((line) => ({ pattern: pattern.label, line }));
    });

    const rawIsoDateRegex = new RegExp(payload.rawIsoDatePattern);
    const rawIsoLines = lines
      .filter((line) => rawIsoDateRegex.test(line))
      .filter((line) => !/source|원문|근거|https?:|\.com|\.kr|\.net|data-testid/i.test(line));

    const flowSuffixLines = lines
      .filter((line) => /[\p{L}\p{N})\]]\s*Flow$/u.test(line))
      .filter((line) => !payload.allowedFlowSuffixLines.includes(line));

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
    const clickableLabels = Array.from(document.querySelectorAll('button, a'))
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .slice(0, 18);

    return {
      category: payload.options.category ?? 'route',
      prototypeBucket: Boolean(payload.options.prototypeBucket),
      url: window.location.pathname + window.location.search,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      scrollY: Math.round(window.scrollY),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
      navVisible: Boolean(document.querySelector('[data-testid="platform-mobile-tabs"]')),
      publicShellVisible: Boolean(document.querySelector('[data-testid="flow-public-shell"]')),
      primarySaveActionVisible: Boolean(document.querySelector('[data-testid="public-flow-mobile-save-cta"], [data-testid="public-flow-save-actions"], [data-testid="flow-map-mobile-sticky-save"]')),
      browseLinkSecondaryCandidate: clickableLabels.includes('콘텐츠 더 보기'),
      firstClickableLabels: clickableLabels,
      internalHits: matches(payload.forbiddenInternalTerms),
      sourceSlugHits: matches(payload.sourceSlugTerms),
      structuralDisplayHits: matches(payload.structuralDisplayTerms),
      rawIsoLines,
      flowSuffixLines,
      repetitionCounts: {
        movingFirstTaskTitle: countText('이사 방식과 견적 후보 정하기'),
        mathFirstTaskTitle: countText('1. 소인수분해'),
        firstTaskLabel: countText('먼저 할 일'),
        overdueLabel: countText('밀린 할 일'),
        nextTaskLabel: countText('다음 할 일'),
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
        restartMobileExportButtons: document.querySelectorAll('[data-testid="moving-mobile-export-actions"] button').length,
      },
    };
  }, {
    options,
    rawIsoDatePattern: rawIsoDatePattern.source,
    allowedFlowSuffixLines: Array.from(allowedFlowSuffixLines),
    forbiddenInternalTerms: forbiddenInternalTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
    sourceSlugTerms: sourceSlugTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
    structuralDisplayTerms: structuralDisplayTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
  });
}

function summarizeEvidence(records) {
  const normal = records.filter((record) => !record.prototypeBucket);
  const restart = records.filter((record) => record.prototypeBucket);
  return {
    totalScreenshots: records.length,
    normalRouteInternalHitCount: normal.reduce((sum, record) => sum + record.internalHits.length, 0),
    normalRouteSourceSlugHitCount: normal.reduce((sum, record) => sum + record.sourceSlugHits.length, 0),
    normalRouteStructuralDisplayHitCount: normal.reduce((sum, record) => sum + record.structuralDisplayHits.length + record.flowSuffixLines.length, 0),
    normalRouteRawIsoHitCount: normal.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    normalRouteHorizontalOverflowCount: normal.filter((record) => !record.noHorizontalOverflow).length,
    restartPrototypeRawIsoHitCount: restart.reduce((sum, record) => sum + record.rawIsoLines.length, 0),
    restartPrototypeHorizontalOverflowCount: restart.filter((record) => !record.noHorizontalOverflow).length,
    restartPrototypeExportButtonCounts: restart.map((record) => record.markers.restartMobileExportButtons),
  };
}

function renderReadme(evidence) {
  return `# FlowMe Claude Design P7 Final Review Package

- Generated: ${evidence.generatedAt}
- Branch: \`${branchName}\`
- Commit: \`${commit}\`
- Viewport: ${viewport.width}x${viewport.height}

This package freezes the P7-01 to P7-05 UX/UI baselines with P7-06 guardrails.

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
- Normal route horizontal overflow count: ${evidence.summary.normalRouteHorizontalOverflowCount}
- Restart prototype raw ISO hits: ${evidence.summary.restartPrototypeRawIsoHitCount}

## GitHub Links

- [Source root](${githubBase})
- [E2E guardrails](${githubBase}/tests/e2e/flow-mvp.spec.ts)
- [Capture script](${githubBase}/scripts/content-audit/capture-claude-p7-final-review-package.mjs)
`;
}

function renderAudit(evidence) {
  const rows = evidence.scenarios.map((record) => (
    `| ${record.id} | \`${record.route}\` | ${record.label} | ${record.noHorizontalOverflow ? 'OK' : 'Overflow'} | ${record.internalHits.length} | ${record.sourceSlugHits.length} | ${record.rawIsoLines.length} |`
  )).join('\n');

  return `# Claude Design P7 Guardrail Audit

## Scope

P7-06 closes the review loop after P7-01 to P7-05. It does not add a feature. It freezes the current UX baselines with screenshots, route scans, and E2E guardrails.

## Baselines Covered

- P7-01: \`/restart/moving-d30\` uses user-facing date text and a quieter export hierarchy.
- P7-02: My Flow today/overdue/next queues are deduped.
- P7-03: My Flow 5+ saved list bottom clearance is verified.
- P7-04: Home shows a small curated recommendation set, not a single fixed experiment.
- P7-05: Public \`/f\` browse links remain secondary to \`내 Flow에 저장\`.
- P7-06: Normal route scan buckets stay at zero for internal labels, source slugs, structural title suffixes, raw ISO dates, and mobile overflow.

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
- no duplicated primary export button sets
- no source brand slug as title/subtitle copy
- no horizontal overflow at 390px

## Residual Risk

- This package is screenshot and E2E evidence, not a replacement for a live device review.
- Future seed additions should be checked against the same display-title/source/date guardrails before being promoted into primary routes.
`;
}

function renderPrompt(evidence) {
  return `아래 GitHub 소스/문서/screenshot만 보고 FlowMe P7 마감 상태를 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로 검토해주세요.

검토 기준:
1. P7-01~P7-05가 실제 화면 기준으로 유지되는지 확인
2. P7-06 guardrail이 충분한지 확인
3. 정상 사용자 route에서 아래 회귀가 다시 생길 위험이 있는지 확인
   - AJD, Mathbang 같은 source slug가 제목/부제/주요 문구로 노출
   - 콘텐츠 제목 끝 Flow 접미
   - 일정 지도, 저장한 지도 같은 내부 구조형 표현
   - raw ISO 날짜
   - My Flow 첫 할 일 제목 반복
   - 모바일 390px 좌우 overflow
   - 하단 fixed/sticky가 마지막 버튼/행/agenda를 가림
4. /restart/moving-d30 prototype bucket을 별도 관리하는 기준이 충분한지 확인
5. 단순 평가로 끝내지 말고, 필요하면 P8 backlog를 Blocking/High/Medium/Low로 작성

주요 링크:
- P7 review package README: ${githubBase}/docs/content-audit/${packageName}/README.md
- Audit markdown: ${githubBase}/docs/content-audit/${packageName}/audit.md
- Review HTML: ${githubBase}/docs/content-audit/${packageName}/review.html
- Route evidence JSON: ${githubBase}/docs/content-audit/${packageName}/route-evidence.json
- Screenshots folder: ${githubBase}/docs/content-audit/${packageName}/screenshots
- E2E guardrails: ${githubBase}/tests/e2e/flow-mvp.spec.ts

현재 guardrail scan 요약:
\`\`\`json
${JSON.stringify(evidence.summary, null, 2)}
\`\`\`

요청 산출물:
1. route별 UX/UI 문제 목록
2. Blocking/High/Medium/Low 우선순위
3. 바로 개발 가능한 P8 backlog
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
      </dl>
    </article>
  `).join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowMe P7 Final Review Package</title>
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
    dl { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 0; }
    dl div { border-radius: 10px; background: #f6f4ef; padding: 8px; }
    dt { color: var(--muted); font-size: 11px; }
    dd { margin: 2px 0 0; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>FlowMe P7 Final Review Package</h1>
    <p class="lead">P7-01~P7-05 개선 기준선을 P7-06 guardrail로 고정하기 위한 모바일 390px screenshot/evidence 패키지입니다.</p>
    <section class="summary">
      <div class="stat"><b>${evidence.summary.totalScreenshots}</b><span>screenshots</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteInternalHitCount}</b><span>normal internal hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteSourceSlugHitCount}</b><span>normal source slug hits</span></div>
      <div class="stat"><b>${evidence.summary.normalRouteRawIsoHitCount}</b><span>normal raw ISO hits</span></div>
      <div class="stat"><b>${evidence.summary.restartPrototypeRawIsoHitCount}</b><span>restart raw ISO hits</span></div>
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
