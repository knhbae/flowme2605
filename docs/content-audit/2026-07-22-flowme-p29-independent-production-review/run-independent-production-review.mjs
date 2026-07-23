import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const baseURL = 'https://flowme2605.vercel.app';
const root = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = path.join(root, 'screenshots');
const resultPath = path.join(root, 'production-interaction-results.json');
const chromeExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

fs.mkdirSync(screenshotRoot, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromeExecutable,
  headless: true,
});

const output = {
  schemaVersion: 'flowme-p29-independent-production-review-v1',
  generatedAt: new Date().toISOString(),
  production: baseURL,
  evidenceKind: 'current_production_interaction',
  observedUserCount: 0,
  states: [],
  journeys: [],
  failures: [],
};

const viewportById = {
  mobile: { width: 390, height: 844 },
  wide: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

async function waitForStablePage(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(550);
}

async function openFresh(page, route) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
}

async function visibleText(locator) {
  if (await locator.count() === 0) return '';
  return normalizeText(await locator.first().innerText().catch(() => ''));
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value ?? '').replace(/\s+/gu, ' ').trim();
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
        && element.getAttribute('aria-hidden') !== 'true';
    };
    const nameOf = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/u).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
        : '';
      const explicitLabel = element.id
        ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent ?? ''
        : '';
      const wrappedLabel = element.closest('label')?.textContent ?? '';
      return clean(
        element.getAttribute('aria-label')
        || labelledText
        || explicitLabel
        || wrappedLabel
        || element.getAttribute('title')
        || element.textContent
        || (element instanceof HTMLInputElement ? element.value : ''),
      );
    };
    const interactives = Array.from(document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    )).filter(visible);
    const firstViewportInteractives = interactives.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top < innerHeight && rect.bottom > 0;
    });
    const primaryActions = Array.from(document.querySelectorAll('[data-action-priority="primary"]')).filter(visible);
    const fixedElements = Array.from(document.querySelectorAll('body *')).filter((element) => {
      const style = getComputedStyle(element);
      return visible(element) && style.position === 'fixed';
    });
    const fixedPrimaryOverlaps = fixedElements.flatMap((fixed) => primaryActions
      .filter((primary) => {
        if (fixed === primary || fixed.contains(primary) || primary.contains(fixed)) return false;
        const a = fixed.getBoundingClientRect();
        const b = primary.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      })
      .map((primary) => {
        const fixedRect = fixed.getBoundingClientRect();
        const primaryRect = primary.getBoundingClientRect();
        return {
          fixed: {
            name: nameOf(fixed),
            testId: fixed.getAttribute('data-testid') ?? '',
            zIndex: getComputedStyle(fixed).zIndex,
            rect: {
              left: Math.round(fixedRect.left),
              top: Math.round(fixedRect.top),
              right: Math.round(fixedRect.right),
              bottom: Math.round(fixedRect.bottom),
            },
          },
          primary: {
            name: nameOf(primary),
            testId: primary.getAttribute('data-testid') ?? '',
            zIndex: getComputedStyle(primary).zIndex,
            rect: {
              left: Math.round(primaryRect.left),
              top: Math.round(primaryRect.top),
              right: Math.round(primaryRect.right),
              bottom: Math.round(primaryRect.bottom),
            },
          },
        };
      }));
    const clippedText = Array.from(document.querySelectorAll('span, p, h1, h2, h3, h4, button, a'))
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 1
          && (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none');
      })
      .map((element) => ({
        text: clean(element.textContent).slice(0, 180),
        title: element.getAttribute('title') ?? '',
        ariaLabel: element.getAttribute('aria-label') ?? element.parentElement?.getAttribute('aria-label') ?? '',
        testId: element.getAttribute('data-testid') ?? element.parentElement?.getAttribute('data-testid') ?? '',
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
    const longDescriptions = Array.from(document.querySelectorAll('p'))
      .filter(visible)
      .map((element) => clean(element.textContent))
      .filter((text) => text.length >= 70);
    const borderedSurfaces = Array.from(document.querySelectorAll('section, article, aside, details, div'))
      .filter(visible)
      .filter((element) => {
        const style = getComputedStyle(element);
        return parseFloat(style.borderTopWidth) > 0
          && parseFloat(style.borderRadius) >= 4
          && element.getBoundingClientRect().width > 120;
      });
    const firstViewportHeadings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < innerHeight && rect.bottom > 0;
      })
      .map((element) => ({
        level: element.tagName.toLowerCase(),
        text: clean(element.textContent),
        top: Math.round(element.getBoundingClientRect().top),
      }));
    return {
      url: location.href,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeights: Number((document.documentElement.scrollHeight / innerHeight).toFixed(2)),
      },
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      interactiveCount: interactives.length,
      firstViewportInteractiveCount: firstViewportInteractives.length,
      firstViewportInteractives: firstViewportInteractives.slice(0, 24).map((element) => ({
        tag: element.tagName.toLowerCase(),
        name: nameOf(element),
        testId: element.getAttribute('data-testid') ?? '',
        top: Math.round(element.getBoundingClientRect().top),
      })),
      firstViewportHeadings,
      primaryActionCount: primaryActions.length,
      primaryActionNames: primaryActions.map(nameOf),
      unnamedFocusableCount: interactives.filter((element) => !nameOf(element)).length,
      fixedElementCount: fixedElements.length,
      fixedPrimaryOverlapCount: fixedPrimaryOverlaps.length,
      fixedPrimaryOverlaps,
      detailsCount: document.querySelectorAll('details').length,
      openDetailsCount: document.querySelectorAll('details[open]').length,
      longDescriptionCount: longDescriptions.length,
      longDescriptions: longDescriptions.slice(0, 8),
      borderedSurfaceCount: borderedSurfaces.length,
      clippedTextCount: clippedText.length,
      clippedText: clippedText.slice(0, 30),
      markerCount: document.querySelectorAll('[data-p29-marker]').length,
      anatomyCount: document.querySelectorAll('[data-flow-anatomy]').length,
      bodyTextSample: clean(document.body.innerText).slice(0, 1200),
    };
  });
}

