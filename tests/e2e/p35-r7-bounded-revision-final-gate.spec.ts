import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R7_EVIDENCE_DIR;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type ShapeScenario = {
  id: 'calendar' | 'checklist' | 'routine' | 'sheet' | 'memo';
  slug: string;
  publicShape: 'calendar' | 'checklist' | 'flow_execution' | 'sheet' | 'memo';
  savedMode: 'calendar' | 'checklist' | 'sheet' | 'memo';
  itemCount: number;
  primaryDestination?: 'calendar' | 'checklist' | 'sheet' | 'memo';
  preflightCount: number;
  anchor?: string;
  executionKind: 'nearest_date_group' | 'next_items' | 'current_occurrence' | 'current_and_next_row' | 'none';
};

const scenarios: ShapeScenario[] = [
  {
    id: 'calendar',
    slug: 'moving-d30-basic',
    publicShape: 'calendar',
    savedMode: 'calendar',
    itemCount: 24,
    primaryDestination: 'calendar',
    preflightCount: 24,
    anchor: '2030-09-01',
    executionKind: 'nearest_date_group',
  },
  {
    id: 'checklist',
    slug: 'vehicle-inspection-prep',
    publicShape: 'checklist',
    savedMode: 'checklist',
    itemCount: 10,
    primaryDestination: 'checklist',
    preflightCount: 10,
    executionKind: 'next_items',
  },
  {
    id: 'routine',
    slug: 'curated-allblanc-morning-workout',
    publicShape: 'flow_execution',
    savedMode: 'calendar',
    itemCount: 1,
    preflightCount: 1,
    anchor: '2030-08-15',
    executionKind: 'current_occurrence',
  },
  {
    id: 'sheet',
    slug: 'source-backed-middle-school-math-1',
    publicShape: 'sheet',
    savedMode: 'sheet',
    itemCount: 8,
    primaryDestination: 'sheet',
    preflightCount: 8,
    executionKind: 'current_and_next_row',
  },
  {
    id: 'safety-checklist',
    slug: 'overseas-safety-register',
    publicShape: 'checklist',
    savedMode: 'checklist',
    itemCount: 4,
    primaryDestination: 'checklist',
    preflightCount: 4,
    executionKind: 'next_items',
  },
];

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
  else await page.evaluate(() => window.scrollTo(0, 0));
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
    const unnamedInteractiveCount = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary',
    )).filter((element) => {
      if (!visible(element)) return false;
      const control = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const associatedLabel = Array.from(control.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      const labelledBy = element.getAttribute('aria-labelledby')
        ?.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ');
      return [
        element.getAttribute('aria-label'),
        labelledBy,
        element.getAttribute('title'),
        associatedLabel,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim().length === 0;
    }).length;
    const mobileNavigation = document.querySelector<HTMLElement>(
      '[data-testid="platform-mobile-tabs"]',
    );
    const navigationRect = mobileNavigation?.getBoundingClientRect();
    const fixedOverlapCount = !mobileNavigation || !navigationRect
      ? 0
      : Array.from(document.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, summary',
        ))
        .filter((element) => !mobileNavigation.contains(element) && visible(element))
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
      unnamedInteractiveCount,
      fixedOverlapCount,
      mainLandmarkCount: document.querySelectorAll('main').length,
    };
  });
}

async function expectPageQuality(page: Page) {
  const quality = await inspectPageQuality(page);
  expect(quality.horizontalOverflow).toBe(0);
  expect(quality.unnamedInteractiveCount).toBe(0);
  expect(quality.fixedOverlapCount).toBe(0);
  expect(quality.mainLandmarkCount).toBeGreaterThanOrEqual(1);
}

async function openPublicPreflight(page: Page) {
  await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
  const entry = page.getByTestId('public-flow-export-secondary-entry');
  await entry.scrollIntoViewIfNeeded();
  await expect(entry.getByTestId('public-flow-export-secondary-toggle')).toContainText('옮기기');
  await entry.getByTestId('public-flow-export-secondary-toggle').click();
  const branch = page.getByTestId('public-flow-export-branch');
  await expect(branch).toBeVisible();
  await expect(entry).toHaveAttribute('data-p35-marker', /P35-R1-PUBLIC-ARTIFACT-PREFLIGHT/);
  return { entry, branch };
}

