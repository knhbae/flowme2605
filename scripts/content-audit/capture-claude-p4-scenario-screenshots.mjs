import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageName = '2026-07-04-claude-design-p4-final-review-package';
const packageDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(packageDir, 'scenario-screenshots');
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3104';
const viewport = { width: 390, height: 844 };
const branchName = getCommandOutput('git branch --show-current') || 'codex/flowme-uxui-second-loop';
const baselineCommit = getCommandOutput('git rev-parse --short HEAD') || 'unknown';
const githubBase = `https://github.com/knhbae/flowme2605/blob/${branchName}/flow-mvp`;

const internalTerms = [
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
  /\bFlow Map\b/,
  /\bbundle\b/i,
  /\breadiness\b/i,
  /\bStep\b/,
  /\bItem\b/,
];

const scenarioLabels = {
  's01': '처음 온 사용자: 홈에서 Flow 찾기로 이동',
  's02': '날짜 있는 Flow Map 저장: 이사 D-30',
  's03': '공유 링크 공개 Flow 저장: 자동차검사',
  's04': '날짜 없는 Flow Map 저장: 중1 수학',
  's05': '반복 사용자: 여러 콘텐츠 저장 후 My Flow',
  's06': '특수 workbench/export 화면',
};

function getCommandOutput(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: 'utf8' }).trim();
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

async function screenshot(page, records, scenarioId, fileName, title, note) {
  await settle(page);
  const screenshotPath = path.join(screenshotsDir, fileName);
  await page.screenshot({ path: screenshotPath });
  const evidence = await page.evaluate((input) => {
    const bodyText = document.body.innerText;
    const textLines = bodyText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const matchedInternalTerms = input.terms
      .filter((term) => textLines.some((line) => new RegExp(term.source, term.flags).test(line)))
      .map((term) => term.label);
    const allowedFlowSuffixLines = new Set(['Flow', '내 Flow', 'Flow 찾기', 'FlowMe', '내 Flow에 저장', '내 Flow에서 보기']);
    const flowSuffixLines = textLines
      .filter((line) => /[가-힣A-Za-z0-9)\]]\s*Flow$/.test(line))
      .filter((line) => !allowedFlowSuffixLines.has(line))
      .slice(0, 20);
    const buttons = Array.from(document.querySelectorAll('button, a'))
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .slice(0, 12);

    return {
      url: window.location.pathname + window.location.search,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      scrollY: window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      navVisible: Boolean(document.querySelector('[data-testid="platform-mobile-tabs"]')),
      publicShellVisible: Boolean(document.querySelector('[data-testid="flow-public-shell"]')),
      activeMobileTab: document.querySelector('[data-testid="platform-mobile-tabs"] [aria-current="page"]')?.textContent?.trim() ?? '',
      matchedInternalTerms,
      flowSuffixLines,
      visibleActions: buttons,
      markers: {
        homePrimaryFlowCard: Boolean(document.querySelector('[data-testid="home-primary-flow-card"]')),
        catalogCard: Boolean(document.querySelector('[data-testid="flow-map-catalog-card"]')),
        flowMapStickySave: Boolean(document.querySelector('[data-testid="flow-map-mobile-sticky-save"]')),
        publicMobileSaveCta: Boolean(document.querySelector('[data-testid="public-flow-mobile-save-cta"]')),
        mobileExportSheet: Boolean(document.querySelector('[data-testid="mobile-export-sheet"]')),
        postSavePanel: Boolean(document.querySelector('[data-testid="my-flow-post-save-panel"]')),
        myFlowWorkspace: Boolean(document.querySelector('[data-testid="my-flow-workspace"]')),
        myFlowInlineDetail: Boolean(document.querySelector('[data-testid="my-flow-inline-detail"]')),
        calendarCard: Boolean(document.querySelector('[data-testid="my-flow-calendar-card"]')),
        selectedDateGroup: Boolean(document.querySelector('[data-testid="my-flow-selected-date-group"]')),
        artifactWorkbench: Boolean(document.querySelector('[aria-label="Flow artifact workbench"]')),
      },
    };
  }, {
    terms: internalTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
  });
  records.push({
    scenarioId,
    scenario: scenarioLabels[scenarioId],
    title,
    note,
    screenshot: `scenario-screenshots/${fileName}`,
    ...evidence,
  });
}

