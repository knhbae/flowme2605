import { expect, type Locator, type Page } from '@playwright/test';

export async function savePublicFlow(page: Page, button: Locator): Promise<Locator> {
  await button.click();
  const receipt = page.getByTestId('public-flow-saved-receipt');
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveAttribute('data-p29-marker', 'P29-SAVED-RECEIPT-DISTINCT');
  return receipt;
}

export async function openSavedPublicFlow(page: Page, receipt?: Locator): Promise<void> {
  const activeReceipt = receipt ?? page.getByTestId('public-flow-saved-receipt');
  const primary = activeReceipt.getByTestId('public-flow-saved-receipt-primary');
  await expect(primary).toHaveAccessibleName('저장한 전체 Flow 보기');
  await primary.click();
}
