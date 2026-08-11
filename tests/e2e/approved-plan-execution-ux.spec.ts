import fs from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';

const FIXED_CLOCK = '2026-08-10T09:00:00+09:00';
const SORT_PLAN_COUNT = 6;
const PUBLIC_FLOW_ROUTE = '/f/moving-d30-basic';

type SortPlanFixture = Readonly<{
  planId: string;
  title: string;
  sourceId: string;
  savedAt: string;
  date?: string;
  completed?: boolean;
}>;

type ApprovedPlanWindow = Window & {
  __approvedPlanStorageMutations?: Array<{
    operation: 'setItem' | 'removeItem' | 'clear';
    key?: string;
    value?: string;
  }>;
};

// Canonical spec §9 fixture. Keep these values literal so E2E exercises the
// same overdue/today/future/undated/completed and copy-tie matrix as unit tests.
const SORT_PLANS: readonly SortPlanFixture[] = [
  {
    planId: 'moving-a',
    title: '이사 D-30 준비',
    sourceId: 'approved-moving-source',
    savedAt: '2026-08-10T08:10:00+09:00',
    date: '2026-08-09',
  },
  {
    planId: 'moving-b',
    title: '이사 D-30 준비',
    sourceId: 'approved-moving-source',
    savedAt: '2026-08-10T08:20:00+09:00',
    date: '2026-08-12',
  },
  {
    planId: 'wedding-2',
    title: '결혼 준비 2',
    sourceId: 'approved-wedding-2-source',
    savedAt: '2026-08-09T21:00:00+09:00',
    date: '2026-08-10',
  },
  {
    planId: 'wedding-10',
    title: '결혼 준비 10',
    sourceId: 'approved-wedding-10-source',
    savedAt: '2026-08-10T08:30:00+09:00',
  },
  {
    planId: 'reading',
    title: '독서 기록',
    sourceId: 'approved-reading-source',
    savedAt: '2026-08-08T11:00:00+09:00',
    completed: true,
  },
  {
    planId: 'cleanup',
    title: '집 정리',
    sourceId: 'approved-cleanup-source',
    savedAt: '2026-08-10T07:00:00+09:00',
    date: '2026-08-12',
  },
] as const;

const EXPECTED_SORT_ORDER = {
  next: ['moving-a', 'wedding-2', 'moving-b', 'cleanup', 'wedding-10', 'reading'],
  saved: ['wedding-10', 'moving-b', 'moving-a', 'cleanup', 'wedding-2', 'reading'],
  name: ['wedding-2', 'wedding-10', 'reading', 'moving-a', 'moving-b', 'cleanup'],
} as const;

async function installApprovedSortFixture(
  page: Page,
  plans: readonly SortPlanFixture[] = SORT_PLANS,
  instrumentStorage = false,
) {
  await page.addInitScript(({ fixturePlans, shouldInstrument }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    const bundles = fixturePlans.map((plan) => {
      const itemId = `${plan.planId}-item`;
      return {
        flow: {
          id: `approved-${plan.planId}-flow`,
          slug: plan.planId,
          title: plan.title,
          description: `${plan.title} 승인 UX 정렬 검증용 계획`,
          category: '승인 UX 검증',
          structure_type: 'timeline',
          content_type: 'default',
          anchor_type: plan.date ? 'start_date' : 'none',
          status: 'draft',
          primary_destination: plan.date ? 'calendar' : 'internal_check',
          source_title: `${plan.title} 원문`,
          source_url: `https://example.com/${plan.planId}`,
          source_status: 'real',
          source_precision: 'exact',
          created_at: '2026-08-01T00:00:00.000Z',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
        sections: [{
          id: `${plan.planId}-section`,
          flow_id: `approved-${plan.planId}-flow`,
          title: '실행',
          order: 0,
        }],
        items: [{
          id: itemId,
          flow_id: `approved-${plan.planId}-flow`,
          section_id: `${plan.planId}-section`,
          title: `${plan.title} 실행`,
          description: `${plan.title} 메모`,
          type: plan.date ? 'calendar' : 'todo',
          ...(plan.date ? { day_offset: 0, duration_days: 1 } : {}),
          role: 'action',
          order: 0,
        }],
        itemDetails: [{
          item_id: itemId,
          why: `${plan.title} 상세 메모`,
          completion_criteria: `${plan.title} 완료`,
        }],
        warnings: [],
      };
    });

    window.localStorage.setItem('flow_builder_mvp_bundles_v11', JSON.stringify(bundles));
    fixturePlans.forEach((plan) => {
      window.localStorage.setItem(`flow:saved:${plan.planId}`, JSON.stringify({
        slug: plan.planId,
        savedAt: plan.savedAt,
        sourceFlowKey: plan.sourceId,
        personalTitle: plan.title,
        selectedArtifactMode: plan.date ? 'calendar' : 'checklist',
        dateIntent: plan.date ? 'custom' : 'undated',
        ...(plan.date ? { anchor: plan.date } : {}),
      }));
      window.localStorage.setItem(
        `flow:${plan.planId}:anchorDate`,
        JSON.stringify(plan.date
          ? { mode: 'custom', anchor: plan.date }
          : { mode: 'undated', anchor: '' }),
      );
      if (plan.completed) {
        window.localStorage.setItem(
          `flow_builder_mvp_checks_${plan.planId}`,
          JSON.stringify({ [`${plan.planId}-item`]: true }),
        );
      }
    });

    if (!shouldInstrument) return;
    const instrumentedWindow = window as ApprovedPlanWindow;
    instrumentedWindow.__approvedPlanStorageMutations = [];
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (this === window.localStorage) {
        instrumentedWindow.__approvedPlanStorageMutations?.push({
          operation: 'setItem',
          key,
          value,
        });
      }
      return originalSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key: string) {
      if (this === window.localStorage) {
        instrumentedWindow.__approvedPlanStorageMutations?.push({
          operation: 'removeItem',
          key,
        });
      }
      return originalRemoveItem.call(this, key);
    };
    Storage.prototype.clear = function clear() {
      if (this === window.localStorage) {
        instrumentedWindow.__approvedPlanStorageMutations?.push({ operation: 'clear' });
      }
      return originalClear.call(this);
    };
  }, { fixturePlans: plans, shouldInstrument: instrumentStorage });
}

async function installCleanStorage(page: Page) {
  await page.addInitScript(() => {
    const initializedKey = 'flowme:e2e:approved-clean-storage';
    if (window.sessionStorage.getItem(initializedKey) === 'ready') return;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem(initializedKey, 'ready');
  });
}

async function seedMovingPlan(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
      slug: 'moving-d30-basic',
      savedAt: '2026-08-10T08:10:00+09:00',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2026-09-01',
    }));
    window.localStorage.setItem(
      'flow:moving-d30-basic:anchorDate',
      JSON.stringify({ mode: 'custom', anchor: '2026-09-01' }),
    );
  });
}

async function seedWorkoutPlan(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('flow:saved:curated-allblanc-morning-workout', JSON.stringify({
      slug: 'curated-allblanc-morning-workout',
      savedAt: '2026-08-10T08:10:00+09:00',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2026-08-10',
    }));
    window.localStorage.setItem(
      'flow:curated-allblanc-morning-workout:anchorDate',
      JSON.stringify({ mode: 'custom', anchor: '2026-08-10' }),
    );
  });
}

async function seedRoutinePlan(page: Page) {
  await page.addInitScript(() => {
    const initializedKey = 'flowme:e2e:approved-routine-plan';
    if (window.sessionStorage.getItem(initializedKey) === 'ready') return;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('flow:saved:washer-tub-clean-monthly', JSON.stringify({
      slug: 'washer-tub-clean-monthly',
      savedAt: '2026-08-10T08:10:00+09:00',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2026-05-27',
    }));
    window.localStorage.setItem(
      'flow:washer-tub-clean-monthly:anchorDate',
      JSON.stringify({ mode: 'custom', anchor: '2026-05-27' }),
    );
    window.sessionStorage.setItem(initializedKey, 'ready');
  });
}

async function localStorageRawSnapshot(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(
    Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .filter((key): key is string => Boolean(key))
      .sort()
      .map((key) => [key, window.localStorage.getItem(key) ?? '']),
  ));
}

async function localStorageMutationLog(page: Page) {
  return page.evaluate(() => (
    (window as ApprovedPlanWindow).__approvedPlanStorageMutations ?? []
  ));
}

async function resetLocalStorageMutationLog(page: Page) {
  await page.evaluate(() => {
    (window as ApprovedPlanWindow).__approvedPlanStorageMutations = [];
  });
}

