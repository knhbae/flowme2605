import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
  withLegacySavedPlanLibraryRoute,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P30_EVIDENCE_DIR;

test.beforeEach(async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
});

type Rect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

async function getRect(locator: Locator): Promise<Rect> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  });
}

function intersectionArea(left: Rect, right: Rect) {
  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return width * height;
}

async function capture(page: Page, filename: string, evidence?: unknown) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: false });
  if (evidence !== undefined) {
    fs.writeFileSync(
      path.join(evidenceRoot, filename.replace(/\.png$/u, '.json')),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8',
    );
  }
}

async function clearLocalState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function seedP30CalendarFlows(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('flowme:p30-calendar-seeded') === 'true') return;
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
    sessionStorage.setItem('flowme:p30-calendar-seeded', 'true');
  });
}

type FocusStep = {
  testId: string | null;
  tagName: string;
  href: string | null;
  accessibleName: string | null;
};

async function traceMobileFocusOrder(page: Page, maxSteps = 300): Promise<FocusStep[]> {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });

  const trace: FocusStep[] = [];
  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate<FocusStep>(() => {
      const active = document.activeElement as HTMLElement | null;
      const owner = active?.closest<HTMLElement>('[data-testid]');
      return {
        testId: owner?.dataset.testid ?? null,
        tagName: active?.tagName.toLowerCase() ?? '',
        href: active instanceof HTMLAnchorElement ? active.getAttribute('href') : null,
        accessibleName: active?.getAttribute('aria-label') ?? active?.textContent?.trim() ?? null,
      };
    });
    trace.push(step);
    if (step.testId === 'platform-mobile-tabs') break;
  }
  return trace;
}

function expectWorkspaceBeforePersistentTabs(trace: FocusStep[], workspaceTestId: string) {
  const headerIndex = trace.findIndex((step) => step.testId === 'platform-nav');
  const workspaceIndex = trace.findIndex((step) => step.testId === workspaceTestId);
  const persistentTabsIndex = trace.findIndex((step) => step.testId === 'platform-mobile-tabs');

  expect(headerIndex).toBeGreaterThanOrEqual(0);
  expect(workspaceIndex).toBeGreaterThan(headerIndex);
  expect(persistentTabsIndex).toBeGreaterThan(workspaceIndex);
}