async function inspectFocusOrder(page, count = 14) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const order = [];
  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return { tag: '', name: '', testId: '', top: null };
      const label = element.getAttribute('aria-label')
        || element.getAttribute('title')
        || element.textContent
        || (element instanceof HTMLInputElement ? element.value : '');
      return {
        tag: element.tagName.toLowerCase(),
        name: String(label ?? '').replace(/\s+/gu, ' ').trim().slice(0, 120),
        testId: element.getAttribute('data-testid') ?? '',
        top: Math.round(element.getBoundingClientRect().top),
      };
    }));
  }
  return order;
}

async function capture(page, journey, id, options = {}) {
  await waitForStablePage(page);
  const metrics = await inspectPage(page);
  const filename = `${id}.png`;
  await page.screenshot({ path: path.join(screenshotRoot, filename), fullPage: options.fullPage !== false });
  const viewportFilename = options.viewportProbe ? `${id}-viewport.png` : '';
  if (viewportFilename) {
    await page.screenshot({ path: path.join(screenshotRoot, viewportFilename), fullPage: false });
  }
  const state = {
    id,
    journeyId: journey.id,
    evidenceKind: options.evidenceKind ?? 'current_production_interaction',
    screenshot: `screenshots/${filename}`,
    ...(viewportFilename ? { viewportScreenshot: `screenshots/${viewportFilename}` } : {}),
    note: options.note ?? '',
    metrics,
  };
  output.states.push(state);
  journey.states.push(id);
  return state;
}

function record(journey, label, value) {
  journey.observations.push({ label, value });
}

async function click(journey, locator, label) {
  await locator.click();
  journey.interactionDepth += 1;
  journey.actions.push(label);
}

async function fill(journey, locator, value, label) {
  await locator.fill(value);
  journey.interactionDepth += 1;
  journey.actions.push(label);
}

