import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const evidenceRoot = process.env.FLOWME_P35_08_EVIDENCE_DIR;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshotDir = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.evaluate(async () => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
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
    const unnamedInteractiveCount = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter((element) => {
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
    const mobileNavigationRect = mobileNavigation?.getBoundingClientRect();
    const fixedOverlapCount = !mobileNavigation || !mobileNavigationRect
      ? 0
      : Array.from(document.querySelectorAll<HTMLElement>('button, a, input, select, textarea'))
        .filter((element) => !mobileNavigation.contains(element) && visible(element))
        .filter((element) => {
          const position = getComputedStyle(element).position;
          return position === 'fixed' || position === 'sticky';
        })
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < mobileNavigationRect.right
            && rect.right > mobileNavigationRect.left
            && rect.top < mobileNavigationRect.bottom
            && rect.bottom > mobileNavigationRect.top
          );
        }).length;
    const main = document.querySelector('main');
    const navigation = document.querySelector('[data-testid="platform-mobile-tabs"]');
    const mainBeforePersistentNavigation = !main || !navigation
      ? true
      : Boolean(main.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING);

    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      unnamedInteractiveCount,
      fixedOverlapCount,
      mainLandmarkCount: document.querySelectorAll('main').length,
      headingCount: document.querySelectorAll('h1, h2, h3').length,
      mainBeforePersistentNavigation,
    };
  });
}

async function expectQuality(page: Page) {
  const quality = await inspectPageQuality(page);
  expect(quality.horizontalOverflow).toBe(0);
  expect(quality.unnamedInteractiveCount).toBe(0);
  expect(quality.fixedOverlapCount).toBe(0);
  expect(quality.mainLandmarkCount).toBeGreaterThanOrEqual(1);
  expect(quality.headingCount).toBeGreaterThanOrEqual(1);
  expect(quality.mainBeforePersistentNavigation).toBe(true);
}

