import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
  getOpenMyFlowItemDetail,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { savePublicFlow } from './helpers/public-flow-save';

const evidenceRoot = process.env.FLOWME_P35_R0_EVIDENCE_DIR;

function formatPlainDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addPlainDateDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatPlainDate(date);
}

function formatCompactPlainDate(value: string): string {
  const [, month, day] = value.split('-').map(Number);
  return `${month}/${day}`;
}

const today = formatPlainDate(new Date());
const mixedAnchor = addPlainDateDays(today, 7);
const nextGroupDate = addPlainDateDays(today, 4);
const pastStartDate = addPlainDateDays(today, -23);
const pastEndDate = addPlainDateDays(today, -3);
const allPastAnchor = addPlainDateDays(today, -2);
const nearestPastDate = addPlainDateDays(today, -1);

type RowSnapshot = {
  key: string;
  title: string;
};

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string, focus?: Locator) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: false,
  });
}

async function inspectPageQuality(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const persistentNavigation = document.querySelector<HTMLElement>(
      '[data-testid="platform-mobile-tabs"]',
    );
    const navigationRect = persistentNavigation?.getBoundingClientRect();
    const fixedOverlapCount = !persistentNavigation || !navigationRect
      ? 0
      : Array.from(document.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, summary',
        ))
        .filter((element) => !persistentNavigation.contains(element) && visible(element))
        .filter((element) => {
          const position = getComputedStyle(element).position;
          return position === 'fixed' || position === 'sticky';
        })
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < navigationRect.right
            && rect.right > navigationRect.left
            && rect.top < navigationRect.bottom
            && rect.bottom > navigationRect.top
          );
        }).length;
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      fixedOverlapCount,
    };
  });
}

async function expectPageQuality(page: Page) {
  const quality = await inspectPageQuality(page);
  expect(quality.horizontalOverflow).toBe(0);
  expect(quality.fixedOverlapCount).toBe(0);
}

async function snapshotRows(container: Locator): Promise<RowSnapshot[]> {
  return container.getByTestId('my-flow-execution-row-shell').evaluateAll((shells) =>
    shells.map((shell) => {
      const article = shell.querySelector<HTMLElement>('article[data-row-key]');
      const title = shell.querySelector<HTMLElement>('[data-testid="my-flow-row-title"]');
      return {
        key: article?.dataset.rowKey ?? '',
        title: title?.textContent?.trim() ?? '',
      };
    }),
  );
}

async function openSavedWorkspace(page: Page, section: 'execute' | 'plan' = 'execute') {
  const postSave = page.getByTestId('my-flow-post-save-view-flow');
  if (await postSave.isVisible().catch(() => false)) await postSave.click();
  return openMyFlowLibraryFlow(page, 'moving-d30-basic', section);
}

