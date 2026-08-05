import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { openMyFlowLibraryFlow } from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_R10_EVIDENCE_DIR;

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
    selectedArtifactMode: 'calendar' | 'checklist' | 'sheet' | 'memo';
    anchor?: string;
    routine?: boolean;
  },
) {
  await page.goto('/flows');
  await page.evaluate((fixture) => {
    const anchor = fixture.routine ? fixture.today : fixture.anchor;
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${fixture.slug}`, JSON.stringify({
      slug: fixture.slug,
      savedAt: '2030-08-01T00:00:00.000Z',
      selectedArtifactMode: fixture.selectedArtifactMode,
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

test.describe('P35-R10 shape honesty and export simplification', () => {
  test('memo workspace uses record grammar without fake completion or progress', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'pet-health-observation',
      selectedArtifactMode: 'memo',
    });
    await page.goto('/my?view=flows&flow=pet-health-observation');
    const workspace = await openMyFlowLibraryFlow(page, 'pet-health-observation');

    await expect(workspace).toHaveAttribute('data-p35-r10-marker', 'P35-R10-SHAPE-HONESTY');
    await expect(workspace.getByTestId('my-flow-shape-aware-execution')).toHaveCount(0);
    const outline = workspace.getByTestId('my-flow-whole-flow-outline');
    await expect(outline).toHaveAttribute('data-completion-enabled', 'false');
    await expect(outline.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await expect(outline.getByText(/완료$/u)).toHaveCount(0);
    await expect(workspace.locator('[role="img"][aria-label^="전체 진행"]')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-workspace-progress-summary')).toContainText('개');
    await capture(page, 'p35-r10-memo-record-grammar-390.png', workspace);
  });

  test('one-series routine shows series and occurrence state without a one-item progress bar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'curated-allblanc-morning-workout',
      selectedArtifactMode: 'calendar',
      routine: true,
    });
    await page.goto('/my?view=flows&flow=curated-allblanc-morning-workout');
    const workspace = await openMyFlowLibraryFlow(page, 'curated-allblanc-morning-workout');

    await expect(workspace.getByTestId('my-flow-routine-series-summary')).toContainText('반복 계획');
    await expect(workspace.getByTestId('my-flow-routine-current-occurrence')).toBeVisible();
    await expect(workspace.locator('[role="img"][aria-label^="전체 진행"]')).toHaveCount(0);
    await expect(workspace).not.toContainText('RRULE');
    await capture(page, 'p35-r10-routine-series-occurrence-390.png', workspace);
  });

  test('export has one visible scope-count owner and keeps destination counts predictive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSavedFlow(page, {
      slug: 'moving-d30-basic',
      selectedArtifactMode: 'calendar',
      anchor: '2030-09-01',
    });
    await page.goto('/my?view=flows&flow=moving-d30-basic');
    const workspace = await openMyFlowLibraryFlow(page, 'moving-d30-basic');
    const transferEntry = workspace.getByTestId('my-flow-export-entry');
    await expect(transferEntry).toHaveAttribute('data-action-role', 'transfer-to-own-tool');
    await transferEntry.click();
    const panel = workspace.getByTestId('my-flow-export-panel');
    const summary = panel.getByTestId('my-flow-export-preflight');
    const capability = panel.getByTestId('my-flow-capability-result');

    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'saved_detail');
    await expect(capability).toHaveAttribute('data-capability-snapshot-kind', 'effective_execution');
    await expect(capability).toHaveAttribute('data-capability-primary-action', 'execute-saved-result');
    await expect(capability).toHaveAttribute(
      'data-capability-secondary-actions',
      'edit-saved-plan,transfer-to-own-tool',
    );
    await expect(capability.locator('[data-action-role="create-quick-local-result"]')).toHaveCount(0);

    await expect(summary).toHaveAttribute(
      'data-p35-r10-marker',
      'P35-R10-EXPORT-SUMMARY-ONE-OWNER',
    );
    await expect(panel.getByTestId('my-flow-export-scope-summary')).toHaveText('계획 전체 · 24개');
    await expect(panel.getByTestId('my-flow-export-scope-flow').locator('.sr-only')).toHaveCount(1);
    await expect(panel.getByTestId('my-flow-export-scope-selected').locator('.sr-only')).toHaveCount(1);
    const primary = panel.locator('[data-action-priority="primary"][data-recommendation-visible="true"]');
    await expect(primary).toHaveCount(1);
    expect(Number(await primary.getAttribute('data-export-count'))).toBeGreaterThan(0);
    await capture(page, 'p35-r10-export-one-summary-owner-390.png', panel);
  });

  test('shared date group owns its date instead of repeating it on every row', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedSavedFlow(page, {
      slug: 'vehicle-inspection-prep',
      selectedArtifactMode: 'calendar',
      anchor: '2030-09-01',
    });
    await page.goto('/my?view=flows&flow=vehicle-inspection-prep');
    const workspace = await openMyFlowLibraryFlow(page, 'vehicle-inspection-prep');
    const dateGroup = workspace.getByTestId('my-flow-whole-flow-date-group').first();
    await expect(dateGroup).toBeVisible();
    await expect(dateGroup.getByTestId('my-flow-row-date-meta')).toHaveCount(0);
    await capture(page, 'p35-r10-group-date-owner-1024.png', workspace);
  });

  test('large library filters only by lifecycle state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');
    const filter = page.getByRole('group', { name: '저장한 계획 상태 필터' });
    await expect(filter).toHaveAttribute(
      'data-p35-r10-marker',
      'P35-R10-LIBRARY-FILTER-ONE-AXIS',
    );
    await expect(filter.getByRole('button')).toHaveCount(4);
    await expect(filter.getByRole('button', { name: '루틴' })).toHaveCount(0);
    await expect(filter.getByRole('button', { name: '전체' })).toBeVisible();
    await expect(filter.getByRole('button', { name: '진행 중' })).toBeVisible();
    await expect(filter.getByRole('button', { name: '마친 계획' })).toBeVisible();
    await expect(filter.getByRole('button', { name: '보관됨' })).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/source-backed|RRULE|\bStep\b|\bItem\b|내 버전/u);
    await capture(page, 'p35-r10-library-lifecycle-filter-390.png', filter);
  });
});