test.describe('P30-01 mobile export fixed-layer correctness', () => {
  test('public quick-result confirmation occludes the fixed save command and keeps its primary action operable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await clearLocalState(page);

    await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
    await expect(page.locator('main[data-p35-q1-quick-eligible="true"]')).toBeVisible();
    const quickEntry = page.getByTestId('public-flow-quick-result-entry');
    await expect(quickEntry).toBeVisible();
    await quickEntry.click();

    const confirmation = page.getByTestId('public-flow-quick-result-confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toHaveAttribute('aria-modal', 'true');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    const fixedSaveCta = page.getByTestId('public-flow-mobile-save-cta');
    await expect(fixedSaveCta).toHaveCount(1);

    const primary = confirmation.getByTestId('public-flow-quick-result-execute');
    await expect(primary).toHaveCount(1);
    const primaryRect = await getRect(primary);
    const fixedSaveCtaRect = await getRect(fixedSaveCta);
    expect(primaryRect.top).toBeGreaterThanOrEqual(0);
    expect(primaryRect.bottom).toBeLessThanOrEqual(844);
    const layerContract = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>(
        '[data-testid="public-flow-quick-result-confirmation"]',
      );
      const layer = dialog?.parentElement;
      const fixed = document.querySelector<HTMLElement>(
        '[data-testid="public-flow-mobile-save-cta"]',
      );
      const primaryAction = document.querySelector<HTMLElement>(
        '[data-testid="public-flow-quick-result-execute"]',
      );
      const hitTest = (element: HTMLElement | null) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + (rect.width / 2),
          rect.top + (rect.height / 2),
        );
        return Boolean(hit && element.contains(hit));
      };
      return {
        dialogLayer: Number(getComputedStyle(layer!).zIndex),
        fixedLayer: Number(getComputedStyle(fixed!).zIndex),
        primaryReceivesPointer: hitTest(primaryAction),
        fixedReceivesPointer: hitTest(fixed),
      };
    });
    expect(layerContract.dialogLayer).toBeGreaterThan(layerContract.fixedLayer);
    expect(layerContract.primaryReceivesPointer).toBe(true);
    expect(layerContract.fixedReceivesPointer).toBe(false);
    for (let index = 0; index < 5; index += 1) {
      await page.keyboard.press('Tab');
      expect(await confirmation.evaluate((element) => element.contains(document.activeElement)))
        .toBe(true);
    }
    await capture(page, 'p30-01-public-export-open-390.png', {
      route: '/f/moving-d30-basic',
      viewport: { width: 390, height: 844 },
      primaryRect,
      fixedSaveCtaRect,
      fixedSaveCtaCount: 1,
      ...layerContract,
      geometricIntersectionArea: intersectionArea(primaryRect, fixedSaveCtaRect),
    });
    await page.keyboard.press('Escape');
    await expect(confirmation).toHaveCount(0);
    await expect(quickEntry).toBeFocused();
  });

  test('My Flow export scrolls its primary action above the persistent tabs and restores entry focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux20&view=flows');
    const firstRow = page.getByTestId('my-flow-mobile-structure-row').first();
    await expect(firstRow).toBeVisible();
    const flowSlug = await firstRow.getAttribute('data-flow-slug');
    expect(flowSlug).toBeTruthy();
    await firstRow.getByTestId('my-flow-mobile-structure-open').click();
    const flow = await openMyFlowLibraryFlow(page, flowSlug!, 'record');
    await expect(flow).toBeVisible();
    const exportSurface = flow.getByTestId('my-flow-export-surface');
    const exportEntry = exportSurface.getByTestId('my-flow-export-entry');
    await exportEntry.click();

    const panel = exportSurface.getByTestId('my-flow-export-panel');
    await expect(panel).toBeVisible();
    await expect(exportSurface).toHaveAttribute('data-p30-marker', 'P30-MOBILE-EXPORT-NO-FIXED-OVERLAP');

    const primary = panel.locator('[data-action-priority="primary"][data-recommendation-visible="true"]');
    const tabs = page.getByTestId('platform-mobile-tabs');
    await expect(primary).toHaveCount(1);
    const primaryRect = await getRect(primary);
    const tabsRect = await getRect(tabs);
    expect(intersectionArea(primaryRect, tabsRect)).toBe(0);
    expect(primaryRect.bottom).toBeLessThanOrEqual(tabsRect.top);
    await capture(page, 'p30-01-my-flow-export-open-390.png', {
      route: '/my?demo=ux20&view=flows',
      viewport: { width: 390, height: 844 },
      primaryRect,
      tabsRect,
      intersectionArea: intersectionArea(primaryRect, tabsRect),
    });

    await panel.getByRole('button', { name: /옮기기 닫기/ }).click();
    await expect(exportEntry).toBeFocused();
  });
});

test.describe('P30-02 mobile workspace focus order', () => {
  test('My Flow reaches workspace controls before persistent navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux20&view=flows');
    await expect(page.getByTestId('my-flow-mobile-structure-open').first()).toBeVisible();

    const trace = await traceMobileFocusOrder(page);
    expectWorkspaceBeforePersistentTabs(trace, 'my-flow-mobile-structure-open');
    await expect(page.getByTestId('platform-mobile-tabs')).toHaveAttribute(
      'data-p30-marker',
      'P30-MOBILE-WORKSPACE-FOCUS-ORDER',
    );
    await capture(page, 'p30-02-my-flow-focus-order-390.png', {
      route: '/my?demo=ux20&view=flows',
      viewport: { width: 390, height: 844 },
      focusTrace: trace,
    });
  });

  test('Calendar reaches scope controls before persistent navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux20');
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toBeVisible();

    const trace = await traceMobileFocusOrder(page);
    expectWorkspaceBeforePersistentTabs(trace, 'calendar-flow-scope-picker-trigger');
    await capture(page, 'p30-02-calendar-focus-order-390.png', {
      route: '/calendar?demo=ux20',
      viewport: { width: 390, height: 844 },
      focusTrace: trace,
    });
  });
});

