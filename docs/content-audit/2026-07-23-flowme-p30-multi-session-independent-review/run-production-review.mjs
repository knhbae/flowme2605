import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const outputRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = path.join(outputRoot, 'screenshots');
const downloadRoot = path.join(outputRoot, 'downloads');
const baseUrl = process.env.FLOWME_PRODUCTION_URL || 'https://flowme2605.vercel.app';
const sourceCommit = process.env.FLOWME_SOURCE_COMMIT || null;

const viewports = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

await mkdir(screenshotRoot, { recursive: true });
await mkdir(downloadRoot, { recursive: true });

const cells = [];
const routeEvidence = [];
const globalErrors = [];

function cleanFilename(value) {
  return value.replace(/[^a-z0-9-]+/giu, '-').replace(/^-+|-+$/gu, '').toLowerCase();
}

async function waitForReady(page) {
  await page.locator('body').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function goto(page, route) {
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await waitForReady(page);
  return response?.status() ?? null;
}

async function clearLocalState(page) {
  await goto(page, '/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForReady(page);
}

async function visible(locator) {
  return locator.isVisible().catch(() => false);
}

async function text(locator) {
  return locator.innerText().then((value) => value.trim()).catch(() => '');
}

async function count(locator) {
  return locator.count().catch(() => 0);
}

async function pageHealth(page) {
  return page.evaluate(() => {
    const focusables = Array.from(document.querySelectorAll(
      'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    )).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledByText = labelledBy
        ?.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ')
        .trim();
      const formLabel = element instanceof HTMLInputElement
        || element instanceof HTMLSelectElement
        || element instanceof HTMLTextAreaElement
        ? Array.from(element.labels ?? []).map((label) => label.textContent?.trim() ?? '').join(' ').trim()
        : '';
      return element.getAttribute('aria-label')
        || labelledByText
        || formLabel
        || element.getAttribute('title')
        || element.textContent?.trim()
        || '';
    };

    const fixedElements = Array.from(document.querySelectorAll('*')).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.position === 'fixed' && rect.width > 0 && rect.height > 0;
    });

    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      unnamedFocusableCount: focusables.filter((element) => !accessibleName(element)).length,
      focusableCount: focusables.length,
      fixedLayerCount: fixedElements.length,
      visibleCardCount: Array.from(document.querySelectorAll('article, [data-testid$="card"]')).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length,
      visibleDetailsCount: Array.from(document.querySelectorAll('details')).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length,
    };
  });
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const entries = Object.entries(window.localStorage).sort(([a], [b]) => a.localeCompare(b));
    return {
      keyCount: entries.length,
      keys: entries.map(([key]) => key),
      savedFlowKeys: entries.filter(([key]) => key.startsWith('flow:saved:')).map(([key]) => key),
      runRegistryKeys: entries.filter(([key]) => key.startsWith('flow:run-registry:')).map(([key]) => key),
      occurrenceExecutionPresent: entries.some(([key]) => key === 'flow:my-flow:occurrence-execution'),
    };
  });
}

async function capture(page, cell, suffix, options = {}) {
  const filename = `${cell.personaId.toLowerCase()}-${cell.sessionId.toLowerCase()}-${cleanFilename(suffix)}-${page.viewportSize()?.width ?? 'x'}.png`;
  await page.screenshot({
    path: path.join(screenshotRoot, filename),
    fullPage: options.fullPage ?? false,
    animations: 'disabled',
  });
  cell.screenshots.push(`screenshots/${filename}`);
  return `screenshots/${filename}`;
}

function startCell({ personaId, sessionId, userGoal, route, viewport, fixture = 'none', expectedMentalModel }) {
  return {
    personaId,
    sessionId,
    userGoal,
    route,
    viewport: `${viewport.width}x${viewport.height}`,
    fixture,
    startingState: null,
    steps: [],
    expectedMentalModel,
    actualUiFeedback: [],
    nextAction: null,
    visibleReachable: null,
    reloadPersistence: null,
    parity: {},
    failureRecovery: {},
    explanationFree: null,
    status: 'partial',
    severity: 'Medium',
    evidenceKind: fixture === 'none'
      ? ['current_production_interaction', 'current_browser_automation']
      : ['fixture_only', 'current_browser_automation'],
    observedUserAssumption: '',
    health: null,
    storage: null,
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
  };
}

async function attempt(cell, label, operation, options = {}) {
  const startedAt = Date.now();
  try {
    const evidence = await operation();
    cell.steps.push({ label, ok: true, required: options.required !== false, depth: options.depth ?? 1, elapsedMs: Date.now() - startedAt, evidence });
    return evidence;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    cell.steps.push({ label, ok: false, required: options.required !== false, depth: options.depth ?? 1, elapsedMs: Date.now() - startedAt, error: message });
    if (options.required !== false) cell.actualUiFeedback.push(`${label}: ${message}`);
    return null;
  }
}

async function finishCell(page, cell, runtimeErrors, decision) {
  cell.health = await pageHealth(page).catch((error) => ({ error: String(error) }));
  cell.storage = await storageSnapshot(page).catch((error) => ({ error: String(error) }));
  cell.consoleErrors = runtimeErrors.console.slice(cell.errorStart.console);
  cell.pageErrors = runtimeErrors.page.slice(cell.errorStart.page);
  delete cell.errorStart;
  Object.assign(cell, decision);
  const requiredFailures = cell.steps.filter((step) => step.required && !step.ok);
  if (requiredFailures.length > 0) {
    const requiredSuccesses = cell.steps.filter((step) => step.required && step.ok);
    cell.status = requiredSuccesses.length > 0 ? 'partial' : 'blocked';
    cell.severity = requiredSuccesses.length > 0 ? 'Medium' : 'High';
    cell.failureRecovery = {
      ...cell.failureRecovery,
      automationFailures: requiredFailures.map((step) => ({ label: step.label, error: step.error })),
    };
  }
  cells.push(cell);
  routeEvidence.push({
    personaId: cell.personaId,
    sessionId: cell.sessionId,
    route: cell.route,
    finalUrl: page.url(),
    viewport: cell.viewport,
    fixture: cell.fixture,
    status: cell.status,
    horizontalOverflow: cell.health?.horizontalOverflow ?? null,
    unnamedFocusableCount: cell.health?.unnamedFocusableCount ?? null,
    consoleErrorCount: cell.consoleErrors.length,
    pageErrorCount: cell.pageErrors.length,
    screenshot: cell.screenshots[0] ?? null,
    evidenceKind: cell.evidenceKind,
  });
}

async function runCell(page, runtimeErrors, config, run, decision) {
  await page.setViewportSize(config.viewport);
  const cell = startCell(config);
  cell.errorStart = { console: runtimeErrors.console.length, page: runtimeErrors.page.length };
  cell.startingState = await storageSnapshot(page).catch(() => null);
  try {
    await run(cell);
  } catch (error) {
    cell.actualUiFeedback.push(error instanceof Error ? error.message : String(error));
  }
  await finishCell(page, cell, runtimeErrors, decision);
  return cell;
}

async function openMyFlowView(page) {
  const postSave = page.getByTestId('my-flow-post-save-view-flow');
  if (await visible(postSave)) await postSave.click();
  const flowTab = page.getByTestId('my-flow-view-flow');
  if (await visible(flowTab)) await flowTab.click();
  await page.waitForTimeout(250);
}

async function openMyFlowCard(page, slug) {
  await openMyFlowView(page);
  let card = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]:visible`);
  if (await count(card)) return card;
  const mobileRow = page.locator(`[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${slug}"]`);
  if (await visible(mobileRow)) {
    await mobileRow.getByTestId('my-flow-mobile-structure-open').click();
    card = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]:visible`);
    await card.waitFor({ state: 'visible', timeout: 15_000 });
    return card;
  }
  const libraryRow = page.locator(`[data-testid="my-flow-library-row"][data-flow-slug="${slug}"]`);
  if (await visible(libraryRow)) {
    await libraryRow.click();
    card = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]:visible`);
    await card.waitFor({ state: 'visible', timeout: 15_000 });
    return card;
  }
  throw new Error(`My Flow card not reachable: ${slug}`);
}

async function openFirstItemDetail(page, card) {
  const row = card.getByTestId('my-flow-execution-row-shell').first();
  await row.getByRole('button', { name: /열기/u }).click();
  const detail = card.locator('[data-testid="my-flow-item-detail"]:visible').first();
  if (await visible(detail)) return detail;
  const pageDetail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
  await pageDetail.waitFor({ state: 'visible', timeout: 10_000 });
  return pageDetail;
}