async function seedSavedFlow(page: Page, slug: string, selectedArtifactMode: string, anchor?: string) {
  await page.evaluate(({ flowSlug, mode, savedAnchor }) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      slug: flowSlug,
      savedAt: '2026-07-27T00:00:00.000Z',
      selectedArtifactMode: mode,
      ...(savedAnchor ? { anchor: savedAnchor } : {}),
    }));
    if (savedAnchor) {
      window.localStorage.setItem(
        `flow:${flowSlug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor: savedAnchor }),
      );
    }
  }, {
    flowSlug: slug,
    mode: selectedArtifactMode,
    savedAnchor: anchor,
  });
}

test.describe('P35-R0 temporal first group', () => {
  test('mixed past and future dates stay truthful from pre-save through My Flow and Calendar', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByTestId('public-flow-anchor-input').fill(mixedAnchor);
    const warning = page.getByTestId('public-flow-past-date-warning');
    await expect(warning).toHaveAttribute('data-p35-marker', 'P35-R0-PAST-DATE-WARNING');
    await expect(warning).toHaveAttribute('data-past-count', '9');
    const warningTrigger = warning.getByTestId('public-flow-past-date-warning-disclosure-trigger');
    await warningTrigger.click();
    const warningDetail = page.getByTestId('public-flow-past-date-warning-disclosure-detail');
    await expect(warningDetail).toContainText(
      `${formatCompactPlainDate(pastStartDate)}~${formatCompactPlainDate(pastEndDate)}`,
    );
    await expect(page.getByRole('heading', { name: '지난 할 일도 함께 저장돼요' })).toBeVisible();
    await capture(page, 'p35-r0-past-date-warning-390.png', warning);
    await page.keyboard.press('Escape');
    await expect(warningTrigger).toBeFocused();

    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toHaveText('저장됨 · 24개');
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);

    let workspace = await openSavedWorkspace(page);
    let group = workspace.getByTestId('my-flow-temporal-next-group');
    await expect(group).toHaveAttribute('data-p35-marker', 'P35-R0-NEXT-DATE-GROUP');
    await expect(group).toHaveAttribute('data-temporal-kind', 'future');
    await expect(group).toHaveAttribute('data-temporal-date', nextGroupDate);
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expect(group).toContainText('3개 먼저');
    await expect(group.getByTestId('flow-date-rail')).toHaveCount(1);
    await expect(group.getByTestId('my-flow-row-date-meta')).toHaveCount(0);
    await expect(
      group.locator('[data-p35-marker="P35-R0-SHARED-TIMELINE-ROW"]'),
    ).toHaveCount(3);
    const firstTimelineRow = group
      .locator('[data-p35-marker="P35-R0-SHARED-TIMELINE-ROW"]')
      .first();
    await expect(firstTimelineRow.getByTestId('my-flow-row-open-label')).toHaveCount(0);
    await expect(firstTimelineRow.locator('button').first()).toHaveAccessibleName(/열기/u);
    expect(
      await firstTimelineRow
        .locator('button, input[type="checkbox"]')
        .evaluateAll((elements) => elements.map((element) => element.tagName)),
    ).toEqual(['BUTTON']);
    await expect(firstTimelineRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    const disclosure = workspace.getByTestId('my-flow-past-items-disclosure');
    await expect(disclosure).toContainText('저장된 지난 할 일 9개 보기');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await capture(page, 'p35-r0-next-date-group-390.png', group);
    await expectPageQuality(page);

    const initialRows = await snapshotRows(group);
    expect(initialRows).toHaveLength(3);
    expect(initialRows.every((row) => row.key && row.title)).toBe(true);

    const firstRowKey = initialRows[0].key;
    await firstTimelineRow.locator('button').first().click();
    let detail = getOpenMyFlowItemDetail(page);
    let completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await completion.click();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
      'data-completion-result',
      'completed',
    );
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 1/24 완료',
    );
    await closeOpenMyFlowItemDetail(page);
    await expect(group.locator(`article[data-row-key="${firstRowKey}"]`)).toHaveCount(0);
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await page.getByTestId('my-flow-completion-undo').click();
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expect(group.locator(`article[data-row-key="${firstRowKey}"]`)).toBeVisible();
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 0/24 완료',
    );

    const restoredFirstRow = group
      .locator('[data-p35-marker="P35-R0-SHARED-TIMELINE-ROW"]')
      .first();
    await expect(restoredFirstRow).toHaveAttribute('data-row-key', firstRowKey);
    await restoredFirstRow.locator('button').first().click();
    detail = getOpenMyFlowItemDetail(page);
    completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await completion.click();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
      'data-completion-result',
      'completed',
    );
    await closeOpenMyFlowItemDetail(page);
    await expect(group.locator(`article[data-row-key="${firstRowKey}"]`)).toHaveCount(0);
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await page.reload();
    workspace = await openSavedWorkspace(page);
    group = workspace.getByTestId('my-flow-temporal-next-group');
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);

    await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
    await page.getByTestId('my-flow-month-picker').fill(nextGroupDate.slice(0, 7));
    await page.locator(`.fc-daygrid-day[data-date="${nextGroupDate}"]`)
      .getByTestId('my-flow-calendar-date-button')
      .click();
    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    await expect(selectedDay.getByTestId('my-flow-execution-row-shell')).toHaveCount(4);
    await expect(selectedDay.getByTestId('my-flow-selected-day-summary')).toContainText('4개 항목 · 3개 남음');
    const calendarRows = await snapshotRows(selectedDay);
    expect(calendarRows.slice(0, initialRows.length)).toEqual(initialRows);

    const completedCalendarRow = selectedDay
      .locator(`[data-testid="my-flow-execution-row-shell"]:has(article[data-row-key="${firstRowKey}"])`);
    await expect(completedCalendarRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await completedCalendarRow.getByRole('button', { name: /계획에서 열기/ }).click();
    detail = getOpenMyFlowItemDetail(page);
    const reopen = detail.getByTestId('my-flow-task-complete-control');
    await expect(reopen).toHaveCount(1);
    await expect(reopen).toBeChecked();
    await expect(reopen).toHaveAccessibleName(/다시 열기/u);
    await reopen.click();
    await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
      'data-completion-result',
      'reopened',
    );
    await closeOpenMyFlowItemDetail(page);

    await gotoLegacySavedPlanLibraryRoute(page, '/calendar');
    await page.getByTestId('my-flow-month-picker').fill(nextGroupDate.slice(0, 7));
    await page.locator(`.fc-daygrid-day[data-date="${nextGroupDate}"]`)
      .getByTestId('my-flow-calendar-date-button')
      .click();
    await expect(page.getByTestId('my-flow-selected-day-summary')).toContainText('4개 남음');

    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
    workspace = await openSavedWorkspace(page);
    group = workspace.getByTestId('my-flow-temporal-next-group');
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    expect(await snapshotRows(group)).toEqual(initialRows);
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('wide workspace matches the mobile group and falls back to the nearest past date', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await gotoLegacySavedPlanLibraryRoute(page, '/flows');
    await seedSavedFlow(page, 'moving-d30-basic', 'calendar', mixedAnchor);

    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
    let workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    let group = workspace.getByTestId('my-flow-temporal-next-group');
    await expect(group).toHaveAttribute('data-temporal-kind', 'future');
    await expect(group).toHaveAttribute('data-temporal-date', nextGroupDate);
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expect(group.getByTestId('flow-date-rail')).toHaveCount(1);
    await expect(
      group.locator('[data-p35-marker="P35-R0-SHARED-TIMELINE-ROW"]'),
    ).toHaveCount(3);
    await expect(workspace.getByTestId('my-flow-past-items-disclosure')).toContainText(
      '저장된 지난 할 일 9개 보기',
    );
    await capture(page, 'p35-r0-next-date-group-1024.png', group);
    await expectPageQuality(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    group = workspace.getByTestId('my-flow-temporal-next-group');
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expectPageQuality(page);

    await seedSavedFlow(page, 'moving-d30-basic', 'calendar', allPastAnchor);
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
    workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    group = workspace.getByTestId('my-flow-temporal-next-group');
    await expect(group).toHaveAttribute('data-temporal-kind', 'past');
    await expect(group).toHaveAttribute('data-temporal-date', nearestPastDate);
    await expect(group.getByTestId('my-flow-execution-row-shell')).toHaveCount(2);
    await expect(workspace.getByTestId('my-flow-past-items-disclosure')).toContainText(
      '저장된 지난 할 일 22개 보기',
    );
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('undated checklist and routine use their shape-aware execution projections', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/flows');

    await seedSavedFlow(page, 'vehicle-inspection-prep', 'checklist');
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows');
    let workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep', 'execute');
    await expect(workspace.getByTestId('my-flow-temporal-next-group')).toHaveCount(0);
    await expect(
      workspace
        .getByTestId('my-flow-workspace-execute')
        .getByTestId('my-flow-execution-row-shell'),
    ).toHaveCount(3);

    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/curated-allblanc-morning-workout');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill(today);
    await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    const routineCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(routineCopyKey).toMatch(/^personal-copy:/u);
    await gotoLegacySavedPlanLibraryRoute(
      page,
      `/my?view=flows&flow=${encodeURIComponent(routineCopyKey)}`,
    );
    workspace = await openMyFlowLibraryFlow(
      page,
      routineCopyKey,
      'execute',
    );
    await expect(workspace.getByTestId('my-flow-temporal-next-group')).toHaveCount(0);
    expect(
      await workspace
        .getByTestId('my-flow-workspace-execute')
        .getByTestId('my-flow-execution-row-shell')
        .count(),
    ).toBeGreaterThan(0);
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