async function saveMovingMap(page) {
  await resetStorage(page, '/flow-maps/moving-d30');
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
}

async function scenarioHomeToDiscovery(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/');
  await screenshot(page, records, 's01', 's01-01-home-entry.png', '홈 첫 진입', '처음 온 사용자가 핵심 행동과 대표 추천 콘텐츠를 보는 화면');
  await page.getByRole('link', { name: '콘텐츠 고르러 가기' }).click();
  await page.waitForURL('**/flows');
  await screenshot(page, records, 's01', 's01-02-flow-finding-top.png', 'Flow 찾기 상단', '홈 CTA 이후 통합 콘텐츠 목록 상단');
  await page.getByTestId('flow-map-catalog-card').first().scrollIntoViewIfNeeded();
  await screenshot(page, records, 's01', 's01-03-first-content-card.png', '첫 콘텐츠 카드', '카드의 제목, 결과 약속, 먼저 할 일, CTA를 확인');
  await context.close();
}

async function scenarioMovingMapSave(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/flow-maps/moving-d30');
  await screenshot(page, records, 's02', 's02-01-moving-map-before-input.png', '이사 Flow Map 저장 전', '입력, 저장 결과, 먼저 할 일이 한 화면에 보이는지 확인');
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await screenshot(page, records, 's02', 's02-02-moving-map-date-entered.png', '이사일 입력 후', '날짜 입력 후 저장 CTA와 결과 예측이 유지되는지 확인');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  await screenshot(page, records, 's02', 's02-03-post-save-my-flow.png', '저장 후 My Flow', '저장 완료보다 첫 실행 항목이 먼저 보이는지 확인');
  await page.getByTestId('my-flow-post-save-open-first').click();
  await page.getByTestId('my-flow-inline-detail').first().waitFor({ state: 'visible' });
  await screenshot(page, records, 's02', 's02-04-first-task-detail.png', '첫 실행 항목 열기', '체크 항목과 상세/메모가 과하게 노출되지 않는지 확인');
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('my-flow-calendar-card').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-selected-date-group').first().waitFor({ state: 'visible' });
  await screenshot(page, records, 's02', 's02-05-calendar-first-agenda.png', '저장 후 캘린더 첫 agenda', '가장 가까운 일정 agenda가 먼저 보이는지 확인');
  await page.locator('.fc-daygrid-day[data-date="2026-07-22"]').click();
  await page.waitForTimeout(250);
  await screenshot(page, records, 's02', 's02-06-calendar-move-day-selected.png', '이사일 선택', '월간 달력에서 다른 저장 일정으로 이동했을 때 agenda가 이해되는지 확인');
  await context.close();
}

async function scenarioPublicFlowSave(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/f/vehicle-inspection-prep');
  await screenshot(page, records, 's03', 's03-01-public-flow-before-input.png', '공유 Flow 저장 전', '공유 shell과 저장 CTA가 주 행동으로 보이는지 확인');
  await page.locator('input[type="date"]').fill('2026-07-17');
  await screenshot(page, records, 's03', 's03-02-public-flow-date-entered.png', '공유 Flow 날짜 입력', '입력 UI가 한 곳의 주 입력으로 보이는지 확인');
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '내 Flow에 저장' }).click();
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('link', { name: '내 Flow에서 보기' }).waitFor({ state: 'visible' });
  await screenshot(page, records, 's03', 's03-03-public-flow-after-save.png', '공유 Flow 저장 완료', '저장 후 같은 공유 화면에서 다음 이동이 명확한지 확인');
  await page.getByTestId('public-flow-mobile-save-cta').getByRole('link', { name: '내 Flow에서 보기' }).click();
  await page.waitForURL('**/my');
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  await screenshot(page, records, 's03', 's03-04-public-flow-my-flow.png', '공유 Flow 저장 후 My Flow', '공유 shell에서 앱 shell 실행 허브로 이어지는지 확인');
  await context.close();
}