async function enterItemEdit(detail) {
  const summary = detail.getByTestId('my-flow-detail-read-summary');
  if (await count(summary)) {
    const disclosure = summary.locator('summary');
    if (await visible(disclosure)) await disclosure.click();
    const toggle = summary.getByTestId('my-flow-detail-edit-toggle');
    if (await visible(toggle)) await toggle.click();
  }
  await detail.getByTestId('my-flow-detail-title-input').waitFor({ state: 'visible', timeout: 10_000 });
}

async function openExportPanel(card) {
  const surface = card.getByTestId('my-flow-export-surface');
  let panel = surface.getByTestId('my-flow-export-panel');
  if (await count(surface)) {
    if (!(await visible(panel))) await surface.getByTestId('my-flow-export-entry').click();
  } else {
    const draftSurface = card.getByTestId('personal-draft-list-export');
    panel = draftSurface.getByTestId('my-flow-export-panel');
    if (!(await visible(panel))) await draftSurface.getByTestId('personal-draft-list-export-toggle').click();
  }
  await panel.waitFor({ state: 'visible', timeout: 10_000 });
  return panel;
}

async function downloadText(page, button, filename) {
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
  await button.click();
  const download = await downloadPromise;
  const target = path.join(downloadRoot, filename);
  await download.saveAs(target);
  return readFile(target, 'utf8');
}

async function completeAllRows(page, card, limit = 40) {
  const showAll = card.getByTestId('my-flow-mobile-structure-show-all');
  if (await visible(showAll)) await showAll.click();
  const expandGroups = card.getByTestId('my-flow-whole-flow-toggle-all-groups');
  if (await visible(expandGroups) && (await text(expandGroups)).includes('전체 펼치기')) await expandGroups.click();
  let completed = 0;
  for (let index = 0; index < limit; index += 1) {
    const unchecked = card.locator('[data-testid="my-flow-execution-row-shell"] input[type="checkbox"]:not(:checked):visible').first();
    if (!(await count(unchecked))) break;
    await unchecked.check();
    completed += 1;
    await pageDelay(page, 40);
  }
  return completed;
}

async function pageDelay(page, ms) {
  await page.waitForTimeout(ms);
}

async function runPersona(personaId, implementation) {
  const context = await browser.newContext({
    viewport: viewports.mobile,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    acceptDownloads: true,
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  const runtimeErrors = { console: [], page: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.console.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.page.push(error.message));
  try {
    await clearLocalState(page);
    await implementation(page, runtimeErrors);
  } catch (error) {
    globalErrors.push({ personaId, error: error instanceof Error ? error.message : String(error) });
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
    ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
});

await runPersona('P1', async (page, runtimeErrors) => {
  await runCell(page, runtimeErrors, {
    personaId: 'P1', sessionId: 'S1', userGoal: '이사일 기준의 전체 일정을 보고 필요한 항목만 조정해 저장한다.',
    route: '/ -> /flows -> /f/moving-d30-basic', viewport: viewports.mobile,
    expectedMentalModel: '원본 Flow를 먼저 보고, 내 이사일과 작은 수정만 더한 개인 사본을 저장한다.',
  }, async (cell) => {
    await attempt(cell, '홈에서 Flow 찾기로 이동', async () => {
      await goto(page, '/');
      const link = page.getByRole('link', { name: /Flow 찾기/u }).first();
      await link.click();
      await page.waitForURL(/\/flows/u);
      return { finalUrl: page.url() };
    });
    await attempt(cell, '카탈로그에서 이사 public Flow 진입점 확인 후 route 이동', async () => {
      const search = page.getByTestId('flow-catalog-search');
      await search.fill('이사');
      await page.waitForTimeout(1000);
      const publicRouteLinkCount = await count(page.locator('a[href="/f/moving-d30-basic"]'));
      const visibleCatalogCards = await count(page.locator('[data-testid="flow-map-catalog-card"]:visible'));
      const catalogText = await text(page.getByTestId('flow-map-catalog-section'));
      await goto(page, '/f/moving-d30-basic');
      return {
        publicRouteLinkCount,
        visibleCatalogCards,
        emptyResultShown: /맞는 콘텐츠가 없습니다/u.test(catalogText),
        title: await text(page.getByRole('heading', { name: /이사 D-30/u }).first()),
      };
    }, { depth: 2 });
    await attempt(cell, '24개 전체 artifact와 기준일 확인', async () => {
      await page.getByTestId('public-flow-anchor-input').fill('2026-08-28');
      return {
        artifactRows: await count(page.getByTestId('public-flow-artifact-preview-row')),
        primaryActions: await count(page.locator('[data-action-priority="primary"]:visible')),
      };
    });
    await attempt(cell, '개인 제목·첫 항목·날짜·포함 항목 조정', async () => {
      await page.getByTestId('public-flow-adjust-entry-mobile').click();
      const adjustment = page.getByTestId('public-flow-personal-adjustment');
      await adjustment.getByTestId('public-flow-adjustment-flow-title').fill('8월 이사 준비');
      await adjustment.getByTestId('public-flow-adjustment-mode-content').click();
      const first = adjustment.getByTestId('public-flow-adjustment-row').first();
      await first.getByTestId('public-flow-adjustment-title').fill('견적 후보 먼저 비교');
      await adjustment.getByTestId('public-flow-adjustment-mode-schedule').click();
      await first.getByTestId('public-flow-adjustment-date').fill('2026-08-01');
      await adjustment.getByTestId('public-flow-adjustment-mode-include').click();
      const disclosure = adjustment.getByTestId('public-flow-adjustment-item-disclosure');
      await disclosure.locator('summary').click();
      const boxes = adjustment.getByTestId('public-flow-adjustment-row').getByRole('checkbox');
      const total = await boxes.count();
      await boxes.nth(total - 1).uncheck();
      return { total, included: total - 1 };
    }, { depth: 8 });
    await capture(page, cell, 'adjusted-before-save', { fullPage: true });
    await attempt(cell, '개인 사본 저장과 receipt 확인', async () => {
      await page.getByTestId('public-flow-adjustment-save').click();
      const receipt = page.getByTestId('public-flow-saved-receipt');
      await receipt.waitFor({ state: 'visible' });
      const receiptText = await text(receipt);
      await capture(page, cell, 'saved-receipt');
      await receipt.getByTestId('public-flow-saved-receipt-primary').click();
      await waitForReady(page);
      return { receiptText, finalUrl: page.url() };
    }, { depth: 2 });
    cell.parity = { title: '8월 이사 준비', anchor: '2026-08-28', expectedItemCount: 23 };
  }, {
    status: 'partial', severity: 'Medium', visibleReachable: true, reloadPersistence: 'not_yet_revisited',
    explanationFree: false, nextAction: 'My Flow에서 첫 할 일을 실행',
    failureRecovery: { discovery: '/flows 검색 결과에는 moving-d30-basic public route로 이어지는 직접 진입점이 없어 URL route로 계속했다.' },
    observedUserAssumption: '사용자가 24개 중 제외할 항목을 선택하는 비용을 감수할지는 관찰되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P1', sessionId: 'S2', userGoal: '저장한 이사 Flow를 다시 열어 완료를 되돌리고 날짜를 재조정한다.',
    route: '/my -> /calendar', viewport: viewports.mobile,
    expectedMentalModel: '개인 수정은 유지되고 완료와 날짜만 실행 중에 바뀐다.',
  }, async (cell) => {
    await attempt(cell, 'reload 후 같은 개인 사본 열기', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForReady(page);
      const card = await openMyFlowCard(page, 'moving-d30-basic');
      cell._card = card;
      return { titleVisible: (await text(card)).includes('8월 이사 준비') };
    });
    await attempt(cell, '첫 할 일 완료 후 즉시 취소', async () => {
      const card = cell._card;
      const checkbox = card.locator('[data-testid="my-flow-execution-row-shell"] input[type="checkbox"]:visible').first();
      await checkbox.check();
      const notice = page.getByTestId('my-flow-completion-snackbar');
      const completedText = await text(notice);
      await notice.getByTestId('my-flow-completion-undo').click();
      return { completedText, reopened: !(await checkbox.isChecked()) };
    }, { depth: 2 });
    await attempt(cell, '첫 할 일 날짜와 메모 고정', async () => {
      const detail = await openFirstItemDetail(page, cell._card);
      await enterItemEdit(detail);
      await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-03');
      await detail.getByTestId('my-flow-detail-memo').fill('오전 중 후보 두 곳만 비교');
      await detail.getByTestId('my-flow-detail-save-changes').click();
      const stored = await page.evaluate(() => ({
        dateOverrides: JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'),
        itemDrafts: JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}'),
      }));
      return {
        fixedDate: '2026-08-03',
        storedOverrideDates: Object.values(stored.dateOverrides),
        storedDraftCount: Object.keys(stored.itemDrafts).length,
      };
    }, { depth: 4 });
    await attempt(cell, 'Flow 기준일 변경 시 고정 날짜 보존', async () => {
      const card = cell._card;
      const open = card.getByTestId('my-flow-direct-anchor-settings-open');
      const personalOpen = card.getByTestId('my-flow-personal-copy-settings-open');
      return {
        directAnchorControlCount: await count(open),
        personalSettingsControlCount: await count(personalOpen),
        changed: false,
      };
    }, { depth: 3 });
    await attempt(cell, 'Calendar에서 고정 날짜 확인', async () => {
      await goto(page, '/calendar');
      await page.getByTestId('my-flow-month-picker').fill('2026-08');
      const fixedDateEvents = page.locator('.fc-daygrid-day[data-date="2026-08-03"] .fc-event');
      const saveBeforeDateEvents = page.locator('.fc-daygrid-day[data-date="2026-08-01"] .fc-event');
      return {
        fixedDateEventCount: await fixedDateEvents.count(),
        staleSaveBeforeDateEventCount: await saveBeforeDateEvents.count(),
      };
    });
    await capture(page, cell, 'calendar-after-date-adjustment');
    delete cell._card;
    cell.parity = { title: '8월 이사 준비', fixedDate: '2026-08-03', anchor: '2026-09-05' };
  }, {
    status: 'partial', severity: 'High', visibleReachable: true, reloadPersistence: 'preserved',
    explanationFree: false, nextAction: '남은 항목 실행 또는 전체 export',
    failureRecovery: { anchorEdit: 'public /f에서 조정 저장한 Flow에는 My Flow 기준일 재조정 진입점이 보이지 않는다.' },
    observedUserAssumption: '기준일과 개별 고정 날짜의 차이를 설명 없이 이해하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P1', sessionId: 'S3', userGoal: '완료한 이사 Flow를 내보내고 새 이사일로 재사용하며 과거 실행을 보존한다.',
    route: '/my', viewport: viewports.mobile,
    expectedMentalModel: '완료한 실행은 기록으로 남고 새 실행만 새 날짜와 빈 체크 상태로 시작한다.',
  }, async (cell) => {
    await attempt(cell, 'My Flow 재진입과 개인 변경 보존', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'moving-d30-basic');
      cell._card = card;
      return { titleVisible: (await text(card)).includes('8월 이사 준비') };
    });
    await attempt(cell, 'Flow 전체 Calendar export', async () => {
      const panel = await openExportPanel(cell._card);
      const summary = await text(panel.getByTestId('my-flow-export-scope-summary'));
      const ics = await downloadText(page, panel.getByTestId('my-flow-export-calendar'), 'p1-s3-moving-whole.ics');
      return {
        summary,
        eventCount: (ics.match(/BEGIN:VEVENT/gu) ?? []).length,
        firstEventDate: ics.match(/DTSTART;VALUE=DATE:(\d{8})/u)?.[1] ?? null,
      };
    }, { depth: 3 });
    await attempt(cell, '모든 남은 항목 완료', async () => {
      const completed = await completeAllRows(page, cell._card, 30);
      return { completedByUi: completed, feedbackVisible: await visible(cell._card.getByTestId('my-flow-completion-feedback')) };
    }, { depth: 24 });
    await attempt(cell, '회고 저장 후 새 이사일로 다시 쓰기', async () => {
      const feedback = cell._card.getByTestId('my-flow-completion-feedback');
      await feedback.getByTestId('my-flow-reflection-open').click();
      await feedback.getByTestId('my-flow-reflection-note').fill('다음 이사에도 같은 순서로 확인한다.');
      await feedback.getByTestId('my-flow-reflection-save').click();
      await feedback.getByTestId('my-flow-reuse-open').click();
      const panel = feedback.getByTestId('my-flow-reuse-panel');
      await panel.getByTestId('my-flow-reuse-anchor-input').fill('2026-11-20');
      const policy = panel.getByLabel(/새 이사일에 맞추기/u);
      if (await visible(policy)) await policy.check();
      await panel.getByTestId('my-flow-reuse-start').click();
      const refreshedCard = await openMyFlowCard(page, 'moving-d30-basic');
      return {
        pastRunCount: await count(refreshedCard.getByTestId('my-flow-past-run')),
        status: await text(refreshedCard.getByTestId('my-flow-reuse-status')),
      };
    }, { depth: 7 });
    await capture(page, cell, 'new-run-and-past-history', { fullPage: true });
    delete cell._card;
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'preserved_across_three_sessions',
    explanationFree: false, nextAction: '새 실행의 첫 할 일 시작',
    observedUserAssumption: '23개 완료 후에야 나타나는 회고·재사용 경로를 실제 사용자가 발견하는지는 확인되지 않았다.',
  });
});

