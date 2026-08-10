import { expect, test, type Locator, type Page } from '@playwright/test';

import { getOpenMyFlowItemDetail } from './helpers/my-flow-library';

const FLOW_SLUG = 'moving-d30-basic';
const SAVED_FLOW_KEY = `flow:saved:${FLOW_SLUG}`;
const ANCHOR_KEY = `flow:${FLOW_SLUG}:anchorDate`;

type P008InstrumentedWindow = Window & {
  __p008LocalStorageMutations?: number;
  __p008LocalStorageMutationLog?: Array<{
    operation: 'setItem' | 'removeItem' | 'clear';
    key?: string;
    value?: string;
  }>;
};

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectPageQuality(page: Page) {
  const quality = await page.evaluate(() => {
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
      const labelText = Array.from(control.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      return [
        element.getAttribute('aria-label'),
        element.getAttribute('aria-labelledby'),
        element.getAttribute('title'),
        labelText,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim().length === 0;
    }).length;
    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount,
    };
  });

  expect(quality).toEqual({ horizontalOverflow: 0, unnamedInteractiveCount: 0 });
}

async function expectLibraryShell(
  page: Page,
  count: number,
  sizeState: 'empty' | 'single' | 'small' | 'searchable',
) {
  const shell = page.getByTestId('my-flow-saved-library-shell');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-saved-library-flag', 'on');
  await expect(shell).toHaveAttribute('data-library-count', String(count));
  await expect(shell).toHaveAttribute('data-library-size-state', sizeState);
  return shell;
}

async function seedOneDatedPlan(page: Page) {
  await page.addInitScript(({ savedFlowKey, anchorKey, flowSlug }) => {
    window.localStorage.clear();
    window.localStorage.setItem(savedFlowKey, JSON.stringify({
      slug: flowSlug,
      savedAt: '2026-05-28T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      dateIntent: 'custom',
      anchor: '2026-06-26',
    }));
    window.localStorage.setItem(
      anchorKey,
      JSON.stringify({ mode: 'custom', anchor: '2026-06-26' }),
    );
  }, { savedFlowKey: SAVED_FLOW_KEY, anchorKey: ANCHOR_KEY, flowSlug: FLOW_SLUG });
}

async function seedUndatedSavedPlan(page: Page, flowSlug: string) {
  await page.goto('/flows');
  await page.evaluate((slug) => {
    window.localStorage.clear();
    window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
      slug,
      savedAt: '2026-05-28T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
      dateIntent: 'none',
    }));
  }, flowSlug);
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
    (window as P008InstrumentedWindow).__p008LocalStorageMutationLog ?? []
  ));
}

