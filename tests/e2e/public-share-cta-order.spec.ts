import { expect, test, type Page } from '@playwright/test';
import {
  gotoLegacySavedPlanLibraryRoute,
  getOpenMyFlowItemDetail,
  installLegacySavedPlanLibraryNavigation,
  openMyFlowLibraryFlow,
} from './helpers/my-flow-library';
import { openSavedPublicFlow, savePublicFlow } from './helpers/public-flow-save';

type StickyPrimaryEntry = {
  text: string;
  accessibleName: string;
  testId: string;
};

const APPROVED_PUBLIC_SHARE_ROUTES = [
  '/f/vehicle-inspection-prep',
  '/f/moving-d30-basic',
  '/f/fridge-cleanout-weekly-plan',
  '/f/washer-tub-clean-monthly',
  '/f/new-car-delivery-check',
  '/f/used-car-buying-check',
];

const CLOSED_REVIEW_FLOW_ROUTES = [
  '/f/real-thankyou-bubu-home-workout-starter',
  '/f/real-fitvely-video-body-fat-6kg-method',
];

const PUBLIC_PRIMARY_ACTION_PATTERN = /내 계획에 저장|(?:이사일|시작일|검사일) 정하기/;

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
          '[data-testid="public-flow-mobile-save-cta"] [data-action-priority="primary"]',
          '[data-testid="mobile-export-bar"] [data-action-priority="primary"]',
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

type PublicFlowUnitHierarchy = {
  capabilityResultCount: number;
  capabilityPrimaryCount: number;
  capabilityImmediateAvailableCount: number;
  capabilitySelectedPreviewCount: number;
  capabilitySelectedOutputCount: number;
  capabilitySelectedItemIds: string[];
  itemLevelExportLikeLabelCount: number;
  preSaveCheckboxCount: number;
  preSaveCheckboxCompletionLikeLabelCount: number;
  preSaveCheckboxPreviewLabelCount: number;
  preSavePreviewControlCount: number;
  preSavePreviewRowCount: number;
  artifactRepresentationCount: number;
  itemLevelExportLikeLabels: string[];
  preSaveCheckboxLabels: string[];
};

async function collectPublicFlowUnitHierarchy(page: Page) {
  return page.evaluate<PublicFlowUnitHierarchy>(() => {
    const isVisible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const visibleText = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const exportLikePattern = /(받기|복사|파일|시트|캘린더|문서|내보내기|가져가기|옮기기)/;

    const capabilityResults = Array.from(document.querySelectorAll('[data-testid="public-flow-capability-result"]'))
      .filter(isVisible);
    const capabilityPrimary = Array.from(document.querySelectorAll(
      '[data-testid="flow-capability-result-choice"][data-capability-candidate-role="primary"]',
    )).filter(isVisible);
    const capabilityImmediateAvailable = Array.from(document.querySelectorAll(
      '[data-testid="flow-capability-result-choice"]'
        + '[data-capability-candidate-role="available"]'
        + '[data-capability-immediate="true"]',
    )).filter(isVisible);
    const capabilitySelectedPreviews = Array.from(document.querySelectorAll(
      '[data-testid="flow-capability-selected-preview"]',
    )).filter(isVisible);
    const selectedPreview = capabilitySelectedPreviews[0];
    const itemLevelExportLikeLabels = Array.from(document.querySelectorAll('[data-testid^="mobile-artifact-export-"]'))
      .filter(isVisible)
      .map(visibleText)
      .filter((label) => exportLikePattern.test(label));
    const publicPreSaveCheckboxes = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"] input[type="checkbox"]'))
      .filter(isVisible);
    const publicPreSaveCheckboxLabels = publicPreSaveCheckboxes
      .map((element) => element.getAttribute('aria-label') ?? '')
      .filter(Boolean);
    const capabilityArtifactPreviews = Array.from(document.querySelectorAll('[data-testid="flow-capability-artifact-preview"]'))
      .filter(isVisible);
    const capabilityArtifactPreviewRows = Array.from(document.querySelectorAll('[data-testid="flow-capability-artifact-preview-row"]'))
      .filter(isVisible);
    const completionLikeCheckboxLabelPattern =
      /(완료|완료 체크|완료 취소|실행판 체크|회차 완료|이유식 완료|관리일 완료|관리 체크|전체 보기 체크|선택 일정 체크|단계 체크)/u;
    const previewCheckboxLabelPattern = /(미리보기|저장 전|선택|포함 표시|확인 표시)/u;
    const previewControls = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"] input, [aria-label="Flow artifact workbench"] textarea, [aria-label="Flow artifact workbench"] select, [aria-label="Flow artifact workbench"] button'))
      .filter(isVisible)
      .filter((element) => !element.closest('[data-testid="public-flow-capability-result"]'));

    return {
      capabilityResultCount: capabilityResults.length,
      capabilityPrimaryCount: capabilityPrimary.length,
      capabilityImmediateAvailableCount: capabilityImmediateAvailable.length,
      capabilitySelectedPreviewCount: capabilitySelectedPreviews.length,
      capabilitySelectedOutputCount: Number(
        selectedPreview?.getAttribute('data-capability-output-count') ?? '0',
      ),
      capabilitySelectedItemIds: (
        selectedPreview?.getAttribute('data-capability-manifest-item-ids') ?? ''
      ).split(',').filter(Boolean),
      itemLevelExportLikeLabelCount: itemLevelExportLikeLabels.length,
      preSaveCheckboxCount: publicPreSaveCheckboxes.length,
      preSaveCheckboxCompletionLikeLabelCount: publicPreSaveCheckboxLabels
        .filter((label) => completionLikeCheckboxLabelPattern.test(label))
        .length,
      preSaveCheckboxPreviewLabelCount: publicPreSaveCheckboxLabels
        .filter((label) => previewCheckboxLabelPattern.test(label))
        .length,
      preSavePreviewControlCount: previewControls.length,
      preSavePreviewRowCount: capabilityArtifactPreviewRows.length,
      artifactRepresentationCount: capabilityArtifactPreviews.length,
      itemLevelExportLikeLabels,
      preSaveCheckboxLabels: publicPreSaveCheckboxLabels,
    };
  });
}

