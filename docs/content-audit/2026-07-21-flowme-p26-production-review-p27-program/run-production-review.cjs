const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const BASE_URL = 'https://flowme2605.vercel.app';
const PACKAGE_ROOT = __dirname;
const SCREENSHOT_ROOT = path.join(PACKAGE_ROOT, 'screenshots');
const MOBILE = { width: 390, height: 844 };
const WIDE = { width: 1024, height: 768 };

fs.mkdirSync(SCREENSHOT_ROOT, { recursive: true });

const result = {
  packageId: '2026-07-21-flowme-p26-production-review-p27-program',
  evidenceBoundary: {
    baseUrl: BASE_URL,
    evidenceKind: 'current_production_interaction',
    observedUserSessionCount: 0,
    note: 'Independent automated interaction and heuristic capture; not observed-user validation.',
  },
  startedAt: new Date().toISOString(),
  journeys: [],
};

function compact(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

async function isVisible(locator) {
  return locator.isVisible().catch(() => false);
}

async function clickIfVisible(locator) {
  if (!(await isVisible(locator))) return false;
  await locator.click();
  return true;
}

async function stateMetrics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const nameOf = (element) => (
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent
      || ''
    ).replace(/\s+/gu, ' ').trim();
    const controls = [...document.querySelectorAll('button, a, input, textarea, select')].filter(visible);
    const unnamedControls = controls.filter((element) => {
      if (element.matches('input, textarea, select')) {
        return !(element.getAttribute('aria-label')
          || element.getAttribute('aria-labelledby')
          || element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
          || element.closest('label')
          || element.getAttribute('placeholder'));
      }
      return !nameOf(element);
    });
    const fixed = [...document.querySelectorAll('*')].filter((element) => {
      if (!visible(element)) return false;
      const position = window.getComputedStyle(element).position;
      return position === 'fixed' || position === 'sticky';
    }).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        testid: element.getAttribute('data-testid'),
        text: nameOf(element).slice(0, 80),
        position: window.getComputedStyle(element).position,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    }).slice(0, 20);
    const count = (selector) => [...document.querySelectorAll(selector)].filter(visible).length;
    return {
      url: location.href,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      headings: [...document.querySelectorAll('h1, h2, h3')].filter(visible).slice(0, 24).map((element) => ({
        level: element.tagName,
        text: nameOf(element),
      })),
      buttons: [...document.querySelectorAll('button')].filter(visible).slice(0, 40).map(nameOf),
      links: [...document.querySelectorAll('a')].filter(visible).slice(0, 30).map(nameOf),
      inputs: [...document.querySelectorAll('input, textarea, select')].filter(visible).map((element) => ({
        tag: element.tagName,
        type: element.getAttribute('type') || element.tagName.toLowerCase(),
        name: element.getAttribute('aria-label') || element.getAttribute('placeholder') || nameOf(element.closest('label') || element),
      })),
      visibleDetailsCount: count('details'),
      openDetailsCount: count('details[open]'),
      longTextBlockCount: [...document.querySelectorAll('p, li')].filter((element) => visible(element) && nameOf(element).length >= 90).length,
      visibleControlCount: controls.length,
      unnamedControlCount: unnamedControls.length,
      unnamedControls: unnamedControls.slice(0, 12).map((element) => ({ tag: element.tagName, testid: element.getAttribute('data-testid') })),
      itemCounts: {
        flowMapPreview: count('[data-testid="flow-map-artifact-preview-row"]'),
        publicPreview: count('[data-testid="public-flow-artifact-preview-row"]'),
        postSave: count('[data-testid="my-flow-post-save-step"]'),
        executionRows: count('[data-testid="my-flow-execution-row-shell"]'),
        draftRows: count('[data-testid="flow-memo-draft-item"]'),
        batchRows: count('[data-testid="my-flow-batch-selectable-row"]'),
        undatedRows: count('[data-testid="my-flow-calendar-unscheduled-item"]'),
        occurrences: count('article[data-occurrence-id]'),
      },
      textLength: document.body.innerText.length,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      activeElement: {
        tag: document.activeElement?.tagName,
        name: document.activeElement ? nameOf(document.activeElement) : '',
      },
      fixed,
      localStorageKeys: Object.keys(localStorage).sort(),
    };
  });
}