test.describe('P35-08 final MECE gate', () => {
  test('five representative Flows keep one selected capability result before optional adjustment', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const cases = [
      {
        slug: 'moving-d30-basic',
        destination: 'checklist',
        shape: 'checklist',
        outputCount: 24,
        screenshot: 'p35-08-moving-result-390.png',
      },
      {
        slug: 'vehicle-inspection-prep',
        destination: 'checklist',
        shape: 'checklist',
        outputCount: 10,
        screenshot: 'p35-08-vehicle-result-390.png',
      },
      {
        slug: 'curated-allblanc-morning-workout',
        destination: 'checklist',
        shape: 'checklist',
        outputCount: 1,
        screenshot: 'p35-08-workout-result-390.png',
      },
      {
        slug: 'source-backed-middle-school-math-1',
        destination: 'sheet',
        shape: 'sheet',
        outputCount: 8,
        screenshot: 'p35-08-study-result-390.png',
      },
      {
        slug: 'overseas-safety-register',
        destination: 'checklist',
        shape: 'checklist',
        outputCount: 4,
        screenshot: 'p35-08-safety-checklist-result-390.png',
      },
    ] as const;

    for (const candidate of cases) {
      await gotoLegacySavedPlanLibraryRoute(page, `/f/${candidate.slug}`);
      const capability = page.getByTestId('public-flow-capability-result');
      await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
      await expect(capability).toHaveAttribute(
        'data-capability-snapshot-kind',
        'effective_authoring',
      );
      await expect(capability).toHaveAttribute(
        'data-capability-primary-destination',
        candidate.destination,
      );
      const primary = capability.locator(
        '[data-testid="flow-capability-result-choice"]'
          + '[data-capability-candidate-role="primary"]',
      );
      await expect(primary).toHaveCount(1);
      await expect(primary).toHaveAttribute('data-capability-destination', candidate.destination);
      await expect(primary).toHaveAttribute(
        'data-capability-output-count',
        String(candidate.outputCount),
      );
      const selected = capability.getByTestId('flow-capability-selected-preview');
      await expect(selected).toHaveCount(1);
      await expect(selected).toHaveAttribute('data-capability-destination', candidate.destination);
      await expect(selected).toHaveAttribute(
        'data-capability-output-count',
        String(candidate.outputCount),
      );
      const preview = selected.getByTestId('flow-capability-artifact-preview');
      await expect(preview).toHaveAttribute('data-selected-shape', candidate.shape);
      await expect(preview.getByTestId('flow-artifact-shape-choice')).toHaveCount(0);
      await expect(page.getByTestId('public-flow-personal-adjustment')).toHaveCount(0);
      await expect(
        page.locator(
          '[data-testid="public-flow-save-primary"]:visible, '
          + '[data-testid="public-flow-save-primary-mobile"]:visible',
        ),
      ).toHaveCount(1);
      await expectQuality(page);
      await capture(page, candidate.screenshot);
    }

    expect(errors).toEqual([]);
  });

  test('My Flow and Calendar keep one owner at mobile, wide, and desktop scale', async ({ page }) => {
    const errors = collectBrowserErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLegacySavedPlanLibraryRoute(page, '/my?demo=ux20&view=flows');
    await expect(page.locator('main').first()).toHaveAttribute(
      'data-p35-my-flow-marker',
      'P35-MY-LIBRARY-ONLY',
    );
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(8);
    await expect(page.getByTestId('my-flow-view-today')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-view-completed')).toHaveCount(0);
    const firstMobileRow = page.getByTestId('my-flow-mobile-structure-row').first();
    expect(await firstMobileRow.locator('button, a[href], input, select, textarea, summary').count())
      .toBe(1);
    await capture(page, 'p35-08-my-flow-library-20-390.png');
    await expectQuality(page);

    const firstMobileSlug = await firstMobileRow.getAttribute('data-flow-slug');
    expect(firstMobileSlug).toBeTruthy();
    const mobileWorkspace = await openMyFlowLibraryFlow(page, firstMobileSlug!, 'plan');
    await expect(mobileWorkspace).toHaveAttribute(
      'data-p35-marker',
      'P35-PERSONAL-SINGLE-FOCUS',
    );
    await capture(page, 'p35-08-my-flow-focused-390.png');
    await expectQuality(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await gotoLegacySavedPlanLibraryRoute(page, '/calendar?demo=ux20');
    const calendar = page.getByTestId('my-flow-calendar-workspace');
    await expect(calendar).toHaveAttribute(
      'data-p35-calendar-marker',
      'P35-CALENDAR-LENS-ONE-TOGGLE',
    );
    await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
    await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    await expect(selectedDay).toBeVisible();
    await expect(selectedDay.getByTestId('my-flow-inline-note-open')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'p35-08-calendar-selected-day-1024.png');
    await expectQuality(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/my?demo=ux60&view=flows');
    const library = page.getByTestId('my-flow-library-workspace');
    await expect(library.getByTestId('my-flow-library-row')).toHaveCount(60);
    await expect(library.getByTestId('my-flow-library-rail-search')).toBeVisible();
    await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card'))
      .toHaveCount(0);
    await library.getByTestId('my-flow-library-row').first().click();
    await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card'))
      .toHaveAttribute('data-workspace-composition', 'shared-model-separate-surfaces');
    await capture(page, 'p35-08-my-flow-library-60-1440.png');
    await expectQuality(page);

    expect(errors).toEqual([]);
  });

  test('three primary destinations and picker focus remain keyboard predictable', async ({ page }) => {
    const errors = collectBrowserErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    const mobileNavigation = page.getByTestId('platform-mobile-tabs');
    await expect(mobileNavigation).toHaveAttribute(
      'data-p35-marker',
      'P35-ENTRY-ROUTER-3TAB',
    );
    await expect(mobileNavigation.getByRole('link')).toHaveCount(3);
    await expectQuality(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar?demo=ux60');
    const scopeTrigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    await scopeTrigger.focus();
    await page.keyboard.press('Enter');
    const picker = page.getByTestId('calendar-flow-scope-picker');
    await expect(picker.getByTestId('calendar-flow-scope-picker-search')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await expect(scopeTrigger).toBeFocused();
    await expectQuality(page);

    expect(errors).toEqual([]);
  });
});
