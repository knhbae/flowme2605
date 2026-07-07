import { expect, test, type Page } from '@playwright/test';

type FocusableEntry = {
  text: string;
  href: string;
  testId: string;
};

type StickyPrimaryEntry = {
  text: string;
  accessibleName: string;
  testId: string;
};

async function collectFocusableEntries(page: Page) {
  return page.evaluate<FocusableEntry[]>(() => {
    const selector = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[tabindex]',
    ].join(',');

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const ariaHidden = element.getAttribute('aria-hidden') === 'true';
        const disabled =
          element.hasAttribute('disabled') ||
          element.getAttribute('aria-disabled') === 'true';
        const tabIndex = element.getAttribute('tabindex');

        return (
          !ariaHidden &&
          !disabled &&
          tabIndex !== '-1' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((element) => ({
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        href: element instanceof HTMLAnchorElement ? element.getAttribute('href') ?? '' : '',
        testId: element.dataset.testid ?? element.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? '',
      }));
  });
}

async function collectVisibleMobileStickyPrimaryEntries(page: Page) {
  return page.evaluate<StickyPrimaryEntry[]>(() => {
    const isVisibleInteractive = (element: Element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const disabled =
        element.hasAttribute('disabled') ||
        element.getAttribute('aria-disabled') === 'true';

      return (
        !disabled &&
        element.getAttribute('aria-hidden') !== 'true' &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    return Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          '[data-testid="public-flow-mobile-save-cta"] a',
          '[data-testid="public-flow-mobile-save-cta"] button',
          '[data-testid="mobile-export-bar"] a',
          '[data-testid="mobile-export-bar"] button',
        ].join(','),
      ),
    )
      .filter(isVisibleInteractive)
      .map((element) => ({
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        accessibleName:
          element.getAttribute('aria-label') ??
          (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        testId:
          element.dataset.testid ??
          element.closest<HTMLElement>('[data-testid]')?.dataset.testid ??
          '',
      }));
  });
}

test.describe('public share shell secondary browse order', () => {
  for (const route of [
    '/f/vehicle-inspection-prep',
    '/f/moving-d30-basic',
    '/f/fridge-cleanout-weekly-plan',
    '/f/washer-tub-clean-monthly',
    '/f/new-car-delivery-check',
    '/f/used-car-buying-check',
  ]) {
    test(`${route} keeps browse navigation reachable after the save path`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const shell = page.getByTestId('flow-public-shell');
      const browseLink = page.getByTestId('flow-public-secondary-browse-link');

      await expect(shell).toBeVisible();
      await expect(browseLink).toBeVisible();
      await expect(browseLink).toHaveText('콘텐츠 더 보기');
      await expect(browseLink).toHaveAttribute('href', '/flows');
      await expect(browseLink).not.toHaveAttribute('tabindex', '-1');
      await expect(browseLink).not.toHaveAttribute('aria-hidden', 'true');

      const focusableEntries = await collectFocusableEntries(page);
      const browseIndex = focusableEntries.findIndex(
        (entry) => entry.testId === 'flow-public-secondary-browse-link',
      );
      const primaryIndex = focusableEntries.findIndex(
        (entry) =>
          entry.testId === 'public-flow-primary-setup' ||
          entry.testId === 'public-flow-mobile-save-cta' ||
          entry.testId === 'public-flow-save-actions' ||
          entry.testId === 'moving-save-actions' ||
          entry.text.includes('내 Flow에 저장'),
      );

      expect(browseIndex).toBeGreaterThanOrEqual(0);
      expect(primaryIndex).toBeGreaterThanOrEqual(0);
      expect(browseIndex).toBeGreaterThan(primaryIndex);
    });

    test(`${route} keeps the mobile sticky primary action save-oriented`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await page.evaluate(() => window.scrollTo(0, 720));
      await page.waitForTimeout(250);

      const stickyPrimaryEntries = await collectVisibleMobileStickyPrimaryEntries(page);
      expect(stickyPrimaryEntries.length).toBeGreaterThan(0);

      const [primaryEntry] = stickyPrimaryEntries;
      expect(primaryEntry.text).toMatch(/내 Flow에 저장|내 Flow에서 보기/);
      expect(primaryEntry.text).not.toMatch(/도구|파일|받기|복사|시트|캘린더|xlsx|ics/i);
    });
  }

  test('input-free workbench save path remains keyboard reachable and leads to My Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/new-car-delivery-check');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const setup = page.getByTestId('public-flow-primary-setup');
    await expect(setup).toBeVisible();
    await expect(setup.locator('input[type="date"]')).toHaveCount(0);

    const saveButton = setup.getByRole('button', { name: '내 Flow에 저장' });
    await expect(saveButton).toBeVisible();
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    await saveButton.click();

    const myFlowLink = setup.getByRole('link', { name: '내 Flow에서 보기' });
    await expect(myFlowLink).toBeVisible();
    await myFlowLink.click();
    await expect(page).toHaveURL(/\/my/);
    await expect(page.getByTestId('my-flow-workspace')).toBeVisible();
  });
});
