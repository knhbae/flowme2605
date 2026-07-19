async (page) => {
  const consoleMessages = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });

  await page.reload({ waitUntil: 'load' });
  const slideCount = await page.locator('.slide').count();
  if (slideCount !== 20) throw new Error(`Expected 20 slides, got ${slideCount}`);

  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 900, allowVerticalScroll: false },
    { name: 'desktop-1280', width: 1280, height: 720, allowVerticalScroll: false },
    { name: 'tablet-1024', width: 1024, height: 768, allowVerticalScroll: false },
    { name: 'mobile-390', width: 390, height: 844, allowVerticalScroll: true }
  ];

  const viewportReports = [];
  const overflowIssues = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const slides = [];

    for (let index = 1; index <= slideCount; index += 1) {
      await page.evaluate((slideIndex) => {
        location.hash = `#slide-${String(slideIndex).padStart(2, '0')}`;
      }, index);
      await page.waitForTimeout(12);

      const metrics = await page.evaluate(() => {
        const slide = document.querySelector('.slide.is-active');
        const body = slide.querySelector('.slide-body');
        const deck = document.querySelector('.deck');
        const rect = deck.getBoundingClientRect();
        return {
          id: slide.id,
          title: slide.dataset.title,
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          slideOverflowX: slide.scrollWidth - slide.clientWidth,
          slideOverflowY: slide.scrollHeight - slide.clientHeight,
          bodyOverflowX: body.scrollWidth - body.clientWidth,
          bodyOverflowY: body.scrollHeight - body.clientHeight,
          deckWidth: Math.round(rect.width),
          deckHeight: Math.round(rect.height)
        };
      });

      slides.push(metrics);
      if (metrics.documentOverflowX > 0 || metrics.slideOverflowX > 0 || metrics.bodyOverflowX > 0) {
        overflowIssues.push({ viewport: viewport.name, kind: 'horizontal', ...metrics });
      }
      if (!viewport.allowVerticalScroll && (metrics.slideOverflowY > 0 || metrics.bodyOverflowY > 0)) {
        overflowIssues.push({ viewport: viewport.name, kind: 'vertical', ...metrics });
      }
    }

    viewportReports.push({ viewport, slides });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => { location.hash = '#slide-01'; });
  await page.waitForTimeout(20);

  await page.keyboard.press('ArrowRight');
  const arrowResult = await page.evaluate(() => location.hash);
  await page.keyboard.press('End');
  const endResult = await page.evaluate(() => location.hash);
  await page.keyboard.press('Home');
  const homeResult = await page.evaluate(() => location.hash);

  await page.keyboard.press('o');
  const overviewOpen = await page.locator('#overviewDialog').evaluate((dialog) => dialog.open);
  await page.keyboard.press('Escape');
  const overviewClosed = !(await page.locator('#overviewDialog').evaluate((dialog) => dialog.open));

  await page.evaluate(() => { location.hash = '#slide-14'; });
  await page.waitForTimeout(20);
  const launchCost = await page.locator('#monthlyCostResult').innerText();
  await page.getByRole('button', { name: 'Pilot', exact: true }).click();
  const pilotCost = await page.locator('#monthlyCostResult').innerText();
  const pilotPressed = await page.getByRole('button', { name: 'Pilot', exact: true }).getAttribute('aria-pressed');

  const beforeRangeHash = await page.evaluate(() => location.hash);
  await page.locator('#monthlyRequests').focus();
  await page.keyboard.press('ArrowRight');
  const afterRangeHash = await page.evaluate(() => location.hash);

  const inertReport = await page.evaluate(() => {
    const active = document.querySelector('.slide.is-active');
    const inactive = Array.from(document.querySelectorAll('.slide:not(.is-active)'));
    return {
      activeHasInert: active.hasAttribute('inert'),
      inactiveCount: inactive.length,
      inactiveWithInert: inactive.filter((slide) => slide.hasAttribute('inert')).length
    };
  });

  const noJsReport = await page.evaluate(() => {
    document.documentElement.classList.remove('js');
    document.documentElement.classList.add('no-js');
    const slides = Array.from(document.querySelectorAll('.slide'));
    const report = {
      visibleSlides: slides.filter((slide) => getComputedStyle(slide).display !== 'none').length,
      controlsDisplay: getComputedStyle(document.querySelector('.controls')).display
    };
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');
    return report;
  });

  const artifactLinks = await page.locator('.artifact-link').evaluateAll((links) => links.map((link) => link.href));
  const linkChecks = [];
  for (const href of artifactLinks) {
    const response = await page.request.get(href);
    linkChecks.push({ href, status: response.status(), ok: response.ok() });
  }

  await page.getByRole('button', { name: 'Launch', exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => { location.hash = '#slide-01'; });
  await page.waitForTimeout(20);
  await page.screenshot({ path: 'output/playwright/flow-content-backend-goal-1440.png' });
  await page.evaluate(() => { location.hash = '#slide-14'; });
  await page.waitForTimeout(20);
  await page.screenshot({ path: 'output/playwright/flow-content-backend-goal-cost-1440.png' });
  await page.evaluate(() => { location.hash = '#slide-20'; });
  await page.waitForTimeout(20);
  await page.screenshot({ path: 'output/playwright/flow-content-backend-goal-final-1440.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = '#slide-01'; });
  await page.waitForTimeout(20);
  const mobileComposition = await page.evaluate(() => {
    const secondOutput = document.querySelector('#slide-01 .output-row:nth-child(2)').getBoundingClientRect();
    const decisionRail = document.querySelector('#slide-01 .decision-rail').getBoundingClientRect();
    return {
      secondOutputBottom: Math.round(secondOutput.bottom),
      decisionRailTop: Math.round(decisionRail.top),
      orderedWithoutOverlap: secondOutput.bottom <= decisionRail.top
    };
  });
  await page.screenshot({ path: 'output/playwright/flow-content-backend-goal-390.png' });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: 'output/playwright/flow-content-backend-goal.pdf',
    width: '13.333in',
    height: '7.5in',
    printBackground: true,
    preferCSSPageSize: true
  });
  await page.emulateMedia({ media: 'screen' });

  if (overflowIssues.length) throw new Error(`Overflow issues: ${JSON.stringify(overflowIssues)}`);
  if (consoleMessages.length) throw new Error(`Console messages: ${JSON.stringify(consoleMessages)}`);
  if (arrowResult !== '#slide-02' || endResult !== '#slide-20' || homeResult !== '#slide-01') throw new Error('Keyboard navigation failed');
  if (!overviewOpen || !overviewClosed) throw new Error('Overview dialog open/close failed');
  if (launchCost !== '287,281원' || pilotCost !== '76,896원' || pilotPressed !== 'true') throw new Error(`Cost preset mismatch: ${launchCost}/${pilotCost}/${pilotPressed}`);
  if (beforeRangeHash !== afterRangeHash) throw new Error('Range input key changed the active slide');
  if (inertReport.activeHasInert || inertReport.inactiveWithInert !== inertReport.inactiveCount) throw new Error(`Inert state failed: ${JSON.stringify(inertReport)}`);
  if (noJsReport.visibleSlides !== slideCount || noJsReport.controlsDisplay !== 'none') throw new Error(`No-JS fallback failed: ${JSON.stringify(noJsReport)}`);
  if (!mobileComposition.orderedWithoutOverlap) throw new Error(`Mobile composition overlap: ${JSON.stringify(mobileComposition)}`);
  if (linkChecks.some((link) => !link.ok)) throw new Error(`Broken artifact link: ${JSON.stringify(linkChecks)}`);

  return {
    slideCount,
    overflowIssues,
    viewportSummary: viewportReports.map((report) => ({
      name: report.viewport.name,
      width: report.viewport.width,
      height: report.viewport.height,
      maxDocumentOverflowX: Math.max(...report.slides.map((slide) => slide.documentOverflowX)),
      maxSlideOverflowX: Math.max(...report.slides.map((slide) => slide.slideOverflowX)),
      maxSlideOverflowY: Math.max(...report.slides.map((slide) => slide.slideOverflowY)),
      maxBodyOverflowY: Math.max(...report.slides.map((slide) => slide.bodyOverflowY))
    })),
    interactions: {
      arrowResult,
      endResult,
      homeResult,
      overviewOpen,
      overviewClosed,
      launchCost,
      pilotCost,
      pilotPressed,
      rangeInputKeptSlide: beforeRangeHash === afterRangeHash,
      inertReport,
      noJsReport,
      mobileComposition
    },
    linkChecks,
    consoleMessages,
    screenshots: [
      'output/playwright/flow-content-backend-goal-1440.png',
      'output/playwright/flow-content-backend-goal-cost-1440.png',
      'output/playwright/flow-content-backend-goal-final-1440.png',
      'output/playwright/flow-content-backend-goal-390.png'
    ],
    pdf: 'output/playwright/flow-content-backend-goal.pdf'
  };
}
