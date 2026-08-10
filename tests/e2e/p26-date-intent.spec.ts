import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  gotoLegacySavedPlanLibraryRoute,
  installLegacySavedPlanLibraryNavigation,
} from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

const evidenceDir = process.env.FLOW_EVIDENCE_DIR;
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

async function capture(page: Page, filename: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (!evidenceDir) return;
  const screenshots = path.join(evidenceDir, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

test('an example moving schedule stays provisional until the person chooses a real date or explicit undated save', async ({ page }) => {
  await installLegacySavedPlanLibraryNavigation(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');

  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-primary-destination', 'checklist');
  await expect(capability.getByTestId('flow-capability-selected-preview')).toHaveAttribute(
    'data-capability-destination',
    'checklist',
  );
  const conditionalCalendar = capability.locator(
    '[data-testid="flow-capability-conditional-result"][data-capability-destination="calendar"]',
  );
  await expect(conditionalCalendar).toHaveAttribute('data-capability-output-count', '0');
  await expect(conditionalCalendar).toHaveAttribute('data-capability-expected-output-count', '24');

  const primary = page.getByTestId('public-flow-save-primary-mobile');
  await expect(primary).toHaveText('이사일 정하기');
  await primary.click();
  await expect(page.getByTestId('public-flow-anchor-input')).toBeFocused();
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('flow:saved:moving-d30-basic')
  ))).toBeNull();

  const saveUndated = page.getByTestId('public-flow-save-undated-mobile');
  await expect(saveUndated).toHaveText('날짜 없이 내 계획에 저장');
  await capture(page, '00-provisional-example-mobile.png');
  const saveBanner = await savePublicFlow(page, saveUndated);
  await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText('24');
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(personalCopyKey).toMatch(/^personal-copy:/u);

  const state = await page.evaluate((copyKey) => ({
    saved: JSON.parse(window.localStorage.getItem(`flow:saved:${copyKey}`) || 'null'),
    anchor: JSON.parse(window.localStorage.getItem(`flow:${copyKey}:anchorDate`) || 'null'),
    legacySourceRecord: window.localStorage.getItem('flow:saved:moving-d30-basic'),
  }), personalCopyKey);
  expect(state.saved).toMatchObject({
    dateIntent: 'undated',
    selectedArtifactMode: 'checklist',
  });
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
  expect(state.legacySourceRecord).toBeNull();
  await openSavedPublicFlow(page, saveBanner);
  await expect(page.getByTestId('my-flow-shape-aware-execution')).toHaveAttribute(
    'data-execution-shape',
    'checklist',
  );
  await expect(page.getByTestId('my-flow-temporal-next-group')).toHaveCount(0);
});

