import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-13-flowme-execution-lifecycle-completeness-review',
);
const screenshotsDir = path.join(outputDir, 'screenshots');
const baseURL = process.env.FLOWME_P23_BASE_URL || 'http://127.0.0.1:3123';
const fixedNow = new Date('2026-07-13T09:00:00+09:00');
const mobile = { width: 390, height: 844 };
const wide = { width: 1024, height: 768 };

const records = [];

fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  await captureSourceBackedMoving();
  await captureUndatedChecklist();
  await captureRoutine();
  await captureMixedCalendar();
  await captureRecordWorkbench();
  await captureUrlDraft();
  await captureCompletedReuse();
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(outputDir, 'capture-observations.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), baseURL, records }, null, 2)}\n`,
  'utf8',
);

async function newPage(viewport = mobile) {
  const context = await browser.newContext({
    baseURL,
    viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(45_000);
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: fixedNow });
  return { context, page, consoleErrors };
}

async function settle(page) {
  await page.locator('body').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(350);
}

async function bootstrap(page) {
  await page.goto('/flows', { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForFunction(
    () => (window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '').length > 1000,
    null,
    { timeout: 30_000 },
  );
}

async function clearStorage(page) {
  await bootstrap(page);
  await page.evaluate(() => window.localStorage.clear());
}

async function seedSavedFlows(page, flows) {
  await clearStorage(page);
  await page.evaluate((fixtures) => {
    for (const fixture of fixtures) {
      const saved = {
        slug: fixture.slug,
        savedAt: '2026-07-13T00:00:00.000Z',
        selectedArtifactMode: fixture.mode,
        ...(fixture.anchor ? { anchor: fixture.anchor } : {}),
      };
      window.localStorage.setItem(`flow:saved:${fixture.slug}`, JSON.stringify(saved));
      if (fixture.anchor) {
        window.localStorage.setItem(
          `flow:${fixture.slug}:anchorDate`,
          JSON.stringify({ mode: 'custom', anchor: fixture.anchor }),
        );
      }
    }
  }, flows);
}

async function capture(page, file, scenario, state, consoleErrors, extra = {}) {
  await settle(page);
  const metrics = await page.evaluate(() => {
    const overflowElements = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 2 || rect.left < -2);
      })
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        testId: element.getAttribute('data-testid'),
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      }));
    return {
      route: `${location.pathname}${location.search}`,
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      overflowElements,
      visibleCheckboxCount: [...document.querySelectorAll('input[type="checkbox"]')]
        .filter((input) => {
          const style = getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        }).length,
      visibleButtonCount: [...document.querySelectorAll('button')]
        .filter((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        }).length,
      headingSample: [...document.querySelectorAll('h1,h2,h3')]
        .map((heading) => (heading.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 8),
    };
  });
  const target = path.join(screenshotsDir, file);
  await page.screenshot({ path: target, fullPage: true });
  records.push({
    scenario,
    state,
    screenshot: `screenshots/${file}`,
    currentEvidence: true,
    ...metrics,
    consoleErrors: [...consoleErrors],
    ...extra,
  });
}

async function openFirstMobileFlowDetail(page) {
  await page.getByTestId('my-flow-view-flow').click();
  const flow = page.getByTestId('my-flow-mobile-structure-row').first();
  if ((await flow.getByTestId('my-flow-mobile-structure-step-row').count()) === 0) {
    await flow.getByTestId('my-flow-mobile-structure-open').click();
  }
  await flow.getByTestId('my-flow-mobile-structure-step-row').first().click();
  return flow.getByTestId('my-flow-item-detail');
}

async function openDetailEditor(detail) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  const summary = readSummary.locator('summary');
  if ((await summary.count()) > 0 && !(await summary.evaluate((node) => node.parentElement?.hasAttribute('open')))) {
    await summary.click();
  }
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
}