await runPersona('P2', async (page, runtimeErrors) => {
  await runCell(page, runtimeErrors, {
    personaId: 'P2', sessionId: 'S1', userGoal: '차량 점검 Flow를 날짜 없이 저장한다.',
    route: '/f/vehicle-inspection-prep', viewport: viewports.mobile,
    expectedMentalModel: '날짜를 정하지 않아도 10개 할 일은 My Flow에서 실행할 수 있다.',
  }, async (cell) => {
    await attempt(cell, '10개 preview와 날짜 없음 선택 확인', async () => {
      await goto(page, '/f/vehicle-inspection-prep');
      return {
        itemCount: await count(page.getByTestId('public-flow-artifact-preview-row')),
        saveLabel: await text(page.getByTestId('public-flow-mobile-save-cta')),
      };
    });
    await attempt(cell, '날짜 없이 저장하고 receipt에서 My Flow 이동', async () => {
      await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
      const receipt = page.getByTestId('public-flow-saved-receipt');
      await receipt.waitFor({ state: 'visible' });
      await capture(page, cell, 'undated-saved-receipt');
      await receipt.getByTestId('public-flow-saved-receipt-primary').click();
      return { finalUrl: page.url() };
    }, { depth: 2 });
    cell.parity = { title: '차량 점검 준비', itemCount: 10, dateIntent: 'undated' };
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'not_yet_revisited', explanationFree: true,
    nextAction: 'My Flow에서 실행하거나 Calendar에 일부 배치',
    observedUserAssumption: '날짜 없는 일이 유효한 상태라는 문구를 사용자가 신뢰하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P2', sessionId: 'S2', userGoal: '날짜 없는 항목 하나를 Calendar에 배치하고 완료를 되돌린다.',
    route: '/my -> /calendar', viewport: viewports.mobile,
    expectedMentalModel: '날짜 배치는 항목의 실행 상태를 잃지 않고 Calendar 표시만 추가한다.',
  }, async (cell) => {
    await attempt(cell, 'reload 후 10개 날짜 없는 항목 보존', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'vehicle-inspection-prep');
      const rows = await count(card.getByTestId('my-flow-execution-row-shell'));
      return { rows };
    });
    await attempt(cell, 'Calendar tray에서 한 항목 배치', async () => {
      await goto(page, '/calendar');
      const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
      const before = await text(tray.getByTestId('my-flow-calendar-unscheduled-count'));
      await tray.getByTestId('my-flow-calendar-unscheduled-toggle').click();
      const first = tray.getByTestId('my-flow-calendar-unscheduled-item').first();
      const key = await first.getAttribute('data-item-key');
      const titleValue = await text(first.getByTestId('my-flow-calendar-unscheduled-item-title'));
      await first.getByRole('checkbox').check();
      await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-08-03');
      await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
      const after = await text(tray.getByTestId('my-flow-calendar-unscheduled-count'));
      return { before, after, key, title: titleValue };
    }, { depth: 4 });
    await attempt(cell, '배치한 항목 완료 후 취소', async () => {
      const selected = page.getByTestId('my-flow-calendar-selected-day');
      const checkbox = selected.locator('[data-flow-slug="vehicle-inspection-prep"] input[type="checkbox"]:visible').first();
      await checkbox.check();
      const notice = page.getByTestId('my-flow-completion-snackbar');
      await notice.getByTestId('my-flow-completion-undo').click();
      return { reopened: !(await checkbox.isChecked()) };
    }, { depth: 2 });
    await capture(page, cell, 'scheduled-and-reopened');
    cell.parity = { date: '2026-08-03', stableIdentityExpected: true, completion: 'reopened' };
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'preserved', explanationFree: true,
    nextAction: '날짜를 제거하거나 선택 항목 export',
    observedUserAssumption: 'tray와 selected-day 사이의 객체 동일성을 사용자가 인지하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P2', sessionId: 'S3', userGoal: '항목 날짜를 제거해 tray로 돌리고 export 범위를 비교한다.',
    route: '/calendar -> /my', viewport: viewports.wide,
    expectedMentalModel: '날짜 제거는 삭제가 아니며 checklist에는 남고 ICS에서는 빠진다.',
  }, async (cell) => {
    await attempt(cell, 'Calendar reload 후 배치 상태 보존', async () => {
      await page.setViewportSize(viewports.wide);
      await goto(page, '/calendar');
      await page.getByTestId('my-flow-month-picker').fill('2026-08');
      return { eventCount: await count(page.locator('.fc-daygrid-day[data-date="2026-08-03"] .fc-event')) };
    });
    await attempt(cell, 'Calendar item detail에서 날짜 제거 후 tray 복귀', async () => {
      const event = page.locator('.fc-daygrid-day[data-date="2026-08-03"] .fc-event').first();
      await event.click();
      const detail = page.getByTestId('my-flow-calendar-selected-day').locator('[data-testid="my-flow-item-detail"]:visible').first();
      await enterItemEdit(detail);
      await detail.getByTestId('my-flow-undated-item-date-clear').click();
      await detail.getByTestId('my-flow-detail-save-changes').click();
      const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
      return {
        eventCountAfterRemoval: await count(page.locator('.fc-daygrid-day[data-date="2026-08-03"] .fc-event')),
        trayCountAfterRemoval: await text(tray.getByTestId('my-flow-calendar-unscheduled-count')),
      };
    }, { depth: 4 });
    await attempt(cell, 'My Flow whole/selected export 범위 확인', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'vehicle-inspection-prep');
      cell._card = card;
      const panel = await openExportPanel(card);
      const whole = await text(panel.getByTestId('my-flow-export-scope-flow'));
      await panel.getByTestId('my-flow-export-scope-selected').click();
      const choices = panel.getByTestId('my-flow-export-selectable-item');
      if (await count(choices)) {
        await choices.nth(0).getByRole('checkbox').check();
        if ((await count(choices)) > 1) await choices.nth(1).getByRole('checkbox').check();
      }
      return {
        whole,
        selected: await text(panel.getByTestId('my-flow-export-scope-summary')),
        calendarCount: await panel.getByTestId('my-flow-export-calendar').getAttribute('data-export-count'),
        checklistCount: await panel.getByTestId('my-flow-export-checklist').getAttribute('data-export-count'),
      };
    }, { depth: 4 });
    await attempt(cell, '현재 항목 export 진입 확인', async () => {
      const detail = await openFirstItemDetail(page, cell._card);
      const portable = detail.getByTestId('my-flow-detail-portable-export');
      await portable.locator('summary').click();
      return { currentItemTools: await count(portable.getByRole('button')) };
    });
    await capture(page, cell, 'export-scopes-wide');
    delete cell._card;
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'preserved', explanationFree: true,
    nextAction: '날짜 없는 항목을 계속 실행하거나 다시 배치',
    observedUserAssumption: 'Calendar에서 날짜 제거 후 tray 복귀를 자연스럽게 예상하는지는 확인되지 않았다.',
  });
});

