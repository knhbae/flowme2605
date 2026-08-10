import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R11_EVIDENCE_DIR;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seedSavedFlow(
  page: Page,
  input: {
    slug: string;
    anchor?: string;
    routine?: boolean;
  },
) {
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate((fixture) => {
    const anchor = fixture.routine ? fixture.today : fixture.anchor;
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${fixture.slug}`, JSON.stringify({
      slug: fixture.slug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      ...(anchor ? { anchor, dateIntent: 'custom' } : {}),
      ...(fixture.routine ? {
        weekdays: ['월', '수', '금'],
        routineDefinition: {
          schemaVersion: 1,
          time: '07:30',
          durationMinutes: 45,
          end: { mode: 'none' },
        },
      } : {}),
    }));
    if (anchor) {
      window.localStorage.setItem(
        `flow:${fixture.slug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor }),
      );
    }
  }, { ...input, today: formatLocalDate(new Date()) });
}

async function capture(page: Page, filename: string, focus?: Locator) {
  if (!evidenceRoot) return;
  fs.mkdirSync(evidenceRoot, { recursive: true });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidenceRoot, filename), fullPage: false });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
}

test.describe('P35-R11 wide execution workspace and routine hierarchy', () => {
  test('1024 workspace separates library execution canvas and contextual inspector', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlow(page, {
      slug: 'moving-d30-basic',
      anchor: '2030-09-01',
    });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows&flow=moving-d30-basic');
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const library = page.getByTestId('my-flow-library-rail');
    const canvas = workspace.getByTestId('my-flow-wide-execution-canvas');
    const inspector = workspace.getByTestId('my-flow-workspace-detail-pane');

    await expect(page.getByTestId('my-flow-library-workspace')).toHaveAttribute(
      'data-p35-r11-marker',
      'P35-R11-WIDE-EXECUTION-INSPECTOR',
    );
    await expect(workspace).toHaveAttribute(
      'data-p35-r11-marker',
      'P35-R11-WIDE-EXECUTION-INSPECTOR',
    );
    await expect(canvas.getByTestId('my-flow-shape-aware-execution')).toBeVisible();
    await expect(canvas.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
    await expect(inspector.getByTestId('my-flow-workspace-progress-summary')).toBeVisible();
    await expect(inspector.getByTestId('my-flow-export-entry')).toBeVisible();
    await expect(inspector.getByTestId('my-flow-management-menu-trigger')).toBeVisible();

    const [libraryBox, canvasBox, inspectorBox] = await Promise.all([
      library.boundingBox(),
      canvas.boundingBox(),
      inspector.boundingBox(),
    ]);
    expect(libraryBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    expect(inspectorBox).not.toBeNull();
    expect((libraryBox?.x ?? 0) + (libraryBox?.width ?? 0)).toBeLessThanOrEqual(
      (canvasBox?.x ?? 0) + 1,
    );
    expect((canvasBox?.x ?? 0) + (canvasBox?.width ?? 0)).toBeLessThanOrEqual(
      (inspectorBox?.x ?? 0) + 1,
    );

    const firstExecutionRow = canvas.getByTestId('my-flow-execution-row-shell').first();
    await firstExecutionRow.getByRole('button').first().click();
    await expect(inspector.getByTestId('my-flow-item-detail')).toBeVisible();
    await expect(workspace.locator('[data-testid="my-flow-overview-card"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await capture(page, 'p35-r11-wide-execution-inspector-1024.png', workspace);
  });

  test('1440 routine distinguishes series current occurrence and history', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedSavedFlow(page, {
      slug: 'curated-allblanc-morning-workout',
      routine: true,
    });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows&flow=curated-allblanc-morning-workout');
    const workspace = await openMyFlowLibraryFlow(page, 'curated-allblanc-morning-workout');

    await expect(workspace).toHaveAttribute(
      'data-p35-r11-routine-marker',
      'P35-R11-ROUTINE-SERIES-CURRENT-HISTORY',
    );
    await expect(workspace.getByTestId('my-flow-routine-series-summary')).toBeVisible();
    const occurrence = workspace.getByTestId('my-flow-routine-current-occurrence');
    await expect(occurrence).toBeVisible();
    const occurrenceId = await occurrence.getAttribute('data-occurrence-id');
    expect(occurrenceId).toBeTruthy();
    await expect(
      workspace.locator(
        `[data-execution-level="occurrence"][data-occurrence-id="${occurrenceId}"]`,
      ),
    ).toHaveCount(1);
    await expect(
      workspace.locator('[data-execution-level="series"][data-occurrence-id]'),
    ).toHaveCount(0);
    const history = workspace.locator(
      '[data-testid="my-flow-optional-history"], [data-testid="my-flow-routine-history-empty"]',
    );
    await expect(history).toBeVisible();
    await expect(history).toContainText('지난 회차');
    await expectNoHorizontalOverflow(page);
    await capture(page, 'p35-r11-routine-series-current-history-1440.png', workspace);
  });

  test('390 keeps execution before whole plan without the wide inspector', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'moving-d30-basic',
      anchor: '2030-09-01',
    });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?view=flows&flow=moving-d30-basic');
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const execution = workspace.getByTestId('my-flow-shape-aware-execution');
    const wholePlan = workspace.getByTestId('my-flow-whole-flow-outline');

    await expect(execution).toBeVisible();
    await expect(wholePlan).toBeVisible();
    await expect(workspace.getByTestId('my-flow-wide-execution-inspector')).toHaveCount(0);
    expect(await workspace.evaluate((element) => {
      const executionNode = element.querySelector('[data-testid="my-flow-shape-aware-execution"]');
      const wholePlanNode = element.querySelector('[data-testid="my-flow-whole-flow-outline"]');
      return Boolean(
        executionNode &&
        wholePlanNode &&
        (executionNode.compareDocumentPosition(wholePlanNode) & Node.DOCUMENT_POSITION_FOLLOWING),
      );
    })).toBe(true);
    await expectNoHorizontalOverflow(page);
    await capture(page, 'p35-r11-mobile-execution-plan-order-390.png', workspace);
  });
});
