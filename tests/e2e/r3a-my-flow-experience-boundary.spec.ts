import { expect, test, type Page } from '@playwright/test';

import {
  getOpenMyFlowItemDetail,
} from './helpers/my-flow-library';

const CANDIDATE_ROUTE = '/my?demo=ux5&myFlowExperience=r3a-lab';
const LARGE_CANDIDATE_ROUTE = '/my?demo=ux20&myFlowExperience=r3a-lab';

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

type StorageMutation = Readonly<{
  storage: 'local' | 'session';
  operation: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  value?: string;
}>;

type R3aInstrumentedWindow = Window & {
  __r3aStorageMutationLog?: StorageMutation[];
};

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure !== 'net::ERR_ABORTED') {
      errors.push(`requestfailed: ${request.url()} (${failure})`);
    }
  });
  return errors;
}

async function rawStorageSnapshot(page: Page): Promise<RawStorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage): Record<string, string> => {
      const keys = Array.from(
        { length: storage.length },
        (_, index) => storage.key(index),
      )
        .filter((key): key is string => Boolean(key))
        .sort();
      return Object.fromEntries(keys.map((key) => [key, storage.getItem(key) ?? '']));
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

async function installNavigationStorageMutationLog(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as R3aInstrumentedWindow;
    target.__r3aStorageMutationLog = [];
    const prototype = Storage.prototype;
    const originalSetItem = prototype.setItem;
    const originalRemoveItem = prototype.removeItem;
    const originalClear = prototype.clear;
    const storageName = (storage: Storage): 'local' | 'session' => (
      storage === window.localStorage ? 'local' : 'session'
    );

    prototype.setItem = function setItem(key: string, value: string) {
      target.__r3aStorageMutationLog?.push({
        storage: storageName(this),
        operation: 'setItem',
        key,
        value,
      });
      return originalSetItem.call(this, key, value);
    };
    prototype.removeItem = function removeItem(key: string) {
      target.__r3aStorageMutationLog?.push({
        storage: storageName(this),
        operation: 'removeItem',
        key,
      });
      return originalRemoveItem.call(this, key);
    };
    prototype.clear = function clear() {
      target.__r3aStorageMutationLog?.push({
        storage: storageName(this),
        operation: 'clear',
      });
      return originalClear.call(this);
    };
  });
}

async function storageMutationLog(page: Page): Promise<StorageMutation[]> {
  return page.evaluate(() => (
    (window as R3aInstrumentedWindow).__r3aStorageMutationLog ?? []
  ));
}

async function inspectRouteQuality(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element): boolean => {
      const target = element as HTMLElement;
      const style = window.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const nameOf = (element: Element): string => {
      const target = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const labelledBy = element.getAttribute('aria-labelledby')
        ?.split(/\s+/u)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ');
      const labelText = Array.from(target.labels ?? [])
        .map((label) => label.textContent?.trim() ?? '')
        .join(' ');
      return [
        element.getAttribute('aria-label'),
        labelledBy,
        element.getAttribute('title'),
        labelText,
        element.textContent?.trim(),
      ].filter(Boolean).join(' ').trim();
    };
    const interactive = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary'),
    ).filter(isVisible);
    const mobileNavigation = document.querySelector<HTMLElement>(
      '[data-testid="platform-mobile-tabs"]',
    );
    const navigationRect = mobileNavigation && isVisible(mobileNavigation)
      ? mobileNavigation.getBoundingClientRect()
      : null;
    const overlapsMobileNavigation = navigationRect
      ? interactive
        .filter((element) => !mobileNavigation?.contains(element))
        .filter((element) => {
          const position = window.getComputedStyle(element).position;
          return position === 'fixed' || position === 'sticky';
        })
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < navigationRect.right
            && rect.right > navigationRect.left
            && rect.top < navigationRect.bottom
            && rect.bottom > navigationRect.top;
        }).length
      : 0;
    const active = document.activeElement;
    const activeRect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;

    return {
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      unnamedInteractiveCount: interactive.filter((element) => nameOf(element).length === 0).length,
      horizontallyClippedInteractiveCount: interactive.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      }).length,
      outOfViewportFixedCount: Array.from(document.querySelectorAll<HTMLElement>('*'))
        .filter(isVisible)
        .filter((element) => {
          const position = window.getComputedStyle(element).position;
          return position === 'fixed' || position === 'sticky';
        })
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        }).length,
      fixedMobileNavigationOverlapCount: overlapsMobileNavigation,
      replacementCharacterCount: (document.body.innerText.match(/\uFFFD/gu) ?? []).length,
      focusedTag: active?.tagName.toLowerCase() ?? '',
      focusedName: active ? nameOf(active) : '',
      focusedWithinViewport: Boolean(activeRect)
        && activeRect!.left >= -1
        && activeRect!.right <= window.innerWidth + 1
        && activeRect!.top >= -1
        && activeRect!.bottom <= window.innerHeight + 1,
    };
  });
}