await runPersona('P3', async (page, runtimeErrors) => {
  await runCell(page, runtimeErrors, {
    personaId: 'P3', sessionId: 'S1', userGoal: '홈트 반복 요일·시간·길이·종료 횟수를 설정해 저장한다.',
    route: '/f/curated-allblanc-morning-workout', viewport: viewports.mobile,
    expectedMentalModel: '영상 resource와 반복 실행 회차는 분리되고 다음 세 회차를 저장 전에 예측한다.',
  }, async (cell) => {
    await attempt(cell, '반복 요약과 다음 3회 확인', async () => {
      await goto(page, '/f/curated-allblanc-morning-workout');
      await page.getByTestId('public-flow-anchor-input').fill('2026-07-27');
      const summary = page.getByTestId('public-routine-schedule-summary');
      return {
        summary: await text(summary.getByTestId('public-routine-schedule-summary-value')),
        nextCount: await count(summary.getByTestId('public-routine-schedule-summary-next-occurrences').getByRole('listitem')),
      };
    });
    await attempt(cell, '시간·예상 시간·8회 종료 설정', async () => {
      const summary = page.getByTestId('public-routine-schedule-summary');
      await summary.getByTestId('public-routine-schedule-summary-toggle').click();
      const editor = summary.getByTestId('public-routine-schedule-editor');
      await editor.getByTestId('public-routine-schedule-editor-time-mode').selectOption('timed');
      await editor.getByTestId('public-routine-schedule-editor-time').fill('07:30');
      await editor.getByTestId('public-routine-schedule-editor-duration').selectOption('45');
      await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
      await editor.getByTestId('public-routine-schedule-editor-occurrence-count').fill('8');
      return { summary: await text(summary.getByTestId('public-routine-schedule-summary-value')) };
    }, { depth: 5 });
    await attempt(cell, '저장 receipt와 My Flow 이동', async () => {
      await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 시작' }).click();
      const receipt = page.getByTestId('public-flow-saved-receipt');
      await receipt.waitFor({ state: 'visible' });
      await capture(page, cell, 'routine-receipt');
      await receipt.getByTestId('public-flow-saved-receipt-primary').click();
      return { finalUrl: page.url() };
    });
    cell.parity = { series: 1, visibleOccurrences: 8, time: '07:30', durationMinutes: 45 };
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'not_yet_revisited', explanationFree: true,
    nextAction: '이번 회차 실행', observedUserAssumption: '8회 종료가 콘텐츠 소비 종료와 같은 뜻으로 읽히는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P3', sessionId: 'S2', userGoal: '한 회차를 완료·재개하고 다음 회차와 series를 구분한다.',
    route: '/calendar', viewport: viewports.mobile,
    expectedMentalModel: '이번 회차 상태만 바뀌고 반복 series 정의는 유지된다.',
  }, async (cell) => {
    await attempt(cell, 'Calendar에서 routine occurrence 찾기', async () => {
      await goto(page, '/calendar');
      await page.getByTestId('my-flow-month-picker').fill('2026-07');
      const icon = page.getByTestId('my-flow-routine-icon').first();
      await icon.click();
      const row = page.getByTestId('my-flow-calendar-selected-day').locator('article[data-item-type="routine_session"]').first();
      cell._row = row;
      return {
        occurrenceId: await row.getAttribute('data-occurrence-id'),
        routineKey: await row.getAttribute('data-routine-key'),
      };
    }, { depth: 3 });
    await attempt(cell, '이번 회차 완료 후 undo', async () => {
      const checkbox = cell._row.getByRole('checkbox').first();
      await checkbox.check();
      const doneState = await cell._row.getAttribute('data-occurrence-state');
      const notice = page.getByTestId('my-flow-completion-snackbar');
      await notice.getByTestId('my-flow-completion-undo').click();
      return { doneState, reopenedState: await cell._row.getAttribute('data-occurrence-state') };
    }, { depth: 2 });
    await capture(page, cell, 'occurrence-reopened');
    delete cell._row;
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'preserved', explanationFree: true,
    nextAction: '다음 회차 또는 series 설정 확인', observedUserAssumption: '사용자가 작은 “이번 회차” 상태 문구로 series와 occurrence를 충분히 구분하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P3', sessionId: 'S3', userGoal: 'Calendar·ICS 회차 수와 resource/실행 항목 경계를 확인한다.',
    route: '/my -> /calendar', viewport: viewports.wide,
    expectedMentalModel: 'ICS는 하나의 반복 series이고 UI는 개별 occurrence를 보여주며 영상은 완료 대상과 다르다.',
  }, async (cell) => {
    await attempt(cell, 'routine export series/count 확인', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'curated-allblanc-morning-workout');
      const panel = await openExportPanel(card);
      const summary = await text(panel.getByTestId('my-flow-export-calendar-summary'));
      const ics = await downloadText(page, panel.getByTestId('my-flow-export-calendar'), 'p3-s3-routine.ics');
      return {
        summary,
        eventCount: (ics.match(/BEGIN:VEVENT/gu) ?? []).length,
        hasRrule: /RRULE:/u.test(ics),
      };
    }, { depth: 3 });
    await attempt(cell, 'resource와 실행 row 수 비교', async () => {
      await goto(page, '/f/curated-allblanc-morning-workout');
      return {
        resourceLinks: await count(page.locator('a[href*="youtube.com"], a[href*="youtu.be"]')),
        previewRows: await count(page.getByTestId('public-flow-artifact-preview-row')),
      };
    });
    await capture(page, cell, 'routine-wide-boundary');
  }, {
    status: 'partial', severity: 'Medium', visibleReachable: true, reloadPersistence: 'occurrence_state_persisted', explanationFree: false,
    nextAction: '다음 occurrence 실행',
    failureRecovery: { history: '개별 회차의 과거 기록을 한눈에 보는 전용 history는 현재 surface에서 발견하지 못했다.' },
    observedUserAssumption: 'RRULE 1개와 화면의 8회가 모순 없이 읽히는지는 확인되지 않았다.',
  });
});