async function seedSavedFlow(page: Page, scenario: ShapeScenario) {
  await page.evaluate((input) => {
    const personalAnchor = input.id === 'routine' ? input.today : input.anchor;
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${input.slug}`, JSON.stringify({
      slug: input.slug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: input.savedMode,
      ...(personalAnchor ? {
        anchor: personalAnchor,
        dateIntent: 'custom',
      } : {}),
      ...(input.id === 'routine' ? {
        weekdays: ['월', '수', '금'],
        routineDefinition: {
          schemaVersion: 1,
          time: '07:30',
          durationMinutes: 45,
          end: { mode: 'count', count: 8 },
        },
      } : {}),
    }));
    if (personalAnchor) {
      window.localStorage.setItem(
        `flow:${input.slug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor: personalAnchor }),
      );
    }
  }, {
    ...scenario,
    today: formatLocalDate(new Date()),
  });
}

test.describe('P35-R7 bounded revision final gate', () => {
  for (const scenario of scenarios) {
    test(`${scenario.id} preserves preview, preflight, and personal execution parity`, async ({ page }) => {
      const errors = collectBrowserErrors(page);

      // Session 1: inspect the actual result before personalizing or saving.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/f/${scenario.slug}`);
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      const preview = page.getByTestId('public-flow-artifact-preview');
      await expect(preview).toHaveAttribute('data-selected-shape', scenario.publicShape);
      await expect(preview.getByTestId('public-flow-artifact-preview-row')).toHaveCount(
        scenario.itemCount,
      );
      await expect(preview.getByTestId('flow-artifact-shape-choice')).toHaveCount(0);
      await capture(page, `p35-r7-${scenario.id}-session1-preview-390.png`);
      await expectPageQuality(page);

      if (scenario.id === 'calendar') {
        const edit = preview.getByTestId('public-flow-artifact-preview-row-edit').first();
        await edit.focus();
        await page.keyboard.press('Enter');
        const itemEditor = page.getByTestId('public-flow-item-editor');
        await expect(itemEditor).toBeVisible();
        await expect(itemEditor.getByTestId('public-flow-item-editor-title-input')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(itemEditor).toHaveCount(0);
        const parentAdjustment = page.getByTestId('public-flow-personal-adjustment');
        await expect(parentAdjustment).toBeVisible();
        await parentAdjustment.getByTestId('public-flow-adjustment-cancel').click();
        await expect(edit).toBeFocused();
      }

      // Session 2: inspect the same artifact plan before taking it outside FlowMe.
      if (scenario.anchor) {
        await page.getByTestId('public-flow-anchor-input').fill(scenario.anchor);
      }
      await page.setViewportSize({ width: 1024, height: 768 });
      const { entry: preflight, branch: preflightBranch } = await openPublicPreflight(page);
      if (scenario.id === 'routine') {
        await expect(preflight).toHaveAttribute('data-preflight-schedule-state', 'committed');
        await expect(
          preflightBranch.locator(
            '[data-testid="public-flow-export-format-option"][data-export-destination="calendar"]',
          ),
        ).toHaveAttribute('data-export-count', String(scenario.preflightCount));
      } else {
        await expect(preflight).toHaveAttribute(
          'data-primary-destination',
          scenario.primaryDestination!,
        );
        await expect(
          preflightBranch.locator(
            '[data-testid="public-flow-export-format-option"]'
            + `[data-export-destination="${scenario.primaryDestination}"]`,
          ),
        ).toHaveAttribute('data-export-count', String(scenario.preflightCount));
      }
      await expect(
        preflightBranch.locator('[data-recommendation-visible="true"][data-export-state="disabled"]'),
      ).toHaveCount(0);
      await capture(
        page,
        `p35-r7-${scenario.id}-session2-preflight-1024.png`,
        preflightBranch,
      );
      await expectPageQuality(page);
      await preflightBranch.getByTestId('public-flow-export-branch-close').click();
      await expect(preflightBranch).toHaveCount(0);

      // Session 3: consume the same source shape inside one personal workspace.
      await seedSavedFlow(page, scenario);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/my?view=flows&flow=${scenario.slug}`);
      const workspace = await openMyFlowLibraryFlow(page, scenario.slug);
      await expect(workspace).toHaveAttribute('data-p35-marker', 'P35-PERSONAL-SINGLE-FOCUS');
      const outline = workspace.getByTestId('my-flow-whole-flow-outline');
      await expect(outline).toHaveAttribute('data-effective-row-count', String(scenario.itemCount));
      await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);

      const execution = workspace.getByTestId('my-flow-shape-aware-execution');
      if (scenario.executionKind === 'none') {
        await expect(execution).toHaveCount(0);
      } else {
        await expect(execution).toHaveAttribute(
          'data-execution-kind',
          scenario.executionKind,
        );
      }

      const completionShell = scenario.id === 'routine'
        ? workspace
          .getByTestId('my-flow-routine-current-occurrence')
          .getByTestId('my-flow-execution-row-shell')
          .first()
        : execution.getByTestId('my-flow-execution-row-shell').first();
      await expect(completionShell.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
      const completionRowKey = await completionShell
        .locator('article[data-row-key]')
        .getAttribute('data-row-key');
      expect(completionRowKey).toBeTruthy();
      const firstOccurrenceId = scenario.id === 'routine'
        ? await workspace.getByTestId('my-flow-routine-current-occurrence').getAttribute('data-occurrence-id')
        : null;
      await completionShell.getByRole('button', { name: /열기/ }).click();
      let detail = getOpenMyFlowItemDetail(page);
      let completion = detail.getByTestId('my-flow-task-complete-control');
      await expect(completion).toHaveCount(1);
      await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
      await completion.click();

      if (scenario.id === 'routine') {
        await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
          'data-completion-result',
          'completed',
        );
        await closeOpenMyFlowItemDetail(page);
        await page.getByTestId('my-flow-completion-undo').click();
        await expect(
          workspace.getByTestId('my-flow-routine-current-occurrence'),
        ).toHaveAttribute('data-occurrence-id', firstOccurrenceId ?? '');
        await workspace
          .getByTestId('my-flow-routine-current-occurrence')
          .getByRole('button', { name: /열기/ })
          .click();
        detail = getOpenMyFlowItemDetail(page);
        completion = detail.getByTestId('my-flow-task-complete-control');
        await expect(completion).toHaveCount(1);
        await expect(completion).not.toBeChecked();
        await closeOpenMyFlowItemDetail(page);
      } else {
        await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveCount(0);
        await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
          `전체 1/${scenario.itemCount} 완료`,
        );
        await closeOpenMyFlowItemDetail(page);
        const expandAll = outline.getByTestId('my-flow-whole-flow-toggle-all-groups');
        let completedRow = outline.locator(
          `article[data-row-key="${completionRowKey}"]`,
        );
        if (
          (await completedRow.count()) === 0
          && await expandAll.isVisible().catch(() => false)
        ) {
          await expandAll.click();
          completedRow = outline.locator(`article[data-row-key="${completionRowKey}"]`);
        }
        await expect(completedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
        await completedRow.getByRole('button', { name: /열기/ }).click();
        detail = getOpenMyFlowItemDetail(page);
        const reopen = detail.getByTestId('my-flow-task-complete-control');
        await expect(reopen).toHaveCount(1);
        await expect(reopen).toBeChecked();
        await reopen.click();
        await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText(
          `전체 0/${scenario.itemCount} 완료`,
        );
        await closeOpenMyFlowItemDetail(page);
        const reopenedRow = execution.locator(
          `article[data-row-key="${completionRowKey}"]`,
        );
        await expect(reopenedRow).toBeVisible();
        await expect(reopenedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
        await expect(page.getByTestId('my-flow-completion-snackbar')).toHaveAttribute(
          'data-completion-result',
          'reopened',
        );
      }
      await capture(page, `p35-r7-${scenario.id}-session3-workspace-390.png`);
      await expectPageQuality(page);
      expect(errors).toEqual([]);
    });
  }

  test('selected desktop library keeps the same focused object contract', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/my?demo=ux60&view=flows');

    const library = page.getByTestId('my-flow-library-workspace');
    await expect(library.getByTestId('my-flow-library-row')).toHaveCount(60);
    await library.getByTestId('my-flow-library-row').first().click();
    await expect(
      library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card'),
    ).toHaveAttribute('data-p35-marker', 'P35-PERSONAL-SINGLE-FOCUS');
    await capture(page, 'p35-r7-library-60-1440.png');
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
