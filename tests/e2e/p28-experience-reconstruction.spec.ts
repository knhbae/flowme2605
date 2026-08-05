import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { openMyFlowLibraryFlow } from './helpers/my-flow-library';
import { savePublicFlow } from './helpers/public-flow-save';

const evidenceRoot = process.env.FLOWME_P28_EVIDENCE_DIR;
const runtimeErrorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const runtimeErrors: string[] = [];
  runtimeErrorsByPage.set(page, runtimeErrors);
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrorsByPage.get(page) ?? []).toEqual([]);
});

async function capture(page: Page, filename: string) {
  if (!evidenceRoot) return;
  const screenshots = path.join(evidenceRoot, 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true });
}

async function clearLocalState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('P28 shared save-before experience', () => {
  test('public Flow exposes one actual-data shape and single-kind pre-save adjustment', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);

    const hero = page.getByTestId('public-flow-hero');
    await expect(hero).toHaveAttribute('data-experience-architecture', 'p35-result-first');
    const capability = hero.getByTestId('public-flow-capability-result');
    const selectedPreview = capability.getByTestId('flow-capability-selected-preview');
    let artifactPreview = selectedPreview.getByTestId('flow-capability-artifact-preview');
    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
    await expect(capability).toHaveAttribute('data-capability-primary-destination', 'checklist');
    await expect(capability.getByTestId('flow-capability-artifact-preview-row')).toHaveCount(24);
    await expect(artifactPreview).not.toHaveAttribute('open', '');
    await expect(capability.getByTestId('flow-capability-artifact-preview-expand')).toHaveAccessibleName('나머지 21개 보기');
    await capture(page, '00-mobile-save-before-moving-compact.png');
    await capability.getByTestId('flow-capability-artifact-preview-expand').click();
    await expect(capability.getByTestId('flow-capability-artifact-preview-row').last()).toBeVisible();

    await expect(artifactPreview).toHaveAttribute('data-primary-shape', 'checklist');
    await expect(artifactPreview.getByTestId('flow-artifact-shape-choice')).toHaveCount(0);

    await page.getByTestId('public-flow-anchor-input').fill('2030-08-15');
    await expect(capability).toHaveAttribute('data-capability-primary-destination', 'calendar');
    await capability.locator(
      '[data-testid="flow-capability-result-choice"][data-capability-destination="calendar"]',
    ).click();
    await expect(capability).toHaveAttribute('data-capability-selected-destination', 'calendar');
    artifactPreview = capability
      .getByTestId('flow-capability-selected-preview')
      .getByTestId('flow-capability-artifact-preview');
    await expect(artifactPreview).toHaveAttribute('data-primary-shape', 'calendar');
    await expect(artifactPreview.getByRole('heading', { name: '캘린더 · 24개' })).toBeVisible();

    await expect(hero.getByRole('button', { name: /제목·날짜·메모 수정/ })).toHaveCount(0);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const adjustment = page.getByTestId('public-flow-personal-adjustment');
    await expect(adjustment).toHaveAttribute('data-adjustment-kind', 'name');
    await adjustment.getByTestId('public-flow-adjustment-name-input').fill('우리 집 이사 준비');
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-title"]')).toHaveCount(0);
    await expect(adjustment.locator('[data-testid="public-flow-adjustment-date"]')).toHaveCount(0);
    await adjustment.getByTestId('public-flow-adjustment-apply').click();
    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    expect(personalCopyKey).toMatch(/^personal-copy:/u);
    await expect(saveBanner).toHaveAttribute('data-personal-copy-key', personalCopyKey);
    const saved = await page.evaluate((flowSlug) => JSON.parse(
      window.localStorage.getItem(`flow:saved:${flowSlug}`) || 'null',
    ), personalCopyKey);
    expect(saved.personalTitle).toBe('우리 집 이사 준비');
    expect(saved.anchor).toBe('2030-08-15');
    expect(saved).toMatchObject({
      schemaVersion: 2,
      slug: personalCopyKey,
      personalCopyKey,
      sourceFlowSlug: 'moving-d30-basic',
      savedItemCount: 24,
    });
    await expect(await openMyFlowLibraryFlow(page, personalCopyKey)).toContainText('우리 집 이사 준비');
    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-hero')).toHaveCount(0);
    await capture(page, '01-mobile-save-before-moving-adjustment.png');
    await expectNoHorizontalOverflow(page);
  });

  test('URL hit routes one prepared Flow into the shared adjustment workspace', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/flows');
    await clearLocalState(page);
    await page.getByTestId('flow-url-lookup-input').fill(
      'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363',
    );
    await page.getByTestId('flow-url-lookup-entry').getByRole('button', { name: '계획 찾기' }).click();

    const result = page.getByTestId('flow-url-lookup-result');
    const sharedWorkspaceLink = result.getByRole('link', { name: '미리보기에서 편집' });
    await expect(sharedWorkspaceLink).toHaveAttribute('href', '/f/moving-d30-basic');
    await expect(result.getByTestId('flow-url-quick-start')).not.toHaveAttribute('open', '');
    await sharedWorkspaceLink.click();
    await expect(page).toHaveURL('/f/moving-d30-basic');
    await expect(page.getByTestId('public-flow-hero')).toHaveAttribute('data-experience-architecture', 'p35-result-first');
    await expectNoHorizontalOverflow(page);
  });

  test('wide save-before keeps the capability result without duplicate export or detail workspaces', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/f/moving-d30-basic');
    await clearLocalState(page);

    const capability = page.getByTestId('public-flow-capability-result');
    await expect(page.getByTestId('flow-save-before-primary-result').getByTestId('public-flow-capability-result')).toBeVisible();
    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
    await expect(capability.getByTestId('flow-capability-selected-preview')).toBeVisible();
    await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
    await capture(page, '02-wide-save-before-moving.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, '02b-desktop-save-before-moving.png');
    await expectNoHorizontalOverflow(page);
  });

  test('routine setup uses the shared cadence contract and keeps resources out of completion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/curated-allblanc-morning-workout');
    await clearLocalState(page);

    await page.getByTestId('public-flow-anchor-input').fill('2026-07-27');
    const summary = page.getByTestId('public-routine-schedule-summary');
    await expect(summary.getByTestId('public-routine-schedule-editor')).toHaveCount(0);
    await expect(summary.getByTestId('public-routine-schedule-summary-next-occurrences').getByRole('listitem')).toHaveCount(3);
    await summary.getByTestId('public-routine-schedule-summary-toggle').click();
    const editor = page.getByTestId('public-routine-schedule-editor');
    await expect(editor).toBeVisible();
    await expect(editor.getByTestId('public-routine-schedule-editor-frequency-summary')).toHaveText(/주 \d회/);
    await editor.getByTestId('public-routine-schedule-editor-time-mode').selectOption('timed');
    await editor.getByTestId('public-routine-schedule-editor-time').fill('07:30');
    await editor.getByTestId('public-routine-schedule-editor-duration').selectOption('45');
    await editor.getByTestId('public-routine-schedule-editor-end-mode').selectOption('count');
    await editor.getByTestId('public-routine-schedule-editor-occurrence-count').fill('8');
    const capability = page.getByTestId('public-flow-capability-result');
    await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
    await expect(capability.getByRole('checkbox')).toHaveCount(0);
    const sourceLink = page.getByTestId('public-flow-hero').locator('[data-flow-identity-slot="source"] a');
    await expect(sourceLink).toHaveCount(1);
    await expect(sourceLink).toHaveAttribute('target', '_blank');
    const saveBanner = await savePublicFlow(page, page.getByTestId('public-flow-save-primary-mobile'));
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') ?? '';
    await expect(saveBanner).toHaveAttribute('data-personal-copy-key', personalCopyKey);

    const saved = await page.evaluate((flowSlug) => JSON.parse(
      window.localStorage.getItem(`flow:saved:${flowSlug}`) || 'null',
    ), personalCopyKey);
    expect(saved).toMatchObject({
      schemaVersion: 2,
      slug: personalCopyKey,
      personalCopyKey,
      sourceFlowSlug: 'curated-allblanc-morning-workout',
    });
    expect(saved.routineDefinition).toEqual({
      schemaVersion: 1,
      time: '07:30',
      durationMinutes: 45,
      end: { mode: 'count', count: 8 },
    });

    await expect(page.getByTestId('public-flow-saved-receipt')).toHaveCount(0);
    await expect(page.getByTestId('exact-video-result-card')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('강도 낮춤');
    await expect(page.locator('body')).not.toContainText('휴식으로 변경');
    await capture(page, '03-mobile-routine-shared-contract.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await capture(page, '04-wide-routine-shared-contract.png');
    await expectNoHorizontalOverflow(page);
  });

  test('My Flow uses mobile drill-in and a wide library rail with explicit selection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/my?demo=ux20&view=flows');
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await expect(page.getByTestId('my-flow-mobile-structure-row')).toHaveCount(8);
    const firstMobileButton = page.getByTestId('my-flow-mobile-structure-open').first();
    const firstMobileTitle = (await firstMobileButton.innerText()).split('\n')[0];
    await firstMobileButton.click();
    await expect(page.getByTestId('my-flow-mobile-library-back')).toBeVisible();
    await expect(page.getByTestId('my-flow-mobile-workspace')).toHaveCount(1);
    await expect(page.getByTestId('my-flow-mobile-workspace')).toContainText(firstMobileTitle);
    await capture(page, '05-mobile-my-flow-drill-in.png');
    await page.getByTestId('my-flow-mobile-library-back').click();
    await expect(page.getByTestId('my-flow-mobile-flow-hub')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    const library = page.getByTestId('my-flow-library-workspace');
    await expect(library).toHaveAttribute('data-library-layout', 'rail-canvas-inspector');
    await expect(library).toBeVisible();
    expect(await library.getByTestId('my-flow-library-row').count()).toBeGreaterThanOrEqual(20);
    await expect(page.getByTestId('my-flow-scope-select')).toHaveCount(0);
    await expect(
      library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card'),
    ).toHaveCount(0);
    const second = library.getByTestId('my-flow-library-row').nth(1);
    const secondSlug = await second.getAttribute('data-flow-slug');
    await second.click();
    await expect(library.getByTestId('my-flow-library-detail').getByTestId('my-flow-overview-card')).toHaveAttribute('data-flow-slug', secondSlug ?? '');
    await capture(page, '06-wide-my-flow-library-detail.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, '06b-desktop-my-flow-library-detail.png');
    await expectNoHorizontalOverflow(page);
  });

  test('Calendar replaces a long Flow strip with a searchable persistent multi-select picker', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calendar?demo=ux12');
    await clearLocalState(page);

    const scope = page.getByTestId('my-flow-calendar-scope-filter');
    await expect(scope).toHaveAttribute('data-scope-presentation', 'picker');
    await expect(page.locator('[data-testid^="my-flow-calendar-scope-flow-"]')).toHaveCount(0);
    const trigger = page.getByTestId('calendar-flow-scope-picker-trigger');
    await expect(trigger).toContainText('전체 계획');
    await trigger.click();

    const picker = page.getByTestId('calendar-flow-scope-picker');
    await expect(picker).toBeVisible();
    await expect(picker.getByTestId('calendar-flow-scope-picker-search')).toBeFocused();
    await capture(page, '07-mobile-calendar-flow-picker.png');
    const options = picker.getByTestId('calendar-flow-scope-picker-option');
    expect(await options.count()).toBeGreaterThanOrEqual(6);
    await options.nth(0).getByRole('checkbox').check();
    await options.nth(1).getByRole('checkbox').check();
    const selectedSlugs = [
      await options.nth(0).getAttribute('data-flow-slug'),
      await options.nth(1).getAttribute('data-flow-slug'),
    ].filter((value): value is string => Boolean(value));
    await picker.getByTestId('calendar-flow-scope-picker-apply').click();
    await expect(trigger).toContainText('계획 2개');
    await expect.poll(() => page.evaluate(() => JSON.parse(
      window.localStorage.getItem('flow:calendar:selected-flows:v1') || '[]',
    ))).toEqual(selectedSlugs);
    await capture(page, '08-mobile-calendar-selected-flows.png');
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toContainText('계획 2개');
    await page.getByTestId('calendar-flow-scope-picker-trigger').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('calendar-flow-scope-picker-trigger')).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 768 });
    await capture(page, '09-wide-calendar-selected-flows.png');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, '09b-desktop-calendar-selected-flows.png');
    await expectNoHorizontalOverflow(page);
  });

  test('representative Flows render content-specific capability results without fixed empty tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const cases = [
      { slug: 'curated-allblanc-morning-workout', shape: 'checklist', renderer: 'flow-artifact-checklist-preview' },
      { slug: 'moving-d30-basic', shape: 'checklist', renderer: 'flow-artifact-checklist-preview' },
      { slug: 'used-car-buying-check', shape: 'checklist', renderer: 'flow-artifact-checklist-preview' },
      { slug: 'source-backed-middle-school-math-1', shape: 'sheet', renderer: 'flow-artifact-sheet-preview' },
      { slug: 'overseas-safety-register', shape: 'checklist', renderer: 'flow-artifact-checklist-preview' },
    ];

    for (const candidate of cases) {
      await page.goto(`/f/${candidate.slug}`);
      const capability = page.getByTestId('public-flow-capability-result');
      const selectedPreview = capability.getByTestId('flow-capability-selected-preview');
      const preview = selectedPreview.getByTestId('flow-capability-artifact-preview');
      await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
      await expect(selectedPreview).toHaveAttribute('data-capability-destination', candidate.shape);
      await expect(preview).toHaveAttribute('data-primary-shape', candidate.shape);
      await expect(preview.getByTestId(candidate.renderer).first()).toBeVisible();
      expect(await preview.getByTestId('flow-capability-artifact-preview-row').count()).toBeGreaterThan(0);
      await expect(preview.getByRole('group', { name: '결과 형태' })).toHaveCount(0);
      await capture(page, `10-mobile-shape-${candidate.shape}.png`);
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/f/source-backed-middle-school-math-1');
    await expect(page.getByTestId('flow-artifact-sheet-preview').first()).toBeVisible();
    await capture(page, '11-wide-shape-sheet.png');
    await expectNoHorizontalOverflow(page);
  });
});