test.describe('public share shell secondary browse order', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} exposes one save-oriented primary before scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, route);

      const visiblePrimaryActions = await collectVisibleMobileStickyPrimaryEntries(page);
      expect(visiblePrimaryActions).toHaveLength(1);
      expect(visiblePrimaryActions[0]?.text).toMatch(PUBLIC_PRIMARY_ACTION_PATTERN);
    });
  }

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps Flow finding reachable in the public header`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, route);

      const shell = page.getByTestId('flow-public-shell');
      const browseLink = shell.getByRole('link', { name: /계획 찾기$/ });

      await expect(shell).toBeVisible();
      await expect(browseLink).toBeVisible();
      await expect(browseLink).toHaveAttribute('href', '/flows');
      await expect(browseLink).not.toHaveAttribute('tabindex', '-1');
      await expect(browseLink).not.toHaveAttribute('aria-hidden', 'true');
      await expect(page.getByTestId('flow-public-secondary-browse-link')).toHaveCount(0);
    });

    test(`${route} keeps the mobile sticky primary action save-oriented`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, route);
      await page.evaluate(() => window.scrollTo(0, 720));
      await page.waitForTimeout(250);

      const stickyPrimaryEntries = await collectVisibleMobileStickyPrimaryEntries(page);
      expect(stickyPrimaryEntries.length).toBeGreaterThan(0);

      const [primaryEntry] = stickyPrimaryEntries;
      expect(primaryEntry.accessibleName).toMatch(PUBLIC_PRIMARY_ACTION_PATTERN);
      expect(primaryEntry.text).toMatch(PUBLIC_PRIMARY_ACTION_PATTERN);
      expect(primaryEntry.text).not.toMatch(/도구|파일|받기|복사|다운로드|xlsx|ics/i);
    });
  }

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps quick local transfer contextual to the capability result`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, route);
      await expect(page.getByTestId('public-flow-detail-workspace')).toHaveCount(0);
      await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
      const capability = page.getByTestId('public-flow-capability-result');
      await expect(capability).toBeVisible();
      await expect(capability).toHaveAttribute('data-capability-lifecycle', 'public_preview');
      await expect(capability).toHaveAttribute('data-capability-snapshot-kind', 'effective_authoring');
      const hierarchy = await collectPublicFlowUnitHierarchy(page);
      expect(hierarchy.capabilityResultCount).toBe(1);
      expect(hierarchy.capabilityPrimaryCount).toBe(1);
      expect(hierarchy.capabilityImmediateAvailableCount).toBeLessThanOrEqual(2);
      expect(hierarchy.capabilitySelectedPreviewCount).toBe(1);
      expect(hierarchy.capabilitySelectedOutputCount).toBeGreaterThan(0);
      expect(hierarchy.capabilitySelectedItemIds).toHaveLength(
        hierarchy.capabilitySelectedOutputCount,
      );

      const quickEntry = page.getByTestId('public-flow-quick-result-entry');
      const quickEligible = await page.locator('main').getAttribute('data-p35-q1-quick-eligible');
      await expect(quickEntry).toHaveCount(quickEligible === 'true' ? 1 : 0);
      if (quickEligible === 'true') {
        await expect(quickEntry).toHaveAttribute('data-action-priority', 'secondary');
        await expect(quickEntry).toHaveAttribute('data-action-role', 'create-quick-local-result');
        await expect(quickEntry).toHaveAttribute('data-action-owner', 'public-quick-confirmation');
        await quickEntry.click();
        const confirmation = page.getByTestId('public-flow-quick-result-confirmation');
        const selectedPreview = capability.getByTestId('flow-capability-selected-preview');
        await expect(confirmation).toHaveAttribute(
          'data-snapshot-kind',
          (await capability.getAttribute('data-capability-snapshot-kind')) ?? '',
        );
        await expect(confirmation).toHaveAttribute(
          'data-snapshot-version',
          (await capability.getAttribute('data-capability-snapshot-version')) ?? '',
        );
        await expect(confirmation).toHaveAttribute(
          'data-snapshot-hash',
          (await selectedPreview.getAttribute('data-capability-manifest-hash')) ?? '',
        );
        await expect(confirmation).toHaveAttribute(
          'data-item-ids',
          hierarchy.capabilitySelectedItemIds.join(','),
        );
        await expect(confirmation).toHaveAttribute(
          'data-output-count',
          String(hierarchy.capabilitySelectedOutputCount),
        );
        await confirmation.getByTestId('public-flow-quick-result-cancel').click();
        await expect(confirmation).toHaveCount(0);
        await expect(quickEntry).toBeFocused();
      }
      expect(hierarchy.itemLevelExportLikeLabelCount).toBe(0);
      expect(hierarchy.preSavePreviewRowCount).toBeGreaterThan(0);
    });
  }

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps save-before items read-only and reserves completion for My Flow`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLegacySavedPlanLibraryRoute(page, route);

      const hierarchy = await collectPublicFlowUnitHierarchy(page);
      expect(hierarchy.preSaveCheckboxCompletionLikeLabelCount).toBe(0);
      expect(hierarchy.preSaveCheckboxCount).toBe(0);
      expect(hierarchy.preSaveCheckboxPreviewLabelCount).toBe(0);
      expect(hierarchy.artifactRepresentationCount).toBe(1);
      expect(hierarchy.capabilityResultCount).toBe(1);
      expect(hierarchy.capabilityPrimaryCount).toBe(1);
      expect(hierarchy.capabilitySelectedPreviewCount).toBe(1);
      expect(hierarchy.capabilitySelectedItemIds).toHaveLength(
        hierarchy.capabilitySelectedOutputCount,
      );
      expect(hierarchy.preSavePreviewRowCount).toBeGreaterThan(0);
    });
  }

  for (const route of CLOSED_REVIEW_FLOW_ROUTES) {
    test(`${route} stays out of the public share shell until source-fit review is complete`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await gotoLegacySavedPlanLibraryRoute(page, route);

      expect(response?.status()).toBe(404);
      await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: '이 계획은 지금 열 수 없어요' })).toBeVisible();
      await expect(page.getByRole('link', { name: '다른 계획 찾기' })).toHaveAttribute('href', '/flows');
      await expect(page.getByRole('button', { name: PUBLIC_PRIMARY_ACTION_PATTERN })).toHaveCount(0);
      await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
      await expect(page.getByTestId('mobile-export-bar')).toHaveCount(0);
      await expect(page.getByRole('checkbox')).toHaveCount(0);
    });
  }

  test('input-free workbench save path remains keyboard reachable and leads to My Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installLegacySavedPlanLibraryNavigation(page);
    await gotoLegacySavedPlanLibraryRoute(page, '/f/new-car-delivery-check');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
    await expect(page.getByTestId('public-flow-capability-result')).toBeVisible();

    const mobileSave = page.getByTestId('public-flow-mobile-save-cta');
    const saveButton = mobileSave.getByTestId('public-flow-save-primary-mobile');
    await expect(saveButton).toHaveText('내 계획에 저장');
    await expect(saveButton).toBeVisible();
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    const receipt = await savePublicFlow(page, saveButton);
    await openSavedPublicFlow(page, receipt);
    await expect(page.getByTestId('my-flow-post-save-panel')).toHaveCount(0);
    const workspace = await openMyFlowLibraryFlow(page, 'new-car-delivery-check', 'execute');

    const execution = workspace.getByTestId('my-flow-workspace-execute');
    await expect(execution).toBeVisible();
    await expect(execution).toContainText('이어서 기록할 행');
    await expect(execution).toContainText('현재 행');
    await expect(execution).toContainText('다음 행');

    const postSaveRow = execution.getByTestId('my-flow-execution-row-shell').first();
    await expect(postSaveRow.getByTestId('my-flow-task-complete-control')).toHaveCount(0);
    await postSaveRow.getByRole('button', { name: /열기/ }).click();
    const detail = getOpenMyFlowItemDetail(page);
    const postSaveComplete = detail.getByTestId('my-flow-task-complete-control');
    await expect(postSaveComplete).toBeVisible();
    await expect(postSaveComplete).toHaveCount(1);
    await expect(page.getByTestId('my-flow-task-complete-control')).toHaveCount(1);
    await expect(postSaveComplete).toHaveAttribute('type', 'checkbox');
    await expect(postSaveComplete).toHaveAttribute('aria-label', /완료/);
    await expect(execution.getByRole('button', { name: /^완료$/ })).toHaveCount(0);

    await postSaveComplete.click();
    await expect(postSaveComplete).toBeChecked();
    await expect.poll(() => page.evaluate(() =>
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('flow_builder_mvp_checks_'))
        .some((key) => Object.values(JSON.parse(window.localStorage.getItem(key) || '{}')).some(Boolean)),
    )).toBe(true);
  });
});
