const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.FLOWME_BASE_URL || 'https://flowme2605.vercel.app';
const ROOT = __dirname;
const SCREENSHOTS = path.join(ROOT, 'screenshots');
fs.mkdirSync(SCREENSHOTS, { recursive: true });

const results = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  evidenceKind: 'current_production_interaction',
  observedUserSessionCount: 0,
  entries: [],
};

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function inspectPage(page, extra = {}) {
  const state = await page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const focusables = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
      .filter((element) => visible(element) && element.getAttribute('tabindex') !== '-1');
    const unnamed = focusables.filter((element) => {
      const aria = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
      const title = element.getAttribute('title');
      const text = element.textContent?.trim();
      const placeholder = element.getAttribute('placeholder');
      const alt = element.getAttribute('alt');
      const label = 'labels' in element
        ? Array.from(element.labels || []).map((item) => item.textContent?.trim()).filter(Boolean).join(' ')
        : '';
      return !(aria || title || text || placeholder || alt || label);
    });
    const visibleHeadings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .filter(visible)
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 24);
    const visibleButtons = Array.from(document.querySelectorAll('button, a[href]'))
      .filter(visible)
      .map((element) => (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 60);
    return {
      title: document.title,
      url: window.location.href,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      visibleFocusableCount: focusables.length,
      unnamedVisibleFocusableCount: unnamed.length,
      visibleHeadings,
      visibleButtons,
      bodyExcerpt: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1400),
    };
  });
  return { ...state, ...extra };
}