test.describe('P30-03 save-before decision and contextual adjustment', () => {
  test('long Flow keeps the full selection list inside one atomic full-height editor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');

    const saveBefore = page.getByTestId('public-flow-hero');
    await expect(saveBefore).toHaveAttribute('data-p30-marker', 'P30-SAVE-BEFORE-SINGLE-DECISION');
    await expect(saveBefore.locator('[data-flow-outline-row="true"] button')).toHaveCount(0);
    await expect(page.locator('[data-action-priority="primary"]:visible')).toHaveCount(1);

    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toHaveAttribute('data-p35-marker', 'P35-ATOMIC-FULL-HEIGHT-EDITOR');
    await expect(adjustment).toHaveAttribute('data-editor-transaction', 'atomic');
    await expect(adjustment).toHaveAttribute('role', 'dialog');
    await expect(adjustment).toHaveAttribute('aria-modal', 'true');
    await expect(adjustment).toHaveAttribute('data-adjustment-kind', 'name');
    await expect(adjustment.getByTestId('public-flow-adjustment-kind-name')).toBeFocused();
    await expect(adjustment.getByTestId('public-flow-adjustment-item-list')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-title"]')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-date"]')).toHaveCount(0);

    await adjustment.getByTestId('public-flow-adjustment-kind-items').click();
    await expect(adjustment.getByTestId('public-flow-adjustment-item-list')).toBeVisible();
    await expect(adjustment.getByTestId('public-flow-adjustment-item-row')).toHaveCount(24);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-03-moving-item-selection-390.png', {
      route: '/f/moving-d30-basic',
      viewport: { width: 390, height: 844 },
      visibleItemRows: 24,
      horizontalOverflow: overflow,
    });
  });
});

test.describe('P30-04 My Flow command hierarchy', () => {
  test('detail keeps one next action and moves source/archive into a focus-returning menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux20&view=flows');

    const row = page.getByTestId('my-flow-mobile-structure-row').nth(2);
    const flowSlug = await row.getAttribute('data-flow-slug');
    expect(flowSlug).toBeTruthy();
    await row.getByTestId('my-flow-mobile-structure-open').click();

    const card = await openMyFlowLibraryFlow(page, flowSlug!, 'execute');
    await expect(card).toHaveAttribute(
      'data-p31-marker',
      'P31-03-DEDICATED-MOBILE-WORKSPACE',
    );
    await expect(
      card
        .getByTestId('my-flow-workspace-execute')
        .getByTestId('my-flow-execution-row-shell'),
    ).toHaveCount(0);
    const executeWorkspace = card.getByTestId('my-flow-workspace-execute');
    await expect(executeWorkspace.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    await expect(card.getByTestId('my-flow-workspace-plan')).toBeVisible();
    await expect(executeWorkspace.getByRole('button', { name: '전체 계획 보기' })).toHaveCount(0);

    const menu = card.getByTestId('my-flow-workspace-management-menu');
    const trigger = menu.locator('summary');
    await expect(menu.getByRole('menuitem', { name: /원문 보기/ })).toBeHidden();
    await expect(card.getByTestId('my-flow-archive-toggle')).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.getByRole('menuitem', { name: /원문 보기/ })).toBeVisible();
    await expect(card.getByTestId('my-flow-archive-toggle')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(trigger).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-04-my-flow-command-hierarchy-390.png', {
      route: '/my?demo=ux20&view=flows',
      viewport: { width: 390, height: 844 },
      visiblePrimaryCount: 1,
      visibleSecondaryCount: 1,
      overflowMenuFocusReturned: true,
      horizontalOverflow: overflow,
    });
  });
});

