import fs from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

const evidenceDir = process.env.FLOWME_P34_EVIDENCE_DIR;

async function capture(page: Page, name: string) {
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${name}` });
}

async function inspectPageQuality(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      const rect = htmlElement.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const unnamedInteractiveCount = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter((element) => {
      if (!isVisible(element)) return false;
      const control = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const associatedLabel = Array.from(control.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      const accessibleText = [
        element.getAttribute('aria-label'),
        element.getAttribute('aria-labelledby')
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' '),
        element.getAttribute('title'),
        associatedLabel,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim();
      return accessibleText.length === 0;
    }).length;

    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      unnamedInteractiveCount,
    };
  });
}

async function saveUndatedVehicleFlow(page: Page): Promise<string> {
  await page.goto('/f/vehicle-inspection-prep');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
  await expect(capability).toHaveAttribute('data-capability-primary-destination', 'checklist');
  await expect(capability.locator(
    '[data-testid="flow-capability-result-choice"]'
      + '[data-capability-candidate-role="primary"]',
  )).toHaveAttribute('data-capability-output-count', '10');
  const mobileSave = page.getByTestId('public-flow-save-primary-mobile');
  const saveButton = await mobileSave.isVisible().catch(() => false)
    ? mobileSave
    : page.getByTestId('public-flow-save-primary');
  const receipt = await savePublicFlow(
    page,
    saveButton,
  );
  await openSavedPublicFlow(page, receipt);
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(personalCopyKey).toMatch(/^personal-copy:/u);
  const postSaveView = page.getByTestId('my-flow-post-save-view-flow');
  if (await postSaveView.isVisible().catch(() => false)) await postSaveView.click();
  await page.goto('/my?view=flows');
  return personalCopyKey;
}

async function openVehicleWorkspace(
  page: Page,
  flowSlug = 'vehicle-inspection-prep',
): Promise<Locator> {
  return openMyFlowLibraryFlow(page, flowSlug, 'execute');
}

async function openArchivedInventory(page: Page) {
  const archivedRow = page.getByTestId('my-flow-mobile-archived-row').first();
  if (await archivedRow.isVisible().catch(() => false)) return;

  const visibleFilter = page.getByTestId('my-flow-list-filter-archived').filter({
    visible: true,
  });
  if (await visibleFilter.isVisible().catch(() => false)) {
    if ((await visibleFilter.getAttribute('aria-pressed')) !== 'true') {
      await visibleFilter.click();
    }
    return;
  }

  const directEntry = page.getByTestId('my-flow-open-archived');
  if (await directEntry.isVisible().catch(() => false)) {
    await directEntry.click({ timeout: 5_000 }).catch(() => undefined);
    if (await archivedRow.isVisible().catch(() => false)) return;
    const surfacedFilter = page.getByTestId('my-flow-list-filter-archived').filter({
      visible: true,
    });
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

test.describe('P34 execution CRUD', () => {
  test.use({ timezoneId: 'Asia/Seoul' });

  test('Flow lifecycle uses one command surface and keeps archive recovery safe', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const personalCopyKey = await saveUndatedVehicleFlow(page);

    let workspace = await openVehicleWorkspace(page, personalCopyKey);
    const management = workspace.getByTestId('my-flow-workspace-management-menu');
    const trigger = management.locator('summary');
    await expect(trigger).toHaveAccessibleName(/계획 관리/);
    await trigger.click();
    const visibleCommands = await management
      .getByRole('menuitem')
      .evaluateAll((elements) => elements.map((element) => element.textContent?.trim()));
    expect(visibleCommands).toEqual([
      '계획 수정',
      '원문 보기',
      '보관보관함에서 복구하거나 영구 삭제할 수 있어요.',
    ]);
    await capture(page, 'p34-01-active-flow-manage-390.png');

    await management.getByTestId('my-flow-archive-toggle').click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await expect(page.getByTestId('my-flow-lifecycle-undo')).toBeVisible();
    await page.getByTestId('my-flow-lifecycle-undo').click();

    workspace = await openVehicleWorkspace(page, personalCopyKey);
    await workspace.getByTestId('my-flow-workspace-management-menu').locator('summary').click();
    await workspace
      .getByTestId('my-flow-workspace-management-menu')
      .getByTestId('my-flow-archive-toggle')
      .click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await page.reload();
    await openArchivedInventory(page);

    let archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    await expect(archivedRow.getByTestId('my-flow-archived-direct-restore')).toBeVisible();
    await capture(page, 'p34-01-archived-restore-390.png');
    await archivedRow.getByTestId('my-flow-archived-direct-restore').click();

    workspace = await openVehicleWorkspace(page, personalCopyKey);
    await workspace.getByTestId('my-flow-workspace-management-menu').locator('summary').click();
    await workspace
      .getByTestId('my-flow-workspace-management-menu')
      .getByTestId('my-flow-archive-toggle')
      .click();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await openArchivedInventory(page);
    archivedRow = page.locator(
      `[data-testid="my-flow-mobile-archived-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    const archivedMenu = archivedRow.getByTestId('my-flow-archived-management-menu');
    await archivedMenu.locator('summary').click();
    const deleteTrigger = archivedMenu.getByTestId('my-flow-permanent-delete-open');
    await deleteTrigger.click();
    const dialog = page.getByTestId('my-flow-permanent-delete-dialog');
    await expect(dialog.getByTestId('my-flow-permanent-delete-cancel')).toBeFocused();
    await expect(dialog).toContainText('공개 원본 계획은 그대로 남습니다');
    await expect(dialog.getByTestId('my-flow-permanent-delete-backup')).toBeVisible();
    await capture(page, 'p34-01-permanent-delete-backup-390.png');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(
      archivedRow.getByTestId('my-flow-archived-management-trigger'),
    ).toBeFocused();
  });

  test('Calendar has one tab stop and supports calendar keyboard movement', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calendar?demo=ux20');

    const dateButtons = page.getByTestId('my-flow-calendar-date-button');
    await expect(dateButtons).toHaveCount(42);
    const activeDate = page.locator(
      '[data-testid="my-flow-calendar-date-button"][tabindex="0"]',
    );
    await expect(activeDate).toHaveCount(1);
    await activeDate.focus();
    const before = await activeDate.evaluate(
      (element) => element.closest<HTMLElement>('.fc-daygrid-day')?.dataset.date,
    );
    await page.keyboard.press('ArrowRight');
    const after = await page.evaluate(
      () => document.activeElement?.closest<HTMLElement>('.fc-daygrid-day')?.dataset.date,
    );
    expect(after).not.toBe(before);
    await expect(page.locator(
      '[data-testid="my-flow-calendar-date-button"][tabindex="0"]',
    )).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect(page.locator(
      '[data-testid="my-flow-calendar-date-button"][tabindex="0"]',
    )).toBeFocused();
    await capture(page, 'p34-05-calendar-roving-390.png');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });

  test('memo draft keeps structural commands behind an explicit mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page
      .getByTestId('flow-url-lookup-entry')
      .getByLabel('URL 또는 메모')
      .fill('항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 온라인 체크인');
    await page.getByTestId('flow-url-lookup-entry').getByRole('button', { name: '계획 찾기' }).click();

    const editor = page.getByTestId('flow-memo-draft-editor');
    await expect(editor.getByTestId('flow-memo-draft-item')).toHaveCount(5);
    await expect(editor.getByTestId('draft-structure-edit-controls')).toHaveCount(0);
    await expect(editor.getByRole('button', { name: /내용과 날짜 수정/ })).toHaveCount(5);
    await expect(editor.getByTestId('personal-draft-move-up')).toHaveCount(0);
    await expect(editor.getByTestId('personal-draft-move-down')).toHaveCount(0);
    await expect(editor.getByTestId('personal-draft-delete-item')).toHaveCount(0);
    await capture(page, 'p34-04-draft-preview-390.png');

    await editor
      .getByTestId('flow-memo-draft-structure-disclosure')
      .locator(':scope > summary')
      .click();
    await editor.getByTestId('draft-structure-edit-toggle').click();
    await expect(editor.getByTestId('draft-structure-edit-controls')).toHaveCount(5);
    await expect(
      editor.getByTestId('flow-memo-draft-item').first().getByRole('button', { name: /아래로 이동/ }),
    ).toBeVisible();
    await capture(page, 'p34-04-draft-structure-mode-390.png');
  });

  test('public save-before keeps the artifact visible inside one atomic adjustment editor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    const capability = page.getByTestId('public-flow-capability-result');
    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
    await expect(capability).toHaveAttribute('data-capability-primary-destination', 'calendar');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toHaveAttribute(
      'data-p35-marker',
      'P35-ATOMIC-FULL-HEIGHT-EDITOR',
    );
    await expect(adjustment).toHaveAttribute('data-editor-transaction', 'atomic');
    await expect(adjustment.getByTestId('public-flow-adjustment-result-before')).toContainText('24개');
    await adjustment.getByTestId('public-flow-adjustment-kind-anchor').click();
    await expect(adjustment.getByTestId('public-flow-adjustment-anchor-input')).toHaveValue('2030-08-15');
    await expect(adjustment.getByTestId('public-flow-adjustment-item-row')).toHaveCount(0);
    await expect(capability).toBeVisible();
    await capture(page, 'p34-03-moving-adjust-390.png');
  });

  test('routine and portable export expose scope before advanced controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    const routineSummary = page.getByTestId('public-routine-schedule-summary');
    await expect(routineSummary).toHaveAttribute('data-p34-marker', 'P34-06-ROUTINE-SUMMARY');
    await expect(routineSummary.getByTestId('public-routine-schedule-editor')).toHaveCount(0);
    await expect(routineSummary.getByRole('button', { name: '반복 일정 조정' })).toBeVisible();
    await capture(page, 'p34-06-routine-summary-390.png');

    await saveUndatedVehicleFlow(page);
    const workspace = await openVehicleWorkspace(page);
    const exportEntry = workspace.getByTestId('my-flow-export-entry');
    await expect(exportEntry).toContainText(/내 도구로 옮기기 · \d+개/);
    await exportEntry.click();
    const panel = workspace.getByTestId('my-flow-export-panel');
    await expect(panel).toHaveAttribute('data-p34-marker', 'P34-07-SCOPE-FIRST-EXPORT');
    await expect(panel.getByTestId('my-flow-export-scope-control')).toBeVisible();
    await expect(panel.getByTestId('my-flow-export-recommendations')).toBeVisible();
    await capture(page, 'p34-07-export-scope-390.png');
  });

  test('wide and desktop lifecycle keep one command anatomy without quality regressions', async ({ page }) => {
    test.setTimeout(120_000);
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    for (const viewport of [
      { width: 1024, height: 768, suffix: '1024' },
      { width: 1440, height: 900, suffix: '1440' },
    ]) {
      await page.setViewportSize(viewport);
      await saveUndatedVehicleFlow(page);
      const workspace = await openVehicleWorkspace(page);
      const mobileManagement = workspace.getByTestId('my-flow-workspace-management-menu');
      const management = await mobileManagement.count()
        ? mobileManagement
        : workspace.getByTestId('my-flow-management-menu');
      await expect(management.locator('summary')).toHaveAccessibleName(/계획 관리/);
      await management.locator('summary').click();
      await expect(management.getByRole('menuitem')).toHaveCount(3);
      await capture(page, `p34-01-lifecycle-${viewport.suffix}.png`);

      const quality = await inspectPageQuality(page);
      expect(quality.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(quality.unnamedInteractiveCount).toBe(0);
    }

    expect(browserErrors).toEqual([]);
  });
});