async function runScenario(browser, config, action) {
  const context = await browser.newContext({
    viewport: config.viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  let details = {};
  let failed;
  try {
    await page.goto(`${BASE_URL}${config.route}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'networkidle', timeout: 45_000 });
    details = await action(page);
    const filename = `${config.id}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS, filename), fullPage: config.fullPage !== false });
    details.screenshot = `screenshots/${filename}`;
  } catch (error) {
    failed = error instanceof Error ? error.message : String(error);
    try {
      const filename = `${config.id}-failed.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS, filename), fullPage: false });
      details.screenshot = `screenshots/${filename}`;
    } catch {}
  }
  const finalState = await inspectPage(page, {
    id: config.id,
    route: config.route,
    viewport: `${config.viewport.width}x${config.viewport.height}`,
    consoleErrorCount: consoleErrors.length,
    consoleErrors,
    pageErrorCount: pageErrors.length,
    pageErrors,
    ...(failed ? { failed } : {}),
    ...details,
  });
  results.entries.push(finalState);
  await context.close();
}

async function count(locator) {
  return locator.count();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  await runScenario(browser, {
    id: 'home-mobile', route: '/', viewport: { width: 390, height: 844 }, fullPage: false,
  }, async (page) => ({
    firstViewportText: cleanText(await page.locator('body').innerText()).slice(0, 900),
    primaryActionCount: await count(page.locator('[data-action-priority="primary"]:visible')),
  }));

  await runScenario(browser, {
    id: 'flows-empty-mobile', route: '/flows', viewport: { width: 390, height: 844 }, fullPage: false,
  }, async (page) => ({
    lookupVisible: await page.getByTestId('flow-url-lookup-entry').isVisible(),
    catalogCardCount: await count(page.locator('[data-testid="flow-catalog-browse-results"] article:visible, [data-testid="flow-catalog-browse-results"] a:visible')),
    firstViewportText: cleanText(await page.locator('body').innerText()).slice(0, 1200),
  }));

  await runScenario(browser, {
    id: 'flows-memo-result-mobile', route: '/flows', viewport: { width: 390, height: 844 }, fullPage: true,
  }, async (page) => {
    const memo = '부모님 공주 당일 여행. 공주한옥마을, 무령왕릉과 왕릉원, 루치아의 뜰, 공산성 순서로 이동. 여행일과 방문 시각은 나중에 정하기.';
    await page.getByTestId('flow-url-lookup-input').fill(memo);
    await page.getByTestId('flow-url-lookup-entry').getByRole('button', { name: 'Flow 찾기' }).click();
    await page.waitForTimeout(200);
    return {
      input: memo,
      lookupResultVisible: await page.getByTestId('flow-url-lookup-result').isVisible().catch(() => false),
      draftEditorEntryVisible: await page.getByTestId('flow-url-miss-draft-open').isVisible().catch(() => false),
      resultText: cleanText(await page.getByTestId('flow-url-lookup-entry').innerText()).slice(0, 1600),
    };
  });

  const sourceProbes = [
    {
      id: 'kmooc',
      url: 'https://www.kmooc.kr/view/course/detail/20097',
    },
    {
      id: 'heat-safety',
      url: 'https://www.nongsaro.go.kr/portal/ps/psz/psza/contentSub.ps?bbsId=10&cntntsNo=51&menuId=PS02485&nttSeCode=&pageIndex=1&pageSize=10&searchText=&searchType=title',
    },
    {
      id: 'remodel-contract',
      url: 'https://ohou.se/advices/1972',
    },
    {
      id: 'parents-travel',
      url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=c46eff3a-4213-42df-8640-5369238dc50c',
    },
  ];
  for (const probe of sourceProbes) {
    await runScenario(browser, {
      id: `source-probe-${probe.id}-mobile`, route: '/flows', viewport: { width: 390, height: 844 }, fullPage: true,
    }, async (page) => {
      await page.getByTestId('flow-url-lookup-input').fill(probe.url);
      await page.getByTestId('flow-url-lookup-entry').getByRole('button', { name: 'Flow 찾기' }).click();
      await page.waitForTimeout(200);
      const result = page.getByTestId('flow-url-lookup-result');
      return {
        sourceUrl: probe.url,
        lookupResultVisible: await result.isVisible().catch(() => false),
        resultText: cleanText(await page.getByTestId('flow-url-lookup-entry').innerText()).slice(0, 1800),
        resultLinks: await result.locator('a:visible').allInnerTexts().catch(() => []),
        supplyRequestVisible: await page.getByTestId('flow-url-supply-request').isVisible().catch(() => false),
        draftEntryVisible: await page.getByTestId('flow-url-miss-draft-open').isVisible().catch(() => false),
      };
    });
  }

  await runScenario(browser, {
    id: 'source-backed-moving-save-before-wide', route: '/flow-maps/moving-d30', viewport: { width: 1024, height: 768 }, fullPage: false,
  }, async (page) => {
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    const preview = page.getByTestId('flow-map-artifact-preview');
    return {
      previewRowCount: await count(preview.getByTestId('flow-map-artifact-preview-row')),
      previewText: cleanText(await preview.innerText()).slice(0, 1600),
      saveActionVisible: await page.getByTestId('flow-map-save-all').isVisible(),
      adjustActionVisible: await page.getByRole('button', { name: /조정/ }).first().isVisible().catch(() => false),
    };
  });

  await runScenario(browser, {
    id: 'source-backed-moving-receipt-mobile', route: '/flow-maps/moving-d30', viewport: { width: 390, height: 844 }, fullPage: true,
  }, async (page) => {
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await page.getByTestId('flow-map-save-all-mobile').click();
    await page.waitForLoadState('networkidle');
    const receipt = page.getByTestId('my-flow-post-save-panel');
    return {
      finalUrl: page.url(),
      receiptVisible: await receipt.isVisible(),
      receiptStepCount: await count(receipt.getByTestId('my-flow-post-save-step')),
      receiptText: cleanText(await receipt.innerText()).slice(0, 1800),
      exportInitiallyVisible: await page.getByTestId('my-flow-post-save-export-region').isVisible().catch(() => false),
    };
  });

  await runScenario(browser, {
    id: 'source-backed-moving-export-mobile', route: '/flow-maps/moving-d30', viewport: { width: 390, height: 844 }, fullPage: true,
  }, async (page) => {
    await page.getByTestId('flow-map-anchor-input').fill('2030-08-15');
    await page.getByTestId('flow-map-save-all-mobile').click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('my-flow-post-save-open-export').click();
    const panel = page.getByTestId('my-flow-post-save-export-region').getByTestId('my-flow-export-panel');
    return {
      exportVisible: await panel.isVisible(),
      scopeSummary: cleanText(await panel.getByTestId('my-flow-export-scope-summary').innerText()),
      exportText: cleanText(await panel.innerText()).slice(0, 1800),
      destinationButtons: await panel.locator('button:visible').allInnerTexts(),
    };
  });

  await runScenario(browser, {
    id: 'moving-save-before-mobile', route: '/f/moving-d30-basic', viewport: { width: 390, height: 844 }, fullPage: true,
  }, async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    const preview = page.getByTestId('public-flow-artifact-preview');
    const visibleRows = await count(preview.getByTestId('public-flow-artifact-preview-row'));
    const declaredItems = cleanText(await preview.innerText());
    const workbench = page.locator('[aria-label="Flow artifact workbench"]');
    return {
      visiblePreviewRowCount: visibleRows,
      previewText: declaredItems.slice(0, 1800),
      workbenchVisible: await workbench.isVisible().catch(() => false),
      artifactTabLabels: await workbench.locator('button:visible').allInnerTexts().catch(() => []),
      adjustmentEntryVisible: await page.getByTestId('public-flow-adjust-entry-mobile').isVisible().catch(() => false),
    };
  });

  await runScenario(browser, {
    id: 'moving-adjustment-mobile', route: '/f/moving-d30-basic', viewport: { width: 390, height: 844 }, fullPage: false,
  }, async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await adjustment.scrollIntoViewIfNeeded();
    return {
      adjustmentRowCount: await count(adjustment.getByTestId('public-flow-adjustment-row')),
      defaultMode: await adjustment.getAttribute('data-adjustment-mode'),
      modeLabels: await adjustment.locator('button:visible').allInnerTexts(),
      visibleTitleInputCount: await count(adjustment.getByTestId('public-flow-adjustment-title')),
      visibleDateInputCount: await count(adjustment.getByTestId('public-flow-adjustment-date')),
      adjustmentText: cleanText(await adjustment.innerText()).slice(0, 1700),
    };
  });

  await runScenario(browser, {
    id: 'moving-receipt-my-calendar-wide', route: '/f/moving-d30-basic', viewport: { width: 1024, height: 768 }, fullPage: false,
  }, async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-adjust-entry').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await adjustment.getByTestId('public-flow-adjustment-mode-content').click();
    const first = adjustment.getByTestId('public-flow-adjustment-row').first();
    await first.getByTestId('public-flow-adjustment-title').fill('내 이사 견적 확정');
    await adjustment.getByTestId('public-flow-adjustment-mode-include').click();
    await adjustment.getByTestId('public-flow-adjustment-row').nth(1).getByRole('checkbox').uncheck();
    await adjustment.getByTestId('public-flow-adjustment-save').click();
    await page.getByRole('link', { name: '내 Flow에서 보기' }).first().click();
    await page.waitForLoadState('networkidle');
    const receipt = page.getByTestId('my-flow-post-save-panel');
    const receiptStepCount = await count(receipt.getByTestId('my-flow-post-save-step'));
    const receiptText = cleanText(await receipt.innerText());
    await receipt.getByTestId('my-flow-post-save-view-flow').click();
    const outline = page.getByTestId('my-flow-whole-flow-outline');
    const outlineRowCount = await count(outline.getByTestId('my-flow-execution-row-shell'));
    const savedState = await page.evaluate(() => ({
      savedKeys: Object.keys(window.localStorage).filter((key) => key.startsWith('flow:saved:')),
      drafts: window.localStorage.getItem('flow:my-flow:item-drafts'),
    }));
    await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle' });
    const calendarText = cleanText(await page.locator('body').innerText());
    return {
      receiptStepCount,
      receiptText: receiptText.slice(0, 1500),
      outlineRowCount,
      savedState,
      calendarFlowScopeVisible: await page.getByTestId('my-flow-calendar-scope-filter').isVisible().catch(() => false),
      calendarContainsPersonalTitle: calendarText.includes('내 이사 견적 확정'),
      finalSurface: 'calendar',
    };
  });

  await runScenario(browser, {
    id: 'workout-save-before-mobile', route: '/f/curated-allblanc-morning-workout', viewport: { width: 390, height: 844 }, fullPage: true,
  }, async (page) => {
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    return {
      previewRowCount: await count(page.getByTestId('public-flow-artifact-preview').getByTestId('public-flow-artifact-preview-row')),
      recurrenceText: cleanText(await page.locator('body').innerText()).match(/미리보기 4주[^.]{0,160}|종료[^.]{0,100}/g) || [],
      resourceLinks: await count(page.locator('a[href*="youtube"]:visible')),
      completionLikeResourceControls: await count(page.locator('a[href*="youtube"] input, a[href*="youtube"] [role="checkbox"]')),
    };
  });

  await runScenario(browser, {
    id: 'vehicle-undated-calendar-mobile', route: '/f/vehicle-inspection-prep', viewport: { width: 390, height: 844 }, fullPage: true,
  }, async (page) => {
    await page.getByTestId('public-flow-date-intent-undated').click();
    await page.getByTestId('public-flow-mobile-save-cta').getByRole('button', { name: '날짜 없이 시작' }).click();
    await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle' });
    const tray = page.getByTestId('my-flow-calendar-unscheduled-tray');
    const beforeCount = cleanText(await tray.getByTestId('my-flow-calendar-unscheduled-count').innerText());
    const toggle = tray.getByTestId('my-flow-calendar-unscheduled-toggle');
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    await page.screenshot({ path: path.join(SCREENSHOTS, 'vehicle-undated-tray-before-mobile.png'), fullPage: true });
    const items = tray.getByTestId('my-flow-calendar-unscheduled-item');
    await items.first().getByRole('checkbox').check();
    await tray.getByTestId('my-flow-calendar-unscheduled-date').fill('2030-08-20');
    const previewText = cleanText(await tray.getByTestId('my-flow-calendar-unscheduled-preview').innerText());
    await tray.getByTestId('my-flow-calendar-unscheduled-apply').click();
    return {
      beforeCount,
      afterCount: cleanText(await tray.getByTestId('my-flow-calendar-unscheduled-count').innerText()),
      trayItemCountBefore: await count(items),
      previewText,
      selectedDayRowCount: await count(page.getByTestId('my-flow-calendar-selected-day').getByTestId('my-flow-execution-row-shell')),
      undoVisible: await tray.getByTestId('my-flow-calendar-unscheduled-undo-action').isVisible(),
      beforeScreenshot: 'screenshots/vehicle-undated-tray-before-mobile.png',
    };
  });

  await runScenario(browser, {
    id: 'my-flow-demo-wide', route: '/my?demo=ux12', viewport: { width: 1024, height: 768 }, fullPage: false,
  }, async (page) => {
    await page.getByTestId('my-flow-view-flow').click();
    return {
      searchVisible: await page.getByTestId('my-flow-search').isVisible(),
      flowCount: await count(page.locator('[data-testid="my-flow-overview-card"]:visible')),
      archiveControlCount: await count(page.getByTestId('my-flow-archive-toggle')),
      firstViewportText: cleanText(await page.locator('body').innerText()).slice(0, 1500),
    };
  });

  await runScenario(browser, {
    id: 'calendar-demo-wide', route: '/calendar?demo=ux12', viewport: { width: 1024, height: 768 }, fullPage: false,
  }, async (page) => ({
    flowScopeVisible: await page.getByTestId('my-flow-calendar-scope-filter').isVisible().catch(() => false),
    undatedTrayVisible: await page.getByTestId('my-flow-calendar-unscheduled-tray').isVisible().catch(() => false),
    routineWrapperCount: await count(page.locator('.my-flow-routine-rail-event')),
    firstViewportText: cleanText(await page.locator('body').innerText()).slice(0, 1600),
  }));

  await browser.close();
  results.summary = {
    scenarioCount: results.entries.length,
    failedCount: results.entries.filter((entry) => entry.failed).length,
    horizontalOverflowCount: results.entries.filter((entry) => entry.horizontalOverflow).length,
    consoleErrorCount: results.entries.reduce((sum, entry) => sum + entry.consoleErrorCount, 0),
    pageErrorCount: results.entries.reduce((sum, entry) => sum + entry.pageErrorCount, 0),
    unnamedVisibleFocusableCount: results.entries.reduce((sum, entry) => sum + entry.unnamedVisibleFocusableCount, 0),
  };
  fs.writeFileSync(path.join(ROOT, 'production-journey-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(results.summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
