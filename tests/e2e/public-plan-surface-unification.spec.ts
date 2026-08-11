import { expect, test, type Page } from '@playwright/test';

type PublicSurfaceCase = Readonly<{
  label: string;
  route: string;
  planKind: 'flow' | 'map';
  saveMode?: 'save_all' | 'choose_child';
}>;

const PUBLIC_SURFACE_CASES: readonly PublicSurfaceCase[] = [
  {
    label: 'Allblanc public Flow',
    route: '/f/curated-allblanc-no-jump-cardio',
    planKind: 'flow',
  },
  {
    label: 'middle-school math',
    route: '/flow-maps/middle-school-math-1',
    planKind: 'map',
    saveMode: 'save_all',
  },
  {
    label: 'OPIc mock course',
    route: '/flow-maps/curated-opic-mock-course',
    planKind: 'map',
    saveMode: 'save_all',
  },
  {
    label: 'reading routine',
    route: '/flow-maps/curated-reading-routine-log',
    planKind: 'map',
    saveMode: 'save_all',
  },
  {
    label: 'new-car purchase guide',
    route: '/flow-maps/curated-new-car-purchase-guide',
    planKind: 'map',
    saveMode: 'save_all',
  },
  {
    label: 'postal address transfer',
    route: '/flow-maps/postal-address-transfer',
    planKind: 'map',
    saveMode: 'save_all',
  },
  {
    label: 'aircon filter cleaning',
    route: '/flow-maps/aircon-filter-cleaning',
    planKind: 'map',
    saveMode: 'save_all',
  },
  {
    label: 'wedding child choice',
    route: '/flow-maps/curated-wedding-checklist-family',
    planKind: 'map',
    saveMode: 'choose_child',
  },
  {
    label: 'Allblanc child choice',
    route: '/flow-maps/curated-allblanc-workout-park',
    planKind: 'map',
    saveMode: 'choose_child',
  },
] as const;

const CHOOSE_CHILD_CASES = PUBLIC_SURFACE_CASES.filter(
  (surface): surface is PublicSurfaceCase & { saveMode: 'choose_child' } => (
    surface.saveMode === 'choose_child'
  ),
);

const VIEWPORTS = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 900 },
  { label: 'compact desktop', width: 1024, height: 900 },
  { label: 'desktop', width: 1440, height: 1000 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function expectPublicSurfaceQuality(page: Page) {
  const quality = await page.evaluate(() => {
    const isVisible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getAttribute('aria-hidden') !== 'true'
        && rect.width > 0
        && rect.height > 0;
    };
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    )).filter(isVisible);
    const unnamed = controls.filter((element) => {
      const labelledBy = (element.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/u)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ');
      const labels = 'labels' in element && element.labels
        ? Array.from(element.labels as NodeListOf<HTMLLabelElement>)
          .map((label) => label.textContent?.trim() ?? '')
          .join(' ')
        : '';
      return [
        element.getAttribute('aria-label'),
        labelledBy,
        labels,
        element.closest('label')?.textContent?.trim(),
        element.getAttribute('title'),
        element.textContent?.trim(),
        element instanceof HTMLInputElement ? element.value : '',
      ].filter(Boolean).join(' ').trim().length === 0;
    });
    const clipped = controls.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    });
    const fixed = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => window.getComputedStyle(element).position === 'fixed')
      .filter(isVisible);
    const fixedOverlaps = fixed.flatMap((left, leftIndex) => (
      fixed.slice(leftIndex + 1).flatMap((right) => {
        if (left.contains(right) || right.contains(left)) return [];
        const leftRect = left.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        const overlaps = leftRect.left < rightRect.right
          && leftRect.right > rightRect.left
          && leftRect.top < rightRect.bottom
          && leftRect.bottom > rightRect.top;
        return overlaps ? [{
          left: left.dataset.testid ?? left.tagName,
          right: right.dataset.testid ?? right.tagName,
        }] : [];
      })
    ));
    return {
      unnamed: unnamed.map((element) => element.dataset.testid ?? element.outerHTML.slice(0, 120)),
      clipped: clipped.map((element) => element.dataset.testid ?? element.outerHTML.slice(0, 120)),
      fixedOverlaps,
    };
  });
  expect(quality.unnamed).toEqual([]);
  expect(quality.clipped).toEqual([]);
  expect(quality.fixedOverlaps).toEqual([]);
}

async function expectMinimumTargetHeight(locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(47.5);
}

async function readRawStorage(page: Page) {
  return page.evaluate(() => ({
    local: Object.entries(window.localStorage)
      .sort(([left], [right]) => left.localeCompare(right)),
    session: Object.entries(window.sessionStorage)
      .sort(([left], [right]) => left.localeCompare(right)),
  }));
}