test.describe('P30-05 Calendar evidence, scale, and compact identity', () => {
  test('Calendar delegates undated placement while preserving one compact execution lens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedP30CalendarFlows(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar');

    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-workspace')).toHaveAttribute(
      'data-p35-calendar-marker',
      'P35-CALENDAR-LENS-ONE-TOGGLE',
    );
    await capture(page, 'p30-05-calendar-undated-delegation-390.png', {
      route: '/calendar',
      viewport: { width: 390, height: 844 },
      undatedPlacementSurfaceCount: 0,
      dateMoveCommandCount: 0,
      owner: 'my_flow',
    });
  });

  test('50+ Flow scope collapses inactive options and exposes search matches within five actions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux50');

    const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    await expect(trigger).toHaveAttribute('data-p30-marker', 'P30-CALENDAR-SCOPE-SCALE');
    await trigger.click();
    const picker = page.getByTestId('calendar-flow-scope-picker');
    const options = picker.getByTestId('calendar-flow-scope-picker-option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThanOrEqual(50);

    const other = picker.getByTestId('calendar-flow-scope-picker-other-disclosure');
    await expect(other).toBeVisible();
    await expect(other).not.toHaveAttribute('open', '');
    const activeOption = picker.locator('[data-scope-group="active"] [data-testid="calendar-flow-scope-picker-option"]').first();
    const activeSlug = await activeOption.getAttribute('data-flow-slug');
    expect(activeSlug).toBeTruthy();
    const otherOption = other.locator('[data-testid="calendar-flow-scope-picker-option"]').first();
    const otherSlug = await otherOption.getAttribute('data-flow-slug');
    expect(otherSlug).toBeTruthy();
    const otherTitle = await other.locator('[data-testid="calendar-flow-scope-picker-option"] span.block.truncate').first().textContent();
    expect(otherTitle?.trim()).toBeTruthy();
    await picker.locator(`[data-flow-slug="${activeSlug}"] input[type="checkbox"]`).check();
    await picker.getByTestId('calendar-flow-scope-picker-search').fill(otherTitle!.trim());
    await picker.locator(`[data-flow-slug="${otherSlug}"] input[type="checkbox"]`).check();
    await picker.getByTestId('calendar-flow-scope-picker-apply').click();
    await expect(trigger).toContainText('계획 2개');
    await expect(trigger).toBeFocused();
    await capture(page, 'p30-05-calendar-scope-50-390.png', {
      route: '/calendar?demo=ux50',
      viewport: { width: 390, height: 844 },
      optionCount,
      meaningfulInteractionCount: 5,
      selectedCount: 2,
      inactiveGroupCollapsedInitially: true,
      focusReturned: true,
    });
  });

  test('wide month cells keep compact labels while preserving full accessible identity', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux50');
    await page.getByTestId('my-flow-month-picker').fill('2026-06');

    const content = page.getByTestId('my-flow-calendar-schedule-content');
    await expect(content.first()).toHaveAttribute('data-p30-marker', 'P30-CALENDAR-COMPACT-IDENTITY');
    expect(await content.count()).toBeGreaterThan(0);
    const identities = await content.evaluateAll((elements) => elements.slice(0, 12).map((element) => {
      const label = element.querySelector<HTMLElement>('[data-testid="my-flow-calendar-flow-label"]');
      const marker = element.querySelector<HTMLElement>('[data-testid="my-flow-calendar-schedule-rail"]');
      return {
        accessibleName: element.getAttribute('aria-label'),
        title: label?.getAttribute('title'),
        visibleLabel: label?.textContent?.trim(),
        markerInitial: marker?.dataset.flowMarkerInitial,
        clientWidth: label?.clientWidth ?? 0,
        scrollWidth: label?.scrollWidth ?? 0,
      };
    }));
    expect(identities.every((identity) => Boolean(
      identity.accessibleName && identity.title && identity.visibleLabel && identity.markerInitial,
    ))).toBe(true);
    expect(identities.every((identity) => identity.clientWidth <= identity.scrollWidth)).toBe(true);
    const overflowSummary = page.getByTestId('my-flow-calendar-grid-overflow-summary').first();
    await expect(overflowSummary).toBeVisible();
    await expect(overflowSummary).toContainText(/외 [1-9]\d*개/u);
    const overflowAccessibleName = await overflowSummary.getAttribute('aria-label');
    expect(overflowAccessibleName).toMatch(/Flow [3-9]\d*개 중/u);
    await overflowSummary.press('Enter');
    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    const selectedDayGroups = selectedDay.getByTestId('my-flow-selected-date-group');
    expect(await selectedDayGroups.count()).toBeGreaterThanOrEqual(5);
    const selectedDayFullTitles = await selectedDay.getByTestId('my-flow-selected-date-flow-marker').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('aria-label')).filter(Boolean),
    );
    expect(selectedDayFullTitles.length).toBeGreaterThanOrEqual(5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-05-calendar-compact-identity-1024.png', {
      route: '/calendar?demo=ux50',
      viewport: { width: 1024, height: 768 },
      identities,
      sameDateFlowCount: selectedDayFullTitles.length,
      selectedDayFullTitles,
      horizontalOverflow: overflow,
    });
  });
});