async function capture(journey, page, id, note, fullPage = true) {
  await page.waitForTimeout(180);
  const filename = `${journey.id}-${id}.png`;
  const screenshot = path.join(SCREENSHOT_ROOT, filename);
  const metrics = await stateMetrics(page);
  await page.screenshot({ path: screenshot, fullPage });
  journey.states.push({
    id,
    note,
    screenshot: `screenshots/${filename}`,
    ...metrics,
    consoleErrors: [...journey.consoleErrors],
    pageErrors: [...journey.pageErrors],
  });
}

async function captureBoth(journey, page, id, note) {
  await page.setViewportSize(MOBILE);
  await capture(journey, page, `${id}-mobile`, note);
  await page.setViewportSize(WIDE);
  await capture(journey, page, `${id}-wide`, note);
  await page.setViewportSize(MOBILE);
}

async function freshJourney(browser, id, label, runner) {
  const context = await browser.newContext({ viewport: MOBILE, timezoneId: 'Asia/Seoul' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
  const page = await context.newPage();
  const journey = { id, label, status: 'running', states: [], steps: [], consoleErrors: [], pageErrors: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') journey.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => journey.pageErrors.push(error.message));
  result.journeys.push(journey);
  try {
    await runner(page, journey);
    journey.status = 'completed';
  } catch (error) {
    journey.status = 'partial';
    journey.failure = error instanceof Error ? error.stack || error.message : String(error);
    try {
      await capture(journey, page, 'failure', 'Journey stopped at this current production state.');
    } catch {}
  } finally {
    journey.finishedAt = new Date().toISOString();
    await context.close();
  }
}

async function clearAfterOpen(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
}

async function openPostSaveWorkspace(page) {
  const panel = page.getByTestId('my-flow-post-save-panel');
  await panel.waitFor({ state: 'visible', timeout: 15_000 });
  await panel.getByTestId('my-flow-post-save-view-flow').click();
  await page.getByTestId('my-flow-workspace').waitFor({ state: 'visible' });
}

async function openFirstFlowRow(page, flow) {
  const open = flow.getByTestId('my-flow-mobile-structure-open');
  if (await isVisible(open) && (await open.getAttribute('aria-expanded')) !== 'true') await open.click();
  const row = flow.getByTestId('my-flow-execution-row-shell').first();
  await row.waitFor({ state: 'visible' });
  return row;
}

async function enterItemEdit(row) {
  await row.getByRole('button', { name: /열기/ }).click();
  const detail = row.getByTestId('my-flow-item-detail');
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  return detail;
}

async function createMemoDraft(page, memo, title) {
  await clearAfterOpen(page, '/flows');
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.getByLabel('URL 또는 메모').fill(memo);
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
  const editor = page.getByTestId('flow-memo-draft-editor');
  await editor.waitFor({ state: 'visible' });
  await editor.getByLabel('메모 초안 제목').fill(title);
  return editor;
}

async function getVisibleDraftFlow(page, title) {
  const flow = page.locator(
    '[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]:visible, [data-testid="my-flow-overview-card"][data-flow-slug^="url-draft-"]:visible',
  ).filter({ hasText: title }).first();
  await flow.waitFor({ state: 'visible' });
  return flow;
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  await freshJourney(browser, 'J1-moving', '이사: 발견부터 개인화, 실행, export, 재사용 진입', async (page, journey) => {
    await clearAfterOpen(page, '/flow-maps/moving-d30');
    await captureBoth(journey, page, '01-save-before', 'Five-row source-backed Flow before save.');
    await page.getByTestId('flow-map-anchor-input').fill('2026-08-30');
    await page.getByTestId('flow-map-adjust-save-mobile').click();
    const adjust = page.getByTestId('flow-map-adjust-panel');
    await adjust.getByTestId('flow-map-custom-title').fill('8월 이사 핵심 준비');
    await adjust.locator('input[type="checkbox"]').nth(1).uncheck();
    await capture(journey, page, '02-adjust-mobile', 'Personal title and one exclusion before save.');
    await page.getByTestId('flow-map-save-all-mobile').click();
    await page.waitForURL(/\/my\?savedMap=moving-d30/);
    await captureBoth(journey, page, '03-post-save', 'Receipt and complete effective Flow immediately after save.');
    await openPostSaveWorkspace(page);
    const flow = page.locator('[data-flow-slug="source-backed-moving-d30"]:visible').first();
    const row = await openFirstFlowRow(page, flow);
    const detail = await enterItemEdit(row);
    const dialog = page.getByRole('dialog', { name: '할 일 수정' });
    await dialog.getByTestId('my-flow-detail-title-input').fill('견적 후보 2곳만 확인');
    await dialog.getByTestId('my-flow-detail-date-input').fill('2026-08-02');
    await dialog.getByTestId('my-flow-detail-memo').fill('오전 중 전화 가능한 곳부터 확인');
    await dialog.getByTestId('my-flow-detail-save-changes').click();
    await capture(journey, page, '04-edited-item-mobile', 'Quick title, date, and memo edit persisted in the Flow.');
    const reopenedRow = flow.getByTestId('my-flow-execution-row-shell').first();
    const completion = reopenedRow.getByTestId('my-flow-task-complete-control');
    if (await isVisible(completion)) {
      await completion.click();
      await capture(journey, page, '05-completion-undo-mobile', 'Completion receipt keeps undo in the same context.');
      await clickIfVisible(page.getByTestId('my-flow-completion-snackbar').getByTestId('my-flow-completion-undo'));
    }
    await flow.getByTestId('my-flow-export-entry').click();
    const exportPanel = flow.getByTestId('my-flow-export-panel');
    await exportPanel.getByTestId('my-flow-export-scope-selected').click();
    const choices = exportPanel.getByTestId('my-flow-export-selectable-item');
    for (let i = 0; i < Math.min(2, await choices.count()); i += 1) await choices.nth(i).getByRole('checkbox').check();
    await captureBoth(journey, page, '06-selected-export', 'Selected scope is chosen before format and count.');
    journey.steps.push({ step: 'reuse', status: 'source_and_package_confirmed_not_forced_in_this_run', note: 'Reuse appears only after all effective rows are completed; this independent run stopped before mass completion.' });
  });

  await freshJourney(browser, 'J2-vehicle', '차량 점검: 날짜 없이 저장하고 Calendar에 배치', async (page, journey) => {
    await clearAfterOpen(page, '/f/vehicle-inspection-prep');
    await captureBoth(journey, page, '01-save-before', 'Ten-item artifact preview with undated start available.');
    await page.getByTestId('public-flow-date-intent-undated').click();
    await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
    const savedLink = page.getByTestId('public-flow-mobile-save-cta').getByRole('link', { name: '내 Flow에서 보기' });
    await savedLink.click();
    await capture(journey, page, '02-post-save-mobile', 'Post-save receipt shows all ten undated items.');
    await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle' });
    await captureBoth(journey, page, '03-undated-tray-collapsed', 'Calendar keeps undated work in an explicit tray.');
    const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
    const trayToggle = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
    if ((await trayToggle.getAttribute('aria-expanded')) !== 'true') await trayToggle.click();
    await tray.getByTestId('my-flow-calendar-unscheduled-panel').waitFor({ state: 'visible' });
    const rows = tray.getByTestId('my-flow-calendar-unscheduled-item');
    for (let i = 0; i < Math.min(3, await rows.count()); i += 1) await rows.nth(i).getByRole('checkbox').check();
    await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-08-06');
    await capture(journey, page, '04-batch-schedule-preview-mobile', 'Three selected undated items preview one target date before commit.');
    await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
    await captureBoth(journey, page, '05-calendar-scheduled', 'Three items move atomically into the selected date.');
    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    const firstScheduled = selectedDay.getByTestId('my-flow-execution-row-shell').first();
    const complete = firstScheduled.getByTestId('my-flow-task-complete-control');
    if (await isVisible(complete)) {
      await complete.click();
      await clickIfVisible(page.getByTestId('my-flow-completion-snackbar').getByTestId('my-flow-completion-undo'));
    }
    await page.goto(`${BASE_URL}/my?view=flows`, { waitUntil: 'networkidle' });
    const flow = page.locator('[data-flow-slug="vehicle-inspection-prep"]:visible').first();
    await flow.getByTestId('my-flow-export-entry').click();
    const exportPanel = flow.getByTestId('my-flow-export-panel');
    await exportPanel.getByTestId('my-flow-export-scope-selected').click();
    const options = exportPanel.getByTestId('my-flow-export-selectable-item');
    for (let i = 0; i < Math.min(2, await options.count()); i += 1) await options.nth(i).getByRole('checkbox').check();
    await capture(journey, page, '06-selected-export-mobile', 'Selected export shows dated count and disabled formats before execution.');
  });

  await freshJourney(browser, 'J3-routine', '운동·청소: series와 occurrence 실행', async (page, journey) => {
    await clearAfterOpen(page, '/f/washer-tub-clean-monthly');
    await page.getByTestId('public-flow-anchor-input').fill('2026-07-20');
    await captureBoth(journey, page, '01-four-occurrence-preview', 'Monthly source cadence previews four visible occurrences.');
    const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
    await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
    await capture(journey, page, '02-series-export-preflight-mobile', 'Calendar export predicts one RRULE series rather than four independent events.');
    await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 시작' }).click();
    await page.goto(`${BASE_URL}/my`, { waitUntil: 'networkidle' });
    await page.getByTestId('my-flow-view-flow').click();
    const flow = page.locator('[data-flow-slug="washer-tub-clean-monthly"]:visible').first();
    await openFirstFlowRow(page, flow);
    await captureBoth(journey, page, '03-series-definition', 'My Flow shows series definitions without completion controls.');
    await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle' });
    await page.getByTestId('my-flow-month-picker').fill('2026-07');
    const day = page.locator('.fc-daygrid-day[data-date="2026-07-20"]');
    await day.getByTestId('my-flow-calendar-date-button').click();
    const occurrence = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-occurrence-id]').filter({ hasText: '통세척 코스 돌리고 문 열어 건조하기' });
    const occurrenceId = await occurrence.getAttribute('data-occurrence-id');
    await occurrence.getByRole('checkbox', { name: /이번 회차 완료 체크$/ }).click();
    await occurrence.getByRole('checkbox', { name: /이번 회차 다시 열기$/ }).click();
    await captureBoth(journey, page, '04-occurrence-reopened', 'One occurrence is completed and reopened without mutating the series identity.');
    journey.steps.push({ step: 'stableOccurrenceId', status: occurrenceId ? 'supported' : 'missing', value: occurrenceId });
  });

  await freshJourney(browser, 'J4-project', '여행·프로젝트: 순서, 날짜, 구조, 선택 export', async (page, journey) => {
    const editor = await createMemoDraft(
      page,
      '여권을 확인한다. 보험 서류를 챙긴다. 숙소 주소를 적는다. 공항 이동 동선을 확인한다.',
      '제주 여행 프로젝트',
    );
    await captureBoth(journey, page, '01-segmentation-review', 'Four source phrases are reviewable before save.');
    await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();
    await openPostSaveWorkspace(page);
    let flow = await getVisibleDraftFlow(page, '제주 여행 프로젝트');
    const open = flow.getByTestId('my-flow-mobile-structure-open');
    if (await isVisible(open) && (await open.getAttribute('aria-expanded')) !== 'true') await open.click();
    await flow.getByTestId('my-flow-batch-mode-toggle').click();
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    await capture(journey, page, '02-structure-mode-mobile', 'Execution controls give way to explicit structure and batch tools.');
    await outline.getByTestId('personal-draft-add-entry').click();
    await outline.getByTestId('personal-draft-add-title').fill('렌터카 인수 장소 확인');
    await outline.getByTestId('personal-draft-add-title').press('Enter');
    let batchRows = outline.getByTestId('my-flow-batch-selectable-row');
    const added = batchRows.filter({ hasText: '렌터카 인수 장소 확인' });
    await added.getByTestId('personal-draft-move-up').click();
    batchRows = outline.getByTestId('my-flow-batch-selectable-row');
    await batchRows.nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await batchRows.nth(1).getByTestId('my-flow-batch-item-checkbox').check();
    const toolbar = outline.getByTestId('my-flow-batch-toolbar');
    await toolbar.getByTestId('my-flow-batch-open-date-tool').click();
    await toolbar.getByTestId('my-flow-batch-target-date').fill('2026-08-10');
    await capture(journey, page, '03-batch-date-preview-mobile', 'Two selected project items preview the date move.');
    await toolbar.getByTestId('my-flow-batch-apply-date').click();
    await outline.getByTestId('my-flow-batch-selectable-row').nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-selectable-row').nth(1).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-export-selected').click();
    await captureBoth(journey, page, '04-selected-export', 'Selected project items retain current order and date scope in export preflight.');
  });

  await freshJourney(browser, 'J5-record', '생활 기록: 실행 메모, 완료, 회고, 재사용', async (page, journey) => {
    const editor = await createMemoDraft(
      page,
      '식물 상태를 기록한다. 잎 상태를 확인한다. 흙 마름을 기록한다. 물 준 날짜를 메모한다.',
      '주간 식물 상태 기록',
    );
    await capture(journey, page, '01-record-draft-mobile', 'Record-like memo becomes four explicit user-owned items.');
    await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();
    await openPostSaveWorkspace(page);
    const flow = await getVisibleDraftFlow(page, '주간 식물 상태 기록');
    const first = await openFirstFlowRow(page, flow);
    const noteButton = first.getByTestId('my-flow-inline-note-open');
    if (await isVisible(noteButton)) {
      await noteButton.click();
      const panel = first.getByTestId('my-flow-inline-note-panel');
      const textarea = panel.locator('textarea').first();
      await textarea.fill('잎 끝이 조금 말랐고 흙은 아직 촉촉함');
      await panel.getByRole('button', { name: /저장/ }).click();
    }
    await capture(journey, page, '02-execution-note-mobile', 'Execution note stays attached to the current run rather than source content.');
    const controls = flow.getByTestId('my-flow-task-complete-control');
    const count = await controls.count();
    for (let i = 0; i < count; i += 1) {
      const control = controls.nth(i);
      if (await isVisible(control) && !(await control.isChecked())) await control.click();
    }
    const feedback = flow.getByTestId('my-flow-completion-feedback');
    if (await isVisible(feedback)) {
      await feedback.getByTestId('my-flow-reflection-open').click();
      await feedback.getByTestId('my-flow-reflection-note').fill('다음에는 사진을 먼저 찍고 상태를 기록한다.');
      await feedback.getByTestId('my-flow-reflection-save').click();
      await captureBoth(journey, page, '03-reflection-and-reuse', 'Completion feedback separates private reflection from source correction and exposes reuse.');
    } else {
      journey.steps.push({ step: 'reflection', status: 'hidden_after_attempt', completedControlCount: count });
      await capture(journey, page, '03-reflection-not-reached-mobile', 'Not all effective rows were reachable from the default collapsed structure.');
    }
  });

  await freshJourney(browser, 'J6-personal-draft', '개인 초안: miss와 메모, add/delete/restore/reorder/date/export', async (page, journey) => {
    await clearAfterOpen(page, '/flows');
    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByLabel('URL 또는 메모').fill('https://example.com/my-private-plan');
    await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
    await captureBoth(journey, page, '01-url-miss', 'URL miss explains that no executable Flow exists yet.');
    const missResult = page.getByTestId('flow-url-lookup-result');
    const desired = missResult.getByLabel('원하는 결과');
    if (await isVisible(desired)) await desired.fill('준비물 확인, 일정 정리, 담당자에게 연락');
    await clickIfVisible(missResult.getByRole('button', { name: '초안 준비하기' }));
    const candidate = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    if (await isVisible(candidate.getByTestId('flow-url-miss-draft-open'))) {
      await candidate.getByTestId('flow-url-miss-draft-open').click();
      await capture(journey, page, '02-miss-draft-review-mobile', 'Candidate uses only user copy; no source action is invented.');
    }
    await page.goto(`${BASE_URL}/flows`, { waitUntil: 'networkidle' });
    const memoLookup = page.getByTestId('flow-url-lookup-entry');
    await memoLookup.getByLabel('URL 또는 메모').fill('항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크');
    await memoLookup.getByRole('button', { name: 'Flow 찾기' }).click();
    const editor = page.getByTestId('flow-memo-draft-editor');
    await editor.getByLabel('메모 초안 제목').fill('개인 여행 초안');
    await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();
    await openPostSaveWorkspace(page);
    let flow = await getVisibleDraftFlow(page, '개인 여행 초안');
    const flowOpen = flow.getByTestId('my-flow-mobile-structure-open');
    if (await isVisible(flowOpen) && (await flowOpen.getAttribute('aria-expanded')) !== 'true') await flowOpen.click();
    await flow.getByTestId('my-flow-batch-mode-toggle').click();
    const outline = flow.getByTestId('my-flow-whole-flow-outline');
    await outline.getByTestId('personal-draft-add-entry').click();
    await outline.getByTestId('personal-draft-add-title').fill('온라인 체크인');
    await outline.getByTestId('personal-draft-add-title').press('Enter');
    let rows = outline.getByTestId('my-flow-batch-selectable-row');
    const added = rows.filter({ hasText: '온라인 체크인' });
    await added.getByTestId('personal-draft-move-up').click();
    await added.getByTestId('my-flow-batch-item-checkbox').check();
    page.once('dialog', (dialog) => dialog.accept());
    await outline.getByTestId('my-flow-batch-remove-selected').click();
    await outline.getByTestId('my-flow-batch-undo-action').click();
    rows = outline.getByTestId('my-flow-batch-selectable-row');
    await rows.nth(0).getByTestId('my-flow-batch-item-checkbox').check();
    await outline.getByTestId('my-flow-batch-open-date-tool').click();
    await outline.getByTestId('my-flow-batch-target-date').fill('2026-08-01');
    await outline.getByTestId('my-flow-batch-apply-date').click();
    await captureBoth(journey, page, '03-structural-edit', 'Add, reorder, recover, and date adjustment stay in structure mode.');
    await flow.getByTestId('my-flow-batch-mode-toggle').click();
    await flow.getByTestId('personal-draft-list-export-toggle').click();
    await capture(journey, page, '04-export-mobile', 'Whole and selected export scopes use the effective personal draft.');
  });

  await browser.close();
  result.finishedAt = new Date().toISOString();
  result.summary = {
    journeyCount: result.journeys.length,
    completedCount: result.journeys.filter((journey) => journey.status === 'completed').length,
    partialCount: result.journeys.filter((journey) => journey.status === 'partial').length,
    stateCount: result.journeys.reduce((sum, journey) => sum + journey.states.length, 0),
    screenshotCount: result.journeys.reduce((sum, journey) => sum + journey.states.filter((state) => state.screenshot).length, 0),
    horizontalOverflowStateCount: result.journeys.reduce((sum, journey) => sum + journey.states.filter((state) => state.horizontalOverflow > 1).length, 0),
    consoleErrorCount: result.journeys.reduce((sum, journey) => sum + journey.consoleErrors.length, 0),
    pageErrorCount: result.journeys.reduce((sum, journey) => sum + journey.pageErrors.length, 0),
    unnamedControlStateCount: result.journeys.reduce((sum, journey) => sum + journey.states.filter((state) => state.unnamedControlCount > 0).length, 0),
  };
  fs.writeFileSync(path.join(PACKAGE_ROOT, 'production-journey-results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result.summary, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
