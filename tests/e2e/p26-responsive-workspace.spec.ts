import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P26_18_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string, fullPage = false) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage });
}

async function expectMinimumTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

async function seedWorkspace(page: Page, options: { multiple?: boolean } = {}) {
  await page.addInitScript(({ multiple }) => {
    window.localStorage.clear();
    const savedAt = '2026-07-20T00:00:00.000Z';
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt,
      selectedArtifactMode: 'calendar',
      anchor: '2026-08-15',
    }));
    window.localStorage.setItem('flow:moving-d30-basic:anchorDate', JSON.stringify({
      mode: 'custom',
      anchor: '2026-08-15',
    }));
    if (multiple) {
      window.localStorage.setItem('flow:saved:vehicle-inspection-prep', JSON.stringify({
        slug: 'vehicle-inspection-prep',
        savedAt,
        selectedArtifactMode: 'checklist',
      }));
      window.localStorage.setItem('flow:saved:computer-skills-d30-study', JSON.stringify({
        slug: 'computer-skills-d30-study',
        savedAt,
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-16',
      }));
      window.localStorage.setItem('flow:computer-skills-d30-study:anchorDate', JSON.stringify({
        mode: 'custom',
        anchor: '2026-08-16',
      }));
    }
  }, options);
}

test.use({ timezoneId: 'Asia/Seoul' });

test('mobile focused drill-in keeps feedback and the editor above persistent navigation', async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-07-20T09:00:00+09:00') });
  await seedWorkspace(page, { multiple: true });
  await page.goto('/my');

  const navigation = page.getByTestId('platform-mobile-tabs');
  await expect(navigation).toHaveAttribute('data-layer-priority', 'navigation');
  for (const tab of await navigation.getByRole('link').all()) await expectMinimumTarget(tab);

  const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'execute');
  const execution = flow
    .getByTestId('my-flow-temporal-next-group')
    .getByTestId('my-flow-execution-row-shell')
    .first();
  await expect(execution.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  const open = execution.getByRole('button', { name: /열기/ });
  await expectMinimumTarget(open);
  await open.click();
  const detail = getOpenMyFlowItemDetail(page);
  await expect(detail).toBeVisible();
  const completion = detail.getByTestId('my-flow-task-complete-control');
  await expect(completion).toHaveCount(1);
  await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
  await completion.click();
  const notice = page.getByTestId('my-flow-completion-snackbar');
  await expect(notice).toHaveAttribute('data-layer-priority', 'notice');
  const [noticeBox, navigationBox] = await Promise.all([notice.boundingBox(), navigation.boundingBox()]);
  expect(noticeBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect((noticeBox?.y ?? 0) + (noticeBox?.height ?? 0)).toBeLessThanOrEqual((navigationBox?.y ?? 0) - 4);
  await expectMinimumTarget(notice.getByRole('button'));
  await capture(page, '01-mobile-fixed-layer-stack.png');
  await notice.getByTestId('my-flow-completion-undo').press('Enter');
  await expect(completion).not.toBeChecked();
  await expect(completion).toBeFocused();

  await capture(page, '02-mobile-focused-item-detail.png');
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    const readSummary = detail.getByTestId('my-flow-detail-read-summary');
    if ((await readSummary.getAttribute('open')) === null) await readSummary.locator('summary').click();
    await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  const editor = page.getByRole('dialog', { name: '수정' });
  await expect(editor).toHaveAttribute('data-editor-layout', 'mobile-full-screen');
  const editorBox = await editor.boundingBox();
  expect(editorBox?.x).toBe(0);
  expect(editorBox?.y).toBe(0);
  expect(editorBox?.width).toBe(390);
  expect(editorBox?.height).toBe(844);
  await capture(page, '03-mobile-full-screen-editor.png');
  expect(browserErrors).toEqual([]);
});

test('wide workspaces keep the active detail and selected-day agenda inside the viewport', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await seedWorkspace(page, { multiple: true });
  await page.goto('/my?view=flows');
  const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'plan');
  await expect(flow).toHaveAttribute('data-p35-marker', 'P35-PERSONAL-SINGLE-FOCUS');
  await expect(flow.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
  const detailPane = flow.getByTestId('my-flow-workspace-detail-pane');
  const detailPaneBox = await detailPane.boundingBox();
  expect(detailPaneBox).not.toBeNull();
  expect(detailPaneBox?.height ?? 0).toBeLessThanOrEqual(736);
  const wideRow = flow.getByTestId('my-flow-execution-row-shell').first();
  await expect(wideRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
  await wideRow.getByRole('button', { name: /열기/ }).click();
  await expect(detailPane.getByTestId('my-flow-item-detail')).toBeVisible();
  await expect(detailPane.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
  await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
  await capture(page, '04-wide-outline-detail-workspace.png', true);

  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-08');
  const calendar = page.getByTestId('my-flow-calendar-card');
  const eventDay = page.locator('.fc-daygrid-day').filter({ has: page.locator('.fc-event') }).first();
  await eventDay.getByTestId('my-flow-calendar-date-button').click();
  const agenda = page.getByTestId('my-flow-calendar-selected-day');
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  const [calendarBox, agendaBox] = await Promise.all([
    calendar.boundingBox(),
    agenda.boundingBox(),
  ]);
  expect(calendarBox).not.toBeNull();
  expect(agendaBox).not.toBeNull();
  expect(calendarBox?.x ?? 0).toBeLessThan(agendaBox?.x ?? 0);
  expect(agendaBox?.height ?? 0).toBeLessThanOrEqual(736);
  await capture(page, '05-wide-calendar-and-agenda.png', true);
  expect(browserErrors).toEqual([]);
});

test('legacy savedTransfer=off export reports disabled and pending states without changing scope', async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await seedWorkspace(page);
  await page.addInitScript(() => {
    let clipboardText = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          await new Promise((resolve) => window.setTimeout(resolve, 600));
          clipboardText = value;
        },
        readText: async () => clipboardText,
      },
    });
  });
  await page.goto('/my?view=flows&savedTransfer=off');
  await expect(page.locator('main[data-p35-q1-saved-transfer="off"]')).toBeVisible();
  const flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic', 'record');
  const exportSurface = flow.getByTestId('my-flow-export-surface');
  await exportSurface.getByTestId('my-flow-export-entry').click();
  const panel = exportSurface.getByTestId('my-flow-export-panel');
  await expect(panel).toHaveAttribute('data-saved-transfer-surface', 'legacy');
  const checklist = panel.getByTestId('my-flow-export-checklist');
  await expect(checklist).toHaveAttribute('data-export-state', 'ready');
  await checklist.click();
  await expect(checklist).toHaveAttribute('aria-busy', 'true');
  await expect(checklist).toContainText('준비 중');
  await expect(panel.getByTestId('my-flow-export-sheet')).toBeDisabled();
  await capture(page, '06-mobile-export-pending.png');
  await expect(panel.getByTestId('flow-export-result-receipt')).toBeVisible();
  await expect(checklist).toHaveAttribute('data-export-state', 'ready');

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('clipboard unavailable');
        },
        readText: async () => '',
      },
    });
    document.execCommand = () => false;
  });
  await panel.getByTestId('my-flow-export-memo').click();
  const errorReceipt = panel.getByTestId('flow-export-result-receipt');
  await expect(errorReceipt).toContainText('만들지 못했어요');
  await expect(errorReceipt).toContainText('다시 시도');
  await capture(page, '07-mobile-export-error.png');
  expect(browserErrors).toEqual([]);
});