async function expectReadOnlyNavigation(
  page: Page,
  before: RawStorageSnapshot,
): Promise<void> {
  expect(await rawStorageSnapshot(page)).toEqual(before);
  expect(await storageMutationLog(page)).toEqual([]);
}

test.use({ timezoneId: 'Asia/Seoul' });

test.describe('R3A My Flow experience boundary', () => {
  test('only the exact eligible selector renders the candidate and every fallback stays classic', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });

    for (const route of [
      '/my?demo=ux5',
      '/my?demo=ux5&myFlowExperience=unknown',
      '/my?demo=ux5&myFlowExperience=R3A-LAB',
      '/my?demo=ux5&myFlowExperience=r3a-lab&q3Copy=off',
    ]) {
      await page.goto(route);
      await expect(page.getByTestId('my-flow-library-workspace')).toBeVisible();
      await expect(page.getByTestId('my-flow-r3a-lab-surface')).toHaveCount(0);
    }

    await page.goto(CANDIDATE_ROUTE);
    const candidate = page.getByTestId('my-flow-r3a-lab-surface');
    await expect(candidate).toBeVisible();
    await expect(candidate).toHaveAttribute('data-my-flow-experience', 'r3a-lab');
    await expect(candidate).toHaveAttribute('data-my-flow-snapshot-version', '1');
    await expect(candidate).toHaveAttribute('data-my-flow-selection', 'library');
    await expect(candidate.getByTestId('my-flow-r3a-lab-row')).toHaveCount(5);
    expect(errors).toEqual([]);
  });

  test('candidate keeps List to Plan to Item Back, focus, selector, and raw storage contracts', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/flows');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('flow:r3a:local-sentinel', '  keep local bytes  ');
      window.sessionStorage.setItem('flow:r3a:session-sentinel', '  keep session bytes  ');
    });
    const before = await rawStorageSnapshot(page);
    await installNavigationStorageMutationLog(page);

    await page.goto(CANDIDATE_ROUTE);
    const candidate = page.getByTestId('my-flow-r3a-lab-surface');
    await expect(candidate).toHaveAttribute('data-my-flow-selection', 'library');
    const selectedRow = candidate.getByTestId('my-flow-r3a-lab-row').last();
    const selectedSlug = await selectedRow.getAttribute('data-flow-slug');
    expect(selectedSlug).toBeTruthy();
    await expectReadOnlyNavigation(page, before);

    await selectedRow.click();
    await expect(candidate).toHaveAttribute('data-my-flow-selection', 'flow');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        demo: url.searchParams.get('demo'),
        experience: url.searchParams.get('myFlowExperience'),
        flow: url.searchParams.get('flow'),
      };
    }).toEqual({ demo: 'ux5', experience: 'r3a-lab', flow: selectedSlug });
    const selectedFlow = candidate.getByTestId('my-flow-r3a-lab-selected-flow');
    const itemOpener = selectedFlow.getByTestId('my-plan-todo-detail-link').first();
    await expect(itemOpener).toBeVisible();
    await expectReadOnlyNavigation(page, before);

    await itemOpener.click();
    await expect(getOpenMyFlowItemDetail(page)).toBeVisible();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        experience: url.searchParams.get('myFlowExperience'),
        flow: url.searchParams.get('flow'),
        hasItem: url.searchParams.has('item'),
      };
    }).toEqual({ experience: 'r3a-lab', flow: selectedSlug, hasItem: true });
    await expectReadOnlyNavigation(page, before);

    await page.goBack();
    await expect(getOpenMyFlowItemDetail(page)).toHaveCount(0);
    await expect(candidate).toHaveAttribute('data-my-flow-selection', 'flow');
    await expect(itemOpener).toBeFocused();
    await expectReadOnlyNavigation(page, before);

    await page.goBack();
    await expect(candidate).toHaveAttribute('data-my-flow-selection', 'library');
    const returnedRow = candidate.locator(
      `[data-testid="my-flow-r3a-lab-row"][data-flow-slug="${selectedSlug}"]`,
    );
    await expect(returnedRow).toBeFocused();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        experience: url.searchParams.get('myFlowExperience'),
        flow: url.searchParams.has('flow'),
        item: url.searchParams.has('item'),
      };
    }).toEqual({ experience: 'r3a-lab', flow: false, item: false });
    await expectReadOnlyNavigation(page, before);
    expect(errors).toEqual([]);
  });

  test('large candidate library executes search, filter, archive, and mobile expansion intents without losing its selector', async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(LARGE_CANDIDATE_ROUTE);

    const candidate = page.getByTestId('my-flow-r3a-lab-surface');
    const rows = candidate.getByTestId('my-flow-r3a-lab-row');
    await expect(candidate).toHaveAttribute('data-my-flow-selection', 'library');
    await expect(rows).toHaveCount(20);

    const search = candidate.getByTestId('my-flow-r3a-lab-search');
    await expect(search).toBeVisible();
    await search.fill('이사');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        experience: url.searchParams.get('myFlowExperience'),
        query: url.searchParams.get('q'),
      };
    }).toEqual({ experience: 'r3a-lab', query: '이사' });
    const searchedCount = await rows.count();
    expect(searchedCount).toBeGreaterThan(0);
    expect(searchedCount).toBeLessThan(20);
    await expect(candidate.getByTestId('my-flow-r3a-lab-visible-count'))
      .toHaveText(`${searchedCount}개`);

    await search.fill('');
    await expect(rows).toHaveCount(20);
    const openFilter = candidate.getByTestId('my-flow-r3a-lab-filter-open');
    await openFilter.click();
    await expect(openFilter).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        experience: url.searchParams.get('myFlowExperience'),
        status: url.searchParams.get('status'),
        hasQuery: url.searchParams.has('q'),
      };
    }).toEqual({ experience: 'r3a-lab', status: 'open', hasQuery: false });
    const openCount = await rows.count();
    expect(openCount).toBeGreaterThan(0);
    expect(openCount).toBeLessThan(20);

    const archivedFilter = candidate.getByTestId('my-flow-r3a-lab-filter-archived');
    await archivedFilter.click();
    await expect(archivedFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(candidate.getByTestId('my-flow-r3a-lab-empty')).toContainText(
      '보관한 계획이 없어요',
    );
    await expect(rows).toHaveCount(0);
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        experience: url.searchParams.get('myFlowExperience'),
        status: url.searchParams.get('status'),
      };
    }).toEqual({ experience: 'r3a-lab', status: 'archived' });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LARGE_CANDIDATE_ROUTE);
    await expect(rows).toHaveCount(8);
    const expand = candidate.getByTestId('my-flow-r3a-lab-expand');
    await expect(expand).toContainText('12개 더 보기');
    await expand.click();
    await expect(rows).toHaveCount(20);
    await expect(expand).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get('myFlowExperience'))
      .toBe('r3a-lab');
    expect(errors).toEqual([]);
  });

  test('candidate stays operable and unclipped at 390, 1024, and 1440 pixels', async ({ page }, testInfo) => {
    test.slow();
    const errors = collectBrowserErrors(page);
    const viewports = [
      { label: '390x844', width: 390, height: 844 },
      { label: '1024x768', width: 1024, height: 768 },
      { label: '1440x1000', width: 1440, height: 1000 },
    ] as const;

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(CANDIDATE_ROUTE);
      const candidate = page.getByTestId('my-flow-r3a-lab-surface');
      await expect(candidate).toHaveAttribute('data-my-flow-selection', 'library');
      await expect(candidate.getByTestId('my-flow-r3a-lab-row')).toHaveCount(5);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await page.keyboard.press('Tab');

      expect(await inspectRouteQuality(page)).toEqual({
        horizontalOverflow: 0,
        unnamedInteractiveCount: 0,
        horizontallyClippedInteractiveCount: 0,
        outOfViewportFixedCount: 0,
        fixedMobileNavigationOverlapCount: 0,
        replacementCharacterCount: 0,
        focusedTag: expect.stringMatching(/^(a|button|input|select|textarea|summary)$/u),
        focusedName: expect.stringMatching(/\S/u),
        focusedWithinViewport: true,
      });
      await testInfo.attach(`r3a-candidate-${viewport.label}.png`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
      expect(errors).toEqual([]);
    }
  });
});
