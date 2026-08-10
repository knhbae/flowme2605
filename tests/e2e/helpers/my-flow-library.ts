import { expect, type Locator, type Page } from '@playwright/test';

export function withLegacySavedPlanLibraryRoute(route: string): string {
  const absoluteRoute = /^[a-z][a-z\d+.-]*:/iu.test(route);
  const url = new URL(route, 'http://flowme.test');
  if (!url.searchParams.has('savedPlanLibrary')) {
    url.searchParams.set('savedPlanLibrary', 'off');
  }
  return absoluteRoute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}

export function gotoLegacySavedPlanLibraryRoute(
  page: Page,
  route: string,
  options?: Parameters<Page['goto']>[1],
) {
  return page.goto(withLegacySavedPlanLibraryRoute(route), options);
}

export async function installLegacySavedPlanLibraryNavigation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const preserveLegacyLane = (value?: string | URL | null) => {
      if (value === undefined || value === null) return value;
      const url = new URL(String(value), window.location.href);
      if (url.origin !== window.location.origin) return value;
      if (!url.searchParams.has('savedPlanLibrary')) {
        url.searchParams.set('savedPlanLibrary', 'off');
      }
      return `${url.pathname}${url.search}${url.hash}`;
    };
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    window.history.pushState = ((state, unused, url) => (
      originalPushState(state, unused, preserveLegacyLane(url))
    )) as History['pushState'];
    window.history.replaceState = ((state, unused, url) => (
      originalReplaceState(state, unused, preserveLegacyLane(url))
    )) as History['replaceState'];
  });
}

async function resolveSavedFlowSlug(page: Page, requestedSlug: string): Promise<string> {
  return page.evaluate((sourceSlug) => {
    const currentFlow = new URL(window.location.href).searchParams.get('flow');
    const records = Object.keys(window.localStorage)
      .filter((key) => key.startsWith('flow:saved:'))
      .map((key) => {
        try {
          const record = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
            slug?: string;
            personalCopyKey?: string;
            sourceFlowSlug?: string;
          } | null;
          return record ? { key, record } : null;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const exact = records.find(({ key, record }) => (
      key === `flow:saved:${sourceSlug}`
      || record.slug === sourceSlug
      || record.personalCopyKey === sourceSlug
    ));
    if (exact) return exact.record.personalCopyKey ?? exact.record.slug ?? sourceSlug;

    const sourceCopies = records.filter(({ record }) => record.sourceFlowSlug === sourceSlug);
    const selected = sourceCopies.find(({ record }) => (
      record.personalCopyKey === currentFlow || record.slug === currentFlow
    ));
    const match = selected ?? sourceCopies.at(-1);
    return match?.record.personalCopyKey ?? match?.record.slug ?? sourceSlug;
  }, requestedSlug);
}

export async function openMyFlowLibraryFlow(
  page: Page,
  flowSlug: string,
  mobileSection: 'execute' | 'plan' | 'record' = 'plan',
): Promise<Locator> {
  const resolvedFlowSlug = await resolveSavedFlowSlug(page, flowSlug);
  const currentUrl = new URL(page.url());
  const legacySavedPlanLibrary = currentUrl.searchParams.get('savedPlanLibrary') === 'off';
  if (legacySavedPlanLibrary && currentUrl.searchParams.get('flow') !== resolvedFlowSlug) {
    const params = new URLSearchParams(currentUrl.pathname === '/my' ? currentUrl.search : '');
    params.set('view', 'flows');
    params.set('flow', resolvedFlowSlug);
    params.set('savedPlanLibrary', 'off');
    await page.goto(`/my?${params.toString()}`);
  }
  const flowView = page.getByTestId('my-flow-todo-experiment-view-flows');
  if (
    await flowView.isVisible().catch(() => false) &&
    (await flowView.getAttribute('aria-selected')) !== 'true'
  ) {
    await flowView.click();
  }
  const library = page.getByTestId('my-flow-library-workspace');
  const wideViewport = (page.viewportSize()?.width ?? 0) >= 900;
  if (wideViewport) {
    await expect(library).toBeVisible();
  } else {
    await expect(
      page.locator(
        [
          `[data-testid="my-flow-overview-card"][data-flow-slug="${resolvedFlowSlug}"]:visible`,
          `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${resolvedFlowSlug}"]:visible`,
          `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${resolvedFlowSlug}"]:visible`,
          '[data-testid="my-flow-library-workspace"]:visible',
        ].join(', '),
      ).first(),
    ).toBeVisible({ timeout: 10_000 });
  }
  if (wideViewport || await library.isVisible().catch(() => false)) {
    await library.locator(`[data-testid="my-flow-library-row"][data-flow-slug="${resolvedFlowSlug}"]`).click();
    const card = library
      .getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${resolvedFlowSlug}"]`);
    await expect(card).toBeVisible();
    return card;
  }

  const existingCard = page.locator(
    `[data-testid="my-flow-overview-card"][data-flow-slug="${resolvedFlowSlug}"]:visible`,
  );
  if (await existingCard.isVisible().catch(() => false)) return existingCard;
  const existingMobileWorkspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${resolvedFlowSlug}"]:visible`,
  );
  if (await existingMobileWorkspace.isVisible().catch(() => false)) {
    const sectionTab = existingMobileWorkspace.getByTestId(
      `my-flow-workspace-tab-${mobileSection}`,
    );
    if (await sectionTab.isVisible().catch(() => false)) await sectionTab.click();
    if (mobileSection === 'plan') {
      const planToggle = existingMobileWorkspace.getByTestId('my-flow-workspace-plan-toggle');
      if (
        await planToggle.isVisible().catch(() => false) &&
        (await planToggle.getAttribute('aria-expanded')) === 'false'
      ) {
        await planToggle.click();
      }
      if (await existingMobileWorkspace.getByTestId('my-flow-whole-flow-outline').isVisible().catch(() => false)) {
        await expandMyFlowWholePlan(existingMobileWorkspace);
      }
    }
    return existingMobileWorkspace;
  }

  const compactRow = page.locator(
    `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${resolvedFlowSlug}"]`,
  );
  await expect(compactRow).toBeVisible();
  await compactRow.getByTestId('my-flow-mobile-structure-open').click();
  const workspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${resolvedFlowSlug}"]:visible`,
  );
  await expect(workspace).toBeVisible();
  const sectionTab = workspace.getByTestId(`my-flow-workspace-tab-${mobileSection}`);
  if (await sectionTab.isVisible().catch(() => false)) await sectionTab.click();
  if (mobileSection === 'plan') {
    const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
    if (
      await planToggle.isVisible().catch(() => false) &&
      (await planToggle.getAttribute('aria-expanded')) === 'false'
    ) {
      await planToggle.click();
    }
    if (await workspace.getByTestId('my-flow-whole-flow-outline').isVisible().catch(() => false)) {
      await expandMyFlowWholePlan(workspace);
    }
  }
  return workspace;
}