async function runJourney({ id, name, viewport = 'mobile', controlledFixture = false }, run) {
  const context = await browser.newContext({
    viewport: viewportById[viewport],
    acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const journey = {
    id,
    name,
    viewport,
    controlledFixture,
    evidenceKind: controlledFixture
      ? ['current_production_interaction', 'heuristic_simulation']
      : ['current_production_interaction', 'heuristic_simulation'],
    observedUserCount: 0,
    interactionDepth: 0,
    actions: [],
    observations: [],
    states: [],
    consoleErrors: [],
    pageErrors: [],
    status: 'pass',
  };
  page.on('console', (message) => {
    if (message.type() === 'error') journey.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => journey.pageErrors.push(error.message));
  output.journeys.push(journey);
  try {
    await run({ page, context, journey });
  } catch (error) {
    journey.status = 'failed';
    const failure = {
      journeyId: id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : '',
    };
    output.failures.push(failure);
    record(journey, 'failure', failure.message);
  } finally {
    await context.close();
  }
}

async function captureInitialAt(route, routeId, viewportId) {
  await runJourney({ id: `${routeId}-${viewportId}-initial`, name: `${route} initial ${viewportId}`, viewport: viewportId }, async ({ page, journey }) => {
    await openFresh(page, route);
    await capture(page, journey, `${viewportId}-${routeId}-initial`);
    record(journey, 'focusOrder', await inspectFocusOrder(page, 12));
  });
}

for (const [route, id] of [
  ['/f/moving-d30-basic', 'moving'],
  ['/f/curated-allblanc-morning-workout', 'routine'],
  ['/my?demo=ux20&view=flows', 'my-flow'],
  ['/calendar?demo=ux20', 'calendar'],
]) {
  for (const viewport of ['wide', 'desktop']) {
    await captureInitialAt(route, id, viewport);
  }
}

await runJourney({ id: 'A-moving', name: '이사 Flow save-before to receipt, My Flow, Calendar, export' }, async ({ page, journey }) => {
  await openFresh(page, '/f/moving-d30-basic');
  const initial = await capture(page, journey, 'mobile-A01-moving-save-before');
  record(journey, 'firstAction', initial.metrics.firstViewportInteractives[0] ?? null);
  record(journey, 'focusOrder', await inspectFocusOrder(page, 14));
  record(journey, 'artifactReason', await visibleText(page.getByTestId('flow-artifact-recommendation-reason')));
  record(journey, 'artifactChoices', await page.locator('[data-recommendation-role]').allTextContents().then((values) => values.map(normalizeText)));

  await fill(journey, page.getByTestId('public-flow-anchor-input'), '2030-08-15', '이사일 입력');
  await click(journey, page.getByTestId('public-flow-adjust-entry-mobile'), '조정 열기');
  await capture(page, journey, 'mobile-A02-moving-adjust');
  record(journey, 'adjustmentModes', await page.getByTestId('public-flow-adjustment-mode-picker').getByRole('button').allTextContents().then((values) => values.map(normalizeText)));
  record(journey, 'adjustmentRowCountInitial', await page.getByTestId('public-flow-adjustment-row').count());

  await fill(journey, page.getByTestId('public-flow-adjustment-flow-title'), '독립 검토 이사 Flow', '개인 Flow 이름 수정');
  await click(journey, page.getByRole('button', { name: '날짜', exact: true }), '날짜 조정 mode');
  const dateInput = page.getByTestId('public-flow-adjustment-date');
  if (await dateInput.count()) await fill(journey, dateInput.first(), '2030-07-20', '첫 항목 날짜 수정');
  await capture(page, journey, 'mobile-A03-moving-adjusted');
  await click(journey, page.getByTestId('public-flow-adjustment-save'), '조정본 저장');

  const receipt = page.getByTestId('public-flow-saved-receipt');
  await receipt.waitFor({ state: 'visible' });
  const receiptState = await capture(page, journey, 'mobile-A04-moving-receipt');
  record(journey, 'receiptText', normalizeText(await receipt.innerText()));
  record(journey, 'receiptPrimaryCount', await receipt.locator('[data-action-priority="primary"]').count());
  record(journey, 'saveBeforeStillPresent', await page.getByTestId('public-flow-hero').count());
  record(journey, 'receiptFirstViewport', receiptState.metrics.firstViewportHeadings);

  await click(journey, page.getByTestId('public-flow-saved-receipt-primary'), '내 Flow에서 시작');
  await page.waitForURL(/\/my/u);
  await capture(page, journey, 'mobile-A05-moving-my-flow');
  record(journey, 'myFlowIdentity', await visibleText(page.getByTestId('my-flow-overview-card').locator('[data-flow-identity-slot="title"]')));

  const exportEntry = page.getByTestId('my-flow-export-entry').first();
  if (await exportEntry.count()) {
    await click(journey, exportEntry, 'Flow 가져가기 열기');
    const exportPanel = page.getByTestId('my-flow-export-panel').first();
    await capture(page, journey, 'mobile-A06-moving-export-preflight');
    record(journey, 'wholeExportSummary', await visibleText(exportPanel.getByTestId('my-flow-export-scope-summary')));
    const primaryExport = exportPanel.locator('[data-recommendation-role="primary"][data-recommendation-visible="true"]').first();
    if (await primaryExport.count()) {
      record(journey, 'wholeExportPrimary', {
        text: normalizeText(await primaryExport.innerText()),
        count: await primaryExport.getAttribute('data-export-count'),
      });
    }
  }

  await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
  await capture(page, journey, 'mobile-A07-moving-calendar');
  record(journey, 'calendarFlowIdentityCount', await page.locator('[data-flow-marker-key]').count());
});

await runJourney({ id: 'B-routine', name: '반복 운동 summary, adjustment, occurrence completion and reopen' }, async ({ page, journey }) => {
  await openFresh(page, '/f/curated-allblanc-morning-workout');
  await fill(journey, page.getByTestId('public-flow-anchor-input'), '2026-07-27', '시작일 입력');
  const summary = page.getByTestId('public-routine-schedule-summary');
  await summary.waitFor({ state: 'visible' });
  const initial = await capture(page, journey, 'mobile-B01-routine-summary');
  record(journey, 'summary', await visibleText(summary.getByTestId('public-routine-schedule-summary-value')));
  record(journey, 'nextOccurrences', await summary.getByRole('listitem').allTextContents().then((values) => values.map(normalizeText)));
  record(journey, 'initialAdvancedInputCount', await summary.getByTestId('public-routine-schedule-editor').count());
  record(journey, 'firstViewportPrimary', initial.metrics.primaryActionNames);

  await click(journey, summary.getByTestId('public-routine-schedule-summary-toggle'), '반복 설정 조정 열기');
  const editor = summary.getByTestId('public-routine-schedule-editor');
  await editor.waitFor({ state: 'visible' });
  await page.getByTestId('public-routine-schedule-editor-time-mode').selectOption('timed');
  journey.interactionDepth += 1;
  journey.actions.push('시간 mode 선택');
  await fill(journey, page.getByTestId('public-routine-schedule-editor-time'), '07:30', '시간 입력');
  await page.getByTestId('public-routine-schedule-editor-duration').selectOption('45');
  journey.interactionDepth += 1;
  journey.actions.push('예상 시간 선택');
  await page.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
  journey.interactionDepth += 1;
  journey.actions.push('횟수 종료 선택');
  await fill(journey, page.getByTestId('public-routine-schedule-editor-occurrence-count'), '8', '8회 입력');
  const adjusted = await capture(page, journey, 'mobile-B02-routine-adjust');
  record(journey, 'adjustedSummary', await visibleText(summary.getByTestId('public-routine-schedule-summary-value')));
  record(journey, 'adjustedFirstViewportActions', adjusted.metrics.firstViewportInteractives);
  record(journey, 'resourceLinkCount', await page.locator('a[href*="youtube"], a[href*="youtu.be"]').count());

  await click(journey, page.getByTestId('public-flow-save-primary-mobile'), '반복 Flow 저장');
  await page.getByTestId('public-flow-saved-receipt').waitFor({ state: 'visible' });
  await capture(page, journey, 'mobile-B03-routine-receipt');
  await click(journey, page.getByTestId('public-flow-saved-receipt-primary'), 'My Flow 시작');
  await page.waitForURL(/\/my/u);
  await capture(page, journey, 'mobile-B04-routine-my-flow');

  const postSaveStart = page.getByTestId('my-flow-post-save-open-first');
  if (await postSaveStart.count() === 0) {
    throw new Error('Routine post-save receipt does not expose the first occurrence start action.');
  }
  await click(journey, postSaveStart, '첫 occurrence 열기');
  const completion = page.getByTestId('my-flow-task-complete-control').first();
  if (await completion.count() === 0) {
    throw new Error('Routine occurrence opened without a completion control.');
  }
  record(journey, 'occurrenceCompletionName', await completion.getAttribute('aria-label'));
  await completion.click();
  journey.interactionDepth += 1;
  journey.actions.push('한 occurrence 완료');
  await page.getByTestId('my-flow-completion-undo').waitFor({ state: 'visible' });
  await capture(page, journey, 'mobile-B05-routine-completed');
  const undo = page.getByTestId('my-flow-completion-undo');
  if (await undo.count() === 0) {
    throw new Error('Routine occurrence completion does not expose an undo action.');
  }
  await click(journey, undo, '완료 되돌리기');
  await capture(page, journey, 'mobile-B06-routine-reopened');
  record(journey, 'seriesMutationMarker', await page.getByTestId('public-routine-schedule-summary').count());
});

await runJourney({ id: 'C-my-flow', name: '27 Flow library search, drill-in, completion, reopen, export' }, async ({ page, journey }) => {
  await page.goto(`${baseURL}/my?demo=ux20&view=flows`, { waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
  const initial = await capture(page, journey, 'mobile-C01-my-flow-library');
  const rows = page.getByTestId('my-flow-mobile-structure-row');
  record(journey, 'visibleRows', await rows.count());
  record(journey, 'rowButtons', await rows.getByRole('button').count());
  record(journey, 'rowHeights', await rows.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height))));
  record(journey, 'firstViewportActions', initial.metrics.firstViewportInteractives);
  record(journey, 'focusOrder', await inspectFocusOrder(page, 14));

  const search = page.getByTestId('my-flow-search').first();
  await fill(journey, search, '이사', 'Flow 검색');
  await page.waitForTimeout(180);
  await capture(page, journey, 'mobile-C02-my-flow-search');
  record(journey, 'searchResultCount', await page.getByTestId('my-flow-mobile-structure-row').count());
  await click(journey, page.getByTestId('my-flow-mobile-structure-open').first(), 'Flow 열기');
  await capture(page, journey, 'mobile-C03-my-flow-detail');
  record(journey, 'nextAction', await visibleText(page.getByTestId('my-flow-workspace-next-open')));
  record(journey, 'wholePlanRowCount', await page.getByTestId('my-flow-whole-flow-row').count());

  const completion = page.getByTestId('my-flow-task-complete-control').first();
  if (await completion.count()) {
    await completion.check();
    journey.interactionDepth += 1;
    journey.actions.push('다음 항목 완료');
    await capture(page, journey, 'mobile-C04-my-flow-completed');
    const undo = page.getByTestId('my-flow-completion-undo');
    if (await undo.count()) await click(journey, undo, '완료 취소');
    await capture(page, journey, 'mobile-C05-my-flow-reopened');
  }

  const exportEntry = page.getByTestId('my-flow-export-entry').first();
  if (await exportEntry.count()) {
    await click(journey, exportEntry, '가져가기 열기');
    await capture(page, journey, 'mobile-C06-my-flow-export', { viewportProbe: true });
    record(journey, 'exportScopeSummary', await visibleText(page.getByTestId('my-flow-export-scope-summary').first()));
  }
});

await runJourney({ id: 'C-my-flow-wide', name: '27 Flow wide workspace', viewport: 'wide' }, async ({ page, journey }) => {
  await page.goto(`${baseURL}/my?demo=ux20&view=flows`, { waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
  const search = page.getByTestId('my-flow-library-rail-search');
  await fill(journey, search, '이사', 'wide Flow 검색');
  await click(journey, page.getByTestId('my-flow-library-row').first(), 'wide Flow 선택');
  const state = await capture(page, journey, 'wide-C07-my-flow-detail');
  record(journey, 'workspaceWidths', await page.getByTestId('my-flow-library-workspace').locator(':scope > *').evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().width))));
  record(journey, 'clippedText', state.metrics.clippedText);
});

await runJourney({ id: 'D-calendar-demo', name: '20 Flow Calendar scope and selected day' }, async ({ page, journey }) => {
  await page.goto(`${baseURL}/calendar?demo=ux20`, { waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
  const initial = await capture(page, journey, 'mobile-D01-calendar-scope');
  record(journey, 'firstViewportActions', initial.metrics.firstViewportInteractives);
  record(journey, 'focusOrder', await inspectFocusOrder(page, 14));
  const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
  record(journey, 'closedScopeLabel', await visibleText(trigger));
  await click(journey, trigger, 'Flow 범위 열기');
  const picker = page.getByTestId('calendar-flow-scope-picker');
  await capture(page, journey, 'mobile-D02-calendar-picker');
  record(journey, 'scopeOptionCount', await picker.getByTestId('calendar-flow-scope-picker-option').count());
  await fill(journey, picker.getByTestId('calendar-flow-scope-picker-search'), '이사', '범위에서 이사 검색');
  const filtered = picker.getByTestId('calendar-flow-scope-picker-option');
  if (await filtered.count()) await filtered.first().getByRole('checkbox').check();
  journey.interactionDepth += 1;
  journey.actions.push('검색 결과 선택');
  await fill(journey, picker.getByTestId('calendar-flow-scope-picker-search'), '', '검색 해제');
  const allOptions = picker.getByTestId('calendar-flow-scope-picker-option');
  if (await allOptions.count() > 1) await allOptions.nth(1).getByRole('checkbox').check();
  journey.interactionDepth += 1;
  journey.actions.push('두 번째 Flow 선택');
  await capture(page, journey, 'mobile-D03-calendar-two-selected');
  await click(journey, picker.getByTestId('calendar-flow-scope-picker-apply'), '2개 Flow 적용');
  record(journey, 'appliedScopeLabel', await visibleText(trigger));
  record(journey, 'selectedDayText', await visibleText(page.getByTestId('my-flow-calendar-selected-day')));
  record(journey, 'undatedTrayCountExactRoute', await page.getByTestId('my-flow-calendar-unscheduled-tray').count());
  await capture(page, journey, 'mobile-D04-calendar-selected-day');
});

await runJourney({ id: 'D-calendar-wide', name: '20 Flow Calendar wide truncation and hierarchy', viewport: 'wide' }, async ({ page, journey }) => {
  await page.goto(`${baseURL}/calendar?demo=ux20`, { waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
  const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
  await click(journey, trigger, 'wide Flow 범위 열기');
  const picker = page.getByTestId('calendar-flow-scope-picker');
  const options = picker.getByTestId('calendar-flow-scope-picker-option');
  if (await options.count() >= 2) {
    await options.nth(0).getByRole('checkbox').check();
    await options.nth(1).getByRole('checkbox').check();
    journey.interactionDepth += 2;
    journey.actions.push('wide 2개 Flow 선택');
  }
  await click(journey, picker.getByTestId('calendar-flow-scope-picker-apply'), 'wide 범위 적용');
  const state = await capture(page, journey, 'wide-D05-calendar-workspace');
  const labels = page.getByTestId('my-flow-calendar-flow-label');
  record(journey, 'calendarLabelAudit', await labels.evaluateAll((elements) => elements.map((element) => ({
    text: String(element.textContent ?? '').replace(/\s+/gu, ' ').trim(),
    title: element.getAttribute('title') ?? '',
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clipped: element.scrollWidth > element.clientWidth + 1,
    parentAriaLabel: element.parentElement?.getAttribute('aria-label') ?? '',
  })).slice(0, 40)));
  record(journey, 'workspaceWidths', await page.getByTestId('my-flow-calendar-workspace').locator(':scope > *').evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().width))));
  record(journey, 'allClippedText', state.metrics.clippedText);
});

await runJourney({ id: 'D-calendar-seeded-undated', name: 'Controlled production client-state undated placement', controlledFixture: true }, async ({ page, context, journey }) => {
  await context.addInitScript(() => {
    if (sessionStorage.getItem('flowme:independent-undated-seeded') === 'true') return;
    localStorage.clear();
    const savedAt = '2026-07-22T00:00:00.000Z';
    [
      { slug: 'moving-d30-basic', anchor: '2026-08-28' },
      { slug: 'vehicle-inspection-prep', anchor: undefined },
    ].forEach(({ slug, anchor }) => {
      localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        ...(anchor ? { anchor } : {}),
      }));
      if (anchor) localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor }));
    });
    sessionStorage.setItem('flowme:independent-undated-seeded', 'true');
  });
  await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
  const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
  record(journey, 'controlledFixtureNotice', 'production code + reviewer-injected localStorage; not a natural production demo state');
  record(journey, 'initialUndatedCount', await visibleText(tray.getByTestId('my-flow-calendar-unscheduled-count')));
  await click(journey, tray.getByTestId('my-flow-calendar-unscheduled-toggle'), '날짜 없는 일 sheet 열기');
  const sheet = tray.getByTestId('my-flow-calendar-unscheduled-sheet');
  await sheet.waitFor({ state: 'visible' });
  const openState = await capture(page, journey, 'mobile-D06-calendar-undated-sheet', { evidenceKind: 'heuristic_simulation' });
  record(journey, 'sheetFirstFocus', await page.evaluate(() => ({
    testId: document.activeElement?.getAttribute('data-testid') ?? '',
    name: document.activeElement?.getAttribute('aria-label')
      ?? String(document.activeElement?.textContent ?? '').replace(/\s+/gu, ' ').trim(),
  })));
  record(journey, 'sheetPageViewportHeights', openState.metrics.document.viewportHeights);
  const items = tray.getByTestId('my-flow-calendar-unscheduled-item');
  await items.nth(0).getByRole('checkbox').check();
  await items.nth(1).getByRole('checkbox').check();
  journey.interactionDepth += 2;
  journey.actions.push('날짜 없는 일 2개 선택');
  await fill(journey, tray.getByTestId('my-flow-calendar-unscheduled-date'), '2026-07-29', '배치 날짜 입력');
  await click(journey, tray.getByTestId('my-flow-calendar-unscheduled-apply'), '2개 항목 날짜 배치');
  await capture(page, journey, 'mobile-D07-calendar-undated-placed', { evidenceKind: 'heuristic_simulation' });
  record(journey, 'selectedDayAfterPlacement', await visibleText(page.getByTestId('my-flow-calendar-selected-day')));
  const undo = tray.getByTestId('my-flow-calendar-unscheduled-undo-action');
  if (await undo.count()) await click(journey, undo, '날짜 배치 undo');
  await capture(page, journey, 'mobile-D08-calendar-undated-undone', { evidenceKind: 'heuristic_simulation' });
  record(journey, 'undatedCountAfterUndo', await visibleText(tray.getByTestId('my-flow-calendar-unscheduled-count')));
});

