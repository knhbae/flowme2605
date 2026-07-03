import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageName = '2026-07-04-claude-design-p4-final-review-package';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const baseURL = process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3104';
const viewport = { width: 390, height: 844 };
const branchName = process.env.FLOWME_REVIEW_BRANCH ?? getCommandOutput('git branch --show-current') ?? 'codex/flowme-uxui-second-loop';
const baselineCommit = getCommandOutput('git rev-parse --short HEAD') ?? 'unknown';
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

const cleanRoutes = [
  { route: '/', screenshot: '01-home-mobile.png', label: 'Home' },
  { route: '/flows', screenshot: '02-flows-mobile.png', label: 'Flow finding' },
  { route: '/f/vehicle-inspection-prep', screenshot: '03-public-vehicle-inspection-mobile.png', label: 'Public share flow' },
  { route: '/f/moving-d30-basic', screenshot: '04-public-moving-basic-mobile.png', label: 'Public moving workbench' },
  { route: '/f/computer-skills-d30-study', screenshot: '05-public-computer-skills-mobile.png', label: 'Public study workbench' },
  { route: '/f/new-car-delivery-check', screenshot: '06-public-new-car-mobile.png', label: 'Public new car workbench' },
  { route: '/f/used-car-buying-check', screenshot: '07-public-used-car-mobile.png', label: 'Public used car workbench' },
  { route: '/f/baby-food-menu-recipe', screenshot: '08-public-baby-food-mobile.png', label: 'Public baby food workbench' },
  { route: '/f/real-thankyou-bubu-home-workout-starter', screenshot: '09-public-home-workout-mobile.png', label: 'Public exact video workbench' },
  { route: '/f/fridge-cleanout-weekly-plan', screenshot: '10-public-fridge-cleanout-mobile.png', label: 'Public sheet workbench' },
  { route: '/f/washer-tub-clean-monthly', screenshot: '11-public-washer-clean-mobile.png', label: 'Public maintenance workbench' },
  { route: '/flow-maps/moving-d30', screenshot: '12-flow-map-moving-mobile.png', label: 'Flow map moving' },
  { route: '/flow-maps/middle-school-math-1', screenshot: '13-flow-map-math-mobile.png', label: 'Flow map math' },
];

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