async function scenarioNoDateMapSave(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await resetStorage(page, '/flow-maps/middle-school-math-1');
  await screenshot(page, records, 's04', 's04-01-math-map-before-save.png', '날짜 없는 콘텐츠 저장 전', '기준일 없이도 저장할 콘텐츠와 첫 행동을 이해할 수 있는지 확인');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=middle-school-math-1');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await screenshot(page, records, 's04', 's04-02-math-post-save-my-flow.png', '날짜 없는 콘텐츠 저장 후', '빈 상태 대신 첫 실행 항목이 보이는지 확인');
  await page.getByTestId('my-flow-post-save-open-first').click();
  await page.getByTestId('my-flow-inline-detail').first().waitFor({ state: 'visible' });
  await screenshot(page, records, 's04', 's04-03-math-first-task-open.png', '날짜 없는 콘텐츠 첫 항목 열기', '진도/체크 실행 구조가 바로 보이는지 확인');
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
  await screenshot(page, records, 's05', 's05-01-multiple-post-save.png', '여러 콘텐츠 저장 후 진입', '방금 저장한 콘텐츠의 첫 실행 항목과 기존 저장 항목이 충돌하지 않는지 확인');
  const allButton = page.getByRole('button', { name: '전체' }).first();
  if (await allButton.count()) {
    await allButton.click();
    await page.waitForTimeout(250);
  }
  await screenshot(page, records, 's05', 's05-02-my-flow-all-content.png', 'My Flow 전체 보기', '반복 사용자가 저장 콘텐츠와 다음 할 일을 빠르게 구분하는지 확인');
  await context.close();
}

async function scenarioWorkbenchAndExport(browser, records) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();

  await resetStorage(page, '/f/moving-d30-basic');
  await page.locator('input[type="date"]').first().fill('2026-07-22');
  await screenshot(page, records, 's06', 's06-01-export-first-moving.png', 'export-first 공개 화면', '이사일 입력 후 캘린더/시트 결과를 예측할 수 있는지 확인');
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.getByTestId('mobile-export-bar').waitFor({ state: 'visible' });
  await page.getByTestId('mobile-export-bar').getByRole('button').click();
  await page.getByTestId('mobile-export-sheet').waitFor({ state: 'visible' });
  await screenshot(page, records, 's06', 's06-02-mobile-export-sheet.png', '모바일 export 선택지', '캘린더 파일/시트/메모 결과 라벨이 예측 가능한지 확인');

  await resetStorage(page, '/f/baby-food-menu-recipe');
  await page.locator('input[type="date"]').first().fill('2026-06-01');
  await page.getByTestId('artifact-calendar-card').first().scrollIntoViewIfNeeded();
  await screenshot(page, records, 's06', 's06-03-baby-food-menu-calendar.png', '이유식 메뉴 캘린더', '시작일 기준 식단표와 원문 기준이 보조 정보로 정리되는지 확인');

  await resetStorage(page, '/f/fridge-cleanout-weekly-plan');
  await page.getByTestId('artifact-log-table-spreadsheet').scrollIntoViewIfNeeded();
  await screenshot(page, records, 's06', 's06-04-fridge-sheet-workbench.png', '냉장고 파먹기 시트', 'sheet형 실행 화면이 주요 카드 톤과 맞는지 확인');

  await resetStorage(page, '/f/real-thankyou-bubu-home-workout-starter');
  await page.getByTestId('exact-video-source-bridge').scrollIntoViewIfNeeded();
  await screenshot(page, records, 's06', 's06-05-home-workout-source-result.png', '정확한 영상 source/result', '영상 근거와 실행 결과 카드가 조용한 보조 위계인지 확인');

  await resetStorage(page, '/f/washer-tub-clean-monthly');
  await page.getByTestId('maintenance-routine-next-card').scrollIntoViewIfNeeded();
  await screenshot(page, records, 's06', 's06-06-washer-maintenance-routine.png', '세탁기 통세척 관리 루틴', '관리 루틴 카드와 source bridge visual polish를 확인');

  await context.close();
}