async function expectApprovedPublicSurface(
  page: Page,
  surface: PublicSurfaceCase,
) {
  const shell = page.getByTestId('flow-public-shell');
  await expect(shell).toHaveCount(1);
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-public-plan-kind', surface.planKind);
  await expect(shell.getByRole('link', { name: /계획 찾기/u })).toHaveAttribute('href', '/flows');

  if (surface.planKind === 'map') {
    await expect(page.getByTestId('flow-map-public')).toHaveAttribute(
      'data-map-save-mode',
      surface.saveMode ?? '',
    );
  }

  const result = page.getByTestId('public-flow-capability-result');
  await expect(result).toHaveCount(1);
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-public-format-mode', 'approved');

  const formatTabs = result.locator('[data-public-format-tab="true"]');
  await expect(formatTabs).toHaveCount(3);
  await expect(formatTabs).toHaveText(['Text', 'Todo', 'Calendar']);
  await formatTabs.filter({ hasText: 'Todo' }).click();
  await expect(result).toHaveAttribute('data-capability-selected-destination', 'checklist');
  for (let index = 0; index < 3; index += 1) {
    await expectMinimumTargetHeight(formatTabs.nth(index));
  }

  await expect(page.locator([
    '[data-testid="platform-nav"]',
    '[data-testid="platform-mobile-tabs"]',
    '[data-testid="flow-map-artifact-preview"]',
    '[data-testid="flow-map-execution-outline"]',
    '[data-testid="flow-map-public-step-items"]',
  ].join(', '))).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('저장될 전체 계획');

  if (surface.saveMode !== 'choose_child') {
    const editAction = page.getByRole('button', { name: '수정', exact: true }).filter({ visible: true });
    const saveAction = page.getByRole('button', { name: '내 계획으로 저장', exact: true }).filter({ visible: true });
    await expect(editAction)
      .toHaveCount(1);
    await expect(saveAction)
      .toHaveCount(1);
    await expectMinimumTargetHeight(editAction);
    await expectMinimumTargetHeight(saveAction);
  } else {
    await expectMinimumTargetHeight(page.getByTestId('flow-map-open-selected-child'));
  }
  await expectNoHorizontalOverflow(page);
  await expectPublicSurfaceQuality(page);
}

