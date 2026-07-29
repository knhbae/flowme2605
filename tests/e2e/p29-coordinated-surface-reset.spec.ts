import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import {
  getOpenMyFlowItemDetail,
  openMyFlowCalendarSelectedDay,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P29_EVIDENCE_DIR;

async function clearLocalState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function inspectVisibleInteractionContract(page: Page) {
  return page.evaluate(() => {
    const selector = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const visible = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
        && !element.hasAttribute('disabled')
        && element.getAttribute('aria-hidden') !== 'true';
    });
    const unnamed = visible.filter((element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledByText = labelledBy
        ? labelledBy.split(/\s+/u).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
        : '';
      const explicitLabel = element.id
        ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`)?.textContent ?? ''
        : '';
      const wrappedLabel = element.closest('label')?.textContent ?? '';
      return !(
        element.getAttribute('aria-label')
        || labelledByText
        || explicitLabel
        || wrappedLabel
        || element.getAttribute('title')
        || element.textContent
        || (element instanceof HTMLInputElement ? element.value : '')
      ).trim();
    });
    const fixedElements = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.position === 'fixed' && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const primaryActions = Array.from(document.querySelectorAll<HTMLElement>('[data-action-priority="primary"]')).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const overlaps = fixedElements.flatMap((fixed) => primaryActions.filter((primary) => {
      if (fixed === primary || fixed.contains(primary) || primary.contains(fixed)) return false;
      const fixedRect = fixed.getBoundingClientRect();
      const primaryRect = primary.getBoundingClientRect();
      return fixedRect.left < primaryRect.right
        && fixedRect.right > primaryRect.left
        && fixedRect.top < primaryRect.bottom
        && fixedRect.bottom > primaryRect.top;
    }));
    return {
      visibleCount: visible.length,
      unnamedCount: unnamed.length,
      unnamedSamples: unnamed.slice(0, 5).map((element) => ({
        tag: element.tagName,
        testId: element.dataset.testid ?? '',
      })),
      fixedPrimaryOverlapCount: overlaps.length,
    };
  });
}

async function seedP29CalendarFlows(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('flowme:p29-calendar-seeded') === 'true') return;
    localStorage.clear();
    const savedAt = '2026-07-22T00:00:00.000Z';
    [
      { slug: 'moving-d30-basic', anchor: '2026-08-28' },
      { slug: 'vehicle-inspection-prep', anchor: undefined },
    ].forEach(({ slug, anchor }) => {
      localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
        slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        ...(anchor ? { anchor } : {}),
      }));
      if (anchor) {
        localStorage.setItem(`flow:${slug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor }));
      }
    });
    sessionStorage.setItem('flowme:p29-calendar-seeded', 'true');
  });
}