async function capture(page, route, state, screenshotName, label) {
  await settle(page);
  const screenshotPath = path.join(screenshotsDir, screenshotName);
  await page.screenshot({ path: screenshotPath });

  return page.evaluate((input) => {
    const bodyText = document.body.innerText;
    const textLines = bodyText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const matchedTerms = input.terms
      .filter((term) => textLines.some((line) => new RegExp(term.source, term.flags).test(line)))
      .map((term) => term.label);
    const allowedFlowSuffixLines = new Set(['Flow', '내 Flow', 'Flow 찾기', 'FlowMe', '내 Flow에 저장', '내 Flow에서 보기']);
    const flowSuffixLines = textLines
      .filter((line) => /[가-힣A-Za-z0-9)\]]\s*Flow$/.test(line))
      .filter((line) => !allowedFlowSuffixLines.has(line))
      .slice(0, 20);
    const actions = Array.from(document.querySelectorAll('button, a'))
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .slice(0, 10);

    function readStyle(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        borderColor: style.borderColor,
        borderRadius: style.borderTopLeftRadius,
        backgroundColor: style.backgroundColor,
      };
    }

    return {
      route: input.route,
      label: input.label,
      state: input.state,
      screenshot: `screenshots/${input.screenshotName}`,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      navVisible: Boolean(document.querySelector('[data-testid="platform-mobile-tabs"]')),
      publicShellVisible: Boolean(document.querySelector('[data-testid="flow-public-shell"]')),
      activeMobileTab: document.querySelector('[data-testid="platform-mobile-tabs"] [aria-current="page"]')?.textContent?.trim() ?? '',
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      firstActions: actions,
      matchedInternalTerms: matchedTerms,
      flowSuffixLines,
      visibleMarkers: {
        hasHomePrimaryCard: Boolean(document.querySelector('[data-testid="home-primary-flow-card"]')),
        hasCatalogCard: Boolean(document.querySelector('[data-testid="flow-map-catalog-card"]')),
        hasPublicSaveCta: Boolean(document.querySelector('[data-testid="public-flow-mobile-save-cta"]')),
        hasFlowMapStickySave: Boolean(document.querySelector('[data-testid="flow-map-mobile-sticky-save"]')),
        hasPostSavePanel: Boolean(document.querySelector('[data-testid="my-flow-post-save-panel"]')),
        hasMyFlowWorkspace: Boolean(document.querySelector('[data-testid="my-flow-workspace"]')),
        hasCalendarCard: Boolean(document.querySelector('[data-testid="my-flow-calendar-card"]')),
        hasSelectedDateGroup: Boolean(document.querySelector('[data-testid="my-flow-selected-date-group"]')),
      },
      visualChecks: {
        publicShell: readStyle('[data-testid="flow-public-shell"]'),
        platformMobileTabs: readStyle('[data-testid="platform-mobile-tabs"]'),
        flowMapCatalogCard: readStyle('[data-testid="flow-map-catalog-card"]'),
        exportFirstHero: readStyle('[aria-label="Export-first flow hero"]'),
        artifactWorkbench: readStyle('[aria-label="Flow artifact workbench"]'),
        holdSection: readStyle('[data-testid="flow-hold-section"]'),
        artifactListCard: readStyle('[data-testid="artifact-list-card"]'),
        artifactCalendarCard: readStyle('[data-testid="artifact-calendar-card"]'),
        artifactSpreadsheet: readStyle('[data-testid="artifact-log-table-spreadsheet"]'),
        mealSourceBridge: readStyle('[data-testid="meal-source-bridge"]'),
        exactVideoSourceBridge: readStyle('[data-testid="exact-video-source-bridge"]'),
        exactVideoResultCard: readStyle('[data-testid="exact-video-result-card"]'),
        maintenanceRoutineNextCard: readStyle('[data-testid="maintenance-routine-next-card"]'),
        maintenanceSourceBridge: readStyle('[data-testid="maintenance-source-bridge"]'),
        usedCarSourceBridge: readStyle('[data-testid="used-car-source-bridge"]'),
        usedCarDecisionResultCard: readStyle('[data-testid="used-car-decision-result-card"]'),
        mobileExportBar: readStyle('[data-testid="mobile-export-bar"]'),
      },
    };
  }, {
    route,
    label,
    state,
    screenshotName,
    terms: internalTerms.map((term) => ({ label: term.toString(), source: term.source, flags: term.flags })),
  });
}

async function captureCleanRoute(browser, item) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await page.goto(item.route, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  const evidence = await capture(page, item.route, 'clean localStorage', item.screenshot, item.label);
  await context.close();
  return evidence;
}