export function getOpenMyFlowItemDetail(page: Page): Locator {
  return page.locator(
    '[data-testid="my-flow-item-detail-sheet"] [data-testid="my-flow-item-detail"]:visible, '
      + '[data-testid="my-flow-workspace-detail-pane"] [data-testid="my-flow-item-detail"]:visible, '
      + '[data-testid="my-flow-calendar-item-inspector-region"] [data-testid="my-flow-item-detail"]:visible, '
      + '[data-testid="my-flow-item-detail"]:visible',
  ).last();
}

export async function openMyFlowCalendarSelectedDay(
  page: Page,
  date?: string,
): Promise<Locator> {
  const mobileViewport = (page.viewportSize()?.width ?? 0) < 768;
  if (mobileViewport) {
    const openSheet = page.getByTestId('my-flow-calendar-day-sheet');
    if (await openSheet.isVisible().catch(() => false)) {
      if (!date) return openSheet.getByTestId('my-flow-calendar-selected-day');
      await page.getByTestId('my-flow-calendar-day-sheet-close').click();
    }
    const dateCell = date
      ? page.locator(`.fc-daygrid-day[data-date="${date}"]`)
      : page.locator('.fc-daygrid-day.my-flow-calendar-selected-date');
    const dateButton = dateCell.getByTestId('my-flow-calendar-date-button');
    await expect(dateButton).toBeVisible();
    await dateButton.click();
    const sheet = page.getByTestId('my-flow-calendar-day-sheet');
    await expect(sheet).toBeVisible();
    return sheet.getByTestId('my-flow-calendar-selected-day');
  }

  if (date) {
    const dateButton = page
      .locator(`.fc-daygrid-day[data-date="${date}"]`)
      .getByTestId('my-flow-calendar-date-button');
    await expect(dateButton).toBeVisible();
    await dateButton.click();
  }
  const selectedDay = page.getByTestId('my-flow-calendar-selected-day');
  await expect(selectedDay).toBeVisible();
  return selectedDay;
}

export async function closeOpenMyFlowItemDetail(page: Page): Promise<void> {
  const close = page.getByTestId('my-flow-item-detail-sheet-close');
  if (await close.isVisible().catch(() => false)) {
    // Completion and editor saves may close the sheet before this helper's
    // click reaches it. Treat that detach as success, but still verify that a
    // visible sheet was not left behind.
    await close.click({ timeout: 2_000 }).catch(() => undefined);
    await expect(close).toHaveCount(0);
  }
}

export async function expandMyFlowWholePlan(flow: Locator): Promise<Locator> {
  const outline = flow.getByTestId('my-flow-whole-flow-outline');
  await expect(outline).toBeVisible();

  const toggles = outline.getByTestId('my-flow-whole-flow-section-toggle');
  const toggleCount = await toggles.count();
  for (let index = 0; index < toggleCount; index += 1) {
    const toggle = toggles.nth(index);
    if ((await toggle.getAttribute('aria-expanded')) === 'false') {
      await toggle.click();
    }
  }

  return outline;
}

export async function getMyFlowVisibleExecutionRows(flow: Locator): Promise<Locator> {
  return flow.locator('[data-testid="my-flow-execution-row-shell"]:visible');
}

export async function openPersonalDraftListExport(flow: Locator): Promise<Locator> {
  let panel = flow.getByTestId('personal-draft-list-export');
  if (await panel.isVisible().catch(() => false)) {
    if (!(await panel.getByTestId('my-flow-export-panel').isVisible().catch(() => false))) {
      await panel.getByTestId('personal-draft-list-export-toggle').click();
    }
    return panel;
  }

  const recordTab = flow.getByTestId('my-flow-workspace-tab-record');
  if (await recordTab.isVisible().catch(() => false)) await recordTab.click();
  const advanced = flow.getByTestId('my-flow-workspace-advanced-actions');
  if (
    await advanced.isVisible().catch(() => false) &&
    (await advanced.getAttribute('open')) === null
  ) {
    await advanced.locator(':scope > summary').click();
  }

  panel = flow.getByTestId('personal-draft-list-export');
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
  return flow.locator(
    `[data-testid="personal-draft-effective-item"]${ownershipSelector}`,
  );
}