await runPersona('P4', async (page, runtimeErrors) => {
  await runCell(page, runtimeErrors, {
    personaId: 'P4', sessionId: 'S1', userGoal: '20~50개 Flow 중 필요한 두 개만 Calendar에서 선택한다.',
    route: '/calendar?demo=ux50', viewport: viewports.mobile, fixture: 'query_only_demo_ux50',
    expectedMentalModel: '검색한 Flow 두 개만 month grid와 agenda에 동일하게 적용된다.',
  }, async (cell) => {
    await attempt(cell, '50+ 범위 picker에서 두 Flow 선택', async () => {
      await goto(page, '/calendar?demo=ux50');
      const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
      await trigger.click();
      const picker = page.getByTestId('calendar-flow-scope-picker');
      const options = picker.getByTestId('calendar-flow-scope-picker-option');
      const optionCount = await options.count();
      const first = options.first();
      const firstTitle = await text(first);
      await first.getByRole('checkbox').check();
      const search = picker.getByTestId('calendar-flow-scope-picker-search');
      await search.fill('이사 준비 Flow 07');
      const matched = picker.getByTestId('calendar-flow-scope-picker-option').filter({ hasText: '이사 준비 Flow 07' }).first();
      if (await visible(matched)) await matched.getByRole('checkbox').check();
      await picker.getByTestId('calendar-flow-scope-picker-apply').click();
      return { optionCount, firstTitle, trigger: await text(trigger) };
    }, { depth: 5 });
    await capture(page, cell, 'scope-two-flows');
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'fixture_session_only', explanationFree: true,
    nextAction: '같은 날짜의 선택 Flow agenda 확인', observedUserAssumption: '실제 50개 개인 라이브러리에서 검색어를 기억하고 쓸지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P4', sessionId: 'S2', userGoal: '같은 날짜의 여러 Flow를 full identity로 구분하고 완료를 되돌린다.',
    route: '/calendar?demo=ux50', viewport: viewports.wide, fixture: 'query_only_demo_ux50',
    expectedMentalModel: 'month cell은 compact하고 selected-day에서는 Flow 전체 이름과 행동이 복원된다.',
  }, async (cell) => {
    await attempt(cell, '같은 날짜 5개 Flow full identity 열기', async () => {
      await page.setViewportSize(viewports.wide);
      await goto(page, '/calendar?demo=ux50');
      await page.getByTestId('my-flow-month-picker').fill('2026-06');
      const overflow = page.getByTestId('my-flow-calendar-grid-overflow-summary').first();
      await overflow.press('Enter');
      const selected = page.getByTestId('my-flow-calendar-selected-day');
      return {
        groupCount: await count(selected.getByTestId('my-flow-selected-date-group')),
        fullIdentityCount: await count(selected.getByTestId('my-flow-selected-date-flow-marker')),
      };
    }, { depth: 3 });
    await attempt(cell, 'agenda 첫 항목 완료·재개', async () => {
      const selected = page.getByTestId('my-flow-calendar-selected-day');
      const checkbox = selected.locator('input[type="checkbox"]:visible').first();
      await checkbox.check();
      const notice = page.getByTestId('my-flow-completion-snackbar');
      await notice.getByTestId('my-flow-completion-undo').click();
      return { reopened: !(await checkbox.isChecked()) };
    }, { depth: 2, required: false });
    await capture(page, cell, 'same-date-full-identity');
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'fixture_recreated', explanationFree: true,
    nextAction: '날짜 없는 두 항목 batch 배치', observedUserAssumption: 'compact 월 셀의 축약 라벨만으로 원하는 Flow를 고르는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P4', sessionId: 'S3', userGoal: '날짜 없는 두 항목을 batch 배치하고 undo·focus·stable ID를 확인한다.',
    route: '/calendar', viewport: viewports.mobile, fixture: 'seeded_saved_flows',
    expectedMentalModel: '배치 전후에도 항목 identity와 page 위치가 유지되고 undo로 원복된다.',
  }, async (cell) => {
    await attempt(cell, '날짜 없는 sheet의 두 항목 배치와 undo', async () => {
      await goto(page, '/');
      await page.evaluate(() => {
        const savedAt = '2026-07-22T00:00:00.000Z';
        localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
          slug: 'moving-d30-basic', savedAt, selectedArtifactMode: 'calendar', anchor: '2026-08-28',
        }));
        localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({ mode: 'custom', anchor: '2026-08-28' }));
        localStorage.setItem('flow:saved:vehicle-inspection-prep', JSON.stringify({
          slug: 'vehicle-inspection-prep', savedAt, selectedArtifactMode: 'calendar',
        }));
      });
      await goto(page, '/calendar');
      const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
      const trigger = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await trigger.click();
      const items = tray.getByTestId('my-flow-calendar-unscheduled-item');
      const keysBefore = await items.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-item-key')));
      await items.nth(0).getByRole('checkbox').check();
      await items.nth(1).getByRole('checkbox').check();
      await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2026-07-29');
      await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
      await tray.getByTestId('my-flow-calendar-unscheduled-undo-action').click();
      if (!(await visible(items.first()))) await trigger.click();
      const keysAfter = await tray.getByTestId('my-flow-calendar-unscheduled-item').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-item-key')));
      return { stableIdsRestored: JSON.stringify(keysBefore) === JSON.stringify(keysAfter), pageScrollChanged: (await page.evaluate(() => window.scrollY)) !== scrollBefore };
    }, { depth: 7 });
    await capture(page, cell, 'undated-batch-undo');
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'fixture_recreated', explanationFree: true,
    nextAction: '선택 날짜 agenda 확인', observedUserAssumption: '실제 저장 데이터 20~60개에서 동일 성능이 나는지는 fixture 밖에서 확인되지 않았다.',
  });
});

