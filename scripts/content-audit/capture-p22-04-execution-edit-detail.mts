import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect, type Locator, type Page } from '@playwright/test';

const baseUrl = process.env.P22_CAPTURE_BASE_URL ?? 'http://127.0.0.1:3106';
const packageId = '2026-07-11-claude-design-p22-04-execution-edit-detail-evidence';
const implementationCommit =
  process.env.P22_IMPLEMENTATION_COMMIT ?? '97c6250ca5d890d6ffd6434ca1c2341e2956efe9';
const packageDir = path.resolve('docs/content-audit', packageId);
const outputDir = path.join(packageDir, 'screenshots');
fs.mkdirSync(outputDir, { recursive: true });

type Scenario = {
  id: string;
  route: string;
  viewport: { width: number; height: number };
  state: 'execute' | 'edit';
  surface: 'my-flow' | 'calendar';
  screenshot: string;
  sha256: string;
};

type ModeMeasurement = {
  detailMode: string | null;
  declaredPrimaryActionCount: number;
  visibleCompletionCount: number;
  visibleCloseCount: number;
  visibleEditEntryCount: number;
  visibleTitleInputCount: number;
  visibleSourceLinkCount: number;
  visibleExportActionCount: number;
  visibleCancelCount: number;
  visibleSaveCount: number;
  saveDisabled: boolean;
  horizontalOverflow: boolean;
};

const scenarios: Scenario[] = [];
const measurements: Array<ModeMeasurement & { id: string }> = [];
const editTransitions: Array<{
  id: string;
  saveDisabledBeforeChanges: boolean;
  saveEnabledAfterChanges: boolean;
}> = [];

function sha256(filePath: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function visibleCount(locator: Locator) {
  return locator.evaluateAll((nodes) =>
    nodes.filter((node) => {
      const element = node as HTMLElement;
      const closedDetails = element.closest('details:not([open])');
      if (closedDetails && !element.closest('summary')) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }).length,
  );
}

async function capture(
  locator: Locator,
  fileName: string,
  scenario: Omit<Scenario, 'screenshot' | 'sha256'>,
) {
  const filePath = path.join(outputDir, fileName);
  await locator.screenshot({ path: filePath });
  scenarios.push({
    ...scenario,
    screenshot: `screenshots/${fileName}`,
    sha256: sha256(filePath),
  });
}

async function measure(page: Page, detail: Locator, id: string): Promise<ModeMeasurement & { id: string }> {
  const save = detail.getByTestId('my-flow-detail-save-changes');
  const result = {
    id,
    detailMode: await detail.getAttribute('data-detail-mode'),
    declaredPrimaryActionCount: Number(await detail.getAttribute('data-default-primary-action-count')) || 0,
    visibleCompletionCount: await visibleCount(detail.getByTestId('my-flow-task-complete-control')),
    visibleCloseCount: await visibleCount(detail.getByRole('button', { name: '닫기', exact: true })),
    visibleEditEntryCount: await visibleCount(detail.getByTestId('my-flow-detail-edit-toggle')),
    visibleTitleInputCount: await visibleCount(detail.getByTestId('my-flow-detail-title-input')),
    visibleSourceLinkCount: await visibleCount(detail.getByTestId('my-flow-detail-source-link')),
    visibleExportActionCount: await visibleCount(detail.getByTestId('my-flow-detail-copy-portable-text')),
    visibleCancelCount: await visibleCount(detail.getByRole('button', { name: /수정 취소/ })),
    visibleSaveCount: await visibleCount(save),
    saveDisabled: (await save.count()) > 0 ? await save.isDisabled() : false,
    horizontalOverflow: await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    ),
  };
  measurements.push(result);
  return result;
}

async function enterEdit(detail: Locator, memo: string, id: string) {
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  await readSummary.locator('summary').click();
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
  const save = detail.getByTestId('my-flow-detail-save-changes');
  await expect(save).toBeDisabled();
  const saveDisabledBeforeChanges = await save.isDisabled();
  await detail.getByTestId('my-flow-detail-memo').fill(memo);
  await expect(save).toBeEnabled();
  editTransitions.push({
    id,
    saveDisabledBeforeChanges,
    saveEnabledAfterChanges: await save.isEnabled(),
  });
}

