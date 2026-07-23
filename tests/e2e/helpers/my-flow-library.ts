import { expect, type Locator, type Page } from '@playwright/test';

export async function openMyFlowLibraryFlow(
  page: Page,
  flowSlug: string,
  mobileSection: 'execute' | 'plan' | 'record' = 'plan',
): Promise<Locator> {
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
  const existingMobileWorkspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${flowSlug}"]:visible`,
  );
  if (await existingMobileWorkspace.isVisible().catch(() => false)) {
    const sectionTab = existingMobileWorkspace.getByTestId(
      `my-flow-workspace-tab-${mobileSection}`,
    );
    if (await sectionTab.isVisible().catch(() => false)) await sectionTab.click();
    return existingMobileWorkspace;
  }

  const compactRow = page.locator(
    `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${flowSlug}"]`,
  );
  await expect(compactRow).toBeVisible();
  await compactRow.getByTestId('my-flow-mobile-structure-open').click();
  const workspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${flowSlug}"]:visible`,
  );
  await expect(workspace).toBeVisible();
  await workspace.getByTestId(`my-flow-workspace-tab-${mobileSection}`).click();
  return workspace;
}

export function getOpenMyFlowItemDetail(page: Page): Locator {
  return page
    .getByTestId('my-flow-item-detail-sheet')
    .getByTestId('my-flow-item-detail');
}

export async function closeOpenMyFlowItemDetail(page: Page): Promise<void> {
  const close = page.getByTestId('my-flow-item-detail-sheet-close');
  if (await close.isVisible().catch(() => false)) await close.click();
}

export async function openPersonalDraftListExport(flow: Locator): Promise<Locator> {
  const recordTab = flow.getByTestId('my-flow-workspace-tab-record');
  if (await recordTab.isVisible().catch(() => false)) await recordTab.click();

  const advanced = flow.getByTestId('my-flow-workspace-advanced-actions');
  if (
    await advanced.isVisible().catch(() => false) &&
    (await advanced.getAttribute('open')) === null
  ) {
    await advanced.locator(':scope > summary').click();
  }

  const panel = flow.getByTestId('personal-draft-list-export');
  await expect(panel).toBeVisible();
  if (!(await panel.getByTestId('my-flow-export-panel').isVisible().catch(() => false))) {
    await panel.getByTestId('personal-draft-list-export-toggle').click();
  }
  return panel;
}

export async function getFirstSavedPersonalDraftSlug(page: Page): Promise<string> {
  const slug = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((entry) =>
      entry.startsWith('flow:saved:url-draft-'),
    );
    return key?.slice('flow:saved:'.length) ?? '';
  });
  expect(slug).not.toBe('');
  return slug;
}

export function getPersonalDraftEffectiveItems(
  flow: Locator,
  ownership?: 'source' | 'user_created',
): Locator {
  const ownershipSelector = ownership ? `[data-structural-ownership="${ownership}"]` : '';
  return flow.locator(`[data-testid="personal-draft-effective-item"]${ownershipSelector}`);
}