await runPersona('P5', async (page, runtimeErrors) => {
  await runCell(page, runtimeErrors, {
    personaId: 'P5', sessionId: 'S1', userGoal: '저장 전 primary/secondary artifact와 scope·count·loss를 예측한다.',
    route: '/f/moving-d30-basic', viewport: viewports.mobile,
    expectedMentalModel: '형식보다 먼저 Flow 전체 범위와 실제 결과 개수를 이해한다.',
  }, async (cell) => {
    await attempt(cell, 'artifact 추천과 count 확인', async () => {
      await goto(page, '/f/moving-d30-basic');
      await page.getByTestId('public-flow-anchor-input').fill('2026-08-28');
      const workspace = page.getByTestId('public-flow-detail-workspace');
      await workspace.locator('summary').first().click();
      const entry = workspace.getByTestId('public-flow-export-secondary-entry');
      await entry.getByTestId('public-flow-export-secondary-toggle').click();
      const panel = entry.getByTestId('my-flow-export-panel');
      return {
        scope: await text(panel.getByTestId('my-flow-export-scope-summary')),
        recommendations: await count(panel.locator('[data-recommendation-visible="true"]')),
        lossNotices: await count(panel.locator('[data-testid*="loss"]')),
      };
    }, { depth: 3 });
    await capture(page, cell, 'public-export-preflight');
    await attempt(cell, 'Flow 저장', async () => {
      const entry = page.getByTestId('public-flow-export-secondary-entry');
      if (await visible(entry.getByTestId('my-flow-export-panel'))) {
        await entry.getByTestId('public-flow-export-secondary-toggle').click();
      }
      await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '이 날짜로 시작' }).click();
      const receipt = page.getByTestId('public-flow-saved-receipt');
      await receipt.waitFor({ state: 'visible' });
      await receipt.getByTestId('public-flow-saved-receipt-primary').click();
      return { finalUrl: page.url() };
    }, { depth: 2 });
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'not_yet_revisited', explanationFree: true,
    nextAction: 'My Flow에서 범위별 export', observedUserAssumption: 'loss 문구가 실제 도구별 손실을 이해시키는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P5', sessionId: 'S2', userGoal: 'whole/selected/current 범위를 실행 전에 비교하고 receipt를 확인한다.',
    route: '/my', viewport: viewports.mobile,
    expectedMentalModel: '범위가 먼저 고정되고 형식마다 같은 item identity와 count를 사용한다.',
  }, async (cell) => {
    await attempt(cell, 'whole과 selected 범위 비교', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'moving-d30-basic');
      cell._card = card;
      const panel = await openExportPanel(card);
      const whole = await text(panel.getByTestId('my-flow-export-scope-summary'));
      await panel.getByTestId('my-flow-export-scope-selected').click();
      const choices = panel.getByTestId('my-flow-export-selectable-item');
      await choices.nth(0).getByRole('checkbox').check();
      await choices.nth(1).getByRole('checkbox').check();
      const selected = await text(panel.getByTestId('my-flow-export-scope-summary'));
      await panel.getByTestId('my-flow-export-memo').click();
      const receipt = await text(panel.getByTestId('my-flow-export-receipt'));
      return { whole, selected, receipt };
    }, { depth: 5 });
    await attempt(cell, '현재 항목 export 범위 확인', async () => {
      const detail = await openFirstItemDetail(page, cell._card);
      const portable = detail.getByTestId('my-flow-detail-portable-export');
      await portable.locator('summary').click();
      await portable.getByTestId('my-flow-detail-copy-portable-text').click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      return { copiedLineCount: copied.split(/\r?\n/u).length, containsFlowTitle: copied.includes('이사') };
    }, { depth: 3 });
    await capture(page, cell, 'selected-current-export');
    delete cell._card;
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'preserved', explanationFree: true,
    nextAction: '외부 도구에서 import', observedUserAssumption: '사용자가 whole/selected/current를 실제로 올바르게 예측하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P5', sessionId: 'S3', userGoal: 'Calendar/checklist/sheet/memo parity와 중복 import·cross-device 지원 상태를 확인한다.',
    route: '/my', viewport: viewports.wide,
    expectedMentalModel: '각 projection은 같은 항목 집합을 쓰고, 반복 가져오기는 중복 위험을 알려준다.',
  }, async (cell) => {
    await attempt(cell, '네 projection의 count parity 확인', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'moving-d30-basic');
      const panel = await openExportPanel(card);
      const ids = ['calendar', 'checklist', 'sheet', 'memo'];
      const counts = {};
      for (const id of ids) counts[id] = await panel.getByTestId(`my-flow-export-${id}`).getAttribute('data-export-count');
      return { counts };
    });
    await attempt(cell, '중복 import와 cross-device 안내 탐색', async () => {
      const body = await text(page.locator('body'));
      return {
        duplicateImportControl: /중복 가져오기|이미 가져간/u.test(body),
        crossDeviceControl: /다른 기기|동기화|계정/u.test(body),
      };
    });
    await capture(page, cell, 'projection-parity-wide');
  }, {
    status: 'partial', severity: 'Medium', visibleReachable: true, reloadPersistence: 'same_browser_only', explanationFree: false,
    nextAction: '외부 도구에서 수동 import',
    failureRecovery: { duplicateImport: '외부 도구 중복 import를 식별하거나 다른 기기로 이어가는 계약은 현재 UI에 없다.' },
    observedUserAssumption: '파일을 두 번 가져갈 때 사용자가 스스로 중복을 관리할 수 있는지는 확인되지 않았다.',
  });
});

await runPersona('P6', async (page, runtimeErrors) => {
  let draftSlug = null;
  await runCell(page, runtimeErrors, {
    personaId: 'P6', sessionId: 'S1', userGoal: '여행 메모를 여러 할 일로 나눈 개인 초안으로 저장한다.',
    route: '/flows', viewport: viewports.mobile,
    expectedMentalModel: '내 문장만 분할되고 source-backed 공개 Flow와 섞이지 않는다.',
  }, async (cell) => {
    await attempt(cell, '메모 입력과 5개 분할 preview', async () => {
      await goto(page, '/flows');
      const lookup = page.getByTestId('flow-url-lookup-entry');
      await lookup.getByLabel('URL 또는 메모').fill('항공권 확인. 숙소 예약번호 정리. 렌터카 예약. 준비물 체크. 출발 전날 온라인 체크인.');
      await lookup.getByRole('button', { name: 'Flow 찾기' }).click();
      const editor = page.getByTestId('flow-memo-draft-editor');
      return { splitCount: await count(editor.getByTestId('flow-memo-draft-item')) };
    }, { depth: 2 });
    await attempt(cell, '초안 제목·첫 날짜 저장', async () => {
      const editor = page.getByTestId('flow-memo-draft-editor');
      await editor.getByLabel('메모 초안 제목').fill('8월 제주 여행 준비');
      await editor.getByLabel('메모 초안 첫 할 일 날짜').fill('2026-08-01');
      await editor.getByRole('button', { name: '내 Flow에 초안 저장' }).click();
      await page.waitForURL(/\/my/u);
      const stored = await page.evaluate(() => {
        const bundles = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
        return bundles.find((bundle) => bundle.flow?.slug?.startsWith('url-draft-')) ?? null;
      });
      draftSlug = stored?.flow?.slug ?? null;
      return { draftSlug, sourceTitle: stored?.flow?.source_title, sourceUrl: stored?.flow?.source_url ?? null };
    }, { depth: 3 });
    await capture(page, cell, 'memo-draft-receipt');
    cell.parity = { title: '8월 제주 여행 준비', expectedItemCount: 5, sourceOwnership: 'personal_memo' };
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'not_yet_revisited', explanationFree: true,
    nextAction: 'My Flow에서 구성 편집', observedUserAssumption: '문장 분할 품질이 다양한 실제 메모에서도 충분한지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P6', sessionId: 'S2', userGoal: '초안 항목을 추가·이동·삭제·복구하고 날짜·시간·메모를 수정한다.',
    route: '/my', viewport: viewports.mobile,
    expectedMentalModel: '구조 변경과 실행 완료는 다른 mode이며 모든 변경은 reload 후 남는다.',
  }, async (cell) => {
    await attempt(cell, '개인 초안 다시 열기', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, draftSlug);
      cell._card = card;
      return { draftSlug };
    });
    await attempt(cell, '구성 편집에서 항목 추가와 위 이동', async () => {
      const card = cell._card;
      await card.getByTestId('my-flow-batch-mode-toggle').click();
      await card.getByTestId('personal-draft-add-entry').click();
      await card.getByTestId('personal-draft-add-title').fill('여권 유효기간 다시 확인');
      await card.getByTestId('personal-draft-add-title').press('Enter');
      const added = card.getByTestId('my-flow-batch-selectable-row').filter({ hasText: '여권 유효기간 다시 확인' });
      const id = await added.getAttribute('data-item-id');
      const up = added.getByTestId('personal-draft-move-up');
      if (await visible(up) && !(await up.isDisabled())) await up.click();
      return { stableItemId: id };
    }, { depth: 5 });
    await attempt(cell, '추가 항목 삭제와 undo 복구', async () => {
      const card = cell._card;
      const row = card.getByTestId('my-flow-batch-selectable-row').filter({ hasText: '여권 유효기간 다시 확인' });
      await row.getByTestId('my-flow-batch-item-checkbox').check();
      page.once('dialog', (dialog) => void dialog.accept());
      await card.getByTestId('my-flow-batch-remove-selected').click();
      const undo = card.getByTestId('my-flow-batch-undo-action');
      await undo.click();
      return { restored: await visible(card.getByTestId('my-flow-batch-selectable-row').filter({ hasText: '여권 유효기간 다시 확인' })) };
    }, { depth: 3 });
    await attempt(cell, '일반 mode에서 첫 항목 제목·날짜·시간·메모 수정', async () => {
      const card = cell._card;
      await card.getByTestId('my-flow-batch-mode-toggle').click();
      const detail = await openFirstItemDetail(page, card);
      await enterItemEdit(detail);
      await detail.getByTestId('my-flow-detail-title-input').fill('항공권 시간 다시 확인');
      await detail.getByTestId('my-flow-detail-date-input').fill('2026-08-02');
      const advanced = detail.getByTestId('my-flow-editor-advanced-toggle');
      if (await visible(advanced)) await advanced.click();
      const timed = detail.getByTestId('personal-draft-time-mode-timed');
      if (await visible(timed)) await timed.check();
      const timeInput = detail.getByTestId('personal-draft-time-input');
      if (await visible(timeInput)) await timeInput.fill('09:30');
      await detail.getByTestId('my-flow-detail-memo').fill('예약번호와 터미널 함께 확인');
      await detail.getByTestId('my-flow-detail-save-changes').click();
      return { title: '항공권 시간 다시 확인', date: '2026-08-02', time: '09:30' };
    }, { depth: 7 });
    await capture(page, cell, 'draft-structure-and-item-edit', { fullPage: true });
    delete cell._card;
  }, {
    status: 'supported', severity: 'Medium', visibleReachable: true, reloadPersistence: 'pending_next_session', explanationFree: false,
    nextAction: 'Calendar와 export에서 변경 결과 확인',
    failureRecovery: { complexity: '구성 편집과 항목 상세 편집을 오가야 해 조작 깊이가 높다.' },
    observedUserAssumption: '일반 사용자가 mode 전환 없이 구조 변경과 실행 변경을 구분하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P6', sessionId: 'S3', userGoal: 'reload 후 초안 변경을 Calendar·export에서 확인하고 공유 Flow와 경계를 본다.',
    route: '/calendar -> /my', viewport: viewports.wide,
    expectedMentalModel: '개인 초안은 이 브라우저에 남고 외부 projection은 같은 title/date/item identity를 사용한다.',
  }, async (cell) => {
    await attempt(cell, 'reload 후 Calendar 날짜 parity', async () => {
      await goto(page, '/calendar');
      await page.getByTestId('my-flow-month-picker').fill('2026-08');
      const dateCell = page.locator('.fc-daygrid-day[data-date="2026-08-02"]');
      const events = dateCell.locator('.fc-event');
      await dateCell.getByTestId('my-flow-calendar-date-button').click();
      const agendaText = await text(page.getByTestId('my-flow-calendar-selected-day'));
      return {
        matchingEventCount: await events.count(),
        selectedDayHasTitle: agendaText.includes('항공권 시간 다시 확인'),
      };
    });
    await attempt(cell, 'My Flow list export와 개인 source 경계', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, draftSlug);
      const panel = await openExportPanel(card);
      const checklist = (await visible(panel.getByTestId('personal-draft-copy-checklist')))
        ? panel.getByTestId('personal-draft-copy-checklist')
        : panel.getByTestId('my-flow-export-checklist');
      await checklist.click();
      const body = await text(card);
      return {
        itemCount: await panel.getAttribute('data-export-included-count'),
        personalBadge: /개인|내 메모|초안/u.test(body),
        publicShareControlCount: await count(card.getByRole('button', { name: /공개|게시|공유 Flow/u })),
      };
    }, { depth: 3 });
    await capture(page, cell, 'draft-revisit-wide');
  }, {
    status: 'partial', severity: 'Medium', visibleReachable: true, reloadPersistence: 'preserved_same_browser', explanationFree: false,
    nextAction: '외부 도구로 복사하거나 My Flow에서 계속 실행',
    failureRecovery: { crossDevice: '개인 초안은 localStorage 기반이라 다른 기기·브라우저 복구 경로가 없다.' },
    observedUserAssumption: '개인 초안이 공개되지 않는다는 경계를 사용자가 명확히 인지하는지는 확인되지 않았다.',
  });
});