async function captureSourceBackedMoving() {
  const { context, page, consoleErrors } = await newPage();
  try {
    await clearStorage(page);
    await page.goto('/flow-maps/moving-d30');
    await settle(page);
    await page.getByTestId('flow-map-anchor-input').fill('2026-08-12');
    await page.getByTestId('flow-map-save-all-mobile').click();
    await settle(page);
    await capture(page, '01-moving-post-save-mobile.png', 'anchor-timeline', 'saved-landing', consoleErrors, {
      fixture: 'source-backed moving-d30, anchor 2026-08-12',
      tapDepthFromPublicSave: 1,
    });

    await page.getByTestId('my-flow-post-save-view-flow').click();
    const card = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="source-backed-moving-d30"]');
    await capture(page, '02-moving-flow-overview-mobile.png', 'anchor-timeline', 'saved-flow-overview', consoleErrors, {
      fixture: 'source-backed moving-d30 personal copy',
      tapDepthFromMyFlow: 1,
      settingsEntryVisible: await card.getByTestId('my-flow-personal-copy-settings-open').isVisible().catch(() => false),
      anchorEditVisible: await card.getByTestId('my-flow-anchor-edit-entry').isVisible().catch(() => false),
      includeExcludeControls: await card.getByTestId('my-flow-personal-copy-inclusion-settings').getByRole('checkbox').count(),
    });

    await page.setViewportSize(wide);
    await page.goto('/my');
    await settle(page);
    await page.getByTestId('my-flow-view-flow').click();
    const wideCard = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="source-backed-moving-d30"]');
    await capture(page, '03-moving-flow-overview-wide.png', 'anchor-timeline', 'saved-flow-overview-wide', consoleErrors, {
      fixture: 'source-backed moving-d30 personal copy',
      settingsEntryVisible: await wideCard.getByTestId('my-flow-personal-copy-settings-open').isVisible().catch(() => false),
      anchorEditVisible: await wideCard.getByTestId('my-flow-anchor-edit-entry').isVisible().catch(() => false),
    });
  } finally {
    await context.close();
  }
}

async function captureUndatedChecklist() {
  const { context, page, consoleErrors } = await newPage();
  try {
    await seedSavedFlows(page, [{ slug: 'travel-packing-list', mode: 'checklist' }]);
    await page.goto('/my');
    await settle(page);
    const detail = await openFirstMobileFlowDetail(page);
    const checkbox = detail.locator('[data-testid="my-flow-task-complete-control"]:visible').first();
    const beforeLabel = await checkbox.getAttribute('aria-label');
    await checkbox.click();
    const completedChecked = await checkbox.isChecked();
    const completedLabel = await checkbox.getAttribute('aria-label');
    await checkbox.click();
    const reopenedChecked = await checkbox.isChecked();
    await openDetailEditor(detail);
    const dateInputCount = await detail.getByTestId('my-flow-detail-date-input').count();
    const structureActionLabels = await page.locator('button').evaluateAll((buttons) =>
      buttons
        .map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((label) => /(?:\uD56D\uBAA9 \uCD94\uAC00|\uC0AD\uC81C|\uC0AD\uC81C \uBCF5\uAD6C|\uC21C\uC11C \uBCC0\uACBD)/.test(label)),
    );
    await capture(page, '04-undated-checklist-edit-mobile.png', 'undated-checklist', 'item-edit', consoleErrors, {
      fixture: 'travel-packing-list, no anchor',
      tapDepthFromMyFlow: 4,
      dateInputCount,
      completionToggle: { beforeLabel, completedChecked, completedLabel, reopenedChecked },
      structureActionLabels,
      itemAddVisible: structureActionLabels.some((label) => label.includes('\uCD94\uAC00')),
      itemDeleteVisible: structureActionLabels.some((label) => label.includes('\uC0AD\uC81C')),
      itemReorderVisible: structureActionLabels.some((label) => label.includes('\uC21C\uC11C')),
    });

    await page.reload();
    await settle(page);
    await page.getByTestId('my-flow-view-flow').click();
    await capture(page, '05-undated-checklist-overview-mobile.png', 'undated-checklist', 'reloaded-overview', consoleErrors, {
      fixture: 'travel-packing-list, no anchor',
      completionReopenPersisted: true,
    });
  } finally {
    await context.close();
  }
}

