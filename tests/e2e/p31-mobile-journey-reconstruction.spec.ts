import fs from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  expandMyFlowWholePlan,
  getMyFlowVisibleExecutionRows,
  openMyFlowCalendarSelectedDay,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

const evidenceDir = process.env.FLOWME_P31_EVIDENCE_DIR;

async function captureEvidence(page: Page, name: string) {
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${name}`, fullPage: true });
}

async function enterMyFlowDetailEditMode(detail: Locator) {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
    await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
    return;
  }
  const readSummary = detail.getByTestId('my-flow-detail-read-summary');
  await expect(readSummary).toBeVisible();
  if ((await readSummary.getAttribute('open')) === null) {
    await readSummary.locator('summary').click();
  }
  await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  await expect(detail).toHaveAttribute('data-detail-mode', 'edit');
}

async function openMyFlowDetailTools(detail: Locator) {
  const tools = detail.getByTestId('my-flow-detail-portable-export');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) {
    await tools.locator(':scope > summary').click();
  }
  return tools;
}

test.describe('P31 mobile journey reconstruction', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  test('wedding and workout save-before keep one contextual result and progressive setup', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-wedding-naver-timeline');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const weddingPreview = page.getByTestId('public-flow-artifact-preview');
    const weddingChoices = weddingPreview.getByTestId('flow-artifact-shape-choice');
    await expect(weddingChoices).toHaveCount(0);
    await expect(weddingPreview).toHaveAttribute('data-selected-shape', 'calendar');
    await expect(page.getByTestId('public-flow-primary-setup')).toBeVisible();
    await captureEvidence(page, 'p31-wedding-save-before-390.png');

    await page.goto('/f/curated-allblanc-morning-workout');
    const workoutPreview = page.getByTestId('public-flow-artifact-preview');
    const workoutChoices = workoutPreview.getByTestId('flow-artifact-shape-choice');
    await expect(workoutChoices).toHaveCount(0);
    await expect(workoutPreview).toHaveAttribute('data-selected-shape', 'flow_execution');

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    const routineSummary = page.getByTestId('public-routine-schedule-summary');
    await expect(routineSummary.getByTestId('public-routine-schedule-editor')).toHaveCount(0);
    await expect(
      routineSummary
        .getByTestId('public-routine-schedule-summary-next-occurrences')
        .getByRole('listitem'),
    ).toHaveCount(3);
    await captureEvidence(page, 'p31-workout-summary-390.png');

    await routineSummary.getByTestId('public-routine-schedule-summary-toggle').click();
    const routineEditor = routineSummary.getByTestId('public-routine-schedule-editor');
    await expect(routineEditor).toBeVisible();
    await expect(routineEditor.getByTestId('public-routine-schedule-editor-preview-policy')).toContainText(
      '반복은 계속',
    );
    await routineEditor
      .getByTestId('public-routine-schedule-editor-end-mode')
      .selectOption('count');
    await routineEditor
      .getByTestId('public-routine-schedule-editor-occurrence-count')
      .fill('8');
    await captureEvidence(page, 'p31-workout-settings-390.png');
    await expect(
      routineSummary.getByTestId('public-routine-schedule-summary-value'),
    ).toContainText('8회');

    await expect(page.getByTestId('public-flow-save-primary-mobile')).toContainText('1');
    await expect(workoutPreview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test('latest execution date override wins in My Flow, Calendar, and ICS', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary-mobile').click();

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await openSavedPublicFlow(page, receipt);
    await expect(page).toHaveURL('/my?view=flows&flow=moving-d30-basic');

    let flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expandMyFlowWholePlan(flow);
    const firstRow = getMyFlowVisibleExecutionRows(flow)
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await firstRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();

    let detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('my-flow-detail-date-input').fill('2030-08-01');
    await detail.getByTestId('my-flow-detail-save-changes').click();

    flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const firstOverrideRow = flow
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await expect(firstOverrideRow).toContainText('8월 1일');
    await firstOverrideRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();

    detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    await enterMyFlowDetailEditMode(detail);
    await detail.getByTestId('my-flow-detail-date-input').fill('2030-08-03');
    await detail.getByTestId('my-flow-detail-save-changes').click();

    flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const movedRow = flow
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await expect(movedRow).toContainText('8월 3일');
    await movedRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();
    detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    const tools = await openMyFlowDetailTools(detail);
    const downloadPromise = page.waitForEvent('download');
    await tools.getByTestId('my-flow-detail-download-ics').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const ics = fs.readFileSync(downloadPath!, 'utf8');
    expect(ics).toContain('DTSTART;VALUE=DATE:20300803');
    expect(ics).not.toContain('DTSTART;VALUE=DATE:20300801');

    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2030-08');
    await expect(page.locator('.fc-daygrid-day[data-date="2030-08-01"] .fc-event')).toHaveCount(0);
    await expect(page.locator('.fc-daygrid-day[data-date="2030-08-03"] .fc-event')).toHaveCount(1);
    await expect(page.locator('[data-p31-marker="P31-EFFECTIVE-DATE-PRECEDENCE"]')).toHaveCount(1);
    const selectedDay = await openMyFlowCalendarSelectedDay(page, '2030-08-03');
    const agendaOpen = selectedDay
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '이사 방식 정하기' })
      .first()
      .getByRole('button', { name: /Flow에서 열기/ });
    await expect(agendaOpen).toBeVisible();
    await agendaOpen.click();
    await expect(page).toHaveURL(/\/my\?view=flows&flow=moving-d30-basic&item=/);
    const calendarSheet = page.getByTestId('my-flow-item-detail-sheet');
    await expect(calendarSheet).toBeVisible();
    await expect(calendarSheet).toContainText('이사 방식 정하기');
    await captureEvidence(page, 'p31-calendar-item-sheet-390.png');
    await page.keyboard.press('Escape');
    await expect(calendarSheet).toHaveCount(0);
    await expect(page.locator('main[data-p32-workspace-state="focused"]')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test('mobile My Flow workspace keeps archive, persistent restore, and permanent delete distinct', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/vehicle-inspection-prep');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const receipt = await savePublicFlow(
      page,
      page.getByTestId('public-flow-save-primary-mobile'),
    );
    await openSavedPublicFlow(page, receipt);

    const libraryRow = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="vehicle-inspection-prep"]',
    );
    let workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
    await expect(workspace).toHaveAttribute(
      'data-p31-marker',
      'P31-03-DEDICATED-MOBILE-WORKSPACE',
    );
    await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-commands')).toBeVisible();
    await captureEvidence(page, 'p31-my-flow-workspace-390.png');

    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    await management.locator('summary').click();
    await management.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await page.getByTestId('my-flow-lifecycle-undo').click();
    await expect(libraryRow).toBeVisible();

    workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
    await workspace.getByTestId('my-flow-workspace-management-menu').locator('summary').click();
    await workspace
      .getByTestId('my-flow-workspace-management-menu')
      .getByTestId('my-flow-archive-toggle')
      .click();

    await page.reload();
    const openArchived = page.getByTestId('my-flow-open-archived');
    if (await openArchived.isVisible().catch(() => false)) {
      await openArchived.click();
    } else {
      await page.getByTestId('my-flow-list-filter-archived').click();
    }
    let archivedRow = page.locator(
      '[data-testid="my-flow-mobile-archived-row"][data-flow-slug="vehicle-inspection-prep"]',
    );
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow).toHaveAttribute(
      'data-p31-marker',
      'P31-03-MOBILE-ARCHIVED-DIRECT-RESTORE',
    );
    await captureEvidence(page, 'p31-archived-restore-390.png');
    await archivedRow.getByTestId('my-flow-archived-direct-restore').click();
    workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="vehicle-inspection-prep"]',
    );
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
    await expect(workspace).toBeVisible();
    await workspace.getByTestId('my-flow-workspace-management-menu').locator('summary').click();
    await workspace
      .getByTestId('my-flow-workspace-management-menu')
      .getByTestId('my-flow-archive-toggle')
      .click();
    if (await page.getByTestId('my-flow-open-archived').isVisible().catch(() => false)) {
      await page.getByTestId('my-flow-open-archived').click();
    } else {
      await page.getByTestId('my-flow-list-filter-archived').click();
    }
    archivedRow = page.locator(
      '[data-testid="my-flow-mobile-archived-row"][data-flow-slug="vehicle-inspection-prep"]',
    );
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    const deleteTrigger = archivedMenu.getByTestId('my-flow-permanent-delete-open');
    await deleteTrigger.click();
    const dialog = page.getByTestId('my-flow-permanent-delete-dialog');
    await expect(dialog).toContainText('공개 원본 Flow는 그대로 남습니다');
    await captureEvidence(page, 'p31-permanent-delete-390.png');
    const backupDownload = page.waitForEvent('download');
    await dialog.getByTestId('my-flow-permanent-delete-backup').click();
    const backup = await backupDownload;
    expect(backup.suggestedFilename()).toMatch(/^flowme-backup-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(
      dialog.getByTestId('my-flow-permanent-delete-backup-ready'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(
      archivedMenu.getByTestId('my-flow-archived-management-trigger'),
    ).toBeFocused();

    await archivedMenu.locator('summary').click();
    await deleteTrigger.click();
    await page.getByTestId('my-flow-permanent-delete-confirm').click();
    await page.reload();
    await expect(
      page.locator('[data-flow-slug="vehicle-inspection-prep"]'),
    ).toHaveCount(0);
    const deletionState = await page.evaluate(() => ({
      saved: window.localStorage.getItem('flow:saved:vehicle-inspection-prep'),
      archived: JSON.parse(
        window.localStorage.getItem('flow:my-flow:lifecycle:v1') || '{"archivedFlowSlugs":[]}',
      ).archivedFlowSlugs,
    }));
    expect(deletionState.saved).toBeNull();
    expect(deletionState.archived).not.toContain('vehicle-inspection-prep');

    await page.goto('/f/vehicle-inspection-prep');
    await expect(page.getByTestId('public-flow-mobile-save-cta')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
});