test.describe('P30-06 routine advanced setting density', () => {
  test('summary stays compact while advanced fields group by schedule and ending rule', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/curated-allblanc-morning-workout');
    await clearLocalState(page);
    await page.getByTestId('public-flow-anchor-input').fill('2026-07-27');

    const summary = page.getByTestId('public-routine-schedule-summary');
    await expect(summary).toHaveAttribute('data-p30-marker', 'P30-ROUTINE-ADVANCED-DENSITY');
    await expect(summary.getByTestId('public-routine-schedule-editor')).toHaveCount(0);
    await expect(summary.getByTestId('public-routine-schedule-summary-next-occurrences').getByRole('listitem')).toHaveCount(3);
    await expect(summary.getByTestId('public-routine-schedule-summary-value')).toContainText('시간 미정');
    await capture(page, 'p30-06-routine-summary-390.png', {
      route: '/f/curated-allblanc-morning-workout',
      viewport: { width: 390, height: 844 },
      initialAdvancedFieldCount: 0,
      nextOccurrenceCount: 3,
    });

    await summary.getByTestId('public-routine-schedule-summary-toggle').click();
    const editor = summary.getByTestId('public-routine-schedule-editor');
    await expect(editor).toHaveAttribute('data-p30-marker', 'P30-ROUTINE-ADVANCED-DENSITY');
    await expect(editor.getByTestId('public-routine-schedule-editor-when-group')).toBeVisible();
    await expect(editor.getByTestId('public-routine-schedule-editor-end-group')).toBeVisible();
    await expect(editor.getByTestId('public-routine-schedule-editor-time')).toHaveCount(0);
    await expect(editor.getByTestId('public-routine-schedule-editor-duration')).toHaveCount(0);
    await expect(editor.getByTestId('public-routine-schedule-editor-end-date')).toHaveCount(0);
    await expect(editor.getByTestId('public-routine-schedule-editor-occurrence-count')).toHaveCount(0);

    await editor.getByTestId('public-routine-schedule-editor-time-mode').selectOption('timed');
    await editor.getByTestId('public-routine-schedule-editor-time').fill('07:30');
    await editor.getByTestId('public-routine-schedule-editor-duration').selectOption('45');
    await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
    await editor.getByTestId('public-routine-schedule-editor-occurrence-count').fill('8');
    await expect(summary.getByTestId('public-routine-schedule-summary-value')).toHaveText('월·수·금 · 07:30 · 45분 · 8회');
    await expect(editor.getByTestId('public-routine-schedule-editor-end-date')).toHaveCount(0);

    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(mobileOverflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-06-routine-advanced-390.png', {
      route: '/f/curated-allblanc-morning-workout',
      viewport: { width: 390, height: 844 },
      scheduleGroupVisible: true,
      endGroupVisible: true,
      selectedModeFieldsOnly: true,
      summary: '월·수·금 · 07:30 · 45분 · 8회',
      horizontalOverflow: mobileOverflow,
    });

    await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('until');
    await expect(editor.getByTestId('public-routine-schedule-editor-end-date')).toHaveCount(1);
    await expect(editor.getByTestId('public-routine-schedule-editor-occurrence-count')).toHaveCount(0);
    await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('none');
    await expect(editor.getByTestId('public-routine-schedule-editor-end-date')).toHaveCount(0);
    await expect(editor.getByTestId('public-routine-schedule-editor-occurrence-count')).toHaveCount(0);
    await expect(summary.getByTestId('public-routine-schedule-summary-value')).toContainText('계속 반복');

    await page.setViewportSize({ width: 1024, height: 768 });
    const wideOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(wideOverflow).toBeLessThanOrEqual(0);
    await capture(page, 'p30-06-routine-advanced-1024.png', {
      route: '/f/curated-allblanc-morning-workout',
      viewport: { width: 1024, height: 768 },
      selectedModeFieldsOnly: true,
      horizontalOverflow: wideOverflow,
      consoleErrorCount: consoleErrors.length,
    });
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('P30-07 legacy composition consumer gate', () => {
  test('public Flow stays artifact-first and the retired moving map resolves to the canonical frame', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');
    await clearLocalState(page);
    const publicFrame = page.getByTestId('public-flow-hero');
    await expect(publicFrame).toHaveAttribute('data-experience-architecture', 'p35-result-first');
    await expect(publicFrame).toHaveAttribute('data-p30-marker', 'P30-SAVE-BEFORE-SINGLE-DECISION');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await capture(page, 'p30-07-public-artifact-first-390.png', {
      route: '/f/moving-d30-basic',
      viewport: { width: 390, height: 844 },
      composition: 'artifact-first',
      deadConditionalConsumerCount: 0,
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await gotoLegacySavedPlanLibraryRoute(page, '/flow-maps/moving-d30');
    await expect(page).toHaveURL(withLegacySavedPlanLibraryRoute('/f/moving-d30-basic'));
    const canonicalAliasFrame = page.getByTestId('public-flow-hero');
    await expect(canonicalAliasFrame).toHaveAttribute('data-experience-architecture', 'p35-result-first');
    await expect(page.getByTestId('flow-map-hero')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await capture(page, 'p30-07-source-backed-active-legacy-1024.png', {
      route: '/flow-maps/moving-d30',
      viewport: { width: 1024, height: 768 },
      composition: 'canonical_alias',
      activeProductionConsumerCount: 0,
      removalDecision: 'retired_by_p33_canonical_alias',
      consoleErrorCount: consoleErrors.length,
    });
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('P30-08 desktop production matrix', () => {
  test('public, My Flow, and Calendar stay readable and operable at 1440px', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    const routes = [
      { route: '/f/moving-d30-basic', filename: 'p30-08-public-save-before-1440.png' },
      { route: '/my?demo=ux20&view=flows', filename: 'p30-08-my-flow-1440.png' },
      { route: '/calendar?demo=ux50', filename: 'p30-08-calendar-1440.png' },
    ];

    for (const surface of routes) {
      await gotoLegacySavedPlanLibraryRoute(page, surface.route);
      const health = await page.evaluate(() => {
        const focusables = Array.from(document.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
        )).filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        const unnamedFocusableCount = focusables.filter((element) => {
          const labelledBy = element.getAttribute('aria-labelledby');
          const labelledByText = labelledBy
            ?.split(/\s+/u)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .join(' ')
            .trim();
          const formLabel = element instanceof HTMLInputElement
            || element instanceof HTMLSelectElement
            || element instanceof HTMLTextAreaElement
            ? Array.from(element.labels ?? []).map((label) => label.textContent?.trim() ?? '').join(' ').trim()
            : '';
          const name = element.getAttribute('aria-label')
            || labelledByText
            || formLabel
            || element.getAttribute('title')
            || element.textContent?.trim();
          return !name;
        }).length;

        return {
          horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
          unnamedFocusableCount,
        };
      });

      expect(health.horizontalOverflow).toBeLessThanOrEqual(0);
      expect(health.unnamedFocusableCount).toBe(0);
      await capture(page, surface.filename, {
        route: surface.route,
        viewport: { width: 1440, height: 900 },
        ...health,
      });
    }

    expect(consoleErrors).toEqual([]);
  });
});
