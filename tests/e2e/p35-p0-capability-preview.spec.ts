import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  gotoLegacySavedPlanLibraryRoute,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';

const SOURCE_FLOW_SLUG = 'moving-d30-basic';
const SOURCE_ROUTE = `/f/${SOURCE_FLOW_SLUG}`;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

type RawStorageSnapshot = Readonly<{
  local: Readonly<Record<string, string>>;
  session: Readonly<Record<string, string>>;
}>;

type HistorySnapshot = Readonly<{
  href: string;
  length: number;
  state: string;
}>;

async function resetAndOpenPublicPreview(
  page: Page,
  route = SOURCE_ROUTE,
): Promise<Locator> {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await gotoLegacySavedPlanLibraryRoute(page, route);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();

  const preview = page.getByTestId('public-flow-capability-result');
  await expect(preview).toBeVisible();
  return preview;
}

async function rawStorageSnapshot(page: Page): Promise<RawStorageSnapshot> {
  return page.evaluate(() => {
    const read = (storage: Storage): Record<string, string> => {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
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

async function historySnapshot(page: Page): Promise<HistorySnapshot> {
  return page.evaluate(() => ({
    href: window.location.href,
    length: window.history.length,
    state: JSON.stringify(window.history.state ?? null),
  }));
}

async function installClipboardSentinel(page: Page): Promise<string | null> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  const sentinel = `p35-p007-preview-${Date.now()}`;
  return page.evaluate(async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }, sentinel);
}

async function readClipboardBestEffort(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  });
}

async function seedSavedMovingFlow(page: Page): Promise<void> {
  await page.goto('/flows');
  await page.evaluate((fixture) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(`flow:saved:${fixture.slug}`, JSON.stringify({
      slug: fixture.slug,
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: fixture.anchor,
      dateIntent: 'custom',
    }));
    window.localStorage.setItem(
      `flow:${fixture.slug}:anchorDate`,
      JSON.stringify({ mode: 'custom', anchor: fixture.anchor }),
    );
  }, { slug: SOURCE_FLOW_SLUG, anchor: '2031-09-01' });
}