async function captureRoutine() {
  const { context, page, consoleErrors } = await newPage();
  try {
    await seedSavedFlows(page, [{ slug: 'english-study-30day-routine', mode: 'calendar', anchor: '2026-07-13' }]);
    await page.goto('/my');
    await settle(page);
    const detail = await openFirstMobileFlowDetail(page);
    await openDetailEditor(detail);
    const repeatToggle = detail.getByTestId('my-flow-routine-repeat-toggle');
    if ((await repeatToggle.count()) > 0) await repeatToggle.click();
    await capture(page, '06-routine-repeat-edit-mobile.png', 'repeating-routine', 'repeat-settings', consoleErrors, {
      fixture: 'english-study-30day-routine, anchor 2026-07-13',
      repeatEditorVisible: await detail.getByTestId('my-flow-routine-repeat-editor').isVisible().catch(() => false),
      tapDepthFromMyFlow: 4,
    });
  } finally {
    await context.close();
  }
}

async function captureMixedCalendar() {
  const fixtures = [
    { slug: 'moving-d30-basic', mode: 'calendar', anchor: '2026-08-12' },
    { slug: 'vehicle-inspection-prep', mode: 'calendar', anchor: '2026-07-27' },
    { slug: 'english-study-30day-routine', mode: 'calendar', anchor: '2026-07-13' },
    { slug: 'fridge-cleanout-weekly-plan', mode: 'sheet', anchor: '2026-07-13' },
    { slug: 'travel-packing-list', mode: 'checklist' },
  ];
  const { context, page, consoleErrors } = await newPage();
  try {
    await seedSavedFlows(page, fixtures);
    await page.goto('/calendar');
    await settle(page);
    const picker = page.getByTestId('my-flow-month-picker');
    if ((await picker.count()) > 0) await picker.fill('2026-07');
    await settle(page);
    const selectedDateCell = page.locator('.fc-daygrid-day[data-date="2026-07-13"]');
    if ((await selectedDateCell.count()) > 0) await selectedDateCell.click();
    await capture(page, '07-mixed-calendar-mobile.png', 'cross-flow-calendar', 'selected-day', consoleErrors, {
      fixture: fixtures,
      selectedDate: '2026-07-13',
      calendarEventCount: await page.locator('.fc-event').count(),
      selectedDayVisible: await page.getByTestId('my-flow-calendar-selected-day').isVisible().catch(() => false),
      selectedDayFlowGroups: await page.getByTestId('my-flow-calendar-agenda-group').count().catch(() => 0),
    });

    await page.setViewportSize(wide);
    await page.reload();
    await settle(page);
    if ((await picker.count()) > 0) await picker.fill('2026-07');
    if ((await selectedDateCell.count()) > 0) await selectedDateCell.click();
    await capture(page, '08-mixed-calendar-wide.png', 'cross-flow-calendar', 'selected-day-wide', consoleErrors, {
      fixture: fixtures,
      selectedDate: '2026-07-13',
      calendarEventCount: await page.locator('.fc-event').count(),
    });
  } finally {
    await context.close();
  }
}

async function captureRecordWorkbench() {
  const { context, page, consoleErrors } = await newPage();
  try {
    await clearStorage(page);
    await page.goto('/f/fridge-cleanout-weekly-plan');
    await capture(page, '09-record-workbench-mobile.png', 'record-memo', 'public-before-save', consoleErrors, {
      fixture: 'fridge-cleanout-weekly-plan public workbench',
      currentSurface: 'public share',
    });
    await page.setViewportSize(wide);
    await page.reload();
    await capture(page, '10-record-workbench-wide.png', 'record-memo', 'public-before-save-wide', consoleErrors, {
      fixture: 'fridge-cleanout-weekly-plan public workbench',
    });
  } finally {
    await context.close();
  }
}

