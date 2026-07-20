import { expect, test, type Page } from '@playwright/test';

type FocusableEntry = {
  text: string;
  href: string;
  testId: string;
};

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

const PUBLIC_START_ACTION_PATTERN = /그대로 시작|날짜 없이 시작|이 날짜로 시작/;

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
        testId: element.dataset.testid ?? element.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? '',
      }));
  });
}

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
          '[data-testid="public-flow-mobile-save-cta"] a',
          '[data-testid="public-flow-mobile-save-cta"] button',
          '[data-testid="mobile-export-bar"] a',
          '[data-testid="mobile-export-bar"] button',
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
  exportSecondaryEntryCount: number;
  exportFormatOptionCount: number;
  itemLevelExportLikeLabelCount: number;
  preSaveCheckboxCount: number;
  preSaveCheckboxCompletionLikeLabelCount: number;
  preSaveCheckboxPreviewLabelCount: number;
  preSaveItemCheckboxPreviewCount: number;
  preSavePreviewControlCount: number;
  preSavePreviewRowCount: number;
  includedItemMarkerCount: number;
  heroArtifactPreviewCount: number;
  artifactRepresentationCount: number;
  exportSecondaryEntryLabels: string[];
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
    const exportLikePattern = /(받기|복사|파일|시트|캘린더|문서|내보내기|가져가기)/;

    const secondaryEntries = Array.from(document.querySelectorAll('[data-testid="public-flow-export-secondary-entry"]'))
      .filter(isVisible);
    const formatOptions = Array.from(document.querySelectorAll('[data-testid="public-flow-export-format-option"]'))
      .filter(isVisible);
    const itemLevelExportLikeLabels = Array.from(document.querySelectorAll('[data-testid^="mobile-artifact-export-"]'))
      .filter(isVisible)
      .map(visibleText)
      .filter((label) => exportLikePattern.test(label));
    const previewCheckboxes = Array.from(document.querySelectorAll('[data-testid="artifact-list-card"] input[type="checkbox"]'))
      .filter(isVisible);
    const publicPreSaveCheckboxes = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"] input[type="checkbox"]'))
      .filter(isVisible);
    const publicPreSaveCheckboxLabels = publicPreSaveCheckboxes
      .map((element) => element.getAttribute('aria-label') ?? '')
      .filter(Boolean);
    const includedItemMarkers = Array.from(document.querySelectorAll('[data-testid="public-flow-included-item-marker"]'))
      .filter(isVisible);
    const heroArtifactPreviews = Array.from(document.querySelectorAll('[data-testid="public-flow-artifact-preview"]'))
      .filter(isVisible);
    const heroArtifactPreviewRows = Array.from(document.querySelectorAll('[data-testid="public-flow-artifact-preview-row"]'))
      .filter(isVisible);
    const artifactWorkbenches = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"]'))
      .filter(isVisible);
    const completionLikeCheckboxLabelPattern =
      /(완료|완료 체크|완료 취소|실행판 체크|회차 완료|이유식 완료|관리일 완료|관리 체크|전체 보기 체크|선택 일정 체크|단계 체크)/u;
    const previewCheckboxLabelPattern = /(미리보기|저장 전|선택|포함 표시|확인 표시)/u;
    const previewControls = Array.from(document.querySelectorAll('[aria-label="Flow artifact workbench"] input, [aria-label="Flow artifact workbench"] textarea, [aria-label="Flow artifact workbench"] select, [aria-label="Flow artifact workbench"] button'))
      .filter(isVisible)
      .filter((element) => !element.closest('[data-testid="public-flow-export-secondary-entry"]'));

    return {
      exportSecondaryEntryCount: secondaryEntries.length,
      exportFormatOptionCount: formatOptions.length,
      itemLevelExportLikeLabelCount: itemLevelExportLikeLabels.length,
      preSaveCheckboxCount: publicPreSaveCheckboxes.length,
      preSaveCheckboxCompletionLikeLabelCount: publicPreSaveCheckboxLabels
        .filter((label) => completionLikeCheckboxLabelPattern.test(label))
        .length,
      preSaveCheckboxPreviewLabelCount: publicPreSaveCheckboxLabels
        .filter((label) => previewCheckboxLabelPattern.test(label))
        .length,
      preSaveItemCheckboxPreviewCount: previewCheckboxes.length,
      preSavePreviewControlCount: previewControls.length,
      preSavePreviewRowCount: heroArtifactPreviewRows.length,
      includedItemMarkerCount: includedItemMarkers.length,
      heroArtifactPreviewCount: heroArtifactPreviews.length,
      artifactRepresentationCount: heroArtifactPreviews.length + artifactWorkbenches.length,
      exportSecondaryEntryLabels: secondaryEntries.map(visibleText),
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
      await page.goto(route);

      const visibleSaveActions = await page.getByRole('button', { name: PUBLIC_START_ACTION_PATTERN }).evaluateAll((elements) =>
        elements.filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }).length,
      );
      expect(visibleSaveActions).toBe(1);
    });
  }

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps browse navigation reachable after the save path`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const shell = page.getByTestId('flow-public-shell');
      const browseLink = page.getByTestId('flow-public-secondary-browse-link');

      await expect(shell).toBeVisible();
      await expect(browseLink).toBeVisible();
      await expect(browseLink).toHaveText('콘텐츠 더 보기');
      await expect(browseLink).toHaveAttribute('href', '/flows');
      await expect(browseLink).not.toHaveAttribute('tabindex', '-1');
      await expect(browseLink).not.toHaveAttribute('aria-hidden', 'true');

      const focusableEntries = await collectFocusableEntries(page);
      const browseIndex = focusableEntries.findIndex(
        (entry) => entry.testId === 'flow-public-secondary-browse-link',
      );
      const primaryIndex = focusableEntries.findIndex(
        (entry) =>
          entry.testId === 'public-flow-primary-setup' ||
          entry.testId === 'public-flow-mobile-save-cta' ||
          entry.testId === 'public-flow-save-actions' ||
          entry.text.includes('그대로 시작') ||
          entry.text.includes('날짜 없이 시작') ||
          entry.text.includes('이 날짜로 시작'),
      );

      expect(browseIndex).toBeGreaterThanOrEqual(0);
      expect(primaryIndex).toBeGreaterThanOrEqual(0);
      expect(browseIndex).toBeGreaterThan(primaryIndex);
    });

    test(`${route} keeps the mobile sticky primary action save-oriented`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await page.evaluate(() => window.scrollTo(0, 720));
      await page.waitForTimeout(250);

      const stickyPrimaryEntries = await collectVisibleMobileStickyPrimaryEntries(page);
      expect(stickyPrimaryEntries.length).toBeGreaterThan(0);

      const [primaryEntry] = stickyPrimaryEntries;
      expect(primaryEntry.accessibleName).toMatch(/그대로 시작|날짜 없이 시작|이 날짜로 시작|내 Flow에서 보기/);
      expect(primaryEntry.text).toMatch(/그대로 시작|날짜 없이 시작|이 날짜로 시작|내 Flow에서 보기/);
      expect(primaryEntry.text).not.toMatch(/도구|파일|받기|복사|시트|캘린더|xlsx|ics/i);
    });
  }

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps export as a flow-level secondary action`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const hierarchy = await collectPublicFlowUnitHierarchy(page);
      expect(hierarchy.exportSecondaryEntryCount).toBe(1);
      expect(hierarchy.exportSecondaryEntryLabels[0]).toMatch(/Flow|파일|가져가기/);
      expect(hierarchy.exportFormatOptionCount).toBeGreaterThanOrEqual(2);
      expect(hierarchy.itemLevelExportLikeLabelCount).toBe(0);
      expect(hierarchy.preSavePreviewRowCount).toBeGreaterThan(0);
    });
  }

  for (const route of APPROVED_PUBLIC_SHARE_ROUTES) {
    test(`${route} keeps save-before items read-only and reserves completion for My Flow`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const hierarchy = await collectPublicFlowUnitHierarchy(page);
      expect(hierarchy.preSaveCheckboxCompletionLikeLabelCount).toBe(0);
      expect(hierarchy.preSaveCheckboxCount).toBe(0);
      expect(hierarchy.preSaveCheckboxPreviewLabelCount).toBe(0);
      expect(hierarchy.heroArtifactPreviewCount).toBe(1);
      expect(hierarchy.artifactRepresentationCount).toBe(2);
      expect(hierarchy.includedItemMarkerCount + hierarchy.preSavePreviewRowCount).toBeGreaterThan(0);
    });
  }

  for (const route of CLOSED_REVIEW_FLOW_ROUTES) {
    test(`${route} stays out of the public share shell until source-fit review is complete`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await page.goto(route);

      expect(response?.status()).toBe(404);
      await expect(page.getByTestId('public-flow-share-shell')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: '이 Flow는 지금 열 수 없어요' })).toBeVisible();
      await expect(page.getByRole('link', { name: '다른 Flow 찾기' })).toHaveAttribute('href', '/flows');
      await expect(page.getByRole('button', { name: PUBLIC_START_ACTION_PATTERN })).toHaveCount(0);
      await expect(page.getByTestId('public-flow-export-secondary-entry')).toHaveCount(0);
      await expect(page.getByTestId('mobile-export-bar')).toHaveCount(0);
      await expect(page.getByRole('checkbox')).toHaveCount(0);
    });
  }

  test('input-free workbench save path remains keyboard reachable and leads to My Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/f/new-car-delivery-check');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByTestId('public-flow-primary-setup')).toHaveCount(0);
    await expect(page.getByLabel('Flow artifact workbench')).toBeVisible();

    const mobileSave = page.getByTestId('public-flow-mobile-save-cta');
    const saveButton = mobileSave.getByRole('button', { name: '그대로 시작' });
    await expect(saveButton).toBeVisible();
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    await saveButton.click();

    const myFlowLink = mobileSave.getByRole('link', { name: '내 Flow에서 보기' });
    await expect(myFlowLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/my/, { timeout: 15_000 }),
      myFlowLink.click(),
    ]);
    await expect(page.getByTestId('my-flow-post-save-panel')).toBeVisible();
    await expect(page.getByTestId('my-flow-workspace')).toHaveCount(0);
    await page.getByTestId('my-flow-post-save-open-first').click();
    await expect(page.getByTestId('my-flow-workspace')).toBeVisible();

    const nowSection = page.getByTestId('my-flow-anytime-section');
    await expect(nowSection).toBeVisible();
    await expect(nowSection).toContainText('날짜 없는 할 일');

    const postSaveComplete = nowSection.getByTestId('my-flow-task-complete-control').first();
    await expect(postSaveComplete).toBeVisible();
    await expect(postSaveComplete).toHaveAttribute('type', 'checkbox');
    await expect(postSaveComplete).toHaveAttribute('aria-label', /완료/);
    await expect(nowSection.getByRole('button', { name: /^완료$/ })).toHaveCount(0);

    await postSaveComplete.click();
    await expect.poll(() => page.evaluate(() =>
      Object.values(JSON.parse(window.localStorage.getItem('flow_builder_mvp_checks_new-car-delivery-check') || '{}')).some(Boolean),
    )).toBe(true);
  });
});
