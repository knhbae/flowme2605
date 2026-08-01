import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R4_EVIDENCE_DIR;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getKoreanWeekday(date: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}

function formatKoreanMonthDay(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

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

async function seedSavedFlow(
  page: Page,
  options: {
    slug: string;
    mode: 'calendar' | 'checklist' | 'sheet';
    anchor?: string;
    weekdays?: string[];
    routineEndMode?: 'count' | 'none';
  },
) {
  await page.goto('/flows');
  await page.evaluate((input) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${input.slug}`, JSON.stringify({
      slug: input.slug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: input.mode,
      ...(input.anchor ? { anchor: input.anchor, dateIntent: 'custom' } : {}),
      ...(input.weekdays ? { weekdays: input.weekdays } : {}),
      ...(input.weekdays ? {
        routineDefinition: {
          schemaVersion: 1,
          time: '07:30',
          durationMinutes: 45,
          end: input.routineEndMode === 'none'
            ? { mode: 'none' }
            : { mode: 'count', count: 8 },
        },
      } : {}),
    }));
    if (input.anchor) {
      window.localStorage.setItem(
        `flow:${input.slug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor: input.anchor }),
      );
    }
  }, options);
}

async function expectContinuousOrder(workspace: Locator, includeHistory: boolean) {
  const result = await workspace.evaluate((element, shouldIncludeHistory) => {
    const execution = element.querySelector('[data-testid="my-flow-shape-aware-execution"]');
    const plan = element.querySelector(
      '[data-testid="my-flow-workspace-plan"], [data-testid="my-flow-whole-flow-workspace"]',
    );
    const history = element.querySelector('[data-testid="my-flow-optional-history"]');
    const follows = (left: Element | null, right: Element | null) => Boolean(
      left &&
      right &&
      (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    return {
      executionBeforePlan: execution ? follows(execution, plan) : true,
      planBeforeHistory: history ? follows(plan, history) : true,
      historyVisible: Boolean(history),
      fixedTabCount: element.querySelectorAll('[data-testid^="my-flow-workspace-tab-"]').length,
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      expectedHistory: shouldIncludeHistory,
    };
  }, includeHistory);
  expect(result.executionBeforePlan).toBe(true);
  expect(result.planBeforeHistory).toBe(true);
  expect(result.historyVisible).toBe(result.expectedHistory);
  expect(result.fixedTabCount).toBe(0);
  expect(result.horizontalOverflow).toBe(0);
}

test.describe('P35-R4 shape-aware My Flow workspace', () => {
  test('mobile dated Flow uses one nearest-date group before the whole plan', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'moving-d30-basic',
      mode: 'calendar',
      anchor: '2030-09-01',
    });
    await page.goto('/my?view=flows&flow=moving-d30-basic');

    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(execution).toHaveAttribute('data-execution-kind', 'nearest_date_group');
    await expect(execution).toHaveAttribute('data-p35-marker', 'P35-R4-DATED-NEXT-GROUP');
    await expect(execution.getByTestId('flow-date-rail')).toHaveCount(1);
    await expect(execution.getByTestId('my-flow-execution-row-shell')).toHaveCount(3);
    await expect(workspace.getByTestId('my-flow-optional-history')).toHaveCount(0);
    await expectContinuousOrder(workspace, false);
    await capture(page, 'p35-r4-dated-next-group-390.png', execution);

    const firstExecutionRow = execution.getByTestId('my-flow-execution-row-shell').first();
    await expect(firstExecutionRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await firstExecutionRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    const completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await completion.click();
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
      '전체 1/24 완료',
    );
    await closeOpenMyFlowItemDetail(page);
    await expect(workspace.getByTestId('my-flow-optional-history')).toBeVisible();
    await expectContinuousOrder(workspace, true);
    expect(errors).toEqual([]);
  });

  test('mobile routine distinguishes the current occurrence from its series', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'curated-allblanc-morning-workout',
      mode: 'calendar',
      anchor: formatLocalDate(new Date()),
      weekdays: ['월', '수', '금'],
    });
    await page.goto('/my?view=flows&flow=curated-allblanc-morning-workout');

    const workspace = await openMyFlowLibraryFlow(
      page,
      'curated-allblanc-morning-workout',
    );
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(execution).toHaveAttribute('data-execution-kind', 'current_occurrence');
    await expect(execution.getByTestId('my-flow-routine-series-summary')).toContainText('반복 계획');
    const occurrence = execution.getByTestId('my-flow-routine-current-occurrence');
    await expect(occurrence).toHaveAttribute('data-occurrence-id', /.+/u);
    await expect(occurrence).toHaveAttribute('data-series-id', /.+/u);
    await expectContinuousOrder(workspace, false);
    await capture(page, 'p35-r4-routine-occurrence-390.png');
    expect(errors).toEqual([]);
  });

  test('open routine advances beyond the short execution horizon and undo restores the same occurrence', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const firstDate = addLocalDays(new Date(), 6);
    const secondDate = addLocalDays(firstDate, 2);
    const thirdDate = addLocalDays(firstDate, 4);
    await seedSavedFlow(page, {
      slug: 'curated-allblanc-morning-workout',
      mode: 'calendar',
      anchor: formatLocalDate(firstDate),
      weekdays: [
        getKoreanWeekday(firstDate),
        getKoreanWeekday(secondDate),
        getKoreanWeekday(thirdDate),
      ],
      routineEndMode: 'none',
    });
    await page.goto('/my?view=flows&flow=curated-allblanc-morning-workout');

    const workspace = await openMyFlowLibraryFlow(
      page,
      'curated-allblanc-morning-workout',
    );
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(execution).toHaveAttribute(
      'data-p35-r8-marker',
      'P35-R8A-ROUTINE-NEXT-OCCURRENCE',
    );
    const occurrence = execution.getByTestId('my-flow-routine-current-occurrence');
    const firstOccurrenceId = await occurrence.getAttribute('data-occurrence-id');
    expect(firstOccurrenceId).toBeTruthy();
    await expect(occurrence).toContainText(formatKoreanMonthDay(firstDate));

    await expect(occurrence.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await occurrence.getByRole('button', { name: /열기/ }).click();
    let detail = getOpenMyFlowItemDetail(page);
    let completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await completion.click();
    await closeOpenMyFlowItemDetail(page);
    await expect.poll(
      () => occurrence.getAttribute('data-occurrence-id'),
    ).not.toBe(firstOccurrenceId);
    await expect(occurrence).toContainText(formatKoreanMonthDay(secondDate));
    await expect(execution).not.toContainText('남은 회차가 없습니다');

    await page.getByTestId('my-flow-completion-undo').click();
    await expect(occurrence).toHaveAttribute('data-occurrence-id', firstOccurrenceId ?? '');
    await expect(occurrence).toContainText(formatKoreanMonthDay(firstDate));
    await occurrence.getByRole('button', { name: /열기/ }).click();
    detail = getOpenMyFlowItemDetail(page);
    completion = detail.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(completion).not.toBeChecked();
    await closeOpenMyFlowItemDetail(page);
    await capture(page, 'p35-r8a-routine-next-occurrence-390.png', execution);
    expect(errors).toEqual([]);
  });

  test('open routine receipt and export distinguish one series from rendered occurrences', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.getByTestId('public-flow-anchor-input').fill(formatLocalDate(addLocalDays(new Date(), 6)));
    const routineSummary = page.getByTestId('public-routine-schedule-summary');
    await routineSummary.getByTestId('public-routine-schedule-summary-toggle').click();
    await page.getByTestId('public-routine-schedule-editor-end-mode').selectOption('none');
    await page.getByTestId('public-flow-save-primary-mobile').click();

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toHaveAttribute(
      'data-p35-r8-marker',
      'P35-R8A-SERIES-OCCURRENCE-COUNT',
    );
    await expect(receipt).toContainText('반복 계획 1개를 저장했어요');
    await expect(receipt).toContainText('계속 반복');
    await receipt.getByTestId('public-flow-saved-receipt-primary').click();

    const workspace = await openMyFlowLibraryFlow(
      page,
      'curated-allblanc-morning-workout',
    );
    const exportSurface = workspace.getByTestId('my-flow-export-surface');
    await exportSurface.getByTestId('my-flow-export-entry').click();
    const calendarSummary = exportSurface.getByTestId('my-flow-export-calendar-summary');
    await expect(calendarSummary).toContainText('반복 계획 1개');
    await expect(calendarSummary).toContainText('캘린더 파일 1개');
    await expect(calendarSummary).toContainText(/화면 회차 \d+개/u);
    await expect(calendarSummary).not.toContainText('4주');
    await capture(page, 'p35-r8a-routine-series-export-390.png', exportSurface);

    await page.setViewportSize({ width: 1024, height: 768 });
    const wideWorkspace = await openMyFlowLibraryFlow(
      page,
      'curated-allblanc-morning-workout',
    );
    await capture(page, 'p35-r8a-routine-series-export-1024.png', wideWorkspace);
    expect(errors).toEqual([]);
  });

  test('wide sheet shows current and next rows before the whole table', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlow(page, {
      slug: 'new-car-delivery-check',
      mode: 'sheet',
    });
    await page.goto('/my?view=flows&flow=new-car-delivery-check');

    const workspace = await openMyFlowLibraryFlow(page, 'new-car-delivery-check');
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    await expect(execution).toHaveAttribute('data-execution-kind', 'current_and_next_row');
    await expect(execution.getByTestId('my-flow-shape-aware-row')).toHaveCount(2);
    await expect(execution.locator('[data-row-role="current"]')).toContainText('현재 행');
    await expect(execution.locator('[data-row-role="next"]')).toContainText('다음 행');
    await expectContinuousOrder(workspace, false);
    await capture(page, 'p35-r4-sheet-current-1024.png', execution);
    expect(errors).toEqual([]);
  });

  test('fresh memo has no synthetic next unit or fixed record surface', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'passport-renewal-docs',
      mode: 'checklist',
    });
    await page.goto('/my?view=flows&flow=passport-renewal-docs');

    const workspace = await openMyFlowLibraryFlow(page, 'passport-renewal-docs');
    await expect(workspace).toHaveAttribute('data-p32-flow-shape', '메모');
    await expect(workspace.getByTestId('my-flow-shape-aware-execution')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-workspace-plan')).toBeVisible();
    await expect(workspace.getByTestId('my-flow-optional-history')).toHaveCount(0);
    await expectContinuousOrder(workspace, false);
    expect(errors).toEqual([]);
  });
});