async function capturePostSaveRoutes(browser) {
  const context = await newMobileContext(browser);
  const page = await context.newPage();
  await page.goto('/flow-maps/moving-d30', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.getByTestId('flow-map-anchor-input').fill('2026-07-22');
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL('**/my?savedMap=moving-d30');
  await page.getByTestId('my-flow-post-save-panel').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
  const postSavePanelText = await page.getByTestId('my-flow-post-save-panel').innerText();
  const myBodyText = await page.locator('body').innerText();
  const storageKeysAfterSave = await page.evaluate(() => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean).sort());
  const myEvidence = await capture(page, '/my?savedMap=moving-d30', 'after saving moving-d30 with 2026-07-22', '14-post-save-my-flow-moving-mobile.png', 'Post-save My Flow');

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('my-flow-calendar-card').waitFor({ state: 'visible' });
  await page.getByTestId('my-flow-selected-date-group').first().waitFor({ state: 'visible' });
  const selectedDayText = await page.getByTestId('my-flow-calendar-selected-day').innerText();
  const calendarBodyText = await page.locator('body').innerText();
  const calendarEvidence = await capture(page, '/calendar', 'after saving moving-d30 with 2026-07-22', '15-calendar-after-save-mobile.png', 'Post-save Calendar');
  await context.close();

  return [
    {
      ...myEvidence,
      postSaveChecks: {
        storageKeysAfterSave,
        hasPostSavePanel: myEvidence.visibleMarkers.hasPostSavePanel,
        hasMyFlowWorkspace: myEvidence.visibleMarkers.hasMyFlowWorkspace,
        hasFirstTask: myBodyText.includes('이사 방식과 견적 후보 정하기'),
        hasTrueEmptyState: myBodyText.includes('저장된 콘텐츠가 없습니다') || myBodyText.includes('콘텐츠 고르러 가기'),
        hasCompactPostSavePanel:
          postSavePanelText.includes('저장됨') &&
          postSavePanelText.includes('먼저 열기') &&
          !postSavePanelText.includes('먼저 할 일부터 열어보세요') &&
          !postSavePanelText.includes('5개 할 일') &&
          !postSavePanelText.includes('묶음'),
      },
    },
    {
      ...calendarEvidence,
      postSaveChecks: {
        hasCalendarCard: calendarEvidence.visibleMarkers.hasCalendarCard,
        hasSelectedDateGroup: calendarEvidence.visibleMarkers.hasSelectedDateGroup,
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

function validateEvidence(payload) {
  const failures = [];
  for (const item of payload.evidence) {
    if (!item.noHorizontalOverflow) failures.push(`${item.route}: horizontal overflow ${item.scrollWidth}/${item.clientWidth}`);
    if (item.matchedInternalTerms.length > 0) failures.push(`${item.route}: internal terms ${item.matchedInternalTerms.join(', ')}`);
    if (item.flowSuffixLines.length > 0) failures.push(`${item.route}: trailing Flow title lines ${item.flowSuffixLines.join(' | ')}`);
    if (item.route.startsWith('/f/') && !item.publicShellVisible) failures.push(`${item.route}: public share shell missing`);
    if (item.route.startsWith('/f/') && item.navVisible) failures.push(`${item.route}: 4-tab mobile nav should not be visible before save`);
  }

  const postSaveMy = payload.evidence.find((item) => item.route === '/my?savedMap=moving-d30');
  if (!postSaveMy?.postSaveChecks?.hasPostSavePanel) failures.push('/my?savedMap=moving-d30: post-save panel missing');
  if (!postSaveMy?.postSaveChecks?.hasFirstTask) failures.push('/my?savedMap=moving-d30: first task missing');
  if (postSaveMy?.postSaveChecks?.hasTrueEmptyState) failures.push('/my?savedMap=moving-d30: true empty state visible after save');

  const calendar = payload.evidence.find((item) => item.route === '/calendar');
  if (!calendar?.postSaveChecks?.hasCalendarCard) failures.push('/calendar: calendar card missing after save');
  if (!calendar?.postSaveChecks?.hasAgenda) failures.push('/calendar: saved agenda missing after save');
  if (calendar?.postSaveChecks?.hasTrueEmptyState) failures.push('/calendar: true empty state visible after save');

  return failures;
}

function writePackage(payload) {
  fs.writeFileSync(path.join(outputDir, 'route-evidence.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'README.md'), renderReadme(payload), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'audit.md'), renderAudit(payload), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'prompt-ko.md'), renderPrompt(), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'review.html'), renderHtml(payload), 'utf8');
}

function renderReadme(payload) {
  return `# Claude Design P4 final review package

이 패키지는 FlowMe Claude Design 3차 재검토 이후 P4-01~P4-05 개선 루프를 마감 감사하고, Claude Design에게 GitHub 소스/문서/screenshot만으로 다시 평가를 요청하기 위한 자료다.

## 읽는 순서

1. [review.html](./review.html) - route별 screenshot과 판단 요약
2. [audit.md](./audit.md) - P4 적용 요약, route별 evidence, 남은 리스크
3. [route-evidence.json](./route-evidence.json) - 모바일 390px 수치 evidence
4. [screenshots](./screenshots/) - 최신 모바일 390px screenshot ${payload.evidence.length}장
5. [prompt-ko.md](./prompt-ko.md) - Claude Design 재검토 요청 프롬프트

## 생성 기준

- 브랜치: \`${branchName}\`
- 기준 커밋: \`${baselineCommit}\`
- viewport: ${viewport.width} x ${viewport.height}
- base URL: \`${baseURL}\`
- 생성 스크립트: [capture-claude-p4-final-review-package.mjs](../../../scripts/content-audit/capture-claude-p4-final-review-package.mjs)

## GitHub 링크

- [P4 review package](${githubBase}/docs/content-audit/${packageName}/README.md)
- [review.html](${githubBase}/docs/content-audit/${packageName}/review.html)
- [audit.md](${githubBase}/docs/content-audit/${packageName}/audit.md)
- [route-evidence.json](${githubBase}/docs/content-audit/${packageName}/route-evidence.json)
- [screenshots](${githubBase}/docs/content-audit/${packageName}/screenshots)

원본 Claude Design 3차 재검토 zip은 입력 자료로 사용했지만, 재검토 요청은 이 패키지의 screenshot/evidence와 소스 링크만으로 진행할 수 있게 구성했다.

## 재생성 명령

\`\`\`powershell
npm.cmd run build
npm.cmd run start -- -p 3104
node scripts\\content-audit\\capture-claude-p4-final-review-package.mjs
\`\`\`
`;
}

function renderAudit(payload) {
  const routeRows = payload.evidence
    .map((item) => `| \`${item.route}\` | ${item.state} | ${item.h1 || '-'} | ${item.navVisible ? item.activeMobileTab || 'nav visible' : item.publicShellVisible ? 'share shell' : 'none'} | [${path.basename(item.screenshot)}](./${item.screenshot}) | ${item.noHorizontalOverflow ? 'OK' : 'overflow'} |`)
    .join('\n');
  const publicRoutes = payload.evidence.filter((item) => item.route.startsWith('/f/'));
  const suffixFailures = payload.evidence.flatMap((item) => item.flowSuffixLines.map((line) => `${item.route}: ${line}`));
  const internalFailures = payload.evidence.flatMap((item) => item.matchedInternalTerms.map((term) => `${item.route}: ${term}`));

  return `# FlowMe Claude Design P4 final audit

- 작성일: 2026-07-04
- 기준 브랜치: \`${branchName}\`
- 기준 커밋: \`${baselineCommit}\`
- 범위: 홈, Flow 찾기, 공개 Flow 상세, Flow Map 상세, My Flow, 캘린더, 특수 workbench
- 원칙: 새 기능 추가 없음. 4탭 IA, 공유용 \`/f/[slug]\` shell, seed/source-backed 구조, 저장/실행/export 스키마 유지.

## P4-01 제목 Flow 접미 제거

- 일반 사용자 route의 콘텐츠 제목 끝 \`Flow\` 접미를 표시 레이어에서 제거하는 기준을 유지했다.
- 브랜드/탭 문맥인 \`FLOW\`, \`Flow 찾기\`, \`내 Flow\`, \`FlowMe\`는 허용한다.
- route evidence의 \`flowSuffixLines\` 결과: ${suffixFailures.length === 0 ? '0건' : suffixFailures.join('; ')}

## P4-02/P4-03 공개 Flow 공유 shell + 저장 CTA

- \`/f/[slug]\`는 공유 진입 화면으로 유지한다.
- 저장 전에는 하단 4탭을 강제 편입하지 않고 \`flow-public-shell\`과 \`내 Flow에 저장\` CTA 중심으로 둔다.
- 저장 후에는 \`/my\`로 이동해 기존 4탭 app shell과 My Flow 실행 허브로 이어진다.
- 확인한 공개 route 수: ${publicRoutes.length}개

## P4-04 홈 설명형 카드 축소

- 홈은 사용법 설명보다 \`콘텐츠 고르러 가기\`와 추천 콘텐츠 저장 결과 약속 중심으로 확인했다.
- \`시작 경로\`식 단계 설명 카드 없이 첫 행동과 대표 저장 결과가 먼저 보인다.

## P4-05 특수 workbench visual polish

- 특수 public workbench route에서 warm background, \`#E7E4DD\` border, 16px card radius, 12px action radius 기준을 확인했다.
- 대상 route: moving D-30, computer skills, new car, used car, baby food, home workout, fridge cleanout, washer tub clean.
- visual token 세부값은 [route-evidence.json](./route-evidence.json)의 \`visualChecks\`에 기록했다.

## 저장 후 evidence

- \`/flow-maps/moving-d30\`에서 이사일 \`2026-07-22\`를 입력하고 실제 저장 CTA를 눌러 \`/my?savedMap=moving-d30\`를 캡처했다.
- 같은 브라우저 컨텍스트에서 \`/calendar\`로 이동해 저장된 agenda를 캡처했다.
- My Flow post-save true empty state: ${payload.evidence.find((item) => item.route === '/my?savedMap=moving-d30')?.postSaveChecks?.hasTrueEmptyState ? '노출됨' : '노출 안 됨'}
- Calendar after-save true empty state: ${payload.evidence.find((item) => item.route === '/calendar')?.postSaveChecks?.hasTrueEmptyState ? '노출됨' : '노출 안 됨'}

## Route evidence

| Route | 상태 | H1 | shell/nav | Screenshot | Overflow |
| --- | --- | --- | --- | --- | --- |
${routeRows}

## 회귀 스캔

- 내부 검토/계층 문구: ${internalFailures.length === 0 ? '0건' : internalFailures.join('; ')}
- 콘텐츠 제목 끝 \`Flow\` 접미: ${suffixFailures.length === 0 ? '0건' : suffixFailures.join('; ')}
- horizontal overflow: ${payload.evidence.every((item) => item.noHorizontalOverflow) ? '0건' : '확인 필요'}

## Verification snapshot

이 패키지는 screenshot/evidence 생성까지 수행한 결과다. 최종 명령 검증은 작업 마감 시 아래 명령으로 확인한다.

- P4 관련 targeted Playwright E2E
- \`npm.cmd test\`
- \`npm.cmd run docs:check\`
- \`npm.cmd run build\`
- \`git diff --check\`

## Claude에게 확인받을 질문

1. P4-01~P4-05를 닫아도 되는지, 다시 열어야 하는 항목이 있는지 판단해 달라.
2. \`/f/[slug]\` 공유 shell 정책이 저장 전 화면에는 충분히 자연스러운지 판단해 달라.
3. My Flow와 Calendar 저장 후 화면이 실행형 앱처럼 보이는지 다시 평가해 달라.
4. 특수 workbench 화면의 visual polish가 주요 4탭 화면과 같은 제품처럼 보이는지 평가해 달라.
5. 다음 루프가 필요하다면 Blocking/High/Medium/Low로 P5 backlog를 작성해 달라.

## 남은 리스크

| 우선순위 | 항목 | 설명 | 다음 판단 |
| --- | --- | --- | --- |
| Review | P5 후보 | P4 route evidence 기준으로는 회귀가 없지만, Claude Design이 screenshot만 보고 남은 밀도/톤/CTA 문제를 다시 판단해야 한다. | Claude 재검토 결과를 P5 backlog로 전환 |
`;
}

function renderPrompt() {
  return `# Claude Design 재검토 요청 프롬프트

FlowMe Claude Design 3차 재검토 이후 P4-01~P4-05 개선 루프를 마감 감사한 최신 패키지를 검토해 주세요. Vercel은 보지 못한다는 전제로, GitHub 소스/문서/screenshot/evidence만 사용해 판단해 주세요.

## 먼저 볼 파일

1. \`flow-mvp/docs/content-audit/${packageName}/review.html\`
2. \`flow-mvp/docs/content-audit/${packageName}/audit.md\`
3. \`flow-mvp/docs/content-audit/${packageName}/route-evidence.json\`
4. \`flow-mvp/docs/content-audit/${packageName}/screenshots/\`
5. \`flow-mvp/docs/content-audit/2026-07-03-claude-design-action-backlog-ko.md\`

## 유지해야 할 기준선

- 4탭 IA는 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 \`/f/[slug]\`는 저장 전 공유 shell로 유지하고, 저장 후 \`/my\` app shell로 이어짐
- seed/source-backed 데이터 구조와 저장/실행/export 스키마는 변경하지 않음
- 사용자 화면에는 \`review\`, \`audit\`, \`source-backed\`, \`Step\`, \`Item\` 같은 내부 문구를 노출하지 않음
- 콘텐츠 제목의 끝 \`Flow\` 접미는 사용자 화면에서 제거하되 \`Flow 찾기\`, \`내 Flow\`, \`FlowMe\`는 유지
- 홈은 설명서가 아니라 콘텐츠 저장으로 들어가는 가벼운 입구
- export 라벨은 결과 중심: 캘린더 파일 받기 / 시트로 받기 / 메모로 복사 / 체크리스트 복사

## 검토할 route

- \`/\`
- \`/flows\`
- \`/f/vehicle-inspection-prep\`
- \`/f/moving-d30-basic\`
- \`/f/computer-skills-d30-study\`
- \`/f/new-car-delivery-check\`
- \`/f/used-car-buying-check\`
- \`/f/baby-food-menu-recipe\`
- \`/f/real-thankyou-bubu-home-workout-starter\`
- \`/f/fridge-cleanout-weekly-plan\`
- \`/f/washer-tub-clean-monthly\`
- \`/flow-maps/moving-d30\`
- \`/flow-maps/middle-school-math-1\`
- \`/my?savedMap=moving-d30\`
- \`/calendar\`

## 산출물

평가만 하지 말고 다음 산출물을 만들어 주세요.

1. P4-01~P4-05 각각의 닫힘/재오픈 판단
2. route별 UX/UI 문제 목록
3. Blocking / High / Medium / Low 우선순위
4. 바로 개발 가능한 P5 backlog
5. 유지해야 할 기준선
6. 화면별 구체 수정 지시
7. copy 또는 layout을 바꿔야 한다면 revised screen spec

## 특히 확인할 질문

- 공개 \`/f/[slug]\` 공유 shell이 저장 전 진입 화면으로 자연스러운가?
- 저장 후 My Flow와 Calendar screenshot이 충분히 실행형 앱처럼 보이는가?
- 특수 workbench route들이 하나의 FlowMe 앱처럼 보이는가?
- 홈과 Flow 찾기의 정보량이 상용 서비스 수준으로 충분히 낮아졌는가?
- 다음 루프를 한다면 어디부터 고쳐야 하는가?
`;
}

function renderHtml(payload) {
  const routeCards = payload.evidence
    .map((item) => `
      <article class="card">
        <div class="meta">
          <span>${escapeHtml(item.label)}</span>
          <span>${escapeHtml(item.state)}</span>
        </div>
        <h3>${escapeHtml(item.route)}</h3>
        <p class="h1">${escapeHtml(item.h1 || 'No H1')}</p>
        <img src="${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.route)} screenshot" />
        <dl>
          <div><dt>Shell</dt><dd>${item.navVisible ? `4-tab · ${escapeHtml(item.activeMobileTab)}` : item.publicShellVisible ? 'Share shell' : 'None'}</dd></div>
          <div><dt>Overflow</dt><dd>${item.noHorizontalOverflow ? 'OK' : `${item.scrollWidth}/${item.clientWidth}`}</dd></div>
          <div><dt>Internal terms</dt><dd>${item.matchedInternalTerms.length}</dd></div>
          <div><dt>Flow suffix</dt><dd>${item.flowSuffixLines.length}</dd></div>
        </dl>
      </article>
    `)
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowMe Claude Design P4 Final Review</title>
  <style>
    :root { color-scheme: light; --bg:#FAFAF8; --surface:#fff; --text:#1B1A17; --muted:#6E6B64; --border:#E7E4DD; --action:#3654FF; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    header { display: grid; gap: 14px; margin-bottom: 28px; }
    h1 { margin: 0; font-size: clamp(30px, 5vw, 56px); letter-spacing: 0; line-height: 1.02; }
    h2 { margin: 32px 0 12px; font-size: 22px; }
    h3 { margin: 8px 0 6px; font-size: 18px; }
    p { color: var(--muted); line-height: 1.65; }
    a { color: var(--action); font-weight: 700; }
    .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .pill { border: 1px solid var(--border); border-radius: 16px; background: var(--surface); padding: 16px; }
    .pill strong { display:block; font-size: 22px; margin-bottom: 4px; }
    .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card { border: 1px solid var(--border); border-radius: 18px; background: var(--surface); padding: 14px; box-shadow: 0 1px 0 rgba(27,26,23,.03); }
    .meta { display:flex; flex-wrap:wrap; gap: 8px; color: var(--muted); font-size: 12px; font-weight: 700; }
    .meta span { border: 1px solid var(--border); border-radius: 999px; padding: 4px 8px; background: #FAFAF8; }
    .h1 { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: var(--muted); }
    img { width: 100%; border-radius: 14px; border: 1px solid var(--border); background: #F3F1EC; }
    dl { display:grid; gap: 8px; margin: 12px 0 0; }
    dl div { display:flex; justify-content:space-between; gap: 12px; border-top: 1px solid var(--border); padding-top: 8px; font-size: 13px; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; text-align: right; }
    code { background:#F3F1EC; border-radius: 8px; padding: 2px 6px; }
  </style>
</head>
<body>
  <main>
    <header>
      <p><strong>FlowMe Claude Design P4 Final Review</strong></p>
      <h1>P4-01~P4-05 마감 감사 패키지</h1>
      <p>모바일 390px 기준으로 홈, Flow 찾기, 공개 공유 화면, Flow Map 상세, 저장 후 My Flow, 저장 후 캘린더, 특수 workbench route를 다시 캡처했습니다.</p>
      <p><a href="./audit.md">audit.md</a> · <a href="./route-evidence.json">route-evidence.json</a> · <a href="./prompt-ko.md">prompt-ko.md</a></p>
    </header>
    <section class="summary">
      <div class="pill"><strong>${payload.evidence.length}</strong><span>screenshots</span></div>
      <div class="pill"><strong>${payload.evidence.filter((item) => item.noHorizontalOverflow).length}/${payload.evidence.length}</strong><span>no horizontal overflow</span></div>
      <div class="pill"><strong>${payload.evidence.reduce((sum, item) => sum + item.matchedInternalTerms.length, 0)}</strong><span>internal term hits</span></div>
      <div class="pill"><strong>${payload.evidence.reduce((sum, item) => sum + item.flowSuffixLines.length, 0)}</strong><span>trailing Flow title hits</span></div>
    </section>
    <h2>Route Evidence</h2>
    <section class="grid">
      ${routeCards}
    </section>
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
try {
  const cleanEvidence = [];
  for (const item of cleanRoutes) {
    const contextLabel = `${item.route} (${item.label})`;
    process.stdout.write(`capture ${contextLabel}\n`);
    cleanEvidence.push(await captureCleanRoute(browser, item));
  }
  process.stdout.write('capture post-save /my and /calendar\n');
  const postSaveEvidence = await capturePostSaveRoutes(browser);
  const payload = {
    generatedAt: new Date().toISOString(),
    packageName,
    branchName,
    baselineCommit,
    baseURL,
    viewport,
    policy: {
      p4_01: 'User-facing content title rendering hides trailing Flow suffix while preserving FlowMe, Flow finding, and My Flow labels.',
      p4_02_p4_03: 'Public /f/[slug] remains a share shell before save; save leads to /my where the 4-tab app shell resumes.',
      p4_04: 'Home remains a lightweight entry with one primary route into content finding.',
      p4_05: 'Special workbench routes use the shared FlowMe warm background, borders, radius, and button hierarchy.',
    },
    evidence: [...cleanEvidence, ...postSaveEvidence],
  };
  const failures = validateEvidence(payload);
  payload.validation = {
    passed: failures.length === 0,
    failures,
  };
  writePackage(payload);
  if (failures.length > 0) {
    throw new Error(`P4 evidence validation failed:\n${failures.join('\n')}`);
  }
  console.log(JSON.stringify({ packageName, screenshots: payload.evidence.length, outputDir, validation: payload.validation }, null, 2));
} finally {
  await browser.close();
}
