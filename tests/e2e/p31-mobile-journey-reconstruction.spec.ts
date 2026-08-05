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

async function enterMyFlowDetailEditMode(page: Page, detail: Locator): Promise<Locator> {
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    const readSummary = detail.getByTestId('my-flow-detail-read-summary');
    await expect(readSummary).toBeVisible();
    if ((await readSummary.getAttribute('open')) === null) {
      await readSummary.locator('summary').click();
    }
    await readSummary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  const editor = page.locator(
    '[data-testid="saved-flow-editor-item"]:visible, '
      + '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible',
  ).last();
  await expect(editor).toBeVisible();
  return editor;
}

function getMyFlowDetailDateInput(editor: Locator): Locator {
  return editor.locator(
    '[data-testid="saved-flow-editor-item-date-input"], '
      + '[data-testid="my-flow-detail-date-input"]',
  );
}

async function saveMyFlowDetailEdit(page: Page, editor: Locator): Promise<void> {
  const savedOverlay = (await editor.getAttribute('data-testid')) === 'saved-flow-editor-item';
  await editor.getByTestId('my-flow-detail-save-changes').click();
  if (!savedOverlay) return;
  await expect(editor).toHaveCount(0);
  const planEditor = page.getByTestId('saved-flow-editor-plan');
  await expect(planEditor).toBeVisible();
  await planEditor.getByTestId('saved-flow-editor-save').click();
  await expect(planEditor).toHaveCount(0);
  const sheetClose = page.getByTestId('my-flow-item-detail-sheet-close');
  if (await sheetClose.isVisible().catch(() => false)) await sheetClose.click();
}

async function openMyFlowDetailTools(detail: Locator) {
  const tools = detail.getByTestId('my-flow-detail-portable-export');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) {
    await tools.locator(':scope > summary').click();
  }
  return tools;
}

async function completeSavedFileTransfer(page: Page, action: Locator) {
  await action.click();
  const confirmation = page.getByTestId('my-flow-transfer-confirmation');
  await expect(confirmation).toHaveAttribute('data-transfer-route', 'saved_transfer');
  const downloadPromise = page.waitForEvent('download');
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  const download = await downloadPromise;
  const receipt = page.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toHaveAttribute('data-transfer-state', 'succeeded');
  await receipt.getByTestId('flow-transfer-success-close').click();
  return download;
}

async function openArchivedInventory(page: Page): Promise<void> {
  const archivedRow = page.getByTestId('my-flow-mobile-archived-row').first();
  if (await archivedRow.isVisible().catch(() => false)) return;

  const archivedFilter = page.getByTestId('my-flow-list-filter-archived');
  if (await archivedFilter.isVisible().catch(() => false)) {
    if ((await archivedFilter.getAttribute('aria-pressed')) !== 'true') {
      await archivedFilter.click();
    }
    return;
  }

  const directEntry = page.getByTestId('my-flow-open-archived');
  if (await directEntry.isVisible().catch(() => false)) {
    await directEntry.click({ timeout: 5_000 }).catch(() => undefined);
    if (await archivedRow.isVisible().catch(() => false)) return;
    const surfacedFilter = page.getByTestId('my-flow-list-filter-archived');
    if (await surfacedFilter.isVisible().catch(() => false)) {
      if ((await surfacedFilter.getAttribute('aria-pressed')) !== 'true') {
        await surfacedFilter.click();
      }
      return;
    }
  }

  const inventoryEntry = page.getByTestId('my-flow-mobile-inventory-open');
  await inventoryEntry.click();
  await page
    .getByTestId('my-flow-inventory-sheet')
    .getByTestId('my-flow-list-filter-archived')
    .click();
}