async function railPlanOrder(page: Page): Promise<string[]> {
  const rows = page.getByTestId('my-flow-library-row');
  await expect(rows).toHaveCount(SORT_PLAN_COUNT);
  return rows.evaluateAll((elements) => elements.map(
    (element) => element.getAttribute('data-flow-slug') ?? '',
  ));
}

async function selectRailSort(page: Page, sort: 'next' | 'saved' | 'name') {
  const trigger = page.getByTestId('my-plan-sort-rail-trigger');
  await trigger.click();
  await page.getByTestId(`my-plan-sort-option-${sort}`).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
}

async function inspectApprovedWorkspaceQuality(
  page: Page,
  targetSelectors: readonly string[] = [
      '[data-testid^="my-plan-sort-"][data-testid$="-trigger"]',
      '[data-testid="my-plan-todo-checkbox"]',
      '[data-testid="my-plan-todo-detail-link"]',
      '[data-testid="my-plan-edit"]',
      '[data-testid="my-flow-export-entry"]',
  ],
) {
  return page.evaluate((selectorsInput) => {
    const selectors = selectorsInput.join(',');
    const isVisible = (element: Element) => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const targets = Array.from(document.querySelectorAll<HTMLElement>(selectors))
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          testId: element.dataset.testid ?? element.getAttribute('data-testid') ?? element.tagName,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
        };
      });
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      tooSmall: targets.filter((target) => target.width < 47.5 || target.height < 47.5),
      clipped: targets.filter((target) => target.left < -1 || target.right > window.innerWidth + 1),
      targetCount: targets.length,
    };
  }, targetSelectors);
}