await runJourney({ id: 'E-public-export', name: 'Public artifact recommendation, whole export preflight and receipt' }, async ({ page, journey }) => {
  await openFresh(page, '/f/moving-d30-basic');
  await fill(journey, page.getByTestId('public-flow-anchor-input'), '2030-08-15', '이사일 입력');
  const preview = page.getByTestId('flow-artifact-data-preview');
  record(journey, 'previewRecommendations', await preview.locator('[data-recommendation-role]').evaluateAll((elements) => elements.map((element) => ({
    role: element.getAttribute('data-recommendation-role'),
    count: element.getAttribute('data-recommendation-count'),
    text: String(element.textContent ?? '').replace(/\s+/gu, ' ').trim(),
  }))));
  record(journey, 'previewReason', await visibleText(preview.getByTestId('flow-artifact-recommendation-reason')));
  await click(journey, page.getByTestId('public-flow-detail-workspace').locator('summary').first(), 'Flow 가져가기 disclosure');
  const exportEntry = page.getByTestId('public-flow-export-secondary-entry');
  await click(journey, exportEntry.getByTestId('public-flow-export-secondary-toggle'), 'export preflight 열기');
  const panel = exportEntry.getByTestId('my-flow-export-panel');
  const preflight = await capture(page, journey, 'mobile-E01-public-export-preflight', { viewportProbe: true });
  const candidates = panel.locator('[data-recommendation-visible="true"]');
  record(journey, 'exportRecommendations', await candidates.evaluateAll((elements) => elements.map((element) => ({
    role: element.getAttribute('data-recommendation-role'),
    state: element.getAttribute('data-export-state'),
    count: element.getAttribute('data-export-count'),
    text: String(element.textContent ?? '').replace(/\s+/gu, ' ').trim(),
  }))));
  record(journey, 'preflightFirstViewportActions', preflight.metrics.firstViewportInteractives);
  const primary = panel.locator('[data-recommendation-role="primary"][data-recommendation-visible="true"]').first();
  const predicted = await primary.getAttribute('data-export-count');
  const download = page.waitForEvent('download').catch(() => null);
  await click(journey, primary, 'primary whole Flow export');
  await Promise.race([download, page.waitForTimeout(1200)]);
  const receipt = panel.getByTestId('flow-export-result-receipt');
  await receipt.waitFor({ state: 'visible' });
  await capture(page, journey, 'mobile-E02-public-export-receipt');
  record(journey, 'publicExportReceipt', {
    text: normalizeText(await receipt.innerText()),
    predictedCount: predicted,
    outputCount: await receipt.getAttribute('data-export-output-count'),
    identity: await visibleText(receipt.getByTestId('flow-export-result-identity')),
  });
});