test.describe('P35 P0-07 capability result preview', () => {
  test('quickLocalResult=off keeps public format selection preview-only', async ({ page }) => {
    let downloadCount = 0;
    const writeRequests: string[] = [];
    page.on('download', () => {
      downloadCount += 1;
    });
    page.on('request', (request) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        writeRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    const preview = await resetAndOpenPublicPreview(
      page,
      `${SOURCE_ROUTE}?quickLocalResult=off`,
    );
    await expect(page.locator('main[data-p35-p007-capability-result="on"]')).toBeVisible();
    await expect(page.locator('main[data-p35-q1-quick-local="off"]')).toBeVisible();
    await expect(preview).toHaveAttribute('data-capability-lifecycle', 'public_preview');
    await expect(preview).toHaveAttribute('data-capability-snapshot-kind', 'effective_authoring');
    await expect(preview).toHaveAttribute('data-capability-primary-destination', 'checklist');

    const primary = preview.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
    );
    await expect(primary).toHaveCount(1);
    await expect(primary).toHaveAttribute('data-capability-destination', 'checklist');
    await expect(primary).toHaveAttribute('data-capability-output-count', '24');

    const immediateAvailable = preview.locator(
      '[data-testid="flow-capability-result-choice"]'
        + '[data-capability-candidate-role="available"]'
        + '[data-capability-immediate="true"]',
    );
    expect(await immediateAvailable.count()).toBeLessThanOrEqual(2);

    const conditionalCalendar = preview.locator(
      '[data-testid="flow-capability-conditional-result"][data-capability-destination="calendar"]',
    );
    await expect(conditionalCalendar).toHaveCount(1);
    await expect(conditionalCalendar).toHaveAttribute('data-capability-output-count', '0');
    await expect(conditionalCalendar).toHaveAttribute('data-capability-expected-output-count', '24');
    await expect(
      conditionalCalendar.getByTestId('flow-capability-conditional-edit'),
    ).toHaveAttribute('data-condition-action', 'edit_schedule');

    await expect(preview.locator('[data-action-role="create-quick-local-result"]')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
    await expect(page.locator('[data-action-role="save-to-personal-plan"]:visible')).toHaveCount(1);
    await expect(page.locator('[data-action-role="edit-public-draft"]:visible')).toHaveCount(1);

    const storageBefore = await rawStorageSnapshot(page);
    const historyBefore = await historySnapshot(page);
    const clipboardBefore = await installClipboardSentinel(page);
    writeRequests.length = 0;

    const selectableAlternatives = preview.locator(
      '[data-testid="flow-capability-result-choice"]'
        + '[data-capability-candidate-role="available"]',
    );
    const selectableCount = await selectableAlternatives.count();
    expect(selectableCount).toBeGreaterThan(0);
    for (let index = 0; index < selectableCount; index += 1) {
      const choice = selectableAlternatives.nth(index);
      const destination = await choice.getAttribute('data-capability-destination');
      await choice.click();
      await expect(preview).toHaveAttribute('data-capability-selected-destination', destination ?? '');
      await expect(preview.getByTestId('flow-capability-selected-preview')).toHaveAttribute(
        'data-capability-destination',
        destination ?? '',
      );
    }

    expect(await rawStorageSnapshot(page)).toEqual(storageBefore);
    expect(await historySnapshot(page)).toEqual(historyBefore);
    expect(downloadCount).toBe(0);
    expect(writeRequests).toEqual([]);
    if (clipboardBefore !== null) {
      expect(await readClipboardBestEffort(page)).toBe(clipboardBefore);
    }
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  });

  test('conditional Calendar uses the shared editor and becomes a 24-item ready result', async ({ page }) => {
    const preview = await resetAndOpenPublicPreview(page);
    const conditionalCalendar = preview.locator(
      '[data-testid="flow-capability-conditional-result"][data-capability-destination="calendar"]',
    );
    await expect(conditionalCalendar).toHaveAttribute('data-capability-output-count', '0');
    await expect(conditionalCalendar).toHaveAttribute('data-capability-expected-output-count', '24');

    await conditionalCalendar.getByTestId('flow-capability-conditional-edit').click();
    const editor = page.getByTestId('public-flow-personal-adjustment');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute('data-flow-editor-surface', 'true');
    await expect(editor).toHaveAttribute('data-editor-adapter', 'shared');
    await expect(editor).toHaveAttribute('data-editor-context', 'public-draft');
    await expect(editor).toHaveAttribute('data-editor-level', 'plan');
    await expect(editor).toHaveAttribute('data-editor-transaction', 'atomic');
    await expect(editor).toHaveAttribute('data-editor-commit-role', 'apply-public-draft');
    await expect(editor).toHaveAttribute('data-adjustment-kind', 'anchor');
    await expect(editor.getByTestId('public-flow-adjustment-kind-anchor')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await editor.getByTestId('public-flow-adjustment-anchor-input').fill('2031-09-01');
    await editor.getByTestId('public-flow-adjustment-apply').click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByTestId('public-flow-anchor-input')).toHaveValue('2031-09-01');

    const updatedPreview = page.getByTestId('public-flow-capability-result');
    await expect(updatedPreview).toHaveAttribute('data-capability-primary-destination', 'calendar');
    const calendarResult = updatedPreview.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]',
    );
    await expect(calendarResult).toHaveAttribute('data-capability-candidate-role', 'primary');
    await expect(calendarResult).toHaveAttribute('data-capability-output-count', '24');
    await expect(updatedPreview.locator(
      '[data-testid="flow-capability-conditional-result"][data-capability-destination="calendar"]',
    )).toHaveCount(0);
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  });

  test('saved moving Flow opens transfer preview with execution snapshot metadata only', async ({ page }) => {
    let downloadCount = 0;
    page.on('download', () => {
      downloadCount += 1;
    });

    await page.setViewportSize(MOBILE_VIEWPORT);
    await seedSavedMovingFlow(page);
    await gotoLegacySavedPlanLibraryRoute(page, `/my?view=flows&flow=${SOURCE_FLOW_SLUG}`);
    const workspace = await openMyFlowLibraryFlow(page, SOURCE_FLOW_SLUG);
    const transferEntry = workspace.getByTestId('my-flow-export-entry');
    await expect(transferEntry).toBeVisible();
    await expect(transferEntry).toHaveAttribute('data-action-role', 'transfer-to-own-tool');
    await transferEntry.click();

    const panel = workspace.getByTestId('my-flow-export-panel');
    const capability = panel.getByTestId('my-flow-capability-result');
    await expect(panel).toBeVisible();
    await expect(capability).toBeVisible();
    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'saved_detail');
    await expect(capability).toHaveAttribute('data-capability-snapshot-kind', 'effective_execution');
    await expect(capability).toHaveAttribute('data-capability-snapshot-version', /.+\|.*\|.*/u);
    await expect(capability).toHaveAttribute('data-capability-primary-destination', 'calendar');
    await expect(capability).toHaveAttribute('data-capability-primary-action', 'execute-saved-result');
    await expect(capability).toHaveAttribute('data-capability-primary-action-owner', 'saved_plan_detail');
    await expect(capability).toHaveAttribute(
      'data-capability-secondary-actions',
      'edit-saved-plan,transfer-to-own-tool',
    );
    await expect(capability).toHaveAttribute('data-capability-manifest-hash', /.+/u);
    await expect(capability).toHaveAttribute('data-capability-output-count', '24');
    await expect(capability.locator('[data-action-role="create-quick-local-result"]')).toHaveCount(0);

    const manifestItemIds = (await capability.getAttribute('data-capability-manifest-item-ids'))
      ?.split(',')
      .filter(Boolean) ?? [];
    expect(manifestItemIds).toHaveLength(24);
    await expect(panel.getByTestId('my-flow-export-receipt-step')).toHaveCount(0);
    expect(downloadCount).toBe(0);
  });

  test('capabilityResult=off restores the legacy public preview and export entry', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${SOURCE_ROUTE}?capabilityResult=off`);
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();

    await expect(page.locator('main[data-p35-p007-capability-result="off"]')).toBeVisible();
    await expect(page.getByTestId('public-flow-capability-result')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-artifact-preview')).toBeVisible();
    await expect(page.getByTestId('public-flow-artifact-preview')).toHaveAttribute(
      'data-primary-shape',
      'calendar',
    );
    await expect(page.getByTestId('public-flow-provisional-schedule')).toBeVisible();
    await expect(page.getByTestId('public-flow-export-secondary-entry')).toBeVisible();
    await expect(page.locator('[data-action-role="create-quick-local-result"]')).toHaveCount(0);
  });
});