function validate(records) {
  const failures = [];
  for (const item of records) {
    if (!item.noHorizontalOverflow) failures.push(`${item.screenshot}: horizontal overflow ${item.scrollWidth}/${item.clientWidth}`);
    if (item.matchedInternalTerms.length > 0) failures.push(`${item.screenshot}: internal terms ${item.matchedInternalTerms.join(', ')}`);
    if (item.flowSuffixLines.length > 0) failures.push(`${item.screenshot}: trailing Flow lines ${item.flowSuffixLines.join(' | ')}`);
  }
  return failures;
}

function writeScenarioFiles(payload) {
  fs.writeFileSync(path.join(packageDir, 'scenario-evidence.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(packageDir, 'scenario-guide.md'), renderGuide(payload), 'utf8');
  fs.writeFileSync(path.join(packageDir, 'scenario-review.html'), renderHtml(payload), 'utf8');
}

function renderGuide(payload) {
  const grouped = Object.entries(scenarioLabels)
    .map(([id, label]) => {
      const rows = payload.records
        .filter((item) => item.scenarioId === id)
        .map((item) => `| [${path.basename(item.screenshot)}](./${item.screenshot}) | ${item.title} | \`${item.url}\` | ${item.note} |`)
        .join('\n');
      return `## ${id}. ${label}

| Screenshot | 장면 | URL | 확인 포인트 |
| --- | --- | --- | --- |
${rows}
`;
    })
    .join('\n');

  return `# Claude Design P4 scenario screenshot guide

이 문서는 route별 정적 screenshot만으로 부족한 흐름 판단을 보강하기 위한 시나리오별 screenshot index다. 각 이미지는 모바일 390 x 844 viewport의 실제 화면이다.

- 생성일: ${payload.generatedAt}
- 브랜치: \`${branchName}\`
- 기준 커밋: \`${baselineCommit}\`
- base URL: \`${baseURL}\`
- 스크린샷 수: ${payload.records.length}
- validation: ${payload.validation.passed ? 'passed' : 'failed'}

## Claude에게 보는 방식

1. 먼저 [review.html](./review.html)에서 route별 현재 기준선을 본다.
2. 그 다음 [scenario-review.html](./scenario-review.html)에서 아래 사용자 흐름을 순서대로 본다.
3. 저장 후 My Flow와 Calendar는 실제 저장 루프로 캡처했으므로 빈 상태 evidence가 아니다.
4. 문제가 있으면 route명보다 scenario/step 기준으로 P5 backlog를 작성한다.

${grouped}

## 검증 요약

- 내부 검토/계층 문구 hit: ${payload.records.reduce((sum, item) => sum + item.matchedInternalTerms.length, 0)}건
- 콘텐츠 제목 끝 \`Flow\` 접미 hit: ${payload.records.reduce((sum, item) => sum + item.flowSuffixLines.length, 0)}건
- horizontal overflow failure: ${payload.records.filter((item) => !item.noHorizontalOverflow).length}건
`;
}

function renderHtml(payload) {
  const sections = Object.entries(scenarioLabels)
    .map(([id, label]) => {
      const cards = payload.records
        .filter((item) => item.scenarioId === id)
        .map((item) => `
          <article class="card">
            <div class="meta"><span>${escapeHtml(item.title)}</span><span>${escapeHtml(item.url)}</span></div>
            <img src="${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.title)}" />
            <p>${escapeHtml(item.note)}</p>
            <dl>
              <div><dt>Shell</dt><dd>${item.navVisible ? `4-tab · ${escapeHtml(item.activeMobileTab)}` : item.publicShellVisible ? 'Share shell' : 'None'}</dd></div>
              <div><dt>Overflow</dt><dd>${item.noHorizontalOverflow ? 'OK' : `${item.scrollWidth}/${item.clientWidth}`}</dd></div>
              <div><dt>Internal</dt><dd>${item.matchedInternalTerms.length}</dd></div>
              <div><dt>Flow suffix</dt><dd>${item.flowSuffixLines.length}</dd></div>
            </dl>
          </article>
        `)
        .join('');
      return `<section><h2>${escapeHtml(id)}. ${escapeHtml(label)}</h2><div class="grid">${cards}</div></section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowMe P4 Scenario Screenshots</title>
  <style>
    :root { --bg:#FAFAF8; --surface:#fff; --text:#1B1A17; --muted:#6E6B64; --border:#E7E4DD; --action:#3654FF; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1200px; margin:0 auto; padding:32px 20px 64px; }
    h1 { margin:0; font-size:clamp(30px,5vw,56px); line-height:1.05; letter-spacing:0; }
    h2 { margin:42px 0 16px; font-size:24px; }
    p { color:var(--muted); line-height:1.65; }
    a { color:var(--action); font-weight:700; }
    .hero { display:grid; gap:12px; margin-bottom:24px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:18px; }
    .card { border:1px solid var(--border); border-radius:18px; background:var(--surface); padding:14px; box-shadow:0 1px 0 rgba(27,26,23,.03); }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
    .meta span { border:1px solid var(--border); border-radius:999px; background:#FAFAF8; padding:4px 8px; color:var(--muted); font-size:12px; font-weight:700; }
    img { width:100%; border:1px solid var(--border); border-radius:14px; background:#F3F1EC; }
    dl { display:grid; gap:8px; margin:12px 0 0; }
    dl div { display:flex; justify-content:space-between; gap:12px; border-top:1px solid var(--border); padding-top:8px; font-size:13px; }
    dt { color:var(--muted); }
    dd { margin:0; font-weight:700; text-align:right; }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <p><strong>FlowMe P4 Scenario Screenshots</strong></p>
      <h1>Claude Design 재검토용 시나리오 캡처</h1>
      <p>route별 첫 화면이 아니라 사용자가 실제로 들어오고, 저장하고, My Flow와 Calendar에서 실행하는 흐름을 모바일 390px 기준으로 이어서 캡처했습니다.</p>
      <p><a href="./scenario-guide.md">scenario-guide.md</a> · <a href="./scenario-evidence.json">scenario-evidence.json</a> · <a href="./review.html">route review</a></p>
    </header>
    ${sections}
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true, ...getLaunchOptions() });
const records = [];
try {
  for (const [id, label] of Object.entries(scenarioLabels)) {
    process.stdout.write(`scenario ${id}: ${label}\n`);
    if (id === 's01') await scenarioHomeToDiscovery(browser, records);
    if (id === 's02') await scenarioMovingMapSave(browser, records);
    if (id === 's03') await scenarioPublicFlowSave(browser, records);
    if (id === 's04') await scenarioNoDateMapSave(browser, records);
    if (id === 's05') await scenarioRepeatUser(browser, records);
    if (id === 's06') await scenarioWorkbenchAndExport(browser, records);
  }
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
    },
    github: {
      scenarioGuide: `${githubBase}/docs/content-audit/${packageName}/scenario-guide.md`,
      scenarioReview: `${githubBase}/docs/content-audit/${packageName}/scenario-review.html`,
      scenarioEvidence: `${githubBase}/docs/content-audit/${packageName}/scenario-evidence.json`,
    },
  };
  writeScenarioFiles(payload);
  if (failures.length > 0) {
    throw new Error(`Scenario screenshot validation failed:\n${failures.join('\n')}`);
  }
  console.log(JSON.stringify({ packageName, screenshots: records.length, validation: payload.validation }, null, 2));
} finally {
  await browser.close();
}