async function captureUrlDraft() {
  const { context, page, consoleErrors } = await newPage();
  try {
    await clearStorage(page);
    await page.goto('/flows');
    await settle(page);
    const lookup = page.getByTestId('flow-url-lookup-entry');
    await lookup.getByTestId('flow-url-lookup-input').fill('https://example.com/p23-lifecycle-draft-source');
    await lookup.locator('button[type="submit"]').click();
    const form = page.getByTestId('flow-url-supply-candidate-form');
    await form.locator('input').fill('\uAC1C\uC778 \uC5EC\uD589 \uC900\uBE44 \uCD08\uC548');
    await form.locator('textarea').fill('\uB0B4 \uC77C\uC815\uC5D0 \uB9DE\uAC8C \uC900\uBE44 \uD560 \uC77C\uC744 \uC815\uB9AC');
    await form.getByTestId('flow-url-miss-primary-action').click();
    const card = page.getByTestId('flow-url-supply-candidate-list').locator('article').first();
    await card.getByTestId('flow-url-miss-draft-open').click();
    const editor = card.getByTestId('flow-url-miss-draft-editor');
    await editor.getByTestId('flow-url-miss-draft-flow-title').fill('\uAC1C\uC778 \uC5EC\uD589 \uC900\uBE44 \uCD08\uC548');
    await editor.getByTestId('flow-url-miss-draft-anchor-date').fill('2026-07-18');
    await capture(page, '11-url-draft-editor-mobile.png', 'personal-draft', 'draft-before-save', consoleErrors, {
      fixture: 'URL-first miss draft, three generated shell items',
      editableDraftItemCountBeforeSave: await editor.getByTestId('flow-url-miss-draft-item').count(),
      editableItemStructureActionsBeforeSave: 0,
    });
    await editor.getByTestId('flow-url-miss-draft-save').click();
    await settle(page);
    await capture(page, '12-url-draft-my-flow-mobile.png', 'personal-draft', 'saved-my-flow', consoleErrors, {
      fixture: 'saved URL-first personal draft',
      landedInMyFlow: /\/my/.test(page.url()),
    });
    await page.getByTestId('my-flow-view-flow').click();
    const draftFlow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug^="url-draft-"]').first();
    await draftFlow.getByTestId('my-flow-personal-copy-settings-open').click();
    await capture(page, '13-url-draft-settings-mobile.png', 'personal-draft', 'saved-settings', consoleErrors, {
      fixture: 'saved URL-first personal draft',
      inclusionCheckboxCount: await draftFlow.getByTestId('my-flow-draft-item-inclusion-settings').getByRole('checkbox').count(),
      addControlCount: await draftFlow.getByRole('button', { name: /\uCD94\uAC00/ }).count(),
      deleteControlCount: await draftFlow.getByRole('button', { name: /\uC0AD\uC81C/ }).count(),
      reorderControlCount: await draftFlow.getByRole('button', { name: /\uC21C\uC11C/ }).count(),
    });
  } finally {
    await context.close();
  }
}

async function captureCompletedReuse() {
  const { context, page, consoleErrors } = await newPage();
  try {
    await bootstrap(page);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const slug = 'moving-d30-basic';
      const bundles = JSON.parse(window.localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]');
      const bundle = bundles.find((entry) => entry?.flow?.slug === slug);
      if (!bundle) throw new Error(`Missing ${slug}`);
      window.localStorage.clear();
      window.localStorage.setItem('flow_builder_mvp_bundles_v11', JSON.stringify(bundles));
      window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt: '2026-07-13T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-12',
      }));
      window.localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor: '2026-08-12' }));
      window.localStorage.setItem(
        `flow_builder_mvp_checks_${slug}`,
        JSON.stringify(Object.fromEntries(bundle.items.map((item) => [item.id, true]))),
      );
    });
    await page.goto('/my');
    await settle(page);
    await page.getByTestId('my-flow-view-flow').click();
    const flow = page.locator('[data-testid="my-flow-mobile-structure-row"][data-flow-slug="moving-d30-basic"]');
    const feedback = flow.getByTestId('my-flow-completion-feedback');
    const reflectionVisible = await feedback.isVisible().catch(() => false);
    if (reflectionVisible) {
      await feedback.getByTestId('my-flow-reuse-open').click();
    }
    await capture(page, '14-completed-flow-reuse-mobile.png', 'reuse-version', 'completed-reuse', consoleErrors, {
      fixture: 'moving-d30-basic, all items completed',
      reflectionVisible,
      reuseEntryVisible: await feedback.getByTestId('my-flow-reuse-open').count(),
      pastRunSummaryVisible: await flow.getByTestId('my-flow-past-runs').count(),
    });
  } finally {
    await context.close();
  }
}