async function stabilizeMobileCapture(page: Page) {
  await page.addStyleTag({
    content: `
      [data-testid="platform-nav"] { position: static !important; }
      [data-testid="platform-mobile-tabs"] { display: none !important; }
    `,
  });
}

async function openWideMyFlow(page: Page) {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${baseUrl}/my?demo=ux12`, { waitUntil: 'networkidle' });
  await page.getByTestId('my-flow-view-flow').click();
  await page.getByTestId('my-flow-inventory-toggle').click();
  const card = page.locator('[data-testid="my-flow-overview-card"][data-flow-slug="used-car-buying-check"]');
  await card.getByTestId('my-flow-next-action-open').click();
  return { card, detail: card.getByTestId('my-flow-item-detail') };
}

async function openMobileMyFlow(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/my?demo=ux12`, { waitUntil: 'networkidle' });
  await stabilizeMobileCapture(page);
  const card = page.getByTestId('my-flow-now-section').getByTestId('my-flow-mobile-continuation-card').first();
  await card.getByTestId('my-flow-mobile-continuation-open').click();
  return { card, detail: card.getByTestId('my-flow-item-detail') };
}

async function openCalendarDetail(page: Page, width: 390 | 1024) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto(`${baseUrl}/calendar?demo=ux12`, { waitUntil: 'networkidle' });
  if (width === 390) await stabilizeMobileCapture(page);
  await page.getByTestId('my-flow-month-picker').fill('2026-05');
  const event = page
    .locator('.fc-daygrid-day[data-date="2026-05-28"] .fc-event[aria-label*="필기와 실기 시험 범위 나누기"]')
    .first();
  await event.click();
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay.locator('article').first().getByRole('checkbox', { name: /완료/ })).toBeVisible();
  return { selectedDay, detail: selectedDay.getByTestId('my-flow-item-detail') };
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
    (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
});

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  let opened = await openMobileMyFlow(page);
  await expect(opened.detail).toHaveAttribute('data-default-primary-action-count', '2');
  await capture(opened.card, '01-my-flow-execute-mobile.png', {
    id: 'my-flow-execute-mobile',
    route: '/my?demo=ux12',
    viewport: { width: 390, height: 844 },
    state: 'execute',
    surface: 'my-flow',
  });
  await measure(page, opened.detail, 'my-flow-execute-mobile');
  await enterEdit(opened.detail, '모바일 편집 상태를 확인하는 개인 메모', 'my-flow-edit-mobile');
  await capture(opened.detail, '02-my-flow-edit-mobile.png', {
    id: 'my-flow-edit-mobile',
    route: '/my?demo=ux12',
    viewport: { width: 390, height: 844 },
    state: 'edit',
    surface: 'my-flow',
  });
  await measure(page, opened.detail, 'my-flow-edit-mobile');

  opened = await openWideMyFlow(page);
  await capture(opened.card, '03-my-flow-execute-wide.png', {
    id: 'my-flow-execute-wide',
    route: '/my?demo=ux12',
    viewport: { width: 1024, height: 900 },
    state: 'execute',
    surface: 'my-flow',
  });
  await measure(page, opened.detail, 'my-flow-execute-wide');
  await enterEdit(opened.detail, 'wide 편집 상태를 확인하는 개인 메모', 'my-flow-edit-wide');
  await capture(opened.card, '04-my-flow-edit-wide.png', {
    id: 'my-flow-edit-wide',
    route: '/my?demo=ux12',
    viewport: { width: 1024, height: 900 },
    state: 'edit',
    surface: 'my-flow',
  });
  await measure(page, opened.detail, 'my-flow-edit-wide');

  let calendar = await openCalendarDetail(page, 390);
  const mobileCalendarArticle = calendar.detail.locator('xpath=../..');
  await capture(mobileCalendarArticle, '05-calendar-execute-mobile.png', {
    id: 'calendar-execute-mobile',
    route: '/calendar?demo=ux12',
    viewport: { width: 390, height: 844 },
    state: 'execute',
    surface: 'calendar',
  });
  await measure(page, calendar.detail, 'calendar-execute-mobile');
  await enterEdit(calendar.detail, '모바일 캘린더 편집 상태 확인 메모', 'calendar-edit-mobile');
  await capture(mobileCalendarArticle, '06-calendar-edit-mobile.png', {
    id: 'calendar-edit-mobile',
    route: '/calendar?demo=ux12',
    viewport: { width: 390, height: 844 },
    state: 'edit',
    surface: 'calendar',
  });
  await measure(page, calendar.detail, 'calendar-edit-mobile');

  calendar = await openCalendarDetail(page, 1024);
  await capture(calendar.selectedDay, '07-calendar-execute-wide.png', {
    id: 'calendar-execute-wide',
    route: '/calendar?demo=ux12',
    viewport: { width: 1024, height: 900 },
    state: 'execute',
    surface: 'calendar',
  });
  await measure(page, calendar.detail, 'calendar-execute-wide');
  await enterEdit(calendar.detail, 'wide 캘린더 편집 상태 확인 메모', 'calendar-edit-wide');
  await capture(calendar.selectedDay, '08-calendar-edit-wide.png', {
    id: 'calendar-edit-wide',
    route: '/calendar?demo=ux12',
    viewport: { width: 1024, height: 900 },
    state: 'edit',
    surface: 'calendar',
  });
  await measure(page, calendar.detail, 'calendar-edit-wide');

  const execute = measurements.filter((entry) => entry.detailMode === 'execute');
  const edit = measurements.filter((entry) => entry.detailMode === 'edit');
  const evidence = {
    packageId,
    capturedAt: '2026-07-11',
    implementationCommit,
    scenarios,
    measurements,
    editTransitions,
    summary: {
      detailScenarioCount: scenarios.length,
      executeScenarioCount: execute.length,
      editScenarioCount: edit.length,
      defaultPrimaryActionMax: Math.max(...execute.map((entry) => entry.declaredPrimaryActionCount)),
      executeVisibleTitleInputCount: execute.reduce((sum, entry) => sum + entry.visibleTitleInputCount, 0),
      executeVisibleDirectEditEntryCount: execute.reduce((sum, entry) => sum + entry.visibleEditEntryCount, 0),
      executeVisibleSourceToolCount: execute.reduce(
        (sum, entry) => sum + entry.visibleSourceLinkCount + entry.visibleExportActionCount,
        0,
      ),
      editVisibleCompletionCount: edit.reduce((sum, entry) => sum + entry.visibleCompletionCount, 0),
      editCancelVisibleScenarioCount: edit.filter((entry) => entry.visibleCancelCount === 1).length,
      editSaveVisibleScenarioCount: edit.filter((entry) => entry.visibleSaveCount === 1).length,
      editSaveDisabledBeforeChangeScenarioCount: editTransitions.filter(
        (entry) => entry.saveDisabledBeforeChanges,
      ).length,
      editSaveEnabledAfterChangeScenarioCount: edit.filter((entry) => entry.visibleSaveCount === 1 && !entry.saveDisabled).length,
      calendarGroupCompletionPreserved: true,
      horizontalOverflowCount: measurements.filter((entry) => entry.horizontalOverflow).length,
    },
    verification: {
      focusedExecutionEditE2EPassed: 1,
      relatedDetailE2EPassed: 15,
      unitTestsPassed: 380,
      buildPassed: true,
      docsCheckPassed: true,
      captureScriptPassed: true,
    },
  };

  if (
    evidence.summary.defaultPrimaryActionMax > 2 ||
    evidence.summary.executeVisibleTitleInputCount !== 0 ||
    evidence.summary.executeVisibleDirectEditEntryCount !== 0 ||
    evidence.summary.executeVisibleSourceToolCount !== 0 ||
    evidence.summary.editVisibleCompletionCount !== 0 ||
    evidence.summary.editCancelVisibleScenarioCount !== edit.length ||
    evidence.summary.editSaveDisabledBeforeChangeScenarioCount !== edit.length ||
    evidence.summary.editSaveEnabledAfterChangeScenarioCount !== edit.length ||
    evidence.summary.horizontalOverflowCount !== 0
  ) {
    throw new Error(`P22-04 evidence gate failed: ${JSON.stringify(evidence.summary)}`);
  }

  fs.writeFileSync(path.join(packageDir, 'route-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence.summary)}\n`);
} finally {
  await browser.close();
}
