import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  getOpenMyFlowItemDetail,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R9_EVIDENCE_DIR;

type RowScenario = {
  id: 'calendar' | 'checklist' | 'routine' | 'sheet' | 'memo';
  slug: string;
  publicShape: 'calendar' | 'checklist' | 'flow_execution' | 'sheet' | 'memo';
  savedMode: 'calendar' | 'checklist' | 'sheet' | 'memo';
  executable: boolean;
  anchor?: string;
};

const scenarios: RowScenario[] = [
  {
    id: 'calendar',
    slug: 'moving-d30-basic',
    publicShape: 'checklist',
    savedMode: 'calendar',
    executable: true,
    anchor: '2030-09-01',
  },
  {
    id: 'checklist',
    slug: 'vehicle-inspection-prep',
    publicShape: 'checklist',
    savedMode: 'checklist',
    executable: true,
  },
  {
    id: 'routine',
    slug: 'curated-allblanc-morning-workout',
    publicShape: 'checklist',
    savedMode: 'calendar',
    executable: true,
  },
  {
    id: 'sheet',
    slug: 'source-backed-middle-school-math-1',
    publicShape: 'sheet',
    savedMode: 'sheet',
    executable: true,
  },
  {
    id: 'memo',
    slug: 'pet-health-observation',
    publicShape: 'memo',
    savedMode: 'memo',
    executable: false,
  },
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seedSavedFlow(page: Page, scenario: RowScenario) {
  await gotoLegacySavedPlanLibraryRoute(page, '/flows');
  await page.evaluate((input) => {
    const anchor = input.id === 'routine' ? input.today : input.anchor;
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${input.slug}`, JSON.stringify({
      slug: input.slug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: input.savedMode,
      ...(anchor ? { anchor, dateIntent: 'custom' } : {}),
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
    if (anchor) {
      window.localStorage.setItem(
        `flow:${input.slug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor }),
      );
    }
  }, { ...scenario, today: formatLocalDate(new Date()) });
}

async function capture(page: Page, filename: string, focus?: Locator) {
  if (!evidenceRoot) return;
  fs.mkdirSync(evidenceRoot, { recursive: true });
  if (focus) await focus.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidenceRoot, filename), fullPage: false });
}

test.describe('P35-R9 shared execution row grammar', () => {
  for (const scenario of scenarios) {
    test(`${scenario.id} uses preview-neutral and saved-row contracts`, async ({ page }) => {
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
      const publicRows = preview.getByTestId('flow-capability-artifact-preview-row');
      expect(await publicRows.count()).toBeGreaterThan(0);
      const manifestIds = (
        (await selectedPreview.getAttribute('data-capability-manifest-item-ids')) ?? ''
      ).split(',').filter(Boolean);
      expect(manifestIds.length).toBeGreaterThan(0);
      await expect(selectedPreview).toHaveAttribute(
        'data-capability-output-count',
        String(manifestIds.length),
      );
      const firstPublicRow = publicRows.first();
      await expect(firstPublicRow).toHaveAttribute(
        'data-p35-r9-marker',
        'P35-R9-SHARED-EXECUTION-ROW',
      );
      await expect(firstPublicRow).toHaveAttribute(
        'data-p35-r9-preview-marker',
        'P35-R9-PREVIEW-NOT-COMPLETION',
      );
      await expect(firstPublicRow).toHaveAttribute('data-completion-control', 'false');
      await expect(firstPublicRow.getByRole('checkbox')).toHaveCount(0);
      expect(await firstPublicRow.locator('button, a[href], input, select, textarea').count())
        .toBeLessThanOrEqual(2);

      await seedSavedFlow(page, scenario);
      await gotoLegacySavedPlanLibraryRoute(page, `/my?view=flows&flow=${scenario.slug}`);
      const workspace = await openMyFlowLibraryFlow(page, scenario.slug);
      const execution = workspace.getByTestId('my-flow-shape-aware-execution');

      if (!scenario.executable) {
        await expect(execution).toHaveCount(0);
        return;
      }

      const savedRows = execution.locator('[data-flow-ui="execution-row"]');
      expect(await savedRows.count()).toBeGreaterThan(0);
      const firstSavedRow = savedRows.first();
      await expect(firstSavedRow).toHaveAttribute(
        'data-p35-r9-marker',
        'P35-R9-SHARED-EXECUTION-ROW',
      );
      await expect(firstSavedRow.locator('[data-flow-row-slot="open"]')).toHaveCount(1);
      await expect(firstSavedRow.locator('[data-flow-row-slot="completion"]')).toHaveCount(0);
      await expect(firstSavedRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);

      const open = firstSavedRow.locator('[data-flow-row-slot="open"]');
      await open.focus();
      await page.keyboard.press('Enter');
      const detail = page.getByTestId('my-flow-item-detail-sheet');
      await expect(detail).toBeVisible();
      const itemDetail = getOpenMyFlowItemDetail(page);
      await expect(itemDetail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
      await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
      if (scenario.id === 'calendar') {
        await expect(detail).toHaveAttribute('data-p35-marker', 'P35-R9-DETAIL-SINGLE-CLOSE');
        await expect(detail.getByRole('button', { name: /닫기/u })).toHaveCount(1);
        await capture(page, 'p35-r9-shared-row-detail-390.png', detail);
      }
      await page.keyboard.press('Escape');
      await expect(detail).toHaveCount(0);
      await expect(open).toBeFocused();
    });
  }

  test('wide saved rows keep completion in the Item detail', async ({ page }) => {
    const scenario = scenarios[0];
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlow(page, scenario);
    await gotoLegacySavedPlanLibraryRoute(page, `/my?view=flows&flow=${scenario.slug}`);
    const workspace = await openMyFlowLibraryFlow(page, scenario.slug);
    const row = workspace
      .getByTestId('my-flow-shape-aware-execution')
      .locator('[data-flow-ui="execution-row"]')
      .first();
    await expect(row.locator('[data-flow-row-slot="open"]')).toHaveCount(1);
    await expect(row.locator('[data-flow-row-slot="completion"]')).toHaveCount(0);
    await expect(row.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await row.locator('[data-flow-row-slot="open"]').click();
    const detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(page.locator('[data-testid="my-flow-task-complete-control"]:visible')).toHaveCount(1);
    await capture(page, 'p35-r9-shared-row-1024.png', workspace);
  });
});
