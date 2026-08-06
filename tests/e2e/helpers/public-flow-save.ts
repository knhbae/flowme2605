import { expect, type Locator, type Page } from '@playwright/test';

function currentSavedPlanRoute(page: Page) {
  const url = new URL(page.url());
  return {
    pathname: url.pathname,
    view: url.searchParams.get('view'),
    flow: url.searchParams.get('flow'),
    hasLegacyReceiptQuery: url.searchParams.has('saveReceipt'),
  };
}

export async function savePublicFlow(page: Page, button: Locator): Promise<Locator> {
  await button.click();
  await expect.poll(() => currentSavedPlanRoute(page)).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
    hasLegacyReceiptQuery: false,
  });

  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  const banner = page.getByTestId('my-flow-save-banner');
  await expect(banner).toBeVisible();
  return banner;
}

export async function openSavedPublicFlow(page: Page, _postSaveSurface?: Locator): Promise<void> {
  await expect.poll(() => currentSavedPlanRoute(page)).toEqual({
    pathname: '/my',
    view: 'flows',
    flow: expect.stringMatching(/^personal-copy:/u),
    hasLegacyReceiptQuery: false,
  });
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
}