await runPersona('P7', async (page, runtimeErrors) => {
  await runCell(page, runtimeErrors, {
    personaId: 'P7', sessionId: 'S1', userGoal: '날짜 없는 Flow를 저장하고 첫 실행 메모를 남긴다.',
    route: '/f/vehicle-inspection-prep -> /my', viewport: viewports.mobile,
    expectedMentalModel: '저장 receipt 이후 바로 첫 항목을 실행하며 메모는 개인 실행 기록이다.',
  }, async (cell) => {
    await attempt(cell, '저장 receipt와 My Flow 이동', async () => {
      await goto(page, '/f/vehicle-inspection-prep');
      await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
      const receipt = page.getByTestId('public-flow-saved-receipt');
      await receipt.waitFor({ state: 'visible' });
      const receiptText = await text(receipt);
      await receipt.getByTestId('public-flow-saved-receipt-primary').click();
      await page.waitForURL(/\/my/u);
      await waitForReady(page);
      return { receiptText };
    }, { depth: 2 });
    await attempt(cell, '첫 항목 실행 메모 저장', async () => {
      const card = await openMyFlowCard(page, 'vehicle-inspection-prep');
      const detail = await openFirstItemDetail(page, card);
      await enterItemEdit(detail);
      await detail.getByTestId('my-flow-detail-memo').fill('검사소 예약 전에 준비 서류를 다시 확인');
      await detail.getByTestId('my-flow-detail-save-changes').click();
      return { memoSaved: true };
    }, { depth: 4 });
    await capture(page, cell, 'first-execution-note');
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'pending_next_session', explanationFree: true,
    nextAction: '남은 항목 완료', observedUserAssumption: '항목 메모를 실행 중 실제로 사용할지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P7', sessionId: 'S2', userGoal: '일부 완료·reopen 후 전체 완료하고 회고와 source correction을 구분한다.',
    route: '/my', viewport: viewports.mobile,
    expectedMentalModel: '내 회고는 private이고 원본 수정 제안은 아직 전송되지 않은 별도 draft다.',
  }, async (cell) => {
    await attempt(cell, 'reload 후 메모 보존 확인', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'vehicle-inspection-prep');
      cell._card = card;
      const detail = await openFirstItemDetail(page, card);
      return { memoVisible: (await text(detail)).includes('검사소 예약 전에') };
    });
    await attempt(cell, '첫 항목 완료·reopen 후 전체 완료', async () => {
      const checkbox = cell._card.locator('[data-testid="my-flow-execution-row-shell"] input[type="checkbox"]:visible').first();
      await checkbox.check();
      await page.getByTestId('my-flow-completion-snackbar').getByTestId('my-flow-completion-undo').click();
      const completed = await completeAllRows(page, cell._card, 20);
      return { reopenedThenCompleted: true, completedByUi: completed };
    }, { depth: 12 });
    await attempt(cell, '회고와 전송 전 source correction 저장', async () => {
      const feedback = cell._card.getByTestId('my-flow-completion-feedback');
      await feedback.getByTestId('my-flow-reflection-open').click();
      await feedback.getByTestId('my-flow-reflection-note').fill('다음 점검에도 준비 순서를 그대로 쓴다.');
      await feedback.getByTestId('my-flow-reflection-save').click();
      await feedback.getByTestId('my-flow-source-correction-open').click();
      await feedback.getByTestId('my-flow-source-correction-note').fill('검사소별 예약 조건 차이를 원문에서 더 분명히 확인한다.');
      await feedback.getByTestId('my-flow-source-correction-save').click();
      return { summary: await text(feedback.getByTestId('my-flow-completion-feedback-saved-summary')) };
    }, { depth: 6 });
    await capture(page, cell, 'reflection-and-source-correction', { fullPage: true });
    delete cell._card;
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'preserved', explanationFree: false,
    nextAction: '새 실행으로 다시 쓰기', observedUserAssumption: '회고와 source correction의 차이를 현재 copy만으로 이해하는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P7', sessionId: 'S3', userGoal: '새 실행을 시작하고 과거 완료·메모·회고를 보존한다.',
    route: '/my', viewport: viewports.wide,
    expectedMentalModel: '새 실행은 체크만 비우고 과거 run은 읽기 전용 기록으로 남는다.',
  }, async (cell) => {
    await attempt(cell, 'reload 후 완료 feedback 보존', async () => {
      await goto(page, '/my');
      const card = await openMyFlowCard(page, 'vehicle-inspection-prep');
      cell._card = card;
      return { savedSummary: await text(card.getByTestId('my-flow-completion-feedback-saved-summary')) };
    });
    await attempt(cell, '날짜 없는 Flow 새 실행 시작', async () => {
      const feedback = cell._card.getByTestId('my-flow-completion-feedback');
      await feedback.getByTestId('my-flow-reuse-open').click();
      const panel = feedback.getByTestId('my-flow-reuse-panel');
      const anchorInputs = await count(panel.getByTestId('my-flow-reuse-anchor-input'));
      await panel.getByTestId('my-flow-reuse-start').click();
      const validation = await text(panel);
      await panel.getByTestId('my-flow-reuse-anchor-input').fill('2026-09-15');
      await panel.getByTestId('my-flow-reuse-start').click();
      const refreshedCard = await openMyFlowCard(page, 'vehicle-inspection-prep');
      return {
        anchorInputs,
        undatedReuseOffered: /날짜 없이/u.test(validation),
        validationBeforeDate: /선택해 주세요/u.test(validation),
        pastRuns: await count(refreshedCard.getByTestId('my-flow-past-run')),
        reuseStatus: await text(refreshedCard.getByTestId('my-flow-reuse-status')),
      };
    }, { depth: 3 });
    await capture(page, cell, 'new-run-history-wide', { fullPage: true });
    delete cell._card;
  }, {
    status: 'partial', severity: 'High', visibleReachable: true, reloadPersistence: 'preserved_across_three_sessions', explanationFree: false,
    nextAction: '새 run 첫 항목 실행',
    failureRecovery: { undatedReuse: '날짜 없이 저장·실행한 Flow도 재사용 시 새 검사일을 필수로 요구하며 날짜 없는 새 run 선택이 없다.' },
    observedUserAssumption: '과거 run을 다시 열어보는 재방문 가치가 실제로 있는지는 확인되지 않았다.',
  });
});

