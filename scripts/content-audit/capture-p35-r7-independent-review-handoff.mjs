import fs from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright';

const repoRoot = process.cwd();
const baseUrl = process.env.FLOWME_BASE_URL ?? 'http://127.0.0.1:3104';
const outputRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_OFFLINE_PREVIEW_DIR
    ?? 'docs/content-audit/2026-07-28-p35-r7-codex-claude-code-independent-review-handoff/current-journeys',
);
const screenshotDir = path.join(outputRoot, 'screenshots');
const snapshotDir = path.join(outputRoot, 'state-snapshots');

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(snapshotDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
    ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseUrl,
  observedUserCount: 0,
  evidenceKind: 'current_local_browser_capture',
  captures: [],
  failures: [],
};

function normalizeText(value) {
  return value.replace(/\s+/gu, ' ').trim();
}

async function createPage(viewport, storageSetup) {
  const context = await browser.newContext({ viewport });
  if (storageSetup) {
    await context.addInitScript(storageSetup);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors };
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
}

async function capture(page, errors, input) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
  if (input.targetTestId) {
    const target = page.getByTestId(input.targetTestId);
    if (await target.isVisible().catch(() => false)) {
      await target.scrollIntoViewIfNeeded();
    }
  } else if (input.scrollTop !== false) {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(120);

  const screenshotPath = path.join(screenshotDir, input.file);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const snapshot = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
      );
    };
    const elements = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter(visible);
    const actions = elements.map((element) => {
      const labels = 'labels' in element
        ? Array.from(element.labels ?? []).map((label) => label.textContent?.trim() ?? '')
        : [];
      const labelledBy = element.getAttribute('aria-labelledby')
        ?.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      const name = [
        element.getAttribute('aria-label'),
        labelledBy,
        element.getAttribute('title'),
        ...labels,
        element.textContent?.trim(),
        'value' in element ? String(element.value ?? '') : '',
      ].filter(Boolean).join(' ').replace(/\s+/gu, ' ').trim();
      return {
        tag: element.tagName.toLowerCase(),
        name,
        testId: element.getAttribute('data-testid'),
        disabled: 'disabled' in element ? Boolean(element.disabled) : false,
      };
    });
    return {
      url: location.href,
      title: document.title,
      viewport: {
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
      },
      quality: {
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        unnamedInteractiveCount: actions.filter((action) => action.name.length === 0).length,
        brokenImageCount: Array.from(document.images)
          .filter((image) => !image.complete || image.naturalWidth === 0).length,
      },
      headings: Array.from(document.querySelectorAll('h1, h2, h3'))
        .filter(visible)
        .map((heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: heading.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
        })),
      actions,
      visibleText: document.body.innerText.replace(/\n{3,}/gu, '\n\n').trim(),
    };
  });

  snapshot.consoleAndPageErrors = [...errors];
  snapshot.label = input.label;
  snapshot.state = input.state;
  snapshot.route = input.route;
  snapshot.reviewQuestions = input.reviewQuestions ?? [];
  const snapshotFile = input.file.replace(/\.png$/u, '.json');
  fs.writeFileSync(
    path.join(snapshotDir, snapshotFile),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8',
  );

  manifest.captures.push({
    file: `screenshots/${input.file}`,
    snapshot: `state-snapshots/${snapshotFile}`,
    route: input.route,
    state: input.state,
    label: input.label,
    viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`,
    reviewQuestions: input.reviewQuestions ?? [],
    quality: snapshot.quality,
    consoleAndPageErrorCount: snapshot.consoleAndPageErrors.length,
  });
}

async function runCase(label, runner) {
  try {
    await runner();
  } catch (error) {
    manifest.failures.push({
      label,
      message: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  }
}

const clearStorage = () => window.localStorage.clear();
const movingStorage = () => {
  window.localStorage.clear();
  window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
    slug: 'moving-d30-basic',
    savedAt: '2026-07-27T00:00:00.000Z',
    selectedArtifactMode: 'calendar',
    anchor: '2026-08-24',
  }));
  window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
    mode: 'custom',
    anchor: '2026-08-24',
  }));
};

await runCase('public moving result, adjustment, export', async () => {
  const { context, page, errors } = await createPage({ width: 390, height: 844 }, clearStorage);
  await goto(page, '/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2026-08-24');
  await capture(page, errors, {
    file: '01-moving-result-390.png',
    route: '/f/moving-d30-basic',
    state: 'public_result_ready',
    label: '이사 Flow 저장 전 전체 결과',
    reviewQuestions: ['전체 결과가 먼저 읽히는가', '저장과 외부 가져가기의 차이가 보이는가'],
  });

  await page.getByTestId('public-flow-adjust-entry-mobile').click();
  await page.getByTestId('public-flow-adjustment-kind-items').click();
  await capture(page, errors, {
    file: '02-moving-adjust-items-390.png',
    route: '/f/moving-d30-basic',
    state: 'public_adjust_items',
    label: '포함 항목 조정',
    targetTestId: 'public-flow-personal-adjustment',
    reviewQuestions: ['항목 제목·상세·날짜 편집이 필요한가', '한 종류 조정 원칙이 유지되는가'],
  });
  await page.getByTestId('public-flow-adjustment-cancel').click();

  const detailWorkspace = page.getByTestId('public-flow-detail-workspace');
  const firstSummary = detailWorkspace.locator('summary').first();
  if (await firstSummary.isVisible().catch(() => false)) await firstSummary.click();
  const exportToggle = page.getByTestId('public-flow-export-secondary-toggle');
  if (await exportToggle.isVisible().catch(() => false)) await exportToggle.click();
  await capture(page, errors, {
    file: '03-moving-public-export-390.png',
    route: '/f/moving-d30-basic',
    state: 'public_secondary_export',
    label: '저장 전 보조 가져가기',
    targetTestId: 'my-flow-export-panel',
    reviewQuestions: ['가져가기가 public preview에 있어야 하는가', '형식보다 destination이 먼저인가'],
  });
  await context.close();
});

await runCase('public moving receipt', async () => {
  const { context, page, errors } = await createPage({ width: 390, height: 844 }, clearStorage);
  await goto(page, '/f/moving-d30-basic');
  await page.getByTestId('public-flow-anchor-input').fill('2026-08-24');
  await page.getByTestId('public-flow-save-primary-mobile').click();
  await page.getByTestId('public-flow-saved-receipt').waitFor({ state: 'visible' });
  await capture(page, errors, {
    file: '04-moving-saved-receipt-390.png',
    route: '/f/moving-d30-basic',
    state: 'saved_receipt',
    label: '저장 완료',
    targetTestId: 'public-flow-saved-receipt',
    reviewQuestions: ['오늘 할 일보다 전체 저장 검증이 먼저인가', '다음 primary action이 자연스러운가'],
  });
  await context.close();
});

await runCase('vehicle checklist result and adjustment', async () => {
  const { context, page, errors } = await createPage({ width: 390, height: 844 }, clearStorage);
  await goto(page, '/f/vehicle-inspection-prep');
  await capture(page, errors, {
    file: '05-vehicle-result-390.png',
    route: '/f/vehicle-inspection-prep',
    state: 'undated_checklist_result',
    label: '날짜 없는 차량 점검 결과',
    reviewQuestions: ['날짜 없는 Flow를 어떻게 실행하는가', 'Checklist와 Todo 추천이 명확한가'],
  });
  await page.getByTestId('public-flow-adjust-entry-mobile').click();
  await page.getByTestId('public-flow-adjustment-kind-items').click();
  await capture(page, errors, {
    file: '06-vehicle-adjust-items-390.png',
    route: '/f/vehicle-inspection-prep',
    state: 'undated_checklist_adjustment',
    label: '날짜 없는 Checklist 포함 항목 조정',
    targetTestId: 'public-flow-personal-adjustment',
    reviewQuestions: ['개별 날짜·상세 편집이 어디에 있어야 하는가'],
  });
  await context.close();
});

await runCase('routine result and settings', async () => {
  const { context, page, errors } = await createPage({ width: 390, height: 844 }, clearStorage);
  await goto(page, '/f/curated-allblanc-morning-workout');
  await page.getByTestId('public-flow-anchor-input').fill('2026-07-27');
  await capture(page, errors, {
    file: '07-workout-result-390.png',
    route: '/f/curated-allblanc-morning-workout',
    state: 'routine_result',
    label: '홈트 반복 Flow 결과',
    reviewQuestions: ['series와 occurrence가 구분되는가', 'resource가 실행 Item과 구분되는가'],
  });
  await page.getByTestId('public-flow-adjust-entry-mobile').click();
  await page.getByTestId('public-flow-adjustment-kind-routine').click();
  await capture(page, errors, {
    file: '08-workout-routine-adjust-390.png',
    route: '/f/curated-allblanc-morning-workout',
    state: 'routine_adjustment',
    label: '홈트 반복 설정',
    targetTestId: 'public-flow-personal-adjustment',
    reviewQuestions: ['초기 설정이 과밀한가', 'compact summary와 progressive disclosure가 필요한가'],
  });
  await context.close();
});

await runCase('My Flow mobile workspace states', async () => {
  const { context, page, errors } = await createPage({ width: 390, height: 844 }, movingStorage);
  await goto(page, '/my?view=flows');
  const compactRow = page.locator(
    '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]',
  );
  await compactRow.getByTestId('my-flow-mobile-structure-open').click();
  const workspace = page.locator(
    '[data-testid="my-flow-mobile-workspace"][data-flow-slug="moving-d30-basic"]',
  );
  await workspace.waitFor({ state: 'visible' });

  await capture(page, errors, {
    file: '09-my-flow-next-action-390.png',
    route: '/my?view=flows',
    state: 'my_flow_next_action',
    label: '내 Flow 다음 행동',
    reviewQuestions: ['다음 행동 탭의 정체성이 명확한가', '같은 날짜 묶음이 필요한가'],
  });

  const executionShell = workspace
    .getByTestId('my-flow-workspace-execute')
    .getByTestId('my-flow-execution-row-shell');
  await executionShell.getByRole('button', { name: /열기/u }).first().click();
  const detail = page.locator(
    '[data-testid="my-flow-item-detail-sheet"] [data-testid="my-flow-item-detail"]:visible',
  );
  await detail.waitFor({ state: 'visible' });
  await capture(page, errors, {
    file: '10-my-flow-item-detail-390.png',
    route: '/my?view=flows',
    state: 'my_flow_item_detail',
    label: '항목 상세',
    targetTestId: 'my-flow-item-detail-sheet',
    reviewQuestions: ['상세와 완료가 같은 문맥에 있는가', '저장 전 편집과 연결 가능한 구조인가'],
  });

  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    const summary = detail.getByTestId('my-flow-detail-read-summary');
    if ((await summary.getAttribute('open')) === null) await summary.locator('summary').click();
    await summary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  await detail.getByTestId('my-flow-detail-title-input').waitFor({ state: 'visible' });
  await capture(page, errors, {
    file: '11-my-flow-item-edit-390.png',
    route: '/my?view=flows',
    state: 'my_flow_item_edit',
    label: '항목 제목·날짜·메모 편집',
    targetTestId: 'my-flow-item-detail-sheet',
    reviewQuestions: ['현재 기능을 저장 전 contextual edit에 재사용할 수 있는가'],
  });
  await detail.getByTestId('my-flow-editor-cancel').click();
  const detailClose = page.getByTestId('my-flow-item-detail-sheet-close');
  if (await detailClose.isVisible().catch(() => false)) {
    await detailClose.click();
  } else if (await detail.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }
  if (!(await workspace.isVisible().catch(() => false))) {
    await compactRow.getByTestId('my-flow-mobile-structure-open').click();
    await workspace.waitFor({ state: 'visible' });
  }

  const plan = workspace.getByTestId('my-flow-workspace-plan');
  await plan.scrollIntoViewIfNeeded();
  await capture(page, errors, {
    file: '12-my-flow-full-plan-390.png',
    route: '/my?view=flows',
    state: 'my_flow_full_plan',
    label: '내 Flow 전체 계획',
    targetTestId: 'my-flow-workspace-plan',
    reviewQuestions: ['전체 저장 결과를 확인하기 쉬운가', '다음 행동과 전체 계획이 과도하게 분리되는가'],
  });

  const completion = workspace
    .getByTestId('my-flow-workspace-execute')
    .getByTestId('my-flow-task-complete-control')
    .first();
  await completion.scrollIntoViewIfNeeded();
  await completion.click();
  await page.getByTestId('my-flow-completion-snackbar').waitFor({ state: 'visible' });
  await capture(page, errors, {
    file: '14-my-flow-completion-undo-390.png',
    route: '/my?view=flows',
    state: 'my_flow_completion_undo',
    label: '완료 후 즉시 되돌리기',
    reviewQuestions: ['행이 사라질 때만 undo가 필요한가', '직접 다시 열기와 snackbar가 중복되는가'],
  });

  const history = workspace.getByTestId('my-flow-optional-history');
  await history.scrollIntoViewIfNeeded();
  await capture(page, errors, {
    file: '13-my-flow-record-390.png',
    route: '/my?view=flows',
    state: 'my_flow_record',
    label: '내 Flow 기록',
    targetTestId: 'my-flow-optional-history',
    reviewQuestions: ['기록 영역의 정체성이 명확한가', 'history·회고·재사용이 섞이는가'],
  });
  await context.close();
});

await runCase('My Flow wide workspace', async () => {
  const { context, page, errors } = await createPage({ width: 1024, height: 768 });
  await goto(page, '/my?demo=ux20&view=flows');
  const library = page.getByTestId('my-flow-library-workspace');
  await library.getByTestId('my-flow-library-row').first().click();
  await capture(page, errors, {
    file: '15-my-flow-workspace-1024.png',
    route: '/my?demo=ux20&view=flows',
    state: 'my_flow_wide_workspace',
    label: '내 Flow wide library와 workspace',
    reviewQuestions: ['rail과 canvas 역할이 명확한가', '모바일 탭과 wide hierarchy가 일치하는가'],
  });
  await context.close();
});

await runCase('Calendar mobile and wide selected day', async () => {
  const mobile = await createPage({ width: 390, height: 844 });
  await goto(mobile.page, '/calendar?demo=ux20');
  await capture(mobile.page, mobile.errors, {
    file: '16-calendar-month-390.png',
    route: '/calendar?demo=ux20',
    state: 'calendar_month',
    label: '캘린더 월간 화면',
    reviewQuestions: ['Calendar가 date lens로 읽히는가'],
  });
  const mobileDate = mobile.page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
    .getByTestId('my-flow-calendar-date-button');
  await mobileDate.click();
  await mobile.page.getByTestId('my-flow-calendar-selected-day').waitFor({ state: 'visible' });
  await capture(mobile.page, mobile.errors, {
    file: '17-calendar-selected-day-390.png',
    route: '/calendar?demo=ux20',
    state: 'calendar_selected_day',
    label: '모바일 선택일 agenda',
    targetTestId: 'my-flow-calendar-selected-day',
    reviewQuestions: ['같은 날짜 항목과 Flow 구분이 충분한가', 'detail을 sheet로 열어야 하는가'],
  });
  await mobile.context.close();

  const wide = await createPage({ width: 1024, height: 768 });
  await goto(wide.page, '/calendar?demo=ux20');
  await wide.page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await wide.page.getByTestId('my-flow-calendar-selected-day').waitFor({ state: 'visible' });
  await capture(wide.page, wide.errors, {
    file: '18-calendar-selected-day-1024.png',
    route: '/calendar?demo=ux20',
    state: 'calendar_selected_day_wide',
    label: '와이드 선택일 agenda',
    reviewQuestions: ['날짜 묶음이 My Flow와 같은 실행 단위를 쓰는가'],
  });
  await wide.context.close();
});

await browser.close();

fs.writeFileSync(
  path.join(outputRoot, 'preview-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  outputRoot,
  captureCount: manifest.captures.length,
  failureCount: manifest.failures.length,
}, null, 2));

if (manifest.failures.length > 0) process.exitCode = 1;