test.describe('public plan surface unification', () => {
  test.describe.configure({ mode: 'serial' });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.label} renders every executable public case through the approved surface`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const runtimeFailures: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') runtimeFailures.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => runtimeFailures.push(`pageerror: ${error.message}`));
      page.on('requestfailed', (request) => {
        const reason = request.failure()?.errorText ?? 'unknown';
        if (!/ERR_ABORTED/u.test(reason)) {
          runtimeFailures.push(`requestfailed: ${request.url()} (${reason})`);
        }
      });
      page.on('response', (response) => {
        if (response.status() < 400) return;
        const currentUrl = page.url();
        if (!currentUrl || new URL(response.url()).origin !== new URL(currentUrl).origin) return;
        runtimeFailures.push(`response: ${response.status()} ${response.url()}`);
      });

      await page.goto('/flows');
      await expect(page).toHaveURL('/flows');
      runtimeFailures.length = 0;

      for (const surface of PUBLIC_SURFACE_CASES) {
        await test.step(surface.label, async () => {
          const storageBefore = await readRawStorage(page);
          await page.goto(surface.route);
          await expect(page).toHaveURL(surface.route);
          await expectApprovedPublicSurface(page, surface);
          expect(await readRawStorage(page)).toEqual(storageBefore);
          expect(runtimeFailures).toEqual([]);
        });
      }
    });
  }

  test('middle-school math exposes eight readonly Todo details and restores focus after close', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/middle-school-math-1');

    const result = page.getByTestId('public-flow-capability-result');
    await result.locator(
      '[data-public-format-tab="true"][data-capability-destination="checklist"]',
    ).click();

    const todo = page.getByTestId('flow-capability-artifact-preview-todo');
    await expect(todo).toHaveAttribute('data-todo-row-count', '8');
    await expect(todo.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(8);
    await expect(todo.getByTestId('flow-capability-artifact-preview-todo-checkbox')).toHaveCount(8);

    const detailLinks = todo.getByTestId('flow-capability-artifact-preview-todo-detail-link');
    await expect(detailLinks).toHaveCount(8);
    for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      await test.step(`Todo row ${rowIndex + 1} detail`, async () => {
        const detailLink = detailLinks.nth(rowIndex);
        await detailLink.click();

        const itemPreview = page.getByTestId('public-flow-item-preview');
        await expect(itemPreview).toBeVisible();
        await expect(itemPreview).toHaveAttribute('data-public-preview', 'readonly');
        await itemPreview.getByTestId('public-flow-item-preview-close').click();
        await expect(itemPreview).toHaveCount(0);
        await expect(detailLink).toBeFocused();
      });
    }
  });

  test('choose-child changes only the selected child link and writes no browser storage', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const surface of CHOOSE_CHILD_CASES) {
      await test.step(surface.label, async () => {
        await page.goto(surface.route);
        const storageBefore = await readRawStorage(page);
        const choices = page.getByTestId('flow-map-child-choice');
        await expect(choices).toHaveCount(2);
        const selectedChoice = page.locator(
          '[data-testid="flow-map-child-choice"]:has(input:checked)',
        );
        await expect(selectedChoice).toHaveCount(1);

        const alternate = page.locator(
          '[data-testid="flow-map-child-choice"]:not(:has(input:checked))',
        ).first();
        const selectedSlug = await alternate.getAttribute('data-flow-slug');
        expect(selectedSlug).not.toBeNull();
        expect(selectedSlug).toMatch(/\S/u);
        await alternate.click();
        const newlySelectedChoice = page.locator(
          `[data-testid="flow-map-child-choice"][data-flow-slug="${selectedSlug!}"]`,
        );
        await expect(newlySelectedChoice.locator('input[type="radio"]')).toBeChecked();
        await expect(page.getByTestId('flow-map-open-selected-child')).toHaveAttribute(
          'href',
          `/f/${selectedSlug!}`,
        );
        expect(await readRawStorage(page)).toEqual(storageBefore);

        await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
        await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
        await expect(page.getByTestId('flow-map-adjust-save')).toHaveCount(0);
        await expect(page.getByTestId('flow-map-adjust-save-mobile')).toHaveCount(0);
      });
    }
  });

  test('Calendar without its required anchor keeps the date action enabled and focuses the shared input', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/curated-opic-mock-course');

    const result = page.getByTestId('public-flow-capability-result');
    await result.locator(
      '[data-public-format-tab="true"][data-capability-destination="calendar"]',
    ).click();
    const anchor = page.getByTestId('flow-map-anchor-input');
    await expect(anchor).toBeVisible();
    await anchor.fill('');

    const storageBefore = await readRawStorage(page);
    const action = page.getByTestId('flow-map-save-all-mobile');
    await expect(action).toBeEnabled();
    await expect(action).toHaveText('시작일 정하기');
    await action.click();
    await expect(anchor).toBeFocused();
    expect(await readRawStorage(page)).toEqual(storageBefore);
  });

  test('explicit rollback flags preserve the prior Flow and choose-child Map presentation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/f/curated-allblanc-no-jump-cardio?savedPlanLibrary=off');
    await expect(page.getByTestId('public-flow-capability-result')).toHaveAttribute(
      'data-public-format-mode',
      'default',
    );

    await page.goto('/flow-maps/curated-opic-mock-course?visualSubtraction=off');
    await expect(page.getByTestId('platform-nav')).toBeVisible();
    await expect(page.getByTestId('platform-mobile-tabs')).toBeVisible();
    await expect(page.getByTestId('flow-public-shell')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-artifact-preview')).toBeVisible();
    await expect(page.getByTestId('flow-map-execution-outline')).toBeVisible();
    await expect(page.getByTestId('public-flow-capability-result')).toHaveCount(0);
    await expect.poll(() => page.getByTestId('flow-map-mobile-sticky-save').evaluate(
      (element) => Number.parseFloat(window.getComputedStyle(element).bottom),
    )).toBeGreaterThan(60);
    const legacyAnchor = page.getByTestId('flow-map-anchor-input');
    await legacyAnchor.fill('');
    const storageBeforeLegacyAnchor = await readRawStorage(page);
    const legacySave = page.getByTestId('flow-map-save-all-mobile');
    await expect(legacySave).toBeEnabled();
    await legacySave.click();
    await expect(legacyAnchor).toBeFocused();
    expect(await readRawStorage(page)).toEqual(storageBeforeLegacyAnchor);

    await page.goto('/flow-maps/curated-allblanc-workout-park?visualSubtraction=off');
    await expect(page.getByTestId('platform-nav')).toBeVisible();
    await expect(page.getByTestId('flow-public-shell')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-artifact-preview')).toBeVisible();
    await expect(page.getByTestId('flow-map-execution-outline')).toBeVisible();
    await expect(page.getByTestId('public-flow-capability-result')).toHaveCount(0);
  });

  test('review-held content exposes no approved result or save action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flow-maps/baby-food-map');

    const hold = page.getByTestId('flow-map-review-hold');
    await expect(hold).toBeVisible();
    await expect(hold).toHaveAttribute('data-map-execution-state', 'review_hold');
    await expect(hold).toHaveAttribute('data-map-save-capability', 'hidden');
    await expect(hold).toHaveAttribute('data-map-edit-capability', 'hidden');
    await expect(hold.getByTestId('flow-map-source-link')).toBeVisible();

    await expect(page.getByTestId('public-flow-capability-result')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-save-all')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-save-all-mobile')).toHaveCount(0);
    await expect(page.getByTestId('flow-map-open-selected-child')).toHaveCount(0);
  });
});