test.describe('P31 mobile journey reconstruction', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  test('wedding and workout save-before keep one contextual result and progressive setup', async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-wedding-naver-timeline');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const weddingPreview = page.getByTestId('public-flow-capability-result');
    await expect(weddingPreview.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
    )).toHaveCount(1);
    await expect(page.getByTestId('public-flow-primary-setup')).toBeVisible();
    await captureEvidence(page, 'p31-wedding-save-before-390.png');

    await page.goto('/f/curated-allblanc-morning-workout');
    const workoutPreview = page.getByTestId('public-flow-capability-result');
    await expect(workoutPreview.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
    )).toHaveCount(1);

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

    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveText('내 계획에 저장');
    await expect(workoutPreview.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(1);
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
    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    await openSavedPublicFlow(page, saveBanner);
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);

    let flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    await expandMyFlowWholePlan(flow);
    const firstRow = (await getMyFlowVisibleExecutionRows(flow))
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await firstRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();

    let detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    let editor = await enterMyFlowDetailEditMode(page, detail);
    await getMyFlowDetailDateInput(editor).fill('2030-08-01');
    await saveMyFlowDetailEdit(page, editor);

    flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const firstOverrideRow = flow
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await expect(firstOverrideRow).toContainText('8월 1일');
    await firstOverrideRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();

    detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    editor = await enterMyFlowDetailEditMode(page, detail);
    await getMyFlowDetailDateInput(editor).fill('2030-08-03');
    await saveMyFlowDetailEdit(page, editor);

    flow = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const movedRow = flow
      .getByTestId('my-flow-execution-row-shell')
      .filter({ hasText: '이사 방식 정하기' })
      .first();
    await expect(movedRow).toContainText('8월 3일');
    await movedRow.getByRole('button', { name: /이사 방식 정하기 열기/ }).click();
    detail = page.locator('[data-testid="my-flow-item-detail"]:visible').first();
    const tools = await openMyFlowDetailTools(detail);
    const download = await completeSavedFileTransfer(
      page,
      tools.getByTestId('my-flow-detail-download-ics'),
    );
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
      .getByRole('button', { name: /계획에서 열기/ });
    await expect(agendaOpen).toBeVisible();
    await agendaOpen.click();
    await expect(page).toHaveURL((url) => (
      url.pathname === '/my'
      && url.searchParams.get('view') === 'flows'
      && url.searchParams.get('flow') === personalCopyKey
      && Boolean(url.searchParams.get('item'))
    ));
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
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);

    const libraryRow = page.locator(
      `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${personalCopyKey}"]`,
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
    await openArchivedInventory(page);
    let archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow).toHaveAttribute(
      'data-p31-marker',
      'P31-03-MOBILE-ARCHIVED-DIRECT-RESTORE',
    );
    await captureEvidence(page, 'p31-archived-restore-390.png');
    await archivedRow.getByTestId('my-flow-archived-direct-restore').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('복구했습니다');
    workspace = await openMyFlowLibraryFlow(page, personalCopyKey);
    await workspace.getByTestId('my-flow-workspace-management-menu').locator('summary').click();
    await workspace
      .getByTestId('my-flow-workspace-management-menu')
      .getByTestId('my-flow-archive-toggle')
      .click();
    await openArchivedInventory(page);
    archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    const deleteTrigger = archivedMenu.getByTestId('my-flow-permanent-delete-open');
    await deleteTrigger.click();
    const dialog = page.getByTestId('my-flow-permanent-delete-dialog');
    await expect(dialog).toContainText('공개 원본 계획은 그대로 남습니다');
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
      page.locator(`[data-flow-slug="${personalCopyKey}"]`),
    ).toHaveCount(0);
    const deletionState = await page.evaluate((copyKey) => ({
      saved: window.localStorage.getItem(`flow:saved:${copyKey}`),
      archived: JSON.parse(
        window.localStorage.getItem('flow:my-flow:lifecycle:v1') || '{"archivedFlowSlugs":[]}',
      ).archivedFlowSlugs,
    }), personalCopyKey);
    expect(deletionState.saved).toBeNull();
    expect(deletionState.archived).not.toContain(personalCopyKey);

    await page.goto('/f/vehicle-inspection-prep');
    await expect(page.getByTestId('public-flow-mobile-save-cta')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
});
