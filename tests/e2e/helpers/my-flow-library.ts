import { expect, type Locator, type Page } from '@playwright/test';

export async function openMyFlowLibraryFlow(page: Page, flowSlug: string): Promise<Locator> {
  const library = page.getByTestId('my-flow-library-workspace');
  if (await library.isVisible().catch(() => false)) {
    await library.locator(`[data-testid="my-flow-library-row"][data-flow-slug="${flowSlug}"]`).click();
    const card = library
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]`);
    await expect(card).toBeVisible();
    return card;
  }

  const existingCard = page.locator(
    `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]:visible`,
  );
  if (await existingCard.isVisible().catch(() => false)) return existingCard;

  const compactRow = page.locator(
    `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`,
  );
  await expect(compactRow).toBeVisible();
  await compactRow.getByTestId('my-flow-mobile-structure-open').click();
  const card = page.locator(
    `[data-testid="my-flow-overview-card"][data-flow-slug="${flowSlug}"]:visible`,
  );
  await expect(card).toBeVisible();
  return card;
}

export function getPersonalDraftEffectiveItems(
  flow: Locator,
  ownership?: 'source' | 'user_created',
): Locator {
  const ownershipSelector = ownership ? `[data-structural-ownership="${ownership}"]` : '';
  return flow.locator(`[data-testid="personal-draft-effective-item"]${ownershipSelector}`);
}
