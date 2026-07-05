import { expect, test, type Page } from '@playwright/test';

type FocusableEntry = {
  text: string;
  href: string;
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
        testId: element.dataset.testid ?? '',
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
    test(`${route} keeps browse navigation out of the pre-save primary tab path`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const shell = page.getByTestId('flow-public-shell');
      const browseLink = shell.getByTestId('flow-public-secondary-browse-link');

      await expect(shell).toBeVisible();
      await expect(browseLink).toHaveText('콘텐츠 더 보기');
      await expect(browseLink).toHaveAttribute('href', '/flows');
      await expect(browseLink).toHaveAttribute('tabindex', '-1');
      await expect(browseLink).toHaveAttribute('aria-hidden', 'true');

      const focusableEntries = await collectFocusableEntries(page);
      const browseIndex = focusableEntries.findIndex(
        (entry) => entry.testId === 'flow-public-secondary-browse-link',
      );
      const primaryIndex = focusableEntries.findIndex(
        (entry) =>
          entry.testId === 'public-flow-primary-setup' ||
          entry.testId === 'public-flow-mobile-save-cta' ||
          entry.text.includes('내 Flow에 저장'),
      );

      if (['/f/vehicle-inspection-prep', '/f/moving-d30-basic'].includes(route)) {
        expect(primaryIndex).toBeGreaterThanOrEqual(0);
      }
      expect(browseIndex).toBe(-1);
    });
  }
});