function chooseBroadHangulQuery(titles: string[]): string {
  const frequencies = new Map<string, number>();
  titles.forEach((title) => {
    // The approved library displays a computed `사본 n ·` prefix, but search
    // intentionally indexes the original title. Do not accidentally choose a
    // character that exists only in that display-only prefix.
    const originalTitle = title.replace(/^\s*사본\s+\d+\s*·\s*/u, '');
    const unique = new Set(Array.from(originalTitle).filter((character) => /[\uAC00-\uD7A3]/u.test(character)));
    unique.forEach((character) => {
      frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
    });
  });
  return Array.from(frequencies.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? '';
}

async function firstOpenItemButton(plan: Locator): Promise<Locator> {
  const approvedDetailLink = plan.getByTestId('my-plan-todo-detail-link').first();
  const firstEntry = plan.getByTestId('my-flow-execution-row-shell').first();
  await expect.poll(async () => (
    await approvedDetailLink.isVisible().catch(() => false)
      || await firstEntry.isVisible().catch(() => false)
  )).toBe(true);
  if (await approvedDetailLink.isVisible().catch(() => false)) return approvedDetailLink;

  await expect(firstEntry).toBeVisible();
  const open = firstEntry.getByRole('button', { name: /열기/u }).first();
  await expect(open).toBeVisible();
  return open;
}

async function enterItemEditMode(detail: Locator): Promise<Locator> {
  const page = detail.page();
  const itemId = await detail.getAttribute('data-item-id');
  expect(itemId).toBeTruthy();
  const quickEdit = detail.getByTestId('my-flow-quick-item-edit');
  if (await quickEdit.isVisible().catch(() => false)) {
    await quickEdit.click();
  } else {
    await detail.locator('[data-my-flow-item-edit-entry="true"]').first().click();
  }
  const editor = page.locator(
    `[data-testid="my-flow-item-detail"][data-item-id="${itemId}"][data-detail-mode="edit"]:visible`,
  );
  await expect(editor).toHaveCount(1);
  await expect(editor.getByTestId('my-flow-detail-title-input')).toBeVisible();
  return editor;
}

test.describe('P35 P0-08 saved-plan library', () => {
  test('390: zero plans has one discovery action and no synthetic Today or controls', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/my');

    const shell = await expectLibraryShell(page, 0, 'empty');
    await expect(shell.getByTestId('my-flow-today-summary')).toHaveCount(0);
    await expect(shell.getByTestId('my-flow-empty-state')).toBeVisible();
    await expect(shell.locator('[data-action-role="discover-public-flow"]')).toHaveCount(1);
    await expect(shell.getByTestId('my-flow-search')).toHaveCount(0);
    await expect(shell.getByTestId('my-flow-library-rail-search')).toHaveCount(0);
    await expect(shell.getByTestId('my-flow-mobile-structure-row')).toHaveCount(0);
    await expect(shell.getByRole('tablist', { name: 'My Flow 보기 방식' })).toHaveCount(0);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('390: one ordinary plan stays in the library and Today reuses its saved identity', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: new Date('2026-05-28T09:00:00+09:00') });
    await seedOneDatedPlan(page);
    await page.goto('/my');

    const shell = await expectLibraryShell(page, 1, 'single');
    expect(new URL(page.url()).searchParams.get('flow')).toBeNull();
    await expect(shell.getByTestId('my-flow-mobile-workspace')).toHaveCount(0);
    const planRow = shell.getByTestId('my-flow-mobile-structure-row');
    await expect(planRow).toHaveCount(1);
    await expect(planRow).toHaveAttribute('data-saved-identity', FLOW_SLUG);
    await expect(shell.getByTestId('my-flow-search')).toHaveCount(0);
    await expect(shell.locator('[data-testid^="my-flow-list-filter-"]')).toHaveCount(0);

    const today = shell.getByTestId('my-flow-today-summary');
    await expect(today).toBeVisible();
    await expect(today).toHaveAttribute('data-today-source', 'effective_execution');
    await expect(today).toHaveAttribute('data-write-owner', 'none');
    const todayItems = today.getByTestId('my-flow-today-item');
    expect(await todayItems.count()).toBeGreaterThan(0);
    expect(await todayItems.count()).toBeLessThanOrEqual(3);
    await expect(todayItems.first()).toHaveAttribute('data-saved-identity', FLOW_SLUG);
    await expect(todayItems.first()).toHaveAttribute('data-item-id', /\S/u);
    const todayItemId = await todayItems.first().getAttribute('data-item-id');
    await todayItems.first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(FLOW_SLUG);
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(true);
    const selectedWorkspace = shell.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await expect(selectedWorkspace).toBeVisible();
    await expect(getOpenMyFlowItemDetail(page)).toHaveAttribute('data-item-id', todayItemId ?? '');

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('390: one undated plan does not manufacture a Today wrapper or heading', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedUndatedSavedPlan(page, 'used-car-buying-check');
    await page.goto('/my');

    const shell = await expectLibraryShell(page, 1, 'single');
    await expect(shell.getByTestId('my-flow-today-summary')).toHaveCount(0);
    await expect(shell.locator('#my-flow-compact-today-title')).toHaveCount(0);
    await expect(shell.getByTestId('my-flow-mobile-structure-row')).toHaveCount(1);
    await expect(shell.getByTestId('my-flow-mobile-structure-row')).toHaveAttribute(
      'data-saved-identity',
      'used-car-buying-check',
    );

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: five plans remain a stable compact library without premature search or filters', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5');

    const shell = await expectLibraryShell(page, 5, 'small');
    const workspace = shell.getByTestId('my-flow-library-workspace');
    await expect(workspace).toBeVisible();
    const rows = workspace.getByTestId('my-flow-library-row');
    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toHaveAttribute('data-saved-identity', /\S/u);
    await expect(rows.last()).toHaveAttribute('data-saved-identity', /\S/u);
    await expect(workspace.getByTestId('my-flow-library-rail-search')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-library-rail-filter')).toHaveCount(0);
    await expect(workspace.getByTestId('my-flow-overview-card')).toHaveCount(0);
    const orderBeforeReload = await rows.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute('data-saved-identity'))
    ));
    await page.reload();
    const reloadedRows = page.getByTestId('my-flow-library-row');
    await expect(reloadedRows).toHaveCount(5);
    expect(await reloadedRows.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute('data-saved-identity'))
    ))).toEqual(orderBeforeReload);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1440: twenty plans expose only query plus one status-axis filter', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/my?demo=ux20');

    const shell = await expectLibraryShell(page, 20, 'searchable');
    const workspace = shell.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    await expect(rail.getByTestId('my-flow-library-row')).toHaveCount(20);
    await expect(rail.getByTestId('my-flow-library-rail-search')).toBeVisible();
    const statusFilter = rail.getByTestId('my-flow-library-rail-filter');
    await expect(statusFilter).toBeVisible();
    await expect(statusFilter.locator('option')).toHaveCount(4);
    await expect(rail.locator('input[type="search"]')).toHaveCount(1);
    await expect(rail.locator('select')).toHaveCount(1);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: changing query or status from a selected plan keeps route and screen on the same list state', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20');

    await expectLibraryShell(page, 20, 'searchable');
    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const rows = rail.getByTestId('my-flow-library-row');
    const titles = await rows.locator('[data-flow-identity-slot="title"]').allTextContents();
    const query = chooseBroadHangulQuery(titles);
    expect(query).not.toBe('');

    const firstSlug = await rows.first().getAttribute('data-flow-slug');
    expect(firstSlug).toBeTruthy();
    await rows.first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(firstSlug);
    await expect(workspace.getByTestId('my-flow-library-detail')).toBeVisible();
    const historyLengthBeforeQuery = await page.evaluate(() => window.history.length);

    const search = rail.getByTestId('my-flow-library-rail-search');
    await search.fill(query);
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.has('date')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect(workspace.getByTestId('my-flow-library-detail')).toBeHidden();
    await expect(search).toBeFocused();
    expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBeforeQuery);
    expect(await page.evaluate(() => (
      window.history.state?.flowmeMyFlowLibrary?.level
    ))).toBe('list');

    await page.reload();
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect(workspace.getByTestId('my-flow-library-detail')).toBeHidden();

    const filteredRows = rail.getByTestId('my-flow-library-row');
    expect(await filteredRows.count()).toBeGreaterThan(0);
    const filteredSlug = await filteredRows.first().getAttribute('data-flow-slug');
    expect(filteredSlug).toBeTruthy();
    await filteredRows.first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(filteredSlug);
    await expect(workspace.getByTestId('my-flow-library-detail')).toBeVisible();
    const historyLengthBeforeFilter = await page.evaluate(() => window.history.length);

    const statusFilter = rail.getByTestId('my-flow-library-rail-filter');
    await statusFilter.selectOption('open');
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.has('date')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('open');
    await expect(workspace.getByTestId('my-flow-library-detail')).toBeHidden();
    expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBeforeFilter);
    expect(await page.evaluate(() => (
      window.history.state?.flowmeMyFlowLibrary?.level
    ))).toBe('list');

    await page.reload();
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('open');
    await expect(workspace.getByTestId('my-flow-library-detail')).toBeHidden();

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: query and filter from an Item clear stale detail before the same plan is reopened', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20');

    await expectLibraryShell(page, 20, 'searchable');
    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const movingRow = rail.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await expect(movingRow).toBeVisible();
    const titles = await rail
      .getByTestId('my-flow-library-row')
      .locator('[data-flow-identity-slot="title"]')
      .allTextContents();
    const query = chooseBroadHangulQuery(titles);
    expect(query).not.toBe('');

    await movingRow.click();
    let plan = workspace
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`);
    await expect(plan).toBeVisible();
    await (await firstOpenItemButton(plan)).click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(true);
    const historyLengthBeforeQuery = await page.evaluate(() => window.history.length);

    const search = rail.getByTestId('my-flow-library-rail-search');
    await search.fill(query);
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.has('flow'),
        item: url.searchParams.has('item'),
        date: url.searchParams.has('date'),
        query: url.searchParams.get('q'),
      };
    }).toEqual({ flow: false, item: false, date: false, query });
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expect(search).toBeFocused();
    expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBeforeQuery);

    await search.fill('');
    await expect(movingRow).toBeVisible();
    await movingRow.click();
    plan = workspace
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`);
    await expect(plan).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);

    await (await firstOpenItemButton(plan)).click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();
    const filter = rail.getByTestId('my-flow-library-rail-filter');
    await filter.selectOption('open');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.has('flow'),
        item: url.searchParams.has('item'),
        date: url.searchParams.has('date'),
        filter: url.searchParams.get('status'),
      };
    }).toEqual({ flow: false, item: false, date: false, filter: 'open' });
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expect(filter).toBeFocused();
    await expect(movingRow).toBeVisible();
    await movingRow.click();
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);

    await page.reload();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: dirty Item edit keeps route and draft until discard applies one pending query', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20');

    await expectLibraryShell(page, 20, 'searchable');
    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const movingRow = rail.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    const titles = await rail
      .getByTestId('my-flow-library-row')
      .locator('[data-flow-identity-slot="title"]')
      .allTextContents();
    const query = chooseBroadHangulQuery(titles);
    expect(query).not.toBe('');

    await movingRow.click();
    const plan = workspace
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`);
    await (await firstOpenItemButton(plan)).click();
    let detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    detail = await enterItemEditMode(detail);
    const memo = detail.getByTestId('my-flow-detail-memo');
    const draft = '검색 전환에서 지켜야 할 미저장 메모';
    await memo.fill(draft);
    const itemUrl = page.url();
    const search = rail.getByTestId('my-flow-library-rail-search');

    await search.fill(query);
    await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
    await expect.poll(() => page.url()).toBe(itemUrl);
    await expect(search).toHaveValue('');
    await expect(memo).toHaveValue(draft);

    await detail.getByRole('button', { name: '계속 수정', exact: true }).click();
    await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toHaveCount(0);
    await expect.poll(() => page.url()).toBe(itemUrl);
    await expect(memo).toHaveValue(draft);

    await search.fill(query);
    await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
    await detail.getByTestId('my-flow-editor-confirm-discard').click();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.has('flow'),
        item: url.searchParams.has('item'),
        date: url.searchParams.has('date'),
        query: url.searchParams.get('q'),
      };
    }).toEqual({ flow: false, item: false, date: false, query });
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expect(search).toHaveValue(query);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: dirty Item browser Back restores the Item before asking to discard', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux20');

    await expectLibraryShell(page, 20, 'searchable');
    const workspace = page.getByTestId('my-flow-library-workspace');
    const movingRow = workspace.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await movingRow.click();
    const plan = workspace
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`);
    await (await firstOpenItemButton(plan)).click();
    let detail = getOpenMyFlowItemDetail(page);
    await expect(detail).toBeVisible();
    detail = await enterItemEditMode(detail);
    const memo = detail.getByTestId('my-flow-detail-memo');
    const draft = '브라우저 뒤로가기 전에 지켜야 할 초안';
    await memo.fill(draft);
    const itemUrl = page.url();

    await page.evaluate(() => window.history.back());
    await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
    await expect.poll(() => page.url()).toBe(itemUrl);
    await expect(memo).toHaveValue(draft);

    await detail.getByRole('button', { name: '계속 수정', exact: true }).click();
    await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toHaveCount(0);
    await expect.poll(() => page.url()).toBe(itemUrl);
    await expect(memo).toHaveValue(draft);

    await page.evaluate(() => window.history.back());
    await expect(detail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
    await detail.getByTestId('my-flow-editor-confirm-discard').click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(FLOW_SLUG);
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: dirty Item blocks a cross-flow completion notice until the user discards', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5');

    await expectLibraryShell(page, 5, 'small');
    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const planBRow = rail.locator(
      `[data-testid="my-flow-library-row"]:not([data-flow-slug="${FLOW_SLUG}"])`,
    ).first();
    const planBSlug = await planBRow.getAttribute('data-flow-slug');
    expect(planBSlug).toBeTruthy();
    await planBRow.click();

    const planB = workspace.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${planBSlug}"]`,
    );
    await (await firstOpenItemButton(planB)).click();
    const planBDetail = getOpenMyFlowItemDetail(page);
    const planBCompletion = planBDetail.getByTestId('my-flow-task-complete-control');
    await expect(planBCompletion).toBeVisible();
    await expect(planBCompletion).toBeChecked();
    await planBCompletion.click();
    await expect(planBCompletion).not.toBeChecked();
    const completionNotice = page.getByTestId('my-flow-completion-snackbar');
    await expect(completionNotice).toHaveAttribute('data-completion-result', 'reopened');
    const completionOpen = completionNotice.getByTestId('my-flow-completion-open');
    await expect(completionOpen).toBeFocused();

    const planARow = rail.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await planARow.click();
    const planA = workspace.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await (await firstOpenItemButton(planA)).click();
    let planADetail = getOpenMyFlowItemDetail(page);
    planADetail = await enterItemEditMode(planADetail);
    const memo = planADetail.getByTestId('my-flow-detail-memo');
    const draft = '완료 알림 전환에서 지켜야 할 미저장 메모';
    await memo.fill(draft);
    const planAItemUrl = page.url();

    await completionOpen.click();
    await expect(planADetail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
    await expect.poll(() => page.url()).toBe(planAItemUrl);
    await expect(memo).toHaveValue(draft);
    await expect(completionNotice).toBeVisible();

    await planADetail.getByRole('button', { name: '계속 수정', exact: true }).click();
    await expect(planADetail.getByTestId('my-flow-editor-discard-prompt')).toHaveCount(0);
    await expect.poll(() => page.url()).toBe(planAItemUrl);
    await expect(memo).toHaveValue(draft);
    await expect(completionNotice).toBeVisible();

    await completionOpen.click();
    await expect(planADetail.getByTestId('my-flow-editor-discard-prompt')).toBeVisible();
    await planADetail.getByTestId('my-flow-editor-confirm-discard').click();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.get('flow'),
        item: url.searchParams.has('item'),
      };
    }).toEqual({ flow: planBSlug, item: true });
    const reopenedPlanBDetail = getOpenMyFlowItemDetail(page);
    await expect(reopenedPlanBDetail).toBeVisible();
    await expect(completionNotice).toHaveCount(0);

    await reopenedPlanBDetail.getByRole('button', { name: '닫기', exact: true }).click();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.get('flow'),
        item: url.searchParams.has('item'),
      };
    }).toEqual({ flow: planBSlug, item: false });
    await page.getByTestId('my-flow-library-back').click();
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: Item A to rail Plan B keeps Plan B above the library in history', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5');

    await expectLibraryShell(page, 5, 'small');
    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const planA = rail.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await planA.click();
    const planADetail = workspace
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`);
    await (await firstOpenItemButton(planADetail)).click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();

    const planB = rail.locator(
      `[data-testid="my-flow-library-row"]:not([data-flow-slug="${FLOW_SLUG}"])`,
    ).first();
    const planBSlug = await planB.getAttribute('data-flow-slug');
    expect(planBSlug).toBeTruthy();
    await planB.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(planBSlug);
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expect(workspace.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${planBSlug}"]`,
    )).toBeVisible();

    await page.getByTestId('my-flow-library-back').click();
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect(rail.getByTestId('my-flow-library-row')).toHaveCount(5);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: direct Item closes to an unmarked Plan and returns locally to the library', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/my?demo=ux5');

    await expectLibraryShell(page, 5, 'small');
    const movingRow = page.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await movingRow.click();
    const plan = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await (await firstOpenItemButton(plan)).click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();
    const directItemUrl = page.url();

    await page.goto('/flows?source=p008-direct-item');
    await page.goto(directItemUrl);
    const directDetail = getOpenMyFlowItemDetail(page);
    await expect(directDetail).toBeVisible();
    await directDetail.getByRole('button', { name: '닫기', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect.poll(() => page.evaluate(() => (
      window.history.state?.flowmeMyFlowLibrary?.level ?? null
    ))).toBe(null);
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);

    await page.getByTestId('my-flow-library-back').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/my');
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect(page.getByTestId('my-flow-library-row')).toHaveCount(5);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: direct A then rail B returns to the library instead of external history', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/flows?source=p008-direct-entry');
    await page.goto(`/my?demo=ux5&view=flows&flow=${FLOW_SLUG}`);

    await expectLibraryShell(page, 5, 'small');
    const selectedPlanA = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${FLOW_SLUG}"]`,
    );
    await expect(selectedPlanA).toBeVisible();
    const rail = page.getByTestId('my-flow-library-rail');
    const planBRow = rail.locator(
      `[data-testid="my-flow-library-row"]:not([data-flow-slug="${FLOW_SLUG}"])`,
    ).first();
    const planBSlug = await planBRow.getAttribute('data-flow-slug');
    expect(planBSlug).toBeTruthy();
    await planBRow.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(planBSlug);
    await expect(page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${planBSlug}"]`,
    )).toBeVisible();

    const historyLength = await page.evaluate(() => window.history.length);
    await page.getByTestId('my-flow-library-back').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/my');
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect(page.getByTestId('my-flow-library-row')).toHaveCount(5);
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: list to plan to item browser Back restores plan then query, status, and rail scroll', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto('/my?demo=ux20');
    await expectLibraryShell(page, 20, 'searchable');

    const workspace = page.getByTestId('my-flow-library-workspace');
    const rail = workspace.getByTestId('my-flow-library-rail');
    const allRows = rail.getByTestId('my-flow-library-row');
    await expect(allRows).toHaveCount(20);
    const titles = await allRows.locator('[data-flow-identity-slot="title"]').allTextContents();
    const query = chooseBroadHangulQuery(titles);
    expect(query).not.toBe('');

    await rail.getByTestId('my-flow-library-rail-filter').selectOption('open');
    await rail.getByTestId('my-flow-library-rail-search').fill(query);
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('open');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    const filteredRows = rail.getByTestId('my-flow-library-row');
    const filteredCount = await filteredRows.count();
    expect(filteredCount).toBeGreaterThan(1);

    const scrollContainer = rail.getByTestId('my-flow-library-scroll-container');
    const expectedScrollTop = await scrollContainer.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(expectedScrollTop).toBeGreaterThan(0);

    const selectedRow = filteredRows.last();
    const selectedSlug = await selectedRow.getAttribute('data-flow-slug');
    expect(selectedSlug).toBeTruthy();
    await selectedRow.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(selectedSlug);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('open');

    const plan = workspace
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${selectedSlug}"]`);
    await expect(plan).toBeVisible();
    const itemOpener = await firstOpenItemButton(plan);
    await itemOpener.click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(true);

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.has('item')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('flow')).toBe(selectedSlug);
    await expect(plan).toBeVisible();
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expect(itemOpener).toBeFocused();

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.has('flow')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('open');
    await expect(filteredRows).toHaveCount(filteredCount);
    await expect.poll(async () => scrollContainer.evaluate((element) => element.scrollTop))
      .toBeGreaterThanOrEqual(Math.max(1, expectedScrollTop - 4));
    await expect(rail.locator(
      `[data-testid="my-flow-library-row"][data-flow-slug="${selectedSlug}"]`,
    )).toBeFocused();

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024: finishing the last open item keeps the selected plan under the open filter', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const flowSlug = 'used-car-buying-check';
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedUndatedSavedPlan(page, flowSlug);
    await page.goto(`/my?view=flows&flow=${flowSlug}`);

    await expectLibraryShell(page, 1, 'single');
    let selectedPlan = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`,
    );
    await expect(selectedPlan.getByTestId('approved-my-plan-workspace')).toBeVisible();
    const todoRows = selectedPlan.getByTestId('my-plan-todo-row');
    await expect(todoRows).toHaveCount(15);
    const executableIds = await todoRows.evaluateAll((rows) => (
      rows.map((row) => row.getAttribute('data-todo-item-id')?.split('::')[1] ?? '')
        .filter(Boolean)
    ));
    expect(executableIds.length).toBeGreaterThan(1);
    await page.evaluate(({ slug, completedIds }) => {
      window.localStorage.setItem(
        `flow_builder_mvp_checks_${slug}`,
        JSON.stringify(Object.fromEntries(completedIds.map((itemId) => [itemId, true]))),
      );
    }, { slug: flowSlug, completedIds: executableIds.slice(0, -1) });

    await page.goto(`/my?view=flows&status=open&flow=${flowSlug}`);
    selectedPlan = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`,
    );
    const approvedPlan = selectedPlan.getByTestId('approved-my-plan-workspace');
    await expect(approvedPlan).toBeVisible();
    await expect(approvedPlan.getByText('전체 14/15 완료', { exact: true })).toBeVisible();
    const onlyOpenRow = approvedPlan.locator(
      '[data-testid="my-plan-todo-row"]:has([data-testid="my-plan-todo-checkbox"][aria-checked="false"])',
    );
    await expect(onlyOpenRow).toHaveCount(1);
    await onlyOpenRow.getByTestId('my-plan-todo-detail-link').click();
    const itemDetail = getOpenMyFlowItemDetail(page);
    await expect(itemDetail).toBeVisible();
    const completion = itemDetail.getByTestId('my-flow-task-complete-control');
    await expect(completion).not.toBeChecked();
    await completion.click();
    await expect(completion).toBeChecked();

    await page.goBack();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        flow: url.searchParams.get('flow'),
        item: url.searchParams.has('item'),
        status: url.searchParams.get('status'),
      };
    }).toEqual({ flow: flowSlug, item: false, status: 'open' });
    await expect(approvedPlan).toBeVisible();
    await expect(approvedPlan.getByText('전체 15/15 완료', { exact: true })).toBeVisible();

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('1024 rollback: archiving the last active plan persists its legacy lifecycle identity across reload', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const flowSlug = 'used-car-buying-check';
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedUndatedSavedPlan(page, flowSlug);
    // Archive management is intentionally retained by the explicit legacy
    // rollback surface; the approved My Plan execution surface omits that
    // management menu.
    await page.goto(`/my?view=flows&flow=${flowSlug}&savedPlanLibrary=off`);

    await expect(page.locator('main').first()).toHaveAttribute('data-saved-library-flag', 'off');
    const selectedPlan = page.locator(
      `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`,
    );
    await expect(selectedPlan).toBeVisible();
    await selectedPlan.getByTestId('my-flow-management-menu-trigger').click();
    await selectedPlan.getByTestId('my-flow-archive-toggle').click();

    const archivedRow = page.locator(
      `[data-testid="my-flow-library-archived-row"][data-flow-slug="${flowSlug}"]`,
    );
    await expect(archivedRow).toBeVisible();
    await expect(page.getByTestId('my-flow-lifecycle-snackbar')).toContainText('보관했습니다');
    await expect.poll(() => page.evaluate((slug) => {
      const raw = window.localStorage.getItem('flow:my-flow:lifecycle:v1');
      if (!raw) return false;
      const record = JSON.parse(raw) as { archivedFlowSlugs?: string[] };
      return record.archivedFlowSlugs?.includes(slug) ?? false;
    }, flowSlug)).toBe(true);

    await page.reload();
    const openArchived = page.getByTestId('my-flow-open-archived');
    await expect(openArchived).toContainText('보관한 계획 1개 보기');
    await expect.poll(() => page.evaluate((slug) => {
      const raw = window.localStorage.getItem('flow:my-flow:lifecycle:v1');
      if (!raw) return false;
      const record = JSON.parse(raw) as { archivedFlowSlugs?: string[] };
      return record.archivedFlowSlugs?.includes(slug) ?? false;
    }, flowSlug)).toBe(true);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('exact savedPlanLibrary=off restores the legacy surface without changing legacy bytes', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await page.evaluate(({ savedFlowKey, anchorKey, flowSlug }) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        savedFlowKey,
        `{"slug":"${flowSlug}","savedAt":"2026-05-28T00:00:00.000Z","selectedArtifactMode":"calendar","anchor":"2026-06-26"}`,
      );
      window.localStorage.setItem(anchorKey, '{"mode":"custom","anchor":"2026-06-26"}');
      window.localStorage.setItem(
        `flow_builder_mvp_checks_${flowSlug}`,
        '{"legacy-check":false}',
      );
      window.localStorage.setItem(
        `flow_builder_mvp_item_state_${flowSlug}`,
        '{"legacy-item":{"note":"keep exact legacy bytes","custom":"sentinel"}}',
      );
      window.localStorage.setItem('flow:p0-08:sentinel', '  byte-for-byte sentinel  ');
    }, { savedFlowKey: SAVED_FLOW_KEY, anchorKey: ANCHOR_KEY, flowSlug: FLOW_SLUG });
    const before = await localStorageRawSnapshot(page);
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      const originalClear = Storage.prototype.clear;
      const state = window as P008InstrumentedWindow;
      state.__p008LocalStorageMutations = 0;
      state.__p008LocalStorageMutationLog = [];
      Storage.prototype.setItem = function p008SetItem(key: string, value: string) {
        if (this === window.localStorage) {
          const current = window as P008InstrumentedWindow;
          current.__p008LocalStorageMutations = (current.__p008LocalStorageMutations ?? 0) + 1;
          current.__p008LocalStorageMutationLog?.push({ operation: 'setItem', key, value });
        }
        return originalSetItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function p008RemoveItem(key: string) {
        if (this === window.localStorage) {
          const current = window as P008InstrumentedWindow;
          current.__p008LocalStorageMutations = (current.__p008LocalStorageMutations ?? 0) + 1;
          current.__p008LocalStorageMutationLog?.push({ operation: 'removeItem', key });
        }
        return originalRemoveItem.call(this, key);
      };
      Storage.prototype.clear = function p008Clear() {
        if (this === window.localStorage) {
          const current = window as P008InstrumentedWindow;
          current.__p008LocalStorageMutations = (current.__p008LocalStorageMutations ?? 0) + 1;
          current.__p008LocalStorageMutationLog?.push({ operation: 'clear' });
        }
        return originalClear.call(this);
      };
    });

    await page.goto('/my');
    await expectLibraryShell(page, 1, 'single');
    expect(await localStorageRawSnapshot(page)).toEqual(before);
    expect(await localStorageMutationLog(page)).toEqual([]);
    await page.reload();
    await expectLibraryShell(page, 1, 'single');
    expect(await localStorageRawSnapshot(page)).toEqual(before);
    expect(await localStorageMutationLog(page)).toEqual([]);

    await page.goto('/my?savedPlanLibrary=off');
    const main = page.locator('main').first();
    await expect(main).toHaveAttribute('data-saved-library-flag', 'off');
    await expect(page.getByTestId('my-flow-saved-library-shell')).toHaveCount(0);
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toBeVisible();
    await expect(page.getByTestId('my-flow-todo-experiment-view-todo')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await localStorageRawSnapshot(page)).toEqual(before);
    expect(await localStorageMutationLog(page)).toEqual([]);
    await page.reload();
    await expect(page.getByTestId('my-flow-cross-flow-todo-experiment')).toBeVisible();
    expect(await localStorageRawSnapshot(page)).toEqual(before);
    expect(await localStorageMutationLog(page)).toEqual([]);

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });

  test('390: public save deep-link opens the selected plan with one count-accurate banner only once', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/f/${FLOW_SLUG}`);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    const preview = page.getByTestId('public-flow-capability-result');
    await preview.locator(
      '[data-public-format-tab="true"][data-capability-destination="calendar"]',
    ).click();
    await page.getByTestId('public-flow-calendar-set-anchor').click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await editor.getByTestId('public-flow-adjustment-anchor-input').fill('2031-01-10');
    await editor.getByTestId('public-flow-adjustment-apply').click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByTestId('public-flow-save-primary-mobile')).toBeEnabled();
    await page.getByTestId('public-flow-save-primary-mobile').click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        flow: url.searchParams.get('flow'),
        receipt: url.searchParams.has('saveReceipt'),
      };
    }).toEqual({
      pathname: '/my',
      flow: expect.stringMatching(/^personal-copy:/u),
      receipt: false,
    });
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    const workspace = page.getByTestId('approved-my-plan-workspace');
    await expect(workspace).toBeVisible();
    const banner = page.getByTestId('my-flow-save-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-personal-copy-key', personalCopyKey);
    await expect(banner).toHaveAttribute('data-item-count', '24');
    await expect(banner.getByTestId('my-flow-save-banner-summary')).toContainText('24');
    await expect(banner.getByTestId('my-flow-save-undo')).toBeVisible();
    const selectedPlan = page.locator(
      [
        `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]:visible`,
        `[data-testid="my-flow-overview-card"][data-flow-slug="${personalCopyKey}"]:visible`,
      ].join(', '),
    ).first();
    await expect(selectedPlan).toBeVisible();
    await expect(selectedPlan.getByTestId('approved-my-plan-workspace')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('my-flow-save-banner')).toHaveCount(0);
    await expect(selectedPlan).toBeVisible();
    await expect(selectedPlan.getByTestId('approved-my-plan-workspace')).toBeVisible();

    await expectPageQuality(page);
    expect(errors).toEqual([]);
  });
});
