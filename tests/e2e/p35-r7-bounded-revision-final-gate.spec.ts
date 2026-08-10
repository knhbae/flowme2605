import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  closeOpenMyFlowItemDetail,
  gotoLegacySavedPlanLibraryRoute,
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
    publicShape: 'checklist',
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
    publicShape: 'checklist',
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

function transferDestination(scenario: ShapeScenario) {
  return scenario.primaryDestination ?? 'calendar';
}

async function makeSavedTransferDestinationVisible(
  panel: Locator,
  destination: 'calendar' | 'checklist' | 'sheet' | 'memo',
) {
  const action = panel.getByTestId(`my-flow-export-${destination}`);
  if (await action.isVisible().catch(() => false)) return action;
  const moreFormats = panel.getByTestId('my-flow-export-more-formats');
  await expect(moreFormats).toBeVisible();
  if ((await moreFormats.getAttribute('open')) === null) {
    await moreFormats.locator(':scope > summary').click();
  }
  await expect(action).toBeVisible();
  return action;
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
      await gotoLegacySavedPlanLibraryRoute(page, `/f/${scenario.slug}`);
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      const capability = page.getByTestId('public-flow-capability-result');
      await expect(capability).toBeVisible();
      await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
      await expect(capability).toHaveAttribute(
        'data-capability-snapshot-kind',
        'effective_authoring',
      );
      await expect(capability.locator(
        '[data-testid="flow-capability-result-choice"]'
          + '[data-capability-candidate-role="primary"]',
      )).toHaveCount(1);
      const selectedPreview = capability.getByTestId('flow-capability-selected-preview');
      const preview = selectedPreview.getByTestId('flow-capability-artifact-preview');
      await expect(preview).toHaveAttribute('data-selected-shape', scenario.publicShape);
      const manifestIds = (
        (await selectedPreview.getAttribute('data-capability-manifest-item-ids')) ?? ''
      ).split(',').filter(Boolean);
      expect(manifestIds).toHaveLength(scenario.itemCount);
      await expect(selectedPreview).toHaveAttribute(
        'data-capability-output-count',
        String(scenario.itemCount),
      );
      const expandPreview = preview.getByTestId('flow-capability-artifact-preview-expand');
      if (await expandPreview.isVisible().catch(() => false)) await expandPreview.click();
      await expect(preview.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(
        scenario.itemCount,
      );
      await expect(preview.getByTestId('flow-artifact-shape-choice')).toHaveCount(0);
      await capture(page, `p35-r7-${scenario.id}-session1-preview-390.png`);
      await expectPageQuality(page);

      if (scenario.id === 'calendar') {
        const conditionalCalendar = capability.locator(
          '[data-testid="flow-capability-conditional-result"]'
            + '[data-capability-destination="calendar"]',
        );
        await expect(conditionalCalendar).toHaveAttribute(
          'data-capability-output-count',
          '0',
        );
        await expect(conditionalCalendar).toHaveAttribute(
          'data-capability-expected-output-count',
          String(scenario.itemCount),
        );
        const edit = conditionalCalendar.getByTestId('flow-capability-conditional-edit');
        await edit.focus();
        await page.keyboard.press('Enter');
        const planEditor = page.getByTestId('public-flow-personal-adjustment');
        await expect(planEditor).toBeVisible();
        await expect(planEditor).toHaveAttribute('data-editor-context', 'public-draft');
        await expect(planEditor).toHaveAttribute('data-editor-level', 'plan');
        await expect(planEditor).toHaveAttribute('data-adjustment-kind', 'anchor');
        await expect(planEditor.locator(':focus')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await expect(planEditor).toHaveCount(0);
        await expect(edit).toBeFocused();
      }

      // Session 2: inspect the same artifact plan before taking it outside FlowMe.
      if (scenario.anchor) {
        await page.getByTestId('public-flow-anchor-input').fill(scenario.anchor);
      }
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
      const sessionTwoCapability = page.getByTestId('public-flow-capability-result');
      const destination = transferDestination(scenario);
      const publicCandidate = sessionTwoCapability.locator(
        '[data-testid="flow-capability-result-choice"]'
          + `[data-capability-destination="${destination}"]`,
      );
      await expect(publicCandidate).toHaveCount(1);
      await expect(publicCandidate).toHaveAttribute(
        'data-capability-output-count',
        String(scenario.preflightCount),
      );
      await publicCandidate.click();
      const publicTransferPreview = sessionTwoCapability.getByTestId(
        'flow-capability-selected-preview',
      );
      await expect(publicTransferPreview).toHaveAttribute(
        'data-capability-destination',
        destination,
      );
      await expect(publicTransferPreview).toHaveAttribute(
        'data-capability-output-count',
        String(scenario.preflightCount),
      );
      await capture(
        page,
        `p35-r7-${scenario.id}-session2-preflight-1024.png`,
        sessionTwoCapability,
      );
      await expectPageQuality(page);

      // Session 3: consume the same source shape inside one personal workspace.
      await seedSavedFlow(page, scenario);
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, `/my?view=flows&flow=${scenario.slug}`);
      const workspace = await openMyFlowLibraryFlow(page, scenario.slug);
      await expect(workspace).toHaveAttribute('data-p35-marker', 'P35-PERSONAL-SINGLE-FOCUS');
      const outline = workspace.getByTestId('my-flow-whole-flow-outline');
      await expect(outline).toHaveAttribute('data-effective-row-count', String(scenario.itemCount));
      await expect(workspace.locator('[data-testid^="my-flow-workspace-tab-"]')).toHaveCount(0);

      const transferEntry = workspace.getByTestId('my-flow-export-entry');
      await expect(transferEntry).toHaveAttribute('data-action-role', 'transfer-to-own-tool');
      await transferEntry.click();
      const transferPanel = workspace.getByTestId('my-flow-export-panel');
      const savedCapability = transferPanel.getByTestId('my-flow-capability-result');
      await expect(savedCapability).toHaveAttribute('data-capability-lifecycle', 'saved_detail');
      await expect(savedCapability).toHaveAttribute(
        'data-capability-snapshot-kind',
        'effective_execution',
      );
      const savedCandidate = savedCapability.locator(
        '[data-testid="flow-capability-result-choice"]'
          + `[data-capability-destination="${destination}"]`,
      );
      await expect(savedCandidate).toHaveCount(1);
      await expect(savedCandidate).toHaveAttribute(
        'data-capability-output-count',
        String(scenario.preflightCount),
      );
      const savedSnapshotKind = (await savedCapability.getAttribute(
        'data-capability-snapshot-kind',
      )) ?? '';
      const savedSnapshotVersion = (await savedCapability.getAttribute(
        'data-capability-snapshot-version',
      )) ?? '';
      const savedSnapshotHash = (await savedCandidate.getAttribute(
        'data-capability-manifest-hash',
      )) ?? '';
      const savedItemIds = (await savedCandidate.getAttribute(
        'data-capability-manifest-item-ids',
      )) ?? '';
      const transferAction = await makeSavedTransferDestinationVisible(
        transferPanel,
        destination,
      );
      await transferAction.click();
      const confirmation = transferPanel.getByTestId('my-flow-transfer-confirmation');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toHaveAttribute('data-snapshot-kind', savedSnapshotKind);
      await expect(confirmation).toHaveAttribute('data-snapshot-version', savedSnapshotVersion);
      await expect(confirmation).toHaveAttribute('data-snapshot-hash', savedSnapshotHash);
      await expect(confirmation).toHaveAttribute('data-scope', 'flow');
      await expect(confirmation).toHaveAttribute('data-format', destination);
      await expect(confirmation).toHaveAttribute('data-destination', destination);
      await expect(confirmation).toHaveAttribute('data-item-ids', savedItemIds);
      await expect(confirmation).toHaveAttribute(
        'data-output-count',
        String(scenario.preflightCount),
      );
      await confirmation.getByTestId('my-flow-transfer-cancel').click();
      await expect(confirmation).toHaveCount(0);
      await expect(transferEntry).toBeFocused();
      await transferEntry.click();
      await expect(transferPanel).toHaveCount(0);

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
      const completionItemId = await completionShell
        .locator('article[data-item-id]')
        .getAttribute('data-item-id');
      expect(completionItemId).toBeTruthy();
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
        const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
        if (!(await outline.isVisible().catch(() => false))) {
          await expect(planToggle).toBeVisible();
          await planToggle.click();
          await expect(outline).toBeVisible();
        }
        const expandAll = outline.getByTestId('my-flow-whole-flow-toggle-all-groups');
        let completedRow = outline.locator(
          `article[data-item-id="${completionItemId}"]`,
        );
        if (
          !(await completedRow.isVisible().catch(() => false))
          && await expandAll.isVisible().catch(() => false)
        ) {
          await expandAll.click();
          completedRow = outline.locator(`article[data-item-id="${completionItemId}"]`);
        }
        await expect(completedRow).toBeVisible();
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
          `article[data-item-id="${completionItemId}"]`,
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
    await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux60&view=flows');

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