function collectBrowserQualityIssues(page: Page) {
  const issues: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(`console:${message.type()}:${message.text()}`);
    }
  });
  page.on('pageerror', (error) => issues.push(`pageerror:${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (/ERR_ABORTED|NS_BINDING_ABORTED/iu.test(failure)) return;
    issues.push(`requestfailed:${request.method()}:${request.url()}:${failure}`);
  });
  return issues;
}

async function expectSuccessfulApprovedTransferReceipt(
  page: Page,
  format: 'txt' | 'vtodo' | 'vevent' | 'xlsx',
  outputCount = 24,
) {
  const receiptDestination = {
    txt: 'memo',
    vtodo: 'checklist',
    vevent: 'calendar',
    xlsx: 'sheet',
  } as const;
  const receipt = page.getByTestId('my-flow-transfer-receipt');
  await expect(receipt).toHaveAttribute('data-transfer-format', receiptDestination[format]);
  await expect(receipt).toHaveAttribute('data-transfer-output-count', String(outputCount));
  await expect(receipt).toHaveAttribute('data-outcome', 'success');
  return receipt;
}

async function expectTargetsAtLeast48(locator: Locator, label: string) {
  const count = await locator.count();
  expect(count, `${label} target count`).toBeGreaterThan(0);
  const boxes = await locator.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      testId: (node as HTMLElement).dataset.testid ?? node.getAttribute('data-testid'),
      width: rect.width,
      height: rect.height,
    };
  }));
  expect(
    boxes.filter((box) => box.width < 47.5 || box.height < 47.5),
    `${label} 48px targets`,
  ).toEqual([]);
}

async function openApprovedPlan(page: Page, width: number) {
  await page.goto('/my?view=flows');
  const opener = width <= 767
    ? page.getByTestId('my-flow-mobile-structure-open').first()
    : page.getByTestId('my-flow-library-row').first();
  await opener.click();
  const plan = page.getByTestId('approved-my-plan-workspace');
  await expect(plan).toBeVisible();
  return plan;
}

async function openApprovedFirstItem(page: Page, width: number) {
  const plan = await openApprovedPlan(page, width);
  const itemOpener = plan.getByTestId('my-plan-todo-detail-link').first();
  await itemOpener.scrollIntoViewIfNeeded();
  await itemOpener.click();
  const detail = page.locator(
    '[data-testid="my-flow-item-detail"][data-detail-mode="execute"]:visible',
  );
  await expect(detail).toHaveCount(1);
  return { plan, itemOpener, detail };
}

test.describe('approved plan execution UX', () => {
  test('six-plan fixture wires next, saved, and Korean natural-name sort to the rail', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date(FIXED_CLOCK) });
    await installApprovedSortFixture(page, SORT_PLANS, true);

    await page.goto('/flows');
    await page.goto('/my?view=flows');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
      'data-library-count',
      String(SORT_PLAN_COUNT),
    );

    expect(await railPlanOrder(page)).toEqual(EXPECTED_SORT_ORDER.next);
    await expect(page.getByTestId('my-flow-library-row').nth(0)).toContainText('사본 1 · 이사 D-30 준비');
    await expect(page.getByTestId('my-flow-library-row').nth(2)).toContainText('사본 2 · 이사 D-30 준비');

    await selectRailSort(page, 'saved');
    expect(await railPlanOrder(page)).toEqual(EXPECTED_SORT_ORDER.saved);
    expect(new URL(page.url()).searchParams.get('sort')).toBe('saved');

    await selectRailSort(page, 'name');
    expect(await railPlanOrder(page)).toEqual(EXPECTED_SORT_ORDER.name);
    expect(new URL(page.url()).searchParams.get('sort')).toBe('name');

    await selectRailSort(page, 'next');
    expect(await railPlanOrder(page)).toEqual(EXPECTED_SORT_ORDER.next);
    expect(new URL(page.url()).searchParams.get('sort')).toBe('next');

    const storageBefore = await localStorageRawSnapshot(page);
    await resetLocalStorageMutationLog(page);
    const historyLengthBefore = await page.evaluate(() => window.history.length);
    const cycle = ['saved', 'name', 'next'] as const;
    for (let index = 0; index < 20; index += 1) {
      await selectRailSort(page, cycle[index % cycle.length]);
    }

    expect(await localStorageRawSnapshot(page)).toEqual(storageBefore);
    expect(await localStorageMutationLog(page)).toEqual([]);
    expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBefore);
    await page.goBack();
    await expect(page).toHaveURL(/\/flows(?:\?|$)/u);
  });

  test('invalid sort is canonicalized to next without leaving a bogus query in the URL', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5&view=flows&sort=not-a-sort');

    const trigger = page.getByTestId('my-plan-sort-rail-trigger');
    await expect(trigger).toHaveAccessibleName('정렬 기준, 다음 일정순');
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('next');
    expect(await page.evaluate(() => window.history.state?.flowmeMyFlowLibrary?.level ?? null))
      .not.toBe('item');
  });

  test('sort trigger is hidden for one plan, then behaves as an overlay keyboard menu for two or more', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installCleanStorage(page);
    await page.goto('/my?view=flows');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
      'data-library-count',
      '0',
    );
    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toHaveCount(0);

    await page.goto('/my?demo=ux1&view=flows');
    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toHaveCount(0);

    await page.goto('/my?demo=ux5&view=flows');
    const trigger = page.getByTestId('my-plan-sort-mobile-trigger');
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAccessibleName('정렬 기준, 다음 일정순');
    const firstRow = page.getByTestId('my-flow-mobile-structure-row').first();
    const rowYBefore = (await firstRow.boundingBox())?.y;

    await trigger.focus();
    await trigger.press('ArrowDown');
    const menu = page.getByTestId('my-plan-sort-mobile-menu');
    await expect(menu).toBeVisible();
    await expect(page.getByTestId('my-plan-sort-option-next')).toBeFocused();
    expect((await firstRow.boundingBox())?.y).toBeCloseTo(rowYBefore ?? 0, 0);

    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('my-plan-sort-option-saved')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName('정렬 기준, 최근 저장순');
    await expect(page.getByTestId('my-plan-sort-mobile').getByRole('status')).toHaveText(
      '최근 저장순으로 정렬됨, 계획 5개',
    );

    await trigger.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.press('Space');
    await expect(menu).toBeVisible();
    await expect(page.getByTestId('my-plan-sort-option-saved')).toBeFocused();
    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(390);
    await page.mouse.click(1, 1);
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.press('ArrowUp');
    await expect(menu).toBeVisible();
    await expect(page.getByTestId('my-plan-sort-option-name')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('sort trigger appears at the exact two-plan boundary', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installApprovedSortFixture(page, SORT_PLANS.slice(0, 2));
    await page.goto('/my?view=flows');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
      'data-library-count',
      '2',
    );
    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toBeVisible();
  });

  test('runtime name sort uses the original title even when display stripping would reverse it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const flipFixture: readonly SortPlanFixture[] = [
      {
        planId: 'runtime-d30',
        title: 'A D-30 Z',
        sourceId: 'runtime-d30-source',
        savedAt: '2026-08-10T08:10:00+09:00',
      },
      {
        planId: 'runtime-y',
        title: 'A Y',
        sourceId: 'runtime-y-source',
        savedAt: '2026-08-10T08:20:00+09:00',
      },
    ];
    await installApprovedSortFixture(page, flipFixture);
    await page.goto('/my?view=flows');
    await page.getByTestId('my-plan-sort-mobile-trigger').click();
    await page.getByTestId('my-plan-sort-option-name').click();
    expect(await page.getByTestId('my-flow-mobile-structure-row').evaluateAll(
      (rows) => rows.map((row) => row.getAttribute('data-flow-slug')),
    )).toEqual(['runtime-d30', 'runtime-y']);

    await page.goto('/my?view=flows&savedPlanLibrary=off');
    const legacyRows = page.getByTestId('my-flow-mobile-structure-row');
    await expect(legacyRows).toHaveCount(2);
    const legacyOrder = await legacyRows.evaluateAll(
      (rows) => rows.map((row) => row.getAttribute('data-flow-slug')),
    );
    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toHaveCount(0);
    await page.goto('/my?view=flows&savedPlanLibrary=off&sort=name');
    await expect(page.locator('main[data-saved-library-flag="off"]')).toBeVisible();
    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toHaveCount(0);
    expect(await page.getByTestId('my-flow-mobile-structure-row').evaluateAll(
      (rows) => rows.map((row) => row.getAttribute('data-flow-slug')),
    )).toEqual(legacyOrder);
  });

  test('twenty-plan inventory keeps sort, search, and status controls together', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
      'data-library-count',
      '20',
    );
    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toBeVisible();
    await expect(page.getByTestId('my-flow-search')).toBeVisible();
    await expect(page.getByTestId('my-flow-list-filter-all')).toBeVisible();
  });

  test('name sort restores exact order, rail scroll, plan focus, and item focus through browser Back', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1024, height: 480 });
    await page.clock.install({ time: new Date(FIXED_CLOCK) });
    await installApprovedSortFixture(page);
    await page.goto('/my?view=flows');

    await selectRailSort(page, 'name');
    expect(await railPlanOrder(page)).toEqual(EXPECTED_SORT_ORDER.name);
    const rail = page.getByTestId('my-flow-library-rail');
    const scrollContainer = rail.getByTestId('my-flow-library-scroll-container');
    const expectedScrollTop = await scrollContainer.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(expectedScrollTop).toBeGreaterThan(0);

    const selectedSlug = EXPECTED_SORT_ORDER.name.at(-1)!;
    const selectedRow = rail.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${selectedSlug}"]`,
    );
    await selectedRow.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(selectedSlug);
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('name');

    const plan = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${selectedSlug}"]`,
    );
    await expect(plan).toBeVisible();
    const itemOpener = plan.getByTestId('my-plan-todo-detail-link').first();
    await itemOpener.click();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(true);
    await expect(plan.getByTestId('my-plan-stacked-item-detail')).toBeVisible();

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(selectedSlug);
    await expect(itemOpener).toBeFocused();

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('name');
    expect(await railPlanOrder(page)).toEqual(EXPECTED_SORT_ORDER.name);
    await expect.poll(async () => scrollContainer.evaluate((element) => element.scrollTop))
      .toBeGreaterThanOrEqual(Math.max(1, expectedScrollTop - 4));
    await expect(selectedRow).toBeFocused();
  });

  test('query, status, and sort intersect exactly and expose an explicit empty result', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date(FIXED_CLOCK) });
    await installApprovedSortFixture(page);
    // Search/filter controls are intentionally compact below the 20-plan
    // threshold. A non-default route keeps those controls available while this
    // six-plan canonical fixture exercises the q + status + sort intersection.
    await page.goto('/my?view=flows&q=%EB%8F%85%EC%84%9C&status=done&sort=name');

    await expect(page.getByTestId('my-plan-sort-mobile-trigger')).toHaveAccessibleName(
      '정렬 기준, 계획 이름순',
    );
    await expect(page.getByTestId('my-flow-search')).toHaveValue('독서');
    await expect(page.getByTestId('my-flow-list-filter-done')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const rows = page.getByTestId('my-flow-mobile-structure-row');
    await expect(rows).toHaveCount(1);
    await expect(rows).toHaveAttribute('data-flow-slug', 'reading');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('독서');
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('done');
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('name');

    await page.getByTestId('my-flow-search').fill('이사');
    await expect(rows).toHaveCount(0);
    await expect(page.getByText('조건에 맞는 계획이 없습니다.', { exact: true })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('이사');
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('done');
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('name');
  });

  test('public preview exposes only Text, Todo, Calendar and all 24 Todo rows are readonly detail links', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installCleanStorage(page);
    await page.goto(PUBLIC_FLOW_ROUTE);

    const preview = page.getByTestId('public-flow-capability-result');
    await expect(preview).toHaveAttribute('data-public-format-mode', 'approved');
    const formatTabs = preview.locator('[data-public-format-tab="true"]');
    await expect(formatTabs).toHaveCount(3);
    await expect(formatTabs).toHaveText(['Text', 'Todo', 'Calendar']);
    await expect(preview).toHaveAttribute('data-capability-selected-destination', 'memo');
    await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);

    await formatTabs.filter({ hasText: 'Todo' }).click();
    await expect(preview).toHaveAttribute('data-capability-selected-destination', 'checklist');
    const todo = page.getByTestId('flow-capability-artifact-preview-todo');
    await expect(todo).toHaveAttribute('data-todo-row-count', '24');
    const rows = todo.getByTestId('flow-capability-artifact-preview-row');
    const checkboxes = todo.getByTestId('flow-capability-artifact-preview-todo-checkbox');
    const detailLinks = todo.getByTestId('flow-capability-artifact-preview-todo-detail-link');
    await expect(rows).toHaveCount(24);
    await expect(checkboxes).toHaveCount(24);
    await expect(detailLinks).toHaveCount(24);
    await expect(checkboxes.first()).toHaveAttribute('aria-readonly', 'true');
    await expect(checkboxes.first()).toHaveAttribute('data-todo-checkbox', 'readonly');

    const storageBeforeReadonlyClick = await localStorageRawSnapshot(page);
    await checkboxes.first().click({ force: true });
    expect(await localStorageRawSnapshot(page)).toEqual(storageBeforeReadonlyClick);

    await detailLinks.first().click();
    const itemPreview = page.getByTestId('public-flow-item-preview');
    await expect(itemPreview).toBeVisible();
    await expect(itemPreview).toHaveAttribute('data-public-preview', 'readonly');
    await expect(itemPreview.getByTestId('public-flow-item-preview-raw-memo')).toBeVisible();
    await itemPreview.getByTestId('public-flow-item-preview-close').click();
    await expect(itemPreview).toHaveCount(0);
    await expect(detailLinks.first()).toBeFocused();

    const lastDetailLink = detailLinks.nth(23);
    await lastDetailLink.scrollIntoViewIfNeeded();
    await expect(lastDetailLink).toBeInViewport();
    await lastDetailLink.click();
    await expect(itemPreview).toBeVisible();
    await expect(itemPreview).toHaveAttribute('data-public-preview', 'readonly');
    await itemPreview.getByTestId('public-flow-item-preview-close').click();
    await expect(itemPreview).toHaveCount(0);
    await expect(lastDetailLink).toBeFocused();
    await expect(lastDetailLink).toBeInViewport();
    expect(await localStorageRawSnapshot(page)).toEqual(storageBeforeReadonlyClick);

    const groupCount = await todo.getByTestId('flow-capability-artifact-preview-todo-group').count();
    await expect(todo.getByTestId('flow-capability-artifact-preview-todo-date-rail')).toHaveCount(groupCount);
  });

  for (const destination of [
    { id: 'memo', label: 'Text' },
    { id: 'checklist', label: 'Todo' },
  ] as const) {
    test(`${destination.label} saves as explicitly undated without asking for a Calendar anchor`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await installCleanStorage(page);
      await page.goto(PUBLIC_FLOW_ROUTE);

      const preview = page.getByTestId('public-flow-capability-result');
      await preview.locator(
        `[data-public-format-tab="true"][data-capability-destination="${destination.id}"]`,
      ).click();
      await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
      await page.getByTestId('public-flow-save-primary-mobile').click();
      await expect(page).toHaveURL(/\/my\?[^#]*\bview=flows\b/u);
      await expect(page.getByTestId('approved-my-plan-workspace')).toBeVisible();

      const savedRecords = await page.evaluate(() => (
        Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
          .filter((key): key is string => Boolean(key?.startsWith('flow:saved:')))
          .map((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'))
      ));
      expect(savedRecords).toHaveLength(1);
      expect(savedRecords[0]).toMatchObject({
        dateIntent: 'undated',
        selectedArtifactMode: destination.id,
      });
      expect(savedRecords[0]).not.toHaveProperty('anchor');
    });
  }

  test('Calendar is the only public format that requires a date before saving', async ({ page }) => {
    await installCleanStorage(page);
    for (const surface of [
      { width: 390, height: 844, saveTestId: 'public-flow-save-primary-mobile' },
      { width: 1440, height: 900, saveTestId: 'public-flow-save-primary' },
    ] as const) {
      await test.step(`${surface.width}px empty Calendar hierarchy`, async () => {
        await page.setViewportSize({ width: surface.width, height: surface.height });
        await page.goto(PUBLIC_FLOW_ROUTE);
        const preview = page.getByTestId('public-flow-capability-result');
        await preview.locator(
          '[data-public-format-tab="true"][data-capability-destination="calendar"]',
        ).click();
        await expect(preview).toHaveAttribute('data-capability-selected-destination', 'calendar');

        const save = page.getByTestId(surface.saveTestId);
        await expect(save).toBeVisible();
        await expect(save).toBeDisabled();
        await expect(save).toHaveText('이사일 설정 후 저장');
        const setAnchor = page.getByTestId('public-flow-calendar-set-anchor');
        await expect(setAnchor).toBeVisible();
        await expect(setAnchor).toBeEnabled();
        await expect(setAnchor).toHaveText('이사일 설정');
        const storageBefore = await localStorageRawSnapshot(page);

        await setAnchor.click();
        const editor = page.getByTestId('public-flow-personal-adjustment');
        await expect(editor).toBeVisible();
        await expect(editor).toHaveAttribute('data-adjustment-kind', 'anchor');
        await expect(editor.getByTestId('public-flow-adjustment-anchor-input')).toBeFocused();
        await editor.getByTestId('public-flow-adjustment-cancel').click();
        await expect(editor).toHaveCount(0);
        await expect(preview).toHaveAttribute('data-capability-selected-destination', 'calendar');
        await expect(page.getByTestId(surface.saveTestId)).toBeDisabled();
        await expect(page.getByTestId('public-flow-calendar-set-anchor')).toBeFocused();
        expect(await localStorageRawSnapshot(page)).toEqual(storageBefore);
        await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
      });
    }
  });

  test('public help uses a mobile sheet and a desktop anchored popover with focus return', async ({ page }) => {
    await installCleanStorage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PUBLIC_FLOW_ROUTE);

    const mobileTrigger = page.getByTestId('public-result-format-help-trigger');
    await mobileTrigger.click();
    await expect(page.getByTestId('public-result-format-help-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('public-result-format-help-sheet')).toHaveCount(0);
    await expect(mobileTrigger).toBeFocused();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    const desktopTrigger = page.getByTestId('public-result-format-help-trigger');
    await desktopTrigger.click();
    const popover = page.getByTestId('public-result-format-help-popover');
    await expect(popover).toBeVisible();
    await expect(popover).toHaveAttribute('data-flow-context-presentation', 'desktop-popover');
    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
    await expect(desktopTrigger).toBeFocused();
  });

  test('public warning uses a trapped mobile sheet and desktop modal dialog with focus return', async ({ page }) => {
    await installCleanStorage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/used-car-buying-check');

    const mobileTrigger = page.getByTestId('public-flow-warning-disclosure-trigger');
    await expect(mobileTrigger).toHaveAccessibleName(/주의사항/u);
    await mobileTrigger.click();
    const mobileSheet = page.getByTestId('public-flow-warning-disclosure-sheet');
    await expect(mobileSheet).toBeVisible();
    await expect(mobileSheet).toContainText('차량 상태를 보증하지 않습니다');
    await page.keyboard.press('Tab');
    expect(await mobileSheet.evaluate((sheet) => sheet.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(mobileSheet).toHaveCount(0);
    await expect(mobileTrigger).toBeFocused();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    const desktopTrigger = page.getByTestId('public-flow-warning-disclosure-trigger');
    await desktopTrigger.click();
    const dialog = page.getByTestId('public-flow-warning-disclosure-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('data-flow-context-presentation', 'desktop-dialog');
    await expect(dialog).toContainText('차량 상태를 보증하지 않습니다');
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(desktopTrigger).toBeFocused();
  });

  test('My Plan renders one date rail per group, 24 separate checkbox/link hit areas, and copy title', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedMovingPlan(page);
    await page.goto('/my?view=flows');

    const opener = page.getByTestId('my-flow-mobile-structure-open');
    await expect(opener).toContainText('사본 1 ·');
    await opener.click();
    const plan = page.getByTestId('approved-my-plan-workspace');
    await expect(plan).toBeVisible();
    await expect(plan.getByRole('heading', { name: /사본 1 ·/u })).toBeVisible();
    const todo = plan.getByTestId('my-plan-date-grouped-todos');
    await expect(todo).toHaveAttribute('data-todo-row-count', '24');
    const rows = todo.getByTestId('my-plan-todo-row');
    const checkboxes = todo.getByTestId('my-plan-todo-checkbox');
    const detailLinks = todo.getByTestId('my-plan-todo-detail-link');
    await expect(rows).toHaveCount(24);
    await expect(checkboxes).toHaveCount(24);
    await expect(detailLinks).toHaveCount(24);
    await expect(todo.getByTestId('my-plan-date-grouped-todos-next-badge')).toHaveCount(1);
    const groupCount = await todo.getByTestId('my-plan-date-grouped-todos-group').count();
    await expect(todo.getByTestId('my-plan-date-grouped-todos-date-rail')).toHaveCount(groupCount);

    const [checkboxBox, linkBox] = await Promise.all([
      checkboxes.first().boundingBox(),
      detailLinks.first().boundingBox(),
    ]);
    expect(checkboxBox).not.toBeNull();
    expect(linkBox).not.toBeNull();
    expect((checkboxBox?.x ?? 0) + (checkboxBox?.width ?? 0)).toBeLessThanOrEqual(
      (linkBox?.x ?? 0) + 1,
    );

    await detailLinks.first().click();
    const detailSheet = page.getByTestId('my-flow-item-detail-sheet');
    await expect(detailSheet).toBeVisible();
    await detailSheet.getByTestId('my-flow-item-detail-sheet-close').click();
    await expect(detailSheet).toHaveCount(0);
    await expect(detailLinks.first()).toBeFocused();

    const lastDetailLink = detailLinks.nth(23);
    await lastDetailLink.scrollIntoViewIfNeeded();
    await expect(lastDetailLink).toBeInViewport();
    await lastDetailLink.click();
    await expect(detailSheet).toBeVisible();
    await detailSheet.getByTestId('my-flow-item-detail-sheet-close').click();
    await expect(detailSheet).toHaveCount(0);
    await expect(lastDetailLink).toBeFocused();
    await expect(lastDetailLink).toBeInViewport();
  });

  test('mobile fallback Item editor is a separate full-screen sibling and clean Escape/cancel return focus', async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 844 });
    await seedMovingPlan(page);
    await page.goto('/my?view=flows');
    await page.getByTestId('my-flow-mobile-structure-open').click();
    const plan = page.getByTestId('approved-my-plan-workspace');
    const itemLink = plan.getByTestId('my-plan-todo-detail-link').first();
    await itemLink.click();
    const sheet = page.getByTestId('my-flow-item-detail-sheet');
    const openEdit = sheet.getByTestId('my-flow-quick-item-edit');
    await openEdit.click();

    let editor = page.locator(
      '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]',
    );
    await page.keyboard.press('Escape');
    await expect(editor).toHaveCount(0);
    await expect(page.getByTestId('my-flow-editor-discard-prompt')).toHaveCount(0);
    await expect(sheet).not.toHaveAttribute('aria-hidden', 'true');
    await expect(sheet.getByTestId('my-flow-quick-item-edit')).toBeFocused();

    await sheet.getByTestId('my-flow-quick-item-edit').click();
    await expect(editor).toHaveCount(1);
    await expect(editor).toHaveAttribute('data-editor-layout', 'mobile-full-screen');
    await expect(editor).toHaveAttribute('role', 'dialog');
    await expect(editor).toHaveAttribute('aria-modal', 'true');
    await expect(sheet).toHaveAttribute('aria-hidden', 'true');
    await expect(sheet).toHaveAttribute('data-editor-obscured', 'true');
    const editorBox = await editor.boundingBox();
    expect(editorBox).not.toBeNull();
    expect(editorBox?.x ?? -1).toBeCloseTo(0, 0);
    expect(editorBox?.y ?? -1).toBeCloseTo(0, 0);
    expect(editorBox?.width ?? 0).toBeGreaterThanOrEqual(766);
    expect(editorBox?.height ?? 0).toBeGreaterThanOrEqual(843);

    await editor.getByTestId('my-flow-editor-cancel').click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByTestId('my-flow-editor-discard-prompt')).toHaveCount(0);
    await expect(sheet.getByTestId('my-flow-quick-item-edit')).toBeFocused();
  });

  test('approved Item read actions and source links are 48px on mobile, stacked, and desktop', async ({ page }) => {
    test.setTimeout(90_000);
    await seedWorkoutPlan(page);
    for (const width of [390, 768, 1440] as const) {
      await test.step(`${width}px approved read detail targets`, async () => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const { detail } = await openApprovedFirstItem(page, width);
        await expectTargetsAtLeast48(
          detail.getByTestId('my-flow-quick-item-edit'),
          `${width}px quick edit`,
        );
        await expectTargetsAtLeast48(
          detail.getByTestId('my-flow-item-resource-link'),
          `${width}px source link`,
        );
      });
    }
  });

  test('approved Item editor keeps cancel, save, title, and date at 48px and persists a real edit', async ({ page }) => {
    test.setTimeout(120_000);
    await seedMovingPlan(page);
    for (const width of [390, 768, 1440] as const) {
      await test.step(`${width}px approved edit targets and save`, async () => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const { detail } = await openApprovedFirstItem(page, width);
        const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
        await expectTargetsAtLeast48(quickEdit, `${width}px read edit action`);
        await quickEdit.click();

        let editor = page.locator(
          '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible',
        );
        await expect(editor).toHaveCount(1);
        await expectTargetsAtLeast48(editor.getByTestId('my-flow-editor-cancel'), `${width}px editor cancel`);
        await expectTargetsAtLeast48(editor.getByTestId('my-flow-detail-save-changes'), `${width}px editor save`);
        await expectTargetsAtLeast48(editor.getByTestId('my-flow-detail-title-input'), `${width}px title input`);
        await expectTargetsAtLeast48(editor.getByTestId('my-flow-detail-date-input'), `${width}px date input`);

        await editor.getByTestId('my-flow-editor-cancel').click();
        await expect(editor).toHaveCount(0);
        await expect(page.getByTestId('my-flow-editor-discard-prompt')).toHaveCount(0);
        const restoredDetail = page.locator(
          '[data-testid="my-flow-item-detail"][data-detail-mode="execute"]:visible',
        );
        await expect(restoredDetail.getByTestId('my-flow-quick-item-edit')).toBeFocused();

        await restoredDetail.getByTestId('my-flow-quick-item-edit').click();
        editor = page.locator('[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible');
        const savedTitle = `48px 저장 확인 ${width}`;
        await editor.getByTestId('my-flow-detail-title-input').fill(savedTitle);
        await editor.getByTestId('my-flow-detail-date-input').fill('2026-09-02');
        await editor.getByTestId('my-flow-detail-save-changes').click();
        await expect(editor).toHaveCount(0);
        const savedDetail = page.locator(
          '[data-testid="my-flow-item-detail"][data-detail-mode="execute"]:visible',
        );
        await expect(savedDetail).toContainText(savedTitle);
        await expect(savedDetail).toContainText('9월 2일');
      });
    }
  });

  test('approved TXT, VTODO, VEVENT, and XLSX transfers perform the live effect before writing a receipt', async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedMovingPlan(page);
    await page.goto('/my?view=flows');

    await page.getByTestId('my-flow-mobile-structure-open').click();
    const plan = page.getByTestId('approved-my-plan-workspace');
    const firstItem = plan.getByTestId('my-plan-todo-detail-link').first();
    await firstItem.click();
    const detailSheet = page.getByTestId('my-flow-item-detail-sheet');
    const rawMemo = [
      '현장 확인 메모',
      '- [ ] 포장재 준비',
      '- [x] 계약서 보관',
      '- [ ] 열쇠 인계 확인',
    ].join('\n');
    await detailSheet.getByTestId('my-flow-quick-item-edit').click();
    const mobileEditor = page.locator(
      '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible',
    );
    await mobileEditor.getByTestId('my-flow-detail-memo').fill(rawMemo);
    await mobileEditor.getByTestId('my-flow-detail-save-changes').click();
    await expect(mobileEditor).toHaveCount(0);
    await expect(detailSheet.getByTestId('my-flow-detail-raw-memo')).toContainText(rawMemo);
    await detailSheet.getByTestId('my-flow-item-detail-sheet-close').click();
    await expect(detailSheet).toHaveCount(0);

    const transferEntry = plan.getByTestId('my-flow-export-entry');
    await expectTargetsAtLeast48(transferEntry, '390px transfer entry');
    await transferEntry.click();
    const panel = page.getByTestId('my-flow-export-panel');
    await expect(panel).toHaveAttribute('data-saved-transfer-surface', 'confirmation');
    const tabs = panel.locator('[role="tab"][data-export-format]');
    await expect(tabs).toHaveCount(4);
    expect(await tabs.evaluateAll((nodes) => nodes.map(
      (node) => node.getAttribute('data-export-format'),
    ))).toEqual(['txt', 'vtodo', 'vevent', 'xlsx']);
    for (const width of [375, 390] as const) {
      await page.setViewportSize({ width, height: 844 });
      await expectTargetsAtLeast48(transferEntry, `${width}px transfer entry`);
      await expectTargetsAtLeast48(
        page.getByTestId('my-plan-transfer-back'),
        `${width}px transfer back`,
      );
      await expectTargetsAtLeast48(tabs, `${width}px transfer format tabs`);
      await expectTargetsAtLeast48(
        panel.getByTestId('my-flow-export-approved-cta'),
        `${width}px transfer CTA`,
      );
      const tabBoxes = await tabs.evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }));
      expect(new Set(tabBoxes.map((box) => Math.round(box.y))).size).toBe(1);
      expect(tabBoxes.every((box) => box.height >= 47.5)).toBe(true);
      expect(tabBoxes.every((box) => box.width >= 70)).toBe(true);
      expect(tabBoxes.slice(1).every((box, index) => box.x > tabBoxes[index].x)).toBe(true);
    }

    const transferSheet = page.getByTestId('my-plan-transfer-sheet');
    for (const transferTab of [
      { testId: 'my-flow-transfer-tab-memo', format: 'txt' },
      { testId: 'my-flow-transfer-tab-checklist', format: 'vtodo' },
      { testId: 'my-flow-transfer-tab-calendar', format: 'vevent' },
      { testId: 'my-flow-transfer-tab-sheet', format: 'xlsx' },
    ] as const) {
      await panel.getByTestId(transferTab.testId).click();
      await expect(panel.getByTestId('my-flow-export-destination-preview')).toHaveAttribute(
        'data-export-preview-format',
        transferTab.format,
      );
      const helpTrigger = panel.getByTestId('my-flow-transfer-format-help-trigger');
      await helpTrigger.scrollIntoViewIfNeeded();
      const scrollBefore = await transferSheet.evaluate((sheet) => sheet.scrollTop);
      await helpTrigger.click();
      const helpSheet = page.getByTestId('my-flow-transfer-format-help-sheet');
      await expect(helpSheet).toHaveAttribute('data-flow-context-presentation', 'mobile-sheet');
      await page.keyboard.press('Escape');
      await expect(helpSheet).toHaveCount(0);
      await expect(transferSheet).toBeVisible();
      await expect(panel).toBeVisible();
      await expect(helpTrigger).toBeFocused();
      await expect(panel.getByTestId('my-flow-export-destination-preview')).toHaveAttribute(
        'data-export-preview-format',
        transferTab.format,
      );
      await expect.poll(() => transferSheet.evaluate((sheet) => sheet.scrollTop))
        .toBeCloseTo(scrollBefore, 0);
    }

    await panel.getByTestId('my-flow-transfer-tab-memo').click();
    const textPreview = panel.getByTestId('my-flow-export-destination-preview');
    await expect(textPreview).toHaveAttribute('data-export-preview-format', 'txt');
    await expect(textPreview.getByTestId('my-flow-export-text-preview-scope')).toHaveText(
      '전체 24개 중 1개 미리보기 · 복사할 때는 전체 24개가 포함됩니다.',
    );
    const partialText = await textPreview.getByTestId('my-flow-export-text-preview').textContent();
    expect(partialText).toContain(rawMemo);
    expect(partialText?.match(/^\d+\. /gmu)).toHaveLength(1);
    expect(partialText).not.toContain('2. 이사할 집 하자 점검하기');
    await expect(panel.getByTestId('my-flow-transfer-receipt')).toHaveCount(0);
    await panel.getByTestId('my-flow-export-approved-cta').click();
    const clipboardText = (await page.evaluate(() => navigator.clipboard.readText()))
      .replaceAll('\r\n', '\n');
    expect(clipboardText).toContain(rawMemo);
    expect(clipboardText.match(/^\d+\. /gmu)).toHaveLength(24);
    expect(clipboardText.match(/^- \[[ x]\] /gmu)).toHaveLength(3);
    await expectSuccessfulApprovedTransferReceipt(page, 'txt');

    await panel.getByTestId('my-flow-transfer-tab-checklist').click();
    await expect(panel.getByTestId('my-flow-export-destination-preview')).toHaveAttribute(
      'data-export-preview-format',
      'vtodo',
    );
    await expect(panel.getByTestId('my-flow-transfer-receipt')).toHaveAttribute(
      'data-transfer-format',
      'memo',
    );
    const vtodoDownloadPromise = page.waitForEvent('download');
    await panel.getByTestId('my-flow-export-approved-cta').click();
    const vtodoDownload = await vtodoDownloadPromise;
    expect(vtodoDownload.suggestedFilename()).toMatch(/\.ics$/u);
    const vtodoPath = await vtodoDownload.path();
    expect(vtodoPath).toBeTruthy();
    const vtodoBytes = fs.readFileSync(vtodoPath!);
    const vtodo = vtodoBytes.toString('utf8');
    expect(vtodoBytes.length).toBeGreaterThan(1000);
    expect(vtodo.match(/BEGIN:VTODO/gu)).toHaveLength(24);
    expect(vtodo).not.toContain('BEGIN:VEVENT');
    expect(vtodo.replaceAll(/\r\n[ \t]/gu, '').replaceAll('\\n', '\n')).toContain(rawMemo);
    await expectSuccessfulApprovedTransferReceipt(page, 'vtodo');

    await panel.getByTestId('my-flow-transfer-tab-calendar').click();
    await expect(panel.getByTestId('my-flow-export-destination-preview')).toHaveAttribute(
      'data-export-preview-format',
      'vevent',
    );
    await expect(panel.getByTestId('my-flow-transfer-receipt')).toHaveAttribute(
      'data-transfer-format',
      'checklist',
    );
    const veventDownloadPromise = page.waitForEvent('download');
    await panel.getByTestId('my-flow-export-approved-cta').click();
    const veventDownload = await veventDownloadPromise;
    expect(veventDownload.suggestedFilename()).toMatch(/\.ics$/u);
    const veventPath = await veventDownload.path();
    expect(veventPath).toBeTruthy();
    const veventBytes = fs.readFileSync(veventPath!);
    const vevent = veventBytes.toString('utf8');
    expect(veventBytes.length).toBeGreaterThan(1000);
    expect(vevent.match(/BEGIN:VEVENT/gu)).toHaveLength(24);
    expect(vevent).not.toContain('BEGIN:VTODO');
    expect(vevent.replaceAll(/\r\n[ \t]/gu, '').replaceAll('\\n', '\n')).toContain(rawMemo);
    await expectSuccessfulApprovedTransferReceipt(page, 'vevent');

    await panel.getByTestId('my-flow-transfer-tab-sheet').click();
    const xlsxPreview = panel.getByTestId('my-flow-export-destination-preview');
    await expect(xlsxPreview).toHaveAttribute('data-export-preview-format', 'xlsx');
    await expect(xlsxPreview.getByTestId('my-flow-export-xlsx-preview').locator('tbody tr'))
      .toHaveCount(24);

    const warningTrigger = panel.getByTestId('my-flow-transfer-excel-warning-trigger');
    await expect(warningTrigger).toContainText('!');
    await warningTrigger.click();
    const warningSheet = page.getByTestId('my-flow-transfer-excel-warning-sheet');
    await expect(warningSheet).toBeVisible();
    await expect(warningSheet).toContainText('자동 동기화되지 않아요');
    await page.keyboard.press('Escape');
    await expect(warningSheet).toHaveCount(0);
    await expect(transferSheet).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(warningTrigger).toBeFocused();

    await expect(panel.getByTestId('my-flow-transfer-receipt')).toHaveAttribute(
      'data-transfer-format',
      'calendar',
    );
    const xlsxDownloadPromise = page.waitForEvent('download');
    await panel.getByTestId('my-flow-export-approved-cta').click();
    const xlsxDownload = await xlsxDownloadPromise;
    expect(xlsxDownload.suggestedFilename()).toMatch(/\.xlsx$/u);
    const xlsxPath = await xlsxDownload.path();
    expect(xlsxPath).toBeTruthy();
    const xlsxBytes = fs.readFileSync(xlsxPath!);
    expect(xlsxBytes.subarray(0, 2).toString('utf8')).toBe('PK');
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = (
      (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      xlsxBytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const worksheet = workbook.getWorksheet('계획');
    expect(worksheet).toBeTruthy();
    expect(worksheet!.rowCount).toBe(25);
    const memoCells = Array.from({ length: 24 }, (_, index) => (
      String(worksheet!.getCell(index + 2, 6).value ?? '')
    ));
    expect(memoCells.some((value) => value.includes(rawMemo))).toBe(true);
    await expectSuccessfulApprovedTransferReceipt(page, 'xlsx');
  });

  test('a legacy skipped recurrence can complete inline, Undo, and leave sibling occurrences and series untouched', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedRoutinePlan(page);
    await page.goto('/calendar');
    await page.getByTestId('my-flow-month-picker').fill('2026-08');
    await page.locator('.fc-daygrid-day[data-date="2026-08-27"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();

    let selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    let occurrences = selectedDay.locator('article[data-occurrence-id]');
    await expect(occurrences).toHaveCount(1);
    const occurrenceId = await occurrences.first().getAttribute('data-occurrence-id');
    expect(occurrenceId).toBeTruthy();
    await page.locator('.fc-daygrid-day[data-date="2026-07-27"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    const siblingOccurrence = page.getByTestId('my-flow-calendar-selected-day')
      .locator('article[data-occurrence-id]');
    await expect(siblingOccurrence).toHaveCount(1);
    const siblingOccurrenceId = await siblingOccurrence.getAttribute('data-occurrence-id');
    expect(siblingOccurrenceId).toBeTruthy();
    expect(siblingOccurrenceId).not.toBe(occurrenceId);
    const revisionId = occurrenceId!.split(':occurrence:')[0];
    const seriesId = revisionId.replace(/:revision:\d+:\d{4}-\d{2}-\d{2}$/u, '');
    expect(seriesId).not.toBe(revisionId);

    await page.evaluate(({ targetOccurrenceId, targetRevisionId, targetSeriesId }) => {
      const at = '2026-08-10T00:00:00.000Z';
      const key = `washer-tub-clean-monthly::${targetOccurrenceId}`;
      window.localStorage.setItem('flow:my-flow:occurrence-execution', JSON.stringify({
        [key]: {
          occurrenceId: targetOccurrenceId,
          seriesId: targetSeriesId,
          revisionId: targetRevisionId,
          state: 'skipped',
          updatedAt: at,
          skippedAt: at,
          history: [{ from: 'pending', to: 'skipped', at }],
        },
      }));
    }, {
      targetOccurrenceId: occurrenceId!,
      targetRevisionId: revisionId,
      targetSeriesId: seriesId,
    });

    await page.reload();
    await page.getByTestId('my-flow-month-picker').fill('2026-08');
    await page.locator('.fc-daygrid-day[data-date="2026-08-27"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    const target = selectedDay.locator(`article[data-occurrence-id="${occurrenceId}"]`);
    await expect(target).toHaveAttribute('data-occurrence-state', 'skipped');
    await expect(target.getByTestId('personal-draft-occurrence-row-status')).toHaveCount(0);
    await expect(target.getByTestId('my-flow-routine-progress-pill')).toHaveText('이번 회차 다시 진행');
    await target.getByRole('button', { name: /계획에서 열기/u }).click();
    const approvedDetail = page.getByTestId('my-flow-calendar-item-inspector-content');
    await expect(approvedDetail).toBeVisible();
    await expect(approvedDetail.getByText(/건너뜀|보류/u)).toHaveCount(0);

    const completion = target.getByTestId('my-flow-task-complete-control');
    await expect(completion).toHaveCount(1);
    await expect(completion).toBeEnabled();
    await expect(completion).not.toBeChecked();
    await completion.click();
    await expect(target).toHaveAttribute('data-occurrence-state', 'done');
    await expect(completion).toBeChecked();

    const snackbar = page.getByTestId('my-flow-completion-snackbar');
    await expect(snackbar).toHaveAttribute('data-completion-result', 'completed');
    const undo = snackbar.getByTestId('my-flow-completion-undo');
    await expect(undo).toBeFocused();
    await undo.click();
    await expect(snackbar).toHaveCount(0);
    await expect(target).toHaveAttribute('data-occurrence-state', 'reopened');
    await expect(completion).not.toBeChecked();
    await expect(completion).toBeFocused();

    const persisted = await page.evaluate(() => ({
      occurrence: JSON.parse(
        window.localStorage.getItem('flow:my-flow:occurrence-execution') ?? '{}',
      ) as Record<string, { occurrenceId: string; state: string }>,
      seriesChecks: window.localStorage.getItem(
        'flow_builder_mvp_checks_washer-tub-clean-monthly',
      ),
    }));
    expect(Object.values(persisted.occurrence)).toHaveLength(1);
    expect(Object.values(persisted.occurrence)[0]).toMatchObject({
      occurrenceId,
      state: 'reopened',
    });
    expect(persisted.seriesChecks).toBeNull();

    await page.locator('.fc-daygrid-day[data-date="2026-07-27"]')
      .getByTestId('my-flow-calendar-date-button')
      .click();
    const siblingAfterUndo = page.getByTestId('my-flow-calendar-selected-day')
      .locator(`article[data-occurrence-id="${siblingOccurrenceId}"]`);
    await expect(siblingAfterUndo).toHaveAttribute('data-occurrence-state', 'pending');
    await expect(siblingAfterUndo.getByTestId('my-flow-task-complete-control')).not.toBeChecked();
  });

  test('Calendar Item detail stays on Calendar and edit cancel preserves the selected date inspector', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar?demo=ux20');
    const selectedDate = '2026-05-28';
    const dateButton = page.locator(`.fc-daygrid-day[data-date="${selectedDate}"]`)
      .getByTestId('my-flow-calendar-date-button');
    await dateButton.click();

    const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
    const scheduleRow = selectedDay.locator(
      '[data-testid="my-flow-execution-row-shell"][data-calendar-item-kind="task"]',
    ).first();
    await expect(scheduleRow).toBeVisible();
    await expect(scheduleRow.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await scheduleRow.getByRole('button', { name: /계획에서 열기/u }).click();

    await expect.poll(() => new URL(page.url()).pathname).toBe('/calendar');
    await expect(page.getByTestId('my-flow-calendar-item-inspector-content')).toBeVisible();
    await expect(page.getByTestId('my-flow-calendar-item-inspector-region')).toBeVisible();
    await expect(page.locator(
      `.fc-daygrid-day[data-date="${selectedDate}"].my-flow-calendar-selected-date`,
    )).toBeVisible();

    const inspector = page.getByTestId('my-flow-calendar-item-inspector-content');
    await expect(inspector.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    const edit = inspector.getByTestId('my-flow-quick-item-edit');
    await edit.click();
    await expect(inspector.getByTestId('my-flow-detail-title-input')).toBeVisible();
    await expect(inspector.getByTestId('my-flow-editor-cancel')).toHaveCount(1);
    await expect(inspector.getByTestId('my-flow-detail-edit-actions').getByRole('button'))
      .toHaveCount(1);
    await inspector.getByTestId('my-flow-editor-cancel').click();
    const discardPrompt = inspector.getByTestId('my-flow-editor-discard-prompt');
    await expect(discardPrompt).toHaveCount(0);
    await expect(inspector.getByTestId('my-flow-detail-title-input')).toHaveCount(0);
    await expect(inspector.getByTestId('my-flow-quick-item-edit')).toBeFocused();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/calendar');
    await expect(selectedDay).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calendar?demo=ux20');
    const mobileDateButton = page.locator(`.fc-daygrid-day[data-date="${selectedDate}"]`)
      .getByTestId('my-flow-calendar-date-button');
    await mobileDateButton.click();

    const daySheet = page.getByTestId('my-flow-calendar-day-sheet');
    const mobileScheduleRow = daySheet.locator(
      '[data-testid="my-flow-execution-row-shell"][data-calendar-item-kind="task"]',
    ).first();
    await expect(mobileScheduleRow).toBeVisible();
    await mobileScheduleRow.getByRole('button', { name: /계획에서 열기/u }).click();
    await expect(daySheet).toHaveCount(0);

    const detailSheet = page.getByTestId('my-flow-item-detail-sheet');
    await expect(detailSheet).toBeVisible();
    const mobileEdit = detailSheet.getByTestId('my-flow-quick-item-edit');
    await mobileEdit.click();
    const mobileEditor = page.locator(
      '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]',
    );
    await page.keyboard.press('Escape');
    await expect(mobileEditor).toHaveCount(0);
    await expect(detailSheet).toBeVisible();
    await expect(detailSheet).not.toHaveAttribute('aria-hidden', 'true');
    await expect(detailSheet.getByTestId('my-flow-quick-item-edit')).toBeFocused();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/calendar');
    await expect(page.locator(
      `.fc-daygrid-day[data-date="${selectedDate}"].my-flow-calendar-selected-date`,
    )).toBeVisible();
  });

  test('savedPlanLibrary=off returns to the legacy lane without rewriting saved-plan storage', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/flows');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('flow:saved:moving-d30-basic', JSON.stringify({
        slug: 'moving-d30-basic',
        savedAt: '2026-08-10T08:10:00+09:00',
        selectedArtifactMode: 'calendar',
        dateIntent: 'custom',
        anchor: '2026-09-01',
      }));
      window.localStorage.setItem(
        'flow:moving-d30-basic:anchorDate',
        JSON.stringify({ mode: 'custom', anchor: '2026-09-01' }),
      );
    });
    const before = await localStorageRawSnapshot(page);

    await page.goto('/my?view=flows');
    await expect(page.locator('main[data-saved-library-flag="on"]')).toBeVisible();
    await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();
    expect(await localStorageRawSnapshot(page)).toEqual(before);

    await page.goto('/my?view=flows&savedPlanLibrary=off');
    await expect(page.locator('main[data-saved-library-flag="off"]')).toBeVisible();
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toBeVisible();
    await expect(page.getByTestId('my-plan-sort-rail-trigger')).toHaveCount(0);
    expect(fs.readFileSync('app/globals.css', 'utf8')).toContain('--flowme-control-height: 2.75rem;');
    const appClientSource = fs.readFileSync('components/flow/AppClient.tsx', 'utf8');
    expect(appClientSource).toContain(
      "myFlowSavedPlanLibraryEnabled === true ? ' !min-h-12' : ''",
    );
    expect(await localStorageRawSnapshot(page)).toEqual(before);

    await page.goto('/my?view=flows');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toBeVisible();
    expect(await localStorageRawSnapshot(page)).toEqual(before);
  });

  test('three approved surfaces keep composition, overflow, clipping, and 48px contracts at all nine breakpoints', async ({ page }) => {
    test.setTimeout(300_000);
    const widths = [375, 390, 430, 640, 767, 768, 1023, 1024, 1279, 1280, 1440] as const;
    const browserIssues = collectBrowserQualityIssues(page);

    for (const width of widths) {
      await test.step(`${width}px public preview`, async () => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const mobile = width <= 767;
        const stacked = width >= 768 && width <= 1023;
        const compact = width >= 1024 && width <= 1279;
        const issueStart = browserIssues.length;
        await page.goto(PUBLIC_FLOW_ROUTE);
        const hero = page.getByTestId('public-flow-hero');
        const composition = hero.locator('[data-approved-desktop-composition="catalog-result-context"]');
        await expect(composition).toHaveAttribute(
          'data-workspace-breakpoints',
          'mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280+',
        );
        await expect(hero.getByTestId('flow-save-before-primary-result')).toBeVisible();
        await expect(hero.getByTestId('flow-save-before-decision')).toBeVisible();
        if (mobile) {
          const stickyFooter = page.getByTestId('public-flow-mobile-save-cta');
          await expect(stickyFooter).toBeVisible();
          await expect(page.getByTestId('public-flow-save-actions')).toBeHidden();
          const footerBounds = await stickyFooter.evaluate((footer) => {
            const rect = footer.getBoundingClientRect();
            return {
              position: window.getComputedStyle(footer).position,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
              viewportHeight: window.innerHeight,
              viewportWidth: window.innerWidth,
            };
          });
          expect(footerBounds.position).toBe('fixed');
          expect(footerBounds.left).toBeGreaterThanOrEqual(-1);
          expect(footerBounds.right).toBeLessThanOrEqual(footerBounds.viewportWidth + 1);
          expect(footerBounds.bottom).toBeLessThanOrEqual(footerBounds.viewportHeight + 1);
        } else {
          await expect(page.getByTestId('public-flow-mobile-save-cta')).toBeHidden();
          await expect(page.getByTestId('public-flow-save-actions')).toBeVisible();
        }
        const catalog = hero.getByTestId('flow-save-before-desktop-catalog');
        if (!mobile) await expect(catalog).toBeVisible();
        else await expect(catalog).toBeHidden();
        if (compact) {
          const [catalogBox, resultBox, decisionBox] = await Promise.all([
            catalog.boundingBox(),
            hero.getByTestId('flow-save-before-primary-result').boundingBox(),
            hero.getByTestId('flow-save-before-decision').boundingBox(),
          ]);
          expect(catalogBox).not.toBeNull();
          expect(resultBox).not.toBeNull();
          expect(decisionBox).not.toBeNull();
          expect(catalogBox?.x ?? 0).toBeLessThan(resultBox?.x ?? 0);
          expect(Math.abs((resultBox?.x ?? 0) - (decisionBox?.x ?? 0))).toBeLessThanOrEqual(2);
        }

        const publicQuality = await inspectApprovedWorkspaceQuality(page, [
          '[data-testid="public-flow-hero"] [data-public-format-tab="true"]',
          '[data-testid="public-flow-adjust-entry-mobile"]',
          '[data-testid="public-flow-save-primary-mobile"]',
          '[data-testid="public-flow-adjust-entry"]',
          '[data-testid="public-flow-save-primary"]',
        ]);
        expect(publicQuality.horizontalOverflow, `${width}px public overflow`).toBeLessThanOrEqual(1);
        expect(publicQuality.tooSmall, `${width}px public targets`).toEqual([]);
        expect(publicQuality.clipped, `${width}px public clipping`).toEqual([]);
        expect(publicQuality.targetCount).toBeGreaterThan(2);
        expect(browserIssues.slice(issueStart), `${width}px public browser issues`).toEqual([]);
        expect(compact || mobile || stacked || width >= 1280).toBe(true);
      });

      await test.step(`${width}px My Plan`, async () => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const mobile = width <= 767;
        const stacked = width >= 768 && width <= 1023;
        const compact = width >= 1024 && width <= 1279;
        const issueStart = browserIssues.length;
        await page.goto('/my?demo=ux5&view=flows');
        await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveAttribute(
          'data-library-count',
          '5',
        );
        await expect(page.getByTestId(
          mobile ? 'my-plan-sort-mobile-trigger' : 'my-plan-sort-rail-trigger',
        )).toBeVisible();

        const listQuality = await inspectApprovedWorkspaceQuality(page);
        expect(listQuality.horizontalOverflow, `${width}px list overflow`).toBeLessThanOrEqual(1);
        expect(listQuality.tooSmall, `${width}px list targets`).toEqual([]);
        expect(listQuality.clipped, `${width}px list clipping`).toEqual([]);
        expect(listQuality.targetCount).toBeGreaterThan(0);

        const opener = mobile
          ? page.getByTestId('my-flow-mobile-structure-open').first()
          : page.getByTestId('my-flow-library-row').first();
        await opener.click();
        const approvedPlan = page.getByTestId('approved-my-plan-workspace');
        await expect(approvedPlan).toBeVisible();

        if (mobile) {
          await expect(page.getByTestId('my-flow-mobile-workspace')).toBeVisible();
          await expect(page.getByTestId('my-flow-library-workspace')).toHaveCount(0);
        } else {
          const workspace = page.getByTestId('my-flow-library-workspace');
          await expect(workspace).toBeVisible();
          await expect(workspace).toHaveAttribute(
            'data-workspace-breakpoints',
            'mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280+',
          );
          const railBox = await workspace.getByTestId('my-flow-library-rail').boundingBox();
          const detailBox = await workspace.getByTestId('my-flow-library-detail').boundingBox();
          expect(railBox).not.toBeNull();
          expect(detailBox).not.toBeNull();
          if (stacked) {
            expect(detailBox?.y ?? 0).toBeGreaterThanOrEqual(
              (railBox?.y ?? 0) + (railBox?.height ?? 0) - 1,
            );
          } else {
            expect(detailBox?.x ?? 0).toBeGreaterThan(railBox?.x ?? 0);
          }

          const inspector = approvedPlan.getByTestId('my-plan-item-inspector');
          if (compact) {
            await expect(inspector).toBeHidden();
          } else if (width >= 1280) {
            await expect(inspector).toBeVisible();
            const todoBox = await approvedPlan.getByTestId('my-plan-date-grouped-todos').boundingBox();
            const inspectorBox = await inspector.boundingBox();
            expect(inspectorBox?.x ?? 0).toBeGreaterThan(todoBox?.x ?? 0);
          }
        }

        const detailQuality = await inspectApprovedWorkspaceQuality(page);
        expect(detailQuality.horizontalOverflow, `${width}px detail overflow`).toBeLessThanOrEqual(1);
        expect(detailQuality.tooSmall, `${width}px detail targets`).toEqual([]);
        expect(detailQuality.clipped, `${width}px detail clipping`).toEqual([]);
        expect(detailQuality.targetCount).toBeGreaterThan(2);
        expect(browserIssues.slice(issueStart), `${width}px My Plan browser issues`).toEqual([]);
      });

      await test.step(`${width}px Calendar`, async () => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const mobile = width <= 767;
        const issueStart = browserIssues.length;
        await page.goto('/calendar?demo=ux20');
        const workspace = page.getByTestId('my-flow-calendar-workspace');
        await expect(workspace).toHaveAttribute(
          'data-workspace-breakpoints',
          'mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280+',
        );
        await expect(workspace).toHaveAttribute(
          'data-calendar-composition',
          /^filter-month-day(?:-item-inspector)?$/u,
        );
        await expect(workspace.getByTestId('my-flow-calendar-filter-rail')).toBeVisible();
        await expect(workspace.getByTestId('my-flow-calendar-card')).toBeVisible();

        await page.locator('.fc-daygrid-day[data-date="2026-05-28"]')
          .getByTestId('my-flow-calendar-date-button')
          .click();
        if (mobile) {
          await expect(page.getByTestId('my-flow-calendar-day-sheet')).toBeVisible();
        } else {
          const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
          await expect(selectedDay).toBeVisible();
          if (width >= 1280) {
            const scheduledRow = selectedDay.locator(
              '[data-testid="my-flow-execution-row-shell"][data-calendar-item-kind="task"]',
            ).first();
            await scheduledRow.getByRole('button', { name: /계획에서 열기/u }).click();
            await expect(workspace).toHaveAttribute(
              'data-calendar-composition',
              'filter-month-day-item-inspector',
            );
            await expect(page.getByTestId('my-flow-calendar-item-inspector-region')).toBeVisible();
          }
        }

        const calendarQuality = await inspectApprovedWorkspaceQuality(page, [
          '[data-testid="my-flow-calendar-workspace"] button[aria-label="이전 달"]',
          '[data-testid="my-flow-calendar-workspace"] button[aria-label="다음 달"]',
          '[data-testid="my-flow-month-picker"]',
          '[data-testid="my-flow-calendar-selected-day"] [data-testid="my-flow-task-complete-label"]',
          '[data-testid="my-flow-calendar-selected-day"] button',
          '[data-testid="my-flow-calendar-item-inspector-region"] button',
        ]);
        expect(calendarQuality.horizontalOverflow, `${width}px Calendar overflow`).toBeLessThanOrEqual(1);
        expect(calendarQuality.tooSmall, `${width}px Calendar targets`).toEqual([]);
        expect(calendarQuality.clipped, `${width}px Calendar clipping`).toEqual([]);
        expect(calendarQuality.targetCount).toBeGreaterThan(2);
        expect(browserIssues.slice(issueStart), `${width}px Calendar browser issues`).toEqual([]);
      });
    }
  });
});