test('a natural undated checklist saves without a competing date mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/f/vehicle-inspection-prep');

  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
  await expect(page.getByTestId('flow-capability-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );

  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-primary-destination', 'checklist');
  await expect(capability.locator(
    '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]'
      + '[data-capability-candidate-role="primary"], '
      + '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]'
      + '[data-capability-candidate-role="available"][data-capability-immediate="true"]',
  )).toHaveCount(0);

  const mobileSave = page.getByTestId('public-flow-save-primary-mobile');
  await expect(mobileSave).toHaveText('내 계획에 저장');
  await capture(page, '01-natural-undated-mobile.png');
  const saveBanner = await savePublicFlow(page, mobileSave);
  await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText('10');
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(personalCopyKey).toMatch(/^personal-copy:/u);

  const state = await page.evaluate((copyKey) => ({
    saved: JSON.parse(window.localStorage.getItem(`flow:saved:${copyKey}`) || 'null'),
    anchor: JSON.parse(window.localStorage.getItem(`flow:${copyKey}:anchorDate`) || 'null'),
    legacySourceRecord: window.localStorage.getItem('flow:saved:vehicle-inspection-prep'),
  }), personalCopyKey);
  expect(state.saved.dateIntent).toBe('undated');
  expect(state.saved.anchor).toBeUndefined();
  expect(state.anchor).toEqual({ mode: 'undated', anchor: '' });
  expect(state.legacySourceRecord).toBeNull();
  await openSavedPublicFlow(page, saveBanner);
  const focusedWorkspace = page.getByTestId('my-flow-mobile-workspace');
  await expect(focusedWorkspace).toBeVisible();
  await expect(focusedWorkspace).toContainText('자동차검사 D-14 준비');
  await page.goto('/calendar');
  await expect(page.locator('.fc-event')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-unscheduled-tray')).toHaveCount(0);
  await expect(page.getByTestId('my-flow-calendar-date-move-entry')).toHaveCount(0);
});

test('a date-anchored public Flow persists its one required date and enables ICS', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoLegacySavedPlanLibraryRoute(page, '/f/moving-d30-basic');

  await page.getByTestId('public-flow-anchor-input').fill('2026-07-28');
  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  const desktopSave = page.getByTestId('public-flow-save-primary');
  await expect(desktopSave).toHaveText('내 계획에 저장');

  const capability = page.getByTestId('public-flow-capability-result');
  await expect(capability).toHaveAttribute('data-capability-primary-destination', 'calendar');
  await expect(capability.locator(
    '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]'
      + '[data-capability-candidate-role="primary"]',
  )).toHaveCount(1);
  await capture(page, '02-custom-date-wide.png');
  const saveBanner = await savePublicFlow(page, desktopSave);
  await expect(saveBanner.getByTestId('my-flow-save-banner-summary')).toContainText('24');
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
  expect(personalCopyKey).toMatch(/^personal-copy:/u);

  const state = await page.evaluate((copyKey) => ({
    saved: JSON.parse(window.localStorage.getItem(`flow:saved:${copyKey}`) || 'null'),
    anchor: JSON.parse(window.localStorage.getItem(`flow:${copyKey}:anchorDate`) || 'null'),
    legacySourceRecord: window.localStorage.getItem('flow:saved:moving-d30-basic'),
  }), personalCopyKey);
  expect(state.saved.dateIntent).toBe('custom');
  expect(state.saved.anchor).toBe('2026-07-28');
  expect(state.anchor).toEqual({ mode: 'custom', anchor: '2026-07-28' });
  expect(state.legacySourceRecord).toBeNull();
  await page.goto('/calendar');
  await page.getByTestId('my-flow-month-picker').fill('2026-07');
  await expect(
    page.locator('.fc-daygrid-day[data-date="2026-06-28"] .fc-event'),
  ).not.toHaveCount(0);
  await page.locator('.fc-daygrid-day[data-date="2026-06-28"]')
    .getByTestId('my-flow-calendar-date-button')
    .click();
  await expect(
    page.getByTestId('my-flow-calendar-selected-day').getByRole('button', {
      name: /계획에서 열기/,
    }).first(),
  ).toBeVisible();
  await expect(page.getByTestId('my-flow-item-detail-sheet')).toHaveCount(0);
});

test('a natural undated result survives reload without exposing date-mode controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLegacySavedPlanLibraryRoute(page, '/f/vehicle-inspection-prep');

  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('public-flow-date-intent')).toHaveCount(0);
  await expect(page.getByTestId('flow-capability-artifact-preview')).toHaveAttribute(
    'data-selected-shape',
    'checklist',
  );
  await expect(page.getByTestId('public-flow-save-primary-mobile')).toHaveText(
    '내 계획에 저장',
  );
  await capture(page, '03-explicit-undated-mobile.png');
});

test('public preview preserves a legacy example save byte-for-byte until the user changes it', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'flow:vehicle-inspection-prep:anchorDate',
      JSON.stringify({ mode: 'example', anchor: '' }),
    );
    window.localStorage.setItem(
      'flow:saved:vehicle-inspection-prep',
      JSON.stringify({
        slug: 'vehicle-inspection-prep',
        savedAt: '2026-07-20T00:00:00.000Z',
        selectedArtifactMode: 'calendar',
        anchor: '2026-08-03',
      }),
    );
  });
  await page.goto('/f/vehicle-inspection-prep');
  await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
  await expect(page.getByTestId('public-flow-capability-result')).toBeVisible();

  const state = await page.evaluate(() => ({
    savedRaw: window.localStorage.getItem('flow:saved:vehicle-inspection-prep'),
    anchorRaw: window.localStorage.getItem('flow:vehicle-inspection-prep:anchorDate'),
  }));
  expect(state.savedRaw).toBe(
    '{"slug":"vehicle-inspection-prep","savedAt":"2026-07-20T00:00:00.000Z","selectedArtifactMode":"calendar","anchor":"2026-08-03"}',
  );
  expect(state.anchorRaw).toBe('{"mode":"example","anchor":""}');
});