await runJourney({ id: 'E-selected-current-export', name: 'Selected and current item export scope' }, async ({ page, journey }) => {
  await page.goto(`${baseURL}/my?demo=source-backed&view=flows`, { waitUntil: 'domcontentloaded' });
  await waitForStablePage(page);
  const row = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-moving-d30"]');
  if (await row.count()) await click(journey, row.getByTestId('my-flow-mobile-structure-open'), 'source-backed moving 열기');
  const exportSurface = page.getByTestId('my-flow-export-surface').first();
  await click(journey, exportSurface.getByTestId('my-flow-export-entry'), 'Flow export 열기');
  const panel = exportSurface.getByTestId('my-flow-export-panel');
  await click(journey, panel.getByTestId('my-flow-export-scope-selected'), '선택 항목 scope');
  const choices = panel.getByTestId('my-flow-export-selectable-item');
  await choices.nth(0).getByRole('checkbox').check();
  await choices.nth(1).getByRole('checkbox').check();
  journey.interactionDepth += 2;
  journey.actions.push('항목 2개 선택');
  const selectedMemo = panel.getByTestId('my-flow-export-memo');
  record(journey, 'selectedActionLabel', normalizeText(await selectedMemo.innerText()));
  await click(journey, selectedMemo, '선택 2개 메모 복사');
  await capture(page, journey, 'mobile-E03-selected-export-receipt');
  record(journey, 'selectedReceipt', await visibleText(panel.getByTestId('flow-export-result-receipt')));

  const firstExecution = page.getByTestId('my-flow-execution-row-shell').first();
  await click(journey, firstExecution.getByRole('button', { name: /열기/ }), '현재 항목 detail 열기');
  const itemExport = firstExecution.getByTestId('my-flow-detail-portable-export');
  if (await itemExport.locator('summary').count()) await click(journey, itemExport.locator('summary'), '현재 항목 가져가기 열기');
  const currentAction = itemExport.getByTestId('my-flow-detail-copy-portable-text');
  record(journey, 'currentActionLabel', normalizeText(await currentAction.innerText()));
  await click(journey, currentAction, '현재 항목 복사');
  await capture(page, journey, 'mobile-E04-current-export-receipt');
  record(journey, 'currentReceipt', await visibleText(itemExport.getByTestId('flow-export-result-receipt')));
});

output.totals = {
  journeyCount: output.journeys.length,
  stateCount: output.states.length,
  screenshotCount: fs.readdirSync(screenshotRoot).filter((name) => name.endsWith('.png')).length,
  failedJourneyCount: output.journeys.filter((journey) => journey.status !== 'pass').length,
  horizontalOverflowStateCount: output.states.filter((state) => state.metrics.horizontalOverflowPx > 1).length,
  unnamedFocusableCount: output.states.reduce((sum, state) => sum + state.metrics.unnamedFocusableCount, 0),
  fixedPrimaryOverlapCount: output.states.reduce((sum, state) => sum + state.metrics.fixedPrimaryOverlapCount, 0),
  consoleErrorCount: output.journeys.reduce((sum, journey) => sum + journey.consoleErrors.length, 0),
  pageErrorCount: output.journeys.reduce((sum, journey) => sum + journey.pageErrors.length, 0),
};

fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.totals, null, 2));

await browser.close();

if (output.totals.failedJourneyCount > 0) process.exitCode = 1;
