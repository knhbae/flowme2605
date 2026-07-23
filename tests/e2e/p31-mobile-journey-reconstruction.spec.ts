import fs from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

const evidenceDir = process.env.FLOWME_P31_EVIDENCE_DIR;

async function captureEvidence(page: Page, name: string) {
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${name}`, fullPage: true });
}

async function enterMyFlowDetailEditMode(detail: Locator) {
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
    await tools.locator('summary').click();
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

    const weddingPreview = page.getByTestId('flow-artifact-data-preview');
    const weddingChoices = weddingPreview.getByTestId('flow-artifact-shape-choice');
    const weddingChoice = (shape: string) => weddingPreview.locator(
      `[data-testid="flow-artifact-shape-choice"][data-artifact-shape="${shape}"]`,
    );
    await expect(weddingChoices).toHaveCount(3);
    await expect(weddingPreview).toHaveAttribute('data-selected-shape', 'calendar');
    await expect(weddingChoice('calendar')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('public-flow-primary-setup')).toBeVisible();
    await captureEvidence(page, 'p31-wedding-save-before-390.png');

    await weddingChoice('checklist').click();
    await expect(weddingPreview).toHaveAttribute('data-selected-shape', 'checklist');
    await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toContainText('6');

    await weddingChoice('memo').click();
    await expect(weddingPreview).toHaveAttribute('data-selected-shape', 'memo');
    await expect(page.getByTestId('flow-artifact-memo-preview')).toBeVisible();

    await weddingChoice('calendar').click();
    await expect(weddingPreview).toHaveAttribute('data-selected-shape', 'calendar');
    await expect(page.getByTestId('public-flow-primary-setup')).toBeVisible();

    await page.goto('/f/curated-allblanc-morning-workout');
    const workoutPreview = page.getByTestId('flow-artifact-data-preview');
    const workoutChoices = workoutPreview.getByTestId('flow-artifact-shape-choice');
    const workoutChoice = (shape: string) => workoutPreview.locator(
      `[data-testid="flow-artifact-shape-choice"][data-artifact-shape="${shape}"]`,
    );
    await expect(workoutChoices).toHaveCount(3);
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

    await workoutChoice('calendar').click();
    await expect(workoutPreview).toHaveAttribute('data-selected-shape', 'calendar');
    await workoutChoice('memo').click();
    await expect(workoutPreview).toHaveAttribute('data-selected-shape', 'memo');
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toContainText('1');
    await expect(workoutPreview.getByTestId('flow-artifact-preview-row')).toHaveCount(1);
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
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await adjustment.getByTestId('public-flow-adjustment-mode-schedule').click();
    await adjustment
      .getByTestId('public-flow-adjustment-row')
      .first()
      .getByTestId('public-flow-adjustment-date')
      .fill('2030-08-01');
    await adjustment.getByTestId('public-flow-adjustment-save').click();

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await openSavedPublicFlow(page, receipt);
    await expect(page).toHaveURL('/my?savedFlow=moving-d30-basic');
    const postSaveView = page.getByTestId('my-flow-post-save-view-flow');
    if (await postSaveView.isVisible().catch(() => false)) {
      await postSaveView.click();
    }

    let flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const expand = flow.getByRole('button', { name: '전체 펼치기' });
    if (await expand.isVisible().catch(() => false)) await expand.click();
    const firstRow = flow
      .getByTestId('my-flow-whole-flow-outline')
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await expect(firstRow).toContainText('8월 1일');
    await firstRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();

    let detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
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
    await page
      .locator('.fc-daygrid-day[data-date="2030-08-03"] .fc-daygrid-day-number')
      .click();
    const agendaOpen = page
      .getByTestId('my-flow-calendar-selected-day')
      .getByRole('button', { name: /이사 방식 정하기 열기/ });
    await expect(agendaOpen).toBeVisible();
    const selectedDateBeforeSheet = await page
      .getByTestId('my-flow-selected-day-summary')
      .innerText();
    await agendaOpen.click();
    const calendarSheet = page.getByTestId('my-flow-item-detail-sheet');
    await expect(calendarSheet).toBeVisible();
    await expect(calendarSheet).toHaveAttribute(
      'data-p31-marker',
      'P31-04-CALENDAR-ITEM-SHEET',
    );
    await captureEvidence(page, 'p31-calendar-item-sheet-390.png');
    await page.keyboard.press('Escape');
    await expect(calendarSheet).toHaveCount(0);
    await expect(agendaOpen).toBeFocused();
    await expect(page.getByTestId('my-flow-selected-day-summary')).toHaveText(
      selectedDateBeforeSheet,
    );
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

    await page.getByTestId('public-flow-date-intent-undated').click();
    const receipt = await savePublicFlow(
      page,
      page
        .getByTestId('public-flow-mobile-save-cta')
        .getByRole('button', { name: '날짜 없이 시작' }),
    );
    await openSavedPublicFlow(page, receipt);
    const postSaveView = page.getByTestId('my-flow-post-save-view-flow');
    await expect(postSaveView).toBeVisible();
    await postSaveView.click();

    const libraryRow = page.locator(
      '[data-testid="my-flow-mobile-structure-row"][data-flow-slug="vehicle-inspection-prep"]',
    );
    let workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="vehicle-inspection-prep"]',
    );
    if (!(await workspace.isVisible().catch(() => false))) {
      await expect(libraryRow).toBeVisible();
      await libraryRow.getByTestId('my-flow-mobile-structure-open').click();
    }
    await expect(workspace).toBeVisible();
    await expect(workspace).toHaveAttribute(
      'data-p31-marker',
      'P31-03-DEDICATED-MOBILE-WORKSPACE',
    );
    await expect(workspace).toHaveAttribute('data-workspace-section', 'execute');
    await expect(workspace.getByTestId('my-flow-workspace-tab-execute')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(workspace.getByTestId('my-flow-workspace-tab-plan')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-tab-record')).toBeVisible();
    await captureEvidence(page, 'p31-my-flow-workspace-390.png');

    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    await management.locator('summary').click();
    await management.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await page.getByTestId('my-flow-lifecycle-undo').click();
    await expect(libraryRow).toBeVisible();

    await libraryRow.getByTestId('my-flow-mobile-structure-open').click();
    workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="vehicle-inspection-prep"]',
    );
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
    await expect(libraryRow).toBeVisible();

    await libraryRow.getByTestId('my-flow-mobile-structure-open').click();
    workspace = page.locator(
      '[data-testid="my-flow-mobile-workspace"][data-flow-slug="vehicle-inspection-prep"]',
    );
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
    await expect(deleteTrigger).toBeFocused();

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