await runPersona('P8', async (page, runtimeErrors) => {
  async function traceFocus(page, stopTestId, max = 220) {
    await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
    const trace = [];
    for (let index = 0; index < max; index += 1) {
      await page.keyboard.press('Tab');
      const value = await page.evaluate(() => {
        const active = document.activeElement;
        const owner = active?.closest?.('[data-testid]');
        return {
          testId: owner?.getAttribute('data-testid') ?? null,
          tag: active?.tagName?.toLowerCase() ?? '',
          name: active?.getAttribute?.('aria-label') ?? active?.textContent?.trim() ?? '',
        };
      });
      trace.push(value);
      if (value.testId === stopTestId) break;
    }
    return trace;
  }

  await runCell(page, runtimeErrors, {
    personaId: 'P8', sessionId: 'S1', userGoal: '키보드만으로 save-before 핵심 조정을 열고 저장 순서를 이해한다.',
    route: '/f/moving-d30-basic', viewport: viewports.mobile,
    expectedMentalModel: 'header 이후 결과·날짜·조정·저장 순으로 focus가 이동한다.',
  }, async (cell) => {
    await attempt(cell, 'save-before keyboard focus trace', async () => {
      await goto(page, '/f/moving-d30-basic');
      const trace = await traceFocus(page, 'public-flow-save-primary-mobile', 40);
      return { stepsToSaveLayer: trace.length, trace: trace.slice(0, 24) };
    });
    await attempt(cell, '키보드로 조정 열기와 명시적 취소 후 focus 복귀', async () => {
      const trigger = page.getByTestId('public-flow-adjust-entry-mobile');
      await trigger.focus();
      await page.keyboard.press('Enter');
      const adjustment = page.getByTestId('public-flow-personal-adjustment');
      await adjustment.waitFor({ state: 'visible' });
      await page.waitForTimeout(100);
      const focused = await adjustment.evaluate((node) => node === document.activeElement);
      await page.keyboard.press('Escape');
      const escapeClosed = !(await visible(adjustment));
      const cancel = adjustment.getByRole('button', { name: '취소', exact: true });
      await cancel.focus();
      await page.keyboard.press('Enter');
      await adjustment.waitFor({ state: 'hidden' });
      const restoredTrigger = page.getByTestId('public-flow-adjust-entry-mobile');
      return {
        adjustmentFocused: focused,
        escapeClosed,
        explicitCancelClosed: true,
        focusReturnedAfterCancel: await restoredTrigger.evaluate((node) => node === document.activeElement),
      };
    });
    await capture(page, cell, 'keyboard-save-before');
  }, {
    status: 'partial', severity: 'Medium', visibleReachable: true, reloadPersistence: 'not_applicable', explanationFree: false,
    nextAction: '조정 후 저장',
    failureRecovery: { tabDepth: '24개 항목 전체 선택을 키보드로 조정하면 focus 이동량이 크게 늘어난다.' },
    observedUserAssumption: '저시력 사용자가 현재 대비와 compact label을 읽을 수 있는지는 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P8', sessionId: 'S2', userGoal: 'My Flow menu·export sheet를 키보드로 열고 닫아 focus 복귀를 확인한다.',
    route: '/my?demo=ux20&view=flows', viewport: viewports.mobile, fixture: 'query_only_demo_ux20',
    expectedMentalModel: 'workspace controls가 persistent tabs보다 먼저 오고 dialog/sheet를 닫으면 호출 지점으로 돌아온다.',
  }, async (cell) => {
    await attempt(cell, 'header-workspace-tabs focus order', async () => {
      await goto(page, '/my?demo=ux20&view=flows');
      const trace = await traceFocus(page, 'platform-mobile-tabs', 220);
      const header = trace.findIndex((entry) => entry.testId === 'platform-nav');
      const workspace = trace.findIndex((entry) => entry.testId === 'my-flow-view-flow');
      const tabs = trace.findIndex((entry) => entry.testId === 'platform-mobile-tabs');
      return { header, workspace, tabs, ordered: header >= 0 && workspace > header && tabs > workspace };
    });
    await attempt(cell, 'management menu Escape focus return', async () => {
      const row = page.getByTestId('my-flow-mobile-structure-row').nth(2);
      await row.getByTestId('my-flow-mobile-structure-open').click();
      const card = page.locator('[data-testid="my-flow-overview-card"]:visible').first();
      const trigger = card.getByTestId('my-flow-management-menu-trigger');
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      return { focusReturned: await trigger.evaluate((node) => node === document.activeElement) };
    }, { depth: 3 });
    await capture(page, cell, 'keyboard-my-flow-menu');
  }, {
    status: 'supported', severity: 'Low', visibleReachable: true, reloadPersistence: 'fixture_recreated', explanationFree: true,
    nextAction: 'Calendar batch와 undo를 keyboard-only로 실행', observedUserAssumption: '스크린리더의 실제 낭독 순서는 자동 focus trace만으로 확인되지 않았다.',
  });

  await runCell(page, runtimeErrors, {
    personaId: 'P8', sessionId: 'S3', userGoal: 'Calendar batch·undo·export를 keyboard-only와 200% 확대 조건에서 확인한다.',
    route: '/calendar', viewport: viewports.mobile, fixture: 'seeded_saved_flows',
    expectedMentalModel: '확대해도 가로 넘침 없이 control 이름과 focus가 유지된다.',
  }, async (cell) => {
    await attempt(cell, '날짜 없는 sheet keyboard open/Escape/focus return', async () => {
      await goto(page, '/');
      await page.evaluate(() => {
        const savedAt = '2026-07-22T00:00:00.000Z';
        localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
          slug: 'moving-d30-basic', savedAt, selectedArtifactMode: 'calendar', anchor: '2026-08-28',
        }));
        localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({ mode: 'custom', anchor: '2026-08-28' }));
        localStorage.setItem('flow:saved:vehicle-inspection-prep', JSON.stringify({
          slug: 'vehicle-inspection-prep', savedAt, selectedArtifactMode: 'calendar',
        }));
      });
      await goto(page, '/calendar');
      const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
      const trigger = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      return { focusReturned: await trigger.evaluate((node) => node === document.activeElement) };
    });
    await attempt(cell, '200% 확대 equivalent overflow audit', async () => {
      await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
      await page.waitForTimeout(200);
      const health = await pageHealth(page);
      await capture(page, cell, 'keyboard-calendar-zoom-200');
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      return health;
    });
    await attempt(cell, '320 CSS px reflow audit', async () => {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.waitForTimeout(200);
      const health = await pageHealth(page);
      await capture(page, cell, 'keyboard-calendar-reflow-320');
      await page.setViewportSize(viewports.mobile);
      return health;
    });
    await capture(page, cell, 'keyboard-calendar-zoom');
  }, {
    status: 'partial', severity: 'Medium', visibleReachable: true, reloadPersistence: 'fixture_recreated', explanationFree: false,
    nextAction: '선택 항목 날짜 배치 또는 export',
    failureRecovery: { zoom: 'CSS zoom 기반 자동 점검은 실제 OS/브라우저 저시력 설정과 동등한 사용자 검증이 아니다.' },
    observedUserAssumption: '저시력·스크린리더 사용자의 실제 성공 여부는 확인되지 않았다.',
  });
});

await browser.close();

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewerRole: 'codex_independent',
  canonicalUrl: baseUrl,
  sourceCommit,
  observedUserCount: 0,
  cellCount: cells.length,
  statusCounts: cells.reduce((result, cell) => {
    result[cell.status] = (result[cell.status] ?? 0) + 1;
    return result;
  }, {}),
  cells,
  globalErrors,
};

await writeFile(
  path.join(outputRoot, 'persona-journey-scorecard.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
  'utf8',
);
await writeFile(
  path.join(outputRoot, 'route-evidence.json'),
  `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: summary.generatedAt,
    canonicalUrl: baseUrl,
    sourceCommit,
    observedUserCount: 0,
    evidenceKind: ['current_production_interaction', 'current_browser_automation'],
    routes: routeEvidence,
    globalErrors,
  }, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  cellCount: cells.length,
  statusCounts: summary.statusCounts,
  globalErrorCount: globalErrors.length,
  screenshotCount: cells.reduce((total, cell) => total + cell.screenshots.length, 0),
}, null, 2));

if (cells.length !== 24) process.exitCode = 1;