test.describe('P29-01 moving artifact-first save and receipt', () => {
  test('mobile reads result before adjustment and save, then replaces inputs with a receipt', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);

    const hero = page.getByTestId('public-flow-hero');
    await expect(hero).toHaveAttribute('data-p29-marker', 'P29-SAVE-BEFORE-PRIMARY-RESULT');
    await expect(hero).toHaveAttribute('data-experience-architecture', 'p35-result-first');
    await expect(hero.getByTestId('public-flow-artifact-preview')).toHaveAttribute('data-primary-shape', 'calendar');
    await expect(hero.getByTestId('public-flow-artifact-preview')).toContainText('캘린더 · 24개');
    await expect(hero.getByRole('button', { name: /제목·날짜·메모 수정/ })).toHaveCount(0);
    await expect(hero.getByTestId('public-flow-artifact-preview')).not.toHaveAttribute('open', '');

    const focusOrder = await page.evaluate(() => {
      const selectors = [
        '[data-testid="public-flow-hero"] h1',
        '[data-testid="public-flow-hero"] a[target="_blank"]',
        '[data-testid="flow-save-before-primary-result"]',
        '[data-testid="public-flow-artifact-preview-expand"]',
        '[data-testid="public-flow-adjust-entry-mobile"]',
        '[data-testid="public-flow-save-primary-mobile"]',
      ];
      const elements = selectors.map((selector) => document.querySelector(selector));
      return elements.every(Boolean) && elements.every((element, index) => {
        if (index === 0) return true;
        return Boolean(elements[index - 1]?.compareDocumentPosition(element as Node) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
    });
    expect(focusOrder).toBe(true);
    await capture(page, 'p29-01-moving-save-before-390.png');

    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toBeFocused();
    await expect(adjustment).toHaveAttribute('data-adjustment-kind', 'name');
    await capture(page, 'p29-01-moving-adjust-390.png');

    await adjustment.getByTestId('public-flow-adjustment-name-input').fill('우리 집 이사 준비');
    await adjustment.getByTestId('public-flow-adjustment-apply').click();
    await page.getByTestId('public-flow-save-primary-mobile').click();

    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toHaveAttribute('data-p29-marker', 'P29-SAVED-RECEIPT-DISTINCT');
    await expect(receipt.getByRole('heading', { name: '우리 집 이사 준비' })).toBeVisible();
    await expect(receipt.getByTestId('public-flow-saved-receipt-primary')).toHaveAccessibleName('저장한 전체 Flow 보기');
    await expect(receipt.locator('[data-action-priority="primary"]')).toHaveCount(1);
    await expect(page.getByTestId('public-flow-hero')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-anchor-input')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-mobile-save-cta')).toHaveCount(0);
    await capture(page, 'p29-01-moving-receipt-390.png');
    await expectNoHorizontalOverflow(page);
  });

  test('wide uses a result canvas and context inspector without repeated row edits', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);

    const result = page.getByTestId('flow-save-before-primary-result');
    const inspector = page.getByTestId('flow-save-before-decision');
    await expect(result.getByTestId('public-flow-artifact-preview')).toBeVisible();
    await expect(inspector.getByTestId('public-flow-primary-setup')).toBeVisible();
    const positions = await Promise.all([result.boundingBox(), inspector.boundingBox()]);
    expect(positions[0]?.x).toBeLessThan(positions[1]?.x ?? 0);
    expect(Math.abs((positions[0]?.y ?? 0) - (positions[1]?.y ?? 0))).toBeLessThanOrEqual(2);
    await expect(page.getByTestId('public-flow-artifact-preview')).not.toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: /제목·날짜·메모 수정/ })).toHaveCount(0);
    await capture(page, 'p29-01-moving-save-before-1024.png');

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary').click();
    await expect(page.getByTestId('public-flow-saved-receipt')).toBeVisible();
    await capture(page, 'p29-01-moving-receipt-1024.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, 'p29-01-moving-receipt-1440.png');
    await clearLocalState(page);
    await expect(page.getByTestId('public-flow-hero')).toBeVisible();
    await capture(page, 'p29-01-moving-save-before-1440.png');
    await expectNoHorizontalOverflow(page);
  });

  test('public source-backed flows use the shared artifact-first frame after rollout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/vehicle-inspection-prep');
    await clearLocalState(page);
    await expect(page.getByTestId('public-flow-hero')).toHaveAttribute('data-experience-architecture', 'p35-result-first');
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-detail-workspace').locator('[data-presentation-mode="export-only"]')).toHaveCount(1);
    await expect(page.getByTestId('public-flow-detail-workspace').getByLabel('Flow artifact workbench')).toHaveCount(0);
  });

  test('routine keeps advanced inputs behind one summary and previews the next three occurrences', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2026-07-27');

    const summary = page.getByTestId('public-routine-schedule-summary');
    await expect(summary).toHaveAttribute('data-p29-marker', 'P29-ROUTINE-SUMMARY-FIRST');
    await expect(summary.getByTestId('public-routine-schedule-summary-value')).toContainText('월·수·금');
    await expect(summary.getByTestId('public-routine-schedule-editor')).toHaveCount(0);
    await expect(summary.getByTestId('public-routine-schedule-summary-next-occurrences').getByRole('listitem')).toHaveCount(3);
    await capture(page, 'p29-03-routine-summary-390.png');

    await summary.getByTestId('public-routine-schedule-summary-toggle').click();
    const editor = summary.getByTestId('public-routine-schedule-editor');
    await editor.getByTestId('public-routine-schedule-editor-time-mode').selectOption('timed');
    await editor.getByTestId('public-routine-schedule-editor-time').fill('07:30');
    await editor.getByTestId('public-routine-schedule-editor-duration').selectOption('45');
    await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
    await editor.getByTestId('public-routine-schedule-editor-occurrence-count').fill('8');
    await expect(summary.getByTestId('public-routine-schedule-summary-value')).toHaveText('월·수·금 · 07:30 · 45분 · 8회');
    await capture(page, 'p29-03-routine-adjust-390.png');
    await expectNoHorizontalOverflow(page);

    await summary.getByTestId('public-routine-schedule-summary-toggle').click();
    await page.setViewportSize({ width: 1024, height: 768 });
    await capture(page, 'p29-03-routine-summary-1024.png');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('P29-04 My Flow action-first library', () => {
  test('mobile keeps one open command per compact Flow row and drills into one plan', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');

    const rows = page.getByTestId('my-flow-mobile-structure-row');
    await expect(rows).toHaveCount(8);
    await expect(rows.first()).toHaveAttribute('data-p29-marker', 'P29-MY-FLOW-COMPACT-LIBRARY');
    expect(await rows.getByRole('button').count()).toBe(8);
    const heights = await rows.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(Math.max(...heights)).toBeLessThanOrEqual(72);
    await capture(page, 'p29-04-my-flow-library-390.png');

    const firstOpen = rows.first().getByTestId('my-flow-mobile-structure-open');
    await firstOpen.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('my-flow-mobile-library-back')).toBeVisible();
    await expect(page.getByTestId('my-flow-mobile-workspace')).toHaveAttribute(
      'data-p31-marker',
      'P31-03-DEDICATED-MOBILE-WORKSPACE',
    );
    await capture(page, 'p29-04-my-flow-detail-390.png');
    await expectNoHorizontalOverflow(page);
  });

  test('wide exposes a 280px library beside one explicitly selected Flow workspace', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20&view=flows');

    const workspace = page.getByTestId('my-flow-library-workspace');
    await expect(workspace).toHaveAttribute('data-library-layout', 'rail-canvas-inspector');
    await expect(workspace).toHaveAttribute('data-p29-marker', 'P29-MY-FLOW-THREE-PANE');
    expect(await workspace.getByTestId('my-flow-library-row').count()).toBeGreaterThanOrEqual(20);
    const railWidth = await workspace.getByTestId('my-flow-library-rail').evaluate((element) => element.getBoundingClientRect().width);
    expect(railWidth).toBeGreaterThanOrEqual(278);
    expect(railWidth).toBeLessThanOrEqual(282);
    const detail = workspace.getByTestId('my-flow-library-detail');
    await expect(detail.getByTestId('my-flow-overview-card')).toHaveCount(0);
    await workspace.getByTestId('my-flow-library-row').first().click();
    await expect(detail.getByTestId('my-flow-overview-card')).toHaveAttribute(
      'data-p35-marker',
      'P35-PERSONAL-SINGLE-FOCUS',
    );
    await expect(detail.getByTestId('my-flow-whole-flow-outline')).toBeVisible();
    await capture(page, 'p29-04-my-flow-workspace-1024.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, 'p29-04-my-flow-workspace-1440.png');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('P29-05 Calendar scope and placement workspace', () => {
  test('mobile Calendar delegates undated placement to the focused Flow workspace', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedP29CalendarFlows(page);
    await page.goto('/calendar');

    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
    await capture(page, 'p29-05-calendar-lens-390.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    const workspace = page.getByTestId('my-flow-calendar-workspace');
    await expect(workspace).toHaveAttribute(
      'data-p35-calendar-marker',
      'P35-CALENDAR-LENS-ONE-TOGGLE',
    );
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toHaveCount(0);
    await capture(page, 'p29-05-calendar-lens-1024.png');
    await expectNoHorizontalOverflow(page);
  });

  test('large Flow scope stays compact and wide Calendar uses rail, canvas, inspector', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calendar?demo=ux20');

    const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    await expect(trigger).toHaveAttribute('data-p29-marker', 'P29-CALENDAR-COMPACT-SCOPE');
    await capture(page, 'p29-05-calendar-compact-scope-390.png');
    await trigger.click();
    const picker = page.getByTestId('calendar-flow-scope-picker');
    const options = picker.getByTestId('calendar-flow-scope-picker-option');
    expect(await options.count()).toBeGreaterThanOrEqual(12);
    await options.nth(0).getByRole('checkbox').check();
    await options.nth(1).getByRole('checkbox').check();
    await expect(picker.locator('[data-scope-group="selected"]')).toBeVisible();
    await capture(page, 'p29-05-calendar-scope-picker-390.png');
    await picker.getByTestId('calendar-flow-scope-picker-apply').click();
    await expect(trigger).toContainText('2개 Flow');
    await expectNoHorizontalOverflow(page);

    await trigger.click();
    await page.getByTestId('calendar-flow-scope-picker-all').click();
    await page.getByTestId('calendar-flow-scope-picker-apply').click();

    await page.setViewportSize({ width: 1024, height: 768 });
    const workspace = page.getByTestId('my-flow-calendar-workspace');
    await expect(workspace).toHaveAttribute('data-p29-marker', 'P29-CALENDAR-IDENTITY-COMPLETION');
    const widths = await workspace.locator(':scope > *').evaluateAll((elements) => (
      elements.map((element) => Math.round(element.getBoundingClientRect().width))
    ));
    expect(widths).toHaveLength(2);
    expect(widths[0]).toBeGreaterThan(500);
    expect(widths.at(-1)).toBe(320);
    await capture(page, 'p29-05-calendar-workspace-1024.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, 'p29-05-calendar-workspace-1440.png');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('P29-06 artifact recommendation and export scope', () => {
  test('public whole Flow recommends at most three ready results and keeps identity in receipt', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');

    const preview = page.getByTestId('public-flow-artifact-preview');
    await expect(preview).toHaveAttribute('data-p29-marker', 'P29-ARTIFACT-RECOMMENDATION');
    await expect(preview).toHaveAttribute('data-selected-shape', 'calendar');
    await expect(preview.getByTestId('flow-artifact-shape-choice')).toHaveCount(0);
    await expect(preview.getByTestId('flow-artifact-recommendation-reason')).toHaveCount(0);

    const workspace = page.getByTestId('public-flow-detail-workspace');
    await workspace.locator('summary').first().click();
    const exportEntry = workspace.getByTestId('public-flow-export-secondary-entry');
    await exportEntry.getByTestId('public-flow-export-secondary-toggle').click();
    const panel = exportEntry.getByTestId('my-flow-export-panel');
    await expect(panel.getByTestId('my-flow-export-recommendations')).toHaveAttribute(
      'data-p29-marker',
      'P29-ARTIFACT-EXPORT-PREFLIGHT',
    );
    const visibleRecommendations = panel.locator('[data-recommendation-visible="true"]');
    expect(await visibleRecommendations.count()).toBeLessThanOrEqual(3);
    await expect(panel.locator('[data-recommendation-visible="true"][data-export-state="disabled"]')).toHaveCount(0);
    const primary = panel.locator('[data-recommendation-role="primary"][data-recommendation-visible="true"]');
    await expect(primary).toHaveCount(1);
    await expect(primary).toContainText('Flow 전체');
    const predictedCount = Number(await primary.getAttribute('data-export-count'));
    expect(predictedCount).toBeGreaterThan(0);
    await capture(page, 'p29-06-export-preflight-390.png');

    const downloadPromise = page.waitForEvent('download');
    await primary.click();
    await downloadPromise;
    const receipt = panel.getByTestId('flow-export-result-receipt');
    await expect(receipt).toHaveAttribute('data-p29-marker', 'P29-EXPORT-RECEIPT-IDENTITY');
    await expect(receipt).toHaveAttribute('data-export-output-count', String(predictedCount));
    await expect(receipt.getByTestId('flow-export-result-identity')).toContainText('이사');
    await expect(receipt.getByTestId('flow-export-result-identity')).toContainText('출처');
    await capture(page, 'p29-06-export-receipt-390.png');
    await expectNoHorizontalOverflow(page);
  });

  test('selected and current item exports name their scope before the format', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=source-backed&view=flows');
    let flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'record');

    const exportSurface = flow.getByTestId('my-flow-export-surface');
    await exportSurface.getByTestId('my-flow-export-entry').click();
    const panel = exportSurface.getByTestId('my-flow-export-panel');
    await panel.getByTestId('my-flow-export-scope-selected').click();
    const choices = panel.getByTestId('my-flow-export-selectable-item');
    await choices.nth(0).getByRole('checkbox').check();
    await choices.nth(1).getByRole('checkbox').check();
    const selectedMemo = panel.getByTestId('my-flow-export-memo');
    await expect(selectedMemo).toContainText('선택한 2개');
    await selectedMemo.click();
    await expect(panel.getByTestId('flow-export-result-receipt')).toContainText('선택 항목');
    await expect(panel.getByTestId('flow-export-result-identity')).toContainText('이사');

    flow = await openMyFlowLibraryFlow(page, 'source-backed-moving-d30', 'plan');
    const firstRow = flow.getByTestId('my-flow-execution-row-shell').first();
    await firstRow.getByRole('button', { name: /열기/ }).click();
    const itemExport = getOpenMyFlowItemDetail(page).getByTestId('my-flow-detail-portable-export');
    if ((await itemExport.getAttribute('open')) === null) {
      await itemExport.locator(':scope > summary').click();
    }
    await expect(itemExport.getByTestId('my-flow-detail-copy-portable-text')).toContainText('현재 항목');
    await itemExport.getByTestId('my-flow-detail-copy-portable-text').click();
    await expect(itemExport.getByTestId('flow-export-result-receipt')).toContainText('현재 항목');
    await expect(itemExport.getByTestId('flow-export-result-identity')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('P29-07 shared visual and accessibility contract', () => {
  test('reviewed surfaces keep named controls, stable focus, and zero fixed overlap at 390/1024/1440', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(`console:${message.text()}`);
    });
    page.on('pageerror', (error) => browserErrors.push(`page:${error.message}`));

    const routes = [
      '/f/moving-d30-basic',
      '/f/curated-allblanc-morning-workout',
      '/my?demo=ux20&view=flows',
      '/calendar?demo=ux20',
    ];
    const viewports = [
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        await expectNoHorizontalOverflow(page);
        const audit = await inspectVisibleInteractionContract(page);
        expect(audit.visibleCount).toBeGreaterThan(0);
        expect(audit.unnamedCount, JSON.stringify(audit.unnamedSamples)).toBe(0);
        expect(audit.fixedPrimaryOverlapCount).toBe(0);
      }
    }
    expect(browserErrors).toEqual([]);
  });

  test('public, My Flow, Calendar, and receipts expose one consistent Flow identity anatomy', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);
    const hero = page.getByTestId('public-flow-hero');
    await expect(hero).toHaveAttribute('data-flow-anatomy', 'save-before');
    await expect(hero.locator('[data-flow-anatomy="flow-identity"]')).toHaveAttribute(
      'data-p29-marker',
      'P29-CONSISTENT-FLOW-IDENTITY',
    );
    await expect(hero.locator('[data-flow-identity-slot="title"]')).toHaveCount(1);
    await expect(hero.locator('[data-flow-identity-slot="source"]')).toHaveCount(1);
    await expect(hero.locator('[data-flow-anatomy="artifact-result"]')).toHaveCount(1);

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const receipt = page.getByTestId('public-flow-saved-receipt');
    await expect(receipt).toHaveAttribute('data-flow-anatomy', 'saved-receipt');
    await expect(receipt.locator('[data-flow-anatomy="flow-identity"]')).toHaveCount(1);

    await page.goto('/my?demo=ux20&view=flows');
    const libraryRow = page.getByTestId('my-flow-mobile-structure-row').first();
    await expect(libraryRow).toHaveAttribute('data-flow-anatomy', 'flow-library-row');
    await expect(libraryRow.locator('[data-flow-identity-slot="title"]')).toHaveCount(1);
    await expect(libraryRow.locator('[data-flow-identity-slot="next-action"]')).toHaveCount(1);
    await libraryRow.getByTestId('my-flow-mobile-structure-open').click();
    await expect(page.getByTestId('my-flow-mobile-workspace')).toHaveAttribute(
      'data-flow-anatomy',
      'flow-detail',
    );

    await page.goto('/calendar?demo=ux20');
    await expect(page.getByTestId('my-flow-calendar-workspace')).toHaveAttribute('data-flow-anatomy', 'calendar-workspace');
    const selectedDay = await openMyFlowCalendarSelectedDay(page);
    await expect(selectedDay).toHaveAttribute('data-flow-anatomy', 'selected-day');
  });

  test('mobile public controls keep 44px targets and keyboard focus remains visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);
    const hero = page.getByTestId('public-flow-hero');
    const controls = hero.locator('button:visible, summary:visible');
    const heights = await controls.evaluateAll((elements) => elements.map((element) => (
      Math.round(element.getBoundingClientRect().height)
    )));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

    await page.locator('body').press('Tab');
    const focusStyle = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return { named: false, visible: false };
      const style = window.getComputedStyle(active);
      const name = active.getAttribute('aria-label') || active.textContent || active.getAttribute('title') || '';
      return {
        named: Boolean(name.trim()),
        visible: style.outlineStyle !== 'none' || style.boxShadow !== 'none',
      };
    });
    expect(focusStyle.named).toBe(true);
    expect(focusStyle.visible).toBe(true);

    await page.goto('/my?demo=ux20&view=flows');
    const mainBeforeTabs = await page.evaluate(() => {
      const main = document.querySelector('main');
      const tabs = document.querySelector('[data-testid="platform-mobile-tabs"]');
      return Boolean(main && tabs && (main.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(mainBeforeTabs).toBe(true);
  });
});
